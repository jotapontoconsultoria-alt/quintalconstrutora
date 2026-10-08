-- Armazenamento das fotos das obras (Supabase Storage).
-- Rode uma vez no SQL Editor do projeto Supabase (é seguro rodar de novo).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('obras-fotos', 'obras-fotos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- O app usa a chave pública: pode enviar e remover arquivos somente neste bucket.
-- (A leitura por link direto já é liberada por o bucket ser público.)
drop policy if exists "obras_fotos_insert" on storage.objects;
create policy "obras_fotos_insert" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'obras-fotos');

drop policy if exists "obras_fotos_delete" on storage.objects;
create policy "obras_fotos_delete" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'obras-fotos');
