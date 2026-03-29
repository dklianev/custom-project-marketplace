const requiredEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "DATABASE_URL",
] as const;

export type RequiredEnvKey = (typeof requiredEnvKeys)[number];

export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getOptionalEnv(name: string): string | null {
  return process.env[name] ?? null;
}

export function hasEnv(name: string): boolean {
  return Boolean(process.env[name]);
}

export function hasRequiredBackendEnv(): boolean {
  return requiredEnvKeys.every((key) => hasEnv(key));
}

export function getAppUrl(): string {
  return getOptionalEnv("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000";
}
