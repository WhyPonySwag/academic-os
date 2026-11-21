import { expect, test } from "@playwright/test"

test("Главная отображает учебные модули", async ({ page }) => {
  const errors: string[] = []

  page.on("pageerror", error => errors.push(error.message))

  const response = await page.goto("/")

  expect(response?.ok()).toBeTruthy()

  await expect(
    page.getByRole("heading", {
      name: "Учебный обзор",
      exact: true,
    })
  ).toBeVisible()

  for (const name of [
    "Занятия сегодня",
    "Ближайшие дедлайны",
    "Просроченные работы",
    "Задания без срока",
    "Учебные события",
    "Прогресс недели",
    "Академические задолженности",
    "Важные объявления",
    "Обзор дисциплин",
  ]) {
    await expect(
      page.getByRole("heading", { name, exact: true })
    ).toBeVisible()
  }

  expect(errors).toEqual([])
})

test("Переход с главной к заданиям", async ({ page }) => {
  await page.goto("/")

  await page.getByRole("link", {
    name: "Показать задания",
    exact: true,
  }).click()

  await expect(page).toHaveURL(/\/tasks/)
})

test("Главная отображается на мобильном экране", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/")

  await expect(
    page.getByRole("heading", { name: "Учебный обзор" })
  ).toBeVisible()

  await expect(
    page.getByRole("heading", { name: "Занятия сегодня" })
  ).toBeVisible()
})
