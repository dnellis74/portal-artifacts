import express from 'express';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { jwtVerify } from 'jose';

export const GAME = 'cosmic-carnival';
export const VERSION = '1';
const BASE = `/leaderboard-api/${GAME}`;
const COOKIE = 'cosmic_ranked';
const SESSION_SECONDS = 12 * 60 * 60;
const RUN_SECONDS = 2 * 60 * 60;
const hash = value => createHash('sha256').update(value).digest('hex');
const fail = (status, message) => Object.assign(new Error(message), { status });

// Conservative plausibility bounds, not replay verification or proof of human play.
export function validateScore(body, wallMs) {
  const { score, wave, durationMs, version } = body;
  if (version !== VERSION || !Number.isInteger(score) || score < 0 || score % 100 !== 0 ||
      !Number.isInteger(wave) || wave < 1 || wave > 1000 ||
      !Number.isInteger(durationMs) || durationMs < 1000 || durationMs > RUN_SECONDS * 1000 ||
      durationMs > wallMs + 2000 || score > wave * 6600 || score > durationMs * 2 ||
      durationMs < (wave - 1) * 1550) throw fail(400, 'This run does not match the scoring rules.');
  return { score, wave, durationMs };
}

export function createApp({ pool, origin, issuer, launchSecret, secure = true }) {
  if (!origin || !issuer || !launchSecret || launchSecret.length < 32) throw new Error('Leaderboard auth configuration is incomplete.');
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' });
    next();
  });
  app.get('/health', async (_req, res) => {
    try { await pool.query('SELECT 1 FROM artifact_leaderboards.players LIMIT 1'); res.json({ ok: true }); }
    catch { res.status(503).json({ ok: false }); }
  });
  app.use(BASE, (req, _res, next) => {
    if (req.method === 'POST' && (req.get('origin') !== origin || !req.is('application/json'))) {
      return next(fail(403, 'Open the game directly to use ranked play.'));
    }
    next();
  });
  app.use(express.json({ limit: '4kb' }));
  const cookieOptions = { httpOnly: true, secure, sameSite: 'lax', path: BASE, maxAge: SESSION_SECONDS * 1000 };
  async function session(req, res, next) {
    const token = req.headers.cookie?.split(';').map(x => x.trim()).find(x => x.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return next(fail(401, 'Launch from Portal to submit scores.'));
    const { rows } = await pool.query(`SELECT s.*, p.display_name FROM artifact_leaderboards.sessions s
      JOIN artifact_leaderboards.players p ON p.id=s.player_id
      WHERE token_hash=$1 AND game=$2 AND expires_at>now()`, [hash(token), GAME]);
    if (!rows[0]) return next(fail(401, 'Your ranked session expired. Launch from Portal again.'));
    req.playerSession = rows[0]; next();
  }
  app.get(`${BASE}/callback`, async (req, res) => {
    let client;
    try {
      const token = req.query.token;
      if (typeof token !== 'string' || token.length > 8192) throw fail(401, 'Invalid launch.');
      const { payload: p } = await jwtVerify(token, new TextEncoder().encode(launchSecret), {
        algorithms: ['HS256'], issuer, audience: GAME, maxTokenAge: '10m',
        requiredClaims: ['exp', 'iat', 'jti', 'sub'],
      });
      if (p.typ !== 'portal_module_launch' || p.moduleSlug !== GAME ||
          typeof p.sub !== 'string' || !/^user:[0-9]+$/.test(p.sub) ||
          typeof p.jti !== 'string' || p.jti.length > 200 || p.exp - p.iat > 600) throw fail(401, 'Invalid launch.');
      const displayName = (typeof p.handle === 'string' ? p.handle : typeof p.name === 'string' ? p.name : 'Portal player').trim().slice(0, 60) || 'Portal player';
      const sessionToken = randomBytes(32).toString('hex');
      client = await pool.connect(); await client.query('BEGIN');
      await client.query('DELETE FROM artifact_leaderboards.launches WHERE expires_at < now()');
      await client.query('DELETE FROM artifact_leaderboards.sessions WHERE expires_at < now()');
      await client.query('INSERT INTO artifact_leaderboards.launches VALUES ($1,$2,to_timestamp($3))', [issuer,p.jti,p.exp]);
      const { rows: [player] } = await client.query(`INSERT INTO artifact_leaderboards.players (issuer,subject,display_name)
        VALUES ($1,$2,$3) ON CONFLICT (issuer,subject) DO UPDATE SET display_name=excluded.display_name RETURNING id`, [issuer,p.sub,displayName]);
      await client.query(`INSERT INTO artifact_leaderboards.sessions VALUES ($1,$2,$3,now()+interval '12 hours')`, [hash(sessionToken),player.id,GAME]);
      await client.query('COMMIT');
      res.cookie(COOKIE, sessionToken, cookieOptions);
      res.redirect(303, `${origin}/${GAME}/`);
    } catch {
      if (client) await client.query('ROLLBACK').catch(() => {});
      // Never log the request URL or JWT. Failure still leads to playable guest mode.
      res.redirect(303, `${origin}/${GAME}/?ranked=launch-failed`);
    } finally { client?.release(); }
  });
  app.get(`${BASE}/session`, session, (req,res) => res.json({ displayName: req.playerSession.display_name, version: VERSION }));
  app.post(`${BASE}/logout`, session, async (req,res) => {
    await pool.query('DELETE FROM artifact_leaderboards.sessions WHERE token_hash=$1', [req.playerSession.token_hash]);
    res.clearCookie(COOKIE, { httpOnly:true, secure, sameSite:'lax', path:BASE }); res.json({ ok:true });
  });
  app.get(`${BASE}/leaderboard`, async (_req,res) => {
    const { rows } = await pool.query(`SELECT p.display_name AS "displayName", b.score, b.wave
      FROM (SELECT DISTINCT ON (player_id) player_id,score,wave,submitted_at,id FROM artifact_leaderboards.runs
        WHERE game=$1 AND version=$2 AND submitted_at IS NOT NULL
        ORDER BY player_id,score DESC,submitted_at,id) b
      JOIN artifact_leaderboards.players p ON p.id=b.player_id
      ORDER BY b.score DESC,b.submitted_at,b.id LIMIT 20`, [GAME, VERSION]);
    res.json({ version: VERSION, entries: rows });
  });
  app.post(`${BASE}/runs`, session, async (req,res) => {
    if (req.body?.version !== VERSION) throw fail(409,'Reload the game to start a ranked run.');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM artifact_leaderboards.players WHERE id=$1 FOR UPDATE', [req.playerSession.player_id]);
      const { rows: [count] } = await client.query(`SELECT count(*)::int AS n FROM artifact_leaderboards.runs
        WHERE player_id=$1 AND started_at>now()-interval '1 hour'`, [req.playerSession.player_id]);
      if (count.n >= 60) throw fail(429,'Ranked run limit reached. You can still play locally.');
      const id = randomUUID();
      await client.query(`INSERT INTO artifact_leaderboards.runs (id,player_id,session_hash,game,version)
        VALUES ($1,$2,$3,$4,$5)`, [id,req.playerSession.player_id,req.playerSession.token_hash,GAME,VERSION]);
      await client.query('COMMIT'); res.status(201).json({ runId:id, version:VERSION });
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  });
  app.post(`${BASE}/runs/:id/finish`, session, async (req,res) => {
    if (!/^[a-f0-9-]{36}$/.test(req.params.id)) throw fail(400,'Invalid run ID.');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [run] } = await client.query(`SELECT *,extract(epoch from (now()-started_at))*1000 AS wall_ms
        FROM artifact_leaderboards.runs WHERE id=$1 AND session_hash=$2 AND game=$3 AND version=$4 FOR UPDATE`,
        [req.params.id,req.playerSession.token_hash,GAME,VERSION]);
      if (!run) throw fail(404,'Ranked run not found.');
      if (run.submitted_at) {
        if (run.score !== req.body?.score || run.wave !== req.body?.wave || run.duration_ms !== req.body?.durationMs || req.body?.version !== VERSION) throw fail(409,'This run was already submitted.');
      } else {
        if (Number(run.wall_ms) > RUN_SECONDS * 1000) throw fail(410,'This ranked run expired. Your local score is saved.');
        const { score,wave,durationMs } = validateScore(req.body ?? {},Number(run.wall_ms));
        await client.query(`UPDATE artifact_leaderboards.runs SET score=$2,wave=$3,duration_ms=$4,submitted_at=now() WHERE id=$1`, [run.id,score,wave,durationMs]);
      }
      await client.query('COMMIT'); res.json({ saved:true });
    } catch(e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  });
  app.use((_req,res) => res.status(404).json({ message:'Not found.' }));
  app.use((err,_req,res,_next) => {
    const status = err.status >= 400 && err.status < 500 ? err.status : 503;
    if (status === 503) console.error('Leaderboard request failed', { code:err.code || 'internal' });
    res.status(status).json({ message:status === 503 ? 'Leaderboard temporarily unavailable. Local play still works.' : err.message });
  });
  return app;
}
