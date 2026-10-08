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

Arraste o card entre colunas ou abra-o para editar. O card mostra há quanto tempo a obra está na etapa atual.

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

Logo provisório em `public/logo.svg` — substitua pelo arquivo oficial da Quintal (mantendo o nome, ou ajuste `components/obras-board.tsx`). Cores em `app/globals.css` (variáveis `--green`, `--sand`).
