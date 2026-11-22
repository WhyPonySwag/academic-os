import "server-only"
import { createHash } from "node:crypto"
import type { DatabaseSync } from "node:sqlite"
import { z } from "zod"
import { insertLesson, lessonSchema } from "./lessons"
import { insertSubject, insertTask, type SubjectInput, type TaskInput } from "./insert-study"
import { priorities, statuses } from "./model"
import type { LessonFields } from "./schedule-model"
import { maxJsonBytes, type ImportResult, type ImportRow } from "./import-model"

const title = z.string().trim().min(1).max(200)
const positive = z.int().positive()
const short = z.string().trim().max(200).default("")
const notes = z.string().trim().max(10000).default("")
const date = z.iso.date().nullable().default(null)
const subjectSchema = z.strictObject({
  title, semester: positive, teacher: short, assessment: short, notes, credits: z.number().nonnegative().nullable().default(null),
})
const taskSchema = z.strictObject({
  title, subjectId: positive, description: notes, notes, status: z.enum(statuses).default("Не выяснено"),
  priority: z.enum(priorities).default("Обычный"), deadline: date, issuedOn: date,
})
const ref = z.strictObject({ title, semester: positive })
const rows = z.array(z.unknown()).default([])
const envelope = z.strictObject({ version: z.literal(1), origin: title.optional(), subjects: rows, tasks: rows, lessons: rows })
const normalize = (s: string) => s.normalize("NFC").toLocaleLowerCase("ru").trim()
const subjectKey = (s: { title: string; semester: number }) => JSON.stringify([normalize(s.title), s.semester])
const taskKey = (id: number, s: string, issued: string | null) => JSON.stringify([id, normalize(s), issued])
const lessonKey = (l: Pick<LessonFields, "subjectId" | "date" | "pair" | "subgroup">) => JSON.stringify([l.subjectId,l.date,l.pair,l.subgroup])

type Insert = { kind: "subjects"; item: SubjectInput; tempId: number } |
  { kind: "tasks"; item: TaskInput } | { kind: "lessons"; item: LessonFields }

function explain(error: z.ZodError) {
  const issue = error.issues[0]
  const field = issue.path.join(".")
  if (issue.code === "unrecognized_keys") return `Неизвестные поля: ${issue.keys.join(", ")}.`
  if (issue.code === "custom") return issue.message
  return field ? `Поле «${field}» отсутствует или имеет недопустимое значение.` : "Ожидается объект записи."
}

