import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ConditionCard from '../components/ConditionCard';

export default function Results() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('symptomResults');
    if (!raw) {
      navigate('/check');
      return;
    }
    setData(JSON.parse(raw));
  }, [navigate]);

  if (!data) return null;

  const topCondition = data.conditions?.[0];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Assessment Results</h1>

      {data.hasEmergency && (
        <div className="mt-4 rounded-xl border-2 border-red-400 bg-red-50 p-4">
          <p className="font-bold text-red-800">⚠️ Seek emergency care immediately</p>
          <p className="mt-1 text-sm text-red-700">
            Based on your reported symptoms, you should go to an emergency department or call emergency
            services now.
          </p>
        </div>
      )}

      <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
        <strong>Not a medical diagnosis.</strong> {data.disclaimer}
      </div>

      {data.demoMode && (
        <div className="mt-3 text-xs text-slate-500">Results generated in demo mode with sample data.</div>
      )}

      <div className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold">Possible conditions</h2>
        {data.conditions?.length ? (
          data.conditions.map((c, i) => <ConditionCard key={c.id || i} condition={c} rank={i + 1} />)
        ) : (
          <p className="text-slate-600">No conditions matched. Consider consulting a healthcare provider.</p>
        )}
      </div>

      <div className="mt-10 card bg-medical-50 border-medical-200">
        <h3 className="font-semibold text-medical-900">Want to speak with a doctor?</h3>
        <p className="mt-2 text-sm text-medical-800">
          Based on your top result
          {topCondition && (
            <>
              {' '}
              (<em>{topCondition.common_name || topCondition.name}</em>)
            </>
          )}
          , we recommend a <strong>{data.recommendedSpecialization}</strong>.
        </p>
        <Link
          to={`/book?diagnosis=${encodeURIComponent(topCondition?.common_name || topCondition?.name || '')}&session=${data.sessionId || ''}`}
          className="btn-primary mt-4 inline-block"
        >
          Find & Book a Doctor
        </Link>
      </div>

      <div className="mt-6 text-center">
        <Link to="/check" className="text-sm text-medical-600 hover:underline">
          Start a new assessment
        </Link>
      </div>
    </div>
  );
}
