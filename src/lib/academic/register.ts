export const eventKinds = ["Контрольная", "Экзамен", "Проектная защита", "Личное событие", "Зачёт"] as const
export const resultKinds = ["Оценка", "Зачёт", "Итог"] as const
export type Choice = { id: number; title: string }
export type RegisterAction = (form: FormData) => Promise<{ error?: string }>
