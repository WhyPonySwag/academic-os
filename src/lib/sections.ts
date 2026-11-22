import { History, GraduationCap, ListRestart, BookOpen, CalendarDays, CalendarRange, FolderArchive, LayoutDashboard, ListChecks, Settings2 } from "lucide-react"

export const sections = {
  home: { title: "Главная", href: "/", icon: LayoutDashboard },
  schedule: { title: "Расписание", href: "/schedule", icon: CalendarRange },
  subjects: { title: "Предметы", href: "/subjects", icon: BookOpen },
  tasks: { title: "Задания", href: "/tasks", icon: ListChecks },
  calendar: { title: "Календарь", href: "/calendar", icon: CalendarDays },
  debts: { title: "Долги и пересдачи", href: "/debts", icon: ListRestart },
  results: { title: "Успеваемость", href: "/results", icon: GraduationCap },
  history: { title: "Учебная история", href: "/history", icon: History },
  archive: { title: "Учебный архив", href: "/archive", icon: FolderArchive },
  settings: { title: "Настройки", href: "/settings", icon: Settings2 },
} as const

export type SectionId = keyof typeof sections
