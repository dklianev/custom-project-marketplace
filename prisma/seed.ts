import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

const envPath =
  process.env.DOTENV_CONFIG_PATH ??
  (existsSync(resolve(process.cwd(), ".env.local"))
    ? resolve(process.cwd(), ".env.local")
    : resolve(process.cwd(), ".env"));

loadEnv({ path: envPath });

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL or DIRECT_URL must be configured for seeding.");
}

const connectionUrl = new URL(connectionString);

connectionUrl.searchParams.delete("sslmode");
connectionUrl.searchParams.delete("uselibpqcompat");

const adapter = new PrismaPg({
  connectionString: connectionUrl.toString(),
  ssl:
    connectionUrl.hostname.includes("supabase.com")
      ? { rejectUnauthorized: false }
      : undefined,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.project.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.request.deleteMany();
  await prisma.user.deleteMany();

  const [maria, ivan, elena, georgi, petar, radost, nikolay] = await Promise.all([
    prisma.user.create({
      data: {
        supabaseId: "seed-client-maria",
        email: "maria@atelier.local",
        name: "Мария Петрова",
        role: "CLIENT",
        location: "София",
      },
    }),
    prisma.user.create({
      data: {
        supabaseId: "seed-client-ivan",
        email: "ivan@atelier.local",
        name: "Иван Димитров",
        role: "CLIENT",
        location: "Пловдив",
      },
    }),
    prisma.user.create({
      data: {
        supabaseId: "seed-pro-elena",
        email: "elena@atelier.local",
        name: "Елена Стоянова",
        role: "PROFESSIONAL",
        verified: true,
        location: "София",
        rating: 4.9,
        reviewCount: 312,
        experience: 9,
        skills: ["брандинг", "интериор", "визуални системи"],
        portfolioImages: [
          "/editorial/portfolio-01.svg",
          "/editorial/portfolio-02.svg",
        ],
      },
    }),
    prisma.user.create({
      data: {
        supabaseId: "seed-pro-georgi",
        email: "georgi@atelier.local",
        name: "Георги Колев",
        role: "PROFESSIONAL",
        verified: true,
        location: "Варна",
        rating: 4.8,
        reviewCount: 156,
        experience: 7,
        skills: ["UX", "уеб дизайн"],
      },
    }),
    prisma.user.create({
      data: {
        supabaseId: "seed-pro-petar",
        email: "petar@atelier.local",
        name: "Петър Маринов",
        role: "PROFESSIONAL",
        verified: true,
        location: "София",
        rating: 4.9,
        reviewCount: 124,
        experience: 11,
        skills: ["архитектура", "3D", "ремонти"],
      },
    }),
    prisma.user.create({
      data: {
        supabaseId: "seed-pro-radost",
        email: "radost@atelier.local",
        name: "Радост Илиева",
        role: "PROFESSIONAL",
        verified: true,
        location: "Бургас",
        rating: 4.7,
        reviewCount: 89,
        experience: 5,
        skills: ["лого дизайн", "опаковки"],
      },
    }),
    prisma.user.create({
      data: {
        supabaseId: "seed-pro-nikolay",
        email: "nikolay@atelier.local",
        name: "Николай Василев",
        role: "PROFESSIONAL",
        verified: true,
        location: "София",
        rating: 4.8,
        reviewCount: 98,
        experience: 8,
        skills: ["продуктов дизайн", "табла", "дизайн системи"],
      },
    }),
  ]);

  const compareRequest = await prisma.request.create({
    data: {
      clientId: maria.id,
      title: "Освежаване на лого за бутиков хотел",
      description:
        "Търсим топло и премиум обновяване на логото за малък хотелски бранд, заедно с посока за иконографията.",
      category: "Брандинг",
      subCategory: "Лого",
      status: "OFFERS_RECEIVED",
      urgency: "STANDARD",
      budget: "2500 лв.",
      timeline: "14 дни",
      location: "София",
      priorities: ["яснота", "премиум тон", "иконна система"],
    },
  });

  const [logoOfferA, logoOfferB, logoOfferC] = await Promise.all([
    prisma.offer.create({
      data: {
        requestId: compareRequest.id,
        professionalId: elena.id,
        price: 2400,
        timeline: 14,
        scope:
          "Бранд одит, 3 посоки за логото, типографски двойки и финален пакет за предаване.",
        warranty: "30 дни подкрепа",
        revisions: "2 кръга корекции",
        quote: "Най-силно пасва на тихото премиум позициониране в хотелиерството.",
        featured: true,
      },
    }),
    prisma.offer.create({
      data: {
        requestId: compareRequest.id,
        professionalId: georgi.id,
        price: 3150,
        timeline: 21,
        scope: "Стратегическа сесия, система за логото, визуална посока за интерфейса и предаване.",
        warranty: "45 дни подкрепа",
        revisions: "3 кръга корекции",
      },
    }),
    prisma.offer.create({
      data: {
        requestId: compareRequest.id,
        professionalId: radost.id,
        price: 1850,
        timeline: 7,
        scope:
          "Ускорено освежаване на логото с една основна посока и няколко варианта.",
        revisions: "1 кръг корекции",
      },
    }),
  ]);

  const completedRequest = await prisma.request.create({
    data: {
      clientId: ivan.id,
      title: "Редизайн на работно пространство за офис на нова компания",
      description:
        "Търсим функционално обновяване на офис от 120 кв.м с мек индустриален характер и ясни работни зони.",
      category: "Интериор",
      subCategory: "Офис",
      status: "COMPLETED",
      urgency: "PLANNED",
      area: "120 кв.м",
      budget: "15000 лв.",
      timeline: "6 седмици",
      location: "Пловдив",
      priorities: ["поток", "зони за срещи", "материали"],
    },
  });

  const acceptedOffer = await prisma.offer.create({
    data: {
      requestId: completedRequest.id,
      professionalId: petar.id,
        price: 14800,
        timeline: 42,
        scope:
          "Пълна интериорна концепция, мебелно разпределение, материали и пакет за изпълнители.",
        status: "ACCEPTED",
        featured: true,
    },
  });

  await prisma.offer.create({
    data: {
      requestId: completedRequest.id,
        professionalId: nikolay.id,
        price: 16100,
        timeline: 35,
        scope: "Концептуален редизайн на работното пространство с ясен план за предаване.",
        status: "REJECTED",
    },
  });

  const completedProject = await prisma.project.create({
    data: {
      requestId: completedRequest.id,
      offerId: acceptedOffer.id,
      clientId: ivan.id,
      professionalId: petar.id,
      title: completedRequest.title,
      status: "COMPLETED",
      progress: 100,
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
    },
  });

  await prisma.milestone.createMany({
    data: [
      {
        projectId: completedProject.id,
        title: "Опознавателна сесия",
        order: 1,
        completed: true,
        completedAt: new Date(),
      },
      {
        projectId: completedProject.id,
        title: "Представяне на концепцията",
        order: 2,
        completed: true,
        completedAt: new Date(),
      },
      {
        projectId: completedProject.id,
        title: "Финално предаване",
        order: 3,
        completed: true,
        completedAt: new Date(),
      },
    ],
  });

  await prisma.message.createMany({
    data: [
      {
        projectId: completedProject.id,
        senderId: ivan.id,
        text: "Екипът много хареса първата концептуална презентация.",
      },
      {
        projectId: completedProject.id,
        senderId: petar.id,
        text: "Чудесно, довечера изпращам финалната материална дъска.",
      },
    ],
  });

  await prisma.payment.create({
    data: {
      projectId: completedProject.id,
      clientId: ivan.id,
      amount: 14800,
      serviceFee: 45,
      total: 14845,
      status: "COMPLETED",
      method: "card",
      stripeSessionId: "cs_test_completed_project",
      stripePaymentId: "pi_completed_project",
      invoiceNumber: "ATL-8829410",
      paidAmount: 14845,
      remainingAmount: 0,
    },
  });

  await prisma.review.create({
    data: {
      projectId: completedProject.id,
      reviewerId: ivan.id,
      professionalId: petar.id,
      rating: 5,
      comment:
        "Много добра комуникация, ясни етапи и финален пакет, който изпълнителите можеха да използват веднага.",
      images: ["/editorial/review-01.svg"],
    },
  });

  const matchingRequest = await prisma.request.create({
    data: {
      clientId: maria.id,
      title: "Концепция за осветление на апартамент",
      description:
        "Нужен е пластов осветителен план за ремонт на двустаен апартамент с ясно разпределение по зони.",
      category: "Интериор",
      subCategory: "Осветление",
      status: "MATCHING",
      urgency: "URGENT",
      area: "80 кв.м",
      budget: "5000+ лв.",
      timeline: "2 седмици",
      location: "София",
      priorities: ["топлина", "умен контрол", "работно осветление"],
    },
  });

  const inProgressRequest = await prisma.request.create({
    data: {
      clientId: maria.id,
      title: "Освежаване на сайт за концептуален магазин",
      description:
        "Търсим по-силна редакторска начална страница, по-ясни продуктови страници и по-тих, подреден поток за плащане.",
      category: "Дигитален дизайн",
      subCategory: "Уебсайт",
      status: "IN_PROGRESS",
      urgency: "STANDARD",
      budget: "8500 лв.",
      timeline: "4 седмици",
      location: "Онлайн",
      priorities: ["конверсия", "редакторски ритъм", "мобилен опит"],
    },
  });

  const inProgressOffer = await prisma.offer.create({
    data: {
      requestId: inProgressRequest.id,
        professionalId: nikolay.id,
        price: 8400,
        timeline: 28,
        scope:
          "UX одит, редизайн на ключовите страници, изчистване на компонентите и бележки за имплементация.",
        status: "ACCEPTED",
    },
  });

  const inProgressProject = await prisma.project.create({
    data: {
      requestId: inProgressRequest.id,
      offerId: inProgressOffer.id,
      clientId: maria.id,
      professionalId: nikolay.id,
      title: inProgressRequest.title,
      status: "DESIGN",
      progress: 58,
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21),
    },
  });

  await prisma.milestone.createMany({
    data: [
      {
        projectId: inProgressProject.id,
        title: "Одит и информационна архитектура",
        order: 1,
        completed: true,
        completedAt: new Date(),
      },
      {
        projectId: inProgressProject.id,
        title: "Проучване на началната страница",
        order: 2,
        completed: true,
        completedAt: new Date(),
      },
      {
        projectId: inProgressProject.id,
        title: "Изчистване на плащането",
        order: 3,
        completed: false,
      },
    ],
  });

  await prisma.message.createMany({
    data: [
      {
        projectId: inProgressProject.id,
        senderId: maria.id,
        text: "Можем ли да направим продуктовите карти по-редакторски и по-спокойни?",
      },
      {
        projectId: inProgressProject.id,
        senderId: nikolay.id,
        text: "Да, следобед ще изпратя обновена посока за началната страница.",
      },
    ],
  });

  await prisma.payment.create({
    data: {
      projectId: inProgressProject.id,
      clientId: maria.id,
      amount: 8400,
      serviceFee: 45,
      total: 8445,
      status: "PROCESSING",
      method: "card",
      stripeSessionId: "cs_test_processing_project",
      invoiceNumber: "ATL-8829411",
      paidAmount: 4222.5,
      remainingAmount: 4222.5,
    },
  });

  console.log(
    JSON.stringify(
      {
        users: 7,
        requests: 4,
        offers: 6,
        projects: 2,
        compareOfferIds: [logoOfferA.id, logoOfferB.id, logoOfferC.id],
        matchingRequestId: matchingRequest.id,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
