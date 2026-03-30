import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { prisma } from "../src/lib/prisma";

const baseURL = "http://127.0.0.1:3000";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables for authenticated smoke test.");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

test.describe.configure({ mode: "serial" });

async function login(
  page: Page,
  email: string,
  password: string,
  expectedPath: string,
) {
  await page.goto("/login");
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.locator("form").press("Enter");
  await page.waitForURL(`**${expectedPath}`);
}

test("authenticated customer and professional smoke", async ({ browser }) => {
  const stamp = Date.now();
  const outputDir = join(process.cwd(), "output", "playwright");
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

  let customerUserId: string | null = null;
  let customerSupabaseId: string | null = null;
  let professionalUserId: string | null = null;
  let professionalSupabaseId: string | null = null;
  let requestId: string | null = null;
  let offerId: string | null = null;
  let projectId: string | null = null;
  let paymentId: string | null = null;

  try {
    const customerCreate = await admin.auth.admin.createUser({
      email: customer.email,
      password: customer.password,
      email_confirm: true,
      user_metadata: {
        name: customer.name,
        role: "CLIENT",
      },
    });
    expect(customerCreate.error).toBeNull();
    customerSupabaseId = customerCreate.data.user?.id ?? null;
    expect(customerSupabaseId).toBeTruthy();

    await prisma.user.upsert({
      where: { supabaseId: customerSupabaseId! },
      update: {
        email: customer.email,
        name: customer.name,
        role: "CLIENT",
      },
      create: {
        supabaseId: customerSupabaseId!,
        email: customer.email,
        name: customer.name,
        role: "CLIENT",
      },
    });

    const professionalCreate = await admin.auth.admin.createUser({
      email: professional.email,
      password: professional.password,
      email_confirm: true,
      user_metadata: {
        name: professional.name,
        role: "PROFESSIONAL",
      },
    });
    expect(professionalCreate.error).toBeNull();
    professionalSupabaseId = professionalCreate.data.user?.id ?? null;
    expect(professionalSupabaseId).toBeTruthy();

    await prisma.user.upsert({
      where: { supabaseId: professionalSupabaseId! },
      update: {
        email: professional.email,
        name: professional.name,
        role: "PROFESSIONAL",
      },
      create: {
        supabaseId: professionalSupabaseId!,
        email: professional.email,
        name: professional.name,
        role: "PROFESSIONAL",
      },
    });

    const customerProfile = await prisma.user.findUniqueOrThrow({
      where: { email: customer.email },
    });
    customerUserId = customerProfile.id;

    const professionalProfile = await prisma.user.findUniqueOrThrow({
      where: { email: professional.email },
    });
    professionalUserId = professionalProfile.id;

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
        text: "Изпратих финалната концепция и сроковете за реализация.",
        read: true,
      },
    });

    const payment = await prisma.payment.create({
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
    paymentId = payment.id;

    const customerContext = await browser.newContext({ baseURL });
    const customerPage = await customerContext.newPage();

    await login(customerPage, customer.email, customer.password, "/dashboard");
    await customerPage.goto(`/offers/${offerId}`);
    await expect(customerPage).toHaveURL(new RegExp(`/offers/${offerId}$`));
    await expect(customerPage.locator("main")).toContainText(marketRequest.title);
    await customerPage.screenshot({ path: join(outputDir, "auth-smoke-offer-detail.png"), fullPage: true });

    await customerPage.goto(`/payment?offerId=${offerId}`);
    await expect(customerPage).toHaveURL(new RegExp(`/payment\\?offerId=${offerId}`));
    await expect(customerPage.locator("main")).toContainText("Stripe");
    await customerPage.screenshot({ path: join(outputDir, "auth-smoke-payment.png"), fullPage: true });

    await customerPage.goto(`/review/${projectId}`);
    await expect(customerPage).toHaveURL(new RegExp(`/review/${projectId}$`));
    await expect(customerPage.locator("form")).toBeVisible();
    await customerPage.screenshot({ path: join(outputDir, "auth-smoke-review.png"), fullPage: true });
    await customerContext.close();

    const professionalContext = await browser.newContext({ baseURL });
    const professionalPage = await professionalContext.newPage();

    await login(professionalPage, professional.email, professional.password, "/pro/dashboard");
    await professionalPage.goto("/pro/dashboard");
    await expect(professionalPage).toHaveURL(/\/pro\/dashboard$/);
    await expect(professionalPage.locator("main")).toContainText(marketRequest.title);
    await professionalPage.screenshot({ path: join(outputDir, "auth-smoke-pro-dashboard.png"), fullPage: true });
    await professionalContext.close();

    expect(paymentId).toBeTruthy();
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
            in: [customerUserId, professionalUserId].filter(Boolean) as string[],
          },
        },
      });
    }

    for (const userId of [customerSupabaseId, professionalSupabaseId]) {
      if (!userId) {
        continue;
      }

      await admin.auth.admin.deleteUser(userId).catch(() => undefined);
    }
  }
});
