'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { HardHat, MapPin, Plus, Search, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export const STAGES = ['PROJETO', 'APROVAÇÃO', 'FUNDAÇÃO', 'ALVENARIA', 'INSTALAÇÕES', 'ESQUADRIAS', 'REVESTIMENTOS'] as const
type Stage = (typeof STAGES)[number]

type Obra = {
  id: string
  cliente: string
  endereco: string
  detalhes: string
  empreiteiro: string
  etapa: Stage
  /** ISO: quando a obra entrou na etapa atual. */
  desde: string
}

type Draft = Omit<Obra, 'id' | 'desde'> & { id?: string }

const BOARD_ID = 'default'
const LOCAL_KEY = 'quintal-obras'
const emptyDraft: Draft = { cliente: '', endereco: '', detalhes: '', empreiteiro: '', etapa: 'PROJETO' }

const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`)

function tempoNaEtapa(desde: string, agora: number) {
  const ms = agora - new Date(desde).getTime()
  if (!Number.isFinite(ms) || ms < 0) return 'hoje'
  const dias = Math.floor(ms / 86_400_000)
  if (dias < 1) return 'hoje'
  if (dias === 1) return '1 dia'
  if (dias < 30) return `${dias} dias`
  const meses = Math.floor(dias / 30)
  return meses === 1 ? '1 mês' : `${meses} meses`
}

function isStage(value: unknown): value is Stage {
  return typeof value === 'string' && (STAGES as readonly string[]).includes(value)
}

function sanitize(raw: unknown): Obra[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((o): o is Record<string, unknown> => !!o && typeof o === 'object')
    .map((o) => ({
      id: typeof o.id === 'string' ? o.id : newId(),
      cliente: String(o.cliente ?? ''),
      endereco: String(o.endereco ?? ''),
      detalhes: String(o.detalhes ?? ''),
      empreiteiro: String(o.empreiteiro ?? ''),
      etapa: isStage(o.etapa) ? o.etapa : 'PROJETO',
      desde: typeof o.desde === 'string' ? o.desde : new Date().toISOString(),
    }))
}

function ObraCard({ obra, agora, onOpen, onDragStart }: { obra: Obra; agora: number; onOpen: (o: Obra) => void; onDragStart: (o: Obra) => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      className="obra-card"
      draggable
      onDragStart={() => onDragStart(obra)}
      onClick={() => onOpen(obra)}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onOpen(obra)
        }
      }}
    >
      <strong className="obra-cliente">{obra.cliente}</strong>
      <span className="obra-endereco"><MapPin aria-hidden="true" />{obra.endereco}</span>
      {obra.detalhes && <p className="obra-detalhes">{obra.detalhes}</p>}
      <div className="obra-rodape">
        <span className="obra-empreiteiro"><HardHat aria-hidden="true" />{obra.empreiteiro || 'Sem empreiteiro'}</span>
        <span className="obra-tempo" title="Tempo nesta etapa">{tempoNaEtapa(obra.desde, agora)}</span>
      </div>
    </div>
  )
}

export function ObrasBoard() {
  const [obras, setObras] = useState<Obra[]>([])
  const [loaded, setLoaded] = useState(false)
  const [syncError, setSyncError] = useState(false)
  const [search, setSearch] = useState('')
  const [filtroEmpreiteiro, setFiltroEmpreiteiro] = useState('Todos')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [dragged, setDragged] = useState<Obra | null>(null)
  const [toast, setToast] = useState('')
  const [agora, setAgora] = useState(() => Date.now())
  const skipNextSave = useRef(false)
  const toastTimer = useRef<number | undefined>(undefined)

  const supabase = useMemo(() => createClient(), [])
  const table = useMemo(() => (supabase ? (supabase.from('quintal_board_state' as never) as any) : null), [supabase])

  const showToast = (message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2400)
  }

  useEffect(() => {
    const t = window.setInterval(() => setAgora(Date.now()), 60_000)
    return () => window.clearInterval(t)
  }, [])

  // Carga inicial: Supabase (compartilhado) ou, sem ele, o navegador.
  useEffect(() => {
    let alive = true
    const load = async () => {
      if (table) {
        const { data, error } = await table.select('obras').eq('id', BOARD_ID).maybeSingle()
        if (!alive) return
        if (error) setSyncError(true)
        else if (data) setObras(sanitize(data.obras))
      } else {
        try {
          const saved = window.localStorage.getItem(LOCAL_KEY)
          if (saved && alive) setObras(sanitize(JSON.parse(saved)))
        } catch {}
      }
      if (alive) setLoaded(true)
    }
    void load()
    return () => { alive = false }
  }, [table])

  // Tempo real entre telas.
  useEffect(() => {
    if (!loaded || !supabase) return
    const channel = supabase
      .channel(`quintal-board-${BOARD_ID}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quintal_board_state', filter: `id=eq.${BOARD_ID}` }, (payload) => {
        if (payload.eventType === 'DELETE') return
        const next = (payload.new as { obras?: unknown })?.obras
        if (Array.isArray(next)) {
          skipNextSave.current = true
          setObras(sanitize(next))
        }
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [loaded, supabase])

  // Salvamento.
  useEffect(() => {
    if (!loaded) return
    if (skipNextSave.current) { skipNextSave.current = false; return }
    if (table) {
      void table.upsert({ id: BOARD_ID, obras, updated_at: new Date().toISOString() }).then(({ error }: { error: unknown }) => setSyncError(!!error))
    } else {
      try { window.localStorage.setItem(LOCAL_KEY, JSON.stringify(obras)) } catch {}
    }
  }, [loaded, obras, table])

  const empreiteiros = useMemo(() => Array.from(new Set(obras.map((o) => o.empreiteiro.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')), [obras])

  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase()
    return obras.filter((o) => (!q || `${o.cliente} ${o.endereco} ${o.detalhes}`.toLowerCase().includes(q)) && (filtroEmpreiteiro === 'Todos' || o.empreiteiro === filtroEmpreiteiro))
  }, [obras, search, filtroEmpreiteiro])

  const moverPara = (obra: Obra, etapa: Stage) => {
    if (obra.etapa === etapa) return
    setObras((items) => items.map((o) => (o.id === obra.id ? { ...o, etapa, desde: new Date().toISOString() } : o)))
    showToast(`${obra.cliente} → ${etapa}`)
  }

  const salvar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft) return
    const limpo = { ...draft, cliente: draft.cliente.trim(), endereco: draft.endereco.trim(), detalhes: draft.detalhes.trim(), empreiteiro: draft.empreiteiro.trim() }
    if (draft.id) {
      setObras((items) => items.map((o) => (o.id === draft.id ? { ...o, ...limpo, id: o.id, desde: o.etapa === limpo.etapa ? o.desde : new Date().toISOString() } : o)))
      showToast('Obra atualizada')
    } else {
      setObras((items) => [...items, { ...limpo, id: newId(), desde: new Date().toISOString() }])
      showToast('Obra adicionada')
    }
    setDraft(null)
  }

  const excluir = () => {
    if (!draft?.id) return
    if (!window.confirm(`Excluir a obra de ${draft.cliente}? Essa ação não pode ser desfeita.`)) return
    setObras((items) => items.filter((o) => o.id !== draft.id))
    setDraft(null)
    showToast('Obra excluída')
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d))

  return (
    <div className="shell">
      <header className="topbar">
        <img className="logo" src="/logo.svg" alt="Quintal Construtora" />
        <span className="topbar-tag">Acompanhamento de obras</span>
      </header>

      <main className="content">
        <div className="toolbar">
          <div>
            <p className="eyebrow">OBRAS EM EXECUÇÃO</p>
            <h1>Quadro de obras <span className="total">{obras.length}</span></h1>
          </div>
          <div className="tools">
            <label className="search">
              <Search aria-hidden="true" />
              <input aria-label="Buscar obra" placeholder="Buscar cliente ou endereço" value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            <select className="select" aria-label="Filtrar por empreiteiro" value={filtroEmpreiteiro} onChange={(e) => setFiltroEmpreiteiro(e.target.value)}>
              <option>Todos</option>
              {empreiteiros.map((n) => <option key={n}>{n}</option>)}
            </select>
            <button className="btn-primary" onClick={() => setDraft({ ...emptyDraft })}><Plus aria-hidden="true" /> Nova obra</button>
          </div>
        </div>

        {!supabase && loaded && <p className="notice">Modo local: as obras ficam salvas só neste navegador. Para compartilhar entre aparelhos, configure o Supabase (veja o README).</p>}
        {syncError && <p className="notice notice-error">Não foi possível sincronizar com o banco. Verifique a conexão e as permissões do Supabase.</p>}

        <div className="board">
          {STAGES.map((etapa, i) => {
            const cards = filtradas.filter((o) => o.etapa === etapa)
            return (
              <section key={etapa} className="column" onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragged) moverPara(dragged, etapa); setDragged(null) }}>
                <div className="column-head"><span className="column-step">{i + 1}</span><h2>{etapa}</h2><span className="column-count">{cards.length}</span></div>
                <div className="column-body">
                  {cards.map((o) => <ObraCard key={o.id} obra={o} agora={agora} onOpen={(ob) => setDraft({ id: ob.id, cliente: ob.cliente, endereco: ob.endereco, detalhes: ob.detalhes, empreiteiro: ob.empreiteiro, etapa: ob.etapa })} onDragStart={setDragged} />)}
                  {cards.length === 0 && <div className="empty">{loaded ? 'Nenhuma obra' : 'Carregando…'}</div>}
                </div>
              </section>
            )
          })}
        </div>
      </main>

      {draft && (
        <div className="backdrop" onClick={() => setDraft(null)}>
          <form className="modal" onSubmit={salvar} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{draft.id ? 'Editar obra' : 'Nova obra'}</h2>
              <button type="button" className="icon-btn" aria-label="Fechar" onClick={() => setDraft(null)}><X /></button>
            </div>
            <div className="field"><label htmlFor="cliente">Nome do cliente</label><input id="cliente" required value={draft.cliente} onChange={(e) => set('cliente', e.target.value)} placeholder="Ex.: Maria Silva" autoFocus /></div>
            <div className="field"><label htmlFor="endereco">Endereço da obra</label><input id="endereco" required value={draft.endereco} onChange={(e) => set('endereco', e.target.value)} placeholder="Rua, número, bairro, cidade" /></div>
            <div className="field"><label htmlFor="detalhes">Detalhes da obra</label><textarea id="detalhes" value={draft.detalhes} onChange={(e) => set('detalhes', e.target.value)} placeholder="Metragem, tipo de obra, observações, pendências…" /></div>
            <div className="field">
              <label htmlFor="empreiteiro">Empreiteiro responsável</label>
              <input id="empreiteiro" required list="empreiteiros" value={draft.empreiteiro} onChange={(e) => set('empreiteiro', e.target.value)} placeholder="Nome do empreiteiro" />
              <datalist id="empreiteiros">{empreiteiros.map((n) => <option key={n} value={n} />)}</datalist>
            </div>
            <fieldset className="field stages">
              <legend>Status da obra</legend>
              <div className="stage-options">
                {STAGES.map((s) => (
                  <label key={s} className={draft.etapa === s ? 'active' : ''}>
                    <input type="radio" name="etapa" value={s} checked={draft.etapa === s} onChange={() => set('etapa', s)} />{s}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="modal-actions">
              {draft.id && <button type="button" className="btn-danger" onClick={excluir}><Trash2 aria-hidden="true" /> Excluir</button>}
              <span className="spacer" />
              <button type="button" className="btn-ghost" onClick={() => setDraft(null)}>Cancelar</button>
              <button type="submit" className="btn-primary">Salvar</button>
            </div>
          </form>
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
