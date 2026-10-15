import { NextResponse } from 'next/server'
import { db } from '@/lib/server/db'
import { eventos } from '@/lib/server/eventos'
import { ehResposta, erro, exigir } from '@/lib/server/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ID = 'default'
const LIMITE_BYTES = 4 * 1024 * 1024

export async function GET(req: Request) {
  const u = await exigir(req)
  if (ehResposta(u)) return u
  const linha = db().prepare('select dados from quadro where id = ?').get(ID) as { dados: string } | undefined
  return NextResponse.json({ dados: linha ? JSON.parse(linha.dados) : null })
}

export async function PUT(req: Request) {
  const u = await exigir(req, ['admin', 'editor'])
  if (ehResposta(u)) return u
  const texto = await req.text()
  if (texto.length > LIMITE_BYTES) return erro('Quadro grande demais.', 413)
  let corpo: { dados?: unknown; cliente?: unknown }
  try { corpo = JSON.parse(texto) } catch { return erro('Pedido inválido.') }
  const d = corpo.dados as { obras?: unknown; sla?: unknown; slaAtividades?: unknown } | undefined
  if (!d || typeof d !== 'object' || !Array.isArray(d.obras) || typeof d.sla !== 'object') return erro('Quadro inválido.')
  const dados = JSON.stringify({ obras: d.obras, sla: d.sla, slaAtividades: d.slaAtividades ?? {} })
  db()
    .prepare('insert into quadro (id, dados, atualizado_em) values (?, ?, ?) on conflict (id) do update set dados = excluded.dados, atualizado_em = excluded.atualizado_em')
    .run(ID, dados, new Date().toISOString())
  eventos.emit('quadro', { dados: JSON.parse(dados), cliente: typeof corpo.cliente === 'string' ? corpo.cliente : '' })
  return NextResponse.json({ ok: true })
}
