import { Suspense } from "react"
import { Subjects } from "@/components/study/subjects"
import { listSubjects } from "@/lib/academic/queries"

export const metadata = { title: "Предметы" }

async function SubjectList({ searchParams }: PageProps<"/subjects">) {
  const [subjects, params] = await Promise.all([listSubjects(), searchParams])
  const scoped = params.subject !== undefined
  return <Subjects key={String(params.subject ?? "")} subjects={scoped ? subjects.filter(s => String(s.id) === params.subject) : subjects} scoped={scoped} />
}

export default function Page(props: PageProps<"/subjects">) {
  return <Suspense fallback={<p>Загрузка предметов…</p>}><SubjectList {...props} /></Suspense>
}
