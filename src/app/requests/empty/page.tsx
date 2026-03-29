import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Footer } from "@/components/footer";
import { EditorialPanel, SectionEyebrow } from "@/components/editorial-primitives";
import { Navbar } from "@/components/navbar";
import { requireAuth, requireRole } from "@/lib/auth";
import {
  getCustomerRequestsWorkspace,
  getFeaturedProfessionals,
  getRequestsMarketplaceProof,
  pickProfessionalArtwork,
} from "@/lib/customer-requests-workspace";

const steps = [
  {
    title: "Описваш какво търсиш",
    body: "Започваме с естествено описание, а AI структурира нуждите, бюджета и срока в разбираем бриф.",
    icon: "edit_note",
  },
  {
    title: "AI подбира правилните професионалисти",
    body: "Заявката не потъва в директория. Насочваме я към проверени хора с релевантен опит и контекст.",
    icon: "hub",
  },
  {
    title: "Избираш спокойно и с защита",
    body: "Сравняваш офертите, плащаш със защитен flow и проследяваш проекта до финален отзив.",
    icon: "verified_user",
  },
] as const;

export default async function EmptyRequestsPage() {
  const auth = requireRole(await requireAuth(), ["CLIENT"]);
  const [requests, featuredProfessionals, proof] = await Promise.all([
    getCustomerRequestsWorkspace(auth.profile.id),
    getFeaturedProfessionals(),
    getRequestsMarketplaceProof(),
  ]);

  if (requests.length > 0) {
    redirect("/requests");
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface font-body text-on-surface antialiased">
      <Navbar />

      <main className="flex-1 px-6 pb-20 pt-34 md:pt-40">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <EditorialPanel className="p-6 md:p-8">
              <SectionEyebrow className="mb-4">Първа заявка</SectionEyebrow>
              <h1 className="text-[2.4rem] font-extrabold leading-[1.02] tracking-[-0.06em] md:text-[4rem]">
                Още няма активна заявка, но пътят напред е ясен.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-on-surface-variant md:text-lg">
                Не те караме да ровиш в каталог. Описваш проекта си, AI задава точните уточнения и после
                подреждаме офертите така, че изборът да е спокоен и защитен.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/request/create"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-black text-on-primary shadow-[0_18px_34px_rgba(85,62,96,0.2)] transition-opacity hover:opacity-95"
                >
                  Създай заявка
                  <span aria-hidden="true" className="material-symbols-outlined text-lg">
                    arrow_forward
                  </span>
                </Link>
                <span className="inline-flex items-center rounded-full bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface-variant">
                  AI маршрутизира, не просто показва профили
                </span>
              </div>
            </EditorialPanel>

            <EditorialPanel className="overflow-hidden p-3">
              <div className="grid gap-5 md:grid-cols-[1fr_0.8fr] md:items-end">
                <div className="overflow-hidden rounded-[2rem] bg-surface-container-low">
                  <Image
                    src="/editorial/empty-hero.svg"
                    alt="Илюстрация за начало на нова заявка"
                    width={640}
                    height={640}
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    className="aspect-[4/3] h-full w-full object-cover"
                  />
                </div>
                <div className="space-y-4 p-3 md:p-5">
                  {[
                    { label: "Проверени професионалисти", value: proof.verifiedProfessionals },
                    { label: "Завършени проекта", value: proof.completedProjects },
                    { label: "Публикувани отзиви", value: proof.publishedReviews },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[1.5rem] bg-surface-container-low px-5 py-5">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                        {item.label}
                      </p>
                      <p className="mt-3 text-3xl font-black tracking-tight text-primary">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </EditorialPanel>
          </div>

          <section className="space-y-4">
            <div>
              <SectionEyebrow className="mb-4">Как протича</SectionEyebrow>
              <h2 className="text-3xl font-extrabold tracking-[-0.05em]">Три спокойни стъпки вместо marketplace хаос</h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {steps.map((step) => (
                <EditorialPanel key={step.title} className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/8 text-primary">
                    <span aria-hidden="true" className="material-symbols-outlined">
                      {step.icon}
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-extrabold tracking-tight">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-on-surface-variant">{step.body}</p>
                </EditorialPanel>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <SectionEyebrow className="mb-4">Проверени професионалисти</SectionEyebrow>
                <h2 className="text-3xl font-extrabold tracking-[-0.05em]">Хората, към които AI би насочил правилния бриф</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-on-surface-variant">
                  Това не е директория за разглеждане. Показваме ти само пример за нивото на доверие и качество,
                  което стои зад маршрутизирането.
                </p>
              </div>
              <Link
                href="/request/create"
                className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-5 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-white"
              >
                Започни с описание
                <span aria-hidden="true" className="material-symbols-outlined text-lg">
                  arrow_forward
                </span>
              </Link>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {featuredProfessionals.map((professional, index) => (
                <EditorialPanel key={professional.id} className="overflow-hidden p-3">
                  <div className="overflow-hidden rounded-[1.8rem] bg-surface-container-low">
                    <Image
                      src={pickProfessionalArtwork(professional.portfolioImages, index)}
                      alt={professional.name}
                      width={640}
                      height={640}
                      sizes="(min-width: 1280px) 20vw, (min-width: 768px) 40vw, 100vw"
                      className="aspect-[4/5] h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-4 md:p-5">
                    <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                      <span className="rounded-full bg-primary/8 px-3 py-1 font-semibold text-primary">
                        Проверен профил
                      </span>
                      {professional.location ? <span>{professional.location}</span> : null}
                    </div>
                    <h3 className="mt-4 text-xl font-extrabold tracking-tight">{professional.name}</h3>
                    <p className="mt-2 text-sm leading-7 text-on-surface-variant">
                      {(professional.skills.slice(0, 3).join(" • ") || "Подбран заради релевантен опит и стабилна история")}.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-sm text-on-surface-variant">
                      <span className="rounded-full bg-surface-container-low px-4 py-2 font-semibold text-on-surface">
                        {professional.rating.toFixed(1)} • {professional.reviewCount} отзива
                      </span>
                      {professional.experience ? (
                        <span className="rounded-full bg-surface-container-low px-4 py-2 font-semibold text-on-surface">
                          {professional.experience} г. опит
                        </span>
                      ) : null}
                    </div>
                  </div>
                </EditorialPanel>
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
