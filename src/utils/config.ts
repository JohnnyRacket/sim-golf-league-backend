/**
 * Centralized configuration with validation.
 * All required environment variables are validated at import time.
 * In test/development, sensible defaults are used.
 * In production, missing required vars will throw.
 */

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

function requireEnv(name: string, defaultValue?: string): string {
  const value = process.env[name] || defaultValue;
  if (!value && isProduction) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  if (!value) {
    throw new Error(
      `Missing environment variable: ${name}. Set it in your environment or .env file.`
    );
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

// JWT
const DEFAULT_JWT_SECRET = isTest || !isProduction
  ? 'dev-jwt-secret-do-not-use-in-production'
  : undefined;

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction,
  isTest,

  // Server
  port: parseInt(process.env.PORT || '3000'),

  // JWT - required in production, default in dev/test
  jwtSecret: requireEnv('JWT_SECRET', DEFAULT_JWT_SECRET),

  // Database
  db: {
    host: optionalEnv('DB_HOST', 'localhost'),
    port: parseInt(optionalEnv('DB_PORT', '5432')),
    user: optionalEnv('DB_USER', 'postgres'),
    password: optionalEnv('DB_PASSWORD', 'postgres'),
    name: optionalEnv('DB_NAME', 'golf_sim_league'),
  },

  // CORS
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
    : (isProduction ? [] : true as const),

  // Email
  email: {
    address: process.env.EMAIL_ADDRESS || '',
    password: process.env.EMAIL_PASSWORD || '',
  },
} as const;
