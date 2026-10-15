import { NextResponse } from 'next/server'
import { COOKIE, conferirSenha, criarSessao, garantirAdminInicial } from '@/lib/server/auth'
import { db } from '@/lib/server/db'
import { cookieSeguro, erro, mesmaOrigem } from '@/lib/server/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Limite simples de tentativas por e-mail + IP (em memória): 8 erros a cada 15 minutos.
const tentativas = new Map<string, { n: number; ate: number }>()
const JANELA_MS = 15 * 60 * 1000

export async function POST(req: Request) {
  if (!mesmaOrigem(req)) return erro('Origem não permitida.', 403)
  let corpo: { email?: unknown; senha?: unknown }
  try { corpo = await req.json() } catch { return erro('Pedido inválido.') }
  const email = String(corpo.email ?? '').trim().toLowerCase()
  const senha = String(corpo.senha ?? '')
  if (!email || !senha) return erro('Informe e-mail e senha.')

  const chave = `${req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'}|${email}`
  const t = tentativas.get(chave)
  if (t && t.ate > Date.now() && t.n >= 8) return erro('Muitas tentativas. Aguarde alguns minutos e tente de novo.', 429)

  await garantirAdminInicial()
  const u = db().prepare('select id, senha_hash from usuarios where email = ?').get(email) as { id: string; senha_hash: string } | undefined
  // Confere a senha mesmo sem usuário, para o tempo de resposta não revelar quais e-mails existem.
  const ok = u ? await conferirSenha(senha, u.senha_hash) : (await conferirSenha(senha, 'scrypt$AAAAAAAAAAAAAAAAAAAAAA==$AAAA'), false)
  if (!u || !ok) {
    const atual = t && t.ate > Date.now() ? t : { n: 0, ate: Date.now() + JANELA_MS }
    tentativas.set(chave, { n: atual.n + 1, ate: atual.ate })
    return erro('E-mail ou senha incorretos.', 401)
  }
  tentativas.delete(chave)
  db().prepare('update usuarios set ultimo_acesso = ? where id = ?').run(new Date().toISOString(), u.id)
  const { token, maxAge } = criarSessao(u.id)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: cookieSeguro(req), path: '/', maxAge })
  return res
}
