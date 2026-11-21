import { Suspense } from "react"
import { Schedule } from "@/components/study/schedule"
import { scheduleWeek } from "@/lib/academic/lessons"

export const metadata = { title: "Расписание" }

async function Week({ searchParams }: PageProps<"/schedule">) {
  const params = await searchParams
  const data = await scheduleWeek(params.week)
  const group = params.group === "I" || params.group === "II" ? params.group : params.group === undefined ? undefined : ""
  return <Schedule {...data} groupParam={group} dayParam={typeof params.day === "string" ? params.day : ""} />
}

export default function Page(props: PageProps<"/schedule">) {
  return <Suspense fallback={<p>Загрузка расписания…</p>}><Week {...props} /></Suspense>
}
