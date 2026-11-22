import { mkdir } from "node:fs/promises"
import { join } from "node:path"
import { expect, test } from "@playwright/test"
import { seedVisualWorkspace } from "./seed"

const routes = [
  ["home","/","Учебный обзор"],["schedule","/schedule","Расписание"],["subjects","/subjects","Предметы"],
  ["tasks","/tasks","Задания"],["calendar","/calendar","Календарь"],["archive","/archive","Учебный архив"],
  ["debts","/debts","Долги и пересдачи"],["results","/results","Успеваемость"],["history","/history","Учебная история"],
  ["settings","/settings","Настройки"]
]
test("Пустое и заполненное пространство на пяти ширинах", async ({page})=>{
  test.setTimeout(540000)
  const dest = join(process.cwd(),"visual-output")
  await mkdir(dest,{recursive:true})
  const errors:string[] = []
  page.on("pageerror", e=>errors.push(e.message))
  for (const state of ["empty","filled"]) {
    const saved = state==="filled" ? seedVisualWorkspace() : null
    const screens = saved ? [...routes,["subject-detail","/subjects?subject="+saved.subject,"Предметы"],["task-detail","/tasks?task="+saved.task,"Задания"]] : routes
    for (const [slug,path,heading] of screens) {
      for (const width of [390,768,1280,1440,1920]) {
        await page.setViewportSize({width,height:width===390 ? 844 : 960})
        expect((await page.goto(path))?.ok()).toBeTruthy()
        if (slug==="task-detail") await expect(page.getByRole("dialog").getByRole("heading",{name:"Разрез учебного павильона"})).toBeVisible()
        else await expect(page.getByRole("heading",{name:heading,level:1,exact:true})).toBeVisible()
        if (slug==="calendar") await expect(page.getByRole("link",{name:"Сегодня",exact:true})).toBeVisible()
        if (slug==="subject-detail") await expect(page.getByRole("heading",{name:"Материалы дисциплины"})).toBeVisible()
        if (slug==="home") await expect(page.getByRole("region",{name:state==="empty" ? "Занятия сегодня" : "Важные объявления",exact:true}).getByText(state==="empty" ? "На сегодня занятий нет." : "Просмотр макетов пройдёт в мастерской")).toBeVisible()
        await page.evaluate(async()=>{await document.fonts.ready})
        expect(await page.evaluate(()=>document.documentElement.scrollWidth),slug+" width "+width).toBeLessThanOrEqual(width)
        await page.screenshot({path:join(dest,`${state}-${slug}-${width}.png`),fullPage:true,animations:"disabled"})
      }
    }
  }
  expect(errors).toEqual([])
})
