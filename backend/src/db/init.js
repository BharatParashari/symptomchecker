import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, 'schema.sql');

async function init() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Set DATABASE_URL in .env');
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString: url });
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schema);
  console.log('Database schema initialized.');
  await pool.end();
}

init().catch((err) => {
  console.error(err);
  process.exit(1);
});
