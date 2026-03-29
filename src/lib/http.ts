import { NextResponse } from "next/server";
import type { ZodType } from "zod";

export class AppError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.details = details;
  }
}

export async function parseRequestBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    throw new AppError(400, "Невалидно JSON тяло.");
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(400, "Валидирането е неуспешно.", parsed.error.flatten());
  }

  return parsed.data;
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(data, init);
}

export function created<T>(data: T): NextResponse<T> {
  return NextResponse.json(data, { status: 201 });
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}

export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        details: error.details,
      },
      { status: error.status },
    );
  }

  console.error(error);
  return NextResponse.json(
    { error: "Вътрешна сървърна грешка." },
    { status: 500 },
  );
}

export function parseNumber(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseBoolean(value: string | null): boolean | undefined {
  if (value === null) {
    return undefined;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return undefined;
}
