import { sections, type SectionId } from "@/lib/sections"
import { Card } from "@/components/ui/card"

export function SectionPage({ section, message, description }: {
  section: Exclude<SectionId, "home" | "settings">
  message: string
  description: string
}) {
  const { title, icon: Icon } = sections[section]
  return (
    <>
      <h1 className="page-title mb-6">{title}</h1>
      <Card className="min-h-56 items-center justify-center gap-0 px-6 py-12 text-center">
        <span className="mb-4 grid size-12 place-items-center rounded-lg border bg-secondary text-primary">
          <Icon aria-hidden strokeWidth={1.5} />
        </span>
        <h2 className="text-lg font-semibold">{message}</h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      </Card>
    </>
  )
}
