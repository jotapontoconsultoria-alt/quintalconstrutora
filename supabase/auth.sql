-- Autenticação e perfis de acesso do Kanban de Obras da Quintal Construtora.
-- Rode UMA vez no SQL Editor do projeto Supabase (é seguro rodar de novo).
--
-- Depois de rodar:
--   * só usuários logados leem o quadro e as fotos;
--   * só quem tem o papel 'admin' ou 'editor' grava (obras, prazos e fotos);
--   * só o 'admin' cadastra e gerencia usuários (pela tela Configurações do site);
--   * quem tem o papel 'leitor' só consulta.
-- Todo usuário novo entra como 'leitor'. Para promover alguém, veja o final deste arquivo.

-- 1) Perfis -----------------------------------------------------------------
create table if not exists public.quintal_perfis (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  papel text not null default 'leitor',
  created_at timestamptz not null default now()
);

-- Perfis: admin (gerencia usuários e edita), editor (edita) e leitor (só consulta).
alter table public.quintal_perfis drop constraint if exists quintal_perfis_papel_check;
alter table public.quintal_perfis add constraint quintal_perfis_papel_check check (papel in ('admin', 'editor', 'leitor'));

alter table public.quintal_perfis enable row level security;

-- Cada pessoa lê apenas o próprio perfil. Ninguém altera perfis pelo app (só pelo SQL Editor).
drop policy if exists "quintal_perfis_select_proprio" on public.quintal_perfis;
create policy "quintal_perfis_select_proprio" on public.quintal_perfis
  for select to authenticated using (user_id = auth.uid());

-- Usuários que já existam entram como 'leitor'.
insert into public.quintal_perfis (user_id, email)
select id, email from auth.users
on conflict (user_id) do nothing;

-- Todo usuário criado daqui para frente também entra como 'leitor'.
create or replace function public.quintal_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.quintal_perfis (user_id, email, papel)
  values (new.id, new.email, 'leitor')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists quintal_on_auth_user_created on auth.users;
create trigger quintal_on_auth_user_created
  after insert on auth.users
  for each row execute function public.quintal_novo_usuario();

-- Papel de quem está logado (usado pelas regras abaixo).
create or replace function public.quintal_papel()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select papel from public.quintal_perfis where user_id = auth.uid()
$$;

revoke all on function public.quintal_papel() from public, anon;
grant execute on function public.quintal_papel() to authenticated;

-- 2) Quadro de obras ---------------------------------------------------------
drop policy if exists "quintal_board_select" on public.quintal_board_state;
drop policy if exists "quintal_board_insert" on public.quintal_board_state;
drop policy if exists "quintal_board_update" on public.quintal_board_state;

create policy "quintal_board_select" on public.quintal_board_state
  for select to authenticated using (id = 'default');

create policy "quintal_board_insert" on public.quintal_board_state
  for insert to authenticated
  with check (id = 'default' and public.quintal_papel() in ('admin', 'editor'));

create policy "quintal_board_update" on public.quintal_board_state
  for update to authenticated
  using (id = 'default' and public.quintal_papel() in ('admin', 'editor'))
  with check (id = 'default' and public.quintal_papel() in ('admin', 'editor'));

-- 3) Fotos (bucket privado) ----------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('obras-fotos', 'obras-fotos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "obras_fotos_select" on storage.objects;
drop policy if exists "obras_fotos_insert" on storage.objects;
drop policy if exists "obras_fotos_delete" on storage.objects;

create policy "obras_fotos_select" on storage.objects
  for select to authenticated using (bucket_id = 'obras-fotos');

create policy "obras_fotos_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'obras-fotos' and public.quintal_papel() in ('admin', 'editor'));

create policy "obras_fotos_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'obras-fotos' and public.quintal_papel() in ('admin', 'editor'));

-- 4) Primeiro administrador ----------------------------------------------------
-- Crie seu usuário em Authentication > Users > Add user e depois rode (troque o e-mail):
--
-- update public.quintal_perfis set papel = 'admin' where email = 'seu@email.com';
--
-- A partir daí, os demais usuários são cadastrados dentro do site, em Configurações.
-- Outros comandos úteis:
--
-- update public.quintal_perfis set papel = 'editor' where email = 'pessoa@exemplo.com';
-- update public.quintal_perfis set papel = 'leitor' where email = 'pessoa@exemplo.com';
-- select email, papel from public.quintal_perfis order by papel, email;
