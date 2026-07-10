import { Router } from 'express';
import { searchFacilities } from '../services/abdmService.js';
import { isAbdmConfigured } from '../config/index.js';

const router = Router();

router.get('/status', (_req, res) => {
  res.json({ configured: isAbdmConfigured() });
});

/**
 * GET /api/facilities/search?state=&district=&name=&page=
 * Looks up real hospitals/clinics from India's ABDM Health Facility Registry.
 */
router.get('/search', async (req, res, next) => {
  try {
    const { state, district, name, page } = req.query;
    if (!state && !district && !name) {
      return res.status(400).json({
        error: 'Provide at least one of: state, district, or name.',
      });
    }
    const result = await searchFacilities({
      state,
      district,
      name,
      page: Math.max(0, parseInt(page || '0', 10) || 0),
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
