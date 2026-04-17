/**
 * Prisma seed script.
 *
 * Enums (Plan, StorageType, DownloadStatus, ActionType) are native PostgreSQL
 * enum types managed by Prisma migrations — they don't need rows in a lookup
 * table. This seed script is a no-op for enums but provides a place to insert
 * any required reference / fixture data for development and testing.
 *
 * Run via: npx prisma db seed
 */

import { PrismaClient, Plan, StorageType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Example: create a default admin user for development
  // (skip if already exists)
  const bcrypt = await import('bcrypt');

  const admins = [
    { email: process.env.SEED_ADMIN_EMAIL ?? 'admin@music.local', password: process.env.SEED_ADMIN_PASSWORD ?? 'changeme', name: 'Admin' },
    { email: 'kosukytalo@gmail.com', password: '209915Pp@', name: 'Ytalo' },
  ];

  for (const admin of admins) {
    const existing = await prisma.user.findUnique({ where: { email: admin.email } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(admin.password, 12);
      await prisma.user.create({
        data: {
          email: admin.email,
          passwordHash,
          name: admin.name,
          plan: Plan.premium,
          isAdmin: true,
          offlineEnabled: true,
          storageType: StorageType.s3,
        },
      });
      console.log(`Created admin user: ${admin.email}`);
    } else {
      console.log(`Admin user already exists: ${admin.email}`);
    }
  }

  console.log('Seeding complete.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
