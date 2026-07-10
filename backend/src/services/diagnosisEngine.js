/**
 * Diagnosis service — drop-in replacement for the former Infermedica wrapper.
 *
 * Exposes the identical interface (searchSymptoms, suggestSymptoms,
 * runDiagnosis, getConditionInfo, specializationForCondition, enrichConditions)
 * so nothing else in the app has to change. The reasoning is powered by our own
 * Bayesian engine (bayesEngine.js). ApiMedic can optionally be attached as a
 * secondary comparison source, gated behind env vars and always best-effort.
 */

import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import {
  diagnose,
  suggest as engineSuggest,
  searchSymptoms as engineSearch,
  conditionInfo,
  specializationFor,
  diseaseName,
} from './bayesEngine.js';

const TOP_N = 5;

// --- triage helpers (probability -> human-facing labels) -------------------
function probabilityToLevel(p) {
  if (p >= 0.5) return 'high';
  if (p >= 0.2) return 'medium';
  return 'low';
}

function triageFromProbability(prob, hasEmergency) {
  // Thresholds are intentionally conservative. Temperature scaling compresses
  // the posterior, so absolute probabilities run lower than raw model output;
  // we bias toward recommending professional review rather than reassurance.
  if (hasEmergency) return 'emergency';
  if (prob >= 0.28) return 'consultation';
  if (prob >= 0.1) return 'consultation_24';
  return 'self_care';
}

export function actionLabel(triageLevel) {
  return (
    {
      emergency: 'Seek emergency care now',
      consultation: 'See a doctor soon',
      consultation_24: 'See a doctor within 24 hours',
      self_care: 'Self-care may be appropriate',
    }[triageLevel] || 'See a doctor'
  );
}

/** Shape engine posterior entries into the condition contract the app expects. */
export function enrichConditions(posterior, hasEmergency) {
  return (posterior || []).slice(0, TOP_N).map((c) => {
    const name = diseaseName(c.disease);
    const triage = triageFromProbability(c.probability, hasEmergency);
    return {
      id: c.disease,
      name,
      common_name: name,
      probability: Number(c.probability.toFixed(4)),
      likelihood: probabilityToLevel(c.probability),
      triage_level: triage,
      recommended_action: actionLabel(triage),
      specialization: specializationFor(c.disease),
    };
  });
}

// --- optional ApiMedic comparison source -----------------------------------
function apiMedicEnabled() {
  return Boolean(config.apimedic?.username && config.apimedic?.password);
}

/**
 * Best-effort ApiMedic diagnosis for side-by-side comparison. Never throws into
 * the main flow — any failure returns null and the engine result stands alone.
 */
async function apiMedicCompare(/* { sex, age, evidence } */) {
  if (!apiMedicEnabled()) return null;
  try {
    // Placeholder: real implementation authenticates against ApiMedic's token
    // endpoint then calls /diagnosis with mapped symptom IDs. Left inert until
    // credentials + the official symptom-ID map are provided, so we never ship
    // a broken/guessed integration.
    return null;
  } catch {
    return null;
  }
}

// --- public interface (matches the old infermedica.js exports) -------------
export async function searchSymptoms(phrase /* , { sex, age } */) {
  return engineSearch(phrase);
}

export async function suggestSymptoms({ evidence }) {
  return engineSuggest(evidence || []);
}

export async function runDiagnosis({ sex, age, evidence, interviewId, questionCount }) {
  const ev = evidence || [];
  // If the caller doesn't track follow-ups explicitly, approximate from how many
  // symptoms have been answered so far (caps runaway interviews at MAX_QUESTIONS).
  const qc = questionCount != null ? questionCount : ev.filter((e) => e?.choice_id !== 'unknown').length;
  const result = diagnose(ev, qc);
  const hasEmergency = result.redFlags.hasEmergency;
  const conditions = enrichConditions(result.conditions, hasEmergency);

  const comparison = await apiMedicCompare({ sex, age, evidence: ev });

  return {
    interviewId: interviewId || uuidv4(),
    question: result.nextQuestion,
    conditions,
    should_stop: result.shouldStop,
    has_emergency_evidence: hasEmergency,
    red_flags: result.redFlags.flags,
    demoMode: !apiMedicEnabled(), // "demo" == no external source attached
    ...(comparison ? { comparison } : {}),
  };
}

export async function getConditionInfo(id) {
  return conditionInfo(id);
}

export function specializationForCondition(name) {
  return specializationFor(name);
}
