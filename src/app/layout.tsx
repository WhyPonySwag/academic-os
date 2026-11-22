import type { Metadata } from "next"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import "./globals.css"

export const metadata: Metadata = {
  title: { default: "Главная · ACADEMIC OS", template: "%s · ACADEMIC OS" },
  description: "Персональное учебное пространство студента архитектуры.",
  icons: { icon: "/compass-mark.svg" },
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className="dark h-full antialiased">
      <body className="min-h-full">
        <a className="skip-link" href="#page-content">К содержанию</a>
        <SidebarProvider style={{ "--sidebar-width": "13rem" } as React.CSSProperties}>
          <AppSidebar />
          <SidebarInset className="min-w-0">
            <SiteHeader />
            <div id="page-content" tabIndex={-1} className="mx-auto w-full max-w-[1480px] px-3 py-4 outline-none sm:px-5 lg:px-7 lg:py-5">
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  )
}
