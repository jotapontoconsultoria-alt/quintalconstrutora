import { NextResponse } from 'next/server'
import { encerrarSessoesDe, hashSenha } from '@/lib/server/auth'
import { db } from '@/lib/server/db'
import { ehResposta, erro, exigir } from '@/lib/server/http'
import { obrasValidas } from '@/lib/server/quadro'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAPEIS = ['admin', 'editor', 'leitor', 'cliente']

/** Altera o perfil e/ou define uma nova senha provisória. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await exigir(req, ['admin'])
  if (ehResposta(u)) return u
  const { id } = await params
  let c: { papel?: unknown; senha?: unknown; obras?: unknown }
  try { c = await req.json() } catch { return erro('Pedido inválido.') }
  if (!db().prepare('select 1 from usuarios where id = ?').get(id)) return erro('Usuário não encontrado.', 404)
  if (c.papel !== undefined) {
    if (id === u.id) return erro('Você não pode alterar o seu próprio perfil.')
    if (!PAPEIS.includes(String(c.papel))) return erro('Perfil inválido.')
    db().prepare('update usuarios set papel = ? where id = ?').run(String(c.papel), id)
  }
  if (c.obras !== undefined) {
    const obras = obrasValidas(c.obras)
    db().prepare('delete from usuario_obra where usuario_id = ?').run(id)
    for (const o of obras) db().prepare('insert into usuario_obra (usuario_id, obra_id) values (?, ?)').run(id, o)
  }
  if (c.senha !== undefined) {
    const senha = String(c.senha)
    if (senha.length < 8) return erro('A senha precisa ter pelo menos 8 caracteres.')
    db().prepare('update usuarios set senha_hash = ? where id = ?').run(await hashSenha(senha), id)
    if (id !== u.id) encerrarSessoesDe(id)
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await exigir(req, ['admin'])
  if (ehResposta(u)) return u
  const { id } = await params
  if (id === u.id) return erro('Você não pode remover o seu próprio acesso.')
  db().prepare('delete from usuarios where id = ?').run(id)
  return NextResponse.json({ ok: true })
}
