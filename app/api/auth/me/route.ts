import { NextResponse } from 'next/server'
import { usuarioAtual } from '@/lib/server/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const u = await usuarioAtual()
  return u ? NextResponse.json({ usuario: u }) : NextResponse.json({ usuario: null })
}
