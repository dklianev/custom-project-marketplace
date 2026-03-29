"use client";

import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { EditorialPanel, SectionEyebrow } from "@/components/editorial-primitives";
import { Navbar } from "@/components/navbar";
import { MAX_IMAGE_UPLOAD_BYTES, formatBytes, STORAGE_BUCKETS } from "@/lib/storage";
import { uploadFileWithPresign } from "@/lib/uploads/client";

export type ReviewProject = {
  id: string;
  title: string;
  status: "CREATED" | "REVIEW" | "DESIGN" | "APPROVAL" | "FINALIZATION" | "COMPLETED" | "CANCELLED";
  updatedAt: string;
  clientId: string;
  professionalId: string;
  request: {
    title: string;
    description: string;
    location: string | null;
    budget: string | null;
    timeline: string | null;
  };
  professional: {
    id: string;
    name: string;
    avatarUrl: string | null;
    location: string | null;
    verified: boolean;
    rating: number;
    reviewCount: number;
  };
  review: {
    id: string;
    rating: number;
    comment: string;
    createdAt: string;
  } | null;
};

type ErrorResponse = { error?: string };

type UploadPreview = {
  id: string;
  file: File;
  previewUrl: string;
};

type ReviewSubmissionProps = {
  projectId: string;
  initialProject: ReviewProject | null;
  initialError?: string | null;
};

async function readJson<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return (await response.json()) as T;
}

