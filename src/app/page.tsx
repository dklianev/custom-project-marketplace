import Image from "next/image";
import Link from "next/link";
import { Footer } from "@/components/footer";
import HeroSearch from "@/components/hero-search";
import { EditorialPanel, SectionEyebrow } from "@/components/editorial-primitives";
import { Navbar } from "@/components/navbar";

const trustSignals = [
  { icon: "verified_user", label: "Проверени профили" },
  { icon: "encrypted", label: "Защитено плащане" },
  { icon: "thumb_up", label: "Сравнение без напрежение" },
];

const categories = [
  {
    title: "Интериор и ремонт",
    accent: "Най-търсено",
    href: "/request/create?query=%D0%A2%D1%8A%D1%80%D1%81%D1%8F%20%D0%B8%D0%BD%D1%82%D0%B5%D1%80%D0%B8%D0%BE%D1%80%D0%B5%D0%BD%20%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82",
    image: "/editorial/project-concept.svg",
    className: "md:col-span-6 md:row-span-2",
  },
  {
    title: "Изработка на сайт",
    href: "/request/create?query=%D0%A2%D1%8A%D1%80%D1%81%D1%8F%20%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B8%D0%B7%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D0%BA%D0%B0%20%D0%BD%D0%B0%20%D1%83%D0%B5%D0%B1%D1%81%D0%B0%D0%B9%D1%82",
    image: "/editorial/portfolio-01.svg",
    className: "sm:col-span-6 md:col-span-6",
  },
  {
    title: "Бранд и идентичност",
    href: "/request/create?query=%D0%A2%D1%8A%D1%80%D1%81%D1%8F%20%D0%B1%D1%80%D0%B0%D0%BD%D0%B4%20%D0%B8%20%D0%B2%D0%B8%D0%B7%D1%83%D0%B0%D0%BB%D0%BD%D0%B0%20%D0%B8%D0%B4%D0%B5%D0%BD%D1%82%D0%B8%D1%87%D0%BD%D0%BE%D1%81%D1%82",
    image: "/editorial/artisan-jewelry.svg",
    className: "sm:col-span-6 md:col-span-3",
  },
  {
    title: "Поръчкова изработка",
    href: "/request/create?query=%D0%A2%D1%8A%D1%80%D1%81%D1%8F%20%D0%BF%D0%BE%D1%80%D1%8A%D1%87%D0%BA%D0%BE%D0%B2%D0%B0%20%D0%B8%D0%B7%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D0%BA%D0%B0%20%D0%B8%D0%BB%D0%B8%20%D0%BF%D1%80%D0%BE%D1%82%D0%BE%D1%82%D0%B8%D0%BF",
    image: "/editorial/artisan-ceramic.svg",
    className: "sm:col-span-6 md:col-span-3",
  },
];

const whyCards = [
  {
    icon: "shield",
    title: "Няма профили без проверка",
    body: "Виждаш само професионалисти с реално попълнен профил, контекст и история на работа.",
  },
  {
    icon: "checklist",
    title: "AI структурира заявката",
    body: "Получаваш ясен бриф, а не хаотичен чат с пропуснати условия.",
  },
  {
    icon: "compare_arrows",
    title: "Сравняваш спокойно",
    body: "Цена, срок, подход и доверие са подредени на едно място преди решение.",
  },
  {
    icon: "contract",
    title: "Следва ясен процес",
    body: "Плащане, статус, файлове и ревюта минават през една подредена среда.",
  },
];

const whyChecklist = [
  "Изпращаш една добре оформена заявка вместо десетки съобщения.",
  "AI подбира точните хора според профила и контекста на проекта.",
  "Виждаш оферти, доверие и следващи стъпки в спокоен, ясен flow.",
];

