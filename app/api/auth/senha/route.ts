import { NextResponse } from 'next/server'
import { conferirSenha, hashSenha } from '@/lib/server/auth'
import { db } from '@/lib/server/db'
import { ehResposta, erro, exigir } from '@/lib/server/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Cada pessoa troca a própria senha informando a atual. */
export async function POST(req: Request) {
  const u = await exigir(req, ['admin', 'editor', 'leitor', 'cliente'])
  if (ehResposta(u)) return u
  let corpo: { atual?: unknown; nova?: unknown }
  try { corpo = await req.json() } catch { return erro('Pedido inválido.') }
  const atual = String(corpo.atual ?? '')
  const nova = String(corpo.nova ?? '')
  if (nova.length < 8) return erro('A senha precisa ter pelo menos 8 caracteres.')
  const linha = db().prepare('select senha_hash from usuarios where id = ?').get(u.id) as { senha_hash: string } | undefined
  if (!linha || !(await conferirSenha(atual, linha.senha_hash))) return erro('A senha atual está incorreta.', 403)
  if (atual === nova) return erro('Escolha uma senha diferente da atual.')
  db().prepare('update usuarios set senha_hash = ? where id = ?').run(await hashSenha(nova), u.id)
  return NextResponse.json({ ok: true })
}
