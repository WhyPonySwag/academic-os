"use client"

import { useState } from "react"
import { confirmImport, previewImport } from "@/app/schedule/import-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { importGroups, maxJsonBytes, type ImportResult } from "@/lib/academic/import-model"
import { priorities, statuses } from "@/lib/academic/model"
import { areaStyle, Field, RecordPanel } from "./record-panel"

export function ImportPanel({ close }: { close: () => void }) {
  const [source, setSource] = useState("")
  const [result, setResult] = useState<ImportResult | null>(null)
  const [busy, setBusy] = useState(false)
  const report = result && "rows" in result ? result : null
  const ready = report?.rows.filter(row => !row.reason).length ?? 0
  const document = report ? JSON.parse(source.replace(/^\uFEFF/, "")) : null

  function change(text: string) {
    setSource(text)
    setResult(null)
  }
  async function read(file?: File) {
    if (!file) return
    change("")
    if (file.size > maxJsonBytes) { setResult({ error: "Максимальный размер файла — 256 КиБ." }); return }
    setBusy(true)
    try { change(await file.text()) }
    catch { setResult({ error: "Не удалось прочитать файл." }) }
    finally { setBusy(false) }
  }
  async function checkOrSave(token?: string) {
    setBusy(true)
    try { setResult(token ? await confirmImport(source, token) : await previewImport(source)) }
    catch { setResult({ error: "Не удалось получить результат. Проверьте файл повторно." }) }
    finally { setBusy(false) }
  }

  return (
    <RecordPanel title="Импорт JSON" close={() => { if (!busy) close() }}>
      <details className="rounded-lg border p-3 text-sm">
        <summary className="cursor-pointer font-medium">Формат файла</summary>
        <div className="mt-3 space-y-2 text-muted-foreground">
          <p>Объект с полем version равным 1 и массивами subjects, tasks, lessons. Достаточно одного массива. До 500 строк и 256 КиБ на файл.</p>
          <p><b>subjects</b> — title и semester (целое число). Дополнительно teacher, assessment, credits (число), notes.</p>
          <p><b>tasks</b> — title и ссылка на предмет. Дополнительно description, status, priority, deadline, issuedOn, notes. Статусы: {statuses.join(", ")}. Приоритеты: {priorities.join(", ")}.</p>
          <p><b>lessons</b> — ссылка на предмет, teacher, date, pair (целое число), startTime, endTime, room, subgroup («I», «II», «Вся группа»), lessonType. Дополнительно notes и status («Запланировано», «Отменено», «Перенесено»). Для переноса обязательны movedDate, movedPair, movedStart и movedEnd.</p>
          <p>Ссылка на предмет — числовой subjectId или объект subject с полями title и semester. Предмет может быть в том же файле. Даты записываются как ГГГГ-ММ-ДД, время — ЧЧ:ММ.</p>
          <p>Дубли предметов определяются по названию и семестру, заданий — по предмету, названию и дате выдачи, занятий — по предмету, исходной дате, паре и подгруппе. Такие строки пропускаются.</p>
        </div>
      </details>
      <Field label="Файл JSON"><Input type="file" accept=".json,application/json" disabled={busy} onChange={e => void read(e.target.files?.[0])} /></Field>
      <Field label="Содержимое JSON"><textarea value={source} disabled={busy} onChange={e => change(e.target.value)} className={areaStyle + " min-h-32 font-mono"} placeholder={'{"version":1,"lessons":[]}'} /></Field>
      {result && "error" in result && <p role="alert" className="text-sm text-destructive">{result.error}</p>}
      <Button disabled={busy || !source.trim()} variant="outline" onClick={() => void checkOrSave()}>Предварительный просмотр</Button>
      {report && <>
        <h3 className="font-semibold">{report.saved ? "Результат импорта" : "Проверка записей"}</h3>
        <p role="status" className="text-sm">{report.saved ? "Записано" : "Готово к записи"}: {ready}. Отклонено: {report.rows.length - ready}.</p>
        {!report.saved && ready > 0 && <Button disabled={busy} onClick={() => void checkOrSave(report.token)}>Подтвердить запись ({ready})</Button>}
        <ol className="divide-y rounded-lg border px-3">
          {report.rows.map(row => <li key={row.group + row.index} className="py-2 text-sm">
            <details>
              <summary className="cursor-pointer wrap-anywhere">{importGroups[row.group]} · {row.index} · {row.title}</summary>
              <pre className="mt-2 text-xs whitespace-pre-wrap wrap-anywhere">{JSON.stringify(document[row.group][row.index - 1], null, 2)}</pre>
            </details>
            <p className={row.reason ? "text-destructive" : "text-muted-foreground"}>{row.reason ?? (report.saved ? "Записано" : "Готово к записи")}</p>
          </li>)}
        </ol>
      </>}
    </RecordPanel>
  )
}
