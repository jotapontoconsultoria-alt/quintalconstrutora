import { NextResponse } from 'next/server'
import { usuarioAtual, type Papel, type Usuario } from './auth'

export const erro = (mensagem: string, status = 400) => NextResponse.json({ erro: mensagem }, { status })

/** Pedidos que alteram dados só valem se vierem do próprio site (proteção extra contra CSRF). */
export function mesmaOrigem(req: Request) {
  const origem = req.headers.get('origin')
  if (!origem) return true
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  try {
    return new URL(origem).host === host
  } catch {
    return false
  }
}

/** Exige login (e, opcionalmente, um dos perfis). Devolve o usuário ou uma resposta de erro pronta. */
export async function exigir(req: Request, papeis?: Papel[]): Promise<Usuario | NextResponse> {
  if (req.method !== 'GET' && !mesmaOrigem(req)) return erro('Origem não permitida.', 403)
  const u = await usuarioAtual()
  if (!u) return erro('Sessão expirada. Entre novamente.', 401)
  if (papeis && !papeis.includes(u.papel)) return erro('Você não tem permissão para isso.', 403)
  return u
}

export const ehResposta = (v: Usuario | NextResponse): v is NextResponse => v instanceof NextResponse

export function cookieSeguro(req: Request) {
  return (req.headers.get('x-forwarded-proto') ?? new URL(req.url).protocol.replace(':', '')) === 'https'
}
