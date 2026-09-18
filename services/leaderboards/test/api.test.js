import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { SignJWT } from 'jose';
import { randomUUID } from 'node:crypto';
import { createApp, GAME, VERSION, validateScore } from '../src/app.js';
const database = process.env.TEST_DATABASE_URL;
if (!database) throw new Error('Set TEST_DATABASE_URL to a disposable local Postgres database.');
const testURL = new URL(database);
if (!['localhost','127.0.0.1'].includes(testURL.hostname) || !testURL.pathname.endsWith('_test')) throw new Error('Tests require a local database named *_test.');
const pool = new pg.Pool({ connectionString:database });
const secret = 'test-only-secret-with-at-least-32-characters';
const issuer = 'https://portal.example.test';
const origin = 'http://localhost:5173';
let server,base;
before(async () => {
  await pool.query(await readFile(new URL('../schema.sql',import.meta.url),'utf8'));
  await pool.query('TRUNCATE artifact_leaderboards.runs, artifact_leaderboards.sessions, artifact_leaderboards.players, artifact_leaderboards.launches RESTART IDENTITY');
  server = createApp({pool,origin,issuer,launchSecret:secret,secure:false}).listen(0,'127.0.0.1');
  await new Promise(resolve => server.once('listening',resolve));
  base = `http://127.0.0.1:${server.address().port}/leaderboard-api/${GAME}`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); await pool.end(); });
async function token(overrides={}) {
  return new SignJWT({typ:'portal_module_launch',moduleSlug:GAME,name:'Test <player>',...overrides})
    .setProtectedHeader({alg:'HS256'}).setIssuer(issuer).setAudience(GAME)
    .setSubject(`user:${Math.floor(Math.random()*1e8)}`).setJti(randomUUID()).setIssuedAt().setExpirationTime('2m').sign(new TextEncoder().encode(secret));
}
async function launch(value) {
  const response = await fetch(`${base}/callback?token=${encodeURIComponent(value ?? await token())}`,{redirect:'manual'});
  return {response,cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
async function post(path,cookie,body,requestOrigin=origin) {
  return fetch(base+path,{method:'POST',headers:{Cookie:cookie||'',Origin:requestOrigin,'Content-Type':'application/json'},body:JSON.stringify(body)});
}
test('guest reads leaderboard but cannot submit',async () => {
  assert.equal((await fetch(base+'/leaderboard')).status,200);
  assert.equal((await post('/runs',null,{version:VERSION})).status,401);
});
test('launch establishes a scoped HttpOnly session and rejects token replay',async () => {
  const jwt = await token();
  const {response,cookie} = await launch(jwt);
  assert.equal(response.status,303); assert.equal(response.headers.get('location'),origin+'/'+GAME+'/');
  assert.match(response.headers.get('set-cookie'),/HttpOnly/); assert.match(response.headers.get('set-cookie'),/SameSite=Lax/);
  const session = await fetch(base+'/session',{headers:{Cookie:cookie}});
  assert.equal(session.status,200); assert.equal((await session.json()).displayName,'Test <player>');
  const replay = await launch(jwt); assert.equal(replay.cookie,undefined);
  assert.match(replay.response.headers.get('location'),/launch-failed/);
});
test('invalid signature, expired tokens and another module cannot log in',async () => {
  for (const jwt of [await token({moduleSlug:'another-game'}),'invalid.jwt.value',await new SignJWT({typ:'portal_module_launch',moduleSlug:GAME}).setProtectedHeader({alg:'HS256'}).setIssuer(issuer).setAudience(GAME).setSubject('user:1').setJti(randomUUID()).setIssuedAt(Math.floor(Date.now()/1000)-180).setExpirationTime('0s').sign(new TextEncoder().encode(secret))]) {
    assert.equal((await launch(jwt)).cookie,undefined);
  }
});
test('CSRF and another session cannot submit a run',async () => {
  const {cookie} = await launch();
  assert.equal((await post('/runs',cookie,{version:VERSION},'https://evil.example')).status,403);
  const run = await (await post('/runs',cookie,{version:VERSION})).json();
  const other = await launch();
  assert.equal((await post(`/runs/${run.runId}/finish`,other.cookie,{version:VERSION,score:100,wave:1,durationMs:1000})).status,404);
});
test('scores are validated, concurrent retries save once, rankings keep one best per player',async () => {
  const {cookie} = await launch();
  const run = await (await post('/runs',cookie,{version:VERSION})).json();
  await pool.query("UPDATE artifact_leaderboards.runs SET started_at=now()-interval '20 seconds' WHERE id=$1",[run.runId]);
  const body={version:VERSION,score:300,wave:1,durationMs:15000};
  assert.equal((await post(`/runs/${run.runId}/finish`,cookie,{...body,score:99999999})).status,400);
  const results = await Promise.all([post(`/runs/${run.runId}/finish`,cookie,body),post(`/runs/${run.runId}/finish`,cookie,body)]);
  assert.deepEqual(results.map(r=>r.status),[200,200]);
  assert.equal((await post(`/runs/${run.runId}/finish`,cookie,{...body,score:400})).status,409);
  const run2 = await (await post('/runs',cookie,{version:VERSION})).json();
  await pool.query("UPDATE artifact_leaderboards.runs SET started_at=now()-interval '20 seconds' WHERE id=$1",[run2.runId]);
  await post(`/runs/${run2.runId}/finish`,cookie,{...body,score:200});
  const {rows} = await pool.query('SELECT count(*)::int AS n FROM artifact_leaderboards.runs WHERE id=$1 AND submitted_at IS NOT NULL',[run.runId]);
  assert.equal(rows[0].n,1);
  const board = await (await fetch(base+'/leaderboard')).json();
  assert.equal(board.entries.filter(e=>e.score===300).length,1); assert.equal(board.entries.filter(e=>e.score===200).length,0);
  assert.equal(Object.keys(board.entries[0]).sort().join(','),'displayName,score,wave');
});
test('expired runs are rejected and rate limit is enforced',async () => {
  const {cookie} = await launch();
  const run = await (await post('/runs',cookie,{version:VERSION})).json();
  await pool.query("UPDATE artifact_leaderboards.runs SET started_at=now()-interval '3 hours' WHERE id=$1",[run.runId]);
  assert.equal((await post(`/runs/${run.runId}/finish`,cookie,{version:VERSION,score:0,wave:1,durationMs:5000})).status,410);
  for(let i=0;i<60;i++) assert.equal((await post('/runs',cookie,{version:VERSION})).status,201);
  assert.equal((await post('/runs',cookie,{version:VERSION})).status,429);
});
test('duration, score units, and scoring version bounds',() => {
  for(const body of [ {score:-100,wave:1,durationMs:10000}, {score:1,wave:1,durationMs:10000}, {score:100,wave:1,durationMs:999999}, {score:100,wave:100,durationMs:1000} ]) assert.throws(()=>validateScore({...body,version:VERSION},10000));
});

test('logout revokes the server session',async () => {
  const {cookie} = await launch();
  assert.equal((await post('/logout',cookie,{})).status,200);
  assert.equal((await fetch(base+'/session',{headers:{Cookie:cookie}})).status,401);
});
