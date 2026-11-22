import { randomUUID } from "node:crypto"
import { DatabaseSync } from "node:sqlite"
import { expect, test, type Page } from "@playwright/test"
import { migrate, migrations } from "../src/lib/academic/migrations"

const name = () => "Проверка расписания " + randomUUID().slice(0,8)
const dialog = (page: Page) => page.getByRole("dialog")
const week = "/schedule?week=2030-01-07"
const group = (page: Page) => page.getByLabel("Фильтр по подгруппе")
const lesson = { date: "2030-01-07", pair: 2, startTime: "10:00", endTime: "11:30", teacher: "Тест", room: "T1", subgroup: "Вся группа", lessonType: "Практика" }

async function subject(page: Page, title: string) {
  await page.goto("/subjects")
  await page.getByRole("button", { name: "Добавить предмет" }).click()
  await dialog(page).getByLabel("Название дисциплины").fill(title)
  await dialog(page).getByLabel("Семестр").fill("1")
  await dialog(page).getByRole("button", { name: "Сохранить" }).click()
  await expect(dialog(page)).toHaveCount(0)
}

async function preview(page: Page, data: unknown) {
  await page.goto(week)
  await page.getByRole("button", { name: "Импорт JSON" }).click()
  await dialog(page).getByLabel("Файл JSON").setInputFiles({ name: "study.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(data)) })
  await dialog(page).getByRole("button", { name: "Предварительный просмотр" }).click()
  await expect(dialog(page).getByRole("heading", { name: "Проверка записей" })).toBeVisible()
}

test("Миграция 1 → 2 сохраняет предмет, задание и источник", () => {
  using db = new DatabaseSync(":memory:")
  db.exec(migrations[0])
  db.exec(`PRAGMA user_version=1;
    INSERT INTO subjects(title,semester,notes,createdAt,updatedAt) VALUES('Тест',1,'заметка','a','b');
    INSERT INTO tasks(subjectId,title,createdAt,updatedAt) VALUES(1,'Тест','a','b');
    INSERT INTO task_sources(taskId,kind,reference) VALUES(1,'url','ref');`)
  const snapshot = () => ["subjects", "tasks", "task_sources"].map(table => db.prepare("SELECT " + (table === "tasks" ? "id,subjectId,title,description,status,priority,deadline,issuedOn,notes,createdAt,updatedAt,revision" : table === "task_sources" ? "id,taskId,kind,reference" : "*") + " FROM " + table).all())
  const before = snapshot()
  migrate(db)
  migrate(db)
  expect(snapshot()).toEqual(before)
  expect(db.prepare("PRAGMA user_version").get()?.user_version).toBe(migrations.length)
  expect(db.prepare("SELECT count(*) AS n FROM lessons").get()?.n).toBe(0)
})

test("Занятие, фильтр, перенос между неделями, ссылки и удаление", async ({ page }) => {
  const title = name()
  await subject(page,title)
  await page.goto(week)
  await page.getByRole("button", { name: "Добавить занятие" }).click()
  const panel = dialog(page)
  await panel.getByLabel("Предмет", { exact:true }).selectOption({label: title + " · семестр 1"})
  await panel.getByLabel("Преподаватель",{exact:true}).fill(lesson.teacher)
  await panel.getByLabel("Замещающий преподаватель").fill("Тестовая замена")
  await panel.getByLabel("Номер пары").fill("2")
  await panel.getByLabel("Начало", { exact:true }).fill(lesson.startTime)
  await panel.getByLabel("Окончание", { exact:true }).fill(lesson.endTime)
  await panel.getByLabel("Аудитория").fill(lesson.room)
  await panel.getByLabel("Тип занятия").fill(lesson.lessonType)
  await panel.getByLabel("Подгруппа", {exact:true}).selectOption("I")
  await panel.getByRole("button", { name:"Сохранить" }).click()
  await expect(panel).toHaveCount(0)
  const entry = page.getByRole("button", { name: new RegExp(title) })
  await expect(entry).toContainText("Тестовая замена")
  await page.getByRole("button",{name:"Неделя",exact:true}).click()
  await expect(page.getByRole("link",{name:new RegExp(title)})).toContainText("Тестовая замена")
  await page.getByRole("link",{name:"Месяц",exact:true}).click()
  await expect(page).toHaveURL(/filter=lessons/)
  await page.goto(week)
  await group(page).selectOption("II")
  await expect(entry).toHaveCount(0)
  await group(page).selectOption("I")
  await entry.click()
  await panel.getByRole("button",{name:"Изменить"}).click()
  await panel.getByLabel("Статус").selectOption("Перенесено")
  await panel.getByLabel("Новая дата").fill("2030-01-16")
  await panel.getByRole("button", { name:"Сохранить" }).click()
  await expect(page).toHaveURL(/week=2030-01-14/)
  await entry.click()
  await expect(panel).toContainText("Перенесено с 07.01.2030")
  await panel.getByRole("button",{name:"Закрыть"}).click()
  await page.getByRole("link",{name:"Предыдущая неделя"}).click()
  await entry.click()
  await expect(panel).toContainText("Перенесено на 16.01.2030")
  await panel.getByRole("link",{name:"К предмету"}).click()
  await expect(page.getByRole("heading",{name:title,exact:true})).toBeVisible()
  await page.goBack()
  await entry.click()
  await panel.getByRole("link",{name:"Задания предмета"}).click()
  await expect(page.getByLabel("Фильтр по предмету").locator("option:checked")).toContainText(title)
  await page.goto("/schedule?week=2030-01-21")
  await expect(entry).toHaveCount(0)
  await page.goto(week)
  await entry.click()
  await panel.getByRole("button",{name:"Удалить"}).click()
  await panel.getByRole("button",{name:"Подтвердить удаление"}).click()
  await expect(panel).toHaveCount(0)
  await page.goto("/schedule?week=2030-01-14")
  await expect(entry).toHaveCount(0)
})

test("Предпросмотр, частичное принятие, отчёт и повторный импорт JSON", async ({ page, context }) => {
  const ref = { title: name(), semester: 1 }
  const task = { subject: ref, title: name() }
  const data = { version: 1, subjects:[ref,ref], tasks:[task,task],
    lessons:[{...lesson,subject:ref,status:"Отменено"}, {...lesson,subject:ref,endTime:"09:00"}] }
  await preview(page,data)
  const panel = dialog(page)
  await expect(panel.getByRole("status")).toHaveText("Готово к записи: 3. Отклонено: 3.")
  const other = await context.newPage()
  await other.goto("/subjects")
  await expect(other.getByRole("heading",{name:ref.title})).toHaveCount(0)
  await panel.getByRole("button",{name:"Подтвердить запись (3)"}).click()
  await expect(panel.getByRole("status")).toHaveText("Записано: 3. Отклонено: 3.")
  await panel.getByRole("button",{name:"Закрыть"}).click()
  await group(page).selectOption("II")
  const entry = page.getByRole("button",{name:new RegExp(ref.title)})
  await expect(entry).toContainText("Отменено")
  await entry.click()
  await panel.getByRole("link",{name:"Задания предмета"}).click()
  await expect(page.getByRole("button",{name:task.title})).toBeVisible()
  await preview(page,data)
  await expect(panel.getByRole("status")).toHaveText("Готово к записи: 0. Отклонено: 6.")
  await expect(panel.getByRole("button",{name:/Подтвердить запись/})).toHaveCount(0)
})

test("Изменение базы между просмотром и подтверждением требует нового просмотра", async ({ page, context }) => {
  const ref = { title:name(), semester:1 }
  await preview(page,{version:1, subjects:[ref], tasks:[{subject:ref,title:"Проверка транзакции"}]})
  const other = await context.newPage()
  await subject(other,ref.title)
  await dialog(page).getByRole("button",{name:"Подтвердить запись (2)"}).click()
  await expect(dialog(page).getByRole("alert")).toContainText("Повторите предварительный просмотр")
  await other.getByRole("searchbox").fill(ref.title)
  await other.getByRole("link",{name:"Задания предмета"}).click()
  await expect(other.getByRole("button",{name:"Проверка транзакции"})).toHaveCount(0)
})

test("Ошибки JSON и обязательных полей не допускают запись", async ({ page }) => {
  await page.goto(week)
  await page.getByRole("button",{name:"Импорт JSON"}).click()
  const panel = dialog(page)
  const input = panel.getByLabel("Содержимое JSON")
  async function check(text: string) {
    await input.fill(text)
    await panel.getByRole("button",{name:"Предварительный просмотр"}).click()
  }
  await check("{")
  await expect(panel.getByRole("alert")).toContainText("синтаксис")
  await check('{"version":1,"lessons":{}}')
  await expect(panel.getByRole("alert")).toContainText("массивами")
  await check('{"version":1,"subjects":[{"title":"Неполная строка"}],"lessons":[{}]}')
  await expect(panel.getByRole("status")).toHaveText("Готово к записи: 0. Отклонено: 2.")
  await expect(panel.getByText(/Поле «semester»/)).toBeVisible()
  await expect(panel.getByRole("button",{name:/Подтвердить запись/})).toHaveCount(0)
})

test("Выбор дня, параллельные занятия и сохранение подгруппы", async ({page}) => {
  const refs = [name(),name(),name()].map(title => ({title,semester:1}))
  await preview(page,{version:1,subjects:refs,lessons:refs.map((subject,i) =>
    ({...lesson,subject,date:"2030-01-08",subgroup:["I","II","Вся группа"][i]}))})
  await dialog(page).getByRole("button",{name:"Подтвердить запись (6)"}).click()
  await expect(dialog(page).getByRole("status")).toContainText("Записано: 6")
  await dialog(page).getByRole("button",{name:"Закрыть"}).click()
  const rows = refs.map(ref => page.getByRole("button",{name:new RegExp(ref.title)}))
  await expect(rows[0]).toHaveCount(0)
  await page.getByRole("link",{name:"Вторник 08.01.2030"}).click()
  for (const row of rows) await expect(row).toBeVisible()
  await group(page).selectOption("II")
  await expect(rows[0]).toHaveCount(0)
  await expect(rows[1]).toBeVisible()
  await expect(rows[2]).toBeVisible()
  await page.goto(week)
  await expect(group(page)).toHaveValue("II")
  await page.getByRole("link",{name:"Вторник 08.01.2030"}).click()
  await rows[1].click()
  await expect(dialog(page)).toContainText("Подгруппа II")
})
