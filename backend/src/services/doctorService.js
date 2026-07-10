import { query } from '../db/postgres.js';

export async function listVerifiedDoctors({ specialization } = {}) {
  let sql = `
    SELECT u.id, u.first_name, u.last_name, u.email,
           dp.specialization, dp.years_experience, dp.bio, dp.rating, dp.review_count
    FROM users u
    JOIN doctor_profiles dp ON dp.user_id = u.id
    WHERE dp.status = 'verified'
  `;
  const params = [];
  if (specialization) {
    params.push(specialization);
    sql += ` AND LOWER(dp.specialization) LIKE LOWER($${params.length})`;
  }
  sql += ' ORDER BY dp.rating DESC, dp.years_experience DESC';
  const result = await query(sql, params);
  return result.rows;
}

export async function getDoctorAvailability(doctorId, from, to) {
  const result = await query(
    `SELECT id, start_time, end_time, status
     FROM availability_slots
     WHERE doctor_id = $1 AND status = 'available'
       AND start_time >= $2 AND start_time < $3
     ORDER BY start_time`,
    [doctorId, from, to]
  );
  return result.rows;
}

export async function addAvailabilitySlots(doctorId, slots) {
  const inserted = [];
  for (const slot of slots) {
    const result = await query(
      `INSERT INTO availability_slots (doctor_id, start_time, end_time)
       VALUES ($1, $2, $3)
       ON CONFLICT (doctor_id, start_time) DO NOTHING
       RETURNING *`,
      [doctorId, slot.startTime, slot.endTime]
    );
    if (result.rows[0]) inserted.push(result.rows[0]);
  }
  return inserted;
}

export async function bookAppointment({
  patientId,
  doctorId,
  slotId,
  symptomSessionId,
  chiefComplaint,
  topDiagnosis,
}) {
  const client = await (await import('../db/postgres.js')).getPool().connect();
  try {
    await client.query('BEGIN');
    const slotResult = await client.query(
      `SELECT * FROM availability_slots WHERE id = $1 AND doctor_id = $2 AND status = 'available' FOR UPDATE`,
      [slotId, doctorId]
    );
    if (!slotResult.rows.length) {
      throw Object.assign(new Error('Slot unavailable'), { status: 409 });
    }
    const slot = slotResult.rows[0];
    await client.query(`UPDATE availability_slots SET status = 'booked' WHERE id = $1`, [slotId]);
    const appt = await client.query(
      `INSERT INTO appointments (patient_id, doctor_id, slot_id, symptom_session_id, chief_complaint, top_diagnosis, scheduled_start, scheduled_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        patientId,
        doctorId,
        slotId,
        symptomSessionId || null,
        chiefComplaint || null,
        topDiagnosis || null,
        slot.start_time,
        slot.end_time,
      ]
    );
    await client.query('COMMIT');
    return appt.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getAppointmentsForUser(userId, role) {
  const col = role === 'doctor' ? 'doctor_id' : 'patient_id';
  const result = await query(
    `SELECT a.*,
            p.first_name AS patient_first_name, p.last_name AS patient_last_name,
            d.first_name AS doctor_first_name, d.last_name AS doctor_last_name,
            dp.specialization
     FROM appointments a
     JOIN users p ON p.id = a.patient_id
     JOIN users d ON d.id = a.doctor_id
     LEFT JOIN doctor_profiles dp ON dp.user_id = a.doctor_id
     WHERE a.${col} = $1
     ORDER BY a.scheduled_start DESC`,
    [userId]
  );
  return result.rows;
}

export async function verifyDoctor(doctorId, adminId, status) {
  const result = await query(
    `UPDATE doctor_profiles SET status = $1, verified_at = CASE WHEN $1 = 'verified' THEN NOW() ELSE NULL END, verified_by = $2
     WHERE user_id = $3 RETURNING *`,
    [status, adminId, doctorId]
  );
  return result.rows[0];
}

export async function listPendingDoctors() {
  const result = await query(
    `SELECT u.id, u.email, u.first_name, u.last_name, dp.*
     FROM users u JOIN doctor_profiles dp ON dp.user_id = u.id
     WHERE dp.status = 'pending'`
  );
  return result.rows;
}

export async function matchDoctorsForDiagnosis(diagnosisName) {
  const { specializationForCondition } = await import('./diagnosisEngine.js');
  const spec = specializationForCondition(diagnosisName);
  const doctors = await listVerifiedDoctors({ specialization: `%${spec.split(' ')[0]}%` });
  if (doctors.length) return { specialization: spec, doctors };
  return { specialization: spec, doctors: await listVerifiedDoctors() };
}
