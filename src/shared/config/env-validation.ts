/**
 * Environment variable validation at startup.
 */

interface EnvVar {
  name: string;
  required: boolean;
  defaultValue?: string;
  validator?: (v: string) => boolean;
  errorMessage?: string;
}

const envVars: EnvVar[] = [
  { name: 'DB_HOST', required: true, defaultValue: 'localhost' },
  { name: 'DB_PORT', required: true, defaultValue: '3306', validator: (v) => !isNaN(parseInt(v, 10)) && parseInt(v, 10) > 0 && parseInt(v, 10) < 65536, errorMessage: 'DB_PORT must be 1-65535' },
  { name: 'DB_NAME', required: true, defaultValue: 'zox_db' },
  { name: 'DB_USER', required: true, defaultValue: 'zox_user' },
  { name: 'DB_PASSWORD', required: true, defaultValue: 'zox_password' },
  { name: 'REDIS_URL', required: false, defaultValue: 'redis://localhost:6379' },
  { name: 'JWT_SECRET', required: process.env.NODE_ENV === 'production' && !process.env.RUN_AS_CRON, errorMessage: 'JWT_SECRET required in production' },
  { name: 'NODE_ENV', required: false, defaultValue: 'development', validator: (v) => ['development', 'production', 'test'].includes(v), errorMessage: 'NODE_ENV must be development, production, or test' },
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const ev of envVars) {
    const value = process.env[ev.name] || ev.defaultValue;
    if (ev.required && !value) {
      errors.push(`Missing required env: ${ev.name}`);
      continue;
    }
    if (value && ev.validator && !ev.validator(value)) {
      errors.push(ev.errorMessage || `Invalid ${ev.name}: ${value}`);
    }
    if (!process.env[ev.name] && ev.defaultValue) {
      process.env[ev.name] = ev.defaultValue;
      warnings.push(`${ev.name} not set, using default: ${ev.defaultValue}`);
    }
  }
  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_SECRET === 'zox-nextjs-dev-secret-key-change-in-production-2025') warnings.push('Using default JWT_SECRET in production is insecure');
    if (process.env.DB_PASSWORD === 'zox_password') warnings.push('Using default DB_PASSWORD in production is insecure');
  }
  return { valid: errors.length === 0, errors, warnings };
}

export function validateEnvironmentOrExit(): void {
  const r = validateEnvironment();
  if (r.warnings.length > 0) {
    console.log('\n⚠️  Environment Warnings:');
    r.warnings.forEach((w) => console.log('   ' + w));
  }
  if (!r.valid) {
    console.error('\n❌ Environment Validation Failed:');
    r.errors.forEach((e) => console.error('   ' + e));
    console.error('\nFix environment variables and try again.\n');
    process.exit(1);
  }
  if (r.valid && r.errors.length === 0) console.log('✅ Environment validation passed');
}
