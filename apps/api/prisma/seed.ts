import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { ulid } from 'ulid';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const hospitalId = 'hosp_default';
  await prisma.hospital.upsert({
    where: { id: hospitalId },
    update: {},
    create: {
      id: hospitalId,
      name: 'General Hospital',
      registrationNo: 'REG123456',
      address: '123 Health Ave',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      isActive: true,
    },
  });

  const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

  // Super Admin
  await prisma.user.upsert({
    where: { email: 'superadmin@hms.com' },
    update: {},
    create: {
      id: 'usr_superadmin',
      hospitalId,
      email: 'superadmin@hms.com',
      passwordHash: defaultPasswordHash,
      role: 'SUPER_ADMIN',
      firstName: 'Super',
      lastName: 'Admin',
      phone: '1111111111',
      isVerified: true,
      isActive: true,
    },
  });

  // Hospital Admin
  await prisma.user.upsert({
    where: { email: 'admin@hms.com' },
    update: {},
    create: {
      id: 'usr_admin',
      hospitalId,
      email: 'admin@hms.com',
      passwordHash: defaultPasswordHash,
      role: 'HOSPITAL_ADMIN',
      firstName: 'Hospital',
      lastName: 'Admin',
      phone: '2222222222',
      isVerified: true,
      isActive: true,
    },
  });

  // Doctor
  await prisma.user.upsert({
    where: { email: 'doctor@hms.com' },
    update: {},
    create: {
      id: 'usr_doctor',
      hospitalId,
      email: 'doctor@hms.com',
      passwordHash: defaultPasswordHash,
      role: 'DOCTOR',
      firstName: 'Doctor',
      lastName: 'Strange',
      phone: '3333333333',
      isVerified: true,
      isActive: true,
    },
  });

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
