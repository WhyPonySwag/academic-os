import { localDatabase } from "@/lib/academic/database"

export async function GET(_request: Request, context: RouteContext<"/archive/files/[id]">) {
  const {id} = await context.params
  const db = await localDatabase()
  const row = db.prepare("SELECT m.filename,b.content FROM archive_materials m JOIN archive_blobs b ON b.digest=m.digest WHERE m.id=?").get(id)
  if (!row || !(row.content instanceof Uint8Array)) return new Response(null,{status:404})
  return new Response(new Uint8Array(row.content), {headers:{
    "Content-Type":"application/octet-stream","X-Content-Type-Options":"nosniff","Cache-Control":"private, no-store",
    "Content-Disposition":"attachment; filename*=UTF-8''"+encodeURIComponent(String(row.filename)).replace(/'/g,"%27")
  }})
}
