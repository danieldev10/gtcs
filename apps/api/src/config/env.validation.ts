import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_HOST: z.string().optional(),
  API_PREFIX: z.string().min(1).default('api'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  AUTH_JWT_SECRET: z.string().min(32).default('dev-only-change-this-auth-secret-before-production'),
  AUTH_ACCESS_TOKEN_EXPIRES_SECONDS: z.coerce.number().int().positive().default(604800),
  AUTH_EMAIL_VERIFICATION_EXPIRES_HOURS: z.coerce.number().int().positive().default(24),

  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),

  AWS_REGION: z.string().default('eu-west-1'),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_PRESIGN_EXPIRES_SECONDS: z.coerce.number().int().positive().default(900),

  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('AUN SITC Graduation <no-reply@aun.edu.ng>'),

  WEB_PUBLIC_URL: z.string().url().default('http://localhost:3000'),
  API_PUBLIC_URL: z.string().url().default('http://localhost:4000'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }

  if (
    parsed.data.NODE_ENV === 'production' &&
    parsed.data.AUTH_JWT_SECRET === 'dev-only-change-this-auth-secret-before-production'
  ) {
    throw new Error('AUTH_JWT_SECRET must be set to a strong unique value in production.');
  }

  return parsed.data;
}
