import { createHash, randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { cookies } from 'next/headers'
import { db } from './db'

const scrypt = promisify(scryptCb) as (senha: string, salt: Buffer, tam: number) => Promise<Buffer>

export type Papel = 'admin' | 'editor' | 'leitor' | 'cliente'
/** Perfis da equipe (veem o quadro). O cliente só vê o próprio portal. */
export const EQUIPE: Papel[] = ['admin', 'editor', 'leitor']

/** Obras que o cliente pode ver. */
export function obrasDoCliente(usuarioId: string): string[] {
  return (db().prepare('select obra_id from usuario_obra where usuario_id = ? order by obra_id').all(usuarioId) as { obra_id: string }[]).map((r) => r.obra_id)
}
export type Usuario = { id: string; email: string; papel: Papel }

export const COOKIE = 'quintal_sessao'
const DURACAO_SESSAO_S = 14 * 24 * 60 * 60

export async function hashSenha(senha: string) {
  const salt = randomBytes(16)
  const hash = await scrypt(senha, salt, 64)
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`
}

export async function conferirSenha(senha: string, armazenado: string) {
  const [tipo, saltB64, hashB64] = armazenado.split('$')
  if (tipo !== 'scrypt' || !saltB64 || !hashB64) return false
  const esperado = Buffer.from(hashB64, 'base64')
  const obtido = await scrypt(senha, Buffer.from(saltB64, 'base64'), esperado.length)
  return obtido.length === esperado.length && timingSafeEqual(obtido, esperado)
}

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex')

export function criarSessao(usuarioId: string) {
  const token = randomBytes(32).toString('base64url')
  const expira = Math.floor(Date.now() / 1000) + DURACAO_SESSAO_S
  db().prepare('insert into sessoes (token_hash, usuario_id, expira_em) values (?, ?, ?)').run(sha256(token), usuarioId, expira)
  db().prepare('delete from sessoes where expira_em < ?').run(Math.floor(Date.now() / 1000))
  return { token, maxAge: DURACAO_SESSAO_S }
}

export function encerrarSessao(token: string) {
  db().prepare('delete from sessoes where token_hash = ?').run(sha256(token))
}

export function encerrarSessoesDe(usuarioId: string) {
  db().prepare('delete from sessoes where usuario_id = ?').run(usuarioId)
}

/** Usuário da sessão atual (cookie), ou null. */
export async function usuarioAtual(): Promise<Usuario | null> {
  const token = (await cookies()).get(COOKIE)?.value
  if (!token) return null
  const linha = db()
    .prepare('select u.id, u.email, u.papel from sessoes s join usuarios u on u.id = s.usuario_id where s.token_hash = ? and s.expira_em > ?')
    .get(sha256(token), Math.floor(Date.now() / 1000)) as Usuario | undefined
  return linha ?? null
}

export const novoId = () => randomUUID()

/** Cria o primeiro administrador a partir de ADMIN_EMAIL / ADMIN_SENHA, quando ainda não há nenhum usuário. */
export async function garantirAdminInicial() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const senha = process.env.ADMIN_SENHA
  if (!email || !senha || senha.length < 8) return
  const { n } = db().prepare('select count(*) as n from usuarios').get() as { n: number }
  if (n > 0) return
  db()
    .prepare('insert into usuarios (id, email, senha_hash, papel, criado_em) values (?, ?, ?, ?, ?)')
    .run(novoId(), email, await hashSenha(senha), 'admin', new Date().toISOString())
}
