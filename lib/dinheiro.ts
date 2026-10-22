const formato = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Valor em reais no padrão brasileiro, sempre com centavos: R$ 1.008.182,92 */
export const brl = (n: number) => formato.format(n).replace(/ /g, ' ')

/** Número com milhar e vírgula, sem o símbolo: 1.008.182,92 (para campos de digitação). */
export const numeroBR = (n: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

/** Lê o que a pessoa digitou ("1.234,56", "1234,5", "1234.56"). Devolve null se não for um número. */
export function lerValor(texto: string): number | null {
  let t = texto.replace(/[R$\s]/g, '')
  if (!t) return null
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  else if ((t.match(/\./g) ?? []).length > 1) t = t.replace(/\./g, '')
  const n = Number(t)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

export const pct = (n: number) => `${(n * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
/** "2026-07" → "jul/26" */
export const mesCurto = (mes: string) => { const [a, m] = mes.split('-'); return `${MESES[Number(m) - 1] ?? m}/${a.slice(2)}` }
/** "2026-07" → "07/2026" */
export const mesBR = (mes: string) => (mes ? mes.slice(0, 7).split('-').reverse().join('/') : '')
