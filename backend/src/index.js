import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config, isApiMedicConfigured, isAbdmConfigured } from './config/index.js';
import { initPostgres } from './db/postgres.js';
import { initMongo } from './db/mongo.js';
import { setupSocket } from './socket/index.js';
import symptomRoutes from './routes/symptoms.js';
import authRoutes from './routes/auth.js';
import doctorRoutes from './routes/doctors.js';
import chatRoutes from './routes/chat.js';
import facilityRoutes from './routes/facilities.js';

const app = express();
const httpServer = createServer(app);

// Behind Traefik/nginx on the VPS: trust the first proxy hop so express and
// express-rate-limit see the real client IP (X-Forwarded-For) instead of the
// proxy's. Without this, per-IP rate limiting collapses to a single bucket.
app.set('trust proxy', 1);

// CLIENT_URL may be a comma-separated list of allowed origins.
const allowedOrigins = config.clientUrl.split(',').map((s) => s.trim()).filter(Boolean);
const corsOptions = {
  origin(origin, cb) {
    // Allow same-origin / non-browser (no Origin header) and whitelisted origins.
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
};

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, credentials: true },
});

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

// --- Rate limiting ---------------------------------------------------------
// Global baseline across the whole API.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down and try again shortly.' },
});
app.use('/api/', globalLimiter);

// Strict limiter for auth to blunt credential stuffing / brute force.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only count failed attempts toward the cap
  message: { error: 'Too many authentication attempts. Try again in 15 minutes.' },
});

// Limiter for the diagnosis endpoint (compute-bounded, abuse-prone).
const diagnoseLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many diagnosis requests. Please wait a few minutes.' },
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    engine: 'bayesian-differential-v1',
    apiMedicComparison: isApiMedicConfigured() ? 'enabled' : 'disabled',
    abdmFacilityLookup: isAbdmConfigured() ? 'enabled' : 'disabled',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/symptoms', diagnoseLimiter, symptomRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/facilities', facilityRoutes);

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  console.error('[Error]', err.message);
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
});

setupSocket(io);

async function start() {
  await initPostgres();
  await initMongo();

  httpServer.listen(config.port, () => {
    console.log(`\n🏥 Symptom Checker API running on http://localhost:${config.port}`);
    console.log(`   Diagnosis engine: bayesian-differential-v1 (self-hosted)`);
    console.log(`   ApiMedic comparison: ${isApiMedicConfigured() ? 'ENABLED' : 'disabled'}`);
    console.log(`   ABDM facility lookup: ${isAbdmConfigured() ? 'ENABLED' : 'disabled'}`);
    console.log(`   Allowed origins: ${allowedOrigins.join(', ')}\n`);
  });
}

start();
