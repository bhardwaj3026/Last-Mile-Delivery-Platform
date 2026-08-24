import { PrismaClient } from '@prisma/client';
import { Role, OrderType, AgentAvailability } from '../src/types/enums.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Resetting Database & Seeding Rates (+₹120 Increase)...');

  // Clean all existing data
  await prisma.notificationLog.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.order.deleteMany();
  await prisma.agentProfile.deleteMany();
  await prisma.rateCard.deleteMany();
  await prisma.codSurchargeConfig.deleteMany();
  await prisma.pincodeZoneMap.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.user.deleteMany();

  // 1. Single Admin Account
  const passwordHash = await bcrypt.hash('Admin@123', 12);

  const admin = await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@delivery.com',
      passwordHash,
      role: Role.ADMIN,
      phone: '+919876543210',
    },
  });

  console.log('✅ Created Single Admin User:');
  console.log('   Username / Email: Admin (admin@delivery.com)');
  console.log('   Password: Admin@123');

  // 2. Zones & Major Indian City Pincodes
  const zoneNorth = await prisma.zone.create({
    data: {
      name: 'North Zone (Delhi NCR)',
      pincodeMaps: {
        create: [
          { pincode: '110001' }, { pincode: '110002' }, { pincode: '110003' },
          { pincode: '110020' }, { pincode: '201301' }, { pincode: '122001' },
        ],
      },
    },
  });

  const zoneSouth = await prisma.zone.create({
    data: {
      name: 'South Zone (Bangalore / Hyderabad / Chennai)',
      pincodeMaps: {
        create: [
          { pincode: '560001' }, { pincode: '560034' }, { pincode: '560100' },
          { pincode: '500001' }, { pincode: '500081' }, { pincode: '600001' },
        ],
      },
    },
  });

  const zoneWest = await prisma.zone.create({
    data: {
      name: 'West & East Zone (Mumbai / Pune / Kolkata)',
      pincodeMaps: {
        create: [
          { pincode: '400001' }, { pincode: '400051' }, { pincode: '400069' },
          { pincode: '411001' }, { pincode: '700001' }, { pincode: '110051' },
        ],
      },
    },
  });

  console.log('✅ Created 3 Zones with Major Indian City Pincodes');

  // 3. Pre-configured Rate Cards (+₹120 increased base rates)
  const rateCards = [
    // North -> North
    { fromZoneId: zoneNorth.id, toZoneId: zoneNorth.id, orderType: OrderType.B2C, baseRate: 160.0, perKgRate: 10.0, isIntraZone: true },
    { fromZoneId: zoneNorth.id, toZoneId: zoneNorth.id, orderType: OrderType.B2B, baseRate: 180.0, perKgRate: 8.0, isIntraZone: true },
    // North -> South
    { fromZoneId: zoneNorth.id, toZoneId: zoneSouth.id, orderType: OrderType.B2C, baseRate: 200.0, perKgRate: 15.0, isIntraZone: false },
    { fromZoneId: zoneNorth.id, toZoneId: zoneSouth.id, orderType: OrderType.B2B, baseRate: 240.0, perKgRate: 12.0, isIntraZone: false },
    // North -> West
    { fromZoneId: zoneNorth.id, toZoneId: zoneWest.id, orderType: OrderType.B2C, baseRate: 210.0, perKgRate: 18.0, isIntraZone: false },
    { fromZoneId: zoneNorth.id, toZoneId: zoneWest.id, orderType: OrderType.B2B, baseRate: 250.0, perKgRate: 14.0, isIntraZone: false },
    // South -> North
    { fromZoneId: zoneSouth.id, toZoneId: zoneNorth.id, orderType: OrderType.B2C, baseRate: 205.0, perKgRate: 15.0, isIntraZone: false },
    { fromZoneId: zoneSouth.id, toZoneId: zoneNorth.id, orderType: OrderType.B2B, baseRate: 245.0, perKgRate: 12.0, isIntraZone: false },
    // South -> South
    { fromZoneId: zoneSouth.id, toZoneId: zoneSouth.id, orderType: OrderType.B2C, baseRate: 165.0, perKgRate: 10.0, isIntraZone: true },
    { fromZoneId: zoneSouth.id, toZoneId: zoneSouth.id, orderType: OrderType.B2B, baseRate: 185.0, perKgRate: 8.0, isIntraZone: true },
    // West -> South
    { fromZoneId: zoneWest.id, toZoneId: zoneSouth.id, orderType: OrderType.B2C, baseRate: 195.0, perKgRate: 14.0, isIntraZone: false },
    { fromZoneId: zoneWest.id, toZoneId: zoneSouth.id, orderType: OrderType.B2B, baseRate: 230.0, perKgRate: 11.0, isIntraZone: false },
  ];

  for (const rc of rateCards) {
    await prisma.rateCard.create({ data: rc });
  }

  console.log('✅ Created Rate Cards (+₹120 Base Rate Increase)');

  // 4. Pre-configured COD Surcharge Config (+₹120 Flat Fee Increase)
  await prisma.codSurchargeConfig.create({
    data: { orderType: OrderType.B2C, flatFee: 140.0, percentOfBill: 2.5 },
  });
  await prisma.codSurchargeConfig.create({
    data: { orderType: OrderType.B2B, flatFee: 160.0, percentOfBill: 1.5 },
  });

  console.log('✅ Created COD Surcharge Configs (+₹120 Flat Fee Increase)');
  console.log('🎉 Database reset & Rate Increase seeding completed successfully!');
}

main()
  .catch(e => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
