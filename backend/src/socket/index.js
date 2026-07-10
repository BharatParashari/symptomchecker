import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { saveChatMessage, userCanAccessAppointment } from '../routes/chat.js';
import { query } from '../db/postgres.js';

export function setupSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      socket.user = jwt.verify(token, config.jwt.secret);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join_appointment', async ({ appointmentId }) => {
      const allowed = await userCanAccessAppointment(socket.user.id, appointmentId);
      if (!allowed) {
        socket.emit('error', { message: 'Not authorized for this appointment' });
        return;
      }
      socket.join(`appointment:${appointmentId}`);
      socket.emit('joined', { appointmentId });
    });

    socket.on('send_message', async ({ appointmentId, content }) => {
      if (!content?.trim()) return;
      const allowed = await userCanAccessAppointment(socket.user.id, appointmentId);
      if (!allowed) {
        socket.emit('error', { message: 'Not authorized' });
        return;
      }
      try {
        const msg = await saveChatMessage(appointmentId, socket.user.id, content.trim());
        const userRow = await query(
          'SELECT first_name, last_name, role FROM users WHERE id = $1',
          [socket.user.id]
        );
        const payload = {
          ...msg,
          first_name: userRow.rows[0]?.first_name,
          last_name: userRow.rows[0]?.last_name,
          role: userRow.rows[0]?.role,
        };
        io.to(`appointment:${appointmentId}`).emit('new_message', payload);
      } catch (err) {
        console.error('[socket] send_message failed:', err.message);
        socket.emit('error', { message: 'Message could not be delivered' });
      }
    });

    socket.on('typing', ({ appointmentId }) => {
      socket.to(`appointment:${appointmentId}`).emit('user_typing', {
        userId: socket.user.id,
      });
    });
  });
}
