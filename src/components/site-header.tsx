"use client"

import { ChevronRight } from "lucide-react"
import { usePathname } from "next/navigation"
import { sections } from "@/lib/sections"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteHeader() {
  const pathname = usePathname()
  const current = Object.values(sections).find(({ href }) => href === pathname)
  return (
    <header className="flex h-10 shrink-0 items-center gap-2 border-b bg-sidebar px-4 text-xs sm:px-7">
      <SidebarTrigger title="Боковое меню" />
      <Separator orientation="vertical" className="mx-1.5 h-4 data-vertical:self-auto" />
      <span className="hidden text-muted-foreground sm:inline">Рабочее пространство</span>
      <ChevronRight aria-hidden className="hidden size-3 text-muted-foreground sm:inline" />
      <span>{current?.title ?? "Страница"}</span>
      <span className="ml-auto flex items-center gap-2 text-muted-foreground">
        <span aria-hidden className="size-1.5 rounded-full bg-primary" />Локальный режим
      </span>
    </header>
  )
}
