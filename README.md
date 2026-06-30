# MedCheck — AI Symptom Checker

A full-stack healthcare platform with an AI-powered clinical interview (Infermedica API), patient/doctor authentication, appointment booking, and real-time chat.

## Features

### Phase 1 — Core Symptom Checker
- **Infermedica API integration** with built-in demo mode (no API key required to start)
- **Clinical interview flow**: demographics → searchable symptom tags → dynamic follow-up questions
- **Results screen** with likelihood levels, recommended actions, and medical disclaimer

### Phase 2 — Tech Stack
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Databases**: PostgreSQL (users, doctors, appointments) + MongoDB (symptom session logs)
- **Auth**: JWT + bcrypt (patients & doctors)

### Phase 3 — Doctor Connection
- Doctor registration with credential verification workflow
- Specialization-based doctor matching from top diagnosis
- Availability slots and appointment booking

### Phase 4 — Real-Time Chat
- Socket.io powered consultation chat
- Message persistence in PostgreSQL
- Video placeholder (ready for Daily.co / Twilio integration)

### Phase 5 — Security Foundations
- Helmet, CORS, rate limiting
- Role-based access control
- HTTPS-ready architecture

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL (optional — required for auth/booking)
- MongoDB (optional — required for session logging)

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
```

Edit `.env`:
- Set `DATABASE_URL` for PostgreSQL
- Set `MONGODB_URI` for MongoDB
- Add Infermedica credentials from [developer.infermedica.com](https://developer.infermedica.com) (optional)

Initialize database:
```bash
npm run db:init
```

Start API:
```bash
npm run dev
```

API runs at **http://localhost:5000**

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at **http://localhost:5173**

---

## Infermedica Setup

1. Sign up at [developer.infermedica.com](https://developer.infermedica.com)
2. Create an app and copy **App ID** and **App Key**
3. Add to `backend/.env`:

```env
INFERMEDICA_APP_ID=your_app_id
INFERMEDICA_APP_KEY=your_app_key
INFERMEDICA_DEV_MODE=true
```

Without keys, the app runs in **demo mode** with mock symptoms and conditions.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/symptoms/search?q=` | Search symptoms |
| POST | `/api/symptoms/diagnose` | Run clinical interview step |
| POST | `/api/auth/register/patient` | Patient signup |
| POST | `/api/auth/register/doctor` | Doctor signup |
| POST | `/api/auth/login` | Login |
| GET | `/api/doctors/match?diagnosis=` | Match doctors by diagnosis |
| POST | `/api/doctors/appointments` | Book appointment |
| GET | `/api/chat/:appointmentId` | Chat history |

---

## Project Structure

```
symptom-checker/
├── backend/
│   └── src/
│       ├── routes/       # Express routes
│       ├── services/     # Infermedica, auth, doctors
│       ├── db/           # PostgreSQL + MongoDB
│       └── socket/       # Socket.io chat
└── frontend/
    └── src/
        ├── pages/        # Symptom checker, results, booking, chat
        └── components/   # UI components
```

---

## Deployment

| Component | Recommended |
|-----------|-------------|
| Frontend | Vercel / Netlify |
| Backend | Railway / Render |
| PostgreSQL | Railway / Supabase |
| MongoDB | MongoDB Atlas |

Set `CLIENT_URL` and `VITE_API_URL` / `VITE_SOCKET_URL` for production.

---

## Medical Disclaimer

This application is for **educational and demonstration purposes**. It is not a medical device and does not provide medical diagnoses. Always consult qualified healthcare professionals for medical advice.

For production use, review compliance requirements (HIPAA, DPDPA, etc.) and obtain appropriate legal review.
