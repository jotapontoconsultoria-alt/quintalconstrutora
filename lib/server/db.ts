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
        papel text not null check (papel in ('admin', 'editor', 'leitor', 'cliente')),
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
    migrar(d)
    g.__quintalDb = d
  }
  return g.__quintalDb
}

/** Atualiza bancos criados por versões anteriores e cria as tabelas do portal do cliente. */
function migrar(d: DatabaseSync) {
  // 1) O perfil "cliente" não existia na regra (check) da tabela de usuários: recria a tabela uma única vez.
  const atual = d.prepare("select sql from sqlite_master where type = 'table' and name = 'usuarios'").get() as { sql: string } | undefined
  if (atual && !atual.sql.includes("'cliente'")) {
    d.exec(`
      pragma foreign_keys = off;
      begin;
      create table usuarios_novo (
        id text primary key,
        email text not null unique,
        senha_hash text not null,
        papel text not null check (papel in ('admin', 'editor', 'leitor', 'cliente')),
        criado_em text not null,
        ultimo_acesso text
      );
      insert into usuarios_novo (id, email, senha_hash, papel, criado_em, ultimo_acesso)
        select id, email, senha_hash, papel, criado_em, ultimo_acesso from usuarios;
      drop table usuarios;
      alter table usuarios_novo rename to usuarios;
      commit;
      pragma foreign_keys = on;
    `)
  }

  // 2) Portal do cliente: quais obras cada cliente enxerga e o financeiro de cada obra.
  d.exec(`
    create table if not exists usuario_obra (
      usuario_id text not null references usuarios (id) on delete cascade,
      obra_id text not null,
      primary key (usuario_id, obra_id)
    );
    create table if not exists fin_config (
      obra_id text primary key,
      mostrar_detalhe integer not null default 0,
      atualizado_em text not null
    );
    create table if not exists fin_categoria (
      id text primary key,
      obra_id text not null,
      ordem integer not null,
      nome text not null,
      grupo text not null default 'materiais' check (grupo in ('materiais', 'mao_de_obra', 'adm')),
      orcado_cent integer not null default 0,
      previsto_cent integer not null default 0
    );
    create index if not exists fin_categoria_obra on fin_categoria (obra_id, ordem);
    create table if not exists fin_item (
      id text primary key,
      categoria_id text not null references fin_categoria (id) on delete cascade,
      ordem integer not null,
      nome text not null,
      fornecedor text not null default ''
    );
    create index if not exists fin_item_categoria on fin_item (categoria_id, ordem);
    create table if not exists fin_lancamento (
      id text primary key,
      item_id text not null references fin_item (id) on delete cascade,
      mes text not null,
      valor_cent integer not null
    );
    create index if not exists fin_lancamento_item on fin_lancamento (item_id);
  `)
}
