import { Suspense } from "react"
import Link from "next/link"
import { localDatabase } from "@/lib/academic/database"
import { Ledger, Rows } from "@/components/study/ledger"
import { MaterialImport } from "@/components/study/material-import"

export const metadata = { title:"Учебный архив" }
async function Archive() {
  const db = await localDatabase()
  const subjects = db.prepare("SELECT id,title FROM subjects ORDER BY title").all().map(s=>({id:Number(s.id),title:String(s.title)}))
  const tasks = db.prepare("SELECT id,title,subjectId FROM tasks ORDER BY title").all().map(t=>({id:Number(t.id),title:String(t.title),subjectId:Number(t.subjectId)}))
  const materials = db.prepare("SELECT * FROM archive_materials ORDER BY added DESC,id DESC").all()
  return <Ledger title="Учебный архив" action={<MaterialImport subjects={subjects} tasks={tasks}/>}>
    <Rows title="Материалы" empty="Архив пока пуст" items={materials.map(m=><>
      <div><strong>{String(m.title)}</strong><p className="text-xs text-muted-foreground">{String(m.source)}{m.sourceDate && " · "+m.sourceDate}</p>
        {m.taskId && <Link className="text-xs underline" href={"/tasks?task="+m.taskId}>К заданию</Link>}</div>
      <a className="text-sm underline" download href={"/archive/files/"+m.id}>{String(m.filename)}</a></>)}/>
  </Ledger>
}
export default function Page() { return <Suspense fallback={<p>Загрузка архива…</p>}><Archive/></Suspense> }
