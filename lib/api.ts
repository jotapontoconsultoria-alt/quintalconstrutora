/** Chamada ao servidor do próprio site. Lança Error com a mensagem em português vinda da API. */
export async function api<T = unknown>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...resto } = init
  const headers = new Headers(resto.headers)
  if (json !== undefined) headers.set('Content-Type', 'application/json')
  let res: Response
  try {
    res = await fetch(url, { ...resto, headers, body: json !== undefined ? JSON.stringify(json) : resto.body, credentials: 'same-origin' })
  } catch {
    throw new ErroApi('Sem conexão com o servidor. Verifique a internet.', 0)
  }
  const corpo = await res.json().catch(() => null)
  if (!res.ok) throw new ErroApi(corpo?.erro ?? 'Não foi possível concluir. Tente novamente.', res.status)
  return corpo as T
}

export class ErroApi extends Error {
  constructor(mensagem: string, public status: number) {
    super(mensagem)
  }
}
