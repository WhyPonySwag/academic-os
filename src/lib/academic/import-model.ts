export const importGroups = { subjects: "Предметы", tasks: "Задания", lessons: "Занятия" } as const
export type Group = keyof typeof importGroups
export type ImportRow = { group: Group; index: number; title: string; reason?: string }
export type ImportResult = { error: string } | { rows: ImportRow[]; token: string; saved: boolean }
export const maxJsonBytes = 256 * 1024
