import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function Appointments() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) api.myAppointments().then(setAppointments).catch(() => {});
  }, [user]);

  if (authLoading || !user) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">My Appointments</h1>
      {appointments.length === 0 ? (
        <div className="card mt-8 text-center">
          <p className="text-slate-600">No appointments yet.</p>
          <Link to="/check" className="btn-primary mt-4 inline-block">
            Run symptom check
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {appointments.map((a) => (
            <li key={a.id} className="card">
              <div className="flex flex-wrap justify-between gap-4">
                <div>
                  <p className="font-semibold">
                    Dr. {a.doctor_first_name} {a.doctor_last_name}
                  </p>
                  <p className="text-sm text-slate-600">{a.specialization}</p>
                  <p className="mt-1 text-sm">
                    {new Date(a.scheduled_start).toLocaleString()}
                  </p>
                  <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize">
                    {a.status}
                  </span>
                </div>
                <Link to={`/chat/${a.id}`} className="btn-primary self-start text-xs py-2 px-4">
                  Chat with doctor
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