function buildPlan(db: DatabaseSync, data: z.output<typeof envelope>) {
  const report: ImportRow[] = []
  const inserts: (Insert & {rowNumber:number})[] = []
  const byName = new Map<string, number[]>()
  const names = new Map<number, string>()
  function register(id: number, subject: { title: string; semester: number }) {
    const key = subjectKey(subject)
    byName.set(key, [...(byName.get(key) ?? []), id])
    names.set(id, subject.title)
  }
  for (const s of db.prepare("SELECT id,title,semester FROM subjects").all()) {
    register(Number(s.id), { title: String(s.title), semester: Number(s.semester) })
  }
  const tasks = new Set(db.prepare("SELECT subjectId,title,issuedOn FROM tasks").all()
    .map(t => taskKey(Number(t.subjectId), String(t.title), t.issuedOn as string | null)))
  const lessons = new Set(db.prepare("SELECT subjectId,date,pair,subgroup FROM lessons").all()
    .map(l => lessonKey(l as Pick<LessonFields, "subjectId" | "date" | "pair" | "subgroup">)))
  for (const group of ["subjects", "tasks", "lessons"] as const) {
    data[group].forEach((raw, index) => {
      const row: ImportRow = { group, index: index + 1, title: "—" }
      report.push(row)
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) { row.reason = "Ожидается объект записи."; return }
      const obj = raw as Record<string, unknown>
      if (typeof obj.title === "string") row.title = obj.title.slice(0,200)
      if (group === "subjects") {
        const parsed = subjectSchema.safeParse(obj)
        if (!parsed.success) { row.reason = explain(parsed.error); return }
        if (byName.has(subjectKey(parsed.data))) { row.reason = "Повтор предмета в базе или файле."; return }
        const tempId = -index - 1
        register(tempId, parsed.data)
        inserts.push({ rowNumber:index+1, kind: group, item: parsed.data, tempId })
        return
      }
      const { subject, ...fields } = obj
      let id: number
      if (subject !== undefined) {
        const parsed = ref.safeParse(subject)
        if (!parsed.success || fields.subjectId !== undefined) { row.reason = "Укажите одну ссылку: subjectId или subject с title и semester."; return }
        const matches = byName.get(subjectKey(parsed.data)) ?? []
        if (matches.length !== 1) { row.reason = matches.length ? "Название неоднозначно. Укажите subjectId." : "Предмет не найден."; return }
        id = matches[0]
      } else {
        const parsed = positive.safeParse(fields.subjectId)
        if (!parsed.success || !names.has(parsed.data)) { row.reason = "Не найден предмет по subjectId."; return }
        id = parsed.data
      }
      // Pending subjects use negative plan-local IDs until their INSERT succeeds.
      const input = { ...fields, subjectId: Math.abs(id) }
      if (group === "tasks") {
        const parsed = taskSchema.safeParse(input)
        if (!parsed.success) { row.reason = explain(parsed.error); return }
        const key = taskKey(id, parsed.data.title, parsed.data.issuedOn)
        if (tasks.has(key)) { row.reason = "Повтор задания в базе или файле."; return }
        tasks.add(key)
        inserts.push({ rowNumber:index+1, kind: group, item: { ...parsed.data, subjectId: id } })
      } else {
        const parsed = lessonSchema.safeParse(input)
        if (!parsed.success) { row.reason = explain(parsed.error); return }
        const item = { ...parsed.data, subjectId: id }
        row.title = `${names.get(id)} · ${item.date} · пара ${item.pair}`
        const key = lessonKey(item)
        if (lessons.has(key)) { row.reason = "Повтор занятия в базе или файле."; return }
        lessons.add(key)
        inserts.push({ rowNumber:index+1, kind: group, item })
      }
    })
  }
  return { report, inserts }
}

export function processImport(db: DatabaseSync, source: string, confirmation?: string): ImportResult {
  if (typeof source !== "string" || Buffer.byteLength(source) > maxJsonBytes) return { error: "Максимальный размер JSON — 256 КиБ." }
  let json: unknown
  try { json = JSON.parse(source.replace(/^\uFEFF/, "")) } catch { return { error: "Некорректный синтаксис JSON." } }
  const doc = envelope.safeParse(json)
  if (!doc.success) return { error: "Ожидается объект version: 1 с массивами subjects, tasks или lessons." }
  const count = doc.data.subjects.length + doc.data.tasks.length + doc.data.lessons.length
  if (!count || count > 500) return { error: "Файл должен содержать от 1 до 500 записей." }
  const writing = confirmation !== undefined
  db.exec(writing ? "BEGIN IMMEDIATE" : "BEGIN")
  try {
    const { report, inserts } = buildPlan(db, doc.data)
    const token = createHash("sha256").update(source).update(JSON.stringify([report,inserts])).digest("hex")
    if (writing && confirmation !== token) {
      db.exec("ROLLBACK")
      return { error: "Файл или данные базы изменились. Повторите предварительный просмотр." }
    }
    if (writing) {
      const ids = new Map<number, number>()
      const now = new Date().toISOString()
      const digest = createHash("sha256").update(source).digest("hex")
      const origin = db.prepare("INSERT INTO import_origins(digest,rowGroup,rowNumber,recordId,importedAt,sourceLabel) VALUES(?,?,?,?,?,?)")
      for (const op of inserts) {
        let recordId: number
        if (op.kind === "subjects") {
          recordId = Number(insertSubject(db, op.item, now).lastInsertRowid)
          ids.set(op.tempId,recordId)
        } else {
          const subjectId = ids.get(op.item.subjectId) ?? op.item.subjectId
          const inserted = op.kind === "tasks" ? insertTask(db, { ...op.item, subjectId }, now) : insertLesson(db, { ...op.item, subjectId })
          recordId = Number(inserted.lastInsertRowid)
        }
        origin.run(digest,op.kind,op.rowNumber,recordId,now,doc.data.origin ?? "Ручной импорт JSON")
      }
    }
    db.exec("COMMIT")
    return { rows: report, token, saved: writing }
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }
}
