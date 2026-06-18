import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Check if admin@hms.com already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@hms.com' },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('Password@123', 10);
    await prisma.user.create({
      data: {
        id: 'usr_superadmin',
        email: 'admin@hms.com',
        passwordHash,
        role: 'SUPER_ADMIN',
        firstName: 'System',
        lastName: 'Administrator',
        phone: '0000000000',
        isVerified: true,
        isActive: true,
        forcePasswordChange: false,
        hospitalId: null,
      },
    });
    console.log('Default SUPER_ADMIN user admin@hms.com created.');
  } else {
    console.log('User admin@hms.com already exists. Skipping creation.');
  }

  // Seed default ICD-10 codes
  console.log('Seeding default ICD-10 codes...');
  const icdCodes = [
    { code: 'I10', description: 'Essential (primary) hypertension', category: 'Circulatory' },
    { code: 'E11', description: 'Type 2 diabetes mellitus', category: 'Endocrine' },
    { code: 'J45', description: 'Asthma', category: 'Respiratory' },
    { code: 'M17', description: 'Osteoarthritis of knee', category: 'Musculoskeletal' },
    { code: 'K21', description: 'Gastro-esophageal reflux disease', category: 'Digestive' },
  ];

  for (const icd of icdCodes) {
    await prisma.iCDCode.upsert({
      where: { code: icd.code },
      update: {},
      create: icd,
    });
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
