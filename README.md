# Quintal Construtora — Kanban de obras

Quadro para acompanhar cada obra em execução, da fase de projeto aos revestimentos.
Baseado no `ams-joe` (Next.js + Supabase com atualização em tempo real).

## Etapas (colunas)

PROJETO → APROVAÇÃO → SERVIÇOS PRELIMINARES → FUNDAÇÃO → ESTRUTURA → ALVENARIA → INSTALAÇÕES → REBOCO → GESSO → PINTURA → REVESTIMENTOS → ESQUADRIAS → ACABAMENTOS

## Atividades por etapa

Cada etapa tem uma lista de atividades (ex.: FUNDAÇÃO → Marcação, Estacas, Blocos), editada na janela da obra, que mostra só as atividades da etapa em que a obra está. Editores e administradores marcam a caixa de cada atividade concluída; o card mostra o progresso da etapa atual (ex.: 2/3). Na etapa **PROJETO** cada atividade tem também um campo para colar o link do Google Drive; quem consulta vê o botão **Abrir / baixar projeto**. A lista fica em `ATIVIDADES`, no início de `components/obras-board.tsx`. Tudo é salvo junto com a obra, sem alterar o banco.

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

> Atenção: o `schema.sql` libera leitura e escrita para quem tiver o link. Para uso real, rode também `supabase/auth.sql` (veja a seção abaixo), que troca essas regras por login e perfis.

## Login e perfis de acesso

O app exige e-mail e senha (Supabase Auth). Há três perfis:

- **administrador**: faz tudo o que o editor faz e, em **Configurações** (engrenagem no topo), cadastra usuários, define o perfil de cada um, redefine senhas e remove acessos;
- **editor**: cadastra, edita, move e exclui obras, ajusta o SLA e envia fotos;
- **somente consulta** (padrão para todo usuário novo): só visualiza.

Todo usuário também pode trocar a própria senha em Configurações.

Os usuários são criados por uma Edge Function do Supabase (`supabase/functions/admin-usuarios`), que roda no servidor com a chave de serviço do próprio Supabase e só aceita chamadas de administradores. Nenhuma chave secreta fica no site.

Passo a passo da primeira configuração:

1. Rode `supabase/auth.sql` no SQL Editor. Ele cria os perfis, troca as regras do banco para exigir login e torna o bucket de fotos privado.
2. No painel do Supabase, em Authentication, desligue **Allow new users to sign up** (o cadastro pelo site fica fechado; só entra quem o administrador criar).
3. Crie o primeiro usuário em Authentication → Users → **Add user** (e-mail, senha e "Auto Confirm User").
4. Promova esse usuário a administrador com o SQL que está no fim de `supabase/auth.sql`.
5. Entre no site: os demais usuários são cadastrados em Configurações.

Sem as variáveis do Supabase, o app roda em modo local, sem login.

## Identidade visual

Logo oficial em `public/logo.png`. Cores em `app/globals.css` (variáveis `--green`, `--leaf`, `--sand`).
