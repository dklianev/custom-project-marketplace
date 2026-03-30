"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { useProjectRealtime } from "@/hooks/use-project-realtime";
import type { ChatMessage } from "@/stores/chat-store";

const projectSteps = [
  { key: "created", label: "Старт", done: true },
  { key: "review", label: "Преглед", done: true },
  { key: "design", label: "Дизайн", done: false, active: true },
  { key: "approval", label: "Одобрение", done: false },
  { key: "final", label: "Финал", done: false },
];

const fallbackMilestones = [
  { label: "Начален бриф и среща", done: true },
  { label: "UX структура", done: true },
  { label: "UI дизайн v1", done: false },
  { label: "Финален прототип", done: false },
];

const fallbackMessages: ChatMessage[] = [
  {
    id: "fallback-pro-1",
    senderId: "professional-demo",
    text: "Подготвих обновените екрани за проекта. Моля, вижте новата навигация и общия тон на интерфейса.",
    createdAt: "2026-03-26T14:30:00.000Z",
    read: true,
    sender: {
      id: "professional-demo",
      name: "Вие",
      avatarUrl: null,
    },
  },
  {
    id: "fallback-client-1",
    senderId: "client-demo",
    text: "Благодаря! Посоката е правилна. Харесва ми, че интерфейсът е много по-спокоен и премиум.",
    createdAt: "2026-03-26T11:15:00.000Z",
    read: true,
    sender: {
      id: "client-demo",
      name: "Клиент",
      avatarUrl: null,
    },
  },
];

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString("bg-BG", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [message, setMessage] = useState("");
  const {
    project,
    messages,
    currentUser,
    sending,
    error,
    isRealtimeActive,
    typingUserIds,
    onlineUserIds,
    sendMessage,
    announceTyping,
  } = useProjectRealtime(id);
  const visibleMessages = messages.length > 0 ? messages : fallbackMessages;
  const visibleMilestones =
    project?.milestones.length && project.milestones.length > 0
      ? project.milestones.map((milestone) => ({
          label: milestone.title,
          done: milestone.completed,
        }))
      : fallbackMilestones;
  const clientName = project?.client.name ?? "FinFlow Technologies";
  const clientId = project?.clientId ?? "client-demo";
  const currentUserId = currentUser?.id ?? project?.professionalId ?? "professional-demo";
  const isClientOnline = onlineUserIds.includes(clientId);
  const isClientTyping = typingUserIds.includes(clientId);
  const paymentAmount = project?.payment?.amount ?? 4500;
  const paymentCurrency = project?.payment?.currency ?? "EUR";
  const paidAmount = project?.payment?.paidAmount ?? paymentAmount / 2;
  const remainingAmount = project?.payment?.remainingAmount ?? paymentAmount - paidAmount;
  const files = useMemo(() => {
    if (project?.attachments?.length) {
      return project.attachments;
    }

    return [
      { id: "fallback-1", fileName: "brand_guidelines_v1.pdf", fileUrl: "#", fileType: "pdf" },
      { id: "fallback-2", fileName: "dashboard_v2.fig", fileUrl: "#", fileType: "fig" },
    ];
  }, [project]);

  async function handleSendMessage() {
    const wasSent = await sendMessage(message);
    if (wasSent) {
      setMessage("");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <Navbar />

      <main className="flex-1 px-6 pb-20 pt-28 md:pt-36">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex items-start justify-between gap-5">
            <div>
              <Section className="mb-4">Проектът е активен</Section>
              <h1 className="max-w-3xl text-[2.5rem] font-extrabold leading-[1.05] tracking-[-0.06em] text-primary md:text-[4rem]">
                {project?.title ?? "UI/UX редизайн на FinTech платформа"}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-on-surface-variant">
                {project?.request.description ?? "Цялостен редизайн на потребителското изживяване и визуалната система за мобилно приложение, ориентирано към premium B2B услугата."}
              </p>
            </div>
            <Link
              href="/pro/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-black text-on-primary shadow-[0_18px_34px_rgba(85,62,96,0.18)]"
            >
              Преглед на проекта
              <span aria-hidden="true" className="material-symbols-outlined text-lg">arrow_forward</span>
            </Link>
          </div>

          <div className="rounded-[2rem] bg-white/84 px-6 py-6 shadow-[0_24px_70px_rgba(77,66,96,0.08)] backdrop-blur-xl">
            <p className="mb-5 text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
              Хронология на статуса
            </p>
            <div className="flex items-center gap-2 overflow-x-auto">
              {projectSteps.map((step, index) => (
                <div key={step.key} className="flex flex-1 items-center gap-2">
                  <div className="flex flex-col items-center gap-2">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-black ${step.done ? "bg-primary text-on-primary" : step.active ? "border border-primary bg-white text-primary" : "bg-surface-container-low text-on-surface-variant"}`}>
                      {index + 1}
                    </span>
                    <span className="whitespace-nowrap text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                      {step.label}
                    </span>
                  </div>
                  {index < projectSteps.length - 1 ? <span className="h-px flex-1 bg-outline-variant/30" /> : null}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <section className="space-y-5">
              <div className="rounded-[2rem] bg-white/84 px-6 py-6 shadow-[0_24px_70px_rgba(77,66,96,0.08)] backdrop-blur-xl">
                <div className="space-y-4 text-sm leading-7 text-on-surface-variant">
                  <p>
                    Завършеният проект вече е в етап „{project?.status ?? "DESIGN"}“. Това е моментът за ясни коментари, спокоен статус и прецизно довършване на deliverables.
                  </p>
                  <div className="rounded-[1.6rem] bg-surface-container-low px-5 py-5 text-on-surface">
                    <p className="text-sm leading-7">
                      {project?.offer?.quote ?? "Фокусът остава върху премиум усещането, плавната навигация и сигурната комуникация през защитения чат."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] bg-white/84 shadow-[0_24px_70px_rgba(77,66,96,0.08)] backdrop-blur-xl">
                <div className="border-b border-outline-variant/20 px-6 py-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-on-surface">{clientName}</p>
                      <p className="text-xs text-on-surface-variant">
                        {isClientTyping
                          ? "Пише..."
                          : isClientOnline
                            ? "Онлайн"
                            : isRealtimeActive
                              ? "Извън линия"
                              : "Чатът е активен"}
                      </p>
                    </div>
                    <span className="text-xs text-on-surface-variant/60">Проект #{id.slice(-6).toUpperCase()}</span>
                  </div>
                </div>

                <div className="min-h-[360px] space-y-4 px-6 py-6">
                  {error ? (
                    <div className="rounded-[1.6rem] bg-rose-100/80 px-5 py-4 text-sm font-medium text-rose-700">
                      {error}
                    </div>
                  ) : (
                    visibleMessages.map((item) => {
                      const isOwn = item.senderId === currentUserId;
                      return (
                        <div key={item.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[34rem] rounded-[1.8rem] px-5 py-4 text-sm leading-7 shadow-[0_18px_40px_rgba(77,66,96,0.06)] ${isOwn ? "rounded-tr-[0.7rem] bg-primary text-on-primary" : "rounded-tl-[0.7rem] bg-surface-container-low text-on-surface"}`}>
                            <p>{item.text}</p>
                            <p className={`mt-3 text-[11px] ${isOwn ? "text-on-primary/70" : "text-on-surface-variant/60"}`}>
                              {formatMessageTime(item.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="px-6 pb-6">
                  <div className="flex items-center gap-3 rounded-full bg-surface-container-low px-5 py-3 shadow-[inset_0_-1px_0_rgba(124,117,125,0.18)]">
                    <input
                      type="text"
                      value={message}
                      onChange={(event) => {
                        setMessage(event.target.value);
                        void announceTyping(Boolean(event.target.value.trim()));
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void handleSendMessage();
                        }
                      }}
                      placeholder="Напишете съобщение..."
                      className="w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50"
                    />
                    <button
                      type="button"
                      onClick={() => void handleSendMessage()}
                      disabled={!message.trim() || sending}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined">arrow_upward</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <aside className="space-y-5 lg:sticky lg:top-32">
              <div className="rounded-[2rem] bg-primary px-6 py-6 text-on-primary shadow-[0_28px_80px_rgba(85,62,96,0.18)]">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-primary/70">Клиент</p>
                <h2 className="mt-3 text-xl font-extrabold tracking-tight">{clientName}</h2>
                <p className="mt-3 text-sm leading-7 text-on-primary/85">
                  {project?.request.location ?? "София, България"}
                </p>
                <p className="mt-2 text-sm leading-7 text-on-primary/85">
                  {project?.request.budget ?? "Междинен бюджет"}
                </p>
              </div>

              <div className="rounded-[2rem] bg-white/84 px-6 py-6 shadow-[0_24px_70px_rgba(77,66,96,0.08)] backdrop-blur-xl">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">Плащане</p>
                  <span className="rounded-full bg-green-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-green-700">
                    Защитено плащане
                  </span>
                </div>
                <div className="mt-5 space-y-3 text-sm text-on-surface-variant">
                  <div className="flex items-center justify-between">
                    <span>Общо</span>
                    <span className="font-semibold text-on-surface">{formatCurrency(paymentAmount, paymentCurrency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Платено</span>
                    <span className="font-semibold text-on-surface">{formatCurrency(paidAmount, paymentCurrency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Остатък</span>
                    <span className="font-semibold text-on-surface">{formatCurrency(remainingAmount, paymentCurrency)}</span>
                  </div>
                </div>
                <Link href={project?.payment ? `/api/payments/${project.payment.id}/receipt` : "#"} className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-primary/25 px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5">
                  Виж фактура
                </Link>
              </div>

              <div className="rounded-[2rem] bg-white/84 px-6 py-6 shadow-[0_24px_70px_rgba(77,66,96,0.08)] backdrop-blur-xl">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">Етапи на работа</p>
                <div className="mt-5 space-y-3">
                  {visibleMilestones.map((milestone) => (
                    <div key={milestone.label} className="flex items-center gap-3 rounded-[1.4rem] bg-surface-container-low px-4 py-4">
                      <span aria-hidden="true" className={`material-symbols-outlined ${milestone.done ? "text-primary" : "text-on-surface-variant/35"}`} style={milestone.done ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                        {milestone.done ? "check_circle" : "radio_button_unchecked"}
                      </span>
                      <span className={`text-sm ${milestone.done ? "font-semibold text-on-surface" : "text-on-surface-variant"}`}>
                        {milestone.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] bg-white/84 px-6 py-6 shadow-[0_24px_70px_rgba(77,66,96,0.08)] backdrop-blur-xl">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">Файлове</p>
                <div className="mt-4 space-y-3">
                  {files.map((file) => (
                    <a key={file.id} href={file.fileUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-[1.4rem] bg-surface-container-low px-4 py-4 text-sm transition-colors hover:bg-white">
                      <span className="font-medium text-on-surface">{file.fileName}</span>
                      <span className="text-on-surface-variant">{file.fileType ?? "файл"}</span>
                    </a>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function Section({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-primary/80 ${className ?? ""}`}>
      {children}
    </span>
  );
}
