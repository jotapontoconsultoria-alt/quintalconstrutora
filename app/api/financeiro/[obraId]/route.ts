import { NextResponse } from 'next/server'
import { atualizadoEm, gravarFinanceiro, lerFinanceiro, validarFinanceiro } from '@/lib/server/financeiro'
import { ehResposta, erro, exigir } from '@/lib/server/http'
import { lerQuadro } from '@/lib/server/quadro'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ID = /^[A-Za-z0-9_-]{1,80}$/

/** Financeiro completo da obra, para a equipe (a consulta vale para todos os perfis da equipe, a gravação só para administrador e editor). */
export async function GET(req: Request, { params }: { params: Promise<{ obraId: string }> }) {
  const u = await exigir(req)
  if (ehResposta(u)) return u
  const { obraId } = await params
  if (!ID.test(obraId)) return erro('Obra inválida.')
  return NextResponse.json({ financeiro: lerFinanceiro(obraId), atualizadoEm: atualizadoEm(obraId) })
}

export async function PUT(req: Request, { params }: { params: Promise<{ obraId: string }> }) {
  const u = await exigir(req, ['admin', 'editor'])
  if (ehResposta(u)) return u
  const { obraId } = await params
  if (!ID.test(obraId) || !lerQuadro().obras.some((o) => o.id === obraId)) return erro('Obra não encontrada.', 404)
  const texto = await req.text()
  if (texto.length > 3 * 1024 * 1024) return erro('Financeiro grande demais.', 413)
  let corpo: { financeiro?: unknown }
  try { corpo = JSON.parse(texto) } catch { return erro('Pedido inválido.') }
  const doc = validarFinanceiro(corpo.financeiro)
  if (typeof doc === 'string') return erro(doc)
  gravarFinanceiro(obraId, doc)
  return NextResponse.json({ ok: true, atualizadoEm: atualizadoEm(obraId) })
}
