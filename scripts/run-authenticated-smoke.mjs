import { readFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import http from "node:http";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envFile = resolve(root, ".env.local");
const baseURL = "http://127.0.0.1:3000";

function loadEnvFile(filePath) {
  const content = readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1);
    process.env[key] = value;
  }
}

function createPrismaClient() {
  const rawConnectionString =
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:5432/atelier";
  const connectionUrl = new URL(rawConnectionString);

  connectionUrl.searchParams.delete("sslmode");
  connectionUrl.searchParams.delete("uselibpqcompat");

  const adapter = new PrismaPg({
    connectionString: connectionUrl.toString(),
    ssl:
      connectionUrl.hostname.includes("supabase.com")
        ? { rejectUnauthorized: false }
        : undefined,
  });

  return new PrismaClient({
    adapter,
    log: ["error"],
  });
}

function wait(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

async function waitForServer(url, timeoutMs = 60_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const ok = await new Promise((resolvePing) => {
      const request = http.get(url, (response) => {
        response.resume();
        resolvePing(Boolean(response.statusCode && response.statusCode >= 200 && response.statusCode < 500));
      });

      request.on("error", () => resolvePing(false));
      request.setTimeout(2_000, () => {
        request.destroy();
        resolvePing(false);
      });
    });

    if (ok) {
      return;
    }

    await wait(2_000);
  }

  throw new Error(`Local server did not become ready: ${url}`);
}

async function expectMainText(page, expectedText) {
  await page.locator("main").waitFor({ state: "visible" });
  await page.waitForTimeout(500);
  const text = await page.locator("main").innerText();
  if (!text.includes(expectedText)) {
    throw new Error(`Expected page to contain "${expectedText}", but it did not.`);
  }
}

async function login(page, email, password, expectedPath) {
  await page.goto(`${baseURL}/login`);
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.locator("form").press("Enter");
  await page.waitForURL(`**${expectedPath}`);
}

async function registerUser({ admin, prisma, name, email, password, role }) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      role,
    },
  });

  if (error || !data.user?.id) {
    throw new Error(`Register failed for ${email}: ${error?.message ?? "Unknown error"}`);
  }

  await prisma.user.upsert({
    where: { supabaseId: data.user.id },
    update: {
      email,
      name,
      role,
    },
    create: {
      supabaseId: data.user.id,
      email,
      name,
      role,
    },
  });
}

