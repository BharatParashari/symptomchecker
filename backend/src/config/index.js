import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  databaseUrl: process.env.DATABASE_URL,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/symptom_checker',
  infermedica: {
    appId: process.env.INFERMEDICA_APP_ID,
    appKey: process.env.INFERMEDICA_APP_KEY,
    devMode: process.env.INFERMEDICA_DEV_MODE === 'true',
    baseUrl: 'https://api.infermedica.com/v3',
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};

export const isInfermedicaConfigured = () =>
  Boolean(config.infermedica.appId && config.infermedica.appKey);
