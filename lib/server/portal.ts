import { ATIVIDADES, IMAGENS_3D, PASTAS_DRIVE, STAGES, type Stage } from '@/lib/etapas'
import { lerValor } from '@/lib/dinheiro'
import type { PortalEtapa, PortalFoto, PortalObra, SituacaoEtapa } from '@/lib/portal-tipos'
import { atualizadoEm, lerFinanceiro, resumir } from './financeiro'
import { lerQuadro, tituloDaObra, type ObraGuardada } from './quadro'

const DIA = 86_400_000

function linkSeguro(v: unknown): string {
  if (typeof v !== 'string' || !v.trim()) return ''
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(v.trim()) ? v.trim() : `https://${v.trim()}`)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : ''
  } catch {
    return ''
  }
}

const ehEtapa = (e: unknown): e is Stage => typeof e === 'string' && (STAGES as readonly string[]).includes(e)
const tempo = (iso: unknown) => { const t = new Date(String(iso)).getTime(); return Number.isFinite(t) ? t : null }

/** Monta, só com o que o cliente pode ver, o resumo de uma obra. Nada de contatos, observações internas ou empreiteiros. */
export function montarObra(o: ObraGuardada, sla: Record<string, number>, agora = Date.now()): PortalObra {
  const etapaAtual: Stage = ehEtapa(o.etapa) ? o.etapa : 'PROJETO'
  const idxAtual = STAGES.indexOf(etapaAtual)
  const fim = o.finalizadaEm ? tempo(o.finalizadaEm) : null
  const desde = tempo(o.desde) ?? agora

  // Histórico em ordem: cada entrada vale até a próxima (ou até agora / a finalização).
  const hist = (Array.isArray(o.historico) ? o.historico : [])
    .filter((h) => ehEtapa(h?.etapa) && tempo(h?.em) !== null)
    .map((h) => ({ etapa: h.etapa as Stage, em: tempo(h.em) as number }))
    .sort((a, b) => a.em - b.em)
  if (hist.length === 0) hist.push({ etapa: etapaAtual, em: desde })
  const dias = new Map<Stage, number>()
  hist.forEach((h, i) => {
    const ate = hist[i + 1]?.em ?? fim ?? agora
    dias.set(h.etapa, (dias.get(h.etapa) ?? 0) + Math.max(0, ate - h.em))
  })

  const atividades = o.atividades ?? {}
  const prog = (e: Stage) => {
    const lista = ATIVIDADES[e]
    return { feitas: lista.filter((n) => atividades[`${e}|${n}`]?.feita).length, total: lista.length }
  }

  const etapas: PortalEtapa[] = STAGES.map((nome, i) => {
    const prazo = Math.max(0, Math.floor(Number(sla[nome]) || 0))
    const estado: PortalEtapa['estado'] = fim !== null || i < idxAtual ? 'concluida' : i === idxAtual ? 'atual' : 'aguardando'
    const ms = dias.get(nome)
    const d = estado === 'aguardando' || ms === undefined ? null : Math.floor(ms / DIA)
    let situacao: SituacaoEtapa
    if (estado === 'aguardando') situacao = 'aguardando'
    else if (d === null) situacao = 'sem_registro'
    else if (prazo === 0) situacao = 'sem_prazo'
    else if (d > prazo) situacao = 'atrasada'
    else if (estado === 'atual' && d >= prazo * 0.8) situacao = 'atencao'
    else situacao = 'no_prazo'
    return { nome, estado, prazo, dias: d, situacao, atividades: prog(nome) }
  })

  const pAtual = prog(etapaAtual)
  const progresso = fim !== null ? 1 : (idxAtual + (pAtual.total ? pAtual.feitas / pAtual.total : 0)) / STAGES.length

  const etapaDaFoto = (data: unknown): string => {
    const t = tempo(data)
    if (t === null) return etapaAtual
    let r = hist[0].etapa
    for (const h of hist) if (h.em <= t) r = h.etapa
    return r
  }
  const fotos: PortalFoto[] = (o.fotos ?? [])
    .filter((f) => typeof f?.url === 'string')
    .map((f) => ({ id: String(f.id), url: f.url, thumb: f.thumb || f.url, data: f.data ?? '', legenda: String(f.legenda ?? ''), etapa: etapaDaFoto(f.data) }))
    .sort((a, b) => (tempo(b.data) ?? 0) - (tempo(a.data) ?? 0))

  const projetos = PASTAS_DRIVE.filter((n) => n !== IMAGENS_3D)
    .map((nome) => ({ nome, link: linkSeguro(atividades[`PROJETO|${nome}`]?.link) }))
    .filter((p) => p.link)

  return {
    id: o.id,
    titulo: tituloDaObra(o),
    endereco: String(o.endereco ?? ''),
    condominio: String(o.condominio ?? ''),
    areaM2: lerValor(String(o.area ?? '')),
    pavimentos: String(o.pavimentos ?? ''),
    inicio: /^\d{4}-\d{2}/.test(String(o.inicio)) ? String(o.inicio).slice(0, 7) : '',
    previsao: /^\d{4}-\d{2}/.test(String(o.previsao)) ? String(o.previsao).slice(0, 7) : '',
    finalizadaEm: fim !== null ? String(o.finalizadaEm) : null,
    etapaAtual,
    progresso,
    etapas,
    atividadesAtuais: ATIVIDADES[etapaAtual].map((nome) => ({ nome, feita: !!atividades[`${etapaAtual}|${nome}`]?.feita })),
    fotos,
    projetos,
    link3d: linkSeguro(atividades[`PROJETO|${IMAGENS_3D}`]?.link),
  }
}

export function montarPortal(obraId: string, todas: { id: string; titulo: string }[]) {
  const q = lerQuadro()
  const o = q.obras.find((x) => x.id === obraId)
  if (!o) return { obras: todas, obra: null, financeiro: null, financeiroAtualizadoEm: null, geradoEm: new Date().toISOString() }
  const obra = montarObra(o, q.sla)
  const doc = lerFinanceiro(obraId)
  const financeiro = doc.categorias.length ? resumir(doc, doc.mostrarDetalhe, obra.areaM2) : null
  return { obras: todas, obra, financeiro, financeiroAtualizadoEm: atualizadoEm(obraId), geradoEm: new Date().toISOString() }
}

export { lerQuadro, tituloDaObra }
