import { NextResponse } from 'next/server'
import { obrasDoCliente } from '@/lib/server/auth'
import { ehResposta, exigir } from '@/lib/server/http'
import { montarPortal, lerQuadro, tituloDaObra } from '@/lib/server/portal'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Dados do portal do cliente. O cliente só recebe as obras ligadas ao próprio usuário;
 * a equipe pode abrir qualquer obra (?obra=ID) para conferir como o cliente enxerga.
 */
export async function GET(req: Request) {
  const u = await exigir(req, ['admin', 'editor', 'leitor', 'cliente'])
  if (ehResposta(u)) return u
  const quadro = lerQuadro()
  const titulos = new Map(quadro.obras.map((o) => [o.id, tituloDaObra(o)]))
  const permitidas = u.papel === 'cliente' ? obrasDoCliente(u.id).filter((id) => titulos.has(id)) : quadro.obras.map((o) => o.id)
  const lista = permitidas.map((id) => ({ id, titulo: titulos.get(id) as string }))
  const pedida = new URL(req.url).searchParams.get('obra') ?? ''
  const escolhida = permitidas.includes(pedida) ? pedida : permitidas[0]
  if (!escolhida) return NextResponse.json({ obras: lista, obra: null, financeiro: null, financeiroAtualizadoEm: null, geradoEm: new Date().toISOString() })
  return NextResponse.json(montarPortal(escolhida, lista), { headers: { 'Cache-Control': 'no-store' } })
}
