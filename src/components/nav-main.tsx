"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { sections, type SectionId } from "@/lib/sections"
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"

export function NavMain({ items, label, hideLabel }: { items: SectionId[], label: string, hideLabel?: boolean }) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()

  return (
    <nav aria-label={label}>
      <SidebarGroup className="p-0">
        {!hideLabel && <SidebarGroupLabel className="mb-2 px-3 text-xs text-muted-foreground">{label}</SidebarGroupLabel>}
        <SidebarGroupContent>
          <SidebarMenu className="gap-1">
            {items.map((id) => {
              const { title, href, icon: Icon } = sections[id]
              const active = pathname === href
              return (
                <SidebarMenuItem key={id}>
                  <SidebarMenuButton
                    render={<Link href={href} />}
                    isActive={active}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpenMobile(false)}
                    className="h-10 gap-3 rounded-lg px-3 text-sidebar-foreground data-active:bg-sidebar-accent data-active:text-primary [&_svg]:size-[17px]"
                  >
                    <Icon aria-hidden strokeWidth={1.65} />
                    <span>{title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </nav>
  )
}
