const LIKELIHOOD_STYLES = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  low: 'bg-slate-100 text-slate-700 border-slate-200',
};

const ACTION_STYLES = {
  emergency: 'bg-red-600 text-white',
  consultation: 'bg-amber-500 text-white',
  consultation_24: 'bg-orange-400 text-white',
  self_care: 'bg-green-600 text-white',
};

export default function ConditionCard({ condition, rank }) {
  const likelihood = condition.likelihood || 'low';
  const action = condition.recommended_action || 'See a GP';
  const triage = condition.triage_level || 'consultation';

  return (
    <div className="card flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
        #{rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-900">
            {condition.common_name || condition.name}
          </h3>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase ${LIKELIHOOD_STYLES[likelihood]}`}
          >
            {likelihood} likelihood
          </span>
        </div>
        {condition.probability != null && (
          <p className="mt-1 text-xs text-slate-500">
            Estimated probability: {Math.round(condition.probability * 100)}%
          </p>
        )}
        <div className="mt-3">
          <span className={`inline-block rounded-lg px-3 py-1 text-xs font-semibold ${ACTION_STYLES[triage] || ACTION_STYLES.consultation}`}>
            {action}
          </span>
        </div>
      </div>
    </div>
  );
}
