import { db } from './db'
import { DEFAULT_SLA, type Sla } from '@/lib/etapas'

/** Formato do quadro guardado no servidor (a mesma estrutura que o painel grava). Só os campos usados no servidor. */
export type ObraGuardada = {
  id: string
  nomeObra?: string
  cliente?: string
  endereco?: string
  condominio?: string
  area?: string
  pavimentos?: string
  inicio?: string
  previsao?: string
  etapa?: string
  desde?: string
  fotos?: { id: string; url: string; thumb?: string; data?: string; legenda?: string }[]
  capa?: string
  atividades?: Record<string, { feita?: boolean; link?: string; em?: string }>
  historico?: { etapa: string; em: string }[]
  finalizadaEm?: string
}

export type QuadroGuardado = { obras: ObraGuardada[]; sla: Sla }

export function lerQuadro(): QuadroGuardado {
  const linha = db().prepare("select dados from quadro where id = 'default'").get() as { dados: string } | undefined
  if (!linha) return { obras: [], sla: DEFAULT_SLA }
  try {
    const bruto = JSON.parse(linha.dados) as unknown
    const lista = Array.isArray(bruto) ? bruto : (bruto as { obras?: unknown })?.obras
    const sla = Array.isArray(bruto) ? undefined : (bruto as { sla?: Partial<Sla> })?.sla
    return {
      obras: (Array.isArray(lista) ? lista : []).filter((o): o is ObraGuardada => !!o && typeof (o as ObraGuardada).id === 'string'),
      sla: { ...DEFAULT_SLA, ...(sla ?? {}) },
    }
  } catch {
    return { obras: [], sla: DEFAULT_SLA }
  }
}

export const tituloDaObra = (o: ObraGuardada) => (o.nomeObra ?? '').trim() || (o.cliente ?? '').trim() || 'Obra'

/** Mantém só ids de obras que existem no quadro. */
export function obrasValidas(bruto: unknown): string[] {
  if (!Array.isArray(bruto)) return []
  const existentes = new Set(lerQuadro().obras.map((o) => o.id))
  return Array.from(new Set(bruto.map(String))).filter((id) => existentes.has(id)).slice(0, 20)
}
