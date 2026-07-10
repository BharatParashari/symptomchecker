/**
 * Bayesian differential-diagnosis engine.
 *
 * Pure, dependency-free reasoning core. Given a set of present/absent symptom
 * evidence it produces a calibrated, ranked differential (probabilities sum to
 * 1), selects the next most informative question by expected information gain,
 * and surfaces emergency red flags independently of the probability math.
 *
 * IMPORTANT: This is an educational model built on a labeled public dataset with
 * limited symptom variation per disease. It is NOT a clinically validated
 * diagnostic device. All output must be framed as information, not diagnosis.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KB = JSON.parse(
  readFileSync(join(__dirname, '..', 'data', 'knowledgeBase.json'), 'utf-8')
);

// --- Calibration constants -------------------------------------------------
// P_MIN: likelihood floor. Prevents a single missing symptom from driving a
// disease's probability to ~0 (log(0) = -Inf). Raising it flattens confidence,
// which is desirable given how cleanly separable the source dataset is.
const P_MIN = 0.08;
// TEMPERATURE: softmax temperature. >1 softens an over-peaked posterior into a
// realistic spread instead of false 100%-certainty. Tuned empirically.
const TEMPERATURE = 4;
const MAX_QUESTIONS = 8; // hard cap on adaptive follow-ups
const STOP_CONFIDENCE = 0.85; // stop early if leader is this dominant
const STOP_MARGIN = 0.4; // ...and this far ahead of the runner-up
const MIN_INFO_GAIN = 0.02; // stop if no remaining question is this informative (bits)

const clamp = (p) => Math.min(1 - P_MIN, Math.max(P_MIN, p));

/**
 * Log-posterior for every disease under Naive Bayes.
 * present symptom -> P(s|d); absent symptom -> 1 - P(s|d); both floored.
 */
function logPosteriors(present, absent) {
  const out = {};
  for (const d of KB.diseases) {
    const lk = KB.likelihoods[d];
    let logp = Math.log(KB.priors[d] || 1e-6);
    for (const s of present) {
      logp += Math.log(clamp(lk[s] ?? 0));
    }
    for (const s of absent) {
      logp += Math.log(clamp(1 - (lk[s] ?? 0)));
    }
    out[d] = logp;
  }
  return out;
}

/** Temperature-scaled softmax over a {disease: logp} map -> {disease: prob}. */
function softmax(logMap) {
  const entries = Object.entries(logMap);
  const scaled = entries.map(([d, lp]) => [d, lp / TEMPERATURE]);
  const max = Math.max(...scaled.map(([, v]) => v));
  const exps = scaled.map(([d, v]) => [d, Math.exp(v - max)]);
  const sum = exps.reduce((a, [, v]) => a + v, 0) || 1;
  const probs = {};
  for (const [d, v] of exps) probs[d] = v / sum;
  return probs;
}

/** Shannon entropy (bits) of a probability distribution given as an array. */
function entropy(probs) {
  let h = 0;
  for (const p of probs) {
    if (p > 0) h -= p * Math.log2(p);
  }
  return h;
}

/**
 * Posterior distribution over diseases given evidence.
 * @param {Set<string>} present  symptom slugs answered "present"
 * @param {Set<string>} absent   symptom slugs answered "absent"
 * @returns {{disease:string, probability:number}[]} sorted desc
 */
export function posterior(present, absent) {
  const probs = softmax(logPosteriors([...present], [...absent]));
  return Object.entries(probs)
    .map(([disease, probability]) => ({ disease, probability }))
    .sort((a, b) => b.probability - a.probability);
}

/**
 * Expected information gain (bits) of asking about each candidate symptom,
 * given the current posterior. Higher = more discriminating.
 */
function questionGains(present, absent) {
  const asked = new Set([...present, ...absent]);
  const post = posterior(present, absent);
  const probMap = Object.fromEntries(post.map((x) => [x.disease, x.probability]));
  const hNow = entropy(post.map((x) => x.probability));

  const gains = [];
  for (const s of KB.symptoms) {
    if (asked.has(s)) continue;
    // Marginal P(symptom present) under current posterior.
    let pPresent = 0;
    for (const d of KB.diseases) {
      pPresent += (probMap[d] || 0) * clamp(KB.likelihoods[d][s] ?? 0);
    }
    // Posterior entropy in each branch.
    const presentBranch = posterior(new Set([...present, s]), absent);
    const absentBranch = posterior(present, new Set([...absent, s]));
    const hPresent = entropy(presentBranch.map((x) => x.probability));
    const hAbsent = entropy(absentBranch.map((x) => x.probability));
    const expectedH = pPresent * hPresent + (1 - pPresent) * hAbsent;
    gains.push({ symptom: s, gain: hNow - expectedH });
  }
  gains.sort((a, b) => b.gain - a.gain);
  return gains;
}

