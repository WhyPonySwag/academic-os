"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { categories, progress, publicLink, type Work, type Source } from "@/lib/academic/obligations"
import { Field, selectStyle } from "./record-panel"

export function WorkEditor({ item }: {item?:Work}) {
  const [requestId] = useState(()=>crypto.randomUUID())
  const [debt,setDebt] = useState(!!item?.debt)
  const [steps,setSteps] = useState(item?.steps ?? [])
  const [sources,setSources] = useState(item?.sources ?? [])
  function patch(index:number, change:Partial<Source>) {
    setSources(sources.map((s,i)=>i===index ? {...s,...change} : s))
  }
  function move(i:number,j:number) {
    const next = [...steps]
    ;[next[i],next[j]] = [next[j],next[i]]
    setSteps(next)
  }
  return <>
    <input type="hidden" name="requestId" value={requestId}/>
    <input type="hidden" name="extras" value={JSON.stringify({debt,steps,sources})}/>
    <label className="flex items-center gap-2"><input type="checkbox" checked={debt} onChange={e=>setDebt(e.target.checked)}/>Подтверждённая задолженность</label>
    <section className="grid gap-2 border-t pt-4"><h3 className="font-semibold">Этапы выполнения</h3>
      {steps.map((step,i)=><div key={step.id} className="flex flex-wrap items-center gap-2">
        <input type="checkbox" aria-label={`Выполнен этап ${i+1}`} checked={step.done} onChange={e=>setSteps(steps.map((s,n)=>n===i ? {...s,done:e.target.checked} : s))}/>
        <Input className="min-w-28 flex-1" aria-label={`Название этапа ${i+1}`} required maxLength={300} value={step.title} onChange={e=>setSteps(steps.map((s,n)=>n===i ? {...s,title:e.target.value} : s))}/>
        <Button type="button" size="sm" variant="outline" aria-label="Поднять этап" disabled={!i} onClick={()=>move(i,i-1)}>↑</Button>
        <Button type="button" size="sm" variant="outline" aria-label="Опустить этап" disabled={i===steps.length-1} onClick={()=>move(i,i+1)}>↓</Button>
        <Button type="button" size="sm" variant="ghost" aria-label="Удалить этап" onClick={()=>setSteps(steps.filter((_,n)=>n!==i))}>×</Button>
      </div>)}
      <Button type="button" variant="outline" onClick={()=>setSteps([...steps,{id:crypto.randomUUID(),title:"",done:false}])}>Добавить этап</Button>
    </section>
    <section className="grid gap-3 border-t pt-4"><h3 className="font-semibold">Источники</h3>
      {sources.map((s,i)=><fieldset key={s.kind + ":" + s.reference} className="grid gap-3 rounded-lg border p-3">
        <Field label="Вид источника"><select className={selectStyle} value={s.category} onChange={e=>patch(i,{category:e.target.value})}>{categories.map(c=><option key={c}>{c}</option>)}</select></Field>
        <Field label="Название источника"><Input required value={s.label} onChange={e=>patch(i,{label:e.target.value})}/></Field>
        <Field label="Ссылка на источник"><Input type="url" value={s.link} onChange={e=>patch(i,{link:e.target.value})}/></Field>
        <Field label="Дата источника"><Input type="date" value={s.sourceDate} onChange={e=>patch(i,{sourceDate:e.target.value})}/></Field>
        <label><input type="checkbox" checked={s.confirmed} onChange={e=>patch(i,{confirmed:e.target.checked})}/> Источник подтверждён</label>
        <Button type="button" variant="ghost" onClick={()=>setSources(sources.filter((_,n)=>i!==n))}>Отвязать источник</Button>
      </fieldset>)}
      <Button type="button" variant="outline" onClick={()=>setSources([...sources,{kind:"url",reference:crypto.randomUUID(),category:"Личная запись",link:"",label:"",sourceDate:"",confirmed:false}])}>Добавить источник</Button>
    </section>
  </>
}

export function WorkDetails({task}:{task:Work}) {
  return <div className="grid gap-4 text-sm">
    <section><h3 className="font-semibold">Этапы · {progress(task.steps)}</h3><ol className="list-inside list-decimal">{task.steps.map(s=><li className="wrap-anywhere" key={s.id}>{s.title} · {s.done ? "Выполнен" : "Предстоит"}</li>)}</ol></section>
    <section><h3 className="font-semibold">Вложения</h3>{task.attachments.map(a=><a className="block underline" key={a.id} href={"/archive/files/"+a.id} download>{a.title}</a>)}
      <a className="text-xs underline" href={"/archive?task="+task.id}>Прикрепить файл</a></section>
    {task.sources.length>0 && <section><h3 className="font-semibold">Источники</h3>{task.sources.map(s=><p key={s.kind+s.reference} className="wrap-anywhere">{s.category} · {publicLink(s.link) ? <a href={s.link} className="text-primary underline" target="_blank" rel="noreferrer">{s.label}</a> : s.label} · {s.confirmed ? "Подтверждён" : "Без подтверждения"} {s.sourceDate}</p>)}</section>}
    {task.history.length>0 && <details><summary>История изменений</summary><ol>{task.history.map((h,i)=><li key={i} className="mt-1 wrap-anywhere">{new Date(h.at).toLocaleString("ru-RU")} · {h.change}</li>)}</ol></details>}
  </div>
}
