"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, RecordPanel, selectStyle } from "./record-panel"
import type { RegisterAction } from "@/lib/academic/register"

export type EntryField = {
  name: string; label: string; type?: "date" | "number"; initial?: string; min?: number; max?: number
  options?: { value: string | number; label: string }[]
}
export function EntryForm({ title, fields, action, hidden }: {
  title: string; fields: EntryField[]; action: RegisterAction; hidden?: Record<string,string>
}) {
  const [key,setKey] = useState("")
  return <><Button size="sm" variant="outline" onClick={() => setKey(crypto.randomUUID())}>{title}</Button>
    {key && <RecordPanel title={title} close={() => setKey("")} submit={action}>
      <input type="hidden" name="requestKey" value={key}/>
      {Object.entries(hidden ?? {}).map(([name,value]) => <input type="hidden" key={name} name={name} value={value}/>)}
      {fields.map(f => <Field key={f.name} label={f.label}>{f.options
        ? <select name={f.name} className={selectStyle} required defaultValue={f.initial ?? ""}><option value="" disabled>Выберите значение</option>
            {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        : <Input name={f.name} type={f.type ?? "text"} required maxLength={300} min={f.min} max={f.max} defaultValue={f.initial}/>}</Field>)}
    </RecordPanel>}</>
}
