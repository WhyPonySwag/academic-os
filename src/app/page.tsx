import { Suspense } from "react"
import { connection } from "next/server"

import { readDashboard } from "@/lib/academic/home-dashboard"
import { HomeDashboard } from "@/components/study/home-dashboard"

async function DashboardContent() {
  await connection()

  const data = await readDashboard()

  return <HomeDashboard data={data} />
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1250px] p-8 text-sm text-neutral-400">
          Загрузка учебного обзора…
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}
