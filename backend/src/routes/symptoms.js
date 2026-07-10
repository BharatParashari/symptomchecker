import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { optionalAuth } from '../middleware/auth.js';
import {
  searchSymptoms,
  suggestSymptoms,
  runDiagnosis,
  getConditionInfo,
  specializationForCondition,
} from '../services/diagnosisEngine.js';
import { SymptomSession } from '../db/mongo.js';
import { isApiMedicConfigured } from '../config/index.js';

const router = Router();

router.get('/status', (_req, res) => {
  res.json({
    engine: 'bayesian-differential-v1',
    apiMedicComparison: isApiMedicConfigured(),
  });
});

router.get('/search', async (req, res, next) => {
  try {
    const { q, sex, age } = req.query;
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }
    const results = await searchSymptoms(q, {
      sex: sex || 'male',
      age: parseInt(age || '30', 10),
    });
    res.json(Array.isArray(results) ? results : []);
  } catch (err) {
    next(err);
  }
});

router.post('/suggest', optionalAuth, async (req, res, next) => {
  try {
    const { sex, age, evidence, interviewId } = req.body;
    if (!sex || !age) {
      return res.status(400).json({ error: 'sex and age are required' });
    }
    const suggestions = await suggestSymptoms({ sex, age, evidence: evidence || [], interviewId });
    res.json(Array.isArray(suggestions) ? suggestions : []);
  } catch (err) {
    next(err);
  }
});

router.post('/diagnose', optionalAuth, async (req, res, next) => {
  try {
    const { sex, age, evidence, interviewId, sessionId } = req.body;
    if (!sex || age == null || !evidence?.length) {
      return res.status(400).json({ error: 'sex, age, and at least one symptom are required' });
    }

    const id = interviewId || uuidv4();
    const result = await runDiagnosis({ sex, age, evidence, interviewId: id });

    const sid = sessionId || uuidv4();
    try {
      await SymptomSession.findOneAndUpdate(
        { sessionId: sid },
        {
          sessionId: sid,
          userId: req.user?.id || null,
          sex,
          age,
          evidence,
          interviewId: result.interviewId,
          conditions: result.conditions,
          hasEmergency: result.has_emergency_evidence,
          completedAt: result.should_stop ? new Date() : null,
        },
        { upsert: true, new: true }
      );
    } catch {
      /* Mongo optional */
    }

    res.json({
      sessionId: sid,
      interviewId: result.interviewId,
      question: result.question,
      conditions: result.conditions,
      shouldStop: result.should_stop,
      hasEmergency: result.has_emergency_evidence,
      demoMode: result.demoMode,
      recommendedSpecialization: result.conditions?.[0]
        ? specializationForCondition(result.conditions[0].common_name || result.conditions[0].name)
        : 'General Physician',
      disclaimer:
        'This tool provides health information for educational purposes only. It is not a medical diagnosis. Always consult a qualified healthcare professional.',
    });
  } catch (err) {
    next(err);
  }
});

router.get('/conditions/:id', async (req, res, next) => {
  try {
    const info = await getConditionInfo(req.params.id);
    if (!info) return res.status(404).json({ error: 'Condition not found' });
    res.json(info);
  } catch (err) {
    next(err);
  }
});

export default router;
