import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/postgres.js';
import { config } from '../config/index.js';

const SALT_ROUNDS = 12;

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

export async function registerUser({ email, password, role, firstName, lastName, profile = {} }) {
  const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length) {
    // Do NOT confirm the email exists (prevents account enumeration).
    return { duplicate: true };
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await query(
    `INSERT INTO users (email, password_hash, role, first_name, last_name)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role, first_name, last_name, created_at`,
    [email.toLowerCase(), passwordHash, role, firstName, lastName]
  );
  const user = result.rows[0];

  if (role === 'patient') {
    await query(
      `INSERT INTO patient_profiles (user_id, date_of_birth, biological_sex, phone)
       VALUES ($1, $2, $3, $4)`,
      [user.id, profile.dateOfBirth || null, profile.biologicalSex || null, profile.phone || null]
    );
  }

  if (role === 'doctor') {
    await query(
      `INSERT INTO doctor_profiles (user_id, specialization, license_number, license_document_url, years_experience, bio)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        user.id,
        profile.specialization,
        profile.licenseNumber,
        profile.licenseDocumentUrl || null,
        profile.yearsExperience || 0,
        profile.bio || null,
      ]
    );
  }

  return { user, token: signToken(user) };
}

export async function loginUser(email, password) {
  const result = await query(
    `SELECT u.id, u.email, u.password_hash, u.role, u.first_name, u.last_name
     FROM users u WHERE u.email = $1`,
    [email.toLowerCase()]
  );
  if (!result.rows.length) {
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }
  const row = result.rows[0];
  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) {
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }
  const user = {
    id: row.id,
    email: row.email,
    role: row.role,
    first_name: row.first_name,
    last_name: row.last_name,
  };
  return { user, token: signToken(user) };
}

export async function getUserById(id) {
  const result = await query(
    `SELECT u.id, u.email, u.role, u.first_name, u.last_name, u.created_at,
            pp.date_of_birth, pp.biological_sex, pp.phone,
            dp.specialization, dp.license_number, dp.status AS doctor_status,
            dp.years_experience, dp.bio, dp.rating, dp.review_count
     FROM users u
     LEFT JOIN patient_profiles pp ON pp.user_id = u.id
     LEFT JOIN doctor_profiles dp ON dp.user_id = u.id
     WHERE u.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function deleteUser(id) {
  const client = await (await import('../db/postgres.js')).getPool().connect();
  try {
    await client.query('BEGIN');
    // Remove dependents that lack ON DELETE CASCADE, then the user.
    await client.query('DELETE FROM chat_messages WHERE sender_id = $1', [id]);
    await client.query('DELETE FROM appointments WHERE patient_id = $1 OR doctor_id = $1', [id]);
    await client.query('DELETE FROM availability_slots WHERE doctor_id = $1', [id]);
    await client.query('DELETE FROM users WHERE id = $1', [id]); // profiles cascade
    await client.query('COMMIT');
    return { deleted: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
