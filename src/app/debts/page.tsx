import { Suspense } from "react"
import { Debts } from "@/components/study/ledger"

export const metadata = { title: "Долги и пересдачи" }
export default function Page() {
  return <Suspense fallback={<p>Загрузка…</p>}><Debts/></Suspense>
}
