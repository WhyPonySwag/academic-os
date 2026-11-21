import { Suspense } from "react"
import { Tasks } from "@/components/study/tasks"
import { taskWorkspace } from "@/lib/academic/queries"

export const metadata = { title: "Задания" }

async function TaskList({ searchParams }: PageProps<"/tasks">) {
  const [params, data] = await Promise.all([searchParams, taskWorkspace()])
  const subject = data.subjects.find(s => String(s.id) === params.subject)
  const task = typeof params.task === "string" ? Number(params.task) : 0
  return <Tasks key={`${subject?.id ?? 0}-${task}-${params.debt ?? ""}-${params.view ?? ""}`} {...data} initialSubject={String(subject?.id ?? "")} initialTask={task} initialView={params.view === "attention" || params.view === "unfinished" ? params.view : ""} initialDebt={params.debt === "1" ? "debt" : ""} />
}

export default function Page(props: PageProps<"/tasks">) {
  return <Suspense fallback={<p>Загрузка заданий…</p>}><TaskList {...props} /></Suspense>
}
