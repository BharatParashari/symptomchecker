import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get('role') === 'doctor' ? 'doctor' : 'patient';
  const { registerPatient, registerDoctor } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState(defaultRole);
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    biologicalSex: '',
    phone: '',
    specialization: '',
    licenseNumber: '',
    yearsExperience: '',
    bio: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (role === 'patient') {
        await registerPatient(form);
        navigate('/check');
      } else {
        await registerDoctor(form);
        navigate('/doctor');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="card">
        <h1 className="text-xl font-bold">Create account</h1>
        <div className="mt-4 flex gap-2">
          {['patient', 'doctor'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`flex-1 rounded-xl border-2 py-2 text-sm font-medium capitalize ${
                role === r ? 'border-medical-600 bg-medical-50 text-medical-700' : 'border-slate-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First name</label>
              <input className="input" value={form.firstName} onChange={set('firstName')} required />
            </div>
            <div>
              <label className="label">Last name</label>
              <input className="input" value={form.lastName} onChange={set('lastName')} required />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={set('email')} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={form.password} onChange={set('password')} required minLength={8} />
          </div>
          {role === 'patient' ? (
            <>
              <div>
                <label className="label">Date of birth</label>
                <input className="input" type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
              </div>
              <div>
                <label className="label">Biological sex</label>
                <select className="input" value={form.biologicalSex} onChange={set('biologicalSex')}>
                  <option value="">Select…</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="label">Specialization</label>
                <input className="input" value={form.specialization} onChange={set('specialization')} placeholder="e.g. General Physician" required />
              </div>
              <div>
                <label className="label">Medical license number</label>
                <input className="input" value={form.licenseNumber} onChange={set('licenseNumber')} required />
              </div>
              <div>
                <label className="label">Years of experience</label>
                <input className="input" type="number" min="0" value={form.yearsExperience} onChange={set('yearsExperience')} />
              </div>
              <div>
                <label className="label">Bio</label>
                <textarea className="input" rows={3} value={form.bio} onChange={set('bio')} />
              </div>
              <p className="text-xs text-slate-500">Doctor accounts require manual credential verification before activation.</p>
            </>
          )}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          Already have an account? <Link to="/login" className="text-medical-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
