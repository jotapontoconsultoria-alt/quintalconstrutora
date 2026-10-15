import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

/** Pasta onde ficam o banco (quintal.db) e as fotos. No servidor, fica num volume para sobreviver a atualizações. */
export const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data')
export const FOTOS_DIR = path.join(DATA_DIR, 'fotos')

const g = globalThis as unknown as { __quintalDb?: DatabaseSync }

export function db(): DatabaseSync {
  if (!g.__quintalDb) {
    mkdirSync(FOTOS_DIR, { recursive: true })
    const d = new DatabaseSync(path.join(DATA_DIR, 'quintal.db'))
    d.exec(`
      pragma journal_mode = wal;
      pragma foreign_keys = on;
      create table if not exists usuarios (
        id text primary key,
        email text not null unique,
        senha_hash text not null,
        papel text not null check (papel in ('admin', 'editor', 'leitor')),
        criado_em text not null,
        ultimo_acesso text
      );
      create table if not exists sessoes (
        token_hash text primary key,
        usuario_id text not null references usuarios (id) on delete cascade,
        expira_em integer not null
      );
      create table if not exists quadro (
        id text primary key,
        dados text not null,
        atualizado_em text not null
      );
    `)
    g.__quintalDb = d
  }
  return g.__quintalDb
}
