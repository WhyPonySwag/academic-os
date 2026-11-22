import type { ReactNode } from "react"
import Link from "next/link"
import { localDatabase } from "@/lib/academic/database"
import { displayDate } from "@/lib/academic/model"
import { resultKinds } from "@/lib/academic/register"
import { addResult, assignPeriod, finishRetake, scheduleRetake } from "@/app/register-actions"
import { EntryForm } from "./entry-form"

export function Ledger({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <section className="space-y-4"><header className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
    <h1 className="page-title">{title}</h1>{action}</header>{children}</section>
}
export function Rows({ title, items, empty }: { title: string; items: ReactNode[]; empty: string }) {
  return <section className="min-w-0 rounded-sm border bg-card"><h2 className="border-b px-3 py-2 text-sm font-semibold">{title}</h2>
    {items.length ? <ul className="divide-y">{items.map((node,i) => <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 py-2 text-sm wrap-anywhere" key={i}>{node}</li>)}</ul>
      : <p className="px-3 py-4 text-sm text-muted-foreground">{empty}</p>}</section>
}
export async function Results() {
  const db = await localDatabase()
  const subjects = db.prepare("SELECT id,title,semester FROM subjects ORDER BY title").all()
  const results = db.prepare("SELECT r.*,s.title subject FROM study_results r JOIN subjects s ON s.id=r.subjectId ORDER BY day DESC,r.id DESC").all()
  return <Ledger title="Успеваемость" action={subjects.length > 0 && <EntryForm title="Записать результат" action={addResult} fields={[
    {name:"subjectId",label:"Дисциплина",options:subjects.map(s=>({value:Number(s.id),label:s.title+" · семестр "+s.semester}))},
    {name:"kind",label:"Вид результата",options:resultKinds.map(label=>({value:label,label}))},
    {name:"title",label:"Работа или аттестация"},{name:"value",label:"Оценка или результат"},{name:"day",label:"Дата результата",type:"date"}
  ]}/>}>
    {!subjects.length && <Link href="/subjects" className="text-sm underline">Добавить предмет</Link>}
    <Rows title="Журнал результатов" empty="Результаты ещё не внесены." items={results.map(r=><>
      <div><Link href={"/subjects?subject="+r.subjectId} className="font-medium hover:underline">{String(r.title)}</Link><p className="text-xs text-muted-foreground">{String(r.subject)} · {String(r.kind)}</p></div>
      <div className="text-right"><strong>{String(r.value)}</strong><p className="text-xs text-muted-foreground">{displayDate(String(r.day))}</p></div></>)}/>
  </Ledger>
}

export async function Debts() {
  const db = await localDatabase()
  const tasks = db.prepare("SELECT t.*,s.title subject FROM tasks t JOIN subjects s ON s.id=t.subjectId WHERE debt=1 AND status<>'Принято' ORDER BY deadline IS NULL,deadline,t.id").all()
  const retakes = db.prepare("SELECT e.*,t.title task FROM study_events e JOIN tasks t ON t.id=e.taskId ORDER BY e.day DESC,e.id DESC").all()
  return <Ledger title="Долги и пересдачи" action={<Link className="text-sm underline" href="/tasks?debt=1">К заданиям</Link>}>
    <Rows title="Открытые задолженности" empty="Подтверждённых открытых долгов нет." items={tasks.map(t=><>
      <div><Link className="font-medium hover:underline" href={"/tasks?task="+t.id}>{String(t.title)}</Link><p className="text-xs text-muted-foreground">{String(t.subject)} · {String(t.status)}</p></div>
      <EntryForm title="Назначить пересдачу" hidden={{taskId:String(t.id)}} fields={[{name:"day",label:"Дата пересдачи",type:"date"}]} action={scheduleRetake}/></>)}/>
    <Rows title="Попытки пересдачи" empty="Пересдачи пока не назначены." items={retakes.map(e=><>
      <Link href={"/calendar?date="+e.day}>{displayDate(String(e.day))} · {String(e.task)}</Link>
      {e.outcome ? <strong>{String(e.outcome)}</strong> : <EntryForm title="Внести итог" action={finishRetake} hidden={{eventId:String(e.id)}} fields={[
        {name:"outcome",label:"Итог пересдачи",options:["Сдано","Не сдано"].map(label=>({label,value:label}))}]}/>}</>)}/>
  </Ledger>
}

export async function History() {
  const db = await localDatabase()
  const rows = db.prepare(`SELECT s.id,s.title,s.semester,p.yearStart,p.course,
    (SELECT count(*) FROM study_results WHERE subjectId=s.id) results FROM subjects s
    LEFT JOIN subject_periods sp ON sp.subjectId=s.id LEFT JOIN study_periods p ON p.id=sp.periodId
    ORDER BY p.yearStart DESC,p.course,s.semester,s.title`).all()
  const groups = new Map<string,ReactNode[]>()
  for (const s of rows) {
    const year = s.yearStart ? s.yearStart+" / "+(Number(s.yearStart)+1)+" · курс "+s.course : "Учебный год не указан"
    const label = year+" · семестр "+s.semester
    const list = groups.get(label) ?? []
    list.push(<><Link href={"/subjects?subject="+s.id} className="underline">{String(s.title)}</Link><span>Результатов · {Number(s.results)}</span></>)
    groups.set(label,list)
  }
  return <Ledger title="Учебная история" action={rows.length > 0 && <EntryForm title="Указать учебный год" action={assignPeriod} fields={[
    {name:"subjectId",label:"Дисциплина",options:rows.map(s=>({value:Number(s.id),label:s.title+" · семестр "+s.semester}))},
    {name:"yearStart",label:"Год начала учебного года",type:"number",min:1900,max:9998},{name:"course",label:"Курс",type:"number",min:1}]}/>}>
    {groups.size ? Array.from(groups,([label,items])=><Rows key={label} title={label} items={items} empty="Нет дисциплин."/>) :
      <p className="text-sm text-muted-foreground">История появится после добавления <Link className="underline" href="/subjects">первой дисциплины</Link>.</p>}
  </Ledger>
}
