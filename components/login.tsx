'use client'

import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

function traduzir(mensagem: string) {
  const m = mensagem.toLowerCase()
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (m.includes('email not confirmed')) return 'Este e-mail ainda não foi confirmado.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
  if (m.includes('password should be') || m.includes('weak')) return 'Senha fraca. Use pelo menos 8 caracteres.'
  if (m.includes('same password') || m.includes('different from the old')) return 'Escolha uma senha diferente da anterior.'
  if (m.includes('network') || m.includes('fetch')) return 'Sem conexão com o servidor. Verifique a internet.'
  return 'Não foi possível concluir. Tente novamente.'
}

type Props = {
  supabase: SupabaseClient
  /** `entrar`: login normal. `definir`: a pessoa chegou por convite ou link de recuperação e precisa criar a senha. */
  modo: 'entrar' | 'definir'
  onSenhaDefinida: () => void
}

export function Login({ supabase, modo, onSenhaDefinida }: Props) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [info, setInfo] = useState('')

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setInfo('')
    setCarregando(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
    setCarregando(false)
    if (error) setErro(traduzir(error.message))
  }

  const esqueci = async () => {
    setErro('')
    setInfo('')
    if (!email.trim()) {
      setErro('Digite seu e-mail acima e clique novamente em "Esqueci minha senha".')
      return
    }
    setCarregando(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
    setCarregando(false)
    if (error) setErro(traduzir(error.message))
    else setInfo('Se este e-mail tiver acesso, você receberá um link para criar uma nova senha.')
  }

  const definir = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    if (senha.length < 8) return setErro('A senha precisa ter pelo menos 8 caracteres.')
    if (senha !== confirmacao) return setErro('As senhas não conferem.')
    setCarregando(true)
    const { error } = await supabase.auth.updateUser({ password: senha })
    setCarregando(false)
    if (error) return setErro(traduzir(error.message))
    try { window.history.replaceState(null, '', window.location.pathname) } catch {}
    onSenhaDefinida()
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img className="auth-logo" src="/logo.png" alt="Quintal Construtora e Incorporadora" width={502} height={178} />
        {modo === 'entrar' ? (
          <form onSubmit={entrar} noValidate={false}>
            <p className="eyebrow">ACESSO RESTRITO</p>
            <h1 className="auth-title">Entrar</h1>
            <div className="field">
              <label htmlFor="login-email">E-mail</label>
              <input id="login-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </div>
            <div className="field">
              <label htmlFor="login-senha">Senha</label>
              <input id="login-senha" type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
            </div>
            {erro && <p className="auth-msg erro" role="alert">{erro}</p>}
            {info && <p className="auth-msg info" role="status">{info}</p>}
            <button type="submit" className="btn-primary auth-submit" disabled={carregando}>{carregando ? 'Aguarde…' : 'Entrar'}</button>
            <button type="button" className="auth-link" onClick={esqueci} disabled={carregando}>Esqueci minha senha</button>
          </form>
        ) : (
          <form onSubmit={definir}>
            <p className="eyebrow">PRIMEIRO ACESSO</p>
            <h1 className="auth-title">Crie sua senha</h1>
            <div className="field">
              <label htmlFor="nova-senha">Nova senha</label>
              <input id="nova-senha" type="password" autoComplete="new-password" minLength={8} required value={senha} onChange={(e) => setSenha(e.target.value)} autoFocus />
            </div>
            <div className="field">
              <label htmlFor="confirma-senha">Repita a senha</label>
              <input id="confirma-senha" type="password" autoComplete="new-password" minLength={8} required value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
            </div>
            {erro && <p className="auth-msg erro" role="alert">{erro}</p>}
            <button type="submit" className="btn-primary auth-submit" disabled={carregando}>{carregando ? 'Aguarde…' : 'Salvar senha e entrar'}</button>
          </form>
        )}
      </div>
    </div>
  )
}
