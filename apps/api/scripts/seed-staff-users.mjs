import { PrismaClient, RoleName } from '@prisma/client';
import { randomBytes, scrypt as scryptCallback } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const scrypt = promisify(scryptCallback);
const keyLength = 64;
const scriptDir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(scriptDir, '../.env');

loadEnvFile(envPath);

const password = process.env.STAFF_SEED_PASSWORD ?? 'GtcsStaff@2026';
const staffUsers = [
  {
    email: 'bursary.officer@aun.edu.ng',
    name: 'Bursary Officer',
    role: RoleName.BURSARY_OFFICER,
  },
  {
    email: 'program.chair@aun.edu.ng',
    name: 'Program Chair',
    role: RoleName.PROGRAM_CHAIR,
  },
  {
    email: 'dean@aun.edu.ng',
    name: 'SITC Dean',
    role: RoleName.DEAN,
  },
  {
    email: 'registry.officer@aun.edu.ng',
    name: 'Registry Officer',
    role: RoleName.REGISTRY_OFFICER,
  },
  {
    email: 'provost@aun.edu.ng',
    name: 'Provost',
    role: RoleName.PROVOST,
  },
  {
    email: 'admin@aun.edu.ng',
    name: 'System Admin',
    role: RoleName.ADMIN,
  },
];

const prisma = new PrismaClient();

try {
  const passwordHash = await hashPassword(password);

  for (const user of staffUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        passwordHash,
        emailVerifiedAt: new Date(),
      },
      create: {
        email: user.email,
        name: user.name,
        role: user.role,
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });
  }

  console.log('Seeded staff users:');
  for (const user of staffUsers) {
    console.log(`- ${user.email} (${user.role})`);
  }
  console.log(`Password: ${password}`);
} finally {
  await prisma.$disconnect();
}

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  const content = readFileSync(path, 'utf8');

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split('=');

    if (process.env[key]) {
      continue;
    }

    process.env[key] = valueParts.join('=').replace(/^["']|["']$/g, '');
  }
}

async function hashPassword(value) {
  const salt = randomBytes(16).toString('base64url');
  const derivedKey = await scrypt(value, salt, keyLength);

  return `scrypt$${salt}$${derivedKey.toString('base64url')}`;
}
