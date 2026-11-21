import "server-only"
import { z } from "zod"
import { localDatabase } from "./database"
import { lessonsBetween } from "./lessons"
import { offsetDay } from "./schedule-model"
import type { Task } from "./model"

type Deadline = Pick<Task, "id" | "title" | "subjectId" | "priority" | "status"> & { deadline: string; subject: string }

export async function calendarMonth(requested: unknown) {
  const db = await localDatabase()
  const today = String(db.prepare("SELECT date('now','localtime') AS day").get()!.day)
  const parsed = z.iso.date().safeParse(requested)
  const selected = parsed.success && parsed.data >= "0002" && parsed.data < "9999" ? parsed.data : today
  const first = selected.slice(0,7) + "-01"
  const next = offsetDay(first,32).slice(0,7) + "-01"
  const last = offsetDay(next,-1)
  const previous = offsetDay(first,-1).slice(0,7) + "-01"
  const tasks = db.prepare(`SELECT t.id,t.title,t.subjectId,t.status,t.priority,t.deadline,s.title AS subject
    FROM tasks t JOIN subjects s ON s.id=t.subjectId WHERE t.deadline BETWEEN ? AND ? ORDER BY t.deadline,t.id`)
    .all(first,last).map(row => ({ ...row }) as Deadline)
  return { today, selected, first, next, previous, days: Number(last.slice(-2)), tasks, lessons: lessonsBetween(db,first,last) }
}
