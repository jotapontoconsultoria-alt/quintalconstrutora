import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { FOTOS_DIR } from '@/lib/server/db'
import { ehResposta, erro, exigir } from '@/lib/server/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SEGURO = /^[A-Za-z0-9_-]{1,80}$/
const MAX_BYTES = 5 * 1024 * 1024

const ehJpeg = (b: Buffer) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff

/** Recebe a foto já reduzida pelo navegador (versão grande + miniatura, ambas JPEG). */
export async function POST(req: Request) {
  const u = await exigir(req, ['admin', 'editor'])
  if (ehResposta(u)) return u
  const form = await req.formData().catch(() => null)
  const obra = String(form?.get('obra') ?? '')
  const id = String(form?.get('id') ?? '')
  const grande = form?.get('grande')
  const thumb = form?.get('thumb')
  if (!SEGURO.test(obra) || !SEGURO.test(id) || !(grande instanceof File) || !(thumb instanceof File)) return erro('Pedido inválido.')
  if (grande.size > MAX_BYTES || thumb.size > MAX_BYTES) return erro('Foto grande demais.', 413)
  const bg = Buffer.from(await grande.arrayBuffer())
  const bt = Buffer.from(await thumb.arrayBuffer())
  if (!ehJpeg(bg) || !ehJpeg(bt)) return erro('Formato de imagem inválido.')
  const pasta = path.join(FOTOS_DIR, obra)
  await mkdir(pasta, { recursive: true })
  await Promise.all([writeFile(path.join(pasta, `${id}.jpg`), bg), writeFile(path.join(pasta, `${id}-thumb.jpg`), bt)])
  return NextResponse.json({ url: `/api/fotos/${obra}/${id}.jpg`, thumb: `/api/fotos/${obra}/${id}-thumb.jpg` })
}

/** Apaga arquivos de foto (melhor esforço). Corpo: { caminhos: ["obra/id.jpg", ...] }. */
export async function DELETE(req: Request) {
  const u = await exigir(req, ['admin', 'editor'])
  if (ehResposta(u)) return u
  const corpo = (await req.json().catch(() => null)) as { caminhos?: unknown } | null
  const caminhos = Array.isArray(corpo?.caminhos) ? corpo.caminhos.slice(0, 200) : []
  for (const c of caminhos) {
    const [obra, arquivo, ...resto] = String(c).split('/')
    if (resto.length || !SEGURO.test(obra ?? '') || !/^[A-Za-z0-9_-]{1,80}(-thumb)?\.jpg$/.test(arquivo ?? '')) continue
    await unlink(path.join(FOTOS_DIR, obra, arquivo)).catch(() => {})
  }
  return NextResponse.json({ ok: true })
}
