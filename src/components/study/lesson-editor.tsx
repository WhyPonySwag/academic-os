"use client"

import { useState } from "react"
import { saveLesson } from "@/app/schedule/actions"
import { Input } from "@/components/ui/input"
import type { SubjectOption } from "@/lib/academic/model"
import { lessonStatuses, subgroups, type Lesson } from "@/lib/academic/schedule-model"
import { areaStyle, Field, RecordPanel, selectStyle } from "./record-panel"

function SlotFields({ lesson, date, moved = false }: { lesson?: Lesson; date: string; moved?: boolean }) {
  return <div className="grid grid-cols-2 gap-3">
    <Field label={moved ? "Новая дата" : "Дата занятия"}><Input type="date" name={moved ? "movedDate" : "date"} required defaultValue={moved ? lesson?.movedDate ?? "" : lesson?.date ?? date} /></Field>
    <Field label={moved ? "Новая пара" : "Номер пары"}><Input type="number" name={moved ? "movedPair" : "pair"} required step="1" min="1" defaultValue={moved ? lesson?.movedPair ?? lesson?.pair : lesson?.pair} /></Field>
    <Field label={moved ? "Новое начало" : "Начало"}><Input type="time" name={moved ? "movedStart" : "startTime"} required defaultValue={moved ? lesson?.movedStart ?? lesson?.startTime : lesson?.startTime} /></Field>
    <Field label={moved ? "Новое окончание" : "Окончание"}><Input type="time" name={moved ? "movedEnd" : "endTime"} required defaultValue={moved ? lesson?.movedEnd ?? lesson?.endTime : lesson?.endTime} /></Field>
  </div>
}

export function LessonEditor({ lesson, date, subjects, close, onSaved }: {
  lesson?: Lesson; date: string; subjects: SubjectOption[]; close: () => void; onSaved: (date: string) => void
}) {
  const [status, setStatus] = useState<string>(lesson?.status ?? "Запланировано")
  return <RecordPanel title={lesson ? "Изменить занятие" : "Новое занятие"} close={close} submit={async form => {
    const result = await saveLesson(lesson ? { id: lesson.id, revision: lesson.revision } : null, form)
    if (!result.error) onSaved(String(form.get(status === "Перенесено" ? "movedDate" : "date")))
    return result
  }}>
    <Field label="Предмет"><select name="subjectId" required className={selectStyle} defaultValue={lesson?.subjectId ?? ""}>
      <option value="" disabled>Выберите предмет</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.title} · семестр {s.semester}</option>)}
    </select></Field>
    <Field label="Преподаватель"><Input name="teacher" required maxLength={200} defaultValue={lesson?.teacher} /></Field>
    <Field label="Замещающий преподаватель"><Input name="substitute" maxLength={200} defaultValue={lesson?.substitute} /></Field>
    <SlotFields lesson={lesson} date={date} />
    <div className="grid grid-cols-2 gap-3">
      <Field label="Аудитория"><Input name="room" required maxLength={200} defaultValue={lesson?.room} /></Field>
      <Field label="Подгруппа"><select name="subgroup" className={selectStyle} defaultValue={lesson?.subgroup}>{subgroups.map(s => <option key={s}>{s}</option>)}</select></Field>
    </div>
    <Field label="Тип занятия"><Input name="lessonType" required maxLength={200} defaultValue={lesson?.lessonType} /></Field>
    <Field label="Статус"><select name="status" className={selectStyle} value={status} onChange={e => setStatus(e.target.value)}>{lessonStatuses.map(s => <option key={s}>{s}</option>)}</select></Field>
    {status === "Перенесено" && <fieldset className="rounded-lg border p-3"><legend className="px-1">Перенос занятия</legend><SlotFields lesson={lesson} date={date} moved /></fieldset>}
    <Field label="Примечание"><textarea className={areaStyle} name="notes" maxLength={10000} defaultValue={lesson?.notes} /></Field>
  </RecordPanel>
}
