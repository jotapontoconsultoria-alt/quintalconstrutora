import { randomUUID } from 'node:crypto'
import { db } from './db'
import { GRUPOS, type FinCategoria, type FinDoc, type FinResumo, type Grupo } from '@/lib/financeiro-tipos'

const cent = (v: number) => Math.round(v * 100)
const reais = (c: number) => c / 100

export function lerFinanceiro(obraId: string): FinDoc {
  const cfg = db().prepare('select mostrar_detalhe as m from fin_config where obra_id = ?').get(obraId) as { m: number } | undefined
  const cats = db().prepare('select id, nome, grupo, orcado_cent as o, previsto_cent as p from fin_categoria where obra_id = ? order by ordem').all(obraId) as { id: string; nome: string; grupo: Grupo; o: number; p: number }[]
  const categorias: FinCategoria[] = cats.map((c) => {
    const itens = db().prepare('select id, nome, fornecedor from fin_item where categoria_id = ? order by ordem').all(c.id) as { id: string; nome: string; fornecedor: string }[]
    return {
      nome: c.nome,
      grupo: c.grupo,
      orcado: reais(c.o),
      previsto: reais(c.p),
      itens: itens.map((i) => ({
        nome: i.nome,
        fornecedor: i.fornecedor,
        lancamentos: (db().prepare('select mes, valor_cent as v from fin_lancamento where item_id = ? order by mes, rowid').all(i.id) as { mes: string; v: number }[]).map((l) => ({ mes: l.mes, valor: reais(l.v) })),
      })),
    }
  })
  return { mostrarDetalhe: cfg?.m === 1, categorias }
}

/** Confere o que chegou do navegador. Devolve o documento limpo ou uma mensagem de erro. */
export function validarFinanceiro(bruto: unknown): FinDoc | string {
  if (!bruto || typeof bruto !== 'object') return 'Financeiro inválido.'
  const b = bruto as { mostrarDetalhe?: unknown; categorias?: unknown }
  if (!Array.isArray(b.categorias) || b.categorias.length > 60) return 'Categorias inválidas.'
  const txt = (v: unknown, max = 120) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 1e10 ? Math.round(v * 100) / 100 : null)
  const categorias: FinCategoria[] = []
  for (const c of b.categorias as Record<string, unknown>[]) {
    const nome = txt(c?.nome)
    if (!nome) return 'Toda categoria precisa de um nome.'
    const grupo = String(c.grupo) in GRUPOS ? (String(c.grupo) as Grupo) : 'materiais'
    const orcado = num(c.orcado ?? 0), previsto = num(c.previsto ?? 0)
    if (orcado === null || previsto === null || orcado < 0 || previsto < 0) return `Valores inválidos em "${nome}".`
    if (!Array.isArray(c.itens) || c.itens.length > 100) return `Itens inválidos em "${nome}".`
    const itens = []
    for (const i of c.itens as Record<string, unknown>[]) {
      const inome = txt(i?.nome)
      if (!inome) return `Todo item de "${nome}" precisa de um nome.`
      if (!Array.isArray(i.lancamentos) || i.lancamentos.length > 300) return `Lançamentos inválidos em "${inome}".`
      const lancamentos = []
      for (const l of i.lancamentos as Record<string, unknown>[]) {
        const mes = String(l?.mes ?? '')
        const valor = num(l?.valor)
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes) || valor === null) return `Lançamento inválido em "${inome}".`
        if (valor !== 0) lancamentos.push({ mes, valor })
      }
      itens.push({ nome: inome, fornecedor: txt(i.fornecedor), lancamentos })
    }
    categorias.push({ nome, grupo, orcado, previsto, itens })
  }
  return { mostrarDetalhe: b.mostrarDetalhe === true, categorias }
}

/** Troca todo o financeiro da obra de uma vez (dentro de uma transação). */
export function gravarFinanceiro(obraId: string, doc: FinDoc) {
  const d = db()
  d.exec('begin')
  try {
    d.prepare('delete from fin_categoria where obra_id = ?').run(obraId) // itens e lançamentos saem junto
    doc.categorias.forEach((c, ci) => {
      const cid = randomUUID()
      d.prepare('insert into fin_categoria (id, obra_id, ordem, nome, grupo, orcado_cent, previsto_cent) values (?, ?, ?, ?, ?, ?, ?)').run(cid, obraId, ci, c.nome, c.grupo, cent(c.orcado), cent(c.previsto))
      c.itens.forEach((i, ii) => {
        const iid = randomUUID()
        d.prepare('insert into fin_item (id, categoria_id, ordem, nome, fornecedor) values (?, ?, ?, ?, ?)').run(iid, cid, ii, i.nome, i.fornecedor)
        for (const l of i.lancamentos) d.prepare('insert into fin_lancamento (id, item_id, mes, valor_cent) values (?, ?, ?, ?)').run(randomUUID(), iid, l.mes, cent(l.valor))
      })
    })
    d.prepare('insert into fin_config (obra_id, mostrar_detalhe, atualizado_em) values (?, ?, ?) on conflict (obra_id) do update set mostrar_detalhe = excluded.mostrar_detalhe, atualizado_em = excluded.atualizado_em').run(obraId, doc.mostrarDetalhe ? 1 : 0, new Date().toISOString())
    d.exec('commit')
  } catch (e) {
    d.exec('rollback')
    throw e
  }
}

export function atualizadoEm(obraId: string): string | null {
  return (db().prepare('select atualizado_em as a from fin_config where obra_id = ?').get(obraId) as { a: string } | undefined)?.a ?? null
}

/** Totais calculados. Só inclui itens e fornecedores quando `detalhar` for verdadeiro (decidido no servidor). */
export function resumir(doc: FinDoc, detalhar: boolean, areaM2: number | null): FinResumo {
  const porMes = new Map<string, number>()
  const porGrupo: Record<Grupo, number> = { materiais: 0, mao_de_obra: 0, adm: 0 }
  let orcado = 0, previsto = 0, realizado = 0
  const categorias = doc.categorias.map((c) => {
    let real = 0
    const itens = c.itens.map((i) => {
      const r = i.lancamentos.reduce((s, l) => { porMes.set(l.mes, (porMes.get(l.mes) ?? 0) + cent(l.valor)); return s + cent(l.valor) }, 0)
      real += r
      return { nome: i.nome, fornecedor: i.fornecedor, realizado: reais(r) }
    })
    orcado += cent(c.orcado); previsto += cent(c.previsto); realizado += real
    porGrupo[c.grupo] += real
    return { nome: c.nome, grupo: c.grupo, orcado: c.orcado, previsto: c.previsto, realizado: reais(real), ...(detalhar ? { itens } : {}) }
  })
  const chaves = [...porMes.keys()].sort()
  const meses: FinResumo['meses'] = []
  if (chaves.length) {
    let [a, m] = chaves[0].split('-').map(Number)
    const fim = chaves[chaves.length - 1]
    let acc = 0
    for (;;) {
      const mes = `${a}-${String(m).padStart(2, '0')}`
      const v = porMes.get(mes) ?? 0
      acc += v
      meses.push({ mes, valor: reais(v), acumulado: reais(acc) })
      if (mes >= fim) break
      if (++m > 12) { m = 1; a++ }
    }
  }
  return {
    detalhe: detalhar,
    totais: { orcado: reais(orcado), previsto: reais(previsto), realizado: reais(realizado) },
    porGrupo: { materiais: reais(porGrupo.materiais), mao_de_obra: reais(porGrupo.mao_de_obra), adm: reais(porGrupo.adm) },
    meses,
    categorias,
    areaM2,
  }
}
