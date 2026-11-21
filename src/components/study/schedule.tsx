"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useSyncExternalStore } from "react"
import { ChevronLeft, ChevronRight, FileInput, Plus } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { deleteLesson } from "@/app/schedule/actions"
import { displayDate, type SubjectOption } from "@/lib/academic/model"
import { monday, offsetDay, slotsOn, type Lesson } from "@/lib/academic/schedule-model"
import { Field, RecordPanel, selectStyle } from "./record-panel"
import { ImportPanel } from "./import-panel"
import { LessonEditor } from "./lesson-editor"

type Panel = { mode: "view"; lesson: Lesson } | { mode: "import" } | { mode: "edit"; lesson?: Lesson } | { mode: "delete"; lesson: Lesson }
const weekdays = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"]

const preference = "academic-os.schedule.subgroup"
const serverValue = () => ""
function readGroup() {
  try { const value = localStorage.getItem(preference); return value === "I" || value === "II" ? value : "" } catch { return "" }
}
function subscribe(update: () => void) {
  window.addEventListener("storage", update)
  window.addEventListener("hashchange", update)
  return () => { window.removeEventListener("storage", update); window.removeEventListener("hashchange", update) }
}

export function Schedule({ week, today, lessons, subjects, groupParam, dayParam }: {
  week: string; today: string; lessons: Lesson[]; subjects: SubjectOption[]; groupParam?: string; dayParam: string
}) {
  const router = useRouter()
  const [panel, setPanel] = useState<Panel | null>(null)
  const close = () => setPanel(null)
  const stored = useSyncExternalStore(subscribe, readGroup, serverValue)
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, serverValue)
  const anchor = /^#lesson-(\d+)-(\d{4}-\d{2}-\d{2})$/.exec(hash)
  const linked = anchor && lessons.find(l => l.id === Number(anchor[1]) && (l.date === anchor[2] || l.movedDate === anchor[2]))
  const dates = weekdays.map((_, i) => offsetDay(week,i))
  const requested = linked && anchor ? anchor[2] : dayParam
  const day = dates.includes(requested) ? requested : dates.includes(today) ? today : week
  const preferred = groupParam ?? stored
  const group = linked && linked.subgroup !== "Вся группа" && linked.subgroup !== preferred ? "" : preferred
  const entries = slotsOn(day, lessons.filter(l => !group || l.subgroup === group || l.subgroup === "Вся группа"))
  function url(weekStart: string, date?: string, subgroup = groupParam) {
    const params = new URLSearchParams({ week: weekStart })
    if (date) params.set("day", date)
    if (subgroup !== undefined) params.set("group",subgroup)
    return "/schedule?" + params
  }
  function changeGroup(value: string) {
    try { localStorage.setItem(preference,value) } catch { /* The URL also retains the selection. */ }
    router.replace(url(week,day,value), {scroll:false})
  }
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="page-title">Расписание</h1>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setPanel({ mode: "import" })}><FileInput />Импорт JSON</Button>
        {subjects.length > 0 && <Button onClick={() => setPanel({ mode: "edit" })}><Plus />Добавить занятие</Button>}
      </div>
    </div>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">{displayDate(week)} — {displayDate(offsetDay(week,6))}</p>
        <div className="flex items-center gap-1">
          <Link href={url(offsetDay(week,-7))} aria-label="Предыдущая неделя" className={buttonVariants({ variant: "outline", size: "icon" })}><ChevronLeft /></Link>
          <Link href={url(monday(today))} className={buttonVariants({ variant: "outline" })}>Текущая неделя</Link>
          <Link href={url(offsetDay(week,7))} aria-label="Следующая неделя" className={buttonVariants({ variant: "outline", size: "icon" })}><ChevronRight /></Link>
        </div>
      </div>
      <Field label="Фильтр по подгруппе"><select value={group} className={selectStyle} onChange={e => changeGroup(e.target.value)}>
        <option value="">Все занятия</option><option value="I">I подгруппа</option><option value="II">II подгруппа</option>
      </select></Field>
    </div>
    {!subjects.length && <p className="text-sm text-muted-foreground">Для первого занятия <Link className="text-primary underline" href="/subjects">добавьте предмет</Link> или загрузите данные из JSON.</p>}
    <nav aria-label="Дни недели" className="grid grid-cols-7 gap-1 rounded-xl border bg-card p-1">
      {dates.map((date,i) => <Link key={date} href={url(week,date)} scroll={false} aria-current={day === date ? "date" : undefined}
        aria-label={weekdays[i] + " " + displayDate(date)} className={`rounded-lg py-2 text-center text-xs hover:bg-muted ${day === date ? "bg-muted text-primary" : "text-muted-foreground"}`}>
        <span className="block">{["Пн","Вт","Ср","Чт","Пт","Сб","Вс"][i]}</span><span className="text-base font-semibold">{Number(date.slice(-2))}</span>
      </Link>)}
    </nav>
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{weekdays[dates.indexOf(day)]} <span className="text-sm font-normal text-muted-foreground">{displayDate(day)}</span></h2>
      <Card className="gap-0 divide-y py-0">
        {!entries.length && <p className="p-4 text-sm text-muted-foreground">Нет занятий</p>}
        {entries.map(({lesson:l,pair,start,end}) => <button key={l.id} id={`lesson-${l.id}-${day}`} onClick={() => setPanel({mode:"view",lesson:l})}
          className="grid w-full grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 px-3 py-2.5 text-left text-sm hover:bg-muted focus-visible:outline-primary sm:grid-cols-[4rem_6.5rem_minmax(0,1fr)_auto]">
          <span className="text-xs text-muted-foreground">Пара {pair}</span>
          <span className="col-start-1 row-start-2 text-xs tabular-nums sm:col-auto sm:row-auto">{start}–{end}</span>
          <span className="col-start-2 row-start-1 font-medium wrap-anywhere sm:col-auto sm:row-auto">{l.subject} {l.subgroup !== "Вся группа" && <Badge variant="secondary">{l.subgroup}</Badge>}
            {l.status !== "Запланировано" && <span className="ml-1 text-xs text-primary">{l.status}</span>}</span>
          <span className="text-xs wrap-anywhere text-muted-foreground">ауд. {l.room}</span>
        </button>)}
      </Card>
    </section>
    {panel?.mode === "view" && <RecordPanel title={panel.lesson.subject} close={close}>
      <p>{displayDate(day)} · Пара {day === panel.lesson.movedDate ? panel.lesson.movedPair : panel.lesson.pair} · {day === panel.lesson.movedDate ? panel.lesson.movedStart + "–" + panel.lesson.movedEnd : panel.lesson.startTime + "–" + panel.lesson.endTime}</p>
      <p className="wrap-anywhere">{panel.lesson.teacher} · {panel.lesson.lessonType} · ауд. {panel.lesson.room}</p>
      <p>{panel.lesson.subgroup === "Вся группа" ? "Вся группа" : "Подгруппа " + panel.lesson.subgroup} · {panel.lesson.status}</p>
      {panel.lesson.status === "Перенесено" && <p className="text-primary">{day === panel.lesson.movedDate
        ? `Перенесено с ${displayDate(panel.lesson.date)}, ${panel.lesson.startTime}–${panel.lesson.endTime}, пара ${panel.lesson.pair}`
        : `Перенесено на ${displayDate(panel.lesson.movedDate)}, ${panel.lesson.movedStart}–${panel.lesson.movedEnd}, пара ${panel.lesson.movedPair}`}</p>}
      {panel.lesson.notes && <p className="whitespace-pre-wrap wrap-anywhere">{panel.lesson.notes}</p>}
      <div className="flex flex-wrap gap-2">
        <Link className={buttonVariants({variant:"outline"})} href={`/subjects?subject=${panel.lesson.subjectId}`} onClick={close}>К предмету</Link>
        <Link className={buttonVariants({variant:"outline"})} href={`/tasks?subject=${panel.lesson.subjectId}`} onClick={close}>Задания предмета</Link>
        <Button onClick={() => setPanel({mode:"edit",lesson:panel.lesson})}>Изменить</Button>
        <Button variant="ghost" onClick={() => setPanel({mode:"delete",lesson:panel.lesson})}>Удалить</Button>
      </div>
    </RecordPanel>}
    {panel?.mode === "import" && <ImportPanel close={close} />}
    {panel?.mode === "edit" && <LessonEditor lesson={panel.lesson} subjects={subjects} date={day} close={close}
      onSaved={date => { if (date !== day) router.push(url(monday(date),date)) }} />}
    {panel?.mode === "delete" && <RecordPanel title="Удалить занятие?" close={close} destructive submit={() => deleteLesson({id:panel.lesson.id,revision:panel.lesson.revision})}>
      <p>{panel.lesson.subject} · {displayDate(panel.lesson.date)} · пара {panel.lesson.pair}</p>
    </RecordPanel>}
  </div>
}
