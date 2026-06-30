import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function BookDoctor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const diagnosis = searchParams.get('diagnosis') || '';
  const sessionId = searchParams.get('session') || '';

  const [match, setMatch] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .matchDoctors(diagnosis || 'general')
      .then(setMatch)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [diagnosis]);

  useEffect(() => {
    if (selectedDoctor) {
      api.getAvailability(selectedDoctor.id).then(setSlots).catch(() => setSlots([]));
    }
  }, [selectedDoctor]);

  const handleBook = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!selectedDoctor || !selectedSlot) return;
    setBooking(true);
    setError('');
    try {
      const appt = await api.bookAppointment({
        doctorId: selectedDoctor.id,
        slotId: selectedSlot.id,
        symptomSessionId: sessionId,
        topDiagnosis: diagnosis,
      });
      navigate(`/chat/${appt.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-medical-200 border-t-medical-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">Book a Consultation</h1>
      {match && (
        <p className="mt-2 text-sm text-slate-600">
          Recommended specialty: <strong>{match.specialization}</strong>
        </p>
      )}
      {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {!user && (
        <div className="mt-4 card bg-medical-50">
          <p className="text-sm">Sign in as a patient to book an appointment.</p>
          <Link to="/login" className="btn-primary mt-3 inline-block text-xs">
            Sign in
          </Link>
        </div>
      )}

      <div className="mt-8 space-y-4">
        <h2 className="font-semibold">Available doctors</h2>
        {!match?.doctors?.length ? (
          <p className="text-sm text-slate-500">No verified doctors available yet. Register as a doctor to populate the directory.</p>
        ) : (
          match.doctors.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                setSelectedDoctor(d);
                setSelectedSlot(null);
              }}
              className={`card w-full text-left transition ${
                selectedDoctor?.id === d.id ? 'ring-2 ring-medical-500' : 'hover:border-medical-300'
              }`}
            >
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold">
                    Dr. {d.first_name} {d.last_name}
                  </p>
                  <p className="text-sm text-slate-600">{d.specialization}</p>
                  <p className="text-xs text-slate-400">
                    {d.years_experience} yrs exp · ★ {Number(d.rating).toFixed(1)} ({d.review_count} reviews)
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {selectedDoctor && (
        <div className="mt-8">
          <h2 className="font-semibold">Select a time slot</h2>
          {slots.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No open slots in the next 2 weeks.</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {slots.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSlot(s)}
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    selectedSlot?.id === s.id
                      ? 'border-medical-600 bg-medical-50 text-medical-800'
                      : 'border-slate-200 hover:border-medical-300'
                  }`}
                >
                  {new Date(s.start_time).toLocaleString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </button>
              ))}
            </div>
          )}
          {selectedSlot && user && (
            <button className="btn-primary mt-6" onClick={handleBook} disabled={booking}>
              {booking ? 'Booking…' : 'Confirm booking'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
