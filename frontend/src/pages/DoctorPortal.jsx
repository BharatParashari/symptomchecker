import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function DoctorPortal() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [slotDate, setSlotDate] = useState('');
  const [slotTime, setSlotTime] = useState('09:00');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'doctor')) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user?.role === 'doctor') {
      api.myAppointments().then(setAppointments).catch(() => {});
    }
  }, [user]);

  const addSlot = async (e) => {
    e.preventDefault();
    if (!slotDate) return;
    const start = new Date(`${slotDate}T${slotTime}:00`);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    try {
      await api.addAvailability([
        { startTime: start.toISOString(), endTime: end.toISOString() },
      ]);
      setMessage('Availability slot added.');
      setSlotDate('');
    } catch (err) {
      setMessage(err.message);
    }
  };

  if (authLoading || !user) return null;

  const statusLabel = user.doctor_status || 'pending';

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold">Doctor Portal</h1>
      <p className="mt-1 text-slate-600">
        Dr. {user.first_name} {user.last_name} — {user.specialization || 'Pending profile'}
      </p>

      <div className={`mt-4 inline-block rounded-lg px-4 py-2 text-sm font-medium ${
        statusLabel === 'verified' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
      }`}>
        Account status: {statusLabel}
        {statusLabel === 'pending' && ' — awaiting credential verification'}
      </div>

      {statusLabel === 'verified' && (
        <>
          <div className="card mt-8">
            <h2 className="font-semibold">Add availability</h2>
            <form onSubmit={addSlot} className="mt-4 flex flex-wrap gap-3 items-end">
              <div>
                <label className="label">Date</label>
                <input className="input" type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} required />
              </div>
              <div>
                <label className="label">Start time</label>
                <input className="input" type="time" value={slotTime} onChange={(e) => setSlotTime(e.target.value)} />
              </div>
              <button type="submit" className="btn-primary">Add 30-min slot</button>
            </form>
            {message && <p className="mt-2 text-sm text-medical-700">{message}</p>}
          </div>

          <div className="mt-8">
            <h2 className="font-semibold">Your appointments</h2>
            {appointments.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No appointments yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {appointments.map((a) => (
                  <li key={a.id} className="card flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        {a.patient_first_name} {a.patient_last_name}
                      </p>
                      <p className="text-sm text-slate-500">
                        {new Date(a.scheduled_start).toLocaleString()} — {a.status}
                      </p>
                      {a.top_diagnosis && (
                        <p className="text-xs text-slate-400">Chief concern: {a.top_diagnosis}</p>
                      )}
                    </div>
                    <Link to={`/chat/${a.id}`} className="btn-primary text-xs py-2 px-3">
                      Open Chat
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
