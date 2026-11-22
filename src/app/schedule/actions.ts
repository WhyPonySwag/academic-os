"use server"

import { revalidatePath } from "next/cache"
import { localDatabase } from "@/lib/academic/database"
import { insertLesson, lessonSchema, lessonValues } from "@/lib/academic/lessons"
import type { ActionResult, RecordKey } from "@/lib/academic/model"
import { keySchema } from "@/lib/academic/validation"

const stale = { error: "Занятие изменено или удалено. Обновите страницу." }

export async function saveLesson(key: RecordKey | null, form: FormData): Promise<ActionResult> {
  if (key !== null && !keySchema.safeParse(key).success) return stale
  const fields = Object.fromEntries(form)
  const result = lessonSchema.safeParse({ ...fields, subjectId: Number(fields.subjectId), pair: Number(fields.pair),
    movedPair: fields.movedPair ? Number(fields.movedPair) : null })
  if (!result.success) return { error: result.error.issues[0].message }
  const db = await localDatabase()
  try {
    if (key) {
      const change = db.prepare(`UPDATE lessons SET subjectId=?,teacher=?,date=?,pair=?,startTime=?,endTime=?,room=?,subgroup=?,
        lessonType=?,status=?,movedDate=?,movedPair=?,movedStart=?,movedEnd=?,notes=?,substitute=?,revision=revision+1
        WHERE id=? AND revision=?`).run(...lessonValues(result.data),key.id,key.revision)
      if (!change.changes) return stale
    } else insertLesson(db, result.data)
  } catch (error) {
    if (error instanceof Error && "errcode" in error) {
      if (error.errcode === 2067) return { error: "У предмета уже есть занятие на эту дату, пару и подгруппу." }
      if (error.errcode === 787) return { error: "Выбранный предмет удалён." }
    }
    throw error
  }
  revalidatePath("/schedule")
  revalidatePath("/")
  return {}
}

export async function deleteLesson(key: RecordKey): Promise<ActionResult> {
  if (!keySchema.safeParse(key).success) return stale
  const db = await localDatabase()
  if (!db.prepare("DELETE FROM lessons WHERE id=? AND revision=?").run(key.id,key.revision).changes) return stale
  revalidatePath("/schedule")
  revalidatePath("/")
  return {}
}
