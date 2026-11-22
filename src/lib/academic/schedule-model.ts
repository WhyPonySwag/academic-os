import type { RecordKey } from "./model"

export const subgroups = ["Вся группа", "I", "II"] as const
export const lessonStatuses = ["Запланировано", "Отменено", "Перенесено"] as const
export type LessonFields = {
  substitute?: string; subjectId: number; teacher: string; date: string; pair: number; startTime: string; endTime: string
  room: string; subgroup: typeof subgroups[number]; lessonType: string; status: typeof lessonStatuses[number]
  movedDate: string | null; movedPair: number | null; movedStart: string | null; movedEnd: string | null; notes: string
}
export type Lesson = LessonFields & RecordKey & { subject: string }

export function offsetDay(day: string, offset: number) {
  const date = new Date(day + "T12:00:00Z")
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}
export function monday(day: string) {
  return offsetDay(day, -((new Date(day + "T12:00:00Z").getUTCDay() + 6) % 7))
}

export function slotsOn(day: string, lessons: Lesson[]) {
  return lessons.filter(l => l.date === day || l.movedDate === day).map(lesson => {
    const destination = lesson.movedDate === day
    return { lesson, destination, start: destination ? lesson.movedStart! : lesson.startTime,
      end: destination ? lesson.movedEnd! : lesson.endTime, pair: destination ? lesson.movedPair! : lesson.pair }
  }).sort((a, b) => a.start.localeCompare(b.start) || a.pair - b.pair || a.lesson.id - b.lesson.id)
}
