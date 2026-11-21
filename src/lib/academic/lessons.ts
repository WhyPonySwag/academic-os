import "server-only"
import type { DatabaseSync } from "node:sqlite"
import { z } from "zod"
import { localDatabase } from "./database"
import type { SubjectOption } from "./model"
import { lessonStatuses, monday, offsetDay, subgroups, type Lesson, type LessonFields } from "./schedule-model"

const required = z.string().trim().min(1, "Заполните поле.").max(200, "Максимум 200 символов.")
const positive = z.int().positive("Требуется целое положительное число.")
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Укажите время в формате ЧЧ:ММ.")
const date = z.iso.date({ error: "Укажите дату в формате ГГГГ-ММ-ДД." }).refine(v => v >= "0002" && v < "9999", "Дата вне диапазона.")
export const lessonSchema = z.strictObject({
  subjectId: positive, teacher: required, date, pair: positive, startTime: time, endTime: time, room: required,
  subgroup: z.enum(subgroups), lessonType: required, status: z.enum(lessonStatuses).default("Запланировано"),
  movedDate: date.nullish().transform(v => v ?? null), movedPair: positive.nullish().transform(v => v ?? null),
  movedStart: time.nullish().transform(v => v ?? null), movedEnd: time.nullish().transform(v => v ?? null),
  notes: z.string().trim().max(10000).default(""),
}).superRefine((l, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: "custom", message })
  if (l.endTime <= l.startTime) issue("Окончание должно быть позже начала.")
  const moved = [l.movedDate, l.movedPair, l.movedStart, l.movedEnd]
  if (l.status === "Перенесено") {
    if (moved.includes(null)) issue("Укажите новую дату, пару и время переноса.")
    else if (l.movedEnd! <= l.movedStart!) issue("Проверьте время окончания переноса.")
    else if (l.date === l.movedDate && l.pair === l.movedPair && l.startTime === l.movedStart && l.endTime === l.movedEnd) issue("Новый слот совпадает с исходным.")
  } else if (moved.some(v => v !== null)) issue("Новый слот доступен для перенесённых занятий.")
})

export function lessonValues(l: LessonFields) {
  return [l.subjectId,l.teacher,l.date,l.pair,l.startTime,l.endTime,l.room,l.subgroup,l.lessonType,l.status,l.movedDate,l.movedPair,l.movedStart,l.movedEnd,l.notes]
}
export function insertLesson(db: DatabaseSync, l: LessonFields) {
  return db.prepare(`INSERT INTO lessons(subjectId,teacher,date,pair,startTime,endTime,room,subgroup,lessonType,status,
    movedDate,movedPair,movedStart,movedEnd,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(...lessonValues(l))
}

export function lessonsBetween(db: DatabaseSync, from: string, to: string) {
  const rows = db.prepare(`SELECT l.*, s.title AS subject FROM lessons l JOIN subjects s ON s.id=l.subjectId
    WHERE l.date BETWEEN ? AND ? OR l.movedDate BETWEEN ? AND ?`).all(from,to,from,to)
  return rows.map(row => ({ ...row }) as Lesson)
}

export async function scheduleWeek(requested: unknown) {
  const db = await localDatabase()
  const today = String(db.prepare("SELECT date('now','localtime') day").get()!.day)
  const parsed = date.safeParse(requested)
  const week = monday(parsed.success ? parsed.data : today)
  const subjects = db.prepare("SELECT id, title, semester FROM subjects ORDER BY semester, title").all()
  return { today, week, subjects: subjects.map(row => ({ ...row }) as SubjectOption), lessons: lessonsBetween(db,week,offsetDay(week,6)) }
}
