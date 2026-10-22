import { NextResponse } from 'next/server'
import { hashSenha, novoId } from '@/lib/server/auth'
import { db } from '@/lib/server/db'
import { lerQuadro, obrasValidas, tituloDaObra } from '@/lib/server/quadro'
import { ehResposta, erro, exigir } from '@/lib/server/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAPEIS = ['admin', 'editor', 'leitor', 'cliente']

export async function GET(req: Request) {
  const u = await exigir(req, ['admin'])
  if (ehResposta(u)) return u
  const lista = db()
    .prepare('select id, email, papel, criado_em as criadoEm, ultimo_acesso as ultimoAcesso from usuarios order by email')
    .all() as { id: string }[]
  const vinculos = db().prepare('select usuario_id, obra_id from usuario_obra').all() as { usuario_id: string; obra_id: string }[]
  const usuarios = lista.map((l) => ({ ...l, obras: vinculos.filter((v) => v.usuario_id === l.id).map((v) => v.obra_id) }))
  // Obras do quadro, para o administrador escolher a obra de cada cliente.
  const obras = lerQuadro().obras.map((o) => ({ id: o.id, titulo: tituloDaObra(o) }))
  return NextResponse.json({ usuarios, obras })
}

export async function POST(req: Request) {
  const u = await exigir(req, ['admin'])
  if (ehResposta(u)) return u
  let c: { email?: unknown; senha?: unknown; papel?: unknown; obras?: unknown }
  try { c = await req.json() } catch { return erro('Pedido inválido.') }
  const email = String(c.email ?? '').trim().toLowerCase()
  const senha = String(c.senha ?? '')
  const papel = String(c.papel ?? '')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return erro('E-mail inválido.')
  if (senha.length < 8) return erro('A senha precisa ter pelo menos 8 caracteres.')
  if (!PAPEIS.includes(papel)) return erro('Perfil inválido.')
  if (db().prepare('select 1 from usuarios where email = ?').get(email)) return erro('Já existe um usuário com este e-mail.')
  const obras = papel === 'cliente' ? obrasValidas(c.obras) : []
  if (papel === 'cliente' && obras.length === 0) return erro('Escolha a obra que este cliente vai acompanhar.')
  const id = novoId()
  db().prepare('insert into usuarios (id, email, senha_hash, papel, criado_em) values (?, ?, ?, ?, ?)').run(id, email, await hashSenha(senha), papel, new Date().toISOString())
  for (const o of obras) db().prepare('insert into usuario_obra (usuario_id, obra_id) values (?, ?)').run(id, o)
  return NextResponse.json({ ok: true, id })
}
