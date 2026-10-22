import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { FOTOS_DIR } from '@/lib/server/db'
import { obrasDoCliente } from '@/lib/server/auth'
import { ehResposta, erro, exigir } from '@/lib/server/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Entrega a foto somente para quem está logado. */
export async function GET(req: Request, { params }: { params: Promise<{ caminho: string[] }> }) {
  const u = await exigir(req, ['admin', 'editor', 'leitor', 'cliente'])
  if (ehResposta(u)) return u
  const { caminho } = await params
  if (caminho.length !== 2 || !/^[A-Za-z0-9_-]{1,80}$/.test(caminho[0]) || !/^[A-Za-z0-9_-]{1,80}(-thumb)?\.jpg$/.test(caminho[1])) return erro('Não encontrada.', 404)
  if (u.papel === 'cliente' && !obrasDoCliente(u.id).includes(caminho[0])) return erro('Não encontrada.', 404)
  try {
    const arquivo = await readFile(path.join(FOTOS_DIR, caminho[0], caminho[1]))
    return new Response(new Uint8Array(arquivo), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=31536000, immutable' } })
  } catch {
    return erro('Não encontrada.', 404)
  }
}
