import "server-only"
import { lessonsBetween } from "./lessons"
import { slotsOn } from "./schedule-model"
import { localDatabase } from "./database"
import { readWorks } from "./work-records"
import type { Subject, SubjectOption } from "./model"

export type SubjectSummary = Subject & { total:number; unfinished:number; debts:number; nearest:string|null }
export async function listSubjects() {
  const db = await localDatabase()
  return db.prepare(`SELECT s.*,count(t.id) total,count(CASE WHEN t.status <> 'Принято' THEN 1 END) unfinished,
    count(CASE WHEN t.debt=1 AND t.status <> 'Принято' THEN 1 END) debts,min(CASE WHEN t.status <> 'Принято' AND t.deadline>=date('now','localtime') THEN t.deadline END) nearest
    FROM subjects s LEFT JOIN tasks t ON t.subjectId=s.id GROUP BY s.id ORDER BY semester,s.id`).all().map(row => ({ ...row }) as SubjectSummary)
}

const attentionCondition = "status <> 'Принято' AND (status='Требует доработки' OR priority IN ('Срочный','Высокий') OR deadline < date('now','localtime'))"
export async function taskWorkspace() {
  const db = await localDatabase()
  const subjects = db.prepare("SELECT id, title, semester FROM subjects ORDER BY semester, id").all()
  const tasks = readWorks(db)
  return {
    subjects: subjects.map(row => ({ ...row }) as SubjectOption),
    tasks, attentionIds:db.prepare(`SELECT id FROM tasks WHERE ${attentionCondition}`).all().map(w=>Number(w.id)),
  }
}

export async function academicOverview() {
  const db = await localDatabase()
  const today = String(db.prepare("SELECT date('now','localtime') day").get()!.day)
  const todayLessons = slotsOn(today, lessonsBetween(db, today, today))
  const upcoming = db.prepare(`
    SELECT t.id, t.title, t.deadline, s.title AS subject
    FROM tasks t JOIN subjects s ON s.id = t.subjectId
    WHERE t.deadline >= date('now', 'localtime') AND t.status <> 'Принято'
    ORDER BY t.deadline, t.id LIMIT 3
  `).all()
  return {
    todayLessons,
    works: db.prepare(`SELECT t.id,t.title,t.debt,t.status <> 'Принято' unfinished,
      (${attentionCondition}) attention,count(s.id) steps,coalesce(sum(s.done),0) done
      FROM tasks t LEFT JOIN task_steps s ON s.taskId=t.id GROUP BY t.id
      ORDER BY t.deadline IS NULL,t.deadline,t.id`).all().map(w=>({
        id:Number(w.id), title:String(w.title), debt:!!w.debt, unfinished:!!w.unfinished,
        attention:!!w.attention, steps:Number(w.steps), done:Number(w.done)
      })),
    disciplines: db.prepare("SELECT id,title FROM subjects ORDER BY semester,title").all().map(s=>({id:Number(s.id),title:String(s.title)})),
    count: Number(db.prepare("SELECT count(*) AS n FROM subjects").get()?.n),
    upcoming: upcoming.map(row => ({ ...row }) as { id: number; title: string; deadline: string; subject: string }),
  }
}
