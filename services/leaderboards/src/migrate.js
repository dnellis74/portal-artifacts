import pg from 'pg';
import { readFile } from 'node:fs/promises';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
try {
  await pool.query(await readFile(new URL('../schema.sql', import.meta.url), 'utf8'));
  console.log('Leaderboard schema ready.');
} finally { await pool.end(); }
