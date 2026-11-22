import type { DatabaseSync } from "node:sqlite"

// Each entry is an immutable schema version. Append new migrations at the end.
export const migrations = [
  `CREATE TABLE subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL CHECK(length(trim(title)) > 0),
    semester INTEGER NOT NULL CHECK(semester >= 1),
    teacher TEXT NOT NULL DEFAULT '',
    assessment TEXT NOT NULL DEFAULT '',
    credits REAL CHECK(credits >= 0),
    notes TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1
  ) STRICT;
  CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subjectId INTEGER NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    title TEXT NOT NULL CHECK(length(trim(title)) > 0),
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Не выяснено' CHECK(status IN ('Не выяснено','Не начато','В процессе','На проверке','Принято','Требует доработки')),
    priority TEXT NOT NULL DEFAULT 'Обычный' CHECK(priority IN ('Низкий','Обычный','Высокий','Срочный')),
    deadline TEXT, issuedOn TEXT, notes TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1
  ) STRICT;
  CREATE INDEX tasks_subject_status ON tasks(subjectId, status);
  CREATE INDEX tasks_deadline ON tasks(deadline) WHERE deadline IS NOT NULL;
  CREATE TABLE task_sources (
    id INTEGER PRIMARY KEY,
    taskId INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK(kind IN ('telegram','vk','photo','pdf','docx','url')),
    reference TEXT NOT NULL,
    UNIQUE(taskId, kind, reference)
  ) STRICT;`,
  `CREATE TABLE lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subjectId INTEGER NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    teacher TEXT NOT NULL, date TEXT NOT NULL, pair INTEGER NOT NULL CHECK(pair > 0),
    startTime TEXT NOT NULL, endTime TEXT NOT NULL CHECK(endTime > startTime),
    room TEXT NOT NULL, subgroup TEXT NOT NULL CHECK(subgroup IN ('I','II','Вся группа')),
    lessonType TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('Запланировано','Отменено','Перенесено')),
    movedDate TEXT, movedPair INTEGER, movedStart TEXT, movedEnd TEXT,
    notes TEXT NOT NULL DEFAULT '', revision INTEGER NOT NULL DEFAULT 1,
    CHECK ((status = 'Перенесено' AND movedDate IS NOT NULL AND movedPair IS NOT NULL AND movedPair > 0
      AND movedStart IS NOT NULL AND movedEnd IS NOT NULL AND movedEnd > movedStart)
      OR (status <> 'Перенесено' AND movedDate IS NULL AND movedPair IS NULL AND movedStart IS NULL AND movedEnd IS NULL)),
    UNIQUE(subjectId,date,pair,subgroup)
  ) STRICT;
  CREATE INDEX lessons_date ON lessons(date,startTime);
  CREATE INDEX lessons_moved ON lessons(movedDate,movedStart) WHERE movedDate IS NOT NULL;`,
  `ALTER TABLE tasks ADD COLUMN debt INTEGER NOT NULL DEFAULT 0 CHECK(debt IN (0,1));
  ALTER TABLE tasks ADD COLUMN createKey TEXT;
  CREATE UNIQUE INDEX task_create_key ON tasks(createKey) WHERE createKey IS NOT NULL;
  CREATE TABLE task_steps (
    id TEXT PRIMARY KEY, taskId INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL, position INTEGER NOT NULL, done INTEGER NOT NULL CHECK(done IN (0,1))
  ) STRICT;
  CREATE INDEX steps_task ON task_steps(taskId,position);
  ALTER TABLE task_sources ADD COLUMN category TEXT;
  ALTER TABLE task_sources ADD COLUMN label TEXT;
  ALTER TABLE task_sources ADD COLUMN link TEXT;
  ALTER TABLE task_sources ADD COLUMN sourceDate TEXT;
  ALTER TABLE task_sources ADD COLUMN confirmed INTEGER NOT NULL DEFAULT 0 CHECK(confirmed IN (0,1));
  CREATE TABLE task_history (
    id INTEGER PRIMARY KEY, taskId INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    at TEXT NOT NULL, change TEXT NOT NULL
  ) STRICT;
  CREATE INDEX history_task ON task_history(taskId,id);
  CREATE TRIGGER task_changes AFTER UPDATE ON tasks BEGIN
    INSERT INTO task_history(taskId,at,change) SELECT NEW.id,NEW.updatedAt,'Статус: ' || OLD.status || ' → ' || NEW.status WHERE OLD.status <> NEW.status;
    INSERT INTO task_history(taskId,at,change) SELECT NEW.id,NEW.updatedAt,'Приоритет: ' || OLD.priority || ' → ' || NEW.priority WHERE OLD.priority <> NEW.priority;
    INSERT INTO task_history(taskId,at,change) SELECT NEW.id,NEW.updatedAt,'Срок: ' || coalesce(OLD.deadline,'Без срока') || ' → ' || coalesce(NEW.deadline,'Без срока') WHERE OLD.deadline IS NOT NEW.deadline;
    INSERT INTO task_history(taskId,at,change) SELECT NEW.id,NEW.updatedAt,CASE NEW.debt WHEN 1 THEN 'Задолженность подтверждена' ELSE 'Отметка задолженности снята' END WHERE OLD.debt <> NEW.debt;
  END;`,
  `CREATE TABLE study_periods (
    id INTEGER PRIMARY KEY, yearStart INTEGER NOT NULL CHECK(yearStart BETWEEN 1900 AND 9998),
    course INTEGER NOT NULL CHECK(course > 0), semester INTEGER NOT NULL CHECK(semester > 0),
    UNIQUE(yearStart,course,semester)
  ) STRICT;
  CREATE TABLE subject_periods (
    subjectId INTEGER PRIMARY KEY REFERENCES subjects(id) ON DELETE CASCADE,
    periodId INTEGER NOT NULL REFERENCES study_periods(id)
  ) STRICT;
  CREATE TABLE study_results (
    id INTEGER PRIMARY KEY, subjectId INTEGER NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    kind TEXT NOT NULL, title TEXT NOT NULL, value TEXT NOT NULL, day TEXT NOT NULL,
    requestKey TEXT NOT NULL UNIQUE
  ) STRICT;
  CREATE INDEX results_subject ON study_results(subjectId,day);
  CREATE TABLE study_events (
    id INTEGER PRIMARY KEY, title TEXT NOT NULL, kind TEXT NOT NULL, day TEXT NOT NULL,
    taskId INTEGER REFERENCES tasks(id) ON DELETE RESTRICT, outcome TEXT,
    requestKey TEXT NOT NULL UNIQUE
  ) STRICT;
  CREATE INDEX events_day ON study_events(day);
  CREATE TABLE study_notices (
    id INTEGER PRIMARY KEY, title TEXT NOT NULL, requestKey TEXT NOT NULL UNIQUE
  ) STRICT;
  CREATE TABLE archive_blobs (
    digest TEXT PRIMARY KEY, content BLOB NOT NULL
  ) STRICT;
  CREATE TABLE archive_materials (
    id INTEGER PRIMARY KEY, title TEXT NOT NULL, filename TEXT NOT NULL, source TEXT NOT NULL,
    sourceDate TEXT, subjectId INTEGER REFERENCES subjects(id) ON DELETE RESTRICT,
    taskId INTEGER REFERENCES tasks(id) ON DELETE RESTRICT,
    digest TEXT NOT NULL REFERENCES archive_blobs(digest), added TEXT NOT NULL
  ) STRICT;
  CREATE UNIQUE INDEX archive_identity ON archive_materials(digest,title,filename,source,
    coalesce(sourceDate,''),coalesce(subjectId,0),coalesce(taskId,0));
  ALTER TABLE lessons ADD COLUMN substitute TEXT NOT NULL DEFAULT '';
  CREATE TABLE import_origins (
    id INTEGER PRIMARY KEY, digest TEXT NOT NULL, rowGroup TEXT NOT NULL,
    rowNumber INTEGER NOT NULL, recordId INTEGER NOT NULL, importedAt TEXT NOT NULL,
    sourceLabel TEXT NOT NULL, UNIQUE(digest,rowGroup,rowNumber,recordId)
  ) STRICT;`,
  `CREATE TABLE subject_debts (
    id INTEGER PRIMARY KEY, subjectId INTEGER NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    title TEXT NOT NULL, source TEXT NOT NULL, closedAt TEXT, requestKey TEXT NOT NULL UNIQUE
  ) STRICT;
  ALTER TABLE study_events ADD COLUMN debtId INTEGER REFERENCES subject_debts(id) ON DELETE RESTRICT;
  CREATE INDEX retakes_debt ON study_events(debtId) WHERE debtId IS NOT NULL;`,
]

export function migrate(db: DatabaseSync) {
  db.exec("BEGIN IMMEDIATE")
  try {
    const version = Number(db.prepare("PRAGMA user_version").get()?.user_version)
    if (version > migrations.length) throw new Error("Эта база создана более новой версией приложения.")
    for (let index = version; index < migrations.length; index++) {
      db.exec(migrations[index])
      db.exec(`PRAGMA user_version=${index + 1}`)
    }
    db.exec("COMMIT")
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }
}
