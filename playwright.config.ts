import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./tests/start-local.ts",
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4328",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
})
