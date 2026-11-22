import { mkdir } from "node:fs/promises"
import { join } from "node:path"
import { expect, test } from "@playwright/test"

// Uses only the isolated, temporary SQLite created by tests/start-local.ts.
// Do not connect visual captures to the real academic.db or private documents.
const routes = [
  { slug: "home", path: "/" },
  { slug: "schedule", path: "/schedule" },
  { slug: "subjects", path: "/subjects" },
  { slug: "tasks", path: "/tasks" },
  { slug: "calendar", path: "/calendar" },
  { slug: "archive", path: "/archive" },
  { slug: "settings", path: "/settings" },
] as const

const viewports = [
  { slug: "desktop", width: 1440, height: 900 },
  { slug: "mobile", width: 390, height: 844 },
] as const

for (const route of routes) {
  for (const viewport of viewports) {
    test(`Capture ${route.slug} at ${viewport.slug}`, async ({ page }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      })
      const response = await page.goto(route.path)
      expect(response?.ok(), `Route ${route.path} must load`).toBeTruthy()
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible()
      await page.evaluate(async () => { await document.fonts.ready })

      const destination = join(
        process.cwd(),
        "visual-output",
        `${route.slug}-${viewport.width}.png`,
      )
      await mkdir(join(process.cwd(), "visual-output"), { recursive: true })
      await page.screenshot({
        path: destination,
        fullPage: true,
        animations: "disabled",
      })
    })
  }
}
