'use client'

import { useState } from 'react'
import { api } from '@/lib/api'

type Props = { onEntrou: () => void }

export function Login({ onEntrou }: Props) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      await api('/api/auth/login', { method: 'POST', json: { email: email.trim(), senha } })
      onEntrou()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível entrar.')
      setCarregando(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img className="auth-logo" src="/logo.png" alt="Quintal Construtora e Incorporadora" width={502} height={178} />
        <span className="credito credito-login">Developed by Jota Ponto Consultoria</span>
        <form onSubmit={entrar}>
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
          <button type="submit" className="btn-primary auth-submit" disabled={carregando}>{carregando ? 'Aguarde…' : 'Entrar'}</button>
          <p className="auth-ajuda">Esqueceu a senha? Peça ao administrador para definir uma nova.</p>
        </form>
      </div>
    </div>
  )
}
