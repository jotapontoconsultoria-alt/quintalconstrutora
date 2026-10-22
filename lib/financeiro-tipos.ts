/** Estrutura do financeiro de uma obra, igual no navegador e no servidor. Valores em reais (2 casas). */
export type Grupo = 'materiais' | 'mao_de_obra' | 'adm'
export const GRUPOS: Record<Grupo, string> = { materiais: 'Materiais e serviços', mao_de_obra: 'Mão de obra', adm: 'Administração da obra' }

export type FinLancamento = { mes: string; valor: number }
export type FinItem = { nome: string; fornecedor: string; lancamentos: FinLancamento[] }
export type FinCategoria = { nome: string; grupo: Grupo; orcado: number; previsto: number; itens: FinItem[] }
export type FinDoc = { mostrarDetalhe: boolean; categorias: FinCategoria[] }

/** O que o portal recebe: totais já calculados. `itens` só vem quando a obra libera o detalhamento. */
export type FinResumo = {
  detalhe: boolean
  totais: { orcado: number; previsto: number; realizado: number }
  porGrupo: Record<Grupo, number>
  meses: { mes: string; valor: number; acumulado: number }[]
  categorias: { nome: string; grupo: Grupo; orcado: number; previsto: number; realizado: number; itens?: { nome: string; fornecedor: string; realizado: number }[] }[]
  areaM2: number | null
}