async function main() {
  loadEnvFile(envFile);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables for authenticated smoke.");
  }

  const prisma = createPrismaClient();
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const server = spawn("npm.cmd", ["run", "start", "--", "--port", "3000"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  const stopServer = () => {
    if (!server.killed) {
      server.kill("SIGTERM");
    }
  };

  const stamp = Date.now();
  const outputDir = join(root, "output", "playwright");
  mkdirSync(outputDir, { recursive: true });

  const customer = {
    name: "Клиент Смоук",
    email: `smoke-client-${stamp}@atelier.local`,
    password: "SmokeTest123!",
  };
  const professional = {
    name: "Професионалист Смоук",
    email: `smoke-pro-${stamp}@atelier.local`,
    password: "SmokeTest123!",
  };

  let customerUserId = null;
  let customerSupabaseId = null;
  let professionalUserId = null;
  let professionalSupabaseId = null;
  let requestId = null;
  let offerId = null;
  let projectId = null;

  process.on("SIGINT", stopServer);
  process.on("SIGTERM", stopServer);

  try {
    await waitForServer(`${baseURL}/login`);

    await registerUser({ admin, prisma, ...customer, role: "CLIENT" });
    await registerUser({ admin, prisma, ...professional, role: "PROFESSIONAL" });

    const customerProfile = await prisma.user.findUniqueOrThrow({
      where: { email: customer.email },
    });
    customerUserId = customerProfile.id;
    customerSupabaseId = customerProfile.supabaseId;

    const professionalProfile = await prisma.user.findUniqueOrThrow({
      where: { email: professional.email },
    });
    professionalUserId = professionalProfile.id;
    professionalSupabaseId = professionalProfile.supabaseId;

    await prisma.user.update({
      where: { id: professionalUserId },
      data: {
        verified: true,
        location: "София",
        experience: 7,
        rating: 4.9,
        reviewCount: 12,
        bio: "Премиум професионалист с ясен процес, силна комуникация и спокойна координация.",
        skills: ["Интериор", "Кухни", "Реализация"],
      },
    });

    const marketRequest = await prisma.request.create({
      data: {
        clientId: customerUserId,
        title: `Кухненски проект ${stamp}`,
        description: "Търся проверен професионалист за премиум кухня с ясен бюджет и спокоен процес.",
        category: "Интериор",
        subCategory: "Кухня",
        status: "OFFERS_RECEIVED",
        area: "Пълна концепция и реализация",
        priorities: ["Доверие и комуникация", "Качество на изпълнение"],
        specificNotes: "Важно е да има ясни следващи стъпки и защитено плащане.",
        budget: "12 000 - 18 000 лв.",
        timeline: "До 8 седмици",
        location: "София",
      },
    });
    requestId = marketRequest.id;

    const offer = await prisma.offer.create({
      data: {
        requestId,
        professionalId: professionalUserId,
        price: 14200,
        timeline: 49,
        scope: "Концепция, технически чертежи, подбор на материали и координация по изпълнението.",
        warranty: "Подкрепа 30 дни след предаване",
        revisions: "2 кръга корекции",
        quote: "Подходът е структуриран, с ясни етапи и седмични синхронизации.",
        status: "ACCEPTED",
        featured: true,
      },
    });
    offerId = offer.id;

    const project = await prisma.project.create({
      data: {
        requestId,
        offerId,
        clientId: customerUserId,
        professionalId: professionalUserId,
        title: marketRequest.title,
        status: "COMPLETED",
        progress: 100,
      },
    });
    projectId = project.id;

    await prisma.milestone.createMany({
      data: [
        {
          projectId,
          title: "Уточняване на брифа",
          order: 1,
          completed: true,
          completedAt: new Date(),
        },
        {
          projectId,
          title: "Финална концепция",
          order: 2,
          completed: true,
          completedAt: new Date(),
        },
      ],
    });

    await prisma.message.create({
      data: {
        projectId,
        senderId: professionalUserId,
        text: "Изпратих финалната концепция и следващите стъпки.",
        read: true,
      },
    });

    await prisma.payment.create({
      data: {
        projectId,
        clientId: customerUserId,
        amount: 14200,
        serviceFee: 45,
        total: 14245,
        status: "PENDING",
        invoiceNumber: `SMOKE-${stamp}`,
        remainingAmount: 14245,
      },
    });

    const browser = await chromium.launch({
      channel: "chrome",
      headless: true,
    });

    try {
      const customerContext = await browser.newContext({
        baseURL,
        viewport: { width: 1440, height: 1100 },
      });
      const customerPage = await customerContext.newPage();

      await login(customerPage, customer.email, customer.password, "/dashboard");
      await customerPage.goto(`${baseURL}/offers/${offerId}`);
      await expectMainText(customerPage, marketRequest.title);
      await customerPage.screenshot({
        path: join(outputDir, "auth-smoke-offer-detail.png"),
        fullPage: true,
      });

      await customerPage.goto(`${baseURL}/payment?offerId=${offerId}`);
      await expectMainText(customerPage, "Stripe");
      await customerPage.screenshot({
        path: join(outputDir, "auth-smoke-payment.png"),
        fullPage: true,
      });

      await customerPage.goto(`${baseURL}/review/${projectId}`);
      await customerPage.locator("form").waitFor({ state: "visible" });
      await expectMainText(customerPage, marketRequest.title);
      await customerPage.screenshot({
        path: join(outputDir, "auth-smoke-review.png"),
        fullPage: true,
      });
      await customerContext.close();

      const professionalContext = await browser.newContext({
        baseURL,
        viewport: { width: 1440, height: 1100 },
      });
      const professionalPage = await professionalContext.newPage();

      await login(professionalPage, professional.email, professional.password, "/pro/dashboard");
      await professionalPage.goto(`${baseURL}/pro/dashboard`);
      await expectMainText(professionalPage, marketRequest.title);
      await professionalPage.screenshot({
        path: join(outputDir, "auth-smoke-pro-dashboard.png"),
        fullPage: true,
      });
      await professionalContext.close();
    } finally {
      await browser.close();
    }

    console.log("Authenticated smoke passed.");
  } finally {
    if (projectId) {
      await prisma.message.deleteMany({ where: { projectId } });
      await prisma.milestone.deleteMany({ where: { projectId } });
      await prisma.review.deleteMany({ where: { projectId } });
      await prisma.payment.deleteMany({ where: { projectId } });
      await prisma.project.deleteMany({ where: { id: projectId } });
    }

    if (offerId) {
      await prisma.offer.deleteMany({ where: { id: offerId } });
    }

    if (requestId) {
      await prisma.request.deleteMany({ where: { id: requestId } });
    }

    if (customerUserId || professionalUserId) {
      await prisma.user.deleteMany({
        where: {
          id: {
            in: [customerUserId, professionalUserId].filter(Boolean),
          },
        },
      });
    }

    for (const authId of [customerSupabaseId, professionalSupabaseId]) {
      if (!authId) {
        continue;
      }

      await admin.auth.admin.deleteUser(authId).catch(() => undefined);
    }

    await prisma.$disconnect();
    stopServer();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
