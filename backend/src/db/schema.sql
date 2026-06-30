-- PostgreSQL schema for Symptom Checker

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'admin');
CREATE TYPE doctor_status AS ENUM ('pending', 'verified', 'rejected', 'suspended');
CREATE TYPE appointment_status AS ENUM ('available', 'booked', 'completed', 'cancelled');

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'patient',
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  biological_sex VARCHAR(20) CHECK (biological_sex IN ('male', 'female')),
  phone VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS doctor_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  specialization VARCHAR(150) NOT NULL,
  license_number VARCHAR(100) NOT NULL,
  license_document_url TEXT,
  years_experience INTEGER DEFAULT 0,
  bio TEXT,
  status doctor_status DEFAULT 'pending',
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS availability_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status appointment_status DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (doctor_id, start_time)
);

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES users(id),
  doctor_id UUID NOT NULL REFERENCES users(id),
  slot_id UUID REFERENCES availability_slots(id),
  symptom_session_id VARCHAR(100),
  chief_complaint TEXT,
  top_diagnosis VARCHAR(255),
  status appointment_status DEFAULT 'booked',
  notes TEXT,
  video_room_url TEXT,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctors_specialization ON doctor_profiles(specialization);
CREATE INDEX IF NOT EXISTS idx_doctors_status ON doctor_profiles(status);
CREATE INDEX IF NOT EXISTS idx_slots_doctor_time ON availability_slots(doctor_id, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_chat_appointment ON chat_messages(appointment_id);
