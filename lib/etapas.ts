/** Etapas, atividades e prazos padrão: usados pelo quadro (navegador) e pelo portal do cliente (servidor). */

export const STAGES = ['PROJETO', 'APROVAÇÃO', 'SERVIÇOS PRELIMINARES', 'FUNDAÇÃO', 'ESTRUTURA', 'ALVENARIA', 'INSTALAÇÕES', 'REBOCO', 'GESSO', 'PINTURA', 'REVESTIMENTOS', 'ESQUADRIAS', 'ACABAMENTOS'] as const
export type Stage = (typeof STAGES)[number]

/** Atividades de cada etapa. Cada uma ganha uma caixa de marcação; as de etapas em LINK_ETAPAS ganham também o link do Drive. */
export const ATIVIDADES: Record<Stage, readonly string[]> = {
  'PROJETO': ['Arquitetônico', 'Hidrossanitário', 'Elétrico', 'Estrutural'],
  'APROVAÇÃO': ['Condomínio', 'Prefeitura', 'Banco / Crédito'],
  'SERVIÇOS PRELIMINARES': ['Topografia', 'Gabarito', 'Movimentação de terra', 'Infra (Barraco/Banheiro)', 'Água', 'Energia Elétrica'],
  'FUNDAÇÃO': ['Marcação', 'Estacas', 'Blocos'],
  'ESTRUTURA': ['Primeiro Pavimento', 'Segundo Pavimento', 'Cobertura'],
  'ALVENARIA': ['Primeiro Pavimento', 'Segundo Pavimento', 'Cobertura'],
  'INSTALAÇÕES': ['Pluvial', 'Esgoto', 'Hidráulica', 'Elétrica'],
  'REBOCO': ['Reboco Interno', 'Reboco Externo'],
  'GESSO': ['Primeiro Pavimento', 'Segundo Pavimento'],
  'PINTURA': ['Preparação', 'Emassamento', 'Pintura'],
  'REVESTIMENTOS': ['Paredes Internas', 'Paredes Externas', 'Piso Térreo', 'Piso Superior', 'Soleiras'],
  'ESQUADRIAS': ['Portas Internas', 'Portas Externas', 'Janelas', 'Guarda-Corpos', 'Vistas e Rodapés'],
  'ACABAMENTOS': [],
}
export const LINK_ETAPAS: readonly Stage[] = ['PROJETO']
/** Pastas do Drive da etapa PROJETO: as atividades do projeto + as imagens 3D (que só têm link, sem caixa de marcação). */
export const IMAGENS_3D = 'IMAGENS 3D'
export const PASTAS_DRIVE: readonly string[] = [...ATIVIDADES.PROJETO, IMAGENS_3D]

/** Prazo esperado, em dias, para cada etapa (0 = sem prazo). */
export type Sla = Record<Stage, number>

export const DEFAULT_SLA: Sla = {
  'PROJETO': 30,
  'APROVAÇÃO': 45,
  'FUNDAÇÃO': 20,
  'SERVIÇOS PRELIMINARES': 15,
  'ESTRUTURA': 45,
  'ALVENARIA': 45,
  'INSTALAÇÕES': 30,
  'REBOCO': 20,
  'GESSO': 15,
  'PINTURA': 20,
  'REVESTIMENTOS': 45,
  'ESQUADRIAS': 15,
  'ACABAMENTOS': 30,
}

