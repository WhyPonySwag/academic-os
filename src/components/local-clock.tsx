"use client"

import { useSyncExternalStore } from "react"
import { Clock3 } from "lucide-react"

const dateFormat = new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
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
    <div className="relative z-10 px-5 py-6 sm:px-8">
      <p className="flex items-center gap-2 text-xs font-medium text-primary"><Clock3 aria-hidden className="size-4" />Местное время</p>
      <time dateTime={now?.toISOString()} className="my-1.5 block text-[clamp(3.5rem,6vw,5rem)] leading-none font-medium tracking-[-0.055em] tabular-nums">
        {now ? timeFormat.format(now) : "––:––"}
      </time>
      <p className="text-sm text-[#d3d0cb] first-letter:uppercase">{now ? dateFormat.format(now) : "Сегодня"}</p>
    </div>
  )
}
