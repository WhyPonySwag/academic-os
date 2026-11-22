"use client"

import { cloneElement, useId, useState, type FormEvent, type ReactElement, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { ActionResult } from "@/lib/academic/model"

export const selectStyle = "h-9 w-full min-w-0 rounded-lg border border-input bg-card px-2 text-sm focus-visible:outline-primary"
export const areaStyle = "min-h-20 w-full resize-y rounded-lg border border-input bg-card px-3 py-2 text-sm focus-visible:outline-primary"

export function Field({ label, children }: { label: string; children: ReactElement<{ id?: string }> }) {
  const id = useId()
  return (
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={id}>{label}</Label>
      {cloneElement(children, { id })}
    </div>
  )
}

export function RecordPanel({ title, children, close, submit, destructive = false }: {
  title: string
  children: ReactNode
  close: () => void
  submit?: (form: FormData) => Promise<ActionResult>
  destructive?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!submit || busy) return
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError("")
    try {
      const result = await submit(form)
      if (result.error) setError(result.error)
      else close()
    } catch {
      setError("Не удалось подтвердить сохранение. Проверьте соединение с локальным сервером и обновите страницу.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open onOpenChange={open => { if (!open && !busy) close() }}>
      <SheetContent className="overflow-y-auto px-5 pb-6 data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
        <SheetHeader className="border-b px-0 py-5 pr-9">
          <SheetTitle className="text-xl font-semibold break-words">{title}</SheetTitle>
        </SheetHeader>
        {submit ? (
          <form onSubmit={onSubmit} className="space-y-5">
            <fieldset disabled={busy} className="grid min-w-0 gap-4">{children}</fieldset>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2 border-t pt-4">
              <Button type="submit" disabled={busy} variant={destructive ? "destructive" : "default"}>
                {busy ? "Выполняется…" : destructive ? "Подтвердить удаление" : "Сохранить"}
              </Button>
              <Button type="button" variant="outline" disabled={busy} onClick={close}>Отмена</Button>
            </div>
          </form>
        ) : children}
      </SheetContent>
    </Sheet>
  )
}
