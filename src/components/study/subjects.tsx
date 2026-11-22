"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowRight, BookOpen, Plus } from "lucide-react"
import { removeRecord, saveSubject } from "@/app/study-actions"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { Subject } from "@/lib/academic/model"
import { areaStyle, Field, RecordPanel } from "./record-panel"

type Panel = { mode: "edit"; subject?: Subject } | { mode: "delete"; subject: Subject }

import type { SubjectSummary } from "@/lib/academic/queries"

export function Subjects({ subjects, scoped }: { subjects: SubjectSummary[]; scoped: boolean }) {
  const [query, setQuery] = useState("")
  const [panel, setPanel] = useState<Panel | null>(null)
  const item = panel?.subject
  const visible = subjects.filter(s => s.title.toLocaleLowerCase("ru").includes(query.trim().toLocaleLowerCase("ru")))
  const close = () => setPanel(null)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Предметы</h1>
        <Button onClick={() => setPanel({ mode: "edit" })}><Plus aria-hidden />Добавить предмет</Button>
      </div>
      {scoped && <Link className="block text-sm text-primary underline" href="/subjects">Все предметы</Link>}
      <Input type="search" aria-label="Поиск по названию" placeholder="Поиск по названию" className="max-w-sm" value={query} onChange={e => setQuery(e.target.value)} />
      {!visible.length && <Card className="items-center gap-3 p-8 text-center"><BookOpen aria-hidden className="text-primary" /><p>{subjects.length ? "По вашему запросу ничего не найдено" : scoped ? "Предмет не найден" : "Дисциплины пока не добавлены"}</p></Card>}
      <div className="grid gap-4 xl:grid-cols-2">
        {visible.map(subject => (
          <Card key={subject.id} className="min-w-0">
            <CardContent className="flex h-full flex-col gap-2.5">
              <div className="w-fit rounded-md border bg-secondary px-2 py-1 text-xs tabular-nums text-muted-foreground">Семестр {subject.semester}</div>
              <h2 className="text-lg font-semibold wrap-anywhere">{subject.title}</h2>
              <p className="text-sm text-muted-foreground">Заданий: {subject.total} · Незавершённых: {subject.unfinished} · Долгов: {subject.debts}</p>
              <p className="text-xs text-muted-foreground">Ближайший срок: {subject.nearest?.split("-").reverse().join(".") ?? "Нет предстоящих сроков"}</p>
              <dl className="grid gap-1 text-sm">
                {([["Преподаватель", subject.teacher], ["Форма контроля", subject.assessment], ["ЗЕТ", subject.credits]] as const).map(([label, value]) =>
                  value !== null && value !== "" && <div key={label} className="flex flex-wrap gap-x-2"><dt className="text-muted-foreground">{label}</dt><dd className="wrap-anywhere">{value}</dd></div>)}
              </dl>
              {subject.notes && <p className="line-clamp-3 text-sm whitespace-pre-wrap wrap-anywhere text-muted-foreground">{subject.notes}</p>}
              <div className="mt-auto flex flex-wrap items-center gap-2 border-t pt-3">
                <Link href={`/tasks?subject=${subject.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>Задания предмета<ArrowRight aria-hidden /></Link>
                <Button size="sm" variant="ghost" onClick={() => setPanel({ mode: "edit", subject })}>Изменить</Button>
                <Button size="sm" variant="ghost" onClick={() => setPanel({ mode: "delete", subject })}>Удалить</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {panel?.mode === "edit" && (
        <RecordPanel title={item ? "Редактирование предмета" : "Новый предмет"} close={close} submit={form => saveSubject(item ? { id: item.id, revision: item.revision } : null, form)}>
          <Field label="Название дисциплины"><Input name="title" required maxLength={200} defaultValue={item?.title} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Семестр"><Input name="semester" type="number" min="1" step="1" required defaultValue={item?.semester} /></Field>
            <Field label="Количество ЗЕТ"><Input name="credits" type="number" min="0" step="any" defaultValue={item?.credits ?? ""} /></Field>
          </div>
          <Field label="Преподаватель"><Input name="teacher" maxLength={200} defaultValue={item?.teacher} /></Field>
          <Field label="Форма контроля"><Input name="assessment" maxLength={200} defaultValue={item?.assessment} /></Field>
          <Field label="Заметки"><textarea name="notes" className={areaStyle} maxLength={10000} defaultValue={item?.notes} /></Field>
        </RecordPanel>
      )}
      {panel?.mode === "delete" && <RecordPanel title="Удалить предмет?" destructive close={close} submit={() => removeRecord("subject", { id: panel.subject.id, revision: panel.subject.revision })}>
        <p className="wrap-anywhere">Предмет «{panel.subject.title}» будет удалён.</p>
      </RecordPanel>}
    </div>
  )
}
