import Image from "next/image";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { EditorialPanel, SectionEyebrow } from "@/components/editorial-primitives";
import { Navbar } from "@/components/navbar";

export type PaymentSuccessData = {
  id: string;
  total: number;
  amount: number;
  serviceFee: number;
  currency: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "REFUNDED";
  invoiceNumber: string | null;
  project: {
    id: string;
    title: string;
    request: {
      title: string;
      description: string;
      budget: string | null;
      timeline: string | null;
      location: string | null;
    };
    professional: {
      name: string;
      avatarUrl: string | null;
      verified: boolean;
    };
  };
};

type PaymentSuccessExperienceProps = {
  initialPayment: PaymentSuccessData | null;
  initialError?: string | null;
};

function formatCurrency(value: number, currency = "BGN") {
  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function statusCopy(status: PaymentSuccessData["status"] | undefined) {
  switch (status) {
    case "COMPLETED":
      return "Вашата резервация е потвърдена, а проектът вече е в защитения поток на Atelier.";
    case "PROCESSING":
      return "Плащането се обработва, но проектът вече е подготвен за старта на работата.";
    case "FAILED":
      return "Плащането не е минало успешно. Можеш да се върнеш към checkout-а и да опиташ отново.";
    case "REFUNDED":
      return "Плащането е възстановено и записът остава в историята на проекта.";
    default:
      return "Плащането е подадено, а потвърждението ще се обнови веднага щом обработката приключи.";
  }
}

export function PaymentSuccessExperience({
  initialPayment,
  initialError = null,
}: PaymentSuccessExperienceProps) {
  const payment = initialPayment;
  const error = initialError;
  const receiptHref = payment ? `/api/payments/${payment.id}/receipt` : null;
  const projectHref = payment ? `/project/${payment.project.id}` : "/dashboard";
  const proofImage = "/editorial/portfolio-01.svg";

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <Navbar />

      <main className="flex-1 px-6 pb-24 pt-28 md:pt-36">
        <div className="mx-auto flex max-w-5xl flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-[0_16px_34px_rgba(85,62,96,0.08)]">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check
            </span>
          </div>

          <SectionEyebrow className="mt-6">Защитено плащане</SectionEyebrow>
          <h1 className="mt-6 max-w-3xl text-center text-[2.7rem] font-extrabold leading-[1.05] tracking-[-0.06em] text-primary md:text-[4.4rem]">
            {payment?.status === "COMPLETED"
              ? "Плащането е успешно"
              : payment?.status === "FAILED"
                ? "Плащането не беше потвърдено"
                : "Плащането е прието"}
          </h1>
          <p className="mt-5 max-w-2xl text-center text-base leading-8 text-on-surface-variant md:text-lg">
            {payment ? statusCopy(payment.status) : error ?? "Липсва контекст за това потвърждение."}
          </p>

          {!payment ? (
            <EditorialPanel className="mt-10 max-w-2xl p-8 text-center">
              <p className="text-sm leading-7 text-on-surface-variant">
                {error ?? "Не открихме плащане за този екран."}
              </p>
              <Link
                href="/dashboard"
                className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-4 text-sm font-black text-on-primary shadow-[0_18px_34px_rgba(85,62,96,0.2)]"
              >
                Към таблото
              </Link>
            </EditorialPanel>
          ) : (
            <>
              <div className="mt-12 grid w-full gap-5 lg:grid-cols-[1fr_0.92fr] lg:items-start">
                <EditorialPanel className="p-6 md:p-7">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                        Детайли за плащането
                      </p>
                      <p className="mt-3 text-lg font-bold text-on-surface">
                        {payment.invoiceNumber ?? `#${payment.id.slice(-8).toUpperCase()}`}
                      </p>
                    </div>
                    <p className="text-right text-sm text-on-surface-variant">
                      {payment.project.request.timeline ?? "По уговорка"}
                    </p>
                  </div>

                  <div className="mt-6 space-y-5">
                    <div className="flex items-end justify-between gap-4 rounded-[1.8rem] bg-surface-container-low px-5 py-5">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                          Проект
                        </p>
                        <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-on-surface">
                          {payment.project.request.title}
                        </h2>
                      </div>
                      <p className="text-xl font-extrabold tracking-tight text-primary">
                        {formatCurrency(payment.total, payment.currency)}
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      {[
                        payment.project.request.location ?? "По заявката",
                        payment.project.request.budget ?? "По уговорка",
                        payment.project.request.timeline ?? "По уговорка",
                      ].map((item, index) => (
                        <div
                          key={`${item}-${index}`}
                          className="rounded-[1.5rem] bg-surface-container-low px-4 py-4 text-sm leading-7 text-on-surface-variant"
                        >
                          {item}
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3 text-sm text-on-surface-variant">
                      <div className="flex items-center justify-between">
                        <span>Договорена сума</span>
                        <span className="font-semibold text-on-surface">
                          {formatCurrency(payment.amount, payment.currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Платформена такса</span>
                        <span className="font-semibold text-on-surface">
                          {formatCurrency(payment.serviceFee, payment.currency)}
                        </span>
                      </div>
                      <div className="soft-divider" />
                      <div className="flex items-center justify-between">
                        <span className="text-base font-semibold text-on-surface">Общо</span>
                        <span className="text-2xl font-extrabold tracking-tight text-primary">
                          {formatCurrency(payment.total, payment.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </EditorialPanel>

                <div className="space-y-4">
                  <EditorialPanel className="bg-primary p-6 text-on-primary md:p-7">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-primary/70">
                      Следва какво
                    </p>
                    <div className="mt-4 space-y-3 text-sm leading-7 text-on-primary/88">
                      <p>Комуникацията остава в защитения чат и всеки следващ етап се записва по проекта.</p>
                      <p>Ще виждаш статуса на работата, файловете и разписката от едно място.</p>
                    </div>
                    <div className="mt-6 flex items-center gap-2 text-on-primary/70">
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-base"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        verified_user
                      </span>
                      {payment.project.professional.verified
                        ? "Проверен професионалист"
                        : "Профил в защитения поток"}
                    </div>
                  </EditorialPanel>

                  <EditorialPanel className="px-5 py-4">
                    <div className="flex items-center gap-4">
                      {payment.project.professional.avatarUrl ? (
                        <Image
                          src={payment.project.professional.avatarUrl}
                          alt={payment.project.professional.name}
                          width={52}
                          height={52}
                          sizes="52px"
                          className="h-13 w-13 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-13 w-13 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <span
                            aria-hidden="true"
                            className="material-symbols-outlined"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            person
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-on-surface">
                          {payment.project.professional.name}
                        </p>
                        <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant/70">
                          Избран професионалист
                        </p>
                      </div>
                    </div>
                  </EditorialPanel>
                </div>
              </div>

              <Link
                href={projectHref}
                className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-black text-on-primary shadow-[0_18px_34px_rgba(85,62,96,0.2)] transition-opacity hover:opacity-95"
              >
                Към проекта
                <span aria-hidden="true" className="material-symbols-outlined text-lg">
                  arrow_forward
                </span>
              </Link>

              {receiptHref ? (
                <div className="mt-4 text-center">
                  <a
                    href={receiptHref}
                    className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70 transition-opacity hover:opacity-80"
                  >
                    Изтегли разписка
                  </a>
                </div>
              ) : null}

              <div className="mt-12 w-full overflow-hidden rounded-[2.25rem] bg-surface-container-low shadow-[0_24px_70px_rgba(77,66,96,0.08)]">
                <Image
                  src={proofImage}
                  alt="Интериорно вдъхновение"
                  width={1600}
                  height={640}
                  sizes="(min-width: 1024px) 70rem, 100vw"
                  className="aspect-[16/6] h-full w-full object-cover"
                  priority
                />
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
