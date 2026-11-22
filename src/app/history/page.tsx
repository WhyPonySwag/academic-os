import { Suspense } from "react"
import { History } from "@/components/study/ledger"

export const metadata = { title: "Учебная история" }
export default function Page() {
  return <Suspense fallback={<p>Загрузка…</p>}><History/></Suspense>
}
