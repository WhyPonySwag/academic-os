import { DatabaseSync } from "node:sqlite"
import { createHash } from "node:crypto"
import { basename, dirname } from "node:path"

export function seedVisualWorkspace() {
  const file = process.env.ACADEMIC_VISUAL_DB
  if (!file || basename(file)!=="academic.db" || !basename(dirname(file)).startsWith("academic-os-e2e-"))
    throw new Error("Visual fixtures require the temporary database from global setup")
  const db = new DatabaseSync(file)
  try {
    db.exec("PRAGMA foreign_keys=ON; BEGIN IMMEDIATE")
    if (db.prepare("SELECT id FROM subjects LIMIT 1").get()) throw new Error("Expected an empty visual database")
    const day = String(db.prepare("SELECT date('now','localtime') d").get()!.d)
    const now = new Date().toISOString()
    const subject = Number(db.prepare("INSERT INTO subjects(title,semester,teacher,assessment,createdAt,updatedAt) VALUES(?,3,?,?,?,?)")
      .run("Архитектурное проектирование","Учебный преподаватель","Проектная защита",now,now).lastInsertRowid)
    const task = Number(db.prepare("INSERT INTO tasks(subjectId,title,status,priority,deadline,debt,createdAt,updatedAt) VALUES(?,?,'В процессе','Высокий',?,1,?,?)")
      .run(subject,"Разрез учебного павильона",day,now,now).lastInsertRowid)
    db.prepare("INSERT INTO task_steps VALUES('visual-step',?,?,0,0)").run(task,"Проверить масштаб")
    db.prepare("INSERT INTO lessons(subjectId,teacher,date,pair,startTime,endTime,room,subgroup,lessonType,status,substitute) VALUES(?,?,?,2,'10:30','12:00','А-204','I','Практикум','Запланировано',?)")
      .run(subject,"Учебный преподаватель",day,"Преподаватель практикума")
    db.prepare("INSERT INTO study_notices(title,requestKey) VALUES(?,?)").run("Просмотр макетов пройдёт в мастерской","visual-notice")
    db.prepare("INSERT INTO study_results(subjectId,kind,title,value,day,requestKey) VALUES(?,'Оценка',?,'4',?,'visual-result')").run(subject,"Эскизный проект",day)
    db.prepare("INSERT INTO study_events(title,kind,day,taskId,requestKey) VALUES(?,'Пересдача',?,?,'visual-retake')").run("Разрез учебного павильона",day,task)
    db.prepare("INSERT INTO study_events(title,kind,day,requestKey) VALUES(?,'Проектная защита',?,'visual-event')").run("Защита эскиза",day)
    const period = db.prepare("INSERT INTO study_periods(yearStart,course,semester) VALUES(2026,2,3)").run().lastInsertRowid
    db.prepare("INSERT INTO subject_periods VALUES(?,?)").run(subject,period)
    const content = Buffer.from("Синтетический учебный материал")
    const digest = createHash("sha256").update(content).digest("hex")
    db.prepare("INSERT INTO archive_blobs VALUES(?,?)").run(digest,content)
    db.prepare("INSERT INTO archive_materials(title,filename,source,subjectId,taskId,digest,added) VALUES(?,?,?,?,?,?,?)")
      .run("Требования к разрезу","памятка.txt","Тестовая методичка",subject,task,digest,now)
    db.exec("COMMIT")
    return {subject,task}
  } finally { db.close() }
}
