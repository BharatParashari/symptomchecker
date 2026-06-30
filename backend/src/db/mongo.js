import mongoose from 'mongoose';
import { config } from '../config/index.js';

const symptomSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, default: null },
    sex: String,
    age: Number,
    evidence: [
      {
        id: String,
        name: String,
        choice_id: String,
        source: String,
      },
    ],
    interviewId: String,
    conditions: [
      {
        id: String,
        name: String,
        common_name: String,
        probability: Number,
        triage_level: String,
      },
    ],
    hasEmergency: Boolean,
    completedAt: Date,
  },
  { timestamps: true }
);

export const SymptomSession =
  mongoose.models.SymptomSession ||
  mongoose.model('SymptomSession', symptomSessionSchema);

export async function initMongo() {
  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log('[DB] MongoDB connected');
    return true;
  } catch (err) {
    console.warn('[DB] MongoDB unavailable:', err.message);
    return false;
  }
}
