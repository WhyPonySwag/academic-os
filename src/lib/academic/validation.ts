import "server-only"
import { z } from "zod"
import { priorities, statuses } from "./model"

const text = (limit: number) => z.string().trim().max(limit, `Максимальная длина — ${limit} символов.`)
const title = text(200).min(1, "Введите название.")
const id = z.string().regex(/^[1-9]\d*$/, "Некорректный идентификатор.").transform(Number).pipe(z.int().positive())
const date = z.union([z.literal("").transform(() => null), z.iso.date({ error: "Проверьте дату." })])

export const keySchema = z.object({ id: z.int().positive(), revision: z.int().positive() })
export const subjectSchema = z.object({
  title,
  semester: z.string().regex(/^[1-9]\d*$/, "Введите целый положительный номер семестра.").transform(Number).pipe(z.int().positive()),
  teacher: text(200), assessment: text(200), notes: text(10000),
  credits: z.union([z.literal("").transform(() => null),
    z.string().regex(/^\d+([.,]\d+)?$/, "Введите неотрицательное число ЗЕТ.").transform(v => Number(v.replace(",", "."))).pipe(z.number().nonnegative())]),
})
export const taskSchema = z.object({
  title, subjectId: id, description: text(10000), notes: text(10000),
  status: z.enum(statuses, { error: "Выберите статус из списка." }).default("Не выяснено"),
  priority: z.enum(priorities, { error: "Выберите приоритет из списка." }).default("Обычный"),
  deadline: date, issuedOn: date,
})
