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

// --- input validation / sanitization helpers ------------------------------
const SEXES = new Set(['male', 'female']);
const CHOICES = new Set(['present', 'absent', 'unknown']);
const ID_RE = /^[a-z0-9_]{1,64}$/; // symptom/condition slugs
const TOKEN_RE = /^[A-Za-z0-9_-]{1,64}$/; // session/interview ids

/** Coerce to a safe string id, or null. Blocks NoSQL operator-injection
 *  (e.g. { $ne: null }) by rejecting anything that isn't a plain string. */
function safeToken(v) {
  return typeof v === 'string' && TOKEN_RE.test(v) ? v : null;
}

function validSex(v) {
  return typeof v === 'string' && SEXES.has(v.toLowerCase());
}

function validAge(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 120;
}

/** Validate + normalize the evidence array. Returns null if invalid. */
function cleanEvidence(evidence) {
  if (!Array.isArray(evidence) || evidence.length === 0 || evidence.length > 60) {
    return null;
  }
  const out = [];
  for (const e of evidence) {
    if (!e || typeof e !== 'object') return null;
    const id = typeof e.id === 'string' ? e.id : null;
    const choice = typeof e.choice_id === 'string' ? e.choice_id : 'present';
    if (!id || !ID_RE.test(id) || !CHOICES.has(choice)) return null;
    // Only keep known, typed fields — never persist arbitrary client objects.
    out.push({
      id,
      choice_id: choice,
      name: typeof e.name === 'string' ? e.name.slice(0, 80) : undefined,
    });
  }
  return out;
}

router.get('/status', (_req, res) => {
  res.json({
    engine: 'bayesian-differential-v1',
    apiMedicComparison: isApiMedicConfigured(),
  });
});

router.get('/search', async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    if (q.length < 2 || q.length > 64) {
      return res.status(400).json({ error: 'Query must be 2–64 characters' });
    }
    const results = await searchSymptoms(q, {});
    res.json(Array.isArray(results) ? results : []);
  } catch (err) {
    next(err);
  }
});

router.post('/suggest', optionalAuth, async (req, res, next) => {
  try {
    const { sex, age } = req.body;
    if (!validSex(sex) || !validAge(age)) {
      return res.status(400).json({ error: 'Valid sex (male|female) and age (0–120) are required' });
    }
    const evidence = cleanEvidence(req.body.evidence) || [];
    const suggestions = await suggestSymptoms({ sex, age, evidence });
    res.json(Array.isArray(suggestions) ? suggestions : []);
  } catch (err) {
    next(err);
  }
});

router.post('/diagnose', optionalAuth, async (req, res, next) => {
  try {
    const { sex, age } = req.body;
    if (!validSex(sex)) {
      return res.status(400).json({ error: 'sex must be "male" or "female"' });
    }
    if (!validAge(age)) {
      return res.status(400).json({ error: 'age must be an integer between 0 and 120' });
    }
    const evidence = cleanEvidence(req.body.evidence);
    if (!evidence) {
      return res.status(400).json({ error: 'evidence must be a non-empty array of {id, choice_id}' });
    }

    // Session/interview ids are used in a Mongo filter — coerce to safe strings
    // (never trust client objects) to prevent NoSQL operator injection.
    const interviewId = safeToken(req.body.interviewId) || uuidv4();
    const sid = safeToken(req.body.sessionId) || uuidv4();

    const result = await runDiagnosis({ sex, age: Number(age), evidence, interviewId });

    try {
      await SymptomSession.findOneAndUpdate(
        { sessionId: sid },
        {
          sessionId: sid,
          userId: req.user?.id || null,
          sex,
          age: Number(age),
          evidence,
          interviewId: result.interviewId,
          conditions: result.conditions,
          hasEmergency: result.has_emergency_evidence,
          completedAt: result.should_stop ? new Date() : null,
        },
        { upsert: true, new: true }
      );
    } catch {
      /* Mongo optional — session logging is best-effort */
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
    const id = req.params.id;
    if (!ID_RE.test(id)) {
      return res.status(400).json({ error: 'Invalid condition id' });
    }
    const info = await getConditionInfo(id);
    if (!info) return res.status(404).json({ error: 'Condition not found' });
    res.json(info);
  } catch (err) {
    next(err);
  }
});

export default router;
