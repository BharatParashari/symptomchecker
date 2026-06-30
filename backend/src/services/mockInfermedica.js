const MOCK_SYMPTOMS = [
  { id: 's_1193', name: 'Headache', common_name: 'Headache' },
  { id: 's_488', name: 'Fever', common_name: 'Fever' },
  { id: 's_418', name: 'Cough', common_name: 'Cough' },
  { id: 's_102', name: 'Fatigue', common_name: 'Fatigue' },
  { id: 's_305', name: 'Sore throat', common_name: 'Sore throat' },
  { id: 's_216', name: 'Nausea', common_name: 'Nausea' },
  { id: 's_98', name: 'Chest pain', common_name: 'Chest pain' },
  { id: 's_241', name: 'Shortness of breath', common_name: 'Shortness of breath' },
  { id: 's_156', name: 'Abdominal pain', common_name: 'Abdominal pain' },
  { id: 's_312', name: 'Runny nose', common_name: 'Runny nose' },
  { id: 's_501', name: 'Body aches', common_name: 'Body aches' },
  { id: 's_207', name: 'Dizziness', common_name: 'Dizziness' },
];

const MOCK_CONDITIONS = [
  {
    id: 'c_49',
    name: 'Common cold',
    common_name: 'Common cold',
    probability: 0.62,
    acuteness: 'chronic',
  },
  {
    id: 'c_78',
    name: 'Influenza',
    common_name: 'Flu',
    probability: 0.28,
    acuteness: 'chronic',
  },
  {
    id: 'c_112',
    name: 'Viral upper respiratory infection',
    common_name: 'Upper respiratory infection',
    probability: 0.18,
    acuteness: 'chronic',
  },
  {
    id: 'c_234',
    name: 'Tension headache',
    common_name: 'Tension headache',
    probability: 0.15,
    acuteness: 'chronic',
  },
  {
    id: 'c_301',
    name: 'Migraine',
    common_name: 'Migraine',
    probability: 0.08,
    acuteness: 'chronic',
  },
];

const FOLLOW_UP_QUESTIONS = [
  {
    type: 'single',
    text: 'How long have you had these symptoms?',
    items: [
      { id: 'duration_1', name: 'Less than 24 hours', choice_id: 'present' },
      { id: 'duration_2', name: '1–3 days', choice_id: 'present' },
      { id: 'duration_3', name: 'More than a week', choice_id: 'present' },
    ],
  },
  {
    type: 'single',
    text: 'Are your symptoms getting worse?',
    items: [
      { id: 'worse_yes', name: 'Yes, getting worse', choice_id: 'present' },
      { id: 'worse_no', name: 'No, stable or improving', choice_id: 'present' },
    ],
  },
];

function probabilityToLevel(p) {
  if (p >= 0.5) return 'high';
  if (p >= 0.2) return 'medium';
  return 'low';
}

function triageFromProbability(prob, hasEmergency) {
  if (hasEmergency) return 'emergency';
  if (prob >= 0.5) return 'consultation';
  if (prob >= 0.25) return 'consultation_24';
  return 'self_care';
}

export const mockInfermedica = {
  searchSymptoms(phrase) {
    const q = phrase.toLowerCase();
    return MOCK_SYMPTOMS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.common_name.toLowerCase().includes(q)
    );
  },

  suggest({ evidence = [] }) {
    const ids = new Set(evidence.map((e) => e.id));
    return MOCK_SYMPTOMS.filter((s) => !ids.has(s.id)).slice(0, 5);
  },

  diagnose({ evidence = [] }) {
    const presentCount = evidence.filter((e) => e.choice_id === 'present').length;
    const hasEmergency = evidence.some((e) => e.id === 's_98' || e.id === 's_241');
    const questionIndex = Math.min(presentCount - 1, FOLLOW_UP_QUESTIONS.length - 1);
    const shouldStop = presentCount >= 3 && questionIndex >= FOLLOW_UP_QUESTIONS.length - 1;

    const conditions = MOCK_CONDITIONS.map((c, i) => ({
      ...c,
      probability: Math.max(0.05, c.probability - i * 0.02 + presentCount * 0.03),
    }))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 5)
      .map((c) => ({
        ...c,
        triage_level: triageFromProbability(c.probability, hasEmergency),
        likelihood: probabilityToLevel(c.probability),
      }));

    return {
      question: shouldStop ? null : FOLLOW_UP_QUESTIONS[Math.max(0, questionIndex)],
      conditions,
      should_stop: shouldStop,
      has_emergency_evidence: hasEmergency,
      extras: { demo_mode: true },
    };
  },

  getConditionInfo(id) {
    const c = MOCK_CONDITIONS.find((x) => x.id === id);
    return (
      c && {
        id: c.id,
        name: c.name,
        common_name: c.common_name,
        short_description:
          'A common condition that may match your reported symptoms. Consult a healthcare professional for an accurate diagnosis.',
        category: { name: 'General' },
      }
    );
  },
};

export function enrichConditions(conditions, hasEmergency) {
  return (conditions || []).map((c) => ({
    ...c,
    likelihood: probabilityToLevel(c.probability),
    triage_level: c.triage_level || triageFromProbability(c.probability, hasEmergency),
    recommended_action: actionLabel(c.triage_level || triageFromProbability(c.probability, hasEmergency)),
  }));
}

export function actionLabel(triageLevel) {
  const map = {
    emergency: 'Go to Emergency',
    consultation: 'See a GP soon',
    consultation_24: 'See a GP within 24 hours',
    self_care: 'Self-care',
  };
  return map[triageLevel] || 'See a GP';
}

export function specializationForCondition(name = '') {
  const n = name.toLowerCase();
  if (n.includes('heart') || n.includes('chest')) return 'Cardiologist';
  if (n.includes('respiratory') || n.includes('cold') || n.includes('flu') || n.includes('cough'))
    return 'Pulmonologist';
  if (n.includes('headache') || n.includes('migraine')) return 'Neurologist';
  if (n.includes('abdominal') || n.includes('stomach')) return 'Gastroenterologist';
  return 'General Physician';
}
