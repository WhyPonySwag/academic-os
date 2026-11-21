export const statuses = ["Не выяснено", "Не начато", "В процессе", "На проверке", "Принято", "Требует доработки"] as const
export const priorities = ["Низкий", "Обычный", "Высокий", "Срочный"] as const

export type RecordKey = { id: number; revision: number }
type SavedRecord = RecordKey & { createdAt: string; updatedAt: string }

export type Subject = SavedRecord & {
  title: string
  semester: number
  teacher: string
  assessment: string
  credits: number | null
  notes: string
}

export type Task = SavedRecord & {
  subjectId: number
  title: string
  description: string
  status: typeof statuses[number]
  priority: typeof priorities[number]
  deadline: string | null
  issuedOn: string | null
  notes: string
}

export type SubjectOption = Pick<Subject, "id" | "title" | "semester">
export type ActionResult = { error?: string }

export function displayDate(value: string | null) {
  return value ? value.split("-").reverse().join(".") : "Не указан"
}
