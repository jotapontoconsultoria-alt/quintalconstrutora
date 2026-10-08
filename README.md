# Quintal Construtora — Kanban de obras

Quadro para acompanhar cada obra em execução, da fase de projeto aos revestimentos.
Baseado no `ams-joe` (Next.js + Supabase com atualização em tempo real).

## Etapas (colunas)

PROJETO → APROVAÇÃO → FUNDAÇÃO → ALVENARIA → INSTALAÇÕES → ESQUADRIAS → REVESTIMENTOS

## Card da obra

- Nome do cliente
- Endereço da obra
- Detalhes da obra
- Empreiteiro responsável

Arraste o card entre colunas ou abra-o para editar. O card mostra há quanto tempo a obra está na etapa atual e quantos dias restam do prazo (SLA) da etapa.

## SLA das etapas

O botão **SLA das etapas** define o prazo esperado, em dias, de cada etapa (0 = sem prazo). Os prazos iniciais são valores de partida e devem ser ajustados pela Quintal. Eles são salvos junto com o quadro, na coluna `obras` (`{ obras, sla }`), sem precisar alterar o banco.

## Fotos da obra

Cada obra tem uma foto de capa no card e uma galeria na janela de edição (várias fotos, legenda, estrela para escolher a capa). As fotos são reduzidas no navegador (1600 px e miniatura de 480 px) e enviadas ao Supabase Storage, no bucket `obras-fotos`. Para ativar o envio, rode `supabase/storage.sql` uma vez no SQL Editor. Sem o Supabase, o app guarda versões menores no navegador.

`public/exemplo/` traz uma ilustração de exemplo (não é foto real).

## Rodando localmente

```bash
pnpm install   # ou npm install
pnpm dev
```

Sem variáveis do Supabase, o app funciona em **modo local** (dados salvos só no navegador).

## Compartilhar entre aparelhos (Supabase)

1. Crie um projeto no Supabase e rode `supabase/schema.sql` no SQL Editor.
2. Defina no Vercel (e em `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

> Atenção: as políticas do schema liberam leitura e escrita para quem tiver o link. Antes de usar com dados reais dos clientes, adicione login (Supabase Auth) e restrinja as políticas.

## Identidade visual

Logo oficial em `public/logo.png`. Cores em `app/globals.css` (variáveis `--green`, `--leaf`, `--sand`).
