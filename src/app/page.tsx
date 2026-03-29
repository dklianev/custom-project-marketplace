import Link from "next/link";
import { Footer } from "@/components/footer";
import HeroSearch from "@/components/hero-search";
import { EditorialPanel, SectionEyebrow } from "@/components/editorial-primitives";
import { Navbar } from "@/components/navbar";

const trustPoints = [
  {
    icon: "verified_user",
    title: "Проверени професионалисти",
    description: "Всеки профил минава през проверка на идентичност, портфолио и реална репутация.",
  },
  {
    icon: "gpp_good",
    title: "Плащане със защита",
    description: "Резервациите и плащанията минават през защитен процес, а не през хаотични чатове.",
  },
  {
    icon: "compare_arrows",
    title: "Оферти за спокойно сравнение",
    description: "Виждаш защо дадена оферта е добра за твоя бриф, вместо да гадаеш между шаблони.",
  },
  {
    icon: "inventory_2",
    title: "Ясен процес след избора",
    description: "Чат, статус, плащане и ревюта са подредени като доверен работен поток, а не като шумен пазар.",
  },
];

const miniFlow = [
  {
    label: "01",
    title: "Опиши проекта си",
    body: "Пишеш естествено. Не търсиш категория и не ровиш в директория.",
  },
  {
    label: "02",
    title: "AI уточнява",
    body: "Системата изчиства обхвата, бюджета и ограниченията до работеща заявка.",
  },
  {
    label: "03",
    title: "Получаваш оферти",
    body: "Brief-ът отива само към релевантни и проверени професионалисти.",
  },
  {
    label: "04",
    title: "Избираш спокойно",
    body: "Сравняваш оферти по съвпадение, доверие, цена и процес, а не по шумни обещания.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-surface text-on-surface">
      <Navbar />

      <main className="flex-1">
        <section className="relative overflow-hidden px-6 pb-20 pt-34 md:pb-24 md:pt-40">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_top_left,rgba(238,207,247,0.45),transparent_48%),radial-gradient(circle_at_top_right,rgba(202,214,253,0.55),transparent_42%),radial-gradient(circle_at_center,rgba(255,255,255,0.84),transparent_70%)]" />
          <div className="pointer-events-none absolute left-[-8%] top-24 h-[340px] w-[340px] rounded-full bg-primary-fixed/35 blur-[120px]" />
          <div className="pointer-events-none absolute bottom-0 right-[-8%] h-[320px] w-[320px] rounded-full bg-secondary-container/40 blur-[120px]" />

          <div className="relative mx-auto max-w-7xl">
            <div className="mx-auto max-w-4xl text-center">
              <SectionEyebrow className="mb-6">Български пазар с AI насочване</SectionEyebrow>
              <h1 className="text-[2.9rem] font-extrabold leading-[0.96] tracking-[-0.06em] text-on-surface md:text-[5.8rem]">
                Опиши какво ти трябва.
                <span className="block bg-[linear-gradient(120deg,#553e60_0%,#6e5678_40%,#6b86d1_100%)] bg-clip-text text-transparent">
                  Atelier ще го превърне в работеща заявка.
                </span>
              </h1>
              <p className="mx-auto mt-7 max-w-3xl text-base leading-8 text-on-surface-variant md:text-xl">
                Това не е директория и не е общ AI асистент. Пишеш нормално, AI уточнява заявката,
                структурира я и я изпраща само към проверени професионалисти, които могат да свършат точно тази работа.
              </p>
            </div>

            <div className="mt-12 md:mt-16">
              <HeroSearch />
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-4">
              {trustPoints.map((item) => (
                <EditorialPanel key={item.title} className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[1.3rem] bg-primary/10 text-primary">
                    <span aria-hidden="true" className="material-symbols-outlined text-2xl">
                      {item.icon}
                    </span>
                  </div>
                  <h2 className="text-lg font-extrabold tracking-tight">{item.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-on-surface-variant">{item.description}</p>
                </EditorialPanel>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-32 px-6 py-18 md:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <SectionEyebrow className="mb-4">Как работи</SectionEyebrow>
                <h2 className="text-4xl font-extrabold tracking-[-0.05em] md:text-6xl">
                  По-малко шум. Повече яснота.
                </h2>
              </div>
              <p className="max-w-xl text-base leading-8 text-on-surface-variant md:text-lg">
                Потокът е нарочно тих и подреден: заявка, подбор, оферти, избор, плащане и статус.
                Няма категории, няма безкрайни grid-ове и няма нужда да убеждаваш платформата какво търсиш.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
              {miniFlow.map((item) => (
                <EditorialPanel key={item.label} className="flex h-full flex-col justify-between p-7 md:p-8">
                  <div>
                    <p className="text-sm font-black tracking-[0.22em] text-primary/45">{item.label}</p>
                    <h3 className="mt-6 text-2xl font-extrabold tracking-tight">{item.title}</h3>
                  </div>
                  <p className="mt-8 text-sm leading-7 text-on-surface-variant">{item.body}</p>
                </EditorialPanel>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 pb-20 md:pb-24">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <EditorialPanel className="overflow-hidden p-8 md:p-10">
              <SectionEyebrow className="mb-5">Дигитален куратор</SectionEyebrow>
              <h2 className="max-w-2xl text-3xl font-extrabold tracking-[-0.05em] md:text-5xl">
                Atelier е за проекти, при които вкусът, доверието и ясният процес имат значение.
              </h2>
              <p className="mt-6 max-w-2xl text-base leading-8 text-on-surface-variant md:text-lg">
                Платформата е създадена за ремонти, авторска изработка, интериор, дигитален дизайн и други услуги,
                където клиентът иска подбран избор, а професионалистът иска добре структурирана заявка.
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {[
                  "Започваш с едно AI поле за заявка, не с лабиринт от категории.",
                  "Сравняваш оферти по съвпадение и сигурност, не по най-шумен профил.",
                  "След избора оставаш в спокоен trust-first workflow.",
                ].map((point) => (
                  <div key={point} className="rounded-[1.7rem] bg-surface-container-low px-5 py-5 text-sm font-semibold leading-7 text-on-surface-variant">
                    {point}
                  </div>
                ))}
              </div>
            </EditorialPanel>

            <EditorialPanel className="flex flex-col justify-between gap-8 p-8 md:p-10">
              <div>
                <SectionEyebrow className="mb-4">Следваща стъпка</SectionEyebrow>
                <h2 className="text-3xl font-extrabold tracking-[-0.05em] md:text-4xl">
                  Готов си да започнеш с реална заявка, не с още един шумен профил.
                </h2>
                <p className="mt-5 text-base leading-8 text-on-surface-variant">
                  Влизаш в AI уточняващия поток, изчистваш обхвата за няколко спокойни стъпки и изпращаш заявката,
                  когато усещането е точно и сигурно.
                </p>
              </div>

              <div className="space-y-3">
                <Link
                  href="/request/create"
                  className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-primary px-7 py-4 text-base font-black text-on-primary shadow-[0_22px_40px_rgba(85,62,96,0.22)] transition-[transform,opacity,box-shadow] duration-200 hover:-translate-y-0.5 hover:opacity-95"
                >
                  Подай заявка
                  <span aria-hidden="true" className="material-symbols-outlined text-xl">
                    arrow_forward
                  </span>
                </Link>
                <Link
                  href="/pro/register"
                  className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-white/90 px-7 py-4 text-base font-bold text-on-surface shadow-[0_18px_32px_rgba(77,66,96,0.08)] transition-colors hover:bg-white"
                >
                  Кандидатствай като професионалист
                </Link>
              </div>
            </EditorialPanel>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
