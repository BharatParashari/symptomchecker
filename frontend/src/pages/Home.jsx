import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-medical-700 via-medical-600 to-teal-500 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggIGQ9Ik0zNiAzNGg2djZoLTZ6TTAgMzRoNnY2SDB6TTAgMGg2djZIMHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 md:py-32">
          <div className="max-w-2xl">
            <span className="inline-block rounded-full bg-white/20 px-4 py-1 text-sm font-medium backdrop-blur">
              AI-Powered Clinical Interview
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-tight md:text-5xl">
              Understand your symptoms. Connect with a doctor.
            </h1>
            <p className="mt-6 text-lg text-teal-50/90">
              MedCheck guides you through a structured clinical interview — the same pattern used by
              Infermedica's medical engine — then helps you book a consultation with a matched
              specialist.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/check" className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-medical-700 shadow-lg transition hover:bg-teal-50">
                Start Symptom Check
              </Link>
              <Link to="/register" className="rounded-xl border-2 border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                Register as Doctor
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-2xl font-bold text-slate-900">How it works</h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {[
            {
              step: '1',
              title: 'Clinical Interview',
              desc: 'Enter your age and sex, select symptoms, and answer dynamic follow-up questions.',
            },
            {
              step: '2',
              title: 'Ranked Results',
              desc: 'See possible conditions with likelihood levels and recommended next steps.',
            },
            {
              step: '3',
              title: 'Doctor Consultation',
              desc: 'Book a matched specialist and chat in real time via our secure platform.',
            },
          ].map((item) => (
            <div key={item.step} className="card text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-medical-100 text-medical-700 font-bold text-lg">
                {item.step}
              </div>
              <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-100 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-xl font-bold text-slate-900">Built with healthcare-grade architecture</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {['React + Tailwind', 'Node.js + Express', 'Infermedica API', 'PostgreSQL', 'MongoDB', 'JWT Auth', 'Socket.io'].map(
              (tech) => (
                <span key={tech} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
                  {tech}
                </span>
              )
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
