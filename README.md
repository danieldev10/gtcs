# SITC Graduation Clearance

Monorepo for automating the American University of Nigeria SITC graduation application, degree audit, and clearance workflow.

## Stack

- API: NestJS, Prisma, Supabase Postgres
- Web: Next.js, TypeScript, Tailwind CSS
- Files: AWS S3 presigned uploads
- Email: Google SMTP
- Deployments: Railway for API, Vercel for web

## Workspace

```text
apps/api        NestJS API deployed on Railway
apps/web        Next.js app deployed on Vercel
packages/shared Shared TypeScript contracts
```

## Local Setup

1. Install dependencies.

```bash
npm install
```

2. Create or update the API environment file at `apps/api/.env`.

3. Create or update the web environment file at `apps/web/.env`.

4. Fill in:

- `DATABASE_URL` with the Supabase pooler connection string.
- `DIRECT_URL` with the Supabase direct database connection string.
- `AUTH_JWT_SECRET` with a strong random value of at least 32 characters.
- `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.
- `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`.
- `NEXT_PUBLIC_API_BASE_URL`.

For AWS S3 bucket, CORS, and IAM setup, see [AWS_S3_SETUP.md](./AWS_S3_SETUP.md).

5. Generate Prisma client.

```bash
npm run prisma:generate
```

6. Run the apps.

```bash
npm run dev:api
npm run dev:web
```

API health check: `http://localhost:4000/api/health`

Web app: `http://localhost:3000`

## Smoke Test

After filling `apps/api/.env`, run:

```bash
npm run smoke -w @gtcs/api -- --email=your-email@example.com
```

This checks Supabase Postgres, S3 presigned upload/delete, and Google SMTP delivery.

## Testing

The project uses Jest with Nest's testing utilities for API unit tests, Supertest for API route tests, and Vitest with React Testing Library for the Next.js app.

```bash
npm run test
npm run test:api
npm run test:api:e2e
npm run test:web
```

## Current API Routes

- `GET /api/health`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/verify-email`
- `GET /api/auth/verify-email?token=...`
- `POST /api/auth/resend-verification`
- `GET /api/auth/me`
- `GET /api/dashboard/summary`
- `GET /api/applications`
- `POST /api/applications/draft`
- `POST /api/documents/presign`

## Supabase Notes

Use the Supabase pooler URL for `DATABASE_URL`, especially in Railway. Use the direct connection string for `DIRECT_URL`, which Prisma needs for migrations.

## Railway Notes

Deploy the API from the repository root with `railway.json`. Required Railway variables live in `apps/api/.env.example`.

## Vercel Notes

Deploy the web app from the repository root with `vercel.json`, or set the Vercel project root to `apps/web`. Required Vercel variables live in `apps/web/.env.example`.

## Audit Note

`npm audit` reports **0 vulnerabilities**. A few advisories came from transitive dependencies that upstream packages still pin to vulnerable versions, so they are forced to patched versions via the root `overrides` block in `package.json`:

- `postcss` → `^8.5.16` (Next pinned the vulnerable `8.4.31`)
- `multer` → `^2.2.0` (`@nestjs/platform-express` pinned the vulnerable `2.1.1`)
- `js-yaml` → `^4.2.0` (jest coverage tooling pinned the vulnerable `<=4.1.1`)

`nodemailer` was also upgraded to `^9.0.1` in `apps/api` to clear a high-severity advisory. Revisit these overrides when upgrading Next, NestJS, or Jest — once a dependency ships the patched version itself, the matching override can be removed. Note: overrides only take effect after a clean reinstall (`rm -rf node_modules package-lock.json && npm install`), because npm reuses an already-satisfiable tree otherwise.