async function readErrorMessage(response: Response, fallback: string) {
  const payload = await readJson<ErrorResponse>(response);
  return payload?.error ?? fallback;
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function StarButton({
  value,
  active,
  onSelect,
  onHover,
}: {
  value: number;
  active: boolean;
  onSelect: (value: number) => void;
  onHover: (value: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      onMouseEnter={() => onHover(value)}
      className="rounded-full p-2 transition-transform hover:scale-105"
      aria-label={`Оценка от ${value} звезди`}
    >
      <span
        aria-hidden="true"
        className="material-symbols-outlined text-[2.8rem]"
        style={{
          fontVariationSettings: "'FILL' 1",
          color: active ? "var(--color-primary)" : "color-mix(in srgb, var(--color-primary) 16%, transparent)",
        }}
      >
        star
      </span>
    </button>
  );
}

export function ReviewSubmission({
  projectId,
  initialProject,
  initialError = null,
}: ReviewSubmissionProps) {
  const [project] = useState<ReviewProject | null>(initialProject);
  const [error, setError] = useState<string | null>(initialError);
  const [rating, setRating] = useState(initialProject?.review?.rating ?? 5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState(initialProject?.review?.comment ?? "");
  const [uploads, setUploads] = useState<UploadPreview[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReview, setSubmittedReview] = useState<ReviewProject["review"]>(initialProject?.review ?? null);
  const uploadsRef = useRef<UploadPreview[]>([]);

  useEffect(() => {
    uploadsRef.current = uploads;
  }, [uploads]);

  useEffect(() => {
    return () => {
      uploadsRef.current.forEach((item) => {
        URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  const activeRating = hoveredRating || rating;
  const ratingLabel = ["", "Слабо", "Има какво да се подобри", "Добро", "Много добро", "Отлично"];

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) {
      return;
    }

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length !== files.length) {
      setError("Можеш да качваш само изображения към ревюто.");
      return;
    }

    const oversize = imageFiles.find((file) => file.size > MAX_IMAGE_UPLOAD_BYTES);
    if (oversize) {
      setError(`Файлът ${oversize.name} е твърде голям. Лимитът е ${formatBytes(MAX_IMAGE_UPLOAD_BYTES)}.`);
      return;
    }

    const nextUploads = imageFiles.slice(0, Math.max(0, 5 - uploads.length)).map((file) => ({
      id: `${file.name}-${file.lastModified}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setUploads((current) => [...current, ...nextUploads].slice(0, 5));
    setError(null);
    event.target.value = "";
  };

  const removeUpload = (id: string) => {
    setUploads((current) => {
      const target = current.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((item) => item.id !== id);
    });
  };

  const uploadImages = async () => {
    if (!uploads.length) {
      return [] as string[];
    }

    const results = await Promise.all(
      uploads.map(async (item) => {
        const result = await uploadFileWithPresign(
          STORAGE_BUCKETS.reviews,
          item.file,
          { fileName: `${projectId}-${item.file.name}` },
        );
        if (!result.publicUrl) {
          throw new Error("Не успяхме да качим една от снимките към ревюто.");
        }

        return result.publicUrl;
      }),
    );

    return results;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!project) {
      return;
    }

    if (comment.trim().length < 20) {
      setError("Напиши поне 20 символа, за да публикуваш полезно ревю.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const imageUrls = await uploadImages();
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          rating,
          comment: comment.trim(),
          images: imageUrls,
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Не успяхме да публикуваме ревюто."));
      }

      const payload = await readJson<{ review?: ReviewProject["review"] }>(response);
      setSubmittedReview(
        payload?.review ?? {
          id: `local-${projectId}`,
          rating,
          comment: comment.trim(),
          createdAt: new Date().toISOString(),
        },
      );
      setUploads((current) => {
        current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
        return [];
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не успяхме да публикуваме ревюто.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <Navbar />

      <main className="flex-1 px-6 pb-20 pt-34 md:pt-40">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <EditorialPanel className="p-6 md:p-8">
              <SectionEyebrow className="mb-4">След финала</SectionEyebrow>
              <h1 className="text-[2.4rem] font-extrabold leading-[1.02] tracking-[-0.06em] md:text-[4.2rem]">
                Остави спокойно и полезно ревю за работата по проекта.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-on-surface-variant md:text-lg">
                Ревюто е част от доверието в Atelier. То помага на следващите клиенти,
                а на професионалиста да покаже как протича реалната работа по проекта.
              </p>
            </EditorialPanel>

            <EditorialPanel className="p-6 md:p-8">
              <SectionEyebrow className="mb-4">Защо е важно</SectionEyebrow>
              <div className="space-y-4 rounded-[1.8rem] bg-surface-container-low px-5 py-5 text-sm leading-7 text-on-surface-variant">
                <p>
                  Ако проектът е приключил успешно, краткото ревю прави профила по-надежден.
                  Ако е имало проблем, опиши го ясно - така екипът ни ще има по-добър контекст.
                </p>
                <a
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 font-semibold text-on-surface shadow-[0_12px_24px_rgba(77,66,96,0.06)]"
                  href="mailto:support@atelier.bg"
                >
                  Свържи се с екипа
                  <span aria-hidden="true" className="material-symbols-outlined text-lg">north_east</span>
                </a>
              </div>
            </EditorialPanel>
          </div>

          {error ? (
            <EditorialPanel className="p-5 text-sm text-error" role="alert" aria-live="polite">
              {error}
            </EditorialPanel>
          ) : null}

          {!project ? (
            <EditorialPanel className="p-8 text-center text-sm text-on-surface-variant">
              Не открихме проект, за който да оставиш ревю.
            </EditorialPanel>
          ) : submittedReview ? (
            <EditorialPanel className="p-8 md:p-10" role="status" aria-live="polite">
              <SectionEyebrow className="mb-4">Ревюто е публикувано</SectionEyebrow>
              <h2 className="text-4xl font-extrabold tracking-[-0.05em] text-on-surface">Благодарим за обратната връзка.</h2>
              <p className="mt-4 max-w-3xl text-base leading-8 text-on-surface-variant">
                Ревюто за {project.professional.name} по проекта „{project.title}“ вече е част от профила и ще помага на следващите клиенти да вземат решение.
              </p>
              <div className="mt-8 rounded-[2rem] bg-surface-container-low px-6 py-6">
                <p className="text-sm font-semibold text-on-surface">Оценка: {submittedReview.rating} / 5</p>
                <p className="mt-3 text-sm leading-7 text-on-surface-variant">{submittedReview.comment}</p>
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant/60">
                  Публикувано на {formatLongDate(submittedReview.createdAt)}
                </p>
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/dashboard" className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-4 text-sm font-black text-on-primary shadow-[0_18px_34px_rgba(85,62,96,0.2)] transition-opacity hover:opacity-95">
                  Към таблото
                </Link>
                <Link href={`/project/${project.id}`} className="inline-flex items-center justify-center rounded-full bg-surface-container-low px-6 py-4 text-sm font-bold text-on-surface transition-colors hover:bg-white">
                  Отвори проекта
                </Link>
              </div>
            </EditorialPanel>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <EditorialPanel className="p-6 md:p-8">
                <SectionEyebrow className="mb-4">Контекст на проекта</SectionEyebrow>
                <div className="space-y-5">
                  <div className="rounded-[1.9rem] bg-surface-container-low px-5 py-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary/70">Приключил проект</p>
                    <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.05em] text-on-surface">{project.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-on-surface-variant">{project.request.description}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      project.request.location ?? "Локация по заявката",
                      project.request.budget ?? "Бюджет по уговорка",
                      formatLongDate(project.updatedAt),
                    ].map((item, index) => (
                      <div key={`${item}-${index}`} className="rounded-[1.5rem] bg-surface-container-low px-4 py-4 text-sm leading-7 text-on-surface-variant">
                        {item}
                      </div>
                    ))}
                  </div>

                  <div className="rounded-[2rem] bg-[linear-gradient(180deg,rgba(110,86,120,0.13),rgba(110,86,120,0.05))] px-5 py-5">
                    <div className="flex items-center gap-4">
                      {project.professional.avatarUrl ? (
                        <Image
                          src={project.professional.avatarUrl}
                          alt={project.professional.name}
                          width={72}
                          height={72}
                          sizes="72px"
                          className="h-18 w-18 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-18 w-18 items-center justify-center rounded-full bg-white text-primary shadow-[0_14px_24px_rgba(77,66,96,0.08)]">
                          <span aria-hidden="true" className="material-symbols-outlined text-[30px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            verified
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">Професионалист</p>
                        <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-on-surface">{project.professional.name}</h3>
                        <p className="mt-2 text-sm leading-7 text-on-surface-variant">
                          {project.professional.location ?? "Локация по заявката"}
                          {project.professional.verified ? " • проверен профил" : ""}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-on-surface-variant">
                          {project.professional.rating.toFixed(1)} рейтинг • {project.professional.reviewCount} ревюта
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </EditorialPanel>

              <EditorialPanel className="p-6 md:p-8">
                <SectionEyebrow className="mb-4">Твоето ревю</SectionEyebrow>
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="rounded-[1.9rem] bg-surface-container-low px-5 py-6 text-center">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">Оценка</p>
                    <div className="mt-5 flex items-center justify-center gap-1" onMouseLeave={() => setHoveredRating(0)}>
                      {[1, 2, 3, 4, 5].map((value) => (
                        <StarButton
                          key={value}
                          value={value}
                          active={activeRating >= value}
                          onSelect={setRating}
                          onHover={setHoveredRating}
                        />
                      ))}
                    </div>
                    <p className="mt-3 text-sm font-semibold text-on-surface-variant">{ratingLabel[activeRating] ?? ""}</p>
                  </div>

                  <div className="space-y-3">
                    <label htmlFor="review-comment" className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                      Как мина работата
                    </label>
                    <textarea
                      id="review-comment"
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      placeholder="Опиши комуникацията, качеството и какво би било полезно за следващ клиент да знае."
                      className="min-h-[240px] w-full rounded-[2rem] border-none bg-surface-container-low px-6 py-6 text-base leading-8 text-on-surface shadow-[inset_0_-1px_0_rgba(124,117,125,0.22)] outline-none transition-[background-color,box-shadow] duration-200 placeholder:text-on-surface-variant/45 focus:bg-white focus:shadow-[inset_0_-2px_0_var(--color-primary),0_18px_36px_rgba(77,66,96,0.08)]"
                    />
                    <p className="text-xs text-on-surface-variant/70">Минимум 20 символа. Ясното ревю помага повече от общата похвала.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <label htmlFor="review-photos" className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                        Снимки от резултата
                      </label>
                      <span className="text-xs text-on-surface-variant/70">До 5 изображения • {formatBytes(MAX_IMAGE_UPLOAD_BYTES)} максимум</span>
                    </div>
                    <label htmlFor="review-photos" className="flex min-h-[140px] cursor-pointer items-center justify-center rounded-[2rem] border border-dashed border-outline/30 bg-surface-container-low px-6 py-8 text-center transition-[background-color,border-color] duration-200 hover:border-primary/35 hover:bg-white">
                      <div className="space-y-3">
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-primary shadow-[0_12px_24px_rgba(77,66,96,0.08)]">
                          <span aria-hidden="true" className="material-symbols-outlined">add_a_photo</span>
                        </span>
                        <p className="text-sm font-semibold text-on-surface">Качи снимки на финалния резултат</p>
                        <p className="text-sm leading-7 text-on-surface-variant">Използвай ги, ако искаш бъдещите клиенти да видят как се е развил проектът.</p>
                      </div>
                    </label>
                    <input id="review-photos" type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />

                    {uploads.length > 0 && (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {uploads.map((item) => (
                          <div key={item.id} className="relative overflow-hidden rounded-[1.8rem] bg-surface-container-low">
                            <Image src={item.previewUrl} alt={item.file.name} width={480} height={360} className="aspect-[4/3] w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeUpload(item.id)}
                              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-on-surface shadow-[0_12px_24px_rgba(77,66,96,0.08)]"
                              aria-label={`Премахни ${item.file.name}`}
                            >
                              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-[1.8rem] bg-surface-container-low px-5 py-5 text-sm leading-7 text-on-surface-variant">
                    Ревюто е публично. Ако има по-сериозен проблем, можеш да го опишеш ясно и да се свържеш с екипа ни отделно.
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-sm font-black text-on-primary shadow-[0_18px_34px_rgba(85,62,96,0.2)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSubmitting ? "Публикуваме ревюто..." : "Публикувай ревю"}
                      <span aria-hidden="true" className="material-symbols-outlined text-lg">arrow_forward</span>
                    </button>
                    <Link href={`/project/${project.id}`} className="inline-flex items-center justify-center rounded-full bg-surface-container-low px-6 py-4 text-sm font-bold text-on-surface transition-colors hover:bg-white">
                      Назад към проекта
                    </Link>
                  </div>
                </form>
              </EditorialPanel>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
