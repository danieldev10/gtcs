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

The web app uses `next@16.3.0-canary.45` because the latest stable Next release still depends on the vulnerable nested `postcss@8.4.31`. The canary release depends on patched `postcss@8.5.10`, and `npm audit` reports zero vulnerabilities after the upgrade. Track this during Next upgrades and move back to a stable release once the stable line carries the patched dependency.
