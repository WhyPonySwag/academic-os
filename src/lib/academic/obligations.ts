import type { Task } from "./model"

export const categories = ["Telegram","VK","Учебный документ","Методичка","Преподаватель","Личная запись","Другое"] as const
export type Step = { id: string; title: string; done: boolean }
export type Source = { reference: string; kind: string; category: string; label: string; link: string; sourceDate: string; confirmed: boolean }
export type Work = Task & { debt: number; attachments: {id:number;title:string}[]; steps: Step[]; sources: Source[]; history: {at:string;change:string}[] }

export function progress(steps: Step[]) {
  return steps.length ? `${steps.filter(s => s.done).length} из ${steps.length}` : "Этапов нет"
}
export function publicLink(value: string) {
  try { const url = new URL(value); return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.href : null } catch { return null }
}
