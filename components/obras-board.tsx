'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, CheckSquare, ChevronLeft, ChevronRight, Clock3, ExternalLink, HardHat, ImagePlus, LogOut, MapPin, Plus, Search, Settings, Star, Trash2, X } from 'lucide-react'
import { api } from '@/lib/api'
import { Login } from '@/components/login'
import { Configuracoes } from '@/components/configuracoes'

type Papel = 'admin' | 'editor' | 'leitor'

export const STAGES = ['PROJETO', 'APROVAÇÃO', 'SERVIÇOS PRELIMINARES', 'FUNDAÇÃO', 'ESTRUTURA', 'ALVENARIA', 'INSTALAÇÕES', 'REBOCO', 'GESSO', 'PINTURA', 'REVESTIMENTOS', 'ESQUADRIAS', 'ACABAMENTOS'] as const
type Stage = (typeof STAGES)[number]

/** Atividades de cada etapa. Cada uma ganha uma caixa de marcação; as de etapas em LINK_ETAPAS ganham também o link do Drive. */
const ATIVIDADES: Record<Stage, readonly string[]> = {
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
const LINK_ETAPAS: readonly Stage[] = ['PROJETO']

/** Estado de cada atividade, guardado por obra com a chave `etapa|atividade`. */
type Atividade = { feita: boolean; link?: string }
type Atividades = Record<string, Atividade>
const chaveAtividade = (etapa: Stage, nome: string) => `${etapa}|${nome}`

/** Só aceita endereços http(s), para o link do Drive nunca virar um script. */
function linkSeguro(valor: unknown): string {
  if (typeof valor !== 'string') return ''
  const v = valor.trim()
  if (!v) return ''
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : ''
  } catch {
    return ''
  }
}

function sanitizeAtividades(raw: unknown): Atividades {
  const out: Atividades = {}
  if (!raw || typeof raw !== 'object') return out
  for (const etapa of STAGES) {
    for (const nome of ATIVIDADES[etapa]) {
      const k = chaveAtividade(etapa, nome)
      const a = (raw as Record<string, unknown>)[k]
      if (!a || typeof a !== 'object') continue
      const feita = (a as Record<string, unknown>).feita === true
      const link = LINK_ETAPAS.includes(etapa) ? linkSeguro((a as Record<string, unknown>).link) : ''
      if (feita || link) out[k] = link ? { feita, link } : { feita }
    }
  }
  return out
}

/** Quantas atividades da etapa já foram marcadas. */
function progressoEtapa(atividades: Atividades, etapa: Stage) {
  const lista = ATIVIDADES[etapa]
  return { feitas: lista.filter((n) => atividades[chaveAtividade(etapa, n)]?.feita).length, total: lista.length }
}

type Foto = {
  id: string
  /** Imagem reduzida (até 1600 px) para a visualização ampliada. */
  url: string
  /** Miniatura leve (até 480 px) usada no card. */
  thumb: string
  /** ISO: quando a foto foi enviada. */
  data: string
  legenda: string
}

type Obra = {
  id: string
  cliente: string
  endereco: string
  detalhes: string
  empreiteiro: string
  etapa: Stage
  /** ISO: quando a obra entrou na etapa atual. */
  desde: string
  fotos: Foto[]
  /** id da foto de capa; sem ele vale a primeira. */
  capa?: string
  atividades: Atividades
}

type Draft = Omit<Obra, 'id' | 'desde'> & { id?: string; novoId?: string }

const PREFIXO_FOTOS = '/api/fotos/'

function capaDe(obra: Pick<Obra, 'fotos' | 'capa'>): Foto | undefined {
  return obra.fotos.find((f) => f.id === obra.capa) ?? obra.fotos[0]
}

/** Reduz a imagem no navegador (corrige a rotação do celular) e devolve um JPEG leve. */
async function reduzir(file: Blob, lado: number, qualidade: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * escala))
  canvas.height = Math.max(1, Math.round(bitmap.height * escala))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/jpeg', qualidade))
}

function paraDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** Caminho "obra/arquivo.jpg" de uma foto guardada no servidor (ou null para fotos de fora, como a de exemplo). */
function caminhoNoServidor(url: string): string | null {
  return url.startsWith(PREFIXO_FOTOS) ? url.slice(PREFIXO_FOTOS.length) : null
}

function formatarData(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(d)
}

/** Prazo esperado, em dias, para cada etapa (0 = sem prazo). */
type Sla = Record<Stage, number>

