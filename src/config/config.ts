import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  host: process.env.HOST || '127.0.0.1',
  nodeEnv: process.env.NODE_ENV || 'development',
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  database: {
    url: process.env.DATABASE_URL || 'sqlite:./dev.db',
  },
  api: {
    baseUrl: process.env.API_BASE_URL || 'http://localhost:5000/api',
  },
};

export default config;
