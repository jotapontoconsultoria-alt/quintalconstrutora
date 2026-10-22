'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Eye, Plus, Trash2, Upload, X } from 'lucide-react'
import { api } from '@/lib/api'
import { brl, lerValor, numeroBR } from '@/lib/dinheiro'
import { GRUPOS, type FinCategoria, type FinDoc, type Grupo } from '@/lib/financeiro-tipos'
import { MODELO_FINANCEIRO } from '@/lib/modelo-financeiro'
import './financeiro.css'

type Props = {
  obraId: string
  titulo: string
  podeEditar: boolean
  onFechar: () => void
  onPrevia: () => void
}

const mesAtual = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
const somaItem = (c: FinCategoria) => c.itens.reduce((s, i) => s + i.lancamentos.reduce((t, l) => t + Math.round(l.valor * 100), 0), 0) / 100
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

/** Campo de valor em reais: o que a pessoa digita só vira número quando ela sai do campo. */
function CampoValor({ valor, onChange, rotulo, disabled }: { valor: number; onChange: (v: number) => void; rotulo: string; disabled?: boolean }) {
  const [texto, setTexto] = useState(valor ? numeroBR(valor) : '')
  const [foco, setFoco] = useState(false)
  useEffect(() => { if (!foco) setTexto(valor ? numeroBR(valor) : '') }, [valor, foco])
  return (
    <input
      className="fin-valor"
      inputMode="decimal"
      aria-label={rotulo}
      placeholder="0,00"
      disabled={disabled}
      value={texto}
      onFocus={() => setFoco(true)}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={() => { setFoco(false); const n = lerValor(texto); onChange(n ?? 0); setTexto(n ? numeroBR(n) : '') }}
    />
  )
}

