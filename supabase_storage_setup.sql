insert into storage.buckets (id, name, public)
values ('reload-screenshots', 'reload-screenshots', true)
on conflict (id) do update set public = true;

drop policy if exists "Allow public reload screenshot uploads" on storage.objects;
create policy "Allow public reload screenshot uploads"
on storage.objects
for insert
to anon
with check (bucket_id = 'reload-screenshots');

drop policy if exists "Allow public reload screenshot reads" on storage.objects;
create policy "Allow public reload screenshot reads"
on storage.objects
for select
to anon
using (bucket_id = 'reload-screenshots');

insert into storage.buckets (id, name, public)
values ('registration-proofs', 'registration-proofs', true)
on conflict (id) do update set public = true;

drop policy if exists "Allow public registration proof uploads" on storage.objects;
create policy "Allow public registration proof uploads"
on storage.objects
for insert
to anon
with check (bucket_id = 'registration-proofs');

drop policy if exists "Allow public registration proof reads" on storage.objects;
create policy "Allow public registration proof reads"
on storage.objects
for select
to anon
using (bucket_id = 'registration-proofs');
