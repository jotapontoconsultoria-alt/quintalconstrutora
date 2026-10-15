# Quintal Construtora — Kanban de obras

Quadro para acompanhar cada obra em execução, com 13 etapas, atividades por etapa, prazos (SLA), fotos, login com perfis e atualização em tempo real entre telas.

Esta versão roda em servidor próprio (VPS): Next.js + SQLite + fotos em disco. Instalação: **[DEPLOY-HOSTINGER.md](DEPLOY-HOSTINGER.md)**.

## Etapas

PROJETO → APROVAÇÃO → SERVIÇOS PRELIMINARES → FUNDAÇÃO → ESTRUTURA → ALVENARIA → INSTALAÇÕES → REBOCO → GESSO → PINTURA → REVESTIMENTOS → ESQUADRIAS → ACABAMENTOS

## Card da obra

Nome do cliente, endereço, detalhes, empreiteiro responsável, foto de capa, prazo da etapa e progresso das atividades. Arraste o card entre colunas ou abra-o para editar.

## Atividades por etapa

Ao abrir uma obra, aparecem só as atividades da etapa atual (ex.: FUNDAÇÃO → Marcação, Estacas, Blocos). Editores e administradores marcam as concluídas. Em PROJETO, cada atividade tem também um campo para o link do Google Drive; quem consulta vê o botão **Abrir / baixar projeto**. A lista está em `ATIVIDADES`, no início de `components/obras-board.tsx`.

## SLA

O botão **SLA das etapas** define o prazo total de cada etapa e o de cada atividade, em dias (0 = sem prazo). A soma dos prazos das atividades não pode passar do total da etapa.

## Perfis

- **Administrador**: edita e, em Configurações, cadastra usuários, muda perfis, redefine senhas e remove acessos.
- **Editor**: cadastra, edita, move e exclui obras, ajusta SLA e envia fotos.
- **Somente consulta**: apenas visualiza.

Não há recuperação de senha por e-mail: o administrador define uma senha provisória em Configurações.

## Desenvolvimento local

```bash
npm install
ADMIN_EMAIL=voce@exemplo.com ADMIN_SENHA=senha-forte-123 npm run dev
```

Os dados ficam em `./data` (banco `quintal.db` e pasta `fotos`). Requer Node 22 ou mais novo (usa o SQLite embutido do Node).

## Como funciona

- `app/api/*`: login (cookie de sessão, senha com scrypt), quadro, fotos (entregues só a quem está logado), usuários e o canal de tempo real (SSE).
- `lib/server/*`: banco SQLite, sessões e utilidades.
- `scripts/`: importação do quadro antigo, backup.
- Tudo roda em um único processo; para tempo real em várias instâncias seria preciso trocar o canal por Redis/Postgres (não é o caso aqui).
