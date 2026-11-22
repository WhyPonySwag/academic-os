"use client"

import Link from "next/link"
import { DraftingCompass } from "lucide-react"
import { NavMain } from "@/components/nav-main"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, useSidebar } from "@/components/ui/sidebar"

export function AppSidebar() {
  const { setOpenMobile } = useSidebar()

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="px-5 py-6">
        <Link href="/" onClick={() => setOpenMobile(false)} className="flex w-fit items-center gap-3 rounded-md">
          <span className="grid size-10 place-items-center rounded-lg border border-border bg-secondary text-primary">
            <DraftingCompass aria-hidden className="size-6" />
          </span>
          <span className="flex flex-col gap-0.5">
            <strong className="text-[15px] tracking-[0.06em]">ACADEMIC OS</strong>
            <span className="text-xs text-muted-foreground">Архитектура</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-3 pt-4">
        <NavMain items={["home", "schedule", "subjects", "tasks", "calendar", "archive"]} label="Рабочее пространство" />
      </SidebarContent>
      <SidebarFooter className="mx-3 border-t px-0 py-3">
        <NavMain items={["settings"]} label="Настройки системы" hideLabel />
      </SidebarFooter>
    </Sidebar>
  )
}
