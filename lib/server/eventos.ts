import { EventEmitter } from 'node:events'

/** Avisa as telas abertas (por SSE) quando o quadro muda. */
const g = globalThis as unknown as { __quintalEventos?: EventEmitter }
export const eventos = g.__quintalEventos ?? (g.__quintalEventos = new EventEmitter())
eventos.setMaxListeners(200)
