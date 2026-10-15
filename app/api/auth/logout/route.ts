import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { COOKIE, encerrarSessao } from '@/lib/server/auth'
import { erro, mesmaOrigem } from '@/lib/server/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!mesmaOrigem(req)) return erro('Origem não permitida.', 403)
  const token = (await cookies()).get(COOKIE)?.value
  if (token) encerrarSessao(token)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE, '', { path: '/', maxAge: 0 })
  return res
}