export function FinanceiroObra({ obraId, titulo, podeEditar, onFechar, onPrevia }: Props) {
  const [doc, setDoc] = useState<FinDoc | null>(null)
  const [original, setOriginal] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const [abertos, setAbertos] = useState<Set<string>>(new Set())
  const arquivoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api<{ financeiro: FinDoc }>(`/api/financeiro/${obraId}`)
      .then((r) => { setDoc(r.financeiro); setOriginal(JSON.stringify(r.financeiro)) })
      .catch((e) => setErro(e instanceof Error ? e.message : 'Não foi possível carregar o financeiro.'))
  }, [obraId])

  const alterado = doc !== null && JSON.stringify(doc) !== original
  const edita = (fn: (d: FinDoc) => void) => setDoc((atual) => { if (!atual) return atual; const n = clone(atual); fn(n); return n })

  const totais = useMemo(() => {
    if (!doc) return { orcado: 0, previsto: 0, realizado: 0 }
    return {
      orcado: doc.categorias.reduce((s, c) => s + Math.round(c.orcado * 100), 0) / 100,
      previsto: doc.categorias.reduce((s, c) => s + Math.round(c.previsto * 100), 0) / 100,
      realizado: doc.categorias.reduce((s, c) => s + Math.round(somaItem(c) * 100), 0) / 100,
    }
  }, [doc])

  const salvar = async () => {
    if (!doc) return
    setSalvando(true); setErro(''); setMsg('')
    try {
      await api(`/api/financeiro/${obraId}`, { method: 'PUT', json: { financeiro: doc } })
      setOriginal(JSON.stringify(doc))
      setMsg('Financeiro salvo.')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setSalvando(false)
    }
  }

  /** Lê um arquivo .json de financeiro (mesmo formato da tela) e coloca na tela; só grava quando a pessoa clicar em Salvar. */
  const importar = async (arquivo: File | undefined) => {
    if (!arquivo || !doc) return
    setErro(''); setMsg('')
    try {
      const bruto = JSON.parse(await arquivo.text()) as Partial<FinDoc>
      if (!Array.isArray(bruto.categorias) || bruto.categorias.length === 0) throw new Error('formato')
      if (doc.categorias.length > 0 && !window.confirm('Esta obra já tem financeiro. Importar substitui tudo o que está na tela (só vale depois de salvar). Continuar?')) return
      setDoc({ mostrarDetalhe: bruto.mostrarDetalhe === true, categorias: bruto.categorias as FinCategoria[] })
      setMsg('Arquivo carregado. Confira os valores e clique em Salvar financeiro.')
    } catch {
      setErro('Não consegui ler este arquivo. Use o arquivo de financeiro enviado pela Jota Ponto Consultoria.')
    } finally {
      if (arquivoRef.current) arquivoRef.current.value = ''
    }
  }

  const fechar = () => { if (alterado && !window.confirm('Há alterações sem salvar. Fechar mesmo assim?')) return; onFechar() }
  const alternar = (k: string) => setAbertos((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n })

  return (
    <div className="backdrop" onClick={fechar}>
      <div className="modal modal-wide fin-modal" role="dialog" aria-label={`Financeiro de ${titulo}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>Financeiro · {titulo}</h2>
            <p className="modal-sub">Orçado, previsto e realizado. O realizado é a soma dos lançamentos de cada item.</p>
          </div>
          <button type="button" className="icon-btn" aria-label="Fechar" onClick={fechar}><X /></button>
        </div>

        {erro && <p className="auth-msg erro" role="alert">{erro}</p>}
        {!doc && !erro && <p className="cfg-vazio">Carregando…</p>}

        {doc && (
          <>
            <div className="fin-resumo">
              <div><span>Orçado</span><b>{brl(totais.orcado)}</b></div>
              <div><span>Previsto</span><b>{brl(totais.previsto)}</b></div>
              <div><span>Realizado</span><b>{brl(totais.realizado)}</b></div>
            </div>

            <label className="fin-detalhe">
              <input type="checkbox" checked={doc.mostrarDetalhe} disabled={!podeEditar} onChange={(e) => edita((d) => { d.mostrarDetalhe = e.target.checked })} />
              <span><b>O cliente vê o detalhamento</b> (itens e fornecedores). Marque quando o cliente paga direto aos fornecedores. Desmarcado, ele vê só os totais de cada categoria.</span>
            </label>

            {doc.categorias.length === 0 && (
              <div className="fin-vazio">
                <p>Esta obra ainda não tem financeiro lançado.</p>
                {podeEditar && (
                  <div className="fin-acoes">
                    <button type="button" className="btn-primary" onClick={() => edita((d) => { d.categorias = clone(MODELO_FINANCEIRO.categorias) })}>Começar com o modelo da planilha</button>
                    <button type="button" className="btn-ghost" onClick={() => arquivoRef.current?.click()}><Upload aria-hidden="true" /> Importar arquivo</button>
                    <button type="button" className="btn-ghost" onClick={() => edita((d) => { d.categorias = [{ nome: 'Nova categoria', grupo: 'materiais', orcado: 0, previsto: 0, itens: [] }] })}>Começar em branco</button>
                  </div>
                )}
              </div>
            )}

            <div className="fin-lista">
              {doc.categorias.map((c, ci) => {
                const real = somaItem(c)
                const k = `c${ci}`
                const aberto = abertos.has(k)
                return (
                  <div className="fin-cat" key={ci}>
                    <div className="fin-cat-linha">
                      <button type="button" className="fin-seta" aria-expanded={aberto} aria-label={aberto ? 'Recolher categoria' : 'Abrir categoria'} onClick={() => alternar(k)}>{aberto ? '−' : '+'}</button>
                      <span className="fin-n">{String(ci + 1).padStart(2, '0')}</span>
                      <input className="fin-nome" aria-label="Nome da categoria" value={c.nome} disabled={!podeEditar} onChange={(e) => edita((d) => { d.categorias[ci].nome = e.target.value })} />
                      <select className="select fin-grupo" aria-label="Grupo de custo" value={c.grupo} disabled={!podeEditar} onChange={(e) => edita((d) => { d.categorias[ci].grupo = e.target.value as Grupo })}>
                        {(Object.keys(GRUPOS) as Grupo[]).map((g) => <option key={g} value={g}>{GRUPOS[g]}</option>)}
                      </select>
                      <label className="fin-campo"><span>Orçado</span><CampoValor valor={c.orcado} rotulo={`Orçado de ${c.nome}`} disabled={!podeEditar} onChange={(v) => edita((d) => { d.categorias[ci].orcado = v })} /></label>
                      <label className="fin-campo"><span>Previsto</span><CampoValor valor={c.previsto} rotulo={`Previsto de ${c.nome}`} disabled={!podeEditar} onChange={(v) => edita((d) => { d.categorias[ci].previsto = v })} /></label>
                      <div className="fin-campo"><span>Realizado</span><b className={c.previsto > 0 && real > c.previsto ? 'acima' : ''}>{brl(real)}</b></div>
                      {podeEditar && <button type="button" className="icon-btn danger" aria-label={`Remover categoria ${c.nome}`} onClick={() => { if (window.confirm(`Remover a categoria "${c.nome}" com todos os itens e lançamentos?`)) edita((d) => { d.categorias.splice(ci, 1) }) }}><Trash2 /></button>}
                    </div>

                    {aberto && (
                      <div className="fin-itens">
                        {c.itens.map((it, ii) => {
                          const ik = `${k}i${ii}`
                          const total = it.lancamentos.reduce((s, l) => s + Math.round(l.valor * 100), 0) / 100
                          const abertoI = abertos.has(ik)
                          return (
                            <div className="fin-item" key={ii}>
                              <div className="fin-item-linha">
                                <button type="button" className="fin-seta" aria-expanded={abertoI} aria-label={abertoI ? 'Recolher lançamentos' : 'Ver lançamentos'} onClick={() => alternar(ik)}>{abertoI ? '−' : '+'}</button>
                                <span className="fin-n">{ci + 1}.{ii + 1}</span>
                                <input className="fin-nome" aria-label="Nome do item" value={it.nome} disabled={!podeEditar} onChange={(e) => edita((d) => { d.categorias[ci].itens[ii].nome = e.target.value })} />
                                <input className="fin-forn" aria-label="Fornecedor" placeholder="Fornecedor" value={it.fornecedor} disabled={!podeEditar} onChange={(e) => edita((d) => { d.categorias[ci].itens[ii].fornecedor = e.target.value })} />
                                <b className="fin-total">{brl(total)}</b>
                                {podeEditar && <button type="button" className="icon-btn danger" aria-label={`Remover item ${it.nome}`} onClick={() => edita((d) => { d.categorias[ci].itens.splice(ii, 1) })}><Trash2 /></button>}
                              </div>
                              {abertoI && (
                                <div className="fin-lancs">
                                  {it.lancamentos.length === 0 && <p className="fin-sem">Nenhum lançamento neste item.</p>}
                                  {it.lancamentos.map((l, li) => (
                                    <div className="fin-lanc" key={li}>
                                      <input type="month" aria-label="Mês do lançamento" value={l.mes} disabled={!podeEditar} onChange={(e) => edita((d) => { if (e.target.value) d.categorias[ci].itens[ii].lancamentos[li].mes = e.target.value })} />
                                      <CampoValor valor={l.valor} rotulo="Valor do lançamento" disabled={!podeEditar} onChange={(v) => edita((d) => { d.categorias[ci].itens[ii].lancamentos[li].valor = v })} />
                                      {podeEditar && <button type="button" className="icon-btn" aria-label="Remover lançamento" onClick={() => edita((d) => { d.categorias[ci].itens[ii].lancamentos.splice(li, 1) })}><X /></button>}
                                    </div>
                                  ))}
                                  {podeEditar && <button type="button" className="btn-ghost fin-add" onClick={() => edita((d) => { d.categorias[ci].itens[ii].lancamentos.push({ mes: mesAtual(), valor: 0 }) })}><Plus aria-hidden="true" /> Lançamento</button>}
                                </div>
                              )}
                            </div>
                          )
                        })}
                        {podeEditar && <button type="button" className="btn-ghost fin-add" onClick={() => { edita((d) => { d.categorias[ci].itens.push({ nome: 'Novo item', fornecedor: '', lancamentos: [] }) }); setAbertos((s) => new Set(s).add(`${k}i${c.itens.length}`)) }}><Plus aria-hidden="true" /> Item</button>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {podeEditar && doc.categorias.length > 0 && (
              <button type="button" className="btn-ghost fin-add" onClick={() => edita((d) => { d.categorias.push({ nome: 'Nova categoria', grupo: 'materiais', orcado: 0, previsto: 0, itens: [] }) })}><Plus aria-hidden="true" /> Categoria</button>
            )}

            <input ref={arquivoRef} type="file" accept=".json,application/json" hidden onChange={(e) => void importar(e.target.files?.[0])} />
            <div className="fin-rodape">
              <button type="button" className="btn-ghost" onClick={() => { if (alterado) { setErro('Salve antes de ver a prévia: ela mostra o que está gravado.'); return } onPrevia() }}><Eye aria-hidden="true" /> Ver como o cliente vê</button>
              <span className="fin-status" role="status">{alterado ? 'Alterações não salvas' : msg}</span>
              {podeEditar && <button type="button" className="btn-primary" disabled={!alterado || salvando} onClick={() => void salvar()}>{salvando ? 'Salvando…' : 'Salvar financeiro'}</button>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
