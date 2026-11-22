import "server-only"

import { localDatabase } from "@/lib/academic/database"

type Row = Record<string, unknown>

export type DashboardTask = {
  id: number
  title: string
  subject: string
  due: string | null
  status: string
  priority: string
  steps: number
  done: number
  complete: boolean
}

export type DashboardLesson = {
  id: number
  title: string
  teacher: string
  room: string
  start: string
  end: string
  subgroup: string
  status: string
  occurrence: "original" | "moved"
}

export type DashboardEvent = {
  id: number
  title: string
  date: string
  type: string
}

export type DashboardData = {
  today: string
  lessons: DashboardLesson[]
  tasks: {
    open: number
    overdue: DashboardTask[]
    upcoming: DashboardTask[]
    attention: DashboardTask[]
  }
  subjects: {
    id: number
    title: string
    open: number
    total: number
  }[]
  debts: {
    supported: boolean
    subjects: {id:number;title:string}[]
    tasks: DashboardTask[]
  }
  announcements: {
    supported: boolean
    titles: string[]
  }
  events: DashboardEvent[]
  weekly: {
    completed: number
    total: number
  }
}

function get(row: Row, names: string[]): unknown {
  for (const name of names) {
    const result = row[name]
    if (result !== null && result !== undefined) return result
  }
  return null
}

function str(value: unknown, fallback = ""): string {
  return value === null || value === undefined
    ? fallback
    : String(value)
}

function num(value: unknown): number {
  const result = Number(value)
  return Number.isFinite(result) ? result : 0
}

function flag(value: unknown): boolean {
  return value === true || value === 1 || value === "1"
}

function dateOnly(value: unknown): string | null {
  const input = str(value).slice(0, 10)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return null

  const date = new Date(`${input}T12:00:00Z`)

  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === input
    ? input
    : null
}

function complete(status: string): boolean {
  return [
    "Принято",
    "Выполнено",
    "Завершено",
    "Закрыто",
    "Done",
    "Completed",
  ].some(value => value.toLowerCase() === status.trim().toLowerCase())
}

function week(today: string) {
  const date = new Date(`${today}T12:00:00Z`)
  const day = (date.getUTCDay() + 6) % 7

  date.setUTCDate(date.getUTCDate() - day)

  const start = date.toISOString().slice(0, 10)

  date.setUTCDate(date.getUTCDate() + 6)

  return {
    start,
    end: date.toISOString().slice(0, 10),
  }
}

