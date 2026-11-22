"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  ListTodo,
  Megaphone,
  RefreshCw,
} from "lucide-react"

import { LocalClock } from "@/components/local-clock"
import { Button } from "@/components/ui/button"
import type {
  DashboardData,
  DashboardTask,
} from "@/lib/academic/home-dashboard"

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`))
}

function Panel({
  title,
  href,
  children,
}: {
  title: string
  href: string
  children: React.ReactNode
}) {
  return (
    <section aria-label={title} data-slot="card" className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
        <Link
          href={href}
          aria-label={`Открыть раздел: ${title}`}
          className="grid size-8 shrink-0 place-items-center rounded-md text-primary hover:bg-accent hover:text-foreground"
        >
          <ArrowUpRight size={17} />
        </Link>
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm leading-relaxed text-muted-foreground">
      {children}
    </p>
  )
}

function TaskList({ tasks }: { tasks: DashboardTask[] }) {
  if (!tasks.length) {
    return <Empty>Нет заданий для отображения.</Empty>
  }

  return (
    <div className="space-y-2">
      {tasks.map(task => (
        <Link
          key={task.id}
          href={`/tasks?task=${task.id}`}
          aria-label={task.title}
          className="flex items-start justify-between gap-3 rounded-lg p-2 hover:bg-accent"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium wrap-anywhere text-foreground">{task.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {task.subject} · {task.status} · {task.priority}
              {task.steps > 0 && <span className="ml-2 tabular-nums">{task.done} из {task.steps}</span>}
            </p>
          </div>
          <span className="shrink-0 text-xs text-primary">
            {task.due ? dateLabel(task.due) : "Без срока"}
          </span>
        </Link>
      ))}
    </div>
  )
}

export function HomeDashboard({ data }: { data: DashboardData }) {
  const router = useRouter()
  const [subgroup, setSubgroup] = useState("Все")

  const visibleLessons = data.lessons.filter(lesson =>
    subgroup === "Все" ||
    lesson.subgroup === subgroup ||
    lesson.subgroup === "Вся группа"
  )

  const percent = data.weekly.total > 0
    ? Math.round(
        data.weekly.completed / data.weekly.total * 100
      )
    : null

  const stats = [
    {
      name: "Занятия сегодня",
      value: data.lessons.filter(lesson =>
        lesson.status !== "Отменено" &&
        !(lesson.status === "Перенесено" &&
          lesson.occurrence === "original")
      ).length,
      href: "/schedule",
      icon: CalendarDays,
    },
    {
      name: "Незавершённые работы",
      value: data.tasks.open,
      href: "/tasks?view=unfinished",
      icon: ListTodo,
    },
    {
      name: "Просроченные работы",
      value: data.tasks.overdue.length,
      href: "/tasks",
      icon: AlertCircle,
    },
    {
      name: "Академические долги",
      value: data.debts.supported
        ? data.debts.tasks.length
        : "—",
      href: "/tasks?debt=1",
      icon: GraduationCap,
    },
  ]

  return (
    <div className="w-full min-w-0 space-y-4">
      <header className="dashboard-header flex flex-wrap items-center justify-between gap-4 rounded-xl border px-5 py-6 sm:px-7">
        <div>
          <h1 className="page-title">
            Учебный обзор
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <time dateTime={data.today}>{new Intl.DateTimeFormat("ru-RU", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            }).format(new Date(`${data.today}T12:00:00Z`))}</time>
            <LocalClock />
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.refresh()}
        >
          <RefreshCw size={14} />
          Обновить данные
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(item => {
          const Icon = item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
              className="min-w-0 rounded-xl border border-border bg-card p-4 transition-colors duration-150 hover:border-primary/50 hover:bg-secondary"
            >
              <div className="mb-4 flex items-center justify-between">
                <Icon size={18} className="text-primary" />
                <ArrowUpRight size={14} className="text-muted-foreground" />
              </div>
              <p className="text-3xl font-medium tracking-tight text-foreground tabular-nums">
                {item.value}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {item.name}
              </p>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Panel title="Занятия сегодня" href="/schedule">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              Подгруппа
            </span>
            <select
              aria-label="Фильтр подгруппы"
              value={subgroup}
              onChange={event => setSubgroup(event.target.value)}
              className="rounded-lg border border-input bg-secondary px-3 py-2 text-xs text-foreground"
            >
              <option value="Все">Все занятия</option>
              <option value="I">Подгруппа I</option>
              <option value="II">Подгруппа II</option>
            </select>
          </div>

          {visibleLessons.length === 0 ? (
            <Empty>На сегодня занятий нет.</Empty>
          ) : (
            <div className="space-y-2">
              {visibleLessons.map(lesson => (
                <Link
                  key={`${lesson.id}-${lesson.occurrence}`}
                  href={`/schedule?week=${data.today}#lesson-${lesson.id}-${data.today}`}
                  className="flex gap-3 rounded-lg border border-border bg-secondary/50 p-3 hover:bg-accent"
                >
                  <div className="w-20 shrink-0 text-xs font-semibold text-primary">
                    {lesson.start}
                    <p className="mt-1 font-normal text-muted-foreground">
                      {lesson.end}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {lesson.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {lesson.room || "Аудитория не указана"}
                      {lesson.subgroup !== "Вся группа"
                        ? ` · ${lesson.subgroup}`
                        : ""}
                    </p>
                    {lesson.teacher && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {lesson.teacher}
                      </p>
                    )}
                    {lesson.status !== "Запланировано" && (
                      <p className="mt-1 text-xs text-primary">
                        {lesson.status === "Перенесено" &&
                        lesson.occurrence === "original"
                          ? "Перенесено с этого времени"
                          : lesson.status}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Ближайшие дедлайны" href="/tasks">
          <TaskList tasks={data.tasks.upcoming} />
          <div className="mt-4 border-t border-border pt-3">
            <Link href="/tasks" className="text-xs text-primary">
              Показать задания
            </Link>
          </div>
        </Panel>

        <Panel title="Просроченные работы" href="/tasks">
          {data.tasks.overdue.length === 0 ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 size={17} className="text-success" />
              <Empty>Просроченных заданий с известным сроком нет.</Empty>
            </div>
          ) : (
            <TaskList tasks={data.tasks.overdue.slice(0, 5)} />
          )}
        </Panel>

        <Panel title="Задания без срока" href="/tasks">
          <TaskList tasks={data.tasks.attention} />
        </Panel>

        <Panel title="Учебные события" href="/calendar">
          {data.events.length === 0 ? (
            <Empty>
              Предстоящие экзамены, зачёты и другие события пока не зарегистрированы.
            </Empty>
          ) : (
            <div className="space-y-3">
              {data.events.map((event, index) => (
                <Link
                  key={`${event.id}-${index}`}
                  href="/calendar"
                  className="flex items-center justify-between gap-3 text-sm hover:text-primary"
                >
                  <span className="min-w-0 text-foreground">
                    {event.title}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {event.type}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-primary">
                    {dateLabel(event.date)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Прогресс недели" href="/tasks">
          <div className="flex items-end justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Выполнено из заданий со сроком на эту неделю
            </p>
            <strong className="text-2xl text-foreground">
              {percent === null ? "—" : `${percent}%`}
            </strong>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${percent ?? 0}%` }}
            />
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            {data.weekly.total
              ? `${data.weekly.completed} из ${data.weekly.total} выполнено`
              : "На эту неделю заданий с известным сроком нет."}
          </p>
        </Panel>

        <Panel title="Академические задолженности" href="/tasks?debt=1">
          {!data.debts.supported ? (
            <Empty>
              Учёт подтверждённых задолженностей пока не подключён
              к этой версии базы данных.
            </Empty>
          ) : data.debts.tasks.length === 0 ? (
            <Empty>Подтверждённых незакрытых задолженностей нет.</Empty>
          ) : (
            <TaskList tasks={data.debts.tasks.slice(0, 5)} />
          )}
        </Panel>

        <Panel title="Важные объявления" href="/calendar">
          {!data.announcements.supported ? (
            <Empty>
              Источник учебных объявлений ещё не подключён.
            </Empty>
          ) : data.announcements.titles.length === 0 ? (
            <Empty>Важных объявлений пока нет.</Empty>
          ) : (
            <div className="space-y-3">
              {data.announcements.titles.map((title, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-sm text-foreground"
                >
                  <Megaphone
                    size={16}
                    className="mt-0.5 shrink-0 text-primary"
                  />
                  {title}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Обзор дисциплин" href="/subjects">
        <p className="mb-3 text-xs tabular-nums text-muted-foreground">Предметов: {data.subjects.length}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {data.subjects.map(subject => (
            <Link
              key={subject.id}
              href={`/subjects?subject=${subject.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 hover:bg-accent"
            >
              <div className="flex min-w-0 items-center gap-2">
                <BookOpen
                  size={16}
                  className="shrink-0 text-primary"
                />
                <span className="min-w-0 text-sm wrap-anywhere text-foreground">
                  {subject.title}
                </span>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground" title="Незавершённые / всего">
                {subject.open} / {subject.total}
              </span>
            </Link>
          ))}
        </div>

        {data.subjects.length === 0 && (
          <Empty>Дисциплины ещё не добавлены.</Empty>
        )}
      </Panel>

    </div>
  )
}
