import "server-only"
import { mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { headers } from "next/headers"
import { notFound } from "next/navigation"

import { migrate } from "./migrations"

let connection: DatabaseSync | undefined

function openDatabase() {
  const file = process.env.ACADEMIC_DB_PATH || join(process.cwd(), "data", "academic.db")
  mkdirSync(dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
  try {
    db.exec("PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL")
    migrate(db)
    return db
  } catch (error) {
    db.close() // SQLite rolls back any uncommitted migration.
    throw error
  }
}

export async function localDatabase() {
  const request = await headers()
  const host = request.get("host") ?? ""
  const origin = request.get("origin")
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host) ||
      (origin && origin !== `http://${host}` && origin !== `https://${host}`)) notFound()
  connection ??= openDatabase()
  return connection
}
