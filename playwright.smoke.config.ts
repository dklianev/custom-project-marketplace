import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  use: {
    baseURL: "http://127.0.0.1:3000",
    headless: true,
    trace: "off",
    screenshot: "off",
    video: "off",
    viewport: {
      width: 1440,
      height: 1100,
    },
  },
  projects: [
    {
      name: "chrome-smoke",
      use: {
        browserName: "chromium",
        channel: "chrome",
      },
    },
  ],
});