function CategoryCard({
  title,
  href,
  image,
  className,
  accent,
}: {
  title: string;
  href: string;
  image: string;
  className?: string;
  accent?: string;
}) {
  return (
    <Link
      href={href}
      className={`group relative isolate block min-h-[220px] overflow-hidden rounded-[2.2rem] bg-[radial-gradient(circle_at_top_left,rgba(214,201,235,0.78),rgba(248,244,251,0.92)_46%,rgba(255,255,255,0.98)_100%)] shadow-[0_28px_80px_rgba(77,66,96,0.08)] ${className ?? ""}`}
    >
      <Image
        src={image}
        alt={title}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(29,27,29,0.02)_0%,rgba(29,27,29,0.15)_48%,rgba(29,27,29,0.82)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 p-6 md:p-7">
        {accent ? (
          <span className="mb-3 inline-flex rounded-full bg-white/18 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/90 backdrop-blur-md">
            {accent}
          </span>
        ) : null}
        <h3 className="max-w-[16rem] text-2xl font-extrabold tracking-[-0.04em] text-white md:text-[1.75rem]">
          {title}
        </h3>
      </div>
    </Link>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-surface text-on-surface">
      <Navbar />

      <main className="flex-1 pt-32 pb-20 md:pt-36 md:pb-24">
        <section className="mx-auto w-full max-w-7xl px-6 text-center">
          <SectionEyebrow className="mb-8">AI маркетплейс за проверени професионалисти</SectionEyebrow>
          <h1 className="mx-auto max-w-4xl text-[3rem] font-extrabold leading-[0.95] tracking-[-0.06em] text-on-surface md:text-[5.4rem]">
            Опиши какво ти трябва.
            <span className="block bg-[linear-gradient(120deg,#553e60_0%,#7a6484_48%,#6b86d1_100%)] bg-clip-text text-transparent">
              Atelier ще го превърне в работещ бриф.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-on-surface-variant md:text-xl">
            AI ще зададе точните уточнения, ще подреди заявката ти и ще я изпрати до професионалистите,
            които имат най-силен контекст за проекта.
          </p>

          <div className="mt-12 md:mt-14">
            <HeroSearch />
          </div>

          <div className="mt-14 flex flex-wrap justify-center gap-6 md:gap-12">
            {trustSignals.map((item) => (
              <div key={item.label} className="flex items-center gap-3 text-sm font-bold tracking-tight text-on-surface/78 md:text-base">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-high shadow-[0_12px_30px_rgba(77,66,96,0.05)]">
                  <span aria-hidden="true" className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {item.icon}
                  </span>
                </div>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-24 w-full max-w-7xl px-6">
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-extrabold tracking-[-0.05em] text-on-surface md:text-5xl">Популярни категории</h2>
              <p className="mt-3 max-w-xl text-base leading-8 text-on-surface-variant">
                Най-честите заявки започват оттук, но всяка от тях минава през AI уточняване и реален подбор.
              </p>
            </div>
            <Link
              href="/request/create"
              className="inline-flex items-center gap-2 self-start rounded-full bg-white/86 px-4 py-2.5 text-sm font-bold text-primary shadow-[0_14px_32px_rgba(77,66,96,0.05)] transition-colors hover:bg-white hover:text-primary-container md:self-auto"
            >
              Виж всички категории
              <span aria-hidden="true" className="material-symbols-outlined text-lg">arrow_forward</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-12 md:auto-rows-[210px]">
            {categories.map((category) => (
              <CategoryCard key={category.title} {...category} />
            ))}
          </div>
        </section>

        <section id="how-it-works" className="mx-auto mt-24 w-full max-w-7xl px-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.84fr)_minmax(0,1.16fr)] xl:items-stretch">
            <div className="grid gap-5 sm:grid-cols-2 xl:auto-rows-fr">
              {whyCards.map((item) => (
                <EditorialPanel
                  key={item.title}
                  className="flex h-full flex-col rounded-[2.2rem] bg-white/84 p-6 shadow-[0_20px_48px_rgba(77,66,96,0.06)] backdrop-blur-md md:p-7"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed text-primary shadow-[0_10px_24px_rgba(85,62,96,0.08)]">
                    <span aria-hidden="true" className="material-symbols-outlined text-[22px]">
                      {item.icon}
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold tracking-tight text-on-surface">{item.title}</h3>
                  <p className="mt-3 max-w-[24rem] text-sm leading-7 text-on-surface-variant">{item.body}</p>
                </EditorialPanel>
              ))}
            </div>

            <div className="relative overflow-hidden rounded-[2.8rem] bg-[radial-gradient(circle_at_top_left,rgba(223,213,239,0.72),rgba(250,246,252,0.92)_44%,rgba(255,255,255,0.98)_100%)] px-7 py-8 shadow-[0_34px_96px_rgba(77,66,96,0.08)] md:px-10 md:py-10 xl:px-12 xl:py-12">
              <div className="absolute -top-16 right-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(140,117,189,0.18)_0%,rgba(140,117,189,0)_72%)]" />
              <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(214,201,235,0.22)_0%,rgba(214,201,235,0)_76%)]" />

              <SectionEyebrow className="relative mb-5">Защо да изберете Atelier?</SectionEyebrow>
              <h2 className="relative max-w-none text-3xl font-extrabold leading-[0.96] tracking-[-0.05em] text-on-surface md:text-5xl xl:max-w-[12ch]">
                По-малко шум. Повече яснота преди решението.
              </h2>
              <p className="relative mt-5 max-w-2xl text-base leading-8 text-on-surface-variant md:text-lg">
                Вместо директория от профили получаваш подреден процес: заявка, уточнения, съпоставени оферти,
                доверие и следваща стъпка в една спокойна среда.
              </p>

              <div className="relative mt-8 space-y-3">
                {whyChecklist.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-[1.6rem] border border-white/55 bg-white/80 px-4 py-4 shadow-[0_14px_34px_rgba(77,66,96,0.05)]"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined mt-0.5 text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                      check_circle
                    </span>
                    <p className="text-sm font-semibold leading-7 text-on-surface-variant">{item}</p>
                  </div>
                ))}
              </div>

              <div className="relative mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/request/create"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-black text-on-primary shadow-[0_18px_36px_rgba(85,62,96,0.18)] transition-[transform,opacity,box-shadow] duration-200 hover:-translate-y-0.5 hover:opacity-95"
                >
                  Изпрати запитване
                  <span aria-hidden="true" className="material-symbols-outlined text-lg">arrow_forward</span>
                </Link>
                <Link
                  href="/pro/register"
                  className="inline-flex items-center justify-center rounded-full bg-white/88 px-6 py-3 text-sm font-bold text-on-surface shadow-[0_12px_28px_rgba(77,66,96,0.06)] transition-colors hover:bg-white"
                >
                  Кандидатствай като професионалист
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
