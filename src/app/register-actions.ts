"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { localDatabase } from "@/lib/academic/database"
import { eventKinds, resultKinds } from "@/lib/academic/register"
import type { DatabaseSync } from "node:sqlite"

const id = z.coerce.number().int().positive()
const title = z.string().trim().min(1).max(300)
const day = z.iso.date().refine(v => v >= "0002" && v < "9999")
const requestKey = z.uuid()

async function write<T>(form: FormData, schema: z.ZodType<T>, save: (db: DatabaseSync, value: T) => void) {
  const values = schema.safeParse(Object.fromEntries(form))
  if (!values.success) return { error: "Проверьте заполненные поля и дату." }
  const db = await localDatabase()
  try {
    db.exec("BEGIN IMMEDIATE")
    try {
      save(db, values.data)
      db.exec("COMMIT")
    } catch (error) {
      db.exec("ROLLBACK")
      throw error
    }
  } catch (error) {
    if (error instanceof Error && "errcode" in error) return { error: "Связанная запись изменилась. Обновите страницу." }
    throw error
  }
  revalidatePath("/", "layout")
  return {}
}

export async function addResult(form: FormData) {
  return write(form, z.object({ subjectId: id, kind: z.enum(resultKinds), title, value: title, day, requestKey }), (db,v) => {
    db.prepare("INSERT INTO study_results(subjectId,kind,title,value,day,requestKey) VALUES(?,?,?,?,?,?) ON CONFLICT(requestKey) DO NOTHING")
      .run(v.subjectId,v.kind,v.title,v.value,v.day,v.requestKey)
  })
}

export async function addEvent(form: FormData) {
  return write(form, z.object({ title, kind: z.enum(eventKinds), day, requestKey }), (db,v) => {
    db.prepare("INSERT INTO study_events(title,kind,day,requestKey) VALUES(?,?,?,?) ON CONFLICT(requestKey) DO NOTHING")
      .run(v.title,v.kind,v.day,v.requestKey)
  })
}

export async function addNotice(form: FormData) {
  return write(form,z.object({title,requestKey}), (db,v) => {
    db.prepare("INSERT INTO study_notices(title,requestKey) VALUES(?,?) ON CONFLICT(requestKey) DO NOTHING").run(v.title,v.requestKey)
  })
}

export async function scheduleRetake(form: FormData) {
  return write(form,z.object({taskId:id,day,requestKey}), (db,v) => {
    const row = db.prepare(`INSERT INTO study_events(title,kind,day,taskId,requestKey)
      SELECT title,'Пересдача',?,id,? FROM tasks WHERE id=? AND debt=1 AND status<>'Принято'
      ON CONFLICT(requestKey) DO NOTHING`).run(v.day,v.requestKey,v.taskId)
    if (!row.changes && !db.prepare("SELECT id FROM study_events WHERE requestKey=?").get(v.requestKey))
      throw new Error("Задолженность уже закрыта.")
  })
}

export async function finishRetake(form: FormData) {
  return write(form,z.object({eventId:id,outcome:z.enum(["Сдано","Не сдано"])}), (db,v) => {
    const event = db.prepare("UPDATE study_events SET outcome=? WHERE id=? AND taskId IS NOT NULL AND outcome IS NULL RETURNING taskId")
      .get(v.outcome,v.eventId)
    if (event && v.outcome === "Сдано") db.prepare("UPDATE tasks SET debt=0,status='Принято',updatedAt=?,revision=revision+1 WHERE id=?")
      .run(new Date().toISOString(),event.taskId)
  })
}

export async function assignPeriod(form: FormData) {
  return write(form,z.object({subjectId:id,yearStart:z.coerce.number().int().min(1900).max(9998),course:id}), (db,v) => {
    const subject = db.prepare("SELECT semester FROM subjects WHERE id=?").get(v.subjectId)
    if (!subject) throw new Error("Предмет удалён.")
    const period = db.prepare(`INSERT INTO study_periods(yearStart,course,semester) VALUES(?,?,?)
      ON CONFLICT(yearStart,course,semester) DO UPDATE SET course=excluded.course RETURNING id`).get(v.yearStart,v.course,subject.semester)!
    db.prepare("INSERT INTO subject_periods(subjectId,periodId) VALUES(?,?) ON CONFLICT(subjectId) DO UPDATE SET periodId=excluded.periodId")
      .run(v.subjectId,period.id)
  })
}
