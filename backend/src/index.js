import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config/index.js';
import { initPostgres } from './db/postgres.js';
import { initMongo } from './db/mongo.js';
import { setupSocket } from './socket/index.js';
import symptomRoutes from './routes/symptoms.js';
import authRoutes from './routes/auth.js';
import doctorRoutes from './routes/doctors.js';
import chatRoutes from './routes/chat.js';
import { isInfermedicaConfigured } from './config/index.js';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: config.clientUrl, credentials: true },
});

app.use(helmet());
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    infermedica: isInfermedicaConfigured() ? 'live' : 'demo',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/symptoms', symptomRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/chat', chatRoutes);

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
    console.log(`   Infermedica: ${isInfermedicaConfigured() ? 'LIVE' : 'DEMO MODE (set INFERMEDICA_APP_ID/KEY)'}`);
    console.log(`   Frontend CORS: ${config.clientUrl}\n`);
  });
}

start();
