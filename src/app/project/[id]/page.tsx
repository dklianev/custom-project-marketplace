"use client";

import { use, useState } from "react";
import Image from "next/image";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useProjectRealtime } from "@/hooks/use-project-realtime";
import type { ChatMessage } from "@/stores/chat-store";

const PRO_AVATAR =
  "/editorial/avatar-pro.svg";

const SMALL_AVATAR_1 =
  "/editorial/avatar-client-a.svg";

const SMALL_AVATAR_2 =
  "/editorial/avatar-client-b.svg";

const DESIGN_CONCEPT =
  "/editorial/project-concept.svg";

const FALLBACK_MESSAGES: ChatMessage[] = [
  {
    id: "fallback-pro-1",
    senderId: "professional-demo",
    text: "Здравейте! Прегледах внимателно детайлите по проекта и подготвих първите насоки за визуалната система.",
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
    text: "Благодаря, Константин! Посоката ми харесва. Нека запазим усещането за яснота и премиум услуга.",
    createdAt: "2026-03-26T10:52:00.000Z",
    read: true,
    sender: {
      id: "client-demo",
      name: "Клиент",
      avatarUrl: SMALL_AVATAR_1,
    },
  },
  {
    id: "fallback-pro-2",
    senderId: "professional-demo",
    text: "Ето първия концепт за hero секцията. Очаквам мнението ти за композицията и контраста.",
    imageUrl: DESIGN_CONCEPT,
    createdAt: "2026-03-26T11:10:00.000Z",
    read: true,
    sender: {
      id: "professional-demo",
      name: "Константин Стоянов",
      avatarUrl: PRO_AVATAR,
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
    sending,
    error,
    isRealtimeActive,
    typingUserIds,
    onlineUserIds,
    sendMessage,
    announceTyping,
  } = useProjectRealtime(id);
  const activeUserId = currentUser?.id ?? project?.clientId ?? "client-demo";
  const visibleMessages = messages.length > 0 ? messages : FALLBACK_MESSAGES;
  const participantName = project?.professional.name ?? "Константин Стоянов";
  const participantAvatar = project?.professional.avatarUrl ?? PRO_AVATAR;
  const participantId = project?.professionalId ?? "professional-demo";
  const isParticipantOnline = onlineUserIds.includes(participantId);
  const isParticipantTyping = typingUserIds.includes(participantId);

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
        <div className="mx-auto max-w-7xl px-6">
          {/* 12-column grid */}
          <div className="grid grid-cols-12 gap-6">
            {/* LEFT SIDEBAR — col-span-4 */}
            <div className="col-span-4 flex flex-col gap-6">
              {/* Project header card */}
              <div className="rounded-2xl bg-surface-container-low p-6">
                <span className="inline-block rounded-full bg-tertiary-container px-3 py-1 text-xs font-medium text-on-tertiary-container">
                  {`Проект #${id}`}
                </span>
                <h1 className="mt-4 text-xl font-bold text-on-surface">
                  {project?.title ?? "Брандинг за Студио Ателие"}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  Цялостна брандинг идентичност за креативно студио, включваща лого, цветова палитра, типография и насоки за прилагане на марката.
                </p>
                {/* Avatars */}
                <div className="mt-4 flex items-center gap-2">
                  <Image
                    src={SMALL_AVATAR_1}
                    alt="Участник"
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                  <Image
                    src={SMALL_AVATAR_2}
                    alt="Участник"
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                </div>
              </div>

              {/* Техническо задание card */}
              <div className="rounded-2xl bg-surface-container-low p-6">
                <h2 className="text-base font-bold text-on-surface">
                  Техническо задание
                </h2>
                <ul className="mt-4 flex flex-col gap-4">
                  <li className="flex items-center gap-3">
                    <span aria-hidden="true" className="material-symbols-outlined text-on-surface-variant">
                      palette
                    </span>
                    <div>
                      <p className="text-sm font-medium text-on-surface">
                        Цветова палитра
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        Основни и допълнителни цветове
                      </p>
                    </div>
                  </li>
                  <li className="flex items-center gap-3">
                    <span aria-hidden="true" className="material-symbols-outlined text-on-surface-variant">
                      history_edu
                    </span>
                    <div>
                      <p className="text-sm font-medium text-on-surface">
                        Типография
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        Шрифтове и стилове за текст
                      </p>
                    </div>
                  </li>
                  <li className="flex items-center gap-3">
                    <span aria-hidden="true" className="material-symbols-outlined text-on-surface-variant">
                      event
                    </span>
                    <div>
                      <p className="text-sm font-medium text-on-surface">
                        Краен срок
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        15 април 2026
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Споделени файлове card */}
              <div className="rounded-2xl bg-surface-container-low p-6">
                <h2 className="text-base font-bold text-on-surface">
                  Споделени файлове
                </h2>
                <ul className="mt-4 flex flex-col gap-3">
                  <li className="flex items-center gap-3 rounded-xl bg-surface-container p-3">
                    <span aria-hidden="true" className="material-symbols-outlined text-on-surface-variant">
                      description
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-on-surface">
                        brand_guidelines_v1.pdf
                      </p>
                      <p className="text-xs text-on-surface-variant">2.4 MB</p>
                    </div>
                  </li>
                  <li className="flex items-center gap-3 rounded-xl bg-surface-container p-3">
                    <span aria-hidden="true" className="material-symbols-outlined text-on-surface-variant">
                      image
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-on-surface">
                        logo_sketches.zip
                      </p>
                      <p className="text-xs text-on-surface-variant">8.1 MB</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            {/* RIGHT CHAT SECTION — col-span-8 */}
            <div className="col-span-8 flex h-[800px] flex-col rounded-2xl bg-surface-container-low">
              {/* Chat header */}
              <div className="flex items-center justify-between border-b border-outline-variant px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Image
                      src={participantAvatar}
                      alt={participantName}
                      width={44}
                      height={44}
                      className="rounded-full"
                    />
                    <span
                      className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface-container-low ${
                        isParticipantOnline ? "bg-green-500" : "bg-outline"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">
                      {participantName}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {isParticipantTyping
                        ? "Пише..."
                        : isParticipantOnline
                          ? "Senior Visual Designer • Онлайн"
                          : isRealtimeActive
                            ? "Senior Visual Designer • Извън линия"
                            : "Senior Visual Designer"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Стартирай видео разговор"
                    className="rounded-full p-2 transition-colors hover:bg-surface-container"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-on-surface-variant">
                      videocam
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label="Още опции"
                    className="rounded-full p-2 transition-colors hover:bg-surface-container"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-on-surface-variant">
                      more_vert
                    </span>
                  </button>
                </div>
              </div>

              {/* Chat messages — scrollable */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="flex flex-col gap-4">
                  {visibleMessages.map((entry) => {
                    const isOwn = entry.senderId === activeUserId;

                    return (
                      <div
                        key={entry.id}
                        className={`flex max-w-[75%] items-start gap-3 ${
                          isOwn ? "self-end" : "self-start"
                        }`}
                      >
                        {!isOwn && (
                          <Image
                            src={entry.sender?.avatarUrl ?? participantAvatar}
                            alt={entry.sender?.name ?? participantName}
                            width={32}
                            height={32}
                            className="mt-1 rounded-full"
                          />
                        )}
                        <div className="flex flex-col gap-2">
                          {entry.imageUrl && (
                            <div className="overflow-hidden rounded-2xl">
                              <Image
                                src={entry.imageUrl}
                                alt="Project attachment"
                                width={400}
                                height={250}
                                className="w-full object-cover"
                              />
                            </div>
                          )}
                          <div
                            className={`rounded-2xl px-4 py-3 ${
                              isOwn
                                ? "bg-primary-container"
                                : "bg-surface-container"
                            }`}
                          >
                            <p
                              className={`text-sm ${
                                isOwn
                                  ? "text-on-primary-container"
                                  : "text-on-surface"
                              }`}
                            >
                              {entry.text}
                            </p>
                          </div>
                          <div
                            className={`flex items-center gap-2 text-[11px] text-on-surface-variant ${
                              isOwn ? "justify-end" : ""
                            }`}
                          >
                            <span>{formatMessageTime(entry.createdAt)}</span>
                            {isOwn && (
                              <span className="inline-flex items-center gap-1">
                                <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                                  {getReadReceiptIcon(entry.read)}
                                </span>
                                {getReadReceiptLabel(entry.read)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {isParticipantTyping && (
                    <div className="flex max-w-[75%] items-start gap-3 self-start">
                      <Image
                        src={participantAvatar}
                        alt={participantName}
                        width={32}
                        height={32}
                        className="mt-1 rounded-full"
                      />
                      <div className="rounded-2xl bg-surface-container px-4 py-3 text-sm text-on-surface-variant">
                        <span className="inline-flex items-center gap-1.5">
                          <span>{participantName} пише</span>
                          <span className="inline-flex gap-1">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/70" />
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/55 [animation-delay:120ms]" />
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/40 [animation-delay:240ms]" />
                          </span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat input */}
              <div className="border-t border-outline-variant px-6 py-4">
                {error && (
                  <p className="mb-3 text-sm text-error">{error}</p>
                )}
                <div className="flex items-center gap-3 rounded-full bg-surface-container px-4 py-2">
                  <button
                    type="button"
                    aria-label="Прикачи файл"
                    className="shrink-0 text-on-surface-variant transition-colors hover:text-primary"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined">
                      add_circle
                    </span>
                  </button>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      void announceTyping(e.target.value.trim().length > 0);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void handleSendMessage();
                      }
                    }}
                    placeholder="Напишете съобщение..."
                    className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant outline-none"
                  />
                  <button
                    type="button"
                    disabled={sending || message.trim().length === 0}
                    aria-label="Изпрати съобщение"
                    onClick={() => {
                      void handleSendMessage();
                    }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary transition-opacity hover:opacity-90"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                      send
                    </span>
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