const DEFAULT_SLA: Sla = {
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

const emptyDraft: Draft = { cliente: '', endereco: '', detalhes: '', empreiteiro: '', etapa: 'PROJETO', fotos: [], atividades: {} }

const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`)

function diasNaEtapa(desde: string, agora: number) {
  const ms = agora - new Date(desde).getTime()
  if (!Number.isFinite(ms) || ms < 0) return 0
  return Math.floor(ms / 86_400_000)
}

/** Dias restantes do prazo da etapa (negativo = atrasada). `null` quando a etapa não tem prazo. */
function diasRestantes(obra: Obra, sla: Sla, agora: number) {
  const meta = sla[obra.etapa]
  return meta > 0 ? meta - diasNaEtapa(obra.desde, agora) : null
}

function textoPrazo(restantes: number) {
  if (restantes < 0) return `Atrasada ${Math.abs(restantes)} ${Math.abs(restantes) === 1 ? 'dia' : 'dias'}`
  if (restantes === 0) return 'Vence hoje'
  return `${restantes} ${restantes === 1 ? 'dia' : 'dias'} restantes`
}

function sanitizeSla(raw: unknown): Sla {
  const out = { ...DEFAULT_SLA }
  if (raw && typeof raw === 'object') {
    for (const stage of STAGES) {
      const v = Number((raw as Record<string, unknown>)[stage])
      if (Number.isFinite(v) && v >= 0) out[stage] = Math.floor(v)
    }
  }
  return out
}

/** Prazo, em dias, de cada atividade (chave `etapa|atividade`; 0 ou ausente = sem prazo). */
type SlaAtividades = Record<string, number>

function sanitizeSlaAtividades(raw: unknown): SlaAtividades {
  const out: SlaAtividades = {}
  if (!raw || typeof raw !== 'object') return out
  for (const etapa of STAGES) {
    for (const nome of ATIVIDADES[etapa]) {
      const k = chaveAtividade(etapa, nome)
      const v = Number((raw as Record<string, unknown>)[k])
      if (Number.isFinite(v) && v > 0) out[k] = Math.floor(v)
    }
  }
  return out
}

type Quadro = { obras: Obra[]; sla: Sla; slaAtividades: SlaAtividades }

/** O quadro é gravado como lista de obras (formato antigo) ou como { obras, sla, slaAtividades }. */
function limitarAoTotal(sla: Sla, ativ: SlaAtividades): SlaAtividades {
  const out: SlaAtividades = { ...ativ }
  for (const etapa of STAGES) {
    let resta = sla[etapa]
    for (const nome of ATIVIDADES[etapa]) {
      const k = chaveAtividade(etapa, nome)
      if (out[k] === undefined) continue
      out[k] = Math.min(out[k], resta)
      resta -= out[k]
      if (out[k] <= 0) delete out[k]
    }
  }
  return out
}

function parseBoard(raw: unknown): Quadro {
  if (Array.isArray(raw)) return { obras: sanitize(raw), sla: DEFAULT_SLA, slaAtividades: {} }
  if (raw && typeof raw === 'object') {
    const r = raw as { obras?: unknown; sla?: unknown; slaAtividades?: unknown }
    const sla = sanitizeSla(r.sla)
    return { obras: sanitize(r.obras), sla, slaAtividades: limitarAoTotal(sla, sanitizeSlaAtividades(r.slaAtividades)) }
  }
  return { obras: [], sla: DEFAULT_SLA, slaAtividades: {} }
}

function tempoNaEtapa(desde: string, agora: number) {
  const dias = diasNaEtapa(desde, agora)
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
      fotos: sanitizeFotos(o.fotos),
      capa: typeof o.capa === 'string' ? o.capa : undefined,
      atividades: sanitizeAtividades(o.atividades),
    }))
}

function sanitizeFotos(raw: unknown): Foto[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object' && typeof (f as Record<string, unknown>).url === 'string')
    .map((f) => ({
      id: typeof f.id === 'string' ? f.id : newId(),
      url: String(f.url),
      thumb: typeof f.thumb === 'string' ? f.thumb : String(f.url),
      data: typeof f.data === 'string' ? f.data : new Date().toISOString(),
      legenda: typeof f.legenda === 'string' ? f.legenda : '',
    }))
}

function ObraCard({ obra, sla, agora, podeEditar, resolver, onOpen, onDragStart }: { obra: Obra; sla: Sla; agora: number; podeEditar: boolean; resolver: (url: string) => string; onOpen: (o: Obra) => void; onDragStart: (o: Obra) => void }) {
  const restantes = diasRestantes(obra, sla, agora)
  const capa = capaDe(obra)
  const capaSrc = capa ? resolver(capa.thumb) : ''
  const prog = progressoEtapa(obra.atividades, obra.etapa)
  return (
    <div
      role="button"
      tabIndex={0}
      className={`obra-card ${podeEditar ? '' : 'somente-leitura'}`}
      draggable={podeEditar}
      onDragStart={() => onDragStart(obra)}
      onClick={() => onOpen(obra)}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onOpen(obra)
        }
      }}
    >
      <div className={`obra-capa ${capaSrc ? '' : 'vazia'}`}>
        {capaSrc ? <img src={capaSrc} alt={capa?.legenda || `Foto da obra de ${obra.cliente}`} loading="lazy" draggable={false} /> : <Camera aria-hidden="true" />}
        {obra.fotos.length > 1 && <span className="obra-capa-n"><Camera aria-hidden="true" />{obra.fotos.length}</span>}
      </div>
      <strong className="obra-cliente">{obra.cliente}</strong>
      <span className="obra-endereco"><MapPin aria-hidden="true" />{obra.endereco}</span>
      {obra.detalhes && <p className="obra-detalhes">{obra.detalhes}</p>}
      {restantes !== null && (
        <span className={`obra-prazo ${restantes < 0 ? 'late' : restantes <= 5 ? 'warn' : 'ok'}`} title={`Prazo da etapa: ${sla[obra.etapa]} dias`}>
          <Clock3 aria-hidden="true" />{textoPrazo(restantes)}
        </span>
      )}
      {prog.total > 0 && (
        <span className={`obra-prog ${prog.feitas === prog.total ? 'completo' : ''}`} title="Atividades concluídas na etapa atual">
          <CheckSquare aria-hidden="true" />
          <span className="obra-prog-barra"><i style={{ width: `${(prog.feitas / prog.total) * 100}%` }} /></span>
          {prog.feitas}/{prog.total}
        </span>
      )}
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
  const [sla, setSla] = useState<Sla>(DEFAULT_SLA)
  const [slaAtividades, setSlaAtividades] = useState<SlaAtividades>({})
  const [slaDraft, setSlaDraft] = useState<{ etapas: Sla; atividades: SlaAtividades } | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [dragged, setDragged] = useState<Obra | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [viewer, setViewer] = useState<number | null>(null)
  // Fotos enviadas / removidas durante a edição aberta: só viram definitivas ao salvar.
  const sessaoFotos = useRef<{ novas: Foto[]; removidas: Foto[] }>({ novas: [], removidas: [] })
  const [toast, setToast] = useState('')
  const [agora, setAgora] = useState(() => Date.now())
  const skipNextSave = useRef(false)
  const toastTimer = useRef<number | undefined>(undefined)

  // Sessão: `undefined` = verificando, `null` = ninguém logado.
  const [usuario, setUsuario] = useState<{ id: string; email: string; papel: Papel } | null | undefined>(undefined)
  const papel: Papel = usuario?.papel ?? 'leitor'
  const podeEditar = papel === 'editor' || papel === 'admin'
  const [configAberta, setConfigAberta] = useState(false)
  const clienteId = useRef(newId())
  const logado = !!usuario

  useEffect(() => {
    void api<{ usuario: { id: string; email: string; papel: Papel } | null }>('/api/auth/me')
      .then((r) => setUsuario(r.usuario))
      .catch(() => setUsuario(null))
  }, [])

  /** As fotos ficam no servidor e só são entregues a quem está logado, então o endereço já serve direto. */
  const resolver = (url: string) => url

  const showToast = (message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2400)
  }

  useEffect(() => {
    const t = window.setInterval(() => setAgora(Date.now()), 60_000)
    return () => window.clearInterval(t)
  }, [])

  // Carga inicial.
  useEffect(() => {
    if (!logado) return
    let alive = true
    void api<{ dados: unknown }>('/api/board')
      .then((r) => {
        if (!alive) return
        if (r.dados) {
          const board = parseBoard(r.dados)
          setObras(board.obras)
          setSla(board.sla)
          setSlaAtividades(board.slaAtividades)
        }
        setLoaded(true)
      })
      .catch((e) => {
        if (!alive) return
        if (e?.status === 401) setUsuario(null)
        else setSyncError(true)
        setLoaded(true)
      })
    return () => { alive = false }
  }, [logado])

  // Tempo real entre telas (SSE). O navegador reconecta sozinho se a conexão cair.
  useEffect(() => {
    if (!loaded) return
    const fonte = new EventSource('/api/board/stream')
    fonte.addEventListener('quadro', (ev) => {
      try {
        const msg = JSON.parse((ev as MessageEvent).data) as { dados?: unknown; cliente?: string }
        if (msg.cliente === clienteId.current || !msg.dados) return
        const board = parseBoard(msg.dados)
        skipNextSave.current = true
        setObras(board.obras)
        setSla(board.sla)
        setSlaAtividades(board.slaAtividades)
      } catch {}
    })
    return () => fonte.close()
  }, [loaded])

  // Salvamento.
  useEffect(() => {
    if (!loaded || !podeEditar) return
    if (skipNextSave.current) { skipNextSave.current = false; return }
    api('/api/board', { method: 'PUT', json: { dados: { obras, sla, slaAtividades }, cliente: clienteId.current } })
      .then(() => setSyncError(false))
      .catch((e) => { if (e?.status === 401) setUsuario(null); else setSyncError(true) })
  }, [loaded, obras, sla, slaAtividades, podeEditar])

  const empreiteiros = useMemo(() => Array.from(new Set(obras.map((o) => o.empreiteiro.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')), [obras])

  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase()
    return obras.filter((o) => (!q || `${o.cliente} ${o.endereco} ${o.detalhes}`.toLowerCase().includes(q)) && (filtroEmpreiteiro === 'Todos' || o.empreiteiro === filtroEmpreiteiro))
  }, [obras, search, filtroEmpreiteiro])

  const moverPara = (obra: Obra, etapa: Stage) => {
    if (!podeEditar || obra.etapa === etapa) return
    setObras((items) => items.map((o) => (o.id === obra.id ? { ...o, etapa, desde: new Date().toISOString() } : o)))
    showToast(`${obra.cliente} → ${etapa}`)
  }

  /** Apaga arquivos do servidor (melhor esforço: falhas não travam o app). */
  const apagarArquivos = (fotos: Foto[]) => {
    const caminhos = fotos.flatMap((f) => [caminhoNoServidor(f.url), caminhoNoServidor(f.thumb)]).filter((c): c is string => !!c)
    if (caminhos.length > 0) void api('/api/fotos', { method: 'DELETE', json: { caminhos: Array.from(new Set(caminhos)) } }).catch(() => {})
  }

  const abrirNova = () => {
    if (!podeEditar) return
    sessaoFotos.current = { novas: [], removidas: [] }
    setDraft({ ...emptyDraft, novoId: newId() })
  }

  const abrirEdicao = (o: Obra) => {
    sessaoFotos.current = { novas: [], removidas: [] }
    setDraft({ id: o.id, cliente: o.cliente, endereco: o.endereco, detalhes: o.detalhes, empreiteiro: o.empreiteiro, etapa: o.etapa, fotos: o.fotos, capa: o.capa, atividades: o.atividades })
  }

  /** Fecha sem salvar: descarta o que foi enviado nesta sessão. */
  const fecharDraft = () => {
    apagarArquivos(sessaoFotos.current.novas)
    sessaoFotos.current = { novas: [], removidas: [] }
    setViewer(null)
    setDraft(null)
  }

  const adicionarFotos = async (files: FileList | null) => {
    if (!podeEditar || !files || files.length === 0 || !draft) return
    const chave = draft.id ?? draft.novoId ?? newId()
    setEnviando(true)
    const novas: Foto[] = []
    let falhas = 0
    for (const file of Array.from(files)) {
      try {
        const id = newId()
        const [grande, pequena] = await Promise.all([reduzir(file, 1600, 0.82), reduzir(file, 480, 0.75)])
        const form = new FormData()
        form.set('obra', chave)
        form.set('id', id)
        form.set('grande', grande, `${id}.jpg`)
        form.set('thumb', pequena, `${id}-thumb.jpg`)
        const { url, thumb } = await api<{ url: string; thumb: string }>('/api/fotos', { method: 'POST', body: form })
        novas.push({ id, url, thumb, data: new Date().toISOString(), legenda: '' })
      } catch {
        falhas += 1
      }
    }
    setEnviando(false)
    if (novas.length > 0) {
      sessaoFotos.current.novas.push(...novas)
      setDraft((d) => (d ? { ...d, fotos: [...d.fotos, ...novas], capa: d.capa ?? d.fotos[0]?.id ?? novas[0].id } : d))
    }
    if (falhas > 0) showToast(falhas === 1 ? 'Não foi possível enviar 1 foto' : `Não foi possível enviar ${falhas} fotos`)
  }

  const removerFoto = (foto: Foto) => {
    if (!podeEditar) return
    sessaoFotos.current.removidas.push(foto)
    setViewer(null)
    setDraft((d) => {
      if (!d) return d
      const fotos = d.fotos.filter((f) => f.id !== foto.id)
      return { ...d, fotos, capa: d.capa === foto.id ? fotos[0]?.id : d.capa }
    })
  }

  const salvar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft || !podeEditar) return
    const { novoId, id: _id, ...campos } = draft
    const limpo = { ...campos, cliente: draft.cliente.trim(), endereco: draft.endereco.trim(), detalhes: draft.detalhes.trim(), empreiteiro: draft.empreiteiro.trim() }
    if (draft.id) {
      setObras((items) => items.map((o) => (o.id === draft.id ? { ...o, ...limpo, id: o.id, desde: o.etapa === limpo.etapa ? o.desde : new Date().toISOString() } : o)))
      showToast('Obra atualizada')
    } else {
      setObras((items) => [...items, { ...limpo, id: novoId ?? newId(), desde: new Date().toISOString() }])
      showToast('Obra adicionada')
    }
    apagarArquivos(sessaoFotos.current.removidas)
    sessaoFotos.current = { novas: [], removidas: [] }
    setViewer(null)
    setDraft(null)
  }

  const salvarSla = (e: React.FormEvent) => {
    e.preventDefault()
    if (!slaDraft || !podeEditar) return
    setSla(slaDraft.etapas)
    setSlaAtividades(Object.fromEntries(Object.entries(slaDraft.atividades).filter(([, v]) => v > 0)))
    setSlaDraft(null)
    showToast('Prazos das etapas atualizados')
  }

  const excluir = () => {
    if (!podeEditar || !draft?.id) return
    if (!window.confirm(`Excluir a obra de ${draft.cliente}? Essa ação não pode ser desfeita.`)) return
    const original = obras.find((o) => o.id === draft.id)
    apagarArquivos([...(original?.fotos ?? []), ...sessaoFotos.current.novas])
    sessaoFotos.current = { novas: [], removidas: [] }
    setObras((items) => items.filter((o) => o.id !== draft.id))
    setViewer(null)
    setDraft(null)
    showToast('Obra excluída')
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d))

  const sair = async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {})
    setObras([])
    setSla(DEFAULT_SLA)
    setSlaAtividades({})
    setLoaded(false)
    setUsuario(null)
    setDraft(null)
    setSlaDraft(null)
    setViewer(null)
    setConfigAberta(false)
  }

  if (usuario === undefined) return <div className="auth-page"><p className="auth-carregando">Carregando…</p></div>
  if (!usuario) return <Login onEntrou={() => { setLoaded(false); void api<{ usuario: { id: string; email: string; papel: Papel } | null }>('/api/auth/me').then((r) => setUsuario(r.usuario)) }} />

  const emailLogado = usuario.email

  return (
    <div className="shell">
      <header className="topbar">
        <div className="logo-bloco">
          <img className="logo" src="/logo.png" alt="Quintal Construtora e Incorporadora" width={502} height={178} />
          <span className="credito">Developed by Jota Ponto Consultoria</span>
        </div>
        <span className="topbar-tag">Acompanhamento de obras</span>
        {(
          <div className="topbar-user">
            <span className="user-email" title={emailLogado}>{emailLogado}</span>
            <span className={`papel-badge ${podeEditar ? 'editor' : 'leitor'}`}>{papel === 'admin' ? 'Administrador' : podeEditar ? 'Editor' : 'Somente consulta'}</span>
            <button type="button" className="icon-btn" aria-label="Configurações" title="Configurações" onClick={() => setConfigAberta(true)}><Settings /></button>
            <button type="button" className="btn-ghost sair" onClick={() => void sair()}><LogOut aria-hidden="true" /> Sair</button>
          </div>
        )}
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
            {podeEditar && <button className="btn-ghost" onClick={() => setSlaDraft({ etapas: { ...sla }, atividades: { ...slaAtividades } })}><Clock3 aria-hidden="true" /> SLA das etapas</button>}
            {podeEditar && <button className="btn-primary" onClick={abrirNova}><Plus aria-hidden="true" /> Nova obra</button>}
          </div>
        </div>

        {syncError && <p className="notice notice-error">Não foi possível sincronizar com o servidor. Verifique a conexão e tente de novo.</p>}

        <div className="board">
          {STAGES.map((etapa, i) => {
            const cards = filtradas.filter((o) => o.etapa === etapa)
            const atrasadas = cards.filter((o) => (diasRestantes(o, sla, agora) ?? 0) < 0).length
            return (
              <section key={etapa} className="column" onDragOver={(e) => e.preventDefault()} onDrop={() => { if (podeEditar && dragged) moverPara(dragged, etapa); setDragged(null) }}>
                <div className="column-head"><span className="column-step">{i + 1}</span><h2>{etapa}</h2>{atrasadas > 0 && <span className="column-late" title={`${atrasadas} atrasada(s)`}>{atrasadas} atrasada{atrasadas > 1 ? 's' : ''}</span>}<span className="column-count">{cards.length}</span></div>
                {sla[etapa] > 0 && <div className="column-sla">Prazo: {sla[etapa]} dias</div>}
                <div className="column-body">
                  {cards.map((o) => <ObraCard key={o.id} obra={o} sla={sla} agora={agora} podeEditar={podeEditar} resolver={resolver} onOpen={abrirEdicao} onDragStart={setDragged} />)}
                  {cards.length === 0 && <div className="empty">{loaded ? 'Nenhuma obra' : 'Carregando…'}</div>}
                </div>
              </section>
            )
          })}
        </div>
      </main>

      {draft && (
        <div className="backdrop" onClick={fecharDraft}>
          <form className="modal" onSubmit={salvar} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{!podeEditar ? 'Detalhes da obra' : draft.id ? 'Editar obra' : 'Nova obra'}</h2>
              <button type="button" className="icon-btn" aria-label="Fechar" onClick={fecharDraft}><X /></button>
            </div>
            <fieldset className="form-lock" disabled={!podeEditar}>
            <div className="field"><label htmlFor="cliente">Nome do cliente</label><input id="cliente" required value={draft.cliente} onChange={(e) => set('cliente', e.target.value)} placeholder="Ex.: Maria Silva" autoFocus /></div>
            <div className="field"><label htmlFor="endereco">Endereço da obra</label><input id="endereco" required value={draft.endereco} onChange={(e) => set('endereco', e.target.value)} placeholder="Rua, número, bairro, cidade" /></div>
            <div className="field"><label htmlFor="detalhes">Detalhes da obra</label><textarea id="detalhes" value={draft.detalhes} onChange={(e) => set('detalhes', e.target.value)} placeholder="Metragem, tipo de obra, observações, pendências…" /></div>
            <div className="field">
              <label htmlFor="empreiteiro">Empreiteiro responsável</label>
              <input id="empreiteiro" required list="empreiteiros" value={draft.empreiteiro} onChange={(e) => set('empreiteiro', e.target.value)} placeholder="Nome do empreiteiro" />
              <datalist id="empreiteiros">{empreiteiros.map((n) => <option key={n} value={n} />)}</datalist>
            </div>
            </fieldset>
            {(podeEditar || draft.fotos.length > 0) && <div className="field">
              <label>Fotos da obra</label>
              <div className="galeria">
                {draft.fotos.map((f, i) => {
                  const ehCapa = (capaDe(draft)?.id ?? '') === f.id
                  return (
                    <div key={f.id} className={`galeria-item ${ehCapa ? 'capa' : ''}`}>
                      <button type="button" className="galeria-img" onClick={() => setViewer(i)} aria-label={`Ampliar foto ${i + 1}`}>
                        {resolver(f.thumb) && <img src={resolver(f.thumb)} alt={f.legenda || `Foto ${i + 1}`} loading="lazy" />}
                      </button>
                      {podeEditar && <button type="button" className={`galeria-star ${ehCapa ? 'on' : ''}`} onClick={() => set('capa', f.id)} aria-label={ehCapa ? 'Foto de capa' : 'Usar como capa'} title={ehCapa ? 'Foto de capa' : 'Usar como capa'}><Star /></button>}
                    </div>
                  )
                })}
                {podeEditar && <label className={`galeria-add ${enviando ? 'busy' : ''}`}>
                  <ImagePlus aria-hidden="true" />
                  <span>{enviando ? 'Enviando…' : 'Adicionar fotos'}</span>
                  <input type="file" accept="image/*" multiple disabled={enviando} onChange={(e) => { void adicionarFotos(e.target.files); e.target.value = '' }} />
                </label>}
              </div>
              {draft.fotos.length > 0 && <p className="galeria-dica">{podeEditar ? 'Toque na foto para ampliar. A estrela define a capa do card.' : 'Toque na foto para ampliar.'}</p>}
            </div>}
            <fieldset className="field stages" disabled={!podeEditar}>
              <legend>Status da obra</legend>
              <div className="stage-options">
                {STAGES.map((s) => (
                  <label key={s} className={draft.etapa === s ? 'active' : ''}>
                    <input type="radio" name="etapa" value={s} checked={draft.etapa === s} onChange={() => set('etapa', s)} />{s}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="field">
              <label>Atividades da etapa: {draft.etapa}</label>
              <div className="atividades">
                {STAGES.map((etapa, i) => {
                  if (etapa !== draft.etapa) return null
                  const lista = ATIVIDADES[etapa]
                  const { feitas, total } = progressoEtapa(draft.atividades, etapa)
                  const comLink = LINK_ETAPAS.includes(etapa)
                  return (
                    <details key={etapa} className="ativ-etapa" open>
                      <summary onClick={(e) => e.preventDefault()}>
                        <span className="column-step">{i + 1}</span>
                        <span className="ativ-nome">{etapa}</span>
                        {total > 0 && <span className={`ativ-cont ${feitas === total ? 'completo' : ''}`}>{feitas}/{total}</span>}
                      </summary>
                      {lista.length === 0 ? (
                        <p className="ativ-vazio">Nenhuma atividade cadastrada nesta etapa.</p>
                      ) : (
                        <ul className="ativ-lista">
                          {lista.map((nome) => {
                            const k = chaveAtividade(etapa, nome)
                            const a = draft.atividades[k]
                            const atualizar = (mudanca: Partial<Atividade>) =>
                              setDraft((d) => {
                                if (!d) return d
                                const nova: Atividade = { ...d.atividades[k], feita: d.atividades[k]?.feita ?? false, ...mudanca }
                                const atividades = { ...d.atividades }
                                if (!nova.feita && !nova.link) delete atividades[k]
                                else atividades[k] = nova.link ? nova : { feita: nova.feita }
                                return { ...d, atividades }
                              })
                            return (
                              <li key={k} className={a?.feita ? 'feita' : ''}>
                                <label className="ativ-check">
                                  <input type="checkbox" disabled={!podeEditar} checked={!!a?.feita} onChange={(e) => atualizar({ feita: e.target.checked })} />
                                  <span>{nome}</span>
                                </label>
                                {(() => {
                                  const meta = slaAtividades[k]
                                  if (!meta) return null
                                  if (a?.feita) return <span className="ativ-prazo ok">Prazo: {meta} dias · concluída</span>
                                  const original = draft.id ? obras.find((o) => o.id === draft.id) : undefined
                                  const desde = original && original.etapa === draft.etapa ? original.desde : new Date(agora).toISOString()
                                  const rest = meta - diasNaEtapa(desde, agora)
                                  return <span className={`ativ-prazo ${rest < 0 ? 'late' : rest <= 5 ? 'warn' : 'ok'}`}>Prazo: {meta} dias · {textoPrazo(rest)}</span>
                                })()}
                                {comLink && (podeEditar ? (
                                  <input
                                    className="ativ-link"
                                    type="url"
                                    inputMode="url"
                                    aria-label={`Link do Google Drive: ${nome}`}
                                    placeholder="Cole aqui o link do Google Drive"
                                    value={a?.link ?? ''}
                                    onChange={(e) => atualizar({ link: e.target.value })}
                                    onBlur={(e) => { const l = linkSeguro(e.target.value); if (l !== (a?.link ?? '')) atualizar({ link: l }) }}
                                  />
                                ) : a?.link ? null : <span className="ativ-sem-link">Sem link</span>)}
                                {comLink && a?.link && linkSeguro(a.link) && (
                                  <a className="ativ-abrir" href={linkSeguro(a.link)} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true" /> Abrir / baixar projeto</a>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </details>
                  )
                })}
              </div>
            </div>
            <div className="modal-actions">
              {podeEditar && draft.id && <button type="button" className="btn-danger" onClick={excluir}><Trash2 aria-hidden="true" /> Excluir</button>}
              <span className="spacer" />
              <button type="button" className="btn-ghost" onClick={fecharDraft}>{podeEditar ? 'Cancelar' : 'Fechar'}</button>
              {podeEditar && <button type="submit" className="btn-primary" disabled={enviando}>Salvar</button>}
            </div>
          </form>
        </div>
      )}

      {draft && viewer !== null && draft.fotos[viewer] && (() => {
        const foto = draft.fotos[viewer]
        const total = draft.fotos.length
        return (
          <div className="lightbox" role="dialog" aria-label="Foto da obra" onClick={() => setViewer(null)}>
            <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
              {resolver(foto.url) ? <img src={resolver(foto.url)} alt={foto.legenda || `Foto ${viewer + 1} de ${total}`} /> : <div className="lightbox-carregando">Carregando foto…</div>}
              <div className="lightbox-bar">
                <div className="lightbox-info">
                  <span>{formatarData(foto.data)} · {viewer + 1}/{total}</span>
                  <input
                    readOnly={!podeEditar}
                    aria-label="Legenda da foto"
                    placeholder="Legenda (ex.: laje concluída)"
                    maxLength={120}
                    value={foto.legenda}
                    onChange={(e) => setDraft((d) => (d ? { ...d, fotos: d.fotos.map((f) => (f.id === foto.id ? { ...f, legenda: e.target.value } : f)) } : d))}
                  />
                </div>
                {podeEditar && <button type="button" className="btn-danger" onClick={() => removerFoto(foto)}><Trash2 aria-hidden="true" /> Remover</button>}
              </div>
              {total > 1 && (
                <>
                  <button type="button" className="lightbox-nav prev" aria-label="Foto anterior" onClick={() => setViewer((viewer + total - 1) % total)}><ChevronLeft /></button>
                  <button type="button" className="lightbox-nav next" aria-label="Próxima foto" onClick={() => setViewer((viewer + 1) % total)}><ChevronRight /></button>
                </>
              )}
              <button type="button" className="lightbox-close" aria-label="Fechar foto" onClick={() => setViewer(null)}><X /></button>
            </div>
          </div>
        )
      })()}

      {podeEditar && slaDraft && (
        <div className="backdrop" onClick={() => setSlaDraft(null)}>
          <form className="modal" onSubmit={salvarSla} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>SLA das etapas</h2>
                <p className="modal-sub">Prazo total de cada etapa e prazo de cada atividade, em dias. Os prazos contam a partir da entrada da obra na etapa. Use 0 para não ter prazo.</p>
              </div>
              <button type="button" className="icon-btn" aria-label="Fechar" onClick={() => setSlaDraft(null)}><X /></button>
            </div>
            <div className="sla-list">
              {STAGES.map((s, i) => {
                const soma = ATIVIDADES[s].reduce((t, n) => t + (slaDraft.atividades[chaveAtividade(s, n)] ?? 0), 0)
                return (
                  <div className="sla-grupo" key={s}>
                    <div className="sla-row">
                      <label htmlFor={`sla-${i}`}><span className="column-step">{i + 1}</span>{s}</label>
                      <div className="sla-input">
                        <input id={`sla-${i}`} type="number" inputMode="numeric" min={0} max={999} value={slaDraft.etapas[s]} onChange={(e) => setSlaDraft((d) => (d ? { ...d, etapas: { ...d.etapas, [s]: Math.max(soma, Math.floor(Number(e.target.value) || 0)) } } : d))} />
                        <span>dias (total)</span>
                      </div>
                    </div>
                    {ATIVIDADES[s].map((nome, j) => {
                      const k = chaveAtividade(s, nome)
                      return (
                        <div className="sla-row sla-ativ" key={k}>
                          <label htmlFor={`sla-${i}-${j}`}>{nome}</label>
                          <div className="sla-input">
                            <input id={`sla-${i}-${j}`} type="number" inputMode="numeric" min={0} value={slaDraft.atividades[k] ?? 0} disabled={slaDraft.etapas[s] <= 0} max={(slaDraft.atividades[k] ?? 0) + Math.max(0, slaDraft.etapas[s] - soma)} onChange={(e) => setSlaDraft((d) => (d ? { ...d, atividades: { ...d.atividades, [k]: Math.min(Math.max(0, Math.floor(Number(e.target.value) || 0)), (d.atividades[k] ?? 0) + Math.max(0, d.etapas[s] - soma)) } } : d))} />
                            <span>dias</span>
                          </div>
                        </div>
                      )
                    })}
                    {ATIVIDADES[s].length > 0 && <p className="sla-soma">{slaDraft.etapas[s] > 0 ? `Atividades: ${soma} de ${slaDraft.etapas[s]} dias (restam ${slaDraft.etapas[s] - soma}). A soma não pode passar do total da etapa.` : 'Defina o prazo total da etapa para poder dar prazo às atividades.'}</p>}
                  </div>
                )
              })}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={() => setSlaDraft({ etapas: { ...DEFAULT_SLA }, atividades: {} })}>Restaurar padrão</button>
              <span className="spacer" />
              <button type="button" className="btn-ghost" onClick={() => setSlaDraft(null)}>Cancelar</button>
              <button type="submit" className="btn-primary">Salvar prazos</button>
            </div>
          </form>
        </div>
      )}

      {configAberta && (
        <Configuracoes papel={papel} meuId={usuario.id} meuEmail={emailLogado} onFechar={() => setConfigAberta(false)} />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
