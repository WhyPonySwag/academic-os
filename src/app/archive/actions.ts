"use server"

import { createHash } from "node:crypto"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { localDatabase } from "@/lib/academic/database"

type Review = { error?:string; saved?:boolean; token?:string; details?:{
  title:string; filename:string; source:string; sourceDate:string; subject:string; task:string; size:number; digest:string
} }
export async function reviewMaterial(form: FormData, confirmation?: string): Promise<Review> {
  const db = await localDatabase()
  const file = form.get("file")
  if (!(file instanceof File) || !file.size || file.size > 8 * 1024 * 1024)
    return {error:"Выберите непустой файл размером до 8 МиБ."}
  const optionalId = z.string().transform(s=>s ? Number(s) : null).pipe(z.int().positive().nullable())
  const checked = z.object({ title:z.string().trim().min(1).max(300),source:z.string().trim().min(1).max(500),
    subjectId:optionalId,taskId:optionalId,sourceDate:z.union([z.literal(""),z.iso.date()]) }).safeParse(Object.fromEntries(form))
  if (!checked.success) return {error:"Проверьте название, источник и выбранные связи."}
  const {title,source,sourceDate,subjectId,taskId} = checked.data
  const filename = file.name.split(/[\\/]/).pop()?.split("").filter(ch=>ch.charCodeAt(0)>=32 && ch.charCodeAt(0)!==127).join("").trim().slice(0,240)
  if (!filename) return {error:"У файла отсутствует имя."}
  const bytes = Buffer.from(await file.arrayBuffer())
  const digest = createHash("sha256").update(bytes).digest("hex")
  const subject = subjectId ? db.prepare("SELECT title FROM subjects WHERE id=?").get(subjectId) : null
  const task = taskId ? db.prepare("SELECT title,subjectId FROM tasks WHERE id=?").get(taskId) : null
  if ((subjectId && !subject) || (taskId && (!task || (subjectId && subjectId !== task.subjectId))))
    return {error:"Выберите задание указанной дисциплины."}
  const effectiveSubject = subjectId ?? (task ? Number(task.subjectId) : null)
  const subjectName = subject?.title ?? (effectiveSubject ? db.prepare("SELECT title FROM subjects WHERE id=?").get(effectiveSubject)?.title : null)
  const details = {title,filename,source,sourceDate,subject:String(subjectName ?? ""),task:String(task?.title ?? ""),size:bytes.length,digest}
  const token = createHash("sha256").update(JSON.stringify([details,effectiveSubject,taskId])).digest("hex")
  if (confirmation === undefined) return {details,token}
  if (confirmation !== token) return {error:"Данные изменились. Повторите просмотр."}
  db.exec("BEGIN IMMEDIATE")
  try {
    db.prepare("INSERT INTO archive_blobs(digest,content) VALUES(?,?) ON CONFLICT DO NOTHING").run(digest,bytes)
    db.prepare(`INSERT INTO archive_materials(title,filename,source,sourceDate,subjectId,taskId,digest,added)
      VALUES(?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING`).run(title,filename,source,sourceDate||null,effectiveSubject,taskId,digest,new Date().toISOString())
    db.exec("COMMIT")
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }
  revalidatePath("/", "layout")
  return {saved:true}
}
