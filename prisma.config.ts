import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

const envPath =
  process.env.DOTENV_CONFIG_PATH ??
  (existsSync(resolve(process.cwd(), ".env.local"))
    ? resolve(process.cwd(), ".env.local")
    : resolve(process.cwd(), ".env"));

loadEnv({ path: envPath });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? env("DATABASE_URL"),
  },
});
