// Seeds a demo gallery with users, vehicles and leads.
// All people, phone numbers and e-mail addresses below are fictitious.
// Re-running is safe: the demo organization is deleted (cascade) and recreated.
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEMO_SLUG = "ornek-oto-galeri";

async function main() {
  await prisma.organization.deleteMany({ where: { slug: DEMO_SLUG } });

  const org = await prisma.organization.create({
    data: {
      name: "Örnek Oto Galeri",
      slug: DEMO_SLUG,
      address: "Atatürk Cad. No: 1, Kadıköy / İstanbul",
      phone: "+902161234567",
    },
  });
  const organizationId = org.id;

  // Passwords are added once Auth.js is set up (Faz 1).
  const [owner, manager, sales1, sales2] = await Promise.all([
    prisma.user.create({
      data: {
        organizationId,
        name: "Ahmet Yılmaz",
        email: "sahip@ornek-galeri.test",
        role: "OWNER",
      },
    }),
    prisma.user.create({
      data: {
        organizationId,
        name: "Ayşe Demir",
        email: "yonetici@ornek-galeri.test",
        role: "MANAGER",
      },
    }),
    prisma.user.create({
      data: {
        organizationId,
        name: "Mehmet Kaya",
        email: "satis1@ornek-galeri.test",
        role: "SALES",
      },
    }),
    prisma.user.create({
      data: {
        organizationId,
        name: "Zeynep Şahin",
        email: "satis2@ornek-galeri.test",
        role: "SALES",
      },
    }),
  ]);

  const [corolla, egea, golf] = await Promise.all([
    prisma.vehicle.create({
      data: {
        organizationId,
        brand: "Toyota",
        model: "Corolla 1.5 Dream",
        year: 2022,
        mileage: 38500,
        fuelType: "GASOLINE",
        transmission: "AUTOMATIC",
        color: "Beyaz",
        plate: "34 ABC 123",
        price: "1250000",
      },
    }),
    prisma.vehicle.create({
      data: {
        organizationId,
        brand: "Fiat",
        model: "Egea 1.3 Multijet Urban",
        year: 2020,
        mileage: 92000,
        fuelType: "DIESEL",
        transmission: "MANUAL",
        color: "Gri",
        plate: "06 DEF 456",
        price: "740000",
      },
    }),
    prisma.vehicle.create({
      data: {
        organizationId,
        brand: "Volkswagen",
        model: "Golf 1.5 TSI Style",
        year: 2021,
        mileage: 54000,
        fuelType: "GASOLINE",
        transmission: "AUTOMATIC",
        color: "Lacivert",
        plate: "35 GHJ 789",
        price: "1480000",
        status: "RESERVED",
      },
    }),
  ]);

  const consent = { consentGiven: true, consentAt: new Date(), consentTextVersion: "v1" };

  const leadNew = await prisma.lead.create({
    data: {
      organizationId,
      fullName: "Can Öztürk",
      phone: "+905321112233",
      source: "SAHIBINDEN",
      interestedVehicleId: corolla.id,
      budget: "1200000",
      temperature: "HOT",
      assignedToId: sales1.id,
      ...consent,
    },
  });

  const leadContacted = await prisma.lead.create({
    data: {
      organizationId,
      fullName: "Elif Arslan",
      phone: "+905334445566",
      email: "elif.arslan@ornek.test",
      source: "INSTAGRAM",
      status: "CONTACTED",
      interestedVehicleId: egea.id,
      wantsTradeIn: true,
      wantsFinancing: true,
      assignedToId: sales1.id,
      ...consent,
    },
  });

  const leadAppointment = await prisma.lead.create({
    data: {
      organizationId,
      fullName: "Burak Çelik",
      phone: "+905447778899",
      source: "WHATSAPP",
      status: "APPOINTMENT",
      interestedVehicleId: golf.id,
      budget: "1500000",
      assignedToId: sales2.id,
      ...consent,
    },
  });

  await prisma.lead.create({
    data: {
      organizationId,
      fullName: "Selin Koç",
      phone: "+905051230000",
      source: "ARABAM",
      status: "LOST",
      temperature: "COLD",
      interestedVehicleText: "2019 sonrası dizel SUV",
      lostReason: "FOUND_ELSEWHERE",
      assignedToId: sales2.id,
      ...consent,
    },
  });

  // Same phone number as leadNew: exercises duplicate detection.
  await prisma.lead.create({
    data: {
      organizationId,
      fullName: "Can Öztürk",
      phone: "+905321112233",
      source: "PHONE",
      interestedVehicleText: "Corolla hâlâ satılık mı?",
      ...consent,
    },
  });

  await prisma.tradeIn.create({
    data: {
      organizationId,
      leadId: leadContacted.id,
      brand: "Renault",
      model: "Clio 1.0 TCe",
      year: 2018,
      mileage: 110000,
      fuelType: "GASOLINE",
      transmission: "MANUAL",
      expectedPrice: "520000",
    },
  });

  await prisma.activity.createMany({
    data: [
      {
        organizationId,
        leadId: leadNew.id,
        type: "NOTE",
        body: "sahibinden ilanından mesaj attı.",
      },
      {
        organizationId,
        leadId: leadContacted.id,
        userId: sales1.id,
        type: "STATUS_CHANGE",
        metadata: { from: "NEW", to: "CONTACTED" },
      },
      {
        organizationId,
        leadId: leadContacted.id,
        userId: sales1.id,
        type: "CALL",
        body: "Takas aracının fotoğraflarını gönderecek.",
      },
      {
        organizationId,
        leadId: leadAppointment.id,
        userId: sales2.id,
        type: "STATUS_CHANGE",
        metadata: { from: "CONTACTED", to: "APPOINTMENT" },
      },
    ],
  });

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.task.createMany({
    data: [
      {
        organizationId,
        leadId: leadNew.id,
        assignedToId: sales1.id,
        createdById: manager.id,
        title: "Müşteriyi ara, test sürüşü öner",
        dueAt: tomorrow,
      },
      {
        organizationId,
        leadId: leadAppointment.id,
        assignedToId: sales2.id,
        createdById: owner.id,
        title: "Randevu öncesi aracı hazırla",
        dueAt: tomorrow,
      },
    ],
  });

  console.log("Seed completed: 1 organization, 4 users, 3 vehicles, 5 leads.");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
