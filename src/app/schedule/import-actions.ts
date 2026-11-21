"use server"

import { localDatabase } from "@/lib/academic/database"
import { processImport } from "@/lib/academic/json-import"
import { revalidatePath } from "next/cache"

export async function previewImport(source: string) {
  return processImport(await localDatabase(), source)
}
export async function confirmImport(source: string, token: string) {
  if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token)) return { error: "Сначала проверьте файл." } as const
  const result = processImport(await localDatabase(), source, token)
  if ("saved" in result && result.saved) {
    for (const path of ["/", "/schedule", "/subjects", "/tasks"]) revalidatePath(path)
  }
  return result
}
