"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import type { DatabaseSync } from "node:sqlite"
import { insertSubject, insertTask } from "@/lib/academic/insert-study"
import { localDatabase } from "@/lib/academic/database"
import type { ActionResult, RecordKey } from "@/lib/academic/model"
import { keySchema, subjectSchema, taskSchema } from "@/lib/academic/validation"

import { extrasSchema, writeExtras } from "@/lib/academic/work-records"

type Change = (db: DatabaseSync) => { changes: number | bigint }

async function mutate(change: Change, foreignKeyMessage: string): Promise<ActionResult> {
  const db = await localDatabase()
  try {
    if (!change(db).changes) return { error: "Запись уже изменена или удалена. Обновите страницу." }
  } catch (error) {
    if (error instanceof Error && "errcode" in error && [787, 1811].includes(Number(error.errcode))) {
      return { error: foreignKeyMessage }
    }
    throw error
  }
  for (const path of ["/", "/subjects", "/tasks", "/schedule"]) revalidatePath(path)
  return {}
}

const invalidKey = { error: "Некорректный идентификатор записи." }
const missingSubject = "Предмет уже удалён. Выберите другой предмет."
const linkedTasks = "У предмета есть задания или занятия, результаты или архивные материалы. Сначала проверьте связанные записи."

export async function saveSubject(key: RecordKey | null, form: FormData): Promise<ActionResult> {
  if (key !== null && !keySchema.safeParse(key).success) return invalidKey
  const parsed = subjectSchema.safeParse(Object.fromEntries(form))
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const { title, semester, teacher, assessment, credits, notes } = parsed.data
  const now = new Date().toISOString()
  const fields = [title, semester, teacher, assessment, credits, notes, now]
  return mutate(db => key
    ? db.prepare(`UPDATE subjects SET title=?, semester=?, teacher=?, assessment=?, credits=?, notes=?,
        updatedAt=?, revision=revision+1 WHERE id=? AND revision=?`).run(...fields, key.id, key.revision)
    : insertSubject(db, parsed.data, now), linkedTasks)
}

export async function saveTask(key: RecordKey | null, form: FormData): Promise<ActionResult> {
  if (key !== null && !keySchema.safeParse(key).success) return invalidKey
  const parsed = taskSchema.safeParse(Object.fromEntries(form))
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const requestId = z.uuid().safeParse(form.get("requestId"))
  if (!key && !requestId.success) return {error:"Откройте форму создания заново."}
  let raw: unknown
  try { raw = JSON.parse(String(form.get("extras"))) } catch { return { error:"Проверьте этапы и источники." } }
  const extras = extrasSchema.safeParse(raw)
  if (!extras.success) return {error:"Проверьте названия этапов и источников, даты, ссылки и повторяющиеся источники."}
  const { subjectId, title, description, status, priority, deadline, issuedOn, notes } = parsed.data
  const now = new Date().toISOString()
  const fields = [subjectId, title, description, status, priority, deadline, issuedOn, notes, now]
  return mutate(db => {
    db.exec("BEGIN IMMEDIATE")
    try {
      let id: number
      if (key) {
        const result = db.prepare(`UPDATE tasks SET subjectId=?,title=?,description=?,status=?,priority=?,deadline=?,issuedOn=?,notes=?,
          updatedAt=?,debt=?,revision=revision+1 WHERE id=? AND revision=?`).run(...fields,Number(extras.data.debt),key.id,key.revision)
        if (!result.changes) { db.exec("ROLLBACK"); return result }
        id = key.id
      } else {
        const token = requestId.data!
        if (db.prepare("SELECT id FROM tasks WHERE createKey=?").get(token)) {
          db.exec("COMMIT")
          return {changes:1}
        }
        id = Number(insertTask(db,parsed.data,now).lastInsertRowid)
        db.prepare("UPDATE tasks SET debt=?,createKey=? WHERE id=?").run(Number(extras.data.debt),token,id)
      }
      writeExtras(db,id,extras.data,now)
      db.exec("COMMIT")
      return {changes:1}
    } catch (error) {
      db.exec("ROLLBACK")
      throw error
    }
  }, missingSubject)
}

export async function removeRecord(kind: "subject" | "task", key: RecordKey): Promise<ActionResult> {
  if (!keySchema.safeParse(key).success || (kind !== "subject" && kind !== "task")) return invalidKey
  const sql = kind === "subject" ? "DELETE FROM subjects WHERE id=? AND revision=?" : "DELETE FROM tasks WHERE id=? AND revision=?"
  return mutate(db => db.prepare(sql).run(key.id, key.revision), kind === "task" ? "С заданием связаны пересдачи или файлы архива." : linkedTasks)
}
