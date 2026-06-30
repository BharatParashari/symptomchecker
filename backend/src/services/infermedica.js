import { v4 as uuidv4 } from 'uuid';
import { config, isInfermedicaConfigured } from '../config/index.js';
import {
  mockInfermedica,
  enrichConditions,
  specializationForCondition,
} from './mockInfermedica.js';

async function infermedicaFetch(path, options = {}) {
  const headers = {
    'App-Id': config.infermedica.appId,
    'App-Key': config.infermedica.appKey,
    'Content-Type': 'application/json',
    ...(options.interviewId && { 'Interview-Id': options.interviewId }),
    ...(config.infermedica.devMode && { 'Dev-Mode': 'true' }),
  };

  const res = await fetch(`${config.infermedica.baseUrl}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Infermedica API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function searchSymptoms(phrase, { sex, age } = {}) {
  if (!isInfermedicaConfigured()) {
    return mockInfermedica.searchSymptoms(phrase);
  }
  const params = new URLSearchParams({ phrase, sex: sex || 'male', age: String(age || 30) });
  return infermedicaFetch(`/search?${params}`);
}

export async function suggestSymptoms({ sex, age, evidence, interviewId }) {
  if (!isInfermedicaConfigured()) {
    return mockInfermedica.suggest({ evidence });
  }
  return infermedicaFetch('/suggest', {
    method: 'POST',
    interviewId,
    body: { sex, age: { value: age }, evidence, suggest_method: 'symptoms' },
  });
}

export async function runDiagnosis({ sex, age, evidence, interviewId }) {
  if (!isInfermedicaConfigured()) {
    const result = mockInfermedica.diagnose({ evidence });
    return {
      ...result,
      conditions: enrichConditions(result.conditions, result.has_emergency_evidence),
      interviewId: interviewId || uuidv4(),
      demoMode: true,
    };
  }

  const result = await infermedicaFetch('/diagnosis', {
    method: 'POST',
    interviewId,
    body: { sex, age: { value: age }, evidence },
  });

  return {
    ...result,
    conditions: enrichConditions(result.conditions, result.has_emergency_evidence),
    interviewId: interviewId || uuidv4(),
    demoMode: false,
  };
}

export async function getConditionInfo(id) {
  if (!isInfermedicaConfigured()) {
    return mockInfermedica.getConditionInfo(id);
  }
  return infermedicaFetch(`/conditions/${id}`);
}

export { specializationForCondition, enrichConditions };
