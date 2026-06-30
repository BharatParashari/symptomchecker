export default function InterviewQuestion({ question, onAnswer, loading, onBack }) {
  const handleSelect = (item) => {
    onAnswer([
      {
        id: item.id,
        choice_id: item.choice_id || 'present',
      },
    ]);
  };

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">{question.text}</h2>
      <div className="space-y-2">
        {(question.items || []).map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={loading}
            onClick={() => handleSelect(item)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-medium transition hover:border-medical-400 hover:bg-medical-50 disabled:opacity-50"
          >
            {item.name}
          </button>
        ))}
      </div>
      <button className="btn-secondary w-full" onClick={onBack} disabled={loading}>
        Back
      </button>
    </div>
  );
}
