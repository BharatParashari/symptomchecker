import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  listVerifiedDoctors,
  getDoctorAvailability,
  addAvailabilitySlots,
  bookAppointment,
  getAppointmentsForUser,
  matchDoctorsForDiagnosis,
} from '../services/doctorService.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { specialization } = req.query;
    const doctors = await listVerifiedDoctors({ specialization });
    res.json(doctors);
  } catch (err) {
    next(err);
  }
});

router.get('/match', async (req, res, next) => {
  try {
    const { diagnosis } = req.query;
    if (!diagnosis) return res.status(400).json({ error: 'diagnosis query required' });
    const match = await matchDoctorsForDiagnosis(diagnosis);
    res.json(match);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/availability', async (req, res, next) => {
  try {
    const from = req.query.from || new Date().toISOString();
    const to =
      req.query.to || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const slots = await getDoctorAvailability(req.params.id, from, to);
    res.json(slots);
  } catch (err) {
    next(err);
  }
});

router.post('/availability', authenticate, requireRole('doctor'), async (req, res, next) => {
  try {
    const { slots } = req.body;
    if (!Array.isArray(slots) || !slots.length) {
      return res.status(400).json({ error: 'slots array required' });
    }
    const created = await addAvailabilitySlots(req.user.id, slots);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.post('/appointments', authenticate, requireRole('patient'), async (req, res, next) => {
  try {
    const { doctorId, slotId, symptomSessionId, chiefComplaint, topDiagnosis } = req.body;
    if (!doctorId || !slotId) {
      return res.status(400).json({ error: 'doctorId and slotId required' });
    }
    const appointment = await bookAppointment({
      patientId: req.user.id,
      doctorId,
      slotId,
      symptomSessionId,
      chiefComplaint,
      topDiagnosis,
    });
    res.status(201).json(appointment);
  } catch (err) {
    next(err);
  }
});

router.get('/appointments/mine', authenticate, async (req, res, next) => {
  try {
    const appointments = await getAppointmentsForUser(req.user.id, req.user.role);
    res.json(appointments);
  } catch (err) {
    next(err);
  }
});

export default router;
