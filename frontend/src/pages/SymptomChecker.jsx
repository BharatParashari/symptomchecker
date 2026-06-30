import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import SymptomTagInput from '../components/SymptomTagInput';
import InterviewQuestion from '../components/InterviewQuestion';
import ProgressSteps from '../components/ProgressSteps';

const STEPS = ['Demographics', 'Symptoms', 'Follow-up', 'Results'];

export default function SymptomChecker() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [demoMode, setDemoMode] = useState(true);
  const [sex, setSex] = useState('');
  const [age, setAge] = useState('');
  const [evidence, setEvidence] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [question, setQuestion] = useState(null);
  const [interviewId, setInterviewId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.symptomStatus().then((s) => setDemoMode(s.demoMode)).catch(() => {});
  }, []);

  const runDiagnosis = useCallback(
    async (updatedEvidence) => {
      setLoading(true);
      setError('');
      try {
        const result = await api.diagnose({
          sex,
          age: parseInt(age, 10),
          evidence: updatedEvidence,
          interviewId,
          sessionId,
        });
        if (result.interviewId) setInterviewId(result.interviewId);
        if (result.sessionId) setSessionId(result.sessionId);

        if (result.shouldStop) {
          sessionStorage.setItem(
            'symptomResults',
            JSON.stringify({
              conditions: result.conditions,
              hasEmergency: result.hasEmergency,
              sessionId: result.sessionId,
              recommendedSpecialization: result.recommendedSpecialization,
              disclaimer: result.disclaimer,
              demoMode: result.demoMode,
            })
          );
          navigate('/results');
          return;
        }

        if (result.question) {
          setQuestion(result.question);
          setStep(2);
        } else {
          sessionStorage.setItem(
            'symptomResults',
            JSON.stringify({
              conditions: result.conditions,
              hasEmergency: result.hasEmergency,
              sessionId: result.sessionId,
              recommendedSpecialization: result.recommendedSpecialization,
              disclaimer: result.disclaimer,
              demoMode: result.demoMode,
            })
          );
          navigate('/results');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [sex, age, interviewId, sessionId, navigate]
  );

  const loadSuggestions = async (currentEvidence) => {
    try {
      const data = await api.suggestSymptoms({
        sex,
        age: parseInt(age, 10),
        evidence: currentEvidence,
        interviewId,
      });
      setSuggestions(data);
    } catch {
      /* optional */
    }
  };

  const addSymptom = (symptom) => {
    if (evidence.some((e) => e.id === symptom.id)) return;
    const updated = [
      ...evidence,
      {
        id: symptom.id,
        name: symptom.common_name || symptom.name,
        choice_id: 'present',
        source: evidence.length === 0 ? 'initial' : undefined,
      },
    ];
    setEvidence(updated);
    loadSuggestions(updated);
  };

  const removeSymptom = (id) => {
    const updated = evidence.filter((e) => e.id !== id);
    setEvidence(updated);
    loadSuggestions(updated);
  };

  const handleDemographicsNext = () => {
    if (!sex || !age || parseInt(age, 10) < 1 || parseInt(age, 10) > 120) {
      setError('Please enter a valid age (1–120) and select biological sex.');
      return;
    }
    setError('');
    setStep(1);
    loadSuggestions([]);
  };

  const handleSymptomsNext = () => {
    if (evidence.length < 1) {
      setError('Please add at least one symptom.');
      return;
    }
    setError('');
    runDiagnosis(evidence);
  };

  const handleAnswerQuestion = (answerEvidence) => {
    const updated = [...evidence, ...answerEvidence];
    setEvidence(updated);
    setQuestion(null);
    runDiagnosis(updated);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Symptom Checker</h1>
        <p className="mt-1 text-sm text-slate-600">
          A guided clinical interview to help understand your symptoms.
        </p>
        {demoMode && (
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800">
            Demo mode — add your Infermedica API keys in backend/.env for live medical data.
          </div>
        )}
      </div>

      <ProgressSteps steps={STEPS} current={step} />

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="card mt-6">
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold">Tell us about yourself</h2>
            <p className="text-sm text-slate-600">
              Age and biological sex significantly affect medical assessments.
            </p>
            <div>
              <label className="label">Biological sex</label>
              <div className="flex gap-3">
                {['male', 'female'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSex(s)}
                    className={`flex-1 rounded-xl border-2 py-3 text-sm font-medium capitalize transition ${
                      sex === s
                        ? 'border-medical-600 bg-medical-50 text-medical-700'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label" htmlFor="age">
                Age
              </label>
              <input
                id="age"
                type="number"
                min="1"
                max="120"
                className="input"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 32"
              />
            </div>
            <button className="btn-primary w-full" onClick={handleDemographicsNext}>
              Continue
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold">What symptoms are you experiencing?</h2>
            <p className="text-sm text-slate-600">Search and select all symptoms that apply to you.</p>
            <SymptomTagInput
              evidence={evidence}
              onAdd={addSymptom}
              onRemove={removeSymptom}
              sex={sex}
              age={parseInt(age, 10)}
            />
            {suggestions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                  Commonly reported together
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => addSymptom(s)}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-medical-50 hover:border-medical-300 transition"
                    >
                      + {s.common_name || s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setStep(0)}>
                Back
              </button>
              <button className="btn-primary flex-1" onClick={handleSymptomsNext} disabled={loading}>
                {loading ? 'Analyzing…' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && question && (
          <InterviewQuestion
            question={question}
            onAnswer={handleAnswerQuestion}
            loading={loading}
            onBack={() => setStep(1)}
          />
        )}

        {loading && step !== 1 && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-medical-200 border-t-medical-600" />
          </div>
        )}
      </div>
    </div>
  );
}
