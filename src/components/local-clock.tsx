"use client"

import { useSyncExternalStore } from "react"
import { Clock3 } from "lucide-react"

const timeFormat = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })

function subscribe(tick: () => void) {
  const timer = window.setInterval(tick, 1000)
  document.addEventListener("visibilitychange", tick)
  return () => {
    window.clearInterval(timer)
    document.removeEventListener("visibilitychange", tick)
  }
}

const readMinute = () => Math.floor(Date.now() / 60000)
const serverMinute = () => null

export function LocalClock() {
  const minute = useSyncExternalStore(subscribe, readMinute, serverMinute)
  const now = minute === null ? null : new Date(minute * 60000)

  return (
    <span className="inline-flex items-center gap-1.5 text-primary" title="Местное время">
      <Clock3 aria-hidden className="size-3.5" />
      <span className="sr-only">Местное время</span>
      <time dateTime={now?.toISOString()} className="tabular-nums">
        {now ? timeFormat.format(now) : "––:––"}
      </time>
    </span>
  )
}
