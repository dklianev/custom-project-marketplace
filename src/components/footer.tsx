import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-24 rounded-t-[3rem] bg-surface-container-low px-6 py-16 md:px-12 md:py-20">
      <div className="mx-auto flex max-w-7xl flex-col gap-12 md:flex-row md:justify-between">
        <div className="max-w-md">
          <span className="block text-3xl font-black tracking-[-0.06em] text-on-surface">Atelier</span>
          <p className="mt-4 text-sm leading-7 text-on-surface-variant">
            Български пазар с AI насочване за проверени професионалисти и авторски
            услуги. Започваш с една ясна заявка, после сравняваш оферти в тих,
            доверен поток.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-10 md:gap-16">
          <div className="space-y-4">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/70">
              Продукт
            </h2>
            <div className="flex flex-col gap-3">
              <Link href="/#how-it-works" className="text-sm text-on-surface-variant transition-colors hover:text-primary">
                Как работи
              </Link>
              <Link href="/request/create" className="text-sm text-on-surface-variant transition-colors hover:text-primary">
                Подай заявка
              </Link>
              <Link href="/offers/compare" className="text-sm text-on-surface-variant transition-colors hover:text-primary">
                Сравнение на оферти
              </Link>
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/70">
              Професионалисти
            </h2>
            <div className="flex flex-col gap-3">
              <Link href="/pro/register" className="text-sm text-on-surface-variant transition-colors hover:text-primary">
                Кандидатствай
              </Link>
              <Link href="/login" className="text-sm text-on-surface-variant transition-colors hover:text-primary">
                Вход
              </Link>
              <Link href="/register" className="text-sm text-on-surface-variant transition-colors hover:text-primary">
                Създай профил
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-7xl text-sm text-on-surface-variant">
        © 2026 Atelier. По-малко шум, повече доверие.
      </div>
    </footer>
  );
}
