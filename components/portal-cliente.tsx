'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Box, Camera, ChevronDown, ExternalLink, FolderOpen, LogOut, Settings, X } from 'lucide-react'
import { api } from '@/lib/api'
import { brl, mesBR, mesCurto, pct } from '@/lib/dinheiro'
import { GRUPOS, type FinResumo, type Grupo } from '@/lib/financeiro-tipos'
import type { PortalEtapa, PortalFoto, PortalResposta, SituacaoEtapa } from '@/lib/portal-tipos'
import { Configuracoes } from '@/components/configuracoes'
import './portal.css'

type Props = {
  usuario?: { id: string; email: string }
  /** Prévia da equipe: abre a obra indicada e mostra o botão de voltar. */
  previaObraId?: string
  onVoltar?: () => void
  onSair?: () => void
}

const SITUACAO: Record<SituacaoEtapa, { texto: string; classe: string }> = {
  no_prazo: { texto: 'No prazo', classe: 'ok' },
  atencao: { texto: 'Atenção ao prazo', classe: 'warn' },
  atrasada: { texto: 'Atrasada', classe: 'late' },
  sem_prazo: { texto: 'Sem prazo definido', classe: 'todo' },
  sem_registro: { texto: 'Sem registro', classe: 'todo' },
  aguardando: { texto: 'Aguardando', classe: 'todo' },
}

const titulo = (e: string) => e.charAt(0) + e.slice(1).toLowerCase()
const dataCurta = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(d) }

function mesesEntre(de: string, ate: Date) {
  if (!de) return null
  const [a, m] = de.split('-').map(Number)
  return (ate.getFullYear() - a) * 12 + (ate.getMonth() + 1 - m)
}
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

export function PortalCliente({ usuario, previaObraId, onVoltar, onSair }: Props) {
  const [dados, setDados] = useState<PortalResposta | null>(null)
  const [erro, setErro] = useState('')
  const [aba, setAba] = useState<'obra' | 'financeiro'>('obra')
  const [obraId, setObraId] = useState(previaObraId ?? '')
  const [config, setConfig] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const r = await api<PortalResposta>(`/api/portal${obraId ? `?obra=${encodeURIComponent(obraId)}` : ''}`)
      setDados(r)
      setErro('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar.')
    }
  }, [obraId])

  useEffect(() => {
    void carregar()
    const t = window.setInterval(() => void carregar(), 90_000)
    return () => window.clearInterval(t)
  }, [carregar])

  useEffect(() => {
    const h = window.location.hash.replace('#', '')
    if (h === 'financeiro' || h === 'obra') setAba(h)
  }, [])
  const trocar = (a: 'obra' | 'financeiro') => { setAba(a); try { history.replaceState(null, '', `#${a}`) } catch {} }

  return (
    <div className="pc">
      <header className="pc-top">
        <div className="pc-wrap">
          <div className="pc-bar">
            <div className="pc-brand">
              <img src="/logo.png" alt="Quintal Construtora e Incorporadora" width={502} height={178} />
              <span className="pc-credit">Developed by Jota Ponto Consultoria</span>
            </div>
            <div className="pc-who">
              {onVoltar && <button type="button" className="pc-ghost" onClick={onVoltar}><ArrowLeft aria-hidden="true" /> Voltar ao painel</button>}
              {previaObraId && <span className="pc-chip pc-previa">Prévia: como o cliente vê</span>}
              {usuario && <span className="pc-chip" title={usuario.email}>{usuario.email}</span>}
              {usuario && <button type="button" className="pc-icon" aria-label="Configurações" title="Alterar minha senha" onClick={() => setConfig(true)}><Settings /></button>}
              {onSair && <button type="button" className="pc-ghost" onClick={onSair}><LogOut aria-hidden="true" /> Sair</button>}
            </div>
          </div>
          <nav className="pc-tabs" role="tablist">
            <button role="tab" aria-selected={aba === 'obra'} onClick={() => trocar('obra')}>Evolução da obra</button>
            <button role="tab" aria-selected={aba === 'financeiro'} onClick={() => trocar('financeiro')}>Financeiro</button>
          </nav>
        </div>
      </header>

      <main className="pc-wrap pc-main">
        {erro && <p className="pc-aviso erro" role="alert">{erro}</p>}
        {!dados && !erro && <p className="pc-vazio">Carregando…</p>}
        {dados && !dados.obra && (
          <div className="pc-card pc-vazio-card">
            <h2>Nenhuma obra liberada</h2>
            <p>Este acesso ainda não está ligado a uma obra. Fale com a Quintal para liberar.</p>
          </div>
        )}
        {dados?.obra && (
          <>
            <div className="pc-hero">
              <div>
                {dados.obras.length > 1 && !previaObraId ? (
                  <select className="pc-select" aria-label="Escolher obra" value={dados.obra.id} onChange={(e) => setObraId(e.target.value)}>
                    {dados.obras.map((o) => <option key={o.id} value={o.id}>{o.titulo}</option>)}
                  </select>
                ) : null}
                <h1>{dados.obra.titulo}</h1>
                <p>{[dados.obra.condominio, dados.obra.endereco].filter(Boolean).join(' · ') || 'Acompanhamento da obra'}</p>
              </div>
              <p className="pc-atual">Atualizado em {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(dados.geradoEm))}</p>
            </div>
            {aba === 'obra' ? <AbaObra d={dados} /> : <AbaFinanceiro d={dados} />}
          </>
        )}
      </main>

      {config && usuario && <Configuracoes papel="cliente" meuId={usuario.id} meuEmail={usuario.email} onFechar={() => setConfig(false)} />}
    </div>
  )
}

