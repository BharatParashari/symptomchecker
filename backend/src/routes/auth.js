import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { registerUser, loginUser, getUserById } from '../services/authService.js';

const router = Router();

router.post('/register/patient', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, dateOfBirth, biologicalSex, phone } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = await registerUser({
      email,
      password,
      role: 'patient',
      firstName,
      lastName,
      profile: { dateOfBirth, biologicalSex, phone },
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/register/doctor', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, specialization, licenseNumber, yearsExperience, bio } =
      req.body;
    if (!email || !password || !firstName || !lastName || !specialization || !licenseNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = await registerUser({
      email,
      password,
      role: 'doctor',
      firstName,
      lastName,
      profile: { specialization, licenseNumber, yearsExperience, bio },
    });
    res.status(201).json({
      ...result,
      message: 'Registration submitted. Your credentials will be reviewed before activation.',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const result = await loginUser(email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.get('/admin/pending-doctors', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { listPendingDoctors } = await import('../services/doctorService.js');
    const doctors = await listPendingDoctors();
    res.json(doctors);
  } catch (err) {
    next(err);
  }
});

router.patch('/admin/doctors/:id/verify', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status must be verified or rejected' });
    }
    const { verifyDoctor } = await import('../services/doctorService.js');
    const profile = await verifyDoctor(req.params.id, req.user.id, status);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

export default router;
