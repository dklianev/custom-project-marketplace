"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Footer } from "@/components/footer";
import { EditorialPanel, SectionEyebrow } from "@/components/editorial-primitives";
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

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 pb-20 pt-34 md:pt-40">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="space-y-6">
            <SectionEyebrow className="mb-1">Проверка на профила</SectionEyebrow>
            <h1 className="text-4xl font-extrabold leading-tight tracking-[-0.05em] md:text-6xl">
              Кандидатствай като
              <span className="block text-primary">проверен професионалист.</span>
            </h1>
            <p className="text-base leading-8 text-on-surface-variant md:text-lg">
              Тази стъпка прави реално обновяване на профила, качване на личен
              документ и предварителна AI проверка.
            </p>

            <EditorialPanel className="p-6 md:p-8">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/70">
                Какво проверяваме
              </p>
              <div className="mt-5 space-y-4">
                {[
                  "Идентификационен документ за базова проверка на четимост и формат.",
                  "Портфолио изображения, които подсилват профила ти пред клиентите.",
                  "Контекст за опит, локация и умения, за да получаваш по-точни съвпадения.",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[1.6rem] bg-surface-container-low px-5 py-5 text-sm leading-7 text-on-surface-variant"
                  >
                    {item}
                  </div>
                ))}
              </div>

              {verificationNote ? (
                <div className="mt-5 rounded-[1.6rem] bg-primary/8 px-5 py-5 text-sm leading-7 text-primary">
                  {verificationNote}
                </div>
              ) : null}
            </EditorialPanel>
          </section>

          <section>
            <EditorialPanel className="p-8 md:p-10">
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
                    `/pro/register` е публична страница, но качването и проверката
                    изискват активна сесия като професионалист.
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
                <>
                  {error ? (
                    <div className="mb-6 rounded-[1.6rem] bg-rose-100/80 px-5 py-4 text-sm font-medium text-rose-700">
                      {error}
                    </div>
                  ) : null}

                  {success ? (
                    <div className="mb-6 rounded-[1.6rem] bg-primary/8 px-5 py-4 text-sm font-medium text-primary">
                      {success}
                    </div>
                  ) : null}

                  <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                          Име
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          className="w-full rounded-t-[1.25rem] border-b-4 border-primary/30 bg-surface-container-low px-5 py-4 text-on-surface focus:border-primary focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                          Телефон
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(event) => setPhone(event.target.value)}
                          className="w-full rounded-t-[1.25rem] border-b-4 border-primary/30 bg-surface-container-low px-5 py-4 text-on-surface focus:border-primary focus:outline-none"
                          placeholder="+359..."
                        />
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                          Локация
                        </label>
                        <input
                          type="text"
                          value={location}
                          onChange={(event) => setLocation(event.target.value)}
                          className="w-full rounded-t-[1.25rem] border-b-4 border-primary/30 bg-surface-container-low px-5 py-4 text-on-surface focus:border-primary focus:outline-none"
                          placeholder="София, Пловдив, дистанционно..."
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                          Опит (години)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="60"
                          value={experience}
                          onChange={(event) => setExperience(event.target.value)}
                          className="w-full rounded-t-[1.25rem] border-b-4 border-primary/30 bg-surface-container-low px-5 py-4 text-on-surface focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                        Умения
                      </label>
                      <input
                        type="text"
                        value={skillsInput}
                        onChange={(event) => setSkillsInput(event.target.value)}
                        className="w-full rounded-t-[1.25rem] border-b-4 border-primary/30 bg-surface-container-low px-5 py-4 text-on-surface focus:border-primary focus:outline-none"
                        placeholder="интериор, 3D, мебели по поръчка..."
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                        Представяне
                      </label>
                      <textarea
                        rows={4}
                        value={bio}
                        onChange={(event) => setBio(event.target.value)}
                        className="w-full resize-none rounded-t-[1.25rem] border-b-4 border-primary/30 bg-surface-container-low px-5 py-4 text-sm leading-7 text-on-surface focus:border-primary focus:outline-none"
                        placeholder="Разкажи накратко как работиш и какво те отличава."
                      />
                    </div>

                    <div className="space-y-3 rounded-[1.8rem] bg-surface-container-low px-5 py-5">
                      <div className="flex items-center justify-between gap-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                          01. Документ за верификация
                        </label>
                        <select
                          value={docType}
                          onChange={(event) =>
                            setDocType(event.target.value as "id_card" | "passport")
                          }
                          className="rounded-full bg-white px-3 py-2 text-xs font-bold text-on-surface outline-none"
                        >
                          <option value="id_card">Лична карта</option>
                          <option value="passport">Паспорт</option>
                        </select>
                      </div>

                      <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-dashed border-outline-variant/40 bg-white/70 px-6 py-8 text-center transition-colors hover:border-primary hover:bg-white">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="sr-only"
                          onChange={handleIdentityChange}
                        />
                        <span
                          aria-hidden="true"
                          className="material-symbols-outlined text-4xl text-primary"
                        >
                          badge
                        </span>
                        <div>
                          <p className="text-sm font-bold text-on-surface">
                            {identityFile ? identityFile.name : "Качи документ"}
                          </p>
                          <p className="mt-1 text-[11px] text-on-surface-variant">
                            PNG, JPG или WEBP до 10MB
                          </p>
                        </div>
                      </label>
                    </div>

                    <div className="space-y-3 rounded-[1.8rem] bg-surface-container-low px-5 py-5">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                        02. Портфолио изображения
                      </label>
                      <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-dashed border-outline-variant/40 bg-white/70 px-6 py-8 text-center transition-colors hover:border-primary hover:bg-white">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          multiple
                          className="sr-only"
                          onChange={handlePortfolioChange}
                        />
                        <span
                          aria-hidden="true"
                          className="material-symbols-outlined text-4xl text-primary"
                        >
                          gallery_thumbnail
                        </span>
                        <div>
                          <p className="text-sm font-bold text-on-surface">
                            {portfolioFiles.length > 0
                              ? `${portfolioFiles.length} файла избрани`
                              : "Качи до 4 изображения"}
                          </p>
                          <p className="mt-1 text-[11px] text-on-surface-variant">
                            Публични изображения за портфолиото ти
                          </p>
                        </div>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={!canSubmit || isSubmitting}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-container py-5 text-sm font-bold uppercase tracking-[0.18em] text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-xl"
                      >
                        verified_user
                      </span>
                      {isSubmitting
                        ? "Завършваме проверката..."
                        : "Изпрати за проверка"}
                    </button>
                  </form>
                </>
              )}
            </EditorialPanel>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
