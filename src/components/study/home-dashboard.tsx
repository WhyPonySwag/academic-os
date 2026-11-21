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
  Clock3,
  GraduationCap,
  ListTodo,
  Megaphone,
  RefreshCw,
} from "lucide-react"

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
    <section className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#1b1d20]">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <Link
          href={href}
          aria-label={`Открыть раздел: ${title}`}
          className="text-[#ddb588] hover:text-white"
        >
          <ArrowUpRight size={17} />
        </Link>
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm leading-relaxed text-[#a2a4aa]">
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
          href="/tasks"
          className="flex items-start justify-between gap-3 rounded-lg p-2 hover:bg-white/5"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">{task.title}</p>
            <p className="mt-1 text-xs text-[#9ca0a7]">
              {task.subject} · {task.status}
            </p>
          </div>
          <span className="shrink-0 text-xs text-[#ddb588]">
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
      href: "/tasks",
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
      href: "/tasks",
      icon: GraduationCap,
    },
  ]

  return (
    <div className="mx-auto w-full max-w-[1250px] space-y-6 px-4 py-8 sm:px-8 lg:py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-medium tracking-wider text-[#ddb588]">
            ACADEMIC OS / WORKSPACE
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Учебный обзор
          </h1>
          <p className="mt-2 text-sm text-[#a2a4aa]">
            {new Intl.DateTimeFormat("ru-RU", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            }).format(new Date(`${data.today}T12:00:00Z`))}
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.refresh()}
          className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-white hover:bg-white/5"
        >
          <RefreshCw size={14} />
          Обновить данные
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(item => {
          const Icon = item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
              className="rounded-xl border border-white/10 bg-[#1b1d20] p-4 hover:border-[#ddb588]/50"
            >
              <div className="mb-4 flex items-center justify-between">
                <Icon size={18} className="text-[#ddb588]" />
                <ArrowUpRight size={14} className="text-[#8a8d94]" />
              </div>
              <p className="text-3xl font-semibold text-white">
                {item.value}
              </p>
              <p className="mt-2 text-xs text-[#a2a4aa]">
                {item.name}
              </p>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Занятия сегодня" href="/schedule">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="text-xs text-[#9ca0a7]">
              Подгруппа
            </span>
            <select
              aria-label="Фильтр подгруппы"
              value={subgroup}
              onChange={event => setSubgroup(event.target.value)}
              className="rounded-lg border border-white/10 bg-[#25272a] px-3 py-2 text-xs text-white"
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
                  href="/schedule"
                  className="flex gap-3 rounded-lg border border-white/5 bg-white/[0.025] p-3 hover:bg-white/5"
                >
                  <div className="w-20 shrink-0 text-xs font-semibold text-[#ddb588]">
                    {lesson.start}
                    <p className="mt-1 font-normal text-[#a2a4aa]">
                      {lesson.end}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">
                      {lesson.title}
                    </p>
                    <p className="mt-1 text-xs text-[#a2a4aa]">
                      {lesson.room || "Аудитория не указана"}
                      {lesson.subgroup !== "Вся группа"
                        ? ` · ${lesson.subgroup}`
                        : ""}
                    </p>
                    {lesson.teacher && (
                      <p className="mt-1 text-xs text-[#a2a4aa]">
                        {lesson.teacher}
                      </p>
                    )}
                    {lesson.status !== "Запланировано" && (
                      <p className="mt-1 text-xs text-[#ddb588]">
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
          <div className="mt-4 border-t border-white/10 pt-3">
            <Link href="/tasks" className="text-xs text-[#ddb588]">
              Показать задания
            </Link>
          </div>
        </Panel>

        <Panel title="Просроченные работы" href="/tasks">
          {data.tasks.overdue.length === 0 ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 size={17} className="text-emerald-400" />
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
                  className="flex items-center justify-between gap-3 text-sm hover:text-[#ddb588]"
                >
                  <span className="min-w-0 text-white">
                    {event.title}
                    <span className="ml-2 text-xs text-[#9ca0a7]">
                      {event.type}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-[#ddb588]">
                    {dateLabel(event.date)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Прогресс недели" href="/tasks">
          <div className="flex items-end justify-between gap-3">
            <p className="text-sm text-[#a2a4aa]">
              Выполнено из заданий со сроком на эту неделю
            </p>
            <strong className="text-2xl text-white">
              {percent === null ? "—" : `${percent}%`}
            </strong>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#34363b]">
            <div
              className="h-full rounded-full bg-[#ddb588]"
              style={{ width: `${percent ?? 0}%` }}
            />
          </div>

          <p className="mt-3 text-xs text-[#a2a4aa]">
            {data.weekly.total
              ? `${data.weekly.completed} из ${data.weekly.total} выполнено`
              : "На эту неделю заданий с известным сроком нет."}
          </p>
        </Panel>

        <Panel title="Академические задолженности" href="/tasks">
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
                  className="flex items-start gap-2 text-sm text-white"
                >
                  <Megaphone
                    size={16}
                    className="mt-0.5 shrink-0 text-[#ddb588]"
                  />
                  {title}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Обзор дисциплин" href="/subjects">
        <div className="grid gap-2 sm:grid-cols-2">
          {data.subjects.map(subject => (
            <Link
              key={subject.id}
              href="/subjects"
              className="flex items-center justify-between gap-3 rounded-lg border border-white/5 p-3 hover:bg-white/5"
            >
              <div className="flex min-w-0 items-center gap-2">
                <BookOpen
                  size={16}
                  className="shrink-0 text-[#ddb588]"
                />
                <span className="text-sm text-white">
                  {subject.title}
                </span>
              </div>
              <span className="shrink-0 text-xs text-[#a2a4aa]">
                {subject.open} / {subject.total}
              </span>
            </Link>
          ))}
        </div>

        {data.subjects.length === 0 && (
          <Empty>Дисциплины ещё не добавлены.</Empty>
        )}
      </Panel>

      <p className="flex items-center gap-2 text-xs text-[#868990]">
        <Clock3 size={14} />
        Данные загружаются из локальной SQLite. Неизвестные показатели не подменяются нулями.
      </p>
    </div>
  )
}
