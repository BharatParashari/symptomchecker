export default function ProgressSteps({ steps, current }) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((label, i) => (
        <div key={label} className="flex flex-1 items-center">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                i <= current ? 'bg-medical-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}
            >
              {i + 1}
            </div>
            <span className="mt-1 hidden text-xs text-slate-500 sm:block">{label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`mx-2 h-0.5 flex-1 ${i < current ? 'bg-medical-600' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
