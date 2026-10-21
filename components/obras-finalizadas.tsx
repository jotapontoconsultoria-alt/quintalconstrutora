'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, ExternalLink, RotateCcw, Search, X } from 'lucide-react'

type Foto = { id: string; url: string; thumb: string; data: string; legenda: string }
type Atividade = { feita: boolean; link?: string; em?: string }
type ObraFinal = {
  id: string
  nomeObra: string
  cliente: string
  condominio: string
  lote: string
  area: string
  pavimentos: string
  lazer: boolean
  piscina: boolean
  spa: boolean
  contato1: string
  contato2: string
  endereco: string
  detalhes: string
  empreiteiro: string
  fotos: Foto[]
  atividades: Record<string, Atividade>
  historico: { etapa: string; em: string }[]
  finalizadaEm: string
}

type Props = {
  obras: ObraFinal[]
  etapas: readonly string[]
  atividades: Record<string, readonly string[]>
  chave: (etapa: string, nome: string) => string
  comLink: (etapa: string) => boolean
  resolver: (url: string) => string
  podeEditar: boolean
  onReabrir: (id: string) => void
  onFechar: () => void
}

const data = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
}
const dias = (de: string, ate: string) => Math.max(0, Math.round((new Date(ate).getTime() - new Date(de).getTime()) / 86_400_000))
const textoDias = (n: number) => (n === 1 ? '1 dia' : `${n} dias`)

/** Linha do tempo de uma obra: por etapa, quando entrou, quando saiu, quanto tempo levou e o que foi concluído. */
function etapasDaObra(o: ObraFinal, etapas: readonly string[]) {
  const entradas = o.historico.map((h, i) => ({ ...h, saida: o.historico[i + 1]?.em ?? o.finalizadaEm }))
  return etapas
    .map((etapa) => {
      const passagens = entradas.filter((e) => e.etapa === etapa)
      return {
        etapa,
        entrou: passagens[0]?.em,
        saiu: passagens.length ? passagens[passagens.length - 1].saida : undefined,
        total: passagens.reduce((t, p) => t + dias(p.em, p.saida), 0),
      }
    })
}

