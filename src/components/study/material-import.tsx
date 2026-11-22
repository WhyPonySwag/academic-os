"use client"

import { useState, type FormEvent } from "react"
import { reviewMaterial } from "@/app/archive/actions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Field, RecordPanel, selectStyle } from "./record-panel"
import type { Choice } from "@/lib/academic/register"

export function MaterialImport({subjects,tasks,initialTask}: {initialTask?:number;subjects:Choice[];tasks:(Choice & {subjectId:number})[]}) {
  const [open,setOpen] = useState(!!initialTask)
  const [busy,setBusy] = useState(false)
  const [subject,setSubject] = useState("")
  const [review,setReview] = useState<Awaited<ReturnType<typeof reviewMaterial>>>({})
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    try {
      const result = await reviewMaterial(form,review.token)
      setReview(result)
      if (result.saved) setOpen(false)
    } catch { setReview({error:"Не удалось сохранить материал. Повторите просмотр."}) }
    finally { setBusy(false) }
  }
  return <><Button size="sm" onClick={()=>{setSubject("");setReview({});setOpen(true)}}>Добавить материал</Button>
    {open && <RecordPanel title="Новый материал" close={()=>{if(!busy)setOpen(false)}}>
      <form onSubmit={submit} onChange={()=>setReview({})} className="space-y-4">
        <fieldset disabled={busy} className="grid gap-3">
          <Field label="Название материала"><Input name="title" maxLength={300} required/></Field>
          <Field label="Оригинал файла · до 8 МиБ"><Input type="file" name="file" required/></Field>
          <Field label="Источник материала"><Input name="source" maxLength={500} required placeholder="Например, название методички или сообщение преподавателя"/></Field>
          <Field label="Дата источника, если известна"><Input type="date" name="sourceDate"/></Field>
          <Field label="Дисциплина"><select name="subjectId" className={selectStyle} value={subject} onChange={e=>setSubject(e.target.value)}><option value="">Без привязки</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></Field>
          <Field label="Задание"><select name="taskId" defaultValue={initialTask ?? ""} className={selectStyle} key={subject}><option value="">Без привязки</option>{tasks.filter(t=>!subject || String(t.subjectId)===subject).map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></Field>
        </fieldset>
        {review.error && <p role="alert" className="text-sm text-destructive">{review.error}</p>}
        {review.details && <div role="status" className="grid gap-1 border-l-2 pl-3 text-sm wrap-anywhere">
          <strong>{review.details.title}</strong><span>{review.details.filename} · {review.details.size} Б</span>
          <span>{review.details.source} {review.details.sourceDate}</span><span>{[review.details.subject,review.details.task].filter(Boolean).join(" · ")}</span>
          <small className="font-mono text-muted-foreground">SHA-256 · {review.details.digest}</small>
        </div>}
        <Button type="submit" disabled={busy}>{review.token ? "Подтвердить добавление" : "Предварительный просмотр"}</Button>
      </form>
    </RecordPanel>}</>
}
