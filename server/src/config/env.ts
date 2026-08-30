import dotenv from 'dotenv';
dotenv.config();

/**
 * Centralized Environment Configuration & Validation
 * Validates required secrets at startup to fail-fast on missing configuration.
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || !value.trim()) {
    if (process.env.NODE_ENV === 'test') {
      const testDefaults: Record<string, string> = {
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/devsync?schema=public',
        JWT_SECRET: 'test-jwt-secret-key-32-chars-long-min-for-security',
        JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-key-32-chars-long-for-security',
      };
      if (testDefaults[key]) return testDefaults[key];
    }
    throw new Error(`[CRITICAL] Missing required environment variable: ${key}`);
  }
  return value.trim();
}

function optionalEnv(key: string, defaultValue: string): string {
  const value = process.env[key];
  return value && value.trim() ? value.trim() : defaultValue;
}

function parseOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const env = {
  NODE_ENV: optionalEnv('NODE_ENV', 'development'),
  PORT: parseInt(optionalEnv('PORT', '5000'), 10),
  LOG_LEVEL: optionalEnv('LOG_LEVEL', 'info') as 'info' | 'warn' | 'error' | 'debug',

  DATABASE_URL: requireEnv('DATABASE_URL'),

  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_REFRESH_SECRET: requireEnv('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRY: optionalEnv('JWT_ACCESS_EXPIRES_IN', optionalEnv('JWT_ACCESS_EXPIRY', '15m')),
  JWT_REFRESH_EXPIRY: optionalEnv('JWT_REFRESH_EXPIRES_IN', optionalEnv('JWT_REFRESH_EXPIRY', '7d')),

  ALLOWED_ORIGINS: parseOrigins(
    optionalEnv('WEB_ORIGIN', optionalEnv('CLIENT_URL', 'http://localhost:3000,http://localhost:8081')),
  ),

  STORAGE_PROVIDER: optionalEnv('STORAGE_PROVIDER', 'local') as 's3' | 'r2' | 'cloudinary' | 'local',
  LOCAL_UPLOAD_DIR: optionalEnv('LOCAL_UPLOAD_DIR', 'uploads'),
  MAX_FILE_SIZE_MB: parseInt(optionalEnv('MAX_FILE_SIZE_MB', '25'), 10),

  STORAGE_ENDPOINT: optionalEnv('STORAGE_ENDPOINT', ''),
  STORAGE_REGION: optionalEnv('STORAGE_REGION', 'us-east-1'),
  STORAGE_BUCKET: optionalEnv('STORAGE_BUCKET', ''),
  STORAGE_ACCESS_KEY: optionalEnv('STORAGE_ACCESS_KEY', ''),
  STORAGE_SECRET_KEY: optionalEnv('STORAGE_SECRET_KEY', ''),
  STORAGE_PUBLIC_URL: optionalEnv('STORAGE_PUBLIC_URL', ''),

  CLOUDINARY_CLOUD_NAME: optionalEnv('CLOUDINARY_CLOUD_NAME', ''),
  CLOUDINARY_API_KEY: optionalEnv('CLOUDINARY_API_KEY', ''),
  CLOUDINARY_API_SECRET: optionalEnv('CLOUDINARY_API_SECRET', ''),

  RATE_LIMIT_WINDOW_MS: parseInt(optionalEnv('RATE_LIMIT_WINDOW_MS', '900000'), 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(optionalEnv('RATE_LIMIT_MAX_REQUESTS', '300'), 10),

  get isProduction() {
    return this.NODE_ENV === 'production';
  },
  get isDevelopment() {
    return this.NODE_ENV === 'development';
  },
  get isTest() {
    return this.NODE_ENV === 'test';
  },
} as const;
