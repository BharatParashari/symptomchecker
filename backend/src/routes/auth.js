import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { registerUser, loginUser, getUserById } from '../services/authService.js';

const router = Router();

// --- validation helpers ----------------------------------------------------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SEXES = new Set(['male', 'female', null, undefined]);

function validateCredentials(email, password) {
  if (typeof email !== 'string' || !EMAIL_RE.test(email) || email.length > 254) {
    return 'A valid email address is required';
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 200) {
    return 'Password must be between 8 and 200 characters';
  }
  return null;
}

function str(v, max = 100) {
  return typeof v === 'string' ? v.slice(0, max) : '';
}

router.post('/register/patient', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, dateOfBirth, biologicalSex, phone } = req.body;
    const credErr = validateCredentials(email, password);
    if (credErr) return res.status(400).json({ error: credErr });
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First and last name are required' });
    }
    if (!SEXES.has(biologicalSex)) {
      return res.status(400).json({ error: 'biologicalSex must be male or female' });
    }
    const result = await registerUser({
      email,
      password,
      role: 'patient',
      firstName: str(firstName),
      lastName: str(lastName),
      profile: { dateOfBirth, biologicalSex, phone: str(phone, 20) },
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
    const credErr = validateCredentials(email, password);
    if (credErr) return res.status(400).json({ error: credErr });
    if (!firstName || !lastName || !specialization || !licenseNumber) {
      return res.status(400).json({ error: 'Name, specialization, and license number are required' });
    }
    const result = await registerUser({
      email,
      password,
      role: 'doctor',
      firstName: str(firstName),
      lastName: str(lastName),
      profile: {
        specialization: str(specialization),
        licenseNumber: str(licenseNumber, 60),
        yearsExperience: Number.isFinite(Number(yearsExperience)) ? Number(yearsExperience) : 0,
        bio: str(bio, 2000),
      },
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
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
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
