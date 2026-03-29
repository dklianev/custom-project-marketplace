"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useProjectRealtime } from "@/hooks/use-project-realtime";
import type { ChatMessage } from "@/stores/chat-store";

const projectSteps = [
  { key: "created", label: "Създаден", done: true },
  { key: "review", label: "Преглед", done: true },
  { key: "design", label: "Дизайн", done: false, active: true },
  { key: "approval", label: "Одобрение", done: false },
  { key: "final", label: "Финализиране", done: false },
];

const fallbackMilestones = [
  { label: "Първоначална среща и бриф", done: true },
  { label: "Wireframes и структура", done: true },
  { label: "Визуален дизайн — v1", done: false },
  { label: "Финален прототип и предаване", done: false },
];

const fallbackMessages: ChatMessage[] = [
  {
    id: "fallback-pro-1",
    senderId: "professional-demo",
    text: "Качих втора итерация на дизайна. Моля, прегледайте секция Дашборд и навигация.",
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
    text: "Благодаря! Навигацията изглежда отлично. Имаме малки забележки по цветовата палитра — ще ги изпратя до края на деня.",
    createdAt: "2026-03-26T11:15:00.000Z",
    read: true,
    sender: {
      id: "client-demo",
      name: "TechVision ЕООД",
      avatarUrl: null,
    },
  },
  {
    id: "fallback-pro-2",
    senderId: "professional-demo",
    text: "Първият вариант на дизайна е готов. Прикачих файловете в секцията по-долу.",
    createdAt: "2026-03-25T16:45:00.000Z",
    read: true,
    sender: {
      id: "professional-demo",
      name: "Вие",
      avatarUrl: null,
    },
  },
];

