const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  health: () => request('/health'),
  symptomStatus: () => request('/symptoms/status'),
  searchSymptoms: (q, sex, age) =>
    request(`/symptoms/search?q=${encodeURIComponent(q)}&sex=${sex}&age=${age}`),
  suggestSymptoms: (body) => request('/symptoms/suggest', { method: 'POST', body: JSON.stringify(body) }),
  diagnose: (body) => request('/symptoms/diagnose', { method: 'POST', body: JSON.stringify(body) }),
  getCondition: (id) => request(`/symptoms/conditions/${id}`),

  registerPatient: (body) => request('/auth/register/patient', { method: 'POST', body: JSON.stringify(body) }),
  registerDoctor: (body) => request('/auth/register/doctor', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),

  listDoctors: (specialization) =>
    request(`/doctors${specialization ? `?specialization=${encodeURIComponent(specialization)}` : ''}`),
  matchDoctors: (diagnosis) => request(`/doctors/match?diagnosis=${encodeURIComponent(diagnosis)}`),
  getAvailability: (doctorId) => request(`/doctors/${doctorId}/availability`),
  bookAppointment: (body) => request('/doctors/appointments', { method: 'POST', body: JSON.stringify(body) }),
  myAppointments: () => request('/doctors/appointments/mine'),
  addAvailability: (slots) =>
    request('/doctors/availability', { method: 'POST', body: JSON.stringify({ slots }) }),

  getChat: (appointmentId) => request(`/chat/${appointmentId}`),
};

export function getSocketUrl() {
  return import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
}
