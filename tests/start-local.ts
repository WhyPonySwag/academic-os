import { spawn } from "node:child_process"
import { once } from "node:events"
import { mkdtemp, rmdir, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { FullConfig } from "@playwright/test"

export default async function startLocal(config: FullConfig) {
  const { port } = new URL(config.projects[0].use.baseURL!)
  const directory = await mkdtemp(join(tmpdir(), "academic-os-e2e-"))
  const database = join(directory, "academic.db")
  // Only this freshly created filename may be used by visual fixtures.
  if (config.configFile.endsWith("visual/playwright.config.ts") || config.configFile.endsWith("visual\\playwright.config.ts"))
    process.env.ACADEMIC_VISUAL_DB = database
  const server = spawn(process.execPath, [
    require.resolve("next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", port,
  ], {
    env: { ...process.env, ACADEMIC_DB_PATH: database, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  })
  const closed = once(server, "close")
  async function stop() {
    server.kill()
    await closed
    for (const suffix of ["", "-wal", "-shm", "-journal"]) await rm(database + suffix, { force: true })
    await rmdir(directory)
  }
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Локальный тестовый сервер не запустился.")), 30000)
      let log = ""
      server.stderr.on("data", chunk => { log += chunk })
      server.stdout.on("data", chunk => {
        log += chunk
        if (log.includes("Ready in")) { clearTimeout(timeout); resolve() }
      })
      server.once("error", reject)
      server.once("close", () => { clearTimeout(timeout); reject(new Error(log)) })
    })
    return stop
  } catch (error) {
    await stop()
    throw error
  }
}