const attachments = [
  { name: "Dashboard_v2.fig", size: "4.2 MB", icon: "design_services" },
  { name: "Styleguide.pdf", size: "1.8 MB", icon: "picture_as_pdf" },
  { name: "Navigation_Flow.png", size: "820 KB", icon: "image" },
];

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString("bg-BG", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getReadReceiptLabel(read: boolean) {
  return read ? "Прочетено" : "Изпратено";
}

function getReadReceiptIcon(read: boolean) {
  return read ? "done_all" : "done";
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
  const clientName = project?.client.name ?? "TechVision ЕООД";
  const clientId = project?.clientId ?? "client-demo";
  const currentUserId =
    currentUser?.id ?? project?.professionalId ?? "professional-demo";
  const isClientOnline = onlineUserIds.includes(clientId);
  const isClientTyping = typingUserIds.includes(clientId);
  const paymentAmount = project?.payment?.amount ?? 4500;
  const paymentCurrency = project?.payment?.currency ?? "EUR";
  const paidAmount = project?.payment?.paidAmount ?? paymentAmount / 2;
  const remainingAmount =
    project?.payment?.remainingAmount ?? paymentAmount - paidAmount;

  async function handleSendMessage() {
    const wasSent = await sendMessage(message);
    if (wasSent) {
      setMessage("");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Navbar />

      <main className="flex-1 pt-32 pb-20">
        <div className="mx-auto max-w-5xl px-6">
          {/* Back link */}
          <Link
            href="/pro/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-on-surface-variant transition-colors hover:text-primary mb-8"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 0" }}>
              arrow_back
            </span>
            Обратно към таблото
          </Link>

          {/* Page heading */}
          <div className="mb-8">
            <span className="inline-block rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold text-on-secondary-container mb-3">
              Проект #{id}
            </span>
            <h1 className="text-3xl font-bold text-on-surface">
              {project?.title ?? "UI/UX Редизайн на FinTech Платформа"}
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              {isClientTyping
                ? `Текущ проект • ${clientName} • Пише...`
                : isClientOnline
                  ? `Текущ проект • ${clientName} • Онлайн`
                  : isRealtimeActive
                    ? `Текущ проект • ${clientName} • Извън линия`
                    : `Текущ проект • ${clientName}`}
            </p>
          </div>

          {/* Progress stepper */}
          <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/30 p-6 mb-8">
            <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
              Прогрес на проекта
            </p>
            <div className="flex items-center">
              {projectSteps.map((step, i) => {
                const isLast = i === projectSteps.length - 1;
                return (
                  <div key={step.key} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center gap-2">
                      {/* Step circle */}
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-[background-color,color,box-shadow] duration-200 ${
                          step.done
                            ? "bg-primary text-on-primary"
                            : step.active
                              ? "bg-primary/15 text-primary ring-2 ring-primary/40"
                              : "bg-surface-container-high text-on-surface-variant/40"
                        }`}
                      >
                        {step.done ? (
                          <span aria-hidden="true"
                            className="material-symbols-outlined text-base"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            check
                          </span>
                        ) : (
                          i + 1
                        )}
                      </div>
                      {/* Step label */}
                      <span
                        className={`hidden text-center text-[10px] font-medium sm:block ${
                          step.done || step.active
                            ? "text-on-surface"
                            : "text-on-surface-variant/40"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {/* Connector line */}
                    {!isLast && (
                      <div
                        className={`mx-1 h-0.5 flex-1 rounded-full transition-[background-color,width] duration-200 ${
                          step.done ? "bg-primary" : "bg-surface-container-high"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Two-column layout */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main column */}
            <div className="space-y-6 lg:col-span-2">
              {/* Milestones */}
              <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/30 p-6">
                <h2 className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                  <span aria-hidden="true"
                    className="material-symbols-outlined text-base"
                    style={{ fontVariationSettings: "'FILL' 0" }}
                  >
                    checklist
                  </span>
                  Етапи на работа
                </h2>
                <div className="space-y-2">
                  {visibleMilestones.map((m, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
                        m.done
                          ? "bg-primary/8"
                          : "bg-surface-container"
                      }`}
                    >
                      <span aria-hidden="true"
                        className={`material-symbols-outlined text-xl shrink-0 ${
                          m.done ? "text-primary" : "text-on-surface-variant/30"
                        }`}
                        style={{ fontVariationSettings: m.done ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        {m.done ? "check_circle" : "radio_button_unchecked"}
                      </span>
                      <span
                        className={`text-sm ${
                          m.done
                            ? "font-medium text-on-surface"
                            : "text-on-surface-variant"
                        }`}
                      >
                        {m.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Messages */}
              <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/30 p-6">
                <h2 className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                  <span aria-hidden="true"
                    className="material-symbols-outlined text-base"
                    style={{ fontVariationSettings: "'FILL' 0" }}
                  >
                    forum
                  </span>
                  Съобщения
                </h2>
                <div className="space-y-3">
                  {visibleMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="rounded-xl bg-surface-container px-4 py-3 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-on-surface">
                          {msg.senderId === currentUserId
                            ? "Вие"
                            : msg.sender?.name ?? clientName}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-on-surface-variant shrink-0">
                          <span aria-hidden="true"
                            className="material-symbols-outlined text-sm"
                            style={{ fontVariationSettings: "'FILL' 0" }}
                          >
                            schedule
                          </span>
                          {formatMessageTime(msg.createdAt)}
                          {msg.senderId === currentUserId && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1">
                                <span aria-hidden="true" className="material-symbols-outlined text-sm">
                                  {getReadReceiptIcon(msg.read)}
                                </span>
                                {getReadReceiptLabel(msg.read)}
                              </span>
                            </>
                          )}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-on-surface-variant">
                        {msg.text}
                      </p>
                    </div>
                  ))}

                  {isClientTyping && (
                    <div className="rounded-xl bg-surface-container px-4 py-3 text-sm text-on-surface-variant">
                      <span className="inline-flex items-center gap-1.5">
                        <span>{clientName} пише</span>
                        <span className="inline-flex gap-1">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/70" />
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/55 [animation-delay:120ms]" />
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/40 [animation-delay:240ms]" />
                        </span>
                      </span>
                    </div>
                  )}
                </div>

              {/* Reply input */}
                {error && (
                  <p className="mt-4 text-sm text-error">{error}</p>
                )}
                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(event) => {
                      setMessage(event.target.value);
                      void announceTyping(event.target.value.trim().length > 0);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void handleSendMessage();
                      }
                    }}
                    placeholder="Напишете съобщение…"
                    className="flex-1 rounded-xl border border-outline-variant/50 bg-surface-container px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    disabled={sending || message.trim().length === 0}
                    onClick={() => {
                      void handleSendMessage();
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90"
                  >
                    <span aria-hidden="true"
                      className="material-symbols-outlined text-base"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      send
                    </span>
                  </button>
                </div>
              </div>

              {/* Attachments */}
              <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/30 p-6">
                <h2 className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                  <span aria-hidden="true"
                    className="material-symbols-outlined text-base"
                    style={{ fontVariationSettings: "'FILL' 0" }}
                  >
                    attach_file
                  </span>
                  Прикачени файлове
                </h2>
                <div className="space-y-2">
                  {attachments.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center justify-between rounded-xl bg-surface-container px-4 py-3 transition-colors hover:bg-surface-container-high"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-container/30">
                          <span aria-hidden="true"
                            className="material-symbols-outlined text-base text-primary"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            {file.icon}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-on-surface">
                            {file.name}
                          </p>
                          <p className="text-xs text-on-surface-variant">{file.size}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-primary-container/30 hover:text-primary"
                        aria-label="Изтегли"
                      >
                        <span aria-hidden="true"
                          className="material-symbols-outlined text-base"
                          style={{ fontVariationSettings: "'FILL' 0" }}
                        >
                          download
                        </span>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Upload button */}
                <button
                  type="button"
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-outline-variant/60 px-4 py-3 text-sm font-medium text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary hover:bg-primary/5"
                >
                  <span aria-hidden="true"
                    className="material-symbols-outlined text-base"
                    style={{ fontVariationSettings: "'FILL' 0" }}
                  >
                    upload_file
                  </span>
                  Добави файл
                </button>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Client info */}
              <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/30 p-6">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                  Клиент
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-container text-sm font-bold text-on-primary">
                    T
                  </div>
                  <div>
                    <p className="font-semibold text-on-surface">{clientName}</p>
                    <p className="flex items-center gap-1 text-xs text-on-surface-variant mt-0.5">
                      <span aria-hidden="true"
                        className="material-symbols-outlined text-sm"
                        style={{ fontVariationSettings: "'FILL' 0" }}
                      >
                        business
                      </span>
                      FinTech
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2.5">
                  <p className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <span aria-hidden="true"
                      className="material-symbols-outlined text-base shrink-0"
                      style={{ fontVariationSettings: "'FILL' 0" }}
                    >
                      mail
                    </span>
                    contact@techvision.bg
                  </p>
                  <p className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <span aria-hidden="true"
                      className="material-symbols-outlined text-base shrink-0"
                      style={{ fontVariationSettings: "'FILL' 0" }}
                    >
                      phone
                    </span>
                    +359 888 123 456
                  </p>
                </div>

                <button
                  type="button"
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high"
                >
                  <span aria-hidden="true"
                    className="material-symbols-outlined text-base"
                    style={{ fontVariationSettings: "'FILL' 0" }}
                  >
                    open_in_new
                  </span>
                  Виж профила
                </button>
              </div>

              {/* Payment info */}
              <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/30 p-6">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                  Плащане
                </p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-on-surface-variant">Обща сума</span>
                    <span className="text-xl font-bold text-on-surface">
                      {paymentAmount.toLocaleString("bg-BG")} {paymentCurrency}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(100, (paidAmount / Math.max(paymentAmount, 1)) * 100),
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-on-surface-variant">
                      {Math.round((paidAmount / Math.max(paymentAmount, 1)) * 100)}% платено
                    </p>
                  </div>

                  <div className="h-px bg-outline-variant/30" />

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-on-surface-variant">Статус</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-container px-3 py-1 text-xs font-semibold text-on-primary-container">
                      <span aria-hidden="true"
                        className="material-symbols-outlined text-sm"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        payments
                      </span>
                      {project?.payment?.status ?? "Частично платено"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-on-surface-variant">Платено</span>
                    <span className="text-sm font-semibold text-primary">
                      {paidAmount.toLocaleString("bg-BG")} {paymentCurrency}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-on-surface-variant">Остатък</span>
                    <span className="text-sm font-medium text-on-surface">
                      {remainingAmount.toLocaleString("bg-BG")} {paymentCurrency}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90"
                >
                  <span aria-hidden="true"
                    className="material-symbols-outlined text-base"
                    style={{ fontVariationSettings: "'FILL' 0" }}
                  >
                    receipt_long
                  </span>
                  Изпрати фактура
                </button>
              </div>

              {/* Quick actions */}
              <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/30 p-6">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                  Действия
                </p>
                <div className="space-y-2">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high"
                  >
                    <span aria-hidden="true"
                      className="material-symbols-outlined text-base text-on-surface-variant"
                      style={{ fontVariationSettings: "'FILL' 0" }}
                    >
                      edit
                    </span>
                    Редактирай проекта
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high"
                  >
                    <span aria-hidden="true"
                      className="material-symbols-outlined text-base text-on-surface-variant"
                      style={{ fontVariationSettings: "'FILL' 0" }}
                    >
                      task_alt
                    </span>
                    Маркирай като завършен
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-error transition-colors hover:bg-error/8"
                  >
                    <span aria-hidden="true"
                      className="material-symbols-outlined text-base"
                      style={{ fontVariationSettings: "'FILL' 0" }}
                    >
                      cancel
                    </span>
                    Прекрати проекта
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
