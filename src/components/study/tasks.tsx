"use client"

import Link from "next/link"
import { useState } from "react"
import { CalendarDays, ListChecks, Plus } from "lucide-react"
import { removeRecord, saveTask } from "@/app/study-actions"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { displayDate, priorities, statuses, type SubjectOption } from "@/lib/academic/model"
import { areaStyle, Field, RecordPanel, selectStyle } from "./record-panel"

import { progress, type Work as Task } from "@/lib/academic/obligations"
import { WorkDetails, WorkEditor } from "./work-details"

type Panel = { mode: "view" | "delete"; task: Task } | { mode: "edit"; task?: Task }

function byDeadline(a: Task, b: Task) {
  return (a.deadline ?? "99999").localeCompare(b.deadline ?? "99999")
}

export function Tasks({ subjects, tasks, initialSubject, initialTask, initialDebt, initialView, attentionIds }: {
  subjects: SubjectOption[]; tasks: Task[]; initialSubject: string; initialTask: number; initialDebt:string; initialView:string; attentionIds:number[]
}) {
  const [subjectFilter, setSubjectFilter] = useState(initialSubject)
  const [statusFilter, setStatusFilter] = useState("")
  const [search,setSearch] = useState("")
  const [debt,setDebt] = useState(initialDebt)
  const [sort, setSort] = useState("deadline")
  const [panel, setPanel] = useState<Panel | null>(() => {
    const task = tasks.find(t => t.id === initialTask)
    return task ? { mode: "view", task } : null
  })
  const item = panel?.task
  const close = () => setPanel(null)
  const subjectNames = new Map(subjects.map(s => [s.id, s.title]))
  const subjectOptions = subjects.map(s => <option key={s.id} value={s.id}>{s.title} · семестр {s.semester}</option>)
  const attention = new Set(attentionIds)
  const [view,setView] = useState(initialView)
  const visible = tasks.filter(t => (!view || (view === "attention" ? attention.has(t.id) : t.status !== "Принято")) && (!debt || !!t.debt === (debt === "debt")) && t.title.toLocaleLowerCase("ru").includes(search.trim().toLocaleLowerCase("ru")) && (!subjectFilter || String(t.subjectId) === subjectFilter) && (!statusFilter || t.status === statusFilter))
    .sort((a, b) => {
      const priority = priorities.indexOf(b.priority) - priorities.indexOf(a.priority)
      const deadline = byDeadline(a, b)
      return (sort === "priority" ? priority || deadline : deadline || priority) || a.id - b.id
    })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Задания</h1>
        {subjects.length > 0 && <Button onClick={() => setPanel({ mode: "edit" })}><Plus aria-hidden />Добавить задание</Button>}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Список работ"><select className={selectStyle} value={view} onChange={e=>setView(e.target.value)}><option value="">Все работы</option><option value="unfinished">Незавершённые</option><option value="attention">Требуют внимания</option></select></Field>
        <Field label="Поиск заданий"><Input type="search" value={search} onChange={e=>setSearch(e.target.value)}/></Field>
        <Field label="Задолженность"><select className={selectStyle} value={debt} onChange={e=>setDebt(e.target.value)}><option value="">Все работы</option><option value="debt">Подтверждённые долги</option><option value="ordinary">Без задолженности</option></select></Field>
        <Field label="Фильтр по предмету"><select className={selectStyle} value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}><option value="">Все предметы</option>{subjectOptions}</select></Field>
        <Field label="Фильтр по статусу"><select className={selectStyle} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">Все статусы</option>{statuses.map(s => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Сортировка"><select className={selectStyle} value={sort} onChange={e => setSort(e.target.value)}><option value="deadline">По сроку сдачи</option><option value="priority">По приоритету</option></select></Field>
      </div>
      {!visible.length && <Card className="items-center gap-3 p-8 text-center">
        <ListChecks aria-hidden className="text-primary" /><p>{tasks.length ? "Нет заданий с такими параметрами" : "Заданий пока нет"}</p>
        {!subjects.length && <><p className="text-sm text-muted-foreground">Для первого задания добавьте предмет.</p><Link href="/subjects" className={buttonVariants({ variant: "outline" })}>К предметам</Link></>}
      </Card>}
      {visible.length > 0 && <Card className="gap-0 py-0">
        {visible.map(task => <CardContent key={task.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b py-4 last:border-0">
          <div className="min-w-0 grow basis-48">
            <button className="text-left font-semibold wrap-anywhere hover:text-primary" onClick={() => setPanel({ mode: "view", task })}>{task.title}</button>
            <p className="mt-1 text-xs wrap-anywhere text-muted-foreground">{subjectNames.get(task.subjectId)}</p>
          </div>
          {task.debt===1 && <Badge variant="outline">Долг</Badge>}
          <span className="text-xs text-muted-foreground">{progress(task.steps)}</span>
          {debt === "debt" && <span className="basis-full text-sm wrap-anywhere">Далее: {task.steps.find(s=>!s.done)?.title || task.description || "Действия не указаны"}</span>}
          <Badge variant="secondary">{task.status}</Badge>
          <span className="text-xs text-muted-foreground">{task.priority}</span>
          <span className="flex items-center gap-1.5 text-xs tabular-nums"><CalendarDays aria-hidden className="size-3.5" />{task.deadline ? displayDate(task.deadline) : "Без срока"}</span>
        </CardContent>)}
      </Card>}
      {panel?.mode === "view" && <RecordPanel key="view" title={panel.task.title} close={close}>
        <dl className="grid gap-4">
          {[
            ["Предмет", subjectNames.get(panel.task.subjectId)], ["Статус", panel.task.status], ["Приоритет", panel.task.priority],
            ["Создано", displayDate(panel.task.createdAt.slice(0,10))], ["Задолженность",panel.task.debt ? "Подтверждена" : "Не отмечена"], ["Срок сдачи", panel.task.deadline ? displayDate(panel.task.deadline) : "Без срока"], ["Дата выдачи", panel.task.issuedOn ? displayDate(panel.task.issuedOn) : "Не указана"],
            ["Описание и требования", panel.task.description || "Пока пусто"], ["Примечания", panel.task.notes || "Пока пусто"],
          ].map(([label, value]) => <div key={label}><dt className="mb-1 text-xs text-muted-foreground">{label}</dt><dd className="whitespace-pre-wrap wrap-anywhere">{value}</dd></div>)}
        </dl>
        <WorkDetails task={panel.task}/>
        <div className="flex gap-2 border-t pt-4">
          <Button onClick={() => setPanel({ mode: "edit", task: panel.task })}>Изменить</Button>
          <Button variant="outline" onClick={() => setPanel({ mode: "delete", task: panel.task })}>Удалить</Button>
        </div>
      </RecordPanel>}
      {panel?.mode === "edit" && <RecordPanel key="edit" title={item ? "Редактирование задания" : "Новое задание"} close={close} submit={form => saveTask(item ? { id: item.id, revision: item.revision } : null, form)}>
        <Field label="Название задания"><Input name="title" required maxLength={200} defaultValue={item?.title} /></Field>
        <Field label="Предмет"><select name="subjectId" required className={selectStyle} defaultValue={item?.subjectId ?? (subjectFilter || (subjects.length === 1 ? subjects[0].id : ""))}><option value="" disabled>Выберите предмет</option>{subjectOptions}</select></Field>
        <Field label="Описание и требования"><textarea name="description" className={areaStyle} maxLength={10000} defaultValue={item?.description} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Статус"><select name="status" className={selectStyle} defaultValue={item?.status ?? "Не выяснено"}>{statuses.map(s => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Приоритет"><select name="priority" className={selectStyle} defaultValue={item?.priority ?? "Обычный"}>{priorities.map(p => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Срок сдачи"><Input type="date" name="deadline" defaultValue={item?.deadline ?? ""} /></Field>
          <Field label="Дата выдачи"><Input type="date" name="issuedOn" defaultValue={item?.issuedOn ?? ""} /></Field>
        </div>
        <Field label="Примечания"><textarea name="notes" className={areaStyle} maxLength={10000} defaultValue={item?.notes} /></Field>
        <WorkEditor item={item}/>
      </RecordPanel>}
      {panel?.mode === "delete" && <RecordPanel key="delete" title="Удалить задание?" destructive close={close} submit={() => removeRecord("task", { id: panel.task.id, revision: panel.task.revision })}><p className="wrap-anywhere">Задание «{panel.task.title}» будет удалено.</p></RecordPanel>}
    </div>
  )
}
