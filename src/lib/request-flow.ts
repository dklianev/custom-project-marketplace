export type RequestDraft = {
  query: string;
  city: string;
  budget: string;
  timeline: string;
  scope: string;
  priority: string;
  style: string;
  notes: string;
};

export const heroPromptSuggestions = [
  "Искам уютен ремонт на баня в София с естествени материали и спокоен хотелски вид.",
  "Търся изработка на сайт за архитектурно студио с premium усещане и ясна галерия.",
  "Нуждая се от интериорен дизайнер за малък апартамент с много място за съхранение.",
];

export const cityOptions = ["София", "Пловдив", "Варна", "Бургас", "Онлайн"];
export const budgetOptions = [
  "Под 2 000 лв.",
  "2 000 - 5 000 лв.",
  "5 000 - 12 000 лв.",
  "Над 12 000 лв.",
];
export const timelineOptions = [
  "До 2 седмици",
  "Този месец",
  "До 2 месеца",
  "Гъвкав срок",
];

export const scopeOptions = [
  {
    id: "concept",
    title: "Концепция и насока",
    description: "Търся професионална рамка, идеи и ясен план за следващите стъпки.",
  },
  {
    id: "design",
    title: "Пълен дизайн или изработка",
    description: "Искам оферта с конкретен обхват, срок и изпълнение.",
  },
  {
    id: "refresh",
    title: "Освежаване на съществуващо решение",
    description: "Имам база и търся човек, който да я доведе до по-силен резултат.",
  },
];

export const priorityOptions = [
  {
    id: "trust",
    title: "Най-важни са доверие и сигурност",
    description: "Искам проверен професионалист, ясен процес и защитено плащане.",
  },
  {
    id: "speed",
    title: "Скорост и добра организация",
    description: "Нуждая се от бърз старт, ясни срокове и стегната комуникация.",
  },
  {
    id: "craft",
    title: "Качество и силен финален резултат",
    description: "Готов съм да изчакам малко повече за по-добра изработка.",
  },
];

export const styleOptions = [
  "Мек и уютен",
  "Чист и минималистичен",
  "Редакционен и premium",
  "Съвременен, но топъл",
];

export const defaultRequestDraft: RequestDraft = {
  query:
    "Търся интериорен дизайнер за баня в София, който може да предложи спокоен premium вид, добри материали и реалистичен бюджет.",
  city: cityOptions[0],
  budget: budgetOptions[1],
  timeline: timelineOptions[1],
  scope: scopeOptions[1].id,
  priority: priorityOptions[0].id,
  style: styleOptions[3],
  notes:
    "Важно е изпълнителят да умее да работи стегнато, да комуникира спокойно и да предложи ясно разписани следващи стъпки.",
};

export function buildRequestDraft(source: Partial<RequestDraft>): RequestDraft {
  return {
    query: pick(source.query, defaultRequestDraft.query),
    city: pick(source.city, defaultRequestDraft.city),
    budget: pick(source.budget, defaultRequestDraft.budget),
    timeline: pick(source.timeline, defaultRequestDraft.timeline),
    scope: pick(source.scope, defaultRequestDraft.scope),
    priority: pick(source.priority, defaultRequestDraft.priority),
    style: pick(source.style, defaultRequestDraft.style),
    notes: pick(source.notes, defaultRequestDraft.notes),
  };
}

export function toRequestSearchParams(draft: Partial<RequestDraft>): URLSearchParams {
  const params = new URLSearchParams();

  Object.entries(draft).forEach(([key, value]) => {
    if (typeof value === "string" && value.trim()) {
      params.set(key, value.trim());
    }
  });

  return params;
}

export type ParsedRequestInterpretation = {
  category?: string;
  subCategory?: string;
  interpretation?: string;
  suggestedBudget?: string;
  suggestedTimeline?: string;
  urgency?: "URGENT" | "STANDARD" | "PLANNED";
};

type RequestRecordLike = {
  id?: string;
  title?: string | null;
  description?: string | null;
  budget?: string | null;
  timeline?: string | null;
  location?: string | null;
  area?: string | null;
  priorities?: string[] | null;
  specificNotes?: string | null;
};

