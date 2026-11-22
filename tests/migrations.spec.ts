import { test,expect } from "@playwright/test"
import { DatabaseSync } from "node:sqlite"
import { migrate,migrations } from "../src/lib/academic/migrations"

function legacy() {
  const db = new DatabaseSync(":memory:")
  db.exec("PRAGMA foreign_keys=ON")
  for (const sql of migrations.slice(0,3)) db.exec(sql)
  db.exec("PRAGMA user_version=3")
  db.exec("INSERT INTO subjects(title,semester,createdAt,updatedAt) VALUES('Синтетическая дисциплина',1,'2020-01-01','2020-01-01')")
  db.exec("INSERT INTO tasks(subjectId,title,createdAt,updatedAt) VALUES(1,'Синтетическая работа','2020-01-01','2020-01-01')")
  return db
}
test("Миграция существующей версии сохраняет записи и допускает повторный запуск",()=>{
  const db=legacy()
  try {
    const original=db.prepare("SELECT * FROM tasks").all()
    migrate(db)
    migrate(db)
    expect(db.prepare("SELECT * FROM tasks").all()).toEqual(original)
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([])
    expect(db.prepare("SELECT count(*) n FROM study_results").get()?.n).toBe(0)
    expect(db.prepare("PRAGMA user_version").get()?.user_version).toBe(migrations.length)
  } finally {db.close()}
})
test("Ошибка внутри новой миграции откатывает всю версию",()=>{
  const db=legacy()
  try {
    db.exec("CREATE TABLE study_events(existing TEXT)")
    expect(()=>migrate(db)).toThrow()
    expect(db.prepare("PRAGMA user_version").get()?.user_version).toBe(3)
    expect(db.prepare("SELECT name FROM sqlite_master WHERE name='study_periods'").get()).toBeUndefined()
    expect(db.prepare("SELECT count(*) n FROM tasks").get()?.n).toBe(1)
  } finally {db.close()}
})
