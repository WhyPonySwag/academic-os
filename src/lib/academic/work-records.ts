import "server-only"
import type { DatabaseSync } from "node:sqlite"
import { z } from "zod"
import { categories, publicLink, type Work } from "./obligations"

const step = z.strictObject({id:z.uuid(),title:z.string().trim().min(1).max(300),done:z.boolean()})
const source = z.strictObject({reference:z.string().min(1),kind:z.enum(["telegram","vk","url","photo","pdf","docx"]),
  category:z.enum(categories),label:z.string().trim().min(1),link:z.string().refine(s => !s || publicLink(s)),sourceDate:z.union([z.literal(""),z.iso.date()]),confirmed:z.boolean()})
export const extrasSchema = z.object({debt:z.boolean(),steps:z.array(step),sources:z.array(source)}).refine(data =>
  new Set(data.steps.map(s=>s.id)).size === data.steps.length &&
  new Set(data.sources.map(s=>JSON.stringify([s.kind,s.reference]))).size === data.sources.length &&
  new Set(data.sources.map(s=>JSON.stringify([s.category,s.label,s.link,s.sourceDate]))).size === data.sources.length)

export function readWorks(db: DatabaseSync) {
  const works = db.prepare("SELECT * FROM tasks ORDER BY id DESC").all().map(row =>
    ({...row, steps:[], sources:[], history:[]} as unknown as Work))
  const byId = new Map(works.map(w=>[w.id,w]))
  for (const s of db.prepare("SELECT * FROM task_steps ORDER BY position").all())
    byId.get(Number(s.taskId))!.steps.push({id:String(s.id),title:String(s.title),done:!!s.done})
  for (const s of db.prepare("SELECT * FROM task_sources ORDER BY id").all()) {
    const reference = String(s.reference), kind = String(s.kind)
    const legacy: Record<string,string> = {telegram:"Telegram",vk:"VK",pdf:"Учебный документ",docx:"Учебный документ"}
    byId.get(Number(s.taskId))!.sources.push({reference,kind,label:String(s.label ?? reference),category:String(s.category ?? legacy[kind] ?? "Другое"),
      link:String(s.link ?? publicLink(reference) ?? ""),sourceDate:String(s.sourceDate ?? ""),confirmed:!!s.confirmed})
  }
  for (const h of db.prepare("SELECT * FROM task_history ORDER BY id DESC").all())
    byId.get(Number(h.taskId))!.history.push({at:String(h.at),change:String(h.change)})
  return works
}

export function writeExtras(db:DatabaseSync,id:number,data:z.output<typeof extrasSchema>,now:string) {
  const old = new Map(db.prepare("SELECT id,done FROM task_steps WHERE taskId=?").all(id).map(s=>[s.id,!!s.done]))
  db.prepare("DELETE FROM task_steps WHERE taskId=?").run(id)
  data.steps.forEach((s,i)=>{
    db.prepare("INSERT INTO task_steps(id,taskId,title,position,done) VALUES(?,?,?,?,?)").run(s.id,id,s.title,i,Number(s.done))
    if ((old.get(s.id) ?? false) !== s.done) db.prepare("INSERT INTO task_history(taskId,at,change) VALUES(?,?,?)").run(id,now,`Этап «${s.title}»: ${s.done ? "выполнен" : "открыт"}`)
  })
  const kept = new Set<number>()
  for(const s of data.sources) {
    const row = db.prepare(`INSERT INTO task_sources(taskId,kind,reference,category,label,link,sourceDate,confirmed)
      VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(taskId,kind,reference) DO UPDATE SET category=excluded.category,label=excluded.label,
      link=excluded.link,sourceDate=excluded.sourceDate,confirmed=excluded.confirmed RETURNING id`)
      .get(id,s.kind,s.reference,s.category,s.label,s.link,s.sourceDate || null,Number(s.confirmed))
    kept.add(Number(row!.id))
  }
  for(const row of db.prepare("SELECT id FROM task_sources WHERE taskId=?").all(id))
    if(!kept.has(Number(row.id))) db.prepare("DELETE FROM task_sources WHERE taskId=? AND id=?").run(id,row.id)
}
