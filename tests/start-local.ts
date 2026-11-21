import { spawn } from "node:child_process"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { FullConfig } from "@playwright/test"

// Playwright starts an isolated production server and database. Running a
// fresh build here is essential: "next start" serves the last .next output,
// even when src/app/page.tsx has changed.
export default async function startLocal(config: FullConfig) {
  const { port } = new URL(config.projects[0].use.baseURL!)
  const directory = await mkdtemp(join(tmpdir(), "academic-os-e2e-"))
  const database = join(directory, "academic.db")
  const env = {
    ...process.env,
    ACADEMIC_DB_PATH: database,
    NEXT_TELEMETRY_DISABLED: "1",
  }

  async function buildApplication() {
    const child = spawn(
      process.execPath,
      [require.resolve("next/dist/bin/next"), "build"],
      { cwd: process.cwd(), env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
    )
    let log = ""
    child.stdout.on("data", chunk => { log += String(chunk) })
    child.stderr.on("data", chunk => { log += String(chunk) })

    const result = await new Promise<number>((resolve, reject) => {
      child.once("error", reject)
      child.once("close", code => resolve(code ?? -1))
    })
    if (result !== 0) {
      throw new Error(`Next.js build failed before Playwright (exit ${result}):\n${log.slice(-12000)}`)
    }
  }

  try {
    // CI builds explicitly before testing; local direct "playwright test"
    // builds automatically so it can never use a stale production bundle.
    if (process.env.ACADEMIC_E2E_SKIP_BUILD !== "1") {
      await buildApplication()
    }

    const server = spawn(
      process.execPath,
      [
        require.resolve("next/dist/bin/next"),
        "start", "--hostname", "127.0.0.1", "--port", port,
      ],
      {
        cwd: process.cwd(),
        env,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    )

    const closed = new Promise<void>(resolve => {
      server.once("close", () => resolve())
    })

    try {
      await new Promise<void>((resolve, reject) => {
        let log = ""
        const timeout = setTimeout(() => reject(
          new Error(`Isolated Playwright server did not start:\n${log.slice(-12000)}`),
        ), 60000)

        const ready = () => {
          clearTimeout(timeout)
          resolve()
        }
        const failed = (error: Error) => {
          clearTimeout(timeout)
          reject(error)
        }

        server.stderr.on("data", chunk => { log += String(chunk) })
        server.stdout.on("data", chunk => {
          log += String(chunk)
          if (log.includes("Ready in")) ready()
        })
        server.once("error", failed)
        server.once("close", () => failed(new Error(log)))
      })
    } catch (error) {
      server.kill()
      await closed
      throw error
    }

    return async () => {
      server.kill()
      await closed
      await rm(directory, { recursive: true, force: true })
    }
  } catch (error) {
    await rm(directory, { recursive: true, force: true })
    throw error
  }
}
