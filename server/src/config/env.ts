import dotenv from 'dotenv';
dotenv.config();

/**
 * Environment configuration
 * All values are validated at startup to catch missing secrets early.
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    if (process.env.NODE_ENV === 'test') {
      const testDefaults: Record<string, string> = {
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/devsync',
        JWT_SECRET: 'test-jwt-secret-key-32-chars-long-min',
        JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-key-32-chars',
      };
      if (testDefaults[key]) return testDefaults[key];
    }
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

function parseOrigins(raw: string): string[] {
  return raw.split(',').map((origin) => origin.trim());
}

export const env = {
  NODE_ENV: optionalEnv('NODE_ENV', 'development'),
  PORT: parseInt(optionalEnv('PORT', '5000'), 10),

  DATABASE_URL: requireEnv('DATABASE_URL'),

  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_REFRESH_SECRET: requireEnv('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRY: optionalEnv('JWT_ACCESS_EXPIRES_IN', optionalEnv('JWT_ACCESS_EXPIRY', '15m')),
  JWT_REFRESH_EXPIRY: optionalEnv('JWT_REFRESH_EXPIRES_IN', optionalEnv('JWT_REFRESH_EXPIRY', '7d')),

  ALLOWED_ORIGINS: parseOrigins(
    optionalEnv('WEB_ORIGIN', optionalEnv('CLIENT_URL', 'http://localhost:3000,http://localhost:8081')),
  ),

  STORAGE_PROVIDER: optionalEnv('STORAGE_PROVIDER', 'local') as 'local' | 'cloudinary',
  LOCAL_UPLOAD_DIR: optionalEnv('LOCAL_UPLOAD_DIR', 'uploads'),
  MAX_FILE_SIZE_MB: parseInt(optionalEnv('MAX_FILE_SIZE_MB', '10'), 10),

  CLOUDINARY_CLOUD_NAME: optionalEnv('CLOUDINARY_CLOUD_NAME', ''),
  CLOUDINARY_API_KEY: optionalEnv('CLOUDINARY_API_KEY', ''),
  CLOUDINARY_API_SECRET: optionalEnv('CLOUDINARY_API_SECRET', ''),

  RATE_LIMIT_WINDOW_MS: parseInt(optionalEnv('RATE_LIMIT_WINDOW_MS', '900000'), 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(optionalEnv('RATE_LIMIT_MAX_REQUESTS', '100'), 10),

  get isProduction() {
    return this.NODE_ENV === 'production';
  },
  get isDevelopment() {
    return this.NODE_ENV === 'development';
  },
} as const;
