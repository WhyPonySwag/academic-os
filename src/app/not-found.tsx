import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="space-y-5">
      <h1 className="page-title">Страница не найдена</h1>
      <Link href="/" className={buttonVariants({ variant: "outline" })}>На главную</Link>
    </div>
  )
}