export function buildRequestPayload(
  draft: RequestDraft,
  interpretation?: ParsedRequestInterpretation,
) {
  const scope = scopeOptions.find((option) => option.id === draft.scope) ?? scopeOptions[1];
  const priority =
    priorityOptions.find((option) => option.id === draft.priority) ?? priorityOptions[0];
  const title = draft.query.trim().slice(0, 140);
  const description = [draft.query.trim(), draft.notes.trim()]
    .filter(Boolean)
    .join("\n\n");

  return {
    title,
    description,
    category: interpretation?.category ?? "Curated project request",
    subCategory: interpretation?.subCategory,
    urgency: interpretation?.urgency ?? "STANDARD",
    area: scope.title,
    priorities: [priority.title, draft.style].filter(Boolean),
    specificNotes:
      interpretation?.interpretation && interpretation.interpretation !== draft.notes
        ? `${draft.notes.trim()}\n\nAI note: ${interpretation.interpretation.trim()}`.trim()
        : draft.notes.trim(),
    budget: interpretation?.suggestedBudget ?? draft.budget,
    timeline: interpretation?.suggestedTimeline ?? draft.timeline,
    location: draft.city,
  };
}

export function requestRecordToDraft(record: RequestRecordLike): RequestDraft {
  const matchedScope =
    scopeOptions.find((option) =>
      record.area?.toLowerCase().includes(option.title.toLowerCase()),
    ) ?? scopeOptions[1];
  const matchedPriority =
    priorityOptions.find((option) =>
      record.priorities?.some((item) =>
        item.toLowerCase().includes(option.title.toLowerCase()),
      ),
    ) ?? priorityOptions[0];

  return buildRequestDraft({
    query: record.description ?? record.title ?? undefined,
    city: record.location ?? undefined,
    budget: record.budget ?? undefined,
    timeline: record.timeline ?? undefined,
    scope: matchedScope.id,
    priority: matchedPriority.id,
    notes: record.specificNotes ?? undefined,
  });
}

function pick(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export const compareOffers = [
  {
    id: "2",
    name: "Петър Маринов Studio",
    verification: "Пълен профил + фирмени документи",
    fitScore: "96 / 100",
    specialty: "Интериор и материали за малки premium пространства",
    approach:
      "3D концепция, селекция на материали, бюджетен контрол и координация с изпълнителите.",
    price: "3 150 лв.",
    start: "До 3 дни",
    delivery: "21 дни",
    revisions: "2 кръга",
    visit: "Оглед в София включен",
    payment: "10% депозит в ескроу",
    reviews: "5.0 · 312 отзива",
    response: "Средно 42 минути",
    badge: "Най-силно съвпадение",
    reason:
      "AI вижда най-добро съвпадение между желания premium стил, ясния бюджет и опита на студиото с компактни бани.",
  },
  {
    id: "1",
    name: "Никол Студио",
    verification: "Проверен профил + портфолио",
    fitScore: "89 / 100",
    specialty: "Топли интериори с фокус върху осветление и атмосфера",
    approach:
      "Концепция, moodboard, избор на покрития и дистанционна координация със строителния екип.",
    price: "2 680 лв.",
    start: "До 5 дни",
    delivery: "18 дни",
    revisions: "1 кръг",
    visit: "Онлайн консултация + 1 посещение",
    payment: "15% депозит в ескроу",
    reviews: "4.9 · 124 отзива",
    response: "Средно 1 час",
    badge: "Най-балансирана цена",
    reason:
      "Подходящ избор, ако искаш по-лек бюджет и по-бърз старт, без да жертваш усещането за подбран проект.",
  },
  {
    id: "3",
    name: "Studio Forma",
    verification: "Проверен профил",
    fitScore: "83 / 100",
    specialty: "Бързи обновявания и детайлни технически задания",
    approach:
      "Изчистено предложение с фокус върху срок, технически чертежи и стриктно изпълнение.",
    price: "1 980 лв.",
    start: "До 24 часа",
    delivery: "12 дни",
    revisions: "1 кръг",
    visit: "Оглед при нужда",
    payment: "20% депозит в ескроу",
    reviews: "4.8 · 89 отзива",
    response: "Средно 25 минути",
    badge: "Най-бърз старт",
    reason:
      "Най-подходящо, ако срокът е по-важен от дизайнерската дълбочина и искаш бърза рамка за действие.",
  },
] as const;

export const compareRows = [
  { key: "fitScore", label: "Съвпадение със заявката" },
  { key: "verification", label: "Ниво на проверка" },
  { key: "specialty", label: "Подходящ профил" },
  { key: "approach", label: "Предложен подход" },
  { key: "price", label: "Обща цена" },
  { key: "start", label: "Старт" },
  { key: "delivery", label: "Срок за изпълнение" },
  { key: "revisions", label: "Ревизии" },
  { key: "visit", label: "Оглед / консултация" },
  { key: "payment", label: "Платежна защита" },
  { key: "reviews", label: "Ревюта" },
  { key: "response", label: "Скорост на отговор" },
] as const;
