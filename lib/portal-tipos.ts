import type { FinResumo } from '@/lib/financeiro-tipos'

export type SituacaoEtapa = 'no_prazo' | 'atencao' | 'atrasada' | 'sem_prazo' | 'sem_registro' | 'aguardando'

export type PortalEtapa = {
  nome: string
  estado: 'concluida' | 'atual' | 'aguardando'
  /** Prazo (SLA) da etapa em dias; 0 = sem prazo. */
  prazo: number
  /** Dias que a obra ficou (ou está) na etapa; null se a etapa ainda não começou. */
  dias: number | null
  situacao: SituacaoEtapa
  atividades: { feitas: number; total: number }
}

export type PortalFoto = { id: string; url: string; thumb: string; data: string; legenda: string; etapa: string }

export type PortalObra = {
  id: string
  titulo: string
  endereco: string
  condominio: string
  areaM2: number | null
  pavimentos: string
  /** AAAA-MM */
  inicio: string
  previsao: string
  finalizadaEm: string | null
  etapaAtual: string
  /** 0 a 1 */
  progresso: number
  etapas: PortalEtapa[]
  atividadesAtuais: { nome: string; feita: boolean }[]
  fotos: PortalFoto[]
  projetos: { nome: string; link: string }[]
  link3d: string
}

export type PortalResposta = {
  obras: { id: string; titulo: string }[]
  obra: PortalObra | null
  financeiro: FinResumo | null
  financeiroAtualizadoEm: string | null
  geradoEm: string
}
