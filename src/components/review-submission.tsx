"use client";

import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { SectionEyebrow } from "@/components/editorial-primitives";
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

      <main className="flex-1 px-6 pb-20 pt-28 md:pt-36">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <SectionEyebrow className="mb-5">Завършен проект</SectionEyebrow>
            <h1 className="text-[2.7rem] font-extrabold leading-[1.05] tracking-[-0.06em] text-on-surface md:text-[4.2rem]">
              Вашето мнение е ценно.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-on-surface-variant md:text-lg">
              Споделената оценка с професионалиста и писмените впечатления помагат на следващите клиенти да вземат по-уверено решение.
            </p>
          </div>

          {error ? (
            <div className="mx-auto mt-8 max-w-3xl rounded-[1.6rem] bg-rose-100/80 px-5 py-4 text-sm font-medium text-rose-700" role="alert" aria-live="polite">
              {error}
            </div>
          ) : null}

          {!project ? (
            <div className="mx-auto mt-10 max-w-3xl rounded-[2rem] bg-white/82 px-8 py-10 text-center shadow-[0_30px_90px_rgba(77,66,96,0.08)] backdrop-blur-xl">
              <p className="text-sm leading-7 text-on-surface-variant">
                Не открихме проект, за който да оставиш ревю.
              </p>
            </div>
          ) : submittedReview ? (
            <div className="mx-auto mt-10 max-w-3xl rounded-[2.2rem] bg-white/84 px-8 py-10 text-center shadow-[0_32px_90px_rgba(77,66,96,0.08)] backdrop-blur-xl" role="status" aria-live="polite">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check
                </span>
              </div>
              <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-on-surface">
                Ревюто е публикувано.
              </h2>
              <p className="mt-4 text-sm leading-7 text-on-surface-variant">
                Благодарим за обратната връзка за {project.professional.name}. Тя вече е част от профила и ще помага на следващите клиенти.
              </p>
              <div className="mt-8 rounded-[1.8rem] bg-surface-container-low px-6 py-6 text-left">
                <p className="text-sm font-semibold text-on-surface">Оценка: {submittedReview.rating} / 5</p>
                <p className="mt-3 text-sm leading-7 text-on-surface-variant">{submittedReview.comment}</p>
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant/60">
                  Публикувано на {formatLongDate(submittedReview.createdAt)}
                </p>
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link href="/dashboard" className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-4 text-sm font-black text-on-primary shadow-[0_18px_34px_rgba(85,62,96,0.2)] transition-opacity hover:opacity-95">
                  Към таблото
                </Link>
                <Link href={`/project/${project.id}`} className="inline-flex items-center justify-center rounded-full bg-surface-container-low px-6 py-4 text-sm font-bold text-on-surface transition-colors hover:bg-white">
                  Отвори проекта
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mx-auto mt-10 max-w-3xl space-y-8">
              <div className="rounded-[1.9rem] bg-white/80 px-5 py-4 shadow-[0_18px_50px_rgba(77,66,96,0.06)] backdrop-blur-xl">
                <div className="flex items-center gap-4">
                  {project.professional.avatarUrl ? (
                    <Image
                      src={project.professional.avatarUrl}
                      alt={project.professional.name}
                      width={52}
                      height={52}
                      sizes="52px"
                      className="h-13 w-13 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-13 w-13 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <span aria-hidden="true" className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                        verified
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-on-surface">{project.professional.name}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant/70">
                      {project.request.title}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[2.2rem] bg-white/88 px-6 py-8 text-center shadow-[0_32px_90px_rgba(77,66,96,0.08)] backdrop-blur-xl md:px-8">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                  Как оценявате работата?
                </p>
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
                <p className="mt-3 text-sm font-semibold text-on-surface-variant">
                  {ratingLabel[activeRating] ?? ""}
                </p>
              </div>

              <div className="rounded-[2.2rem] bg-white/88 px-6 py-8 shadow-[0_32px_90px_rgba(77,66,96,0.08)] backdrop-blur-xl md:px-8">
                <div className="flex items-center justify-between gap-4">
                  <label htmlFor="review-comment" className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                    Вашият коментар
                  </label>
                  <span className="text-xs text-on-surface-variant/60">Минимум 20 символа</span>
                </div>
                <textarea
                  id="review-comment"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Споделете как мина процесът, комуникацията и крайният резултат."
                  className="mt-4 min-h-[220px] w-full rounded-[1.8rem] border-none bg-surface-container-low px-6 py-6 text-base leading-8 text-on-surface shadow-[inset_0_-1px_0_rgba(124,117,125,0.22)] outline-none transition-[background-color,box-shadow] duration-200 placeholder:text-on-surface-variant/45 focus:bg-white focus:shadow-[inset_0_-2px_0_var(--color-primary),0_18px_36px_rgba(77,66,96,0.08)]"
                />
              </div>

              <div className="flex items-center justify-between gap-4 px-1">
                <label htmlFor="review-photos" className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                  Снимки на проекта
                </label>
                <span className="text-xs text-on-surface-variant/60">До 5 изображения • {formatBytes(MAX_IMAGE_UPLOAD_BYTES)}</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label htmlFor="review-photos" className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-[1.9rem] bg-white/84 px-5 py-5 text-center shadow-[0_18px_50px_rgba(77,66,96,0.06)] backdrop-blur-xl transition-opacity hover:opacity-95">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <span aria-hidden="true" className="material-symbols-outlined">add_a_photo</span>
                  </span>
                  <p className="mt-4 text-sm font-semibold text-on-surface">Качете снимка</p>
                </label>

                {uploads.slice(0, 2).map((item) => (
                  <div key={item.id} className="relative overflow-hidden rounded-[1.9rem] bg-white/84 shadow-[0_18px_50px_rgba(77,66,96,0.06)] backdrop-blur-xl">
                    <Image src={item.previewUrl} alt={item.file.name} width={480} height={480} className="aspect-square w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeUpload(item.id)}
                      className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/92 text-on-surface shadow-[0_12px_24px_rgba(77,66,96,0.08)]"
                      aria-label={`Премахни ${item.file.name}`}
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                ))}
              </div>
              <input id="review-photos" type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />

              {uploads.length > 2 ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  {uploads.slice(2).map((item) => (
                    <div key={item.id} className="relative overflow-hidden rounded-[1.9rem] bg-white/84 shadow-[0_18px_50px_rgba(77,66,96,0.06)] backdrop-blur-xl">
                      <Image src={item.previewUrl} alt={item.file.name} width={480} height={360} className="aspect-[4/3] w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeUpload(item.id)}
                        className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/92 text-on-surface shadow-[0_12px_24px_rgba(77,66,96,0.08)]"
                        aria-label={`Премахни ${item.file.name}`}
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-4 px-1 text-xs text-on-surface-variant/70">
                <span>Или сигнализирайте</span>
                <a href="mailto:support@atelier.bg" className="font-semibold text-primary transition-opacity hover:opacity-80">
                  support@atelier.bg
                </a>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-black text-on-primary shadow-[0_18px_34px_rgba(85,62,96,0.2)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Изпращаме ревюто..." : "Изпрати ревюто"}
                  <span aria-hidden="true" className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
