export type RequestUrgency = "URGENT" | "STANDARD" | "PLANNED";

export type MatchingRequest = {
  id: string;
  title: string;
  description: string;
  category: string | null;
  urgency: RequestUrgency;
  location: string | null;
  budget: string | null;
  createdAt: string;
  offers?: Array<{ id: string }>;
};

export type ProLead = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  icon: string;
  location: string;
  budget: string;
  urgency: RequestUrgency;
  urgencyLabel: string;
  timeLabel: string;
  offerCount: number;
  ctaLink: string;
  matchReason: string;
  budgetConfidence: string;
  responseWindow: string;
};

function formatRelativeTime(value: string) {
  const target = new Date(value).getTime();
  const diffMs = Date.now() - target;

  if (!Number.isFinite(target) || diffMs < 0) {
    return "току-що";
  }

  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) {
    return "току-що";
  }

  if (minutes < 60) {
    return `преди ${minutes} мин.`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `преди ${hours} ч.`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `преди ${days} дни`;
  }

  return new Date(value).toLocaleDateString("bg-BG", {
    day: "2-digit",
    month: "2-digit",
  });
}

function getUrgencyLabel(urgency: RequestUrgency) {
  switch (urgency) {
    case "URGENT":
      return "Спешно";
    case "PLANNED":
      return "Планирано";
    default:
      return "Стандартно";
  }
}

function resolveLeadIcon(request: MatchingRequest) {
  const haystack = `${request.category ?? ""} ${request.title}`.toLowerCase();

  if (
    haystack.includes("дизайн") ||
    haystack.includes("brand") ||
    haystack.includes("logo") ||
    haystack.includes("ux") ||
    haystack.includes("ui")
  ) {
    return "brush";
  }

  if (
    haystack.includes("web") ||
    haystack.includes("app") ||
    haystack.includes("software") ||
    haystack.includes("fintech") ||
    haystack.includes("saas")
  ) {
    return "web";
  }

  if (
    haystack.includes("видео") ||
    haystack.includes("video") ||
    haystack.includes("сним") ||
    haystack.includes("camera")
  ) {
    return "camera_outdoor";
  }

  if (
    haystack.includes("баня") ||
    haystack.includes("интериор") ||
    haystack.includes("ремонт") ||
    haystack.includes("архитект")
  ) {
    return "architecture";
  }

  return "workspaces";
}

function summarizeDescription(value: string) {
  const trimmed = value.trim();
  if (trimmed.length <= 140) {
    return trimmed;
  }

  return `${trimmed.slice(0, 137).trimEnd()}...`;
}

function getMatchReason(request: MatchingRequest) {
  const haystack = `${request.category ?? ""} ${request.title}`.toLowerCase();

  if (haystack.includes("баня") || haystack.includes("интериор")) {
    return "Пасва на профили с интериорен вкус, материална култура и уверен процес за компактни пространства.";
  }

  if (haystack.includes("web") || haystack.includes("app") || haystack.includes("site")) {
    return "Заявката изисква едновременно продуктово мислене и силно визуално представяне, а не обща техническа оферта.";
  }

  return "AI вижда добра пресечна точка между твоята експертиза, очаквания бюджетен диапазон и заявения тип работа.";
}

function getBudgetConfidence(budget: string | null) {
  if (!budget) {
    return "Бюджетът още не е фиксиран, но има достатъчно контекст за работеща чернова.";
  }

  if (budget.includes("12")) {
    return "Бюджетен сигнал: висок — проектът изглежда достатъчно сериозен за силно предложение.";
  }

  if (budget.includes("5 000") || budget.includes("5000")) {
    return "Бюджетен сигнал: добър — диапазонът е реалистичен за смислена оферта с ясен обхват.";
  }

  return "Бюджетен сигнал: умерен — ще трябва стегнат обхват, за да остане предложението убедително.";
}

function getResponseWindow(urgency: RequestUrgency) {
  switch (urgency) {
    case "URGENT":
      return "Добре е да отговориш до 2 часа.";
    case "PLANNED":
      return "Имаш време за по-спокойна, но силно формулирана оферта до края на деня.";
    default:
      return "Отговор до 4 часа ще държи шанса ти висок.";
  }
}

export function mapRequestToLead(request: MatchingRequest): ProLead {
  return {
    id: request.id,
    title: request.title,
    excerpt: summarizeDescription(request.description),
    category: request.category?.trim() || "Нова заявка",
    icon: resolveLeadIcon(request),
    location: request.location?.trim() || "Локация по уточнение",
    budget: request.budget?.trim() || "По договаряне",
    urgency: request.urgency,
    urgencyLabel: getUrgencyLabel(request.urgency),
    timeLabel: formatRelativeTime(request.createdAt),
    offerCount: request.offers?.length ?? 0,
    ctaLink: `/pro/offers/create?request=${request.id}`,
    matchReason: getMatchReason(request),
    budgetConfidence: getBudgetConfidence(request.budget),
    responseWindow: getResponseWindow(request.urgency),
  };
}
