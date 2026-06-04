insert into storage.buckets (id, name, public)
values ('reload-screenshots', 'reload-screenshots', true)
on conflict (id) do update set public = true;

create policy "Allow public reload screenshot uploads"
on storage.objects
for insert
to anon
with check (bucket_id = 'reload-screenshots');

create policy "Allow public reload screenshot reads"
on storage.objects
for select
to anon
using (bucket_id = 'reload-screenshots');