/** Emergency red-flag check — runs independently of probabilities. */
export function detectRedFlags(present) {
  const flags = [...present].filter((s) => KB.redFlags.includes(s));
  return { hasEmergency: flags.length > 0, flags };
}

/**
 * Full differential run.
 * @param {{id:string, choice_id:string}[]} evidence
 * @param {number} questionCount  how many follow-ups already asked
 * @returns {{ conditions, nextQuestion, shouldStop, redFlags }}
 */
export function diagnose(evidence = [], questionCount = 0) {
  const present = new Set();
  const absent = new Set();
  for (const e of evidence) {
    if (!e || !e.id) continue;
    if (e.choice_id === 'absent') absent.add(e.id);
    else if (e.choice_id === 'present') present.add(e.id);
    // 'unknown' is ignored
  }

  const post = posterior(present, absent);
  const redFlags = detectRedFlags(present);

  const leader = post[0]?.probability ?? 0;
  const runnerUp = post[1]?.probability ?? 0;
  const confident =
    leader >= STOP_CONFIDENCE && leader - runnerUp >= STOP_MARGIN;

  let nextQuestion = null;
  let shouldStop = questionCount >= MAX_QUESTIONS || confident;

  if (!shouldStop) {
    const gains = questionGains(present, absent);
    const best = gains[0];
    if (!best || best.gain < MIN_INFO_GAIN) {
      shouldStop = true;
    } else {
      nextQuestion = {
        type: 'single',
        text: `Do you have ${symptomPhrase(best.symptom)}?`,
        items: [
          { id: best.symptom, name: 'Yes', choice_id: 'present' },
          { id: best.symptom, name: 'No', choice_id: 'absent' },
          { id: best.symptom, name: "I'm not sure", choice_id: 'unknown' },
        ],
        _gain: Number(best.gain.toFixed(4)),
      };
    }
  }

  return { conditions: post, nextQuestion, shouldStop, redFlags };
}

/** Suggest additional symptoms worth reporting (top information-gain items). */
export function suggest(evidence = [], limit = 6) {
  const present = new Set();
  const absent = new Set();
  for (const e of evidence || []) {
    if (!e || !e.id) continue;
    if (e.choice_id === 'absent') absent.add(e.id);
    else if (e.choice_id !== 'unknown') present.add(e.id);
  }
  return questionGains(present, absent)
    .slice(0, limit)
    .map(({ symptom }) => ({
      id: symptom,
      name: displayName(symptom),
      common_name: displayName(symptom),
    }));
}

/** Symptom substring search over the display names. */
export function searchSymptoms(phrase, limit = 12) {
  const q = String(phrase || '').toLowerCase().trim();
  if (q.length < 2) return [];
  const results = [];
  for (const s of KB.symptoms) {
    const name = displayName(s);
    if (name.toLowerCase().includes(q) || s.includes(q.replace(/\s+/g, '_'))) {
      results.push({ id: s, name, common_name: name });
    }
    if (results.length >= limit) break;
  }
  return results;
}

export function conditionInfo(id) {
  if (!KB.diseases.includes(id)) return null;
  return {
    id,
    name: KB.diseaseNames[id],
    common_name: KB.diseaseNames[id],
    short_description:
      KB.descriptions[id] ||
      'A condition that may match the reported symptoms. Consult a healthcare professional for an accurate diagnosis.',
    precautions: KB.precautions[id] || [],
    category: { name: KB.specialization[id] || 'General' },
  };
}

export function specializationFor(nameOrSlug = '') {
  const slug = String(nameOrSlug)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  if (KB.specialization[slug]) return KB.specialization[slug];
  // Fallback: keyword heuristic for unmapped names.
  const n = String(nameOrSlug).toLowerCase();
  if (n.includes('heart') || n.includes('chest')) return 'Cardiologist';
  if (n.includes('migraine') || n.includes('brain') || n.includes('paralysis'))
    return 'Neurologist';
  if (n.includes('hepat') || n.includes('jaundice') || n.includes('liver'))
    return 'Hepatologist';
  if (n.includes('pneumonia') || n.includes('tuberculosis') || n.includes('asthma'))
    return 'Pulmonologist';
  if (n.includes('diabet') || n.includes('thyroid')) return 'Endocrinologist';
  if (n.includes('skin') || n.includes('fungal') || n.includes('acne'))
    return 'Dermatologist';
  return 'General Physician';
}

// --- display helpers -------------------------------------------------------
export function displayName(slug) {
  return KB.symptomNames[slug] || slug.replace(/_/g, ' ');
}
function symptomPhrase(slug) {
  const name = displayName(slug).toLowerCase();
  return /^(a |an )/.test(name) ? name : name;
}
export function diseaseName(slug) {
  return KB.diseaseNames[slug] || slug;
}

export const meta = KB.meta;
