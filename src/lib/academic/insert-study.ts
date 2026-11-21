import "server-only"
import type { DatabaseSync } from "node:sqlite"
import type { Subject, Task } from "./model"
type Stored = "id" | "createdAt" | "updatedAt" | "revision"
export type SubjectInput = Omit<Subject, Stored>
export type TaskInput = Omit<Task, Stored>

export function insertSubject(db: DatabaseSync, item: SubjectInput, now: string) {
  return db.prepare(`INSERT INTO subjects(title,semester,teacher,assessment,credits,notes,createdAt,updatedAt)
    VALUES(?,?,?,?,?,?,?,?)`).run(item.title,item.semester,item.teacher,item.assessment,item.credits,item.notes,now,now)
}
export function insertTask(db: DatabaseSync, item: TaskInput, now: string) {
  return db.prepare(`INSERT INTO tasks(subjectId,title,description,status,priority,deadline,issuedOn,notes,createdAt,updatedAt)
    VALUES(?,?,?,?,?,?,?,?,?,?)`).run(item.subjectId,item.title,item.description,item.status,item.priority,item.deadline,item.issuedOn,item.notes,now,now)
}
