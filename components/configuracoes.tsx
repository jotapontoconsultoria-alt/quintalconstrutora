'use client'

import { useCallback, useEffect, useState } from 'react'
import { Copy, KeyRound, RefreshCw, Trash2, UserPlus, X } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'

export type PapelUsuario = 'admin' | 'editor' | 'leitor'

type Usuario = { id: string; email: string; papel: PapelUsuario; criadoEm: string; ultimoAcesso: string | null }

const ROTULO: Record<PapelUsuario, string> = { admin: 'Administrador', editor: 'Editor', leitor: 'Somente consulta' }

/** Senha provisória legível (sem caracteres que se confundem como 0/O ou 1/l). */
function gerarSenha() {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = new Uint32Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join('')
}

function formatarData(iso: string | null) {
  if (!iso) return 'Nunca'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
}

type Props = {
  supabase: SupabaseClient
  papel: PapelUsuario
  meuId: string
  meuEmail: string
  onFechar: () => void
}

export function Configuracoes({ supabase, papel, meuId, meuEmail, onFechar }: Props) {
  const ehAdmin = papel === 'admin'

  // ----- Minha senha -----
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [msgSenha, setMsgSenha] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [salvandoSenha, setSalvandoSenha] = useState(false)

  const trocarMinhaSenha = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsgSenha(null)
    if (novaSenha.length < 8) return setMsgSenha({ tipo: 'erro', texto: 'A senha precisa ter pelo menos 8 caracteres.' })
    if (novaSenha !== confirmacao) return setMsgSenha({ tipo: 'erro', texto: 'As senhas não conferem.' })
    setSalvandoSenha(true)
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    setSalvandoSenha(false)
    if (error) return setMsgSenha({ tipo: 'erro', texto: error.message.toLowerCase().includes('same') ? 'Escolha uma senha diferente da atual.' : 'Não foi possível alterar a senha.' })
    setNovaSenha('')
    setConfirmacao('')
    setMsgSenha({ tipo: 'ok', texto: 'Senha alterada.' })
  }

  // ----- Usuários (administrador) -----
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [novoEmail, setNovoEmail] = useState('')
  const [novoPapel, setNovoPapel] = useState<PapelUsuario>('leitor')
  const [senhaGerada, setSenhaGerada] = useState(() => gerarSenha())
  const [criado, setCriado] = useState<{ email: string; senha: string } | null>(null)
  const [copiado, setCopiado] = useState(false)

  const chamar = useCallback(async (acao: string, dados: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke('admin-usuarios', { body: { acao, ...dados } })
    if (error) {
      let texto = 'Não foi possível concluir. Tente novamente.'
      try {
        const corpo = await (error as { context?: Response }).context?.json?.()
        if (corpo?.erro) texto = corpo.erro
      } catch {}
      throw new Error(texto)
    }
    if (data?.erro) throw new Error(data.erro)
    return data
  }, [supabase])

  const carregar = useCallback(async () => {
    try {
      const data = await chamar('listar')
      setUsuarios(data.usuarios as Usuario[])
      setErro('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar usuários.')
    }
  }, [chamar])

  useEffect(() => {
    if (ehAdmin) void carregar()
  }, [ehAdmin, carregar])

  const executar = async (acao: string, dados: Record<string, unknown>, depois?: () => void) => {
    setOcupado(true)
    setErro('')
    try {
      await chamar(acao, dados)
      depois?.()
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao concluir.')
    } finally {
      setOcupado(false)
    }
  }

  const cadastrar = (e: React.FormEvent) => {
    e.preventDefault()
    const email = novoEmail.trim()
    const senha = senhaGerada
    void executar('criar', { email, senha, papel: novoPapel }, () => {
      setCriado({ email, senha })
      setCopiado(false)
      setNovoEmail('')
      setNovoPapel('leitor')
      setSenhaGerada(gerarSenha())
    })
  }

  const redefinirSenha = (u: Usuario) => {
    const senha = gerarSenha()
    if (!window.confirm(`Definir uma nova senha provisória para ${u.email}? A senha atual deixa de valer.`)) return
    void executar('senha', { id: u.id, senha }, () => { setCriado({ email: u.email, senha }); setCopiado(false) })
  }

  const remover = (u: Usuario) => {
    if (!window.confirm(`Remover o acesso de ${u.email}? Essa ação não pode ser desfeita.`)) return
    void executar('remover', { id: u.id })
  }

  const copiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <div className="backdrop" onClick={onFechar}>
      <div className="modal modal-wide" role="dialog" aria-label="Configurações" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>Configurações</h2>
            <p className="modal-sub">{meuEmail} · {ROTULO[papel]}</p>
          </div>
          <button type="button" className="icon-btn" aria-label="Fechar" onClick={onFechar}><X /></button>
        </div>

        {ehAdmin && (
          <section className="cfg-section">
            <h3>Usuários e acessos</h3>
            <p className="cfg-help">Administrador gerencia usuários e edita. Editor cadastra e altera obras. Somente consulta apenas visualiza.</p>

            {criado && (
              <div className="cfg-criado" role="status">
                <strong>{criado.email}</strong>
                <span>Senha provisória: <code>{criado.senha}</code></span>
                <button type="button" className="btn-ghost" onClick={() => void copiar(`E-mail: ${criado.email}\nSenha: ${criado.senha}`)}><Copy aria-hidden="true" /> {copiado ? 'Copiado' : 'Copiar acesso'}</button>
                <small>Anote agora: por segurança esta senha não aparece de novo. Envie por um canal seguro e peça para a pessoa trocá-la em Configurações.</small>
              </div>
            )}

            {erro && <p className="auth-msg erro" role="alert">{erro}</p>}

            <div className="cfg-lista">
              {usuarios === null && !erro && <p className="cfg-vazio">Carregando usuários…</p>}
              {usuarios?.map((u) => {
                const sou = u.id === meuId
                return (
                  <div className="cfg-linha" key={u.id}>
                    <div className="cfg-quem">
                      <strong title={u.email}>{u.email}{sou && <span className="cfg-voce"> (você)</span>}</strong>
                      <small>Último acesso: {formatarData(u.ultimoAcesso)}</small>
                    </div>
                    <select
                      className="select"
                      aria-label={`Perfil de ${u.email}`}
                      value={u.papel}
                      disabled={sou || ocupado}
                      onChange={(e) => void executar('papel', { id: u.id, papel: e.target.value })}
                    >
                      {(Object.keys(ROTULO) as PapelUsuario[]).map((p) => <option key={p} value={p}>{ROTULO[p]}</option>)}
                    </select>
                    <button type="button" className="icon-btn" title="Definir nova senha provisória" aria-label={`Nova senha para ${u.email}`} disabled={ocupado} onClick={() => redefinirSenha(u)}><KeyRound /></button>
                    <button type="button" className="icon-btn danger" title={sou ? 'Você não pode remover a si mesmo' : 'Remover acesso'} aria-label={`Remover ${u.email}`} disabled={sou || ocupado} onClick={() => remover(u)}><Trash2 /></button>
                  </div>
                )
              })}
            </div>

            <form className="cfg-novo" onSubmit={cadastrar}>
              <h4>Cadastrar usuário</h4>
              <div className="field">
                <label htmlFor="novo-email">E-mail</label>
                <input id="novo-email" type="email" required autoComplete="off" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} placeholder="pessoa@exemplo.com" />
              </div>
              <div className="cfg-duas">
                <div className="field">
                  <label htmlFor="novo-papel">Perfil</label>
                  <select id="novo-papel" className="select" value={novoPapel} onChange={(e) => setNovoPapel(e.target.value as PapelUsuario)}>
                    {(Object.keys(ROTULO) as PapelUsuario[]).map((p) => <option key={p} value={p}>{ROTULO[p]}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="novo-senha">Senha provisória</label>
                  <div className="cfg-senha">
                    <input id="novo-senha" type="text" required minLength={8} autoComplete="off" value={senhaGerada} onChange={(e) => setSenhaGerada(e.target.value)} />
                    <button type="button" className="icon-btn" title="Gerar outra senha" aria-label="Gerar outra senha" onClick={() => setSenhaGerada(gerarSenha())}><RefreshCw /></button>
                  </div>
                </div>
              </div>
              <button type="submit" className="btn-primary" disabled={ocupado}><UserPlus aria-hidden="true" /> {ocupado ? 'Aguarde…' : 'Cadastrar usuário'}</button>
            </form>
          </section>
        )}

        <section className="cfg-section">
          <h3>Minha senha</h3>
          <form onSubmit={trocarMinhaSenha}>
            <div className="cfg-duas">
              <div className="field">
                <label htmlFor="minha-senha">Nova senha</label>
                <input id="minha-senha" type="password" autoComplete="new-password" minLength={8} required value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="minha-senha2">Repita a senha</label>
                <input id="minha-senha2" type="password" autoComplete="new-password" minLength={8} required value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
              </div>
            </div>
            {msgSenha && <p className={`auth-msg ${msgSenha.tipo === 'ok' ? 'info' : 'erro'}`} role="status">{msgSenha.texto}</p>}
            <button type="submit" className="btn-ghost" disabled={salvandoSenha}>{salvandoSenha ? 'Aguarde…' : 'Alterar senha'}</button>
          </form>
        </section>
      </div>
    </div>
  )
}
