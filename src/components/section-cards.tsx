import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { sections } from "@/lib/sections"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { academicOverview } from "@/lib/academic/queries"
import { displayDate } from "@/lib/academic/model"

const overview = [
  { section: "schedule", title: "Занятия сегодня", message: "На сегодня занятий нет", detail: "Время и аудитории появятся в расписании." },
  { section: "tasks", title: "Ближайшие задания", message: "Ближайших сроков нет", detail: "Здесь появятся непринятые работы с известной датой сдачи." },
  { section: "calendar", title: "Предстоящие события", message: "Событий пока нет", detail: "Здесь появятся ближайшие даты из календаря." },
  { section: "subjects", title: "Учебные дисциплины", message: "", detail: "Перейти к списку предметов" },
] as const

export async function SectionCards() {
  const { count, upcoming, todayLessons, works, disciplines } = await academicOverview()
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {overview.filter(c=>c.section!=="calendar").map(({ section, title, message, detail }) => {
        const { href, icon: Icon } = sections[section]
        return (
          <Card key={section} className="relative gap-0 p-0 transition-colors hover:ring-foreground/25">
            <CardHeader className="flex items-center gap-3 px-5 py-4 sm:px-6">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg border bg-secondary text-primary">
                <Icon aria-hidden className="size-[19px]" strokeWidth={1.65} />
              </span>
              <h2 className="text-base font-semibold tracking-tight">
                <Link href={href} className="after:absolute after:inset-0 after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-primary">
                  {title}
                </Link>
              </h2>
              <ArrowUpRight aria-hidden className="ml-auto size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="mx-5 border-t px-0 pt-4 pb-5 sm:mx-6">
              {section === "schedule" && todayLessons.length > 0 ? <ul className="space-y-2">
                {todayLessons.map(({ lesson, start }) => <li key={lesson.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="wrap-anywhere">{lesson.subject}<span className="block text-xs text-muted-foreground">{lesson.status} · ауд. {lesson.room} · {lesson.subgroup}</span></span>
                  <span className="tabular-nums">{start}</span>
                </li>)}
              </ul> : section === "tasks" && upcoming.length > 0 ? <ul className="relative space-y-2">
                {upcoming.map(task => <li key={task.id}>
                  <Link className="flex items-baseline justify-between gap-3 text-sm hover:text-primary" href={`/tasks?task=${task.id}`}>
                    <span className="min-w-0 wrap-anywhere">{task.title}<span className="block text-xs text-muted-foreground">{task.subject}</span></span>
                    <time dateTime={task.deadline} className="shrink-0 text-xs tabular-nums">{displayDate(task.deadline)}</time>
                  </Link>
                </li>)}
              </ul> : <>
                {section === "subjects" && <ul className="relative mb-2 space-y-1">{disciplines.map(s=><li key={s.id}><Link href={`/subjects?subject=${s.id}`} className="hover:text-primary">{s.title}</Link></li>)}</ul>}
                <p className="text-sm font-medium">{section === "subjects" ? `Предметов: ${count}` : message}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{detail}</p>
              </>}
            </CardContent>
          </Card>
        )
      })}
      {[
        {title:"Требуют внимания",list:works.filter(w=>w.attention),href:"/tasks?view=attention"},
        {title:"Незавершённые работы",list:works.filter(w=>w.unfinished),href:"/tasks?view=unfinished"},
        {title:"Подтверждённые задолженности",list:works.filter(w=>w.debt),href:"/tasks?debt=1"},
      ].map(({title,list,href})=><Card key={title}><CardHeader><h2 className="font-semibold"><Link href={href}>{title} · {list.length}</Link></h2></CardHeader>
        <CardContent>{list.length ? <ul className="space-y-2">{list.slice(0,5).map(w=><li key={w.id}><Link className="hover:text-primary" href={`/tasks?task=${w.id}`}>{w.title}</Link>{w.steps>0 && <span className="ml-2 text-xs text-muted-foreground">{w.done} из {w.steps}</span>}</li>)}</ul> : <p className="text-sm text-muted-foreground">Работ нет</p>}</CardContent>
      </Card>)}
    </div>
  )
}
