import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navLink = (to, label) => (
    <Link
      to={to}
      className={`text-sm font-medium transition ${
        location.pathname === to ? 'text-medical-700' : 'text-slate-600 hover:text-medical-600'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-medical-600 text-white font-bold text-lg">
              +
            </span>
            <span className="text-lg font-bold text-slate-900">MedCheck</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {navLink('/check', 'Symptom Checker')}
            {user?.role === 'patient' && navLink('/appointments', 'My Appointments')}
            {user?.role === 'doctor' && navLink('/doctor', 'Doctor Portal')}
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-500">
                  {user.first_name} {user.last_name}
                </span>
                <button onClick={logout} className="btn-secondary py-2 px-3 text-xs">
                  Sign out
                </button>
              </div>
            ) : (
              <>
                {navLink('/login', 'Sign in')}
                <Link to="/register" className="btn-primary py-2 px-4 text-xs">
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-slate-500">
          <p className="font-medium text-slate-700">Medical Disclaimer</p>
          <p className="mt-2 max-w-2xl mx-auto">
            MedCheck provides health information for educational purposes only. It is not a substitute
            for professional medical advice, diagnosis, or treatment. Always seek the advice of a
            qualified healthcare provider with any questions regarding a medical condition.
          </p>
          <p className="mt-4 text-xs">© {new Date().getFullYear()} MedCheck — Built for learning purposes</p>
        </div>
      </footer>
    </div>
  );
}
