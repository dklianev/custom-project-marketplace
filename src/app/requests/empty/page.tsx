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
    title: "Опишете заявката",
    body: "Разкажете проекта с нормален език, а Atelier ще подреди детайлите в ясен бриф.",
    icon: "edit_note",
  },
  {
    title: "AI насочва правилно",
    body: "Уточняваме липсващото и изпращаме заявката само към релевантни, проверени професионалисти.",
    icon: "hub",
  },
  {
    title: "Избирате спокойно",
    body: "Получавате оферти, защитено плащане и ясен статус без хаотично търсене по категории.",
    icon: "verified_user",
  },
  {
    title: "Проследявате всичко",
    body: "Чатът, файловете, сроковете и ревютата остават на едно място след избора ви.",
    icon: "workspaces",
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
        <div className="mx-auto max-w-6xl space-y-10">
          <header className="space-y-4 text-center">
            <SectionEyebrow>Моите заявки</SectionEyebrow>
            <h1 className="text-[2.5rem] font-extrabold leading-[1.02] tracking-[-0.06em] md:text-[4.2rem]">
              Първата заявка задава тона
            </h1>
            <p className="mx-auto max-w-3xl text-base leading-8 text-on-surface-variant md:text-lg">
              Вместо да обикаляте между профили и категории, опишете проекта си веднъж. Atelier ще събере правилните професионалисти и ще подреди следващите стъпки.
            </p>
          </header>

          <EditorialPanel className="mx-auto max-w-4xl overflow-hidden p-5 md:p-7">
            <div className="grid gap-6 lg:grid-cols-[260px_1fr] lg:items-center">
              <div className="mx-auto w-full max-w-[260px] overflow-hidden rounded-[2rem] bg-surface-container-low">
                <Image
                  src="/editorial/empty-hero.svg"
                  alt="Първата ви заявка в Atelier"
                  width={960}
                  height={960}
                  sizes="260px"
                  className="aspect-[4/5] h-full w-full object-cover"
                />
              </div>
              <div className="space-y-5 text-center lg:text-left">
                <div>
                  <h2 className="text-3xl font-extrabold tracking-[-0.05em] md:text-[2.8rem]">
                    Въведи кратко описание
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-on-surface-variant md:text-base">
                    Atelier ще превърне заявката в структуриран бриф, ще зададе нужните уточнения и ще я изпрати само към релевантните професионалисти.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                  <Link
                    href="/request/create"
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-black text-on-primary shadow-[0_18px_34px_rgba(85,62,96,0.2)] transition-opacity hover:opacity-95"
                  >
                    Изпробвай Atelier
                    <span aria-hidden="true" className="material-symbols-outlined text-lg">
                      arrow_forward
                    </span>
                  </Link>
                  <span className="inline-flex items-center rounded-full bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface-variant">
                    {proof.verifiedProfessionals} проверени професионалисти
                  </span>
                </div>
              </div>
            </div>
          </EditorialPanel>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
          </section>

          <section className="space-y-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <SectionEyebrow>Вдъхновете се от нашите майстори</SectionEyebrow>
                <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.05em]">
                  Проверени профили с реални проекти
                </h2>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-on-surface-variant">
                <span className="rounded-full bg-surface-container-low px-4 py-2 font-semibold text-on-surface">
                  {proof.completedProjects} завършени проекта
                </span>
                <span className="rounded-full bg-surface-container-low px-4 py-2 font-semibold text-on-surface">
                  {proof.publishedReviews} публикувани отзива
                </span>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {featuredProfessionals.map((professional, index) => (
                <EditorialPanel key={professional.id} className="overflow-hidden p-3">
                  <div className="overflow-hidden rounded-[1.8rem] bg-surface-container-low">
                    <Image
                      src={pickProfessionalArtwork(professional.portfolioImages, index)}
                      alt={professional.name}
                      width={720}
                      height={720}
                      sizes="(min-width: 1280px) 18rem, (min-width: 768px) 40vw, 100vw"
                      className="aspect-[4/5] h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-4 md:p-5">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
                      <span className="rounded-full bg-primary/8 px-3 py-1 font-semibold text-primary">
                        Проверен профил
                      </span>
                      {professional.location ? <span>{professional.location}</span> : null}
                    </div>
                    <h3 className="mt-4 text-2xl font-extrabold tracking-tight">{professional.name}</h3>
                    <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                      {professional.skills.slice(0, 3).join(" · ") || "Подреден профил с фокус върху custom проекти и ясна комуникация."}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-sm text-on-surface-variant">
                      <span className="rounded-full bg-surface-container-low px-4 py-2 font-semibold text-on-surface">
                        {professional.rating.toFixed(1)} · {professional.reviewCount} отзива
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
