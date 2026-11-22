import { Card } from "@/components/ui/card"

export const metadata = { title: "Настройки" }

export default function SettingsPage() {
  return (
    <>
      <h1 className="page-title mb-6">Настройки</h1>
      <Card className="max-w-3xl gap-0 px-5 py-1">
        <h2 className="border-b py-4 text-base font-semibold">Параметры интерфейса</h2>
        <dl className="divide-y">
          {[["Язык", "Русский"], ["Оформление", "Тёмное"], ["Часовой пояс", "Системный"]].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 py-4">
              <dt className="text-muted-foreground">{label}</dt><dd>{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </>
  )
}
