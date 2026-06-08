import { DeleteObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

function loadEnv(path) {
  const text = readFileSync(path, 'utf8');

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const index = trimmed.indexOf('=');
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function requireEnv(key) {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is missing or empty`);
  return value;
}

function getArgValue(name) {
  const arg = process.argv.find((item) => item.startsWith(`${name}=`));
  return arg?.slice(name.length + 1);
}

async function testDatabase() {
  const prisma = new PrismaClient();

  try {
    const result = await prisma.$queryRaw`select 1 as ok, now() as checked_at`;
    return { ok: true, detail: `query returned ${JSON.stringify(result)}` };
  } finally {
    await prisma.$disconnect();
  }
}

async function testS3() {
  const region = requireEnv('AWS_REGION');
  const bucket = requireEnv('AWS_S3_BUCKET');
  requireEnv('AWS_ACCESS_KEY_ID');
  requireEnv('AWS_SECRET_ACCESS_KEY');

  const client = new S3Client({ region });
  const key = `graduation-applications/smoke-tests/${Date.now()}-${randomUUID()}.txt`;
  const body = `GTCS S3 smoke test ${new Date().toISOString()}\n`;

  await client.send(new HeadBucketCommand({ Bucket: bucket }));

  const putCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: 'text/plain',
  });
  const uploadUrl = await getSignedUrl(client, putCommand, { expiresIn: 120 });
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': 'text/plain' },
    body,
  });

  if (!response.ok) {
    throw new Error(`presigned PUT failed with ${response.status} ${response.statusText}`);
  }

  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));

  return { ok: true, detail: `uploaded and deleted ${key}` };
}

async function testSmtp(to) {
  const host = requireEnv('SMTP_HOST');
  const port = Number(requireEnv('SMTP_PORT'));
  const secure = String(process.env.SMTP_SECURE ?? 'false').toLowerCase() === 'true';
  const user = requireEnv('SMTP_USER');
  const pass = requireEnv('SMTP_PASS');
  const from = requireEnv('SMTP_FROM');

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  await transporter.verify();
  const info = await transporter.sendMail({
    from,
    to,
    subject: 'GTCS SMTP smoke test',
    text: `GTCS SMTP smoke test sent at ${new Date().toISOString()}.`,
  });

  return { ok: true, detail: `sent message ${info.messageId}` };
}

async function runStep(name, fn) {
  process.stdout.write(`${name}... `);
  try {
    const result = await fn();
    console.log(`OK - ${result.detail}`);
    return true;
  } catch (error) {
    console.log('FAILED');
    console.error(error instanceof Error ? error.message : error);
    return false;
  }
}

async function main() {
  loadEnv(new URL('../.env', import.meta.url));

  const to = getArgValue('--email');
  const steps = [
    ['Database', () => testDatabase()],
    ['S3', () => testS3()],
  ];

  if (to) {
    steps.push(['SMTP', () => testSmtp(to)]);
  }

  let allOk = true;
  for (const [name, fn] of steps) {
    const ok = await runStep(name, fn);
    allOk = allOk && ok;
  }

  if (!allOk) process.exitCode = 1;
}

await main();