export async function readDashboard(): Promise<DashboardData> {
  const db = await localDatabase()

  const available = new Set(
    db.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table'"
    ).all().map(row => String(row.name))
  )

  const read = (name: string): Row[] => {
    if (!available.has(name)) return []
    // Вызывается только с фиксированными именами таблиц.
    return db.prepare(`SELECT * FROM "${name}"`).all() as Row[]
  }

  const columns = (name: string): Set<string> => {
    if (!available.has(name)) return new Set()

    return new Set(
      db.prepare(`PRAGMA table_info("${name}")`)
        .all()
        .map(row => String(row.name))
    )
  }

  for (const table of ["subjects", "tasks", "lessons"]) {
    if (!available.has(table)) {
      throw new Error(`Не найдена таблица ${table}`)
    }
  }

  const today = str(
    db.prepare("SELECT date('now', 'localtime') AS d").get()?.d
  )

  const subjects = read("subjects")
  const taskRows = read("tasks")
  const lessonRows = read("lessons")
  const subjectMap = new Map<number, string>()

  for (const row of subjects) {
    subjectMap.set(
      num(row.id),
      str(get(row, ["title", "name"]), "Без названия")
    )
  }

  const progress = new Map<number, { steps: number; done: number }>()
  if (available.has("task_steps")) {
    for (const row of db.prepare("SELECT taskId, count(*) steps, sum(done) done FROM task_steps GROUP BY taskId").all()) {
      progress.set(Number(row.taskId), { steps: Number(row.steps), done: Number(row.done) })
    }
  }

  const tasks: (DashboardTask & { subjectId: number })[] =
    taskRows.map(row => {
      const subjectId = num(get(row, ["subjectId", "subject_id"]))
      const status = str(row.status, "Не выяснено")

      return {
        id: num(row.id),
        title: str(get(row, ["title", "name"]), "Без названия"),
        subjectId,
        subject: subjectMap.get(subjectId) ?? "Без дисциплины",
        due: dateOnly(
          get(row, ["dueDate", "deadline", "due_date", "due"])
        ),
        status,
        priority: str(row.priority),
        ...(progress.get(num(row.id)) ?? { steps: 0, done: 0 }),
        complete: complete(status),
      }
    })

  const open = tasks.filter(task => !task.complete)

  const overdue = open
    .filter(task => task.due !== null && task.due < today)
    .sort((a, b) => a.due!.localeCompare(b.due!))

  const upcoming = open
    .filter(task => task.due !== null && task.due >= today)
    .sort((a, b) => a.due!.localeCompare(b.due!))
    .slice(0, 6)

  const attention = open
    .filter(task => task.due === null)
    .slice(0, 5)

  const periods = week(today)

  const dueThisWeek = tasks.filter(task =>
    task.due !== null &&
    task.due >= periods.start &&
    task.due <= periods.end
  )

  const subjectCards = subjects.map(row => {
    const id = num(row.id)
    const related = tasks.filter(task => task.subjectId === id)

    return {
      id,
      title: subjectMap.get(id) ?? "Без названия",
      total: related.length,
      open: related.filter(task => !task.complete).length,
    }
  }).sort((a, b) => a.title.localeCompare(b.title, "ru"))

  const lessons: DashboardLesson[] = []

  for (const row of lessonRows) {
    const id = num(row.id)
    const subject = subjectMap.get(num(row.subjectId)) ?? "Дисциплина"
    const status = str(row.status, "Запланировано")

    const common = {
      id,
      title: subject,
      teacher: row.substitute ? String(row.substitute)+" (замена)" : str(row.teacher),
      room: str(row.room),
      subgroup: str(row.subgroup, "Вся группа"),
      status,
    }

    const original = dateOnly(row.date)
    const moved = dateOnly(row.movedDate)

    if (original === today && status === "Перенесено") {
      lessons.push({
        ...common,
        start: str(row.startTime),
        end: str(row.endTime),
        occurrence: "original",
      })
    } else if (original === today) {
      lessons.push({
        ...common,
        start: str(row.startTime),
        end: str(row.endTime),
        occurrence: "original",
      })
    }

    if (status === "Перенесено" && moved === today) {
      lessons.push({
        ...common,
        start: str(row.movedStart),
        end: str(row.movedEnd),
        occurrence: "moved",
      })
    }
  }

  lessons.sort((a, b) => a.start.localeCompare(b.start))

  const taskColumns = columns("tasks")
  const debtFlag = ["debt", "isDebt", "isAcademicDebt", "is_debt"]
    .find(field => taskColumns.has(field))

  const debtTable = ["academic_debts", "task_debts", "debts"]
    .find(table => available.has(table))

  const debtTasks: DashboardTask[] = []

  if (debtFlag) {
    for (const row of taskRows) {
      if (!flag(row[debtFlag])) continue

      const task = tasks.find(item => item.id === num(row.id))

      if (task && !task.complete) debtTasks.push(task)
    }
  }

  if (debtTable) {
    for (const row of read(debtTable)) {
      const taskId = num(get(row, ["taskId", "task_id"]))
      const task = tasks.find(item => item.id === taskId)

      const state = str(get(row, ["status", "state"])).toLowerCase()
      const closed = [
        "закрыто", "завершено", "выполнено", "closed", "resolved",
      ].includes(state)

      if (
        task && !task.complete && !closed &&
        !debtTasks.some(item => item.id === task.id)
      ) {
        debtTasks.push(task)
      }
    }
  }

  const events: DashboardEvent[] = db.prepare("SELECT id,title,kind AS type,day AS date FROM study_events WHERE day>=? ORDER BY day,id LIMIT 6").all(today)
    .map(row=>({id:Number(row.id),title:String(row.title),type:String(row.type),date:String(row.date)}))

  const eventTable = [
    "academic_events",
    "calendar_events",
    "events",
  ].find(name => available.has(name))

  if (eventTable) {
    for (const row of read(eventTable)) {
      const date = dateOnly(
        get(row, ["date", "eventDate", "startDate", "startsAt"])
      )

      if (!date || date < today) continue

      const state = str(row.status).toLowerCase()
      if (state === "отменено" || state === "cancelled") continue

      events.push({
        id: num(row.id),
        title: str(get(row, ["title", "name"]), "Событие"),
        date,
        type: str(get(row, ["type", "kind", "eventType"]), "Событие"),
      })
    }
  }

  for (const row of lessonRows) {
    const kind = str(row.lessonType)

    if (!/экзамен|зач[её]т|защит|контрольн/i.test(kind)) continue
    if (row.status === "Отменено") continue

    const date = dateOnly(
      row.status === "Перенесено" ? row.movedDate : row.date
    )

    if (!date || date < today) continue

    events.push({
      id: num(row.id),
      title: subjectMap.get(num(row.subjectId)) ?? "Событие",
      date,
      type: kind,
    })
  }

  events.sort((a, b) => a.date.localeCompare(b.date))

  const announcementsSupported = available.has("announcements")
  const announcementTitles = db.prepare("SELECT title FROM study_notices ORDER BY id DESC LIMIT 5").all().map(row=>String(row.title))

  if (announcementsSupported) {
    for (const row of read("announcements")) {
      const important = get(row, ["isImportant", "important"])

      if (important !== null && !flag(important)) continue

      const title = str(get(row, ["title", "text", "message"]))

      if (title) announcementTitles.push(title)
    }
  }

  return {
    today,
    lessons,
    tasks: {
      open: open.length,
      overdue,
      upcoming,
      attention,
    },
    subjects: subjectCards,
    debts: {
      supported: Boolean(debtFlag || debtTable),
      tasks: debtTasks,
      subjects:db.prepare("SELECT id,title FROM subject_debts WHERE closedAt IS NULL ORDER BY id").all().map(d=>({id:Number(d.id),title:String(d.title)})),
    },
    announcements: {
      supported: true,
      titles: announcementTitles.slice(0, 5),
    },
    events: events.slice(0, 6),
    weekly: {
      total: dueThisWeek.length,
      completed: dueThisWeek.filter(task => task.complete).length,
    },
  }
}
