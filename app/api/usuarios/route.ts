import { NextResponse } from 'next/server'
import { hashSenha, novoId } from '@/lib/server/auth'
import { db } from '@/lib/server/db'
import { ehResposta, erro, exigir } from '@/lib/server/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAPEIS = ['admin', 'editor', 'leitor']

export async function GET(req: Request) {
  const u = await exigir(req, ['admin'])
  if (ehResposta(u)) return u
  const usuarios = db()
    .prepare('select id, email, papel, criado_em as criadoEm, ultimo_acesso as ultimoAcesso from usuarios order by email')
    .all()
  return NextResponse.json({ usuarios })
}

export async function POST(req: Request) {
  const u = await exigir(req, ['admin'])
  if (ehResposta(u)) return u
  let c: { email?: unknown; senha?: unknown; papel?: unknown }
  try { c = await req.json() } catch { return erro('Pedido inválido.') }
  const email = String(c.email ?? '').trim().toLowerCase()
  const senha = String(c.senha ?? '')
  const papel = String(c.papel ?? '')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return erro('E-mail inválido.')
  if (senha.length < 8) return erro('A senha precisa ter pelo menos 8 caracteres.')
  if (!PAPEIS.includes(papel)) return erro('Perfil inválido.')
  if (db().prepare('select 1 from usuarios where email = ?').get(email)) return erro('Já existe um usuário com este e-mail.')
  const id = novoId()
  db().prepare('insert into usuarios (id, email, senha_hash, papel, criado_em) values (?, ?, ?, ?, ?)').run(id, email, await hashSenha(senha), papel, new Date().toISOString())
  return NextResponse.json({ ok: true, id })
}
