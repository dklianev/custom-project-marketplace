"use client";

import { use, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { useProjectRealtime } from "@/hooks/use-project-realtime";
import type { ChatMessage } from "@/stores/chat-store";

const PRO_AVATAR = "/editorial/avatar-pro.svg";
const FALLBACK_ATTACHMENT_IMAGE = "/editorial/project-concept.svg";

const FALLBACK_MESSAGES: ChatMessage[] = [
  {
    id: "fallback-pro-1",
    senderId: "professional-demo",
    text: "Здравейте! Подготвих първите насоки за проекта и качих референтни файлове в панела отляво.",
    createdAt: "2026-03-26T10:45:00.000Z",
    read: true,
    sender: {
      id: "professional-demo",
      name: "Константин Стоянов",
      avatarUrl: PRO_AVATAR,
    },
  },
  {
    id: "fallback-client-1",
    senderId: "client-demo",
    text: "Благодаря, контекстът е ясен. Искам да запазим спокойния тон и премиум усещането от началната версия.",
    createdAt: "2026-03-26T10:52:00.000Z",
    read: true,
    sender: {
      id: "client-demo",
      name: "Вие",
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
    loading,
    sending,
    error,
    isRealtimeActive,
    typingUserIds,
    onlineUserIds,
    sendMessage,
    announceTyping,
  } = useProjectRealtime(id);

  const visibleMessages = messages.length > 0 ? messages : FALLBACK_MESSAGES;
  const participantName = project?.professional.name ?? "Константин Стоянов";
  const participantAvatar = project?.professional.avatarUrl ?? PRO_AVATAR;
  const participantId = project?.professionalId ?? "professional-demo";
  const isParticipantOnline = onlineUserIds.includes(participantId);
  const isParticipantTyping = typingUserIds.includes(participantId);
  const currentUserId = currentUser?.id ?? project?.clientId ?? "client-demo";

  const fileCards = useMemo(() => {
    if (project?.attachments?.length) {
      return project.attachments;
    }

    return [
      {
        id: "fallback-brief",
        fileName: "brand_guideline_v1.pdf",
        fileUrl: FALLBACK_ATTACHMENT_IMAGE,
        fileType: "pdf",
      },
      {
        id: "fallback-logo",
        fileName: "logo_sketches.zip",
        fileUrl: FALLBACK_ATTACHMENT_IMAGE,
        fileType: "zip",
      },
    ];
  }, [project]);

  const briefRows = [
    {
      label: "Целева задача",
      value: project?.request.area ?? "Подреден визуален език и ясно усещане за премиум продукт.",
      icon: "interests",
    },
    {
      label: "Локация",
      value: project?.request.location ?? "Дистанционно / по заявката",
      icon: "location_on",
    },
    {
      label: "Краен срок",
      value: project?.request.timeline ?? "По уговорка",
      icon: "event",
    },
  ];

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
        <div className="mx-auto max-w-7xl space-y-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant transition-opacity hover:opacity-80"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-base">
              arrow_back
            </span>
            Назад към таблото
          </Link>

          <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
            <aside className="space-y-5 lg:sticky lg:top-32">
              <div className="rounded-[2rem] bg-white/84 px-6 py-6 shadow-[0_24px_70px_rgba(77,66,96,0.08)] backdrop-blur-xl">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary/70">
                  {`#${id.slice(-6).toUpperCase()}`}
                </p>
                <h1 className="mt-4 text-[2rem] font-extrabold leading-tight tracking-[-0.05em] text-on-surface">
                  {project?.request.title ?? project?.title ?? "Брандинг за студио"}
                </h1>
                <p className="mt-4 text-sm leading-7 text-on-surface-variant">
                  {project?.request.description ?? "Искаме да структурираме визуалната идентичност, комуникацията и основните насоки за новия проект."}
                </p>
              </div>

              <div className="rounded-[2rem] bg-white/84 px-6 py-6 shadow-[0_24px_70px_rgba(77,66,96,0.08)] backdrop-blur-xl">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                  Техническо задание
                </p>
                <div className="mt-5 space-y-4">
                  {briefRows.map((item) => (
                    <div key={item.label} className="flex items-start gap-3 rounded-[1.5rem] bg-surface-container-low px-4 py-4">
                      <span aria-hidden="true" className="material-symbols-outlined text-on-surface-variant">
                        {item.icon}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-on-surface">{item.label}</p>
                        <p className="mt-1 text-xs leading-6 text-on-surface-variant">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] bg-white/84 px-6 py-6 shadow-[0_24px_70px_rgba(77,66,96,0.08)] backdrop-blur-xl">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                    Споделени файлове
                  </p>
                  <span className="text-xs text-on-surface-variant/60">{fileCards.length} файла</span>
                </div>
                <div className="mt-5 space-y-3">
                  {fileCards.map((file) => (
                    <a
                      key={file.id}
                      href={file.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-[1.4rem] bg-surface-container-low px-4 py-4 text-sm transition-colors hover:bg-white"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-on-surface">{file.fileName}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-on-surface-variant/60">
                          {file.fileType ?? "файл"}
                        </p>
                      </div>
                      <span aria-hidden="true" className="material-symbols-outlined text-on-surface-variant">
                        arrow_outward
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </aside>

            <section className="rounded-[2.2rem] bg-white/86 shadow-[0_32px_90px_rgba(77,66,96,0.1)] backdrop-blur-xl">
              <div className="border-b border-outline-variant/20 px-6 py-5 md:px-8">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Image
                        src={participantAvatar}
                        alt={participantName}
                        width={44}
                        height={44}
                        className="rounded-full object-cover"
                      />
                      <span
                        className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                          isParticipantOnline ? "bg-green-500" : "bg-outline"
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">{participantName}</p>
                      <p className="text-xs text-on-surface-variant">
                        {isParticipantTyping
                          ? "Пише..."
                          : isParticipantOnline
                            ? "Онлайн"
                            : isRealtimeActive
                              ? "Извън линия"
                              : "Чатът е в защитен режим"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <button type="button" aria-label="Повече опции" className="rounded-full p-2 transition-colors hover:bg-surface-container-low">
                      <span aria-hidden="true" className="material-symbols-outlined">more_horiz</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="min-h-[520px] space-y-4 px-6 py-6 md:px-8">
                {loading ? (
                  <p className="text-sm leading-7 text-on-surface-variant">Зареждаме проекта и чата...</p>
                ) : error ? (
                  <div className="rounded-[1.6rem] bg-rose-100/80 px-5 py-4 text-sm font-medium text-rose-700">
                    {error}
                  </div>
                ) : (
                  visibleMessages.map((item) => {
                    const isOwnMessage = item.senderId === currentUserId;
                    return (
                      <div key={item.id} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[38rem] ${isOwnMessage ? "items-end" : "items-start"} flex flex-col gap-2`}>
                          {!isOwnMessage ? (
                            <div className="flex items-center gap-3 text-xs text-on-surface-variant/70">
                              <Image
                                src={item.sender?.avatarUrl ?? participantAvatar}
                                alt={item.sender?.name ?? participantName}
                                width={28}
                                height={28}
                                className="rounded-full object-cover"
                              />
                              <span>{item.sender?.name ?? participantName}</span>
                            </div>
                          ) : null}
                          <div
                            className={`rounded-[1.9rem] px-5 py-4 text-sm leading-7 shadow-[0_18px_40px_rgba(77,66,96,0.06)] ${
                              isOwnMessage
                                ? "rounded-tr-[0.7rem] bg-primary text-on-primary"
                                : "rounded-tl-[0.7rem] bg-surface-container-low text-on-surface"
                            }`}
                          >
                            <p>{item.text}</p>
                            {item.imageUrl ? (
                              <div className="mt-4 overflow-hidden rounded-[1.4rem] bg-white/40">
                                <Image
                                  src={item.imageUrl}
                                  alt="Прикачено изображение"
                                  width={960}
                                  height={640}
                                  sizes="(min-width: 1024px) 28rem, 100vw"
                                  className="aspect-[4/3] w-full object-cover"
                                />
                              </div>
                            ) : null}
                          </div>
                          <div className={`flex items-center gap-2 text-[11px] text-on-surface-variant/60 ${isOwnMessage ? "self-end" : "self-start"}`}>
                            <span>{formatMessageTime(item.createdAt)}</span>
                            {isOwnMessage ? (
                              <>
                                <span
                                  aria-hidden="true"
                                  className="material-symbols-outlined text-sm"
                                  style={item.read ? { fontVariationSettings: "'FILL' 1" } : undefined}
                                >
                                  {getReadReceiptIcon(item.read)}
                                </span>
                                <span>{getReadReceiptLabel(item.read)}</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="px-6 pb-6 md:px-8 md:pb-8">
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
                    aria-label="Изпрати съобщението"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined">
                      arrow_upward
                    </span>
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