export function ObrasFinalizadas({ obras, etapas, atividades, chave, comLink, resolver, podeEditar, onReabrir, onFechar }: Props) {
  const [busca, setBusca] = useState('')
  const [abertaId, setAbertaId] = useState<string | null>(null)
  const aberta = abertaId ? obras.find((o) => o.id === abertaId) : undefined

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return obras
      .filter((o) => !q || `${o.nomeObra} ${o.cliente} ${o.endereco} ${o.condominio} ${o.empreiteiro}`.toLowerCase().includes(q))
      .sort((a, b) => b.finalizadaEm.localeCompare(a.finalizadaEm))
  }, [obras, busca])

  return (
    <div className="backdrop" onClick={onFechar}>
      <div className="modal modal-wide" role="dialog" aria-label="Obras finalizadas" onClick={(e) => e.stopPropagation()}>
        {!aberta ? (
          <>
            <div className="modal-head">
              <div>
                <h2>Obras finalizadas</h2>
                <p className="modal-sub">Obras concluídas ficam guardadas aqui, com todo o histórico do processo.</p>
              </div>
              <button type="button" className="icon-btn" aria-label="Fechar" onClick={onFechar}><X /></button>
            </div>
            {obras.length > 0 && (
              <label className="search fin-busca">
                <Search aria-hidden="true" />
                <input aria-label="Buscar obra finalizada" placeholder="Buscar obra, cliente, endereço ou empreiteiro" value={busca} onChange={(e) => setBusca(e.target.value)} />
              </label>
            )}
            {obras.length === 0 ? (
              <p className="fin-vazio">Nenhuma obra finalizada ainda. Quando uma obra em ACABAMENTOS for finalizada, ela aparece aqui.</p>
            ) : lista.length === 0 ? (
              <p className="fin-vazio">Nenhuma obra encontrada para essa busca.</p>
            ) : (
              <ul className="fin-lista">
                {lista.map((o) => (
                  <li key={o.id}>
                    <button type="button" className="fin-item" onClick={() => setAbertaId(o.id)}>
                      <strong>{o.nomeObra.trim() || o.cliente}</strong>
                      <span>{o.endereco}</span>
                      <small>Empreiteiro: {o.empreiteiro || '—'} · Finalizada em {data(o.finalizadaEm)} · Duração: {textoDias(dias(o.historico[0]?.em ?? o.finalizadaEm, o.finalizadaEm))}</small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <div className="modal-head">
              <button type="button" className="btn-ghost" onClick={() => setAbertaId(null)}><ArrowLeft aria-hidden="true" /> Voltar</button>
              <button type="button" className="icon-btn" aria-label="Fechar" onClick={onFechar}><X /></button>
            </div>
            <h2 className="fin-titulo">{aberta.nomeObra.trim() || aberta.cliente}</h2>
            <p className="fin-sub">{aberta.endereco} · Empreiteiro: {aberta.empreiteiro || '—'}</p>
            {(() => {
              const itens: [string, string][] = [
                ['Cliente', aberta.cliente], ['Contato', [aberta.contato1, aberta.contato2].filter(Boolean).join(' | ')],
                ['Condomínio', aberta.condominio], ['Lote', aberta.lote], ['Área construída', aberta.area ? `${aberta.area} m²` : ''],
                ['Pavimentos', aberta.pavimentos], ['Lazer', aberta.lazer ? (['piscina', 'spa'].filter((k) => (k === 'piscina' ? aberta.piscina : aberta.spa)).join(' e ') || 'Sim') : 'Não'],
              ]
              return <p className="fin-detalhes">{itens.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(' · ')}</p>
            })()}
            <div className="fin-resumo">
              <div><span>Início do registro</span><strong>{data(aberta.historico[0]?.em ?? aberta.finalizadaEm)}</strong></div>
              <div><span>Finalizada em</span><strong>{data(aberta.finalizadaEm)}</strong></div>
              <div><span>Duração total</span><strong>{textoDias(dias(aberta.historico[0]?.em ?? aberta.finalizadaEm, aberta.finalizadaEm))}</strong></div>
            </div>

            <h3 className="fin-secao">Histórico por etapa</h3>
            <ol className="fin-etapas">
              {etapasDaObra(aberta, etapas).map(({ etapa, entrou, saiu, total }, i) => {
                const lista = atividades[etapa] ?? []
                const registradas = lista.filter((n) => aberta.atividades[chave(etapa, n)])
                if (!entrou && registradas.length === 0) return null
                const feitas = lista.filter((n) => aberta.atividades[chave(etapa, n)]?.feita).length
                return (
                  <li key={etapa} className="fin-etapa">
                    <div className="fin-etapa-topo">
                      <span className="column-step">{i + 1}</span>
                      <strong>{etapa}</strong>
                      {lista.length > 0 && <span className={`ativ-cont ${feitas === lista.length ? 'completo' : ''}`}>{feitas}/{lista.length}</span>}
                    </div>
                    {entrou ? (
                      <p className="fin-datas">Entrou em {data(entrou)}{saiu ? ` · saiu em ${data(saiu)}` : ''} · {textoDias(total)} na etapa</p>
                    ) : (
                      <p className="fin-datas">Sem data de entrada registrada nesta etapa.</p>
                    )}
                    {lista.length > 0 && (
                      <ul className="fin-ativ">
                        {lista.map((nome) => {
                          const a = aberta.atividades[chave(etapa, nome)]
                          return (
                            <li key={nome} className={a?.feita ? 'feita' : ''}>
                              <span className="fin-marca" aria-hidden="true">{a?.feita ? '✓' : '–'}</span>
                              <span>{nome}{a?.feita && a.em ? <small> · concluída em {data(a.em)}</small> : a?.feita ? '' : <small> · não marcada</small>}</span>
                              {comLink(etapa) && a?.link && (
                                <a className="ativ-abrir" href={a.link} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true" /> Abrir / baixar projeto</a>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ol>

            {aberta.fotos.length > 0 && (
              <>
                <h3 className="fin-secao">Fotos</h3>
                <div className="fin-fotos">
                  {aberta.fotos.map((f) => (
                    <a key={f.id} href={resolver(f.url)} target="_blank" rel="noopener noreferrer" title={f.legenda || data(f.data)}>
                      {resolver(f.thumb) && <img src={resolver(f.thumb)} alt={f.legenda || `Foto de ${data(f.data)}`} loading="lazy" />}
                      <small>{f.legenda || data(f.data)}</small>
                    </a>
                  ))}
                </div>
              </>
            )}

            {podeEditar && (
              <div className="modal-actions">
                <span className="spacer" />
                <button type="button" className="btn-ghost" onClick={() => { if (window.confirm(`Reabrir a obra ${aberta.nomeObra.trim() || aberta.cliente}? Ela volta ao quadro, na etapa ACABAMENTOS.`)) { onReabrir(aberta.id); setAbertaId(null) } }}><RotateCcw aria-hidden="true" /> Reabrir obra</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
