-- Estrutura do Supabase usada pelo Kanban de Obras da Quintal Construtora.
-- Rode uma vez no SQL Editor do projeto Supabase (é seguro rodar de novo).

create table if not exists public.quintal_board_state (
  id text primary key,
  obras jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.quintal_board_state enable row level security;

-- O app grava sempre na linha "default".
drop policy if exists "quintal_board_select" on public.quintal_board_state;
create policy "quintal_board_select" on public.quintal_board_state
  for select to anon, authenticated using (id = 'default');

drop policy if exists "quintal_board_insert" on public.quintal_board_state;
create policy "quintal_board_insert" on public.quintal_board_state
  for insert to anon, authenticated with check (id = 'default');

drop policy if exists "quintal_board_update" on public.quintal_board_state;
create policy "quintal_board_update" on public.quintal_board_state
  for update to anon, authenticated using (id = 'default') with check (id = 'default');

-- Realtime: o quadro atualiza sozinho entre telas.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'quintal_board_state'
  ) then
    alter publication supabase_realtime add table public.quintal_board_state;
  end if;
end $$;
