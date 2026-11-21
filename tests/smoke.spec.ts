import { test, expect } from "@playwright/test";

const sections = [
  ["/", "Учебный обзор"],
  ["/schedule", "Расписание"],
  ["/subjects", "Предметы"],
  ["/tasks", "Задания"],
  ["/calendar", "Календарь"],
  ["/archive", "Учебный архив"],
  ["/settings", "Настройки"],
] as const;

for (const [path, heading] of sections) {
  test(`Страница ${path} открывается`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));

    const response = await page.goto(path);

    expect(response?.ok()).toBeTruthy();
    await expect(
      page.getByRole("heading", { name: heading, exact: true })
    ).toBeVisible();

    expect(errors).toEqual([]);
  });
}

test("Навигация по боковому меню", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Расписание", exact: true }).click();
  await expect(page).toHaveURL(/\/schedule$/);
});

test("Главная на мобильном экране", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Учебный обзор" })
  ).toBeVisible();
});
