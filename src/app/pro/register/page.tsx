"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Footer } from "@/components/footer";
import { SectionEyebrow } from "@/components/editorial-primitives";
import { Navbar } from "@/components/navbar";
import { STORAGE_BUCKETS } from "@/lib/storage";
import { uploadFileWithPresign } from "@/lib/uploads/client";

type ProfessionalProfile = {
  id: string;
  role: "CLIENT" | "PROFESSIONAL";
  name: string;
  email: string;
  phone: string | null;
  bio: string | null;
  location: string | null;
  skills: string[];
  experience: number | null;
  certificates: string[];
  portfolioImages: string[];
};

type MeResponse = {
  user?: ProfessionalProfile | null;
  error?: string;
};

type AnalyzeResponse = {
  text?: string;
  error?: string;
};

async function readJson<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return (await response.json()) as T;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Не успяхме да прочетем файла."));
    };
    reader.onerror = () => reject(new Error("Не успяхме да прочетем файла."));
    reader.readAsDataURL(file);
  });
}

function normalizeSkills(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const STEPS = ["Кандидат", "Досие", "Документи", "Портфолио"];

export default function ProRegisterPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [experience, setExperience] = useState("");
  const [docType, setDocType] = useState<"id_card" | "passport">("id_card");
  const [identityFile, setIdentityFile] = useState<File | null>(null);
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);
  const [verificationNote, setVerificationNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setIsLoadingProfile(true);

      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });
        const payload = await readJson<MeResponse>(response);

        if (response.status === 401) {
          if (!cancelled) {
            setProfile(null);
          }
          return;
        }

        if (!response.ok || !payload?.user) {
          throw new Error(payload?.error ?? "Не успяхме да заредим профила.");
        }

        if (cancelled) {
          return;
        }

        setProfile(payload.user);
        setName(payload.user.name ?? "");
        setPhone(payload.user.phone ?? "");
        setLocation(payload.user.location ?? "");
        setBio(payload.user.bio ?? "");
        setSkillsInput(payload.user.skills.join(", "));
        setExperience(payload.user.experience ? String(payload.user.experience) : "");
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Не успяхме да заредим профила.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProfile(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const canSubmit = useMemo(
    () => Boolean(profile && profile.role === "PROFESSIONAL" && identityFile),
    [identityFile, profile],
  );

  async function uploadFile(bucket: keyof typeof STORAGE_BUCKETS, file: File) {
    return uploadFileWithPresign(STORAGE_BUCKETS[bucket], file);
  }

  async function analyzeDocument(file: File) {
    const imageUrl = await fileToDataUrl(file);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const response = await fetch("/api/ai/analyze-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        imageUrl,
        jsonMode: true,
        prompt: `Check whether this ${docType} image is readable and formatted correctly. Return JSON with readable, validFormat, and issues.`,
      }),
    }).finally(() => {
      clearTimeout(timeoutId);
    });
    const payload = await readJson<AnalyzeResponse>(response);

    if (!response.ok || !payload?.text) {
      throw new Error(payload?.error ?? "Не успяхме да проверим документа с AI.");
    }

    const parsed = JSON.parse(payload.text) as {
      readable?: boolean;
      validFormat?: boolean;
      issues?: string[];
    };

    return parsed;
  }

  function handleIdentityChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setIdentityFile(file);
    setVerificationNote(null);
  }

  function handlePortfolioChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, 4);
    setPortfolioFiles(files);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile || profile.role !== "PROFESSIONAL") {
      router.replace("/register?role=professional");
      return;
    }

    if (!identityFile || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const [documentUpload, analysis] = await Promise.all([
        uploadFile("documents", identityFile),
        analyzeDocument(identityFile).catch(() => null),
      ]);

      const portfolioUploads = await Promise.all(
        portfolioFiles.map((file) => uploadFile("portfolios", file)),
      );

      if (analysis) {
        const issues =
          analysis.issues && analysis.issues.length > 0
            ? ` Забележки: ${analysis.issues.join(", ")}.`
            : "";
        setVerificationNote(
          analysis.readable && analysis.validFormat
            ? `AI проверката показва, че документът е четим и форматът изглежда коректен.${issues}`
            : `AI проверката подсказва, че документът иска допълнителен преглед.${issues}`,
        );
      } else {
        setVerificationNote(
          "AI проверката не върна резултат, така че документът ще мине през ръчен преглед.",
        );
      }

      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          phone: phone.trim() || undefined,
          bio: bio.trim() || undefined,
          location: location.trim() || undefined,
          skills: normalizeSkills(skillsInput),
          experience: experience ? Number(experience) : undefined,
          certificates: [documentUpload.path, ...(profile.certificates ?? [])].slice(0, 10),
          portfolioImages: [
            ...portfolioUploads
              .map((item) => item.publicUrl)
              .filter((value): value is string => Boolean(value)),
            ...(profile.portfolioImages ?? []),
          ].slice(0, 20),
        }),
      });
      const payload = await readJson<MeResponse>(response);

      if (!response.ok || !payload?.user) {
        throw new Error(payload?.error ?? "Не успяхме да запазим профила.");
      }

      setProfile(payload.user);
      setSuccess(
        "Профилът е обновен, документът е качен и заявката за проверка е изпратена.",
      );

      router.push("/pro/dashboard?onboarding=1");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Не успяхме да завършим проверката.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <Navbar />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 pb-20 pt-28 md:pt-36">
        <div className="mb-10 flex items-center justify-center gap-4 overflow-x-auto pb-2">
          {STEPS.map((step, index) => {
            const active = index === 2;
            const completed = index < 2;
            return (
              <div key={step} className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-2">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-black ${completed ? "bg-primary text-on-primary" : active ? "border border-primary bg-white text-primary" : "bg-surface-container-low text-on-surface-variant"}`}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                    {step}
                  </span>
                </div>
                {index < STEPS.length - 1 ? <span className="h-px w-12 bg-outline-variant/35" /> : null}
              </div>
            );
          })}
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
          <section className="space-y-6">
            <div>
              <SectionEyebrow className="mb-5">Регистрация на професионалист</SectionEyebrow>
              <h1 className="text-[2.7rem] font-extrabold leading-[1.05] tracking-[-0.06em] text-primary md:text-[4.4rem]">
                Изградете доверие още от първия поглед.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-8 text-on-surface-variant md:text-lg">
                За да завършите вашето досие в Atelier, качете професионални документи и подредено портфолио. Това е тихата, но важна стъпка към по-качествени съвпадения.
              </p>
            </div>

            <div className="space-y-3">
              {[
                "Сигурността на данните е водеща. Използваме защитен преглед и криптиран workflow.",
                "Базовата проверка прави профила по-убедителен за клиентите още от първата заявка.",
              ].map((item) => (
                <div key={item} className="rounded-[1.6rem] bg-white/82 px-5 py-5 text-sm leading-7 text-on-surface-variant shadow-[0_18px_48px_rgba(77,66,96,0.06)] backdrop-blur-xl">
                  {item}
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-[2.2rem] bg-white/82 shadow-[0_24px_70px_rgba(77,66,96,0.08)] backdrop-blur-xl">
              <Image
                src="/auth-onboarding.svg"
                alt="Илюстрация за професионален onboarding"
                width={900}
                height={900}
                sizes="(min-width: 1024px) 26rem, 100vw"
                className="aspect-square h-full w-full object-cover"
                priority
              />
            </div>
          </section>

          <section className="rounded-[2.35rem] bg-white/88 p-7 shadow-[0_32px_90px_rgba(77,66,96,0.1)] backdrop-blur-xl md:p-8">
            {isLoadingProfile ? (
              <p className="text-sm leading-7 text-on-surface-variant">
                Зареждаме професионалния профил...
              </p>
            ) : !profile ? (
              <div className="space-y-5">
                <h2 className="text-2xl font-extrabold tracking-tight">
                  Първо създай профил за професионалист
                </h2>
                <p className="text-sm leading-7 text-on-surface-variant">
                  Страницата е публична, но качването на документите изисква активна сесия като професионалист.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/register?role=professional&next=/pro/register"
                    className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-4 text-sm font-bold text-on-primary"
                  >
                    Създай профил за професионалист
                  </Link>
                  <Link
                    href="/login?role=professional&next=/pro/register"
                    className="inline-flex items-center justify-center rounded-full bg-surface-container-low px-6 py-4 text-sm font-bold text-on-surface"
                  >
                    Влез
                  </Link>
                </div>
              </div>
            ) : profile.role !== "PROFESSIONAL" ? (
              <div className="space-y-4">
                <h2 className="text-2xl font-extrabold tracking-tight">
                  Този поток е само за професионалисти
                </h2>
                <p className="text-sm leading-7 text-on-surface-variant">
                  Профилът ти в момента е клиентски.
                </p>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                      03. Проверка на самоличността
                    </p>
                    <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-on-surface">
                      Довършете досието си
                    </h2>
                  </div>
                  <span className="rounded-full bg-surface-container-low px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-primary/80">
                    Верификация
                  </span>
                </div>

                {error ? (
                  <div className="rounded-[1.6rem] bg-rose-100/80 px-5 py-4 text-sm font-medium text-rose-700">
                    {error}
                  </div>
                ) : null}

                {success ? (
                  <div className="rounded-[1.6rem] bg-primary/8 px-5 py-4 text-sm font-medium text-primary">
                    {success}
                  </div>
                ) : null}

                {verificationNote ? (
                  <div className="rounded-[1.6rem] bg-surface-container-low px-5 py-4 text-sm leading-7 text-on-surface-variant">
                    {verificationNote}
                  </div>
                ) : null}

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                      Име
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="w-full rounded-t-[1.4rem] border-b-4 border-primary/25 bg-surface-container-low px-5 py-4 text-on-surface outline-none transition-colors focus:border-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                      Телефон
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      className="w-full rounded-t-[1.4rem] border-b-4 border-primary/25 bg-surface-container-low px-5 py-4 text-on-surface outline-none transition-colors focus:border-primary"
                      placeholder="+359..."
                    />
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                      Локация
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(event) => setLocation(event.target.value)}
                      className="w-full rounded-t-[1.4rem] border-b-4 border-primary/25 bg-surface-container-low px-5 py-4 text-on-surface outline-none transition-colors focus:border-primary"
                      placeholder="София, Пловдив, дистанционно..."
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                      Опит (години)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={experience}
                      onChange={(event) => setExperience(event.target.value)}
                      className="w-full rounded-t-[1.4rem] border-b-4 border-primary/25 bg-surface-container-low px-5 py-4 text-on-surface outline-none transition-colors focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                    Умения
                  </label>
                  <input
                    type="text"
                    value={skillsInput}
                    onChange={(event) => setSkillsInput(event.target.value)}
                    className="w-full rounded-t-[1.4rem] border-b-4 border-primary/25 bg-surface-container-low px-5 py-4 text-on-surface outline-none transition-colors focus:border-primary"
                    placeholder="интериор, 3D, мебели по поръчка..."
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                    Представяне
                  </label>
                  <textarea
                    rows={4}
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    className="w-full resize-none rounded-[1.8rem] bg-surface-container-low px-5 py-4 text-sm leading-7 text-on-surface outline-none shadow-[inset_0_-1px_0_rgba(124,117,125,0.22)] transition-[background-color,box-shadow] duration-200 focus:bg-white focus:shadow-[inset_0_-2px_0_var(--color-primary),0_18px_36px_rgba(77,66,96,0.08)]"
                    placeholder="Разкажи накратко как работиш и какво те отличава."
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setDocType("id_card")}
                    className={`rounded-full px-5 py-3 text-sm font-semibold transition-[background-color,color,box-shadow] duration-200 ${
                      docType === "id_card"
                        ? "bg-primary text-on-primary shadow-[0_18px_34px_rgba(85,62,96,0.18)]"
                        : "bg-surface-container-low text-on-surface-variant"
                    }`}
                  >
                    Лична карта
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocType("passport")}
                    className={`rounded-full px-5 py-3 text-sm font-semibold transition-[background-color,color,box-shadow] duration-200 ${
                      docType === "passport"
                        ? "bg-primary text-on-primary shadow-[0_18px_34px_rgba(85,62,96,0.18)]"
                        : "bg-surface-container-low text-on-surface-variant"
                    }`}
                  >
                    Паспорт
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-[1.8rem] border border-dashed border-outline-variant/35 bg-surface-container-low px-5 py-6 text-center transition-[background-color,border-color] duration-200 hover:border-primary/35 hover:bg-white">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={handleIdentityChange}
                    />
                    <span aria-hidden="true" className="material-symbols-outlined text-3xl text-primary">
                      badge
                    </span>
                    <p className="mt-3 text-sm font-semibold text-on-surface">
                      {identityFile ? identityFile.name : "Предна страна"}
                    </p>
                    <p className="mt-1 text-xs leading-6 text-on-surface-variant">
                      JPG, PNG или WEBP до 10 MB
                    </p>
                  </label>

                  <label className="flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-[1.8rem] border border-dashed border-outline-variant/35 bg-surface-container-low px-5 py-6 text-center transition-[background-color,border-color] duration-200 hover:border-primary/35 hover:bg-white">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      className="sr-only"
                      onChange={handlePortfolioChange}
                    />
                    <span aria-hidden="true" className="material-symbols-outlined text-3xl text-primary">
                      gallery_thumbnail
                    </span>
                    <p className="mt-3 text-sm font-semibold text-on-surface">
                      {portfolioFiles.length > 0 ? `${portfolioFiles.length} файла избрани` : "Качи портфолио"}
                    </p>
                    <p className="mt-1 text-xs leading-6 text-on-surface-variant">
                      До 4 изображения за публичния профил
                    </p>
                  </label>
                </div>

                <div className="rounded-[1.8rem] bg-surface-container-low px-5 py-5 text-sm leading-7 text-on-surface-variant">
                  Съвет: уверете се, че качването е четливо и актуално. Това ще направи бъдещите клиентски заявки по-качествени и по-уверени.
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <Link
                    href="/pro/dashboard"
                    className="inline-flex items-center justify-center rounded-full bg-surface-container-low px-6 py-4 text-sm font-bold text-on-surface transition-colors hover:bg-white"
                  >
                    Назад
                  </Link>
                  <button
                    type="submit"
                    disabled={!canSubmit || isSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-black text-on-primary shadow-[0_18px_34px_rgba(85,62,96,0.2)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? "Проверяваме документите..." : "Продължи към портфолио"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

