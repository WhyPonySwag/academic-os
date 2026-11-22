import { EntryForm } from "@/components/study/entry-form"
import { addEvent } from "@/app/register-actions"
import { eventKinds } from "@/lib/academic/register"
import { Suspense } from "react"
import Link from "next/link"
import { BookOpen, ChevronLeft, ChevronRight, Flag } from "lucide-react"
import { calendarMonth } from "@/lib/academic/calendar"
import { displayDate } from "@/lib/academic/model"
import { slotsOn, offsetDay, monday } from "@/lib/academic/schedule-model"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export const metadata = { title: "Календарь" }
const filters = { all: "Все события", lessons: "Только занятия", tasks: "Только задания" } as const
const format = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("ru-RU", { ...options, timeZone: "UTC" }).format(new Date(date + "T12:00:00Z"))

async function Month({ searchParams }: PageProps<"/calendar">) {
  const params = await searchParams
  const { selected, today, first, previous, next, days, lessons, tasks, events } = await calendarMonth(params.date)
  const filter = params.filter === "lessons" || params.filter === "tasks" ? params.filter : "all"
  const group = params.group === "I" || params.group === "II" ? params.group : ""
  const url = (date: string, mode: string = filter) => `/calendar?date=${date}&filter=${mode}${group ? "&group="+group : ""}`
  const cells = Array.from({length:days}, (_, i) => {
    const date = offsetDay(first,i)
    return { date, events:filter === "all" ? events.filter(e=>e.day===date) : [], lessons: filter === "tasks" ? [] : slotsOn(date, lessons.filter(l => !group || l.subgroup === group || l.subgroup === "Вся группа")),
      tasks: filter === "lessons" ? [] : tasks.filter(task => task.deadline === date) }
  })
  const day = cells[Number(selected.slice(-2)) - 1]
  const blank = (new Date(first + "T12:00:00Z").getUTCDay() + 6) % 7
  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-2 border-b pb-3"><h1 className="page-title">Календарь</h1>
      <EntryForm title="Добавить событие" action={addEvent} fields={[{name:"title",label:"Название события"},
        {name:"kind",label:"Вид события",options:eventKinds.map(label=>({value:label,label}))},{name:"day",label:"Дата события",type:"date",initial:selected}]}/></header>
    {group && <p className="text-sm">Подгруппа {group} · <Link className="underline" href={`/calendar?date=${selected}&filter=${filter}`}>Показать все</Link></p>}
    <nav aria-label="Фильтр событий" className="flex flex-wrap gap-1">{Object.entries(filters).map(([key,label]) =>
      <Link key={key} aria-current={key === filter ? "true" : undefined} href={url(selected,key)} scroll={false}
        className={buttonVariants({ variant:key === filter ? "secondary" : "ghost", size:"sm" })}>{label}</Link>)}</nav>
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(16rem,1fr)]">
      <Card className="min-w-0 gap-4 px-2 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold first-letter:uppercase">{format(first,{month:"long",year:"numeric"})}</h2>
          <div className="flex items-center gap-1">
            {previous >= "0002" && <Link aria-label="Предыдущий месяц" href={url(previous)} className={buttonVariants({variant:"outline",size:"icon"})}><ChevronLeft /></Link>}
            <Link href={url(today)} className={buttonVariants({variant:"outline"})}>Сегодня</Link>
            {next < "9999" && <Link aria-label="Следующий месяц" href={url(next)} className={buttonVariants({variant:"outline",size:"icon"})}><ChevronRight /></Link>}
          </div>
        </div>
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">
          {["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map(w => <span key={w} className="bg-muted py-2 text-center text-xs text-muted-foreground">{w}</span>)}
          {Array.from({length:blank},(_,i) => <div key={i} className="bg-background" />)}
          {cells.map((c,i) => <Link key={c.date} scroll={false} href={url(c.date)} aria-current={c.date === today ? "date" : undefined}
            aria-label={`${displayDate(c.date)}. Занятий: ${c.lessons.length}. Заданий: ${c.tasks.length}`}
            className={`min-h-16 min-w-0 p-1 hover:bg-muted sm:min-h-20 sm:p-2 ${c.date === selected ? "bg-accent ring-1 ring-primary ring-inset" : "bg-card"}`}>
            <span className={`inline-grid size-6 place-items-center rounded-full text-xs font-medium ${c.date === today ? "border border-primary bg-accent font-bold text-foreground" : ""}`}>{i+1}</span>
            <span className="mt-1 flex flex-wrap gap-1 text-[10px]">
              {!!c.lessons.length && <span className="inline-flex items-center gap-0.5 text-primary"><BookOpen size={12}/>{c.lessons.length}</span>}
              {!!c.events.length && <span className="text-xs text-foreground">◆ {c.events.length}</span>}
              {!!c.tasks.length && <span className="inline-flex items-center gap-0.5 text-muted-foreground"><Flag size={12}/>{c.tasks.length}</span>}
            </span>
          </Link>)}
          {Array.from({length:(7-(blank+days)%7)%7},(_,i) => <div key={"end"+i} className="bg-background" />)}
        </div>
        <p className="flex items-center gap-2 text-xs text-muted-foreground"><BookOpen size={14} className="text-primary"/>Занятия <Flag size={14} className="ml-2 text-muted-foreground"/>Дедлайны</p>
      </Card>
      <Card className="min-w-0 gap-3 px-4">
        <h2 className="text-lg font-semibold first-letter:uppercase">{format(selected,{weekday:"long",day:"numeric",month:"long"})}</h2>
        {!day.lessons.length && !day.tasks.length && !day.events.length && <p className="text-sm text-muted-foreground">Нет событий на выбранную дату.</p>}
        {day.lessons.map(({lesson:l,destination,start,end,pair}) => <details key={l.id} className="border-t pt-3 text-sm">
          <summary className="cursor-pointer wrap-anywhere"><BookOpen className="mx-1 inline size-4 text-primary"/> {start} · {l.subject} <span className="text-muted-foreground">· {l.status}</span></summary>
          <div className="mt-3 space-y-2 wrap-anywhere">
            <p>Пара {pair} · {start}–{end} · {l.lessonType}</p>
            <p>{l.substitute ? l.substitute + ' (замена)' : l.teacher} · ауд. {l.room} · {l.subgroup === "Вся группа" ? l.subgroup : "Подгруппа " + l.subgroup}</p>
            {l.status === "Перенесено" && <p>{destination ? `Перенесено с ${displayDate(l.date)}, ${l.startTime}–${l.endTime}` : `Перенесено на ${displayDate(l.movedDate)}, ${l.movedStart}–${l.movedEnd}`}</p>}
            <Link className="text-primary underline" href={`/schedule?week=${monday(selected)}#lesson-${l.id}-${selected}`}>Занятие в расписании</Link>
          </div>
        </details>)}
        {day.events.map(e => <div className="border-t pt-2 text-sm" key={"event"+e.id}><strong>{String(e.title)}</strong><p className="text-xs text-muted-foreground">{String(e.kind)}{e.outcome ? " · "+e.outcome : ""}</p></div>)}
        {day.tasks.map(t => <details key={"task"+t.id} className="border-t pt-3 text-sm">
          <summary className="cursor-pointer wrap-anywhere"><Flag className="mx-1 inline size-4 text-muted-foreground"/> {t.title}</summary>
          <div className="mt-3 space-y-2 wrap-anywhere"><p>{t.subject}</p><p>Дедлайн: {displayDate(t.deadline)}</p><p>Статус: {t.status}</p><p>Приоритет: {t.priority}</p>
            <Link className="text-primary underline" href={`/tasks?task=${t.id}`}>Карточка задания</Link></div>
        </details>)}
      </Card>
    </div>
  </div>
}

export default function Page(props: PageProps<"/calendar">) {
  return <Suspense fallback={<h1 className="page-title">Календарь</h1>}><Month {...props} /></Suspense>
}
