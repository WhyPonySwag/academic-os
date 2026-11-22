import { Suspense } from "react"
import { Results } from "@/components/study/ledger"

export const metadata = { title: "Успеваемость" }
export default function Page() {
  return <Suspense fallback={<p>Загрузка…</p>}><Results/></Suspense>
}
