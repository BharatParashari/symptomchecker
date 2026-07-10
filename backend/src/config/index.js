import dotenv from 'dotenv';
import { randomBytes } from 'crypto';

dotenv.config();

const isProd = (process.env.NODE_ENV || 'development') === 'production';

/**
 * Resolve the JWT signing secret.
 * SECURITY: never fall back to a hardcoded default. In production a missing or
 * weak secret is a fatal misconfiguration (it would let anyone forge sessions
 * with a publicly-known key), so we refuse to start. In development we generate
 * a random ephemeral secret so local dev works without config — but tokens
 * won't survive a restart, nudging devs to set a real one.
 */
function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (isProd) {
    console.error(
      '[FATAL] JWT_SECRET is missing or too short (need >= 32 chars). Refusing to start in production.'
    );
    process.exit(1);
  }
  console.warn(
    '[WARN] JWT_SECRET not set or weak — using a random ephemeral dev secret. Set JWT_SECRET for stable auth.'
  );
  return secret || randomBytes(48).toString('hex');
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: jwtSecret(),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  databaseUrl: process.env.DATABASE_URL,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/symptom_checker',
  // Optional secondary diagnosis source for side-by-side comparison.
  apimedic: {
    username: process.env.APIMEDIC_USERNAME,
    password: process.env.APIMEDIC_PASSWORD,
    authUrl: process.env.APIMEDIC_AUTH_URL || 'https://authservice.priaid.ch/login',
    baseUrl: process.env.APIMEDIC_BASE_URL || 'https://healthservice.priaid.ch',
    language: process.env.APIMEDIC_LANGUAGE || 'en-gb',
  },
  // India ABDM Health Facility Registry (real hospital/clinic lookups).
  abdm: {
    clientId: process.env.ABDM_CLIENT_ID,
    clientSecret: process.env.ABDM_CLIENT_SECRET,
    baseUrl: process.env.ABDM_BASE_URL || 'https://facilitysbx.abdm.gov.in',
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};

export const isApiMedicConfigured = () =>
  Boolean(config.apimedic.username && config.apimedic.password);

export const isAbdmConfigured = () =>
  Boolean(config.abdm.clientId && config.abdm.clientSecret);
