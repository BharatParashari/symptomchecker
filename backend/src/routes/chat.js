import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { query } from '../db/postgres.js';

const router = Router();

router.get('/:appointmentId', authenticate, async (req, res, next) => {
  try {
    const appt = await query(
      `SELECT * FROM appointments WHERE id = $1 AND (patient_id = $2 OR doctor_id = $2)`,
      [req.params.appointmentId, req.user.id]
    );
    if (!appt.rows.length) return res.status(404).json({ error: 'Appointment not found' });
    const messages = await query(
      `SELECT cm.*, u.first_name, u.last_name, u.role
       FROM chat_messages cm JOIN users u ON u.id = cm.sender_id
       WHERE cm.appointment_id = $1 ORDER BY cm.created_at ASC`,
      [req.params.appointmentId]
    );
    res.json({ appointment: appt.rows[0], messages: messages.rows });
  } catch (err) {
    next(err);
  }
});

export default router;

export async function saveChatMessage(appointmentId, senderId, content) {
  const result = await query(
    `INSERT INTO chat_messages (appointment_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *`,
    [appointmentId, senderId, content]
  );
  return result.rows[0];
}

export async function userCanAccessAppointment(userId, appointmentId) {
  const result = await query(
    `SELECT id FROM appointments WHERE id = $1 AND (patient_id = $2 OR doctor_id = $2)`,
    [appointmentId, userId]
  );
  return result.rows.length > 0;
}
