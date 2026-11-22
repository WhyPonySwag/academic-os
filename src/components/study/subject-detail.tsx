import Link from "next/link"
import { localDatabase } from "@/lib/academic/database"
import { displayDate } from "@/lib/academic/model"
import { monday } from "@/lib/academic/schedule-model"
import { Rows } from "./ledger"

export async function SubjectDetail({id}:{id:number}) {
  const db = await localDatabase()
  const tasks = db.prepare("SELECT id,title,status FROM tasks WHERE subjectId=? ORDER BY id DESC").all(id)
  const results = db.prepare("SELECT title,value,day FROM study_results WHERE subjectId=? ORDER BY day DESC,id DESC").all(id)
  const files = db.prepare("SELECT id,title,source FROM archive_materials WHERE subjectId=? ORDER BY added DESC").all(id)
  const lessons = db.prepare("SELECT * FROM lessons WHERE subjectId=? ORDER BY coalesce(movedDate,date),coalesce(movedStart,startTime)").all(id)
  const history = db.prepare(`SELECT h.at,h.change,t.title FROM task_history h JOIN tasks t ON h.taskId=t.id WHERE t.subjectId=?
    UNION ALL SELECT createdAt,'Создано задание',title FROM tasks WHERE subjectId=?
    UNION ALL SELECT added,'Добавлен материал',title FROM archive_materials WHERE subjectId=?
    UNION ALL SELECT day,'Результат: '||value,title FROM study_results WHERE subjectId=? ORDER BY 1 DESC`).all(id,id,id,id)
  const origin = db.prepare("SELECT sourceLabel,rowNumber,importedAt FROM import_origins WHERE rowGroup='subjects' AND recordId=?").get(id)
  return <div className="grid items-start gap-3 xl:grid-cols-2">
    <Rows title="Материалы дисциплины" empty="Материалов пока нет." items={files.map(m=><><a className="underline" href={"/archive/files/"+m.id} download>{String(m.title)}</a><span>{String(m.source)}</span></>)}/>
    <Rows title="Работы" empty="Работ пока нет." items={tasks.map(t=><><Link className="underline" href={"/tasks?task="+t.id}>{String(t.title)}</Link><span>{String(t.status)}</span></>)}/>
    <Rows title="Оценки и зачёты" empty="Результаты ещё не внесены." items={results.map(r=><><span>{displayDate(String(r.day))} · {String(r.title)}</span><strong>{String(r.value)}</strong></>)}/>
    <Rows title="Занятия дисциплины" empty="Занятий пока нет." items={lessons.map(l=>{
      const date = String(l.movedDate ?? l.date)
      return <Link href={"/schedule?week="+monday(date)+"#lesson-"+l.id+"-"+date} className="underline">{displayDate(date)} · {String(l.movedStart ?? l.startTime)} · {String(l.room)} · {String(l.status)}</Link>
    })}/>
    <Rows title="История дисциплины" empty="Изменений пока нет." items={history.map(h=><><span>{String(h.change)} · {String(h.title)}</span><small>{displayDate(String(h.at).slice(0,10))}</small></>)}/>
    {origin && <p className="text-xs text-muted-foreground">Источник · {String(origin.sourceLabel)} · строка {String(origin.rowNumber)} · {displayDate(String(origin.importedAt).slice(0,10))}</p>}
  </div>
}