/* ------------------------------------------------------------------ Obra */

function AbaObra({ d }: { d: PortalResposta }) {
  const o = d.obra!
  const agora = new Date()
  const feitas = o.etapas.filter((e) => e.estado === 'concluida').length
  const atual = o.etapas.find((e) => e.estado === 'atual')
  const noMes = mesesEntre(o.inicio, agora)
  const faltam = o.previsao ? mesesEntre(o.previsao, agora) : null // negativo = ainda faltam meses

  return (
    <div className="pc-grid">
      <div className="pc-card pc-kpi main pc-c3">
        <span className="l">Evolução geral</span>
        <span className="v">{Math.round(o.progresso * 100)}%</span>
        <span className="d">{o.finalizadaEm ? 'Obra finalizada' : `${feitas} de ${o.etapas.length} etapas concluídas`}</span>
      </div>
      <div className="pc-card pc-kpi pc-c3">
        <span className="l">Etapa atual</span>
        <span className="v txt">{o.finalizadaEm ? 'Concluída' : titulo(o.etapaAtual)}</span>
        <span className="d">{atual && atual.atividades.total ? `${atual.atividades.feitas} de ${atual.atividades.total} atividades concluídas` : o.finalizadaEm ? 'Todas as etapas feitas' : 'Em andamento'}</span>
      </div>
      <div className="pc-card pc-kpi pc-c3">
        <span className="l">Início da obra</span>
        <span className="v">{o.inicio ? mesBR(o.inicio) : '—'}</span>
        <span className="d">{noMes !== null && noMes >= 0 ? plural(noMes, 'mês', 'meses') + ' de obra' : 'Data de início não informada'}</span>
      </div>
      <div className="pc-card pc-kpi pc-c3">
        <span className="l">Previsão de término</span>
        <span className="v">{o.previsao ? mesBR(o.previsao) : '—'}</span>
        <span className="d">{faltam === null ? 'Previsão não informada' : o.finalizadaEm ? 'Obra entregue' : faltam < 0 ? `Faltam cerca de ${plural(-faltam, 'mês', 'meses')}` : faltam === 0 ? 'Previsto para este mês' : `Previsão passou há ${plural(faltam, 'mês', 'meses')}`}</span>
      </div>

      <div className="pc-card pc-c12">
        <h2>Etapas da obra</h2>
        <p className="pc-sub">As 13 etapas do processo construtivo, na ordem em que acontecem.</p>
        <Etapas etapas={o.etapas} />
      </div>

      <div className="pc-card pc-c7">
        <h2>Prazos por etapa (SLA)</h2>
        <p className="pc-sub">Dias previstos e dias realizados em cada etapa. Na etapa em andamento, contam os dias até hoje.</p>
        <div className="pc-tw">
          <table>
            <thead><tr><th>Etapa</th><th className="r">Previsto</th><th className="r">Realizado</th><th className="r">Desvio</th><th>Situação</th></tr></thead>
            <tbody>
              {o.etapas.map((e) => {
                const s = SITUACAO[e.situacao]
                const desvio = e.dias !== null && e.prazo > 0 ? e.dias - e.prazo : null
                const rotulo = e.estado === 'atual' && e.situacao !== 'atrasada' ? (e.situacao === 'atencao' ? 'Em andamento · atenção' : 'Em andamento · no prazo') : s.texto
                return (
                  <tr key={e.nome} className={e.estado === 'atual' ? 'atual' : ''}>
                    <td>{titulo(e.nome)}</td>
                    <td className="r num">{e.prazo ? `${e.prazo} d` : '—'}</td>
                    <td className="r num">{e.dias !== null ? `${e.dias} d` : '—'}</td>
                    <td className={`r num ${desvio !== null ? (desvio > 0 ? 'pos' : 'neg') : ''}`}>{desvio === null || e.estado === 'atual' ? '—' : desvio === 0 ? '0' : `${desvio > 0 ? '+' : '−'}${Math.abs(desvio)} d`}</td>
                    <td><span className={`pc-pill ${s.classe}`}>{rotulo}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pc-card pc-c5">
        <h2>{o.finalizadaEm ? 'Obra finalizada' : `${titulo(o.etapaAtual)}: atividades`}</h2>
        <p className="pc-sub">Somente as atividades da etapa em andamento.</p>
        {o.atividadesAtuais.length === 0 ? (
          <p className="pc-vazio">Esta etapa não tem atividades listadas.</p>
        ) : (
          <>
            <Anel feitas={o.atividadesAtuais.filter((a) => a.feita).length} total={o.atividadesAtuais.length} />
            <ul className="pc-acts">
              {o.atividadesAtuais.map((a) => <li key={a.nome} className={a.feita ? 'on' : ''}><i className="bx" /><span>{a.nome}</span></li>)}
            </ul>
          </>
        )}
      </div>

      <div className="pc-card pc-c12">
        <h2>Imagens da etapa</h2>
        <p className="pc-sub">Registro fotográfico da obra, organizado pela etapa em que cada foto foi enviada.</p>
        <Galeria fotos={o.fotos} etapaAtual={o.etapaAtual} />
        {(o.projetos.length > 0 || o.link3d) && (
          <div className="pc-links">
            {o.link3d && <a className="pc-link3d" href={o.link3d} target="_blank" rel="noopener noreferrer"><Box aria-hidden="true" /> Ver imagens 3D do projeto <ExternalLink aria-hidden="true" /></a>}
            {o.projetos.map((p) => <a key={p.nome} className="pc-link" href={p.link} target="_blank" rel="noopener noreferrer"><FolderOpen aria-hidden="true" /> Projeto {p.nome.toLowerCase()}</a>)}
          </div>
        )}
      </div>
    </div>
  )
}

function Etapas({ etapas }: { etapas: PortalEtapa[] }) {
  return (
    <>
      <div className="pc-stages" style={{ gridTemplateColumns: `repeat(${etapas.length}, minmax(0, 1fr))` }}>
        {etapas.map((e) => {
          const p = e.atividades.total ? e.atividades.feitas / e.atividades.total : 0
          return <i key={e.nome} title={`${titulo(e.nome)}: ${e.estado === 'concluida' ? 'concluída' : e.estado === 'atual' ? 'em andamento' : 'aguardando'}`} className={e.estado === 'concluida' ? 'done' : e.estado === 'atual' ? 'cur' : ''} style={e.estado === 'atual' ? ({ '--p': `${p * 100}%` } as React.CSSProperties) : undefined} />
        })}
      </div>
      <div className="pc-stlabels" style={{ gridTemplateColumns: `repeat(${etapas.length}, minmax(0, 1fr))` }}>
        {etapas.map((e) => <span key={e.nome} className={e.estado === 'atual' ? 'cur' : ''}>{titulo(e.nome)}</span>)}
      </div>
    </>
  )
}

function Anel({ feitas, total }: { feitas: number; total: number }) {
  const r = 52, c = 2 * Math.PI * r, p = total ? feitas / total : 0
  return (
    <svg className="pc-ring" viewBox="0 0 130 130" role="img" aria-label={`${feitas} de ${total} atividades concluídas`}>
      <circle cx="65" cy="65" r={r} fill="none" stroke="var(--pc-track)" strokeWidth="13" />
      <circle cx="65" cy="65" r={r} fill="none" stroke="var(--pc-accent)" strokeWidth="13" strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} transform="rotate(-90 65 65)" />
      <text x="65" y="66" textAnchor="middle" className="big">{Math.round(p * 100)}%</text>
      <text x="65" y="86" textAnchor="middle">{feitas} de {total}</text>
    </svg>
  )
}

function Galeria({ fotos, etapaAtual }: { fotos: PortalFoto[]; etapaAtual: string }) {
  const etapas = useMemo(() => {
    const m = new Map<string, number>()
    for (const f of fotos) m.set(f.etapa, (m.get(f.etapa) ?? 0) + 1)
    return [...m.entries()]
  }, [fotos])
  const [sel, setSel] = useState<string>(() => (etapas.find(([e]) => e === etapaAtual) ?? etapas[0])?.[0] ?? '')
  const [aberta, setAberta] = useState<PortalFoto | null>(null)
  const lista = fotos.filter((f) => f.etapa === sel)

  if (fotos.length === 0) return <p className="pc-vazio"><Camera aria-hidden="true" /> Ainda não há fotos desta obra. Elas aparecem aqui assim que a equipe enviar.</p>
  return (
    <>
      <div className="pc-gtabs">
        {etapas.map(([e, n]) => <button key={e} aria-pressed={e === sel} onClick={() => setSel(e)}>{titulo(e)} <small>{n}</small></button>)}
      </div>
      <div className="pc-gal">
        {lista.map((f) => (
          <button key={f.id} className="pc-foto" onClick={() => setAberta(f)} aria-label={`Ampliar foto ${f.legenda || dataCurta(f.data)}`}>
            <img src={f.thumb} alt={f.legenda || `Foto da etapa ${titulo(f.etapa)}`} loading="lazy" />
            <span>{f.legenda || dataCurta(f.data)}</span>
          </button>
        ))}
      </div>
      {aberta && (
        <div className="pc-lightbox" role="dialog" aria-label="Foto ampliada" onClick={() => setAberta(null)}>
          <button className="pc-icon fechar" aria-label="Fechar" onClick={() => setAberta(null)}><X /></button>
          <figure onClick={(e) => e.stopPropagation()}>
            <img src={aberta.url} alt={aberta.legenda || 'Foto da obra'} />
            <figcaption>{[titulo(aberta.etapa), dataCurta(aberta.data), aberta.legenda].filter(Boolean).join(' · ')}</figcaption>
          </figure>
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------------ Financeiro */

function AbaFinanceiro({ d }: { d: PortalResposta }) {
  const f = d.financeiro
  if (!f) return <div className="pc-card pc-vazio-card"><h2>Financeiro ainda não lançado</h2><p>Os valores desta obra aparecem aqui assim que a Quintal lançar o orçamento e os gastos.</p></div>
  const { orcado, previsto, realizado } = f.totais
  const m2 = f.areaM2
  return (
    <div className="pc-grid">
      <div className="pc-card pc-kpi pc-c3"><span className="l">Orçado</span><span className="v">{brl(orcado)}</span><span className="d">orçamento inicial da obra</span></div>
      <div className="pc-card pc-kpi pc-c3"><span className="l">Previsto</span><span className="v">{brl(previsto)}</span><span className="d">{orcado > 0 ? `${previsto >= orcado ? '+' : '−'}${pct(Math.abs(previsto - orcado) / orcado)} em relação ao orçado` : 'orçamento revisado'}</span></div>
      <div className="pc-card pc-kpi main pc-c3"><span className="l">Realizado</span><span className="v">{brl(realizado)}</span><span className="d">{previsto > 0 ? `${pct(realizado / previsto)} do previsto` : 'gasto até agora'}</span></div>
      <div className="pc-card pc-kpi pc-c3"><span className="l">A executar</span><span className="v">{brl(Math.max(0, previsto - realizado))}</span><span className="d">{m2 ? `${brl(realizado / m2)}/m² realizado · ${brl(previsto / m2)}/m² previsto` : 'previsto menos realizado'}</span></div>

      <div className="pc-card pc-c8">
        <h2>Realizado por mês</h2>
        <p className="pc-sub">Barras: gasto do mês. Linha: acumulado, contra o previsto e o orçado.</p>
        <Grafico f={f} />
      </div>
      <div className="pc-card pc-c4">
        <h2>Onde o dinheiro foi</h2>
        <p className="pc-sub">Realizado por grupo de custo.</p>
        <Grupos f={f} />
      </div>

      <div className="pc-card pc-c12">
        <h2>Por categoria</h2>
        <p className="pc-sub">{f.detalhe ? 'Toque numa categoria para ver os itens e fornecedores.' : 'Totais por categoria.'}</p>
        <div className="pc-legend"><span><i className="r" />Realizado</span><span><i className="p" />Previsto</span><span><i className="o" />Orçado</span></div>
        <Categorias f={f} />
      </div>
      <p className="pc-nota pc-c12">Orçado é o orçamento inicial. Previsto é o orçamento revisado com os ajustes de projeto. Realizado é o que já foi pago ou medido.{d.financeiroAtualizadoEm ? ` Valores atualizados em ${dataCurta(d.financeiroAtualizadoEm)}.` : ''}</p>
    </div>
  )
}

function passo(max: number) {
  const bruto = max / 4
  const pot = Math.pow(10, Math.floor(Math.log10(bruto || 1)))
  const f = bruto / pot
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pot
}

function Grafico({ f }: { f: FinResumo }) {
  const [tip, setTip] = useState<{ x: number; y: number; html: React.ReactNode } | null>(null)
  if (f.meses.length === 0) return <p className="pc-vazio">Ainda não há gastos lançados.</p>
  const N = f.meses.length
  const W = Math.max(560, 90 + N * 64), H = 300, L = 112, R = 16, T = 18, B = 36
  const pw = W - L - R, ph = H - T - B
  const topo = Math.max(f.totais.orcado, f.totais.previsto, f.meses[N - 1].acumulado) * 1.06
  const st = passo(topo)
  const max = Math.ceil(topo / st) * st
  const y = (v: number) => T + ph - (v / max) * ph
  const bw = pw / N
  const ticks: number[] = []
  for (let v = 0; v <= max + 1e-6; v += st) ticks.push(v)
  const pts = f.meses.map((m, i) => [L + i * bw + bw / 2, y(m.acumulado)] as const)
  const refs: [number, string][] = [[f.totais.orcado, 'Orçado'], [f.totais.previsto, 'Previsto']]
  if (Math.abs(f.totais.orcado - f.totais.previsto) / max < 0.05) refs.sort((a, b) => a[0] - b[0])
  return (
    <div className="pc-tw" onMouseLeave={() => setTip(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: W, height: 'auto' }} role="img" aria-label="Gasto realizado por mês e acumulado" className="pc-chart">
        {ticks.map((v) => <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="grade" /><text x={L - 8} y={y(v) + 4} textAnchor="end">{brl(v)}</text></g>)}
        {refs.map(([v, n], i) => <g key={n}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="ref" /><text className="t2" x={W - R} y={y(v) + (i ? -5 : 13)} textAnchor="end">{n} {brl(v)}</text></g>)}
        {f.meses.map((m, i) => {
          const x = L + i * bw + bw * 0.2, w = bw * 0.6, h = (m.valor / max) * ph
          return (
            <g key={m.mes}>
              <rect x={x} y={y(m.valor)} width={w} height={Math.max(0, h)} rx={4} className="barra" />
              <rect x={x} y={y(m.valor) + h - 4} width={w} height={Math.min(4, Math.max(0, h))} className="barra" />
              <text x={L + i * bw + bw / 2} y={H - 12} textAnchor="middle" className="t2">{mesCurto(m.mes)}</text>
              <rect x={L + i * bw} y={T} width={bw} height={ph} fill="transparent" onMouseMove={(e) => setTip({ x: e.clientX, y: e.clientY, html: <><b>{mesCurto(m.mes)}</b><br />No mês: {brl(m.valor)}<br />Acumulado: {brl(m.acumulado)}</> })} />
            </g>
          )
        })}
        <polyline points={pts.map((p) => p.join(',')).join(' ')} className="acum" fill="none" />
        {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={4.5} className="ponto" />)}
      </svg>
      {tip && <div className="pc-tip" style={{ left: Math.min(tip.x + 12, window.innerWidth - 200), top: tip.y + 14 }}>{tip.html}</div>}
    </div>
  )
}

function Grupos({ f }: { f: FinResumo }) {
  const total = f.totais.realizado
  const ordem: Grupo[] = ['materiais', 'mao_de_obra', 'adm']
  const fortes = ['s1', 's2', 's3']
  return (
    <>
      <div className="pc-stack">{ordem.map((g, i) => f.porGrupo[g] > 0 && <i key={g} className={fortes[i]} style={{ flex: f.porGrupo[g] }} />)}</div>
      <div className="pc-grupos">
        {ordem.map((g, i) => (
          <div key={g}><span><i className={fortes[i]} />{GRUPOS[g]}</span><span className="num">{brl(f.porGrupo[g])} <small>{total > 0 ? pct(f.porGrupo[g] / total) : '0%'}</small></span></div>
        ))}
      </div>
    </>
  )
}

function Categorias({ f }: { f: FinResumo }) {
  const [tip, setTip] = useState<{ x: number; y: number; c: FinResumo['categorias'][number] } | null>(null)
  const max = Math.max(1, ...f.categorias.map((c) => Math.max(c.orcado, c.previsto, c.realizado)))
  const sc = (v: number) => `${(v / max) * 100}%`
  return (
    <div onMouseLeave={() => setTip(null)}>
      {f.categorias.map((c, i) => {
        const itens = f.detalhe ? (c.itens ?? []).filter((x) => x.realizado !== 0) : []
        const acima = c.previsto > 0 && c.realizado > c.previsto
        const cabeca = (
          <>
            <span className="cn"><small>{String(i + 1).padStart(2, '0')}</small>{c.nome}{acima && <span className="pc-pill late">acima do previsto</span>}</span>
            <span className="tr" onMouseMove={(e) => setTip({ x: e.clientX, y: e.clientY, c })}>
              <span className="fill" style={{ width: sc(c.realizado) }} />
              {c.previsto > 0 && <span className="mk prev" style={{ left: sc(c.previsto) }} />}
              {c.orcado > 0 && <span className="mk" style={{ left: sc(c.orcado) }} />}
            </span>
            <span className="cv num">{brl(c.realizado)}<small>de {brl(c.previsto)}</small></span>
          </>
        )
        return itens.length > 0 ? (
          <details key={i} className="pc-cat"><summary>{cabeca}<ChevronDown className="seta" aria-hidden="true" /></summary>
            <div className="pc-itens">{itens.map((it, k) => <div key={k}><span>{it.nome}{it.fornecedor && <b> · {it.fornecedor}</b>}</span><span className="num">{brl(it.realizado)}</span></div>)}</div>
          </details>
        ) : <div key={i} className="pc-cat plana"><div className="sum">{cabeca}</div></div>
      })}
      {tip && <div className="pc-tip" style={{ left: Math.min(tip.x + 12, window.innerWidth - 220), top: tip.y + 14 }}><b>{tip.c.nome}</b><br />Orçado: {brl(tip.c.orcado)}<br />Previsto: {brl(tip.c.previsto)}<br />Realizado: {brl(tip.c.realizado)}</div>}
    </div>
  )
}
