import { eventos } from '@/lib/server/eventos'
import { ehResposta, exigir } from '@/lib/server/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Tempo real: mantém a conexão aberta e envia o quadro novo sempre que alguém salva. */
export async function GET(req: Request) {
  const u = await exigir(req)
  if (ehResposta(u)) return u
  const enc = new TextEncoder()
  let limpar = () => {}
  const stream = new ReadableStream({
    start(controller) {
      const enviar = (texto: string) => { try { controller.enqueue(enc.encode(texto)) } catch {} }
      const aoMudar = (msg: unknown) => enviar(`event: quadro\ndata: ${JSON.stringify(msg)}\n\n`)
      eventos.on('quadro', aoMudar)
      const batida = setInterval(() => enviar(': batida\n\n'), 25_000)
      enviar('retry: 3000\n\n')
      limpar = () => { clearInterval(batida); eventos.off('quadro', aoMudar) }
      req.signal.addEventListener('abort', () => { limpar(); try { controller.close() } catch {} })
    },
    cancel() { limpar() },
  })
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' },
  })
}
