import pg from 'pg';
import { config } from '../config/index.js';

const { Pool } = pg;

let pool = null;

export function getPool() {
  if (!pool && config.databaseUrl) {
    pool = new Pool({ connectionString: config.databaseUrl });
  }
  return pool;
}

export async function query(text, params) {
  const p = getPool();
  if (!p) {
    throw new Error('PostgreSQL not configured. Set DATABASE_URL in .env');
  }
  return p.query(text, params);
}

export async function initPostgres() {
  if (!config.databaseUrl) {
    console.warn('[DB] DATABASE_URL not set — auth/doctors/appointments disabled');
    return false;
  }
  try {
    const p = getPool();
    await p.query('SELECT 1');
    console.log('[DB] PostgreSQL connected');
    return true;
  } catch (err) {
    console.warn('[DB] PostgreSQL unavailable:', err.message);
    return false;
  }
}
