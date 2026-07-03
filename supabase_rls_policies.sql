-- BYT Club Wallet Supabase Row Level Security policies
--
-- IMPORTANT:
-- 1. These policies are for the secure Supabase Auth version of the app.
--    They assume each signed-in Supabase Auth user's email matches
--    app_users.email.
-- 2. Do not enable this file against the current custom app_users/password
--    login flow until the frontend is moved to Supabase Auth or server-side
--    RPC functions. Otherwise the current publishable-key reads/writes will
--    be blocked by RLS.
-- 3. Policies are intentionally strict for wallet safety: members cannot
--    directly update balances, transaction rows, session charge metadata, or
--    approval statuses from the browser.

-- ---------------------------------------------------------------------------
-- Auth helpers
-- ---------------------------------------------------------------------------

create or replace function public.current_app_user_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select app_users.id
  from public.app_users
  where lower(app_users.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1
$$;

create or replace function public.current_member_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select app_users.member_id
  from public.app_users
  where lower(app_users.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1
$$;

create or replace function public.current_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_users
    where lower(app_users.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and app_users.role = 'admin'
  )
$$;

revoke all on function public.current_app_user_id() from public;
revoke all on function public.current_member_id() from public;
revoke all on function public.current_is_admin() from public;
grant execute on function public.current_app_user_id() to authenticated;
grant execute on function public.current_member_id() to authenticated;
grant execute on function public.current_is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Table grants and RLS activation
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.members to authenticated;
grant select, insert, update, delete on public.app_users to authenticated;
grant select, insert, update, delete on public.reload_requests to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant select, insert, update, delete on public.sessions to authenticated;
grant select, insert, update, delete on public.session_bookings to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter table public.members enable row level security;
alter table public.app_users enable row level security;
alter table public.reload_requests enable row level security;
alter table public.transactions enable row level security;
alter table public.sessions enable row level security;
alter table public.session_bookings enable row level security;

alter table public.members force row level security;
alter table public.app_users force row level security;
alter table public.reload_requests force row level security;
alter table public.transactions force row level security;
alter table public.sessions force row level security;
alter table public.session_bookings force row level security;

-- ---------------------------------------------------------------------------
-- members
-- ---------------------------------------------------------------------------

drop policy if exists "members_admin_all" on public.members;
drop policy if exists "members_member_select_own" on public.members;

create policy "members_admin_all"
on public.members
for all
to authenticated
using (public.current_is_admin())
with check (public.current_is_admin());

create policy "members_member_select_own"
on public.members
for select
to authenticated
using (id = public.current_member_id());

-- ---------------------------------------------------------------------------
-- app_users
-- ---------------------------------------------------------------------------

drop policy if exists "app_users_admin_all" on public.app_users;
drop policy if exists "app_users_member_select_own" on public.app_users;

create policy "app_users_admin_all"
on public.app_users
for all
to authenticated
using (public.current_is_admin())
with check (public.current_is_admin());

create policy "app_users_member_select_own"
on public.app_users
for select
to authenticated
using (id = public.current_app_user_id());

-- ---------------------------------------------------------------------------
-- reload_requests
-- ---------------------------------------------------------------------------

drop policy if exists "reload_requests_admin_all" on public.reload_requests;
drop policy if exists "reload_requests_member_select_own" on public.reload_requests;
drop policy if exists "reload_requests_member_insert_own_pending" on public.reload_requests;

create policy "reload_requests_admin_all"
on public.reload_requests
for all
to authenticated
using (public.current_is_admin())
with check (public.current_is_admin());

create policy "reload_requests_member_select_own"
on public.reload_requests
for select
to authenticated
using (member_id = public.current_member_id());

create policy "reload_requests_member_insert_own_pending"
on public.reload_requests
for insert
to authenticated
with check (
  member_id = public.current_member_id()
  and status = 'Pending'
  and amount > 0
);

-- ---------------------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------------------

drop policy if exists "transactions_admin_all" on public.transactions;
drop policy if exists "transactions_member_select_own" on public.transactions;

create policy "transactions_admin_all"
on public.transactions
for all
to authenticated
using (public.current_is_admin())
with check (public.current_is_admin());

create policy "transactions_member_select_own"
on public.transactions
for select
to authenticated
using (member_id = public.current_member_id());

-- ---------------------------------------------------------------------------
-- sessions
-- ---------------------------------------------------------------------------

drop policy if exists "sessions_admin_all" on public.sessions;
drop policy if exists "sessions_authenticated_select" on public.sessions;

create policy "sessions_admin_all"
on public.sessions
for all
to authenticated
using (public.current_is_admin())
with check (public.current_is_admin());

create policy "sessions_authenticated_select"
on public.sessions
for select
to authenticated
using (true);

-- ---------------------------------------------------------------------------
-- session_bookings
-- ---------------------------------------------------------------------------

drop policy if exists "session_bookings_admin_all" on public.session_bookings;
drop policy if exists "session_bookings_authenticated_select" on public.session_bookings;
drop policy if exists "session_bookings_member_insert_own" on public.session_bookings;
drop policy if exists "session_bookings_member_cancel_own" on public.session_bookings;

create policy "session_bookings_admin_all"
on public.session_bookings
for all
to authenticated
using (public.current_is_admin())
with check (public.current_is_admin());

-- Members need booking counts for session availability. This exposes booking
-- rows to authenticated users; replace with an aggregate view/RPC later if
-- participant privacy needs to be stricter.
create policy "session_bookings_authenticated_select"
on public.session_bookings
for select
to authenticated
using (true);

create policy "session_bookings_member_insert_own"
on public.session_bookings
for insert
to authenticated
with check (
  member_id = public.current_member_id()
  and status = 'booked'
);

create policy "session_bookings_member_cancel_own"
on public.session_bookings
for update
to authenticated
using (member_id = public.current_member_id())
with check (
  member_id = public.current_member_id()
  and status = 'cancelled'
);

-- ---------------------------------------------------------------------------
-- Optional tables used by newer app code
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.activity_logs') is not null then
    grant select, insert on public.activity_logs to authenticated;
    alter table public.activity_logs enable row level security;
    alter table public.activity_logs force row level security;

    drop policy if exists "activity_logs_admin_select" on public.activity_logs;
    drop policy if exists "activity_logs_authenticated_insert" on public.activity_logs;

    create policy "activity_logs_admin_select"
    on public.activity_logs
    for select
    to authenticated
    using (public.current_is_admin());

    create policy "activity_logs_authenticated_insert"
    on public.activity_logs
    for insert
    to authenticated
    with check (actor_id = public.current_app_user_id()::text);
  end if;
end $$;

do $$
begin
  if to_regclass('public.session_walkins') is not null then
    grant select, insert, update, delete on public.session_walkins to authenticated;
    alter table public.session_walkins enable row level security;
    alter table public.session_walkins force row level security;

    drop policy if exists "session_walkins_admin_all" on public.session_walkins;
    drop policy if exists "session_walkins_authenticated_select" on public.session_walkins;

    create policy "session_walkins_admin_all"
    on public.session_walkins
    for all
    to authenticated
    using (public.current_is_admin())
    with check (public.current_is_admin());

    create policy "session_walkins_authenticated_select"
    on public.session_walkins
    for select
    to authenticated
    using (true);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Storage policies
-- ---------------------------------------------------------------------------

drop policy if exists "Allow public reload screenshot uploads" on storage.objects;
drop policy if exists "Allow public reload screenshot reads" on storage.objects;
drop policy if exists "Allow public registration proof uploads" on storage.objects;
drop policy if exists "Allow public registration proof reads" on storage.objects;
drop policy if exists "reload_screenshots_member_upload_own" on storage.objects;
drop policy if exists "reload_screenshots_member_read_own" on storage.objects;
drop policy if exists "registration_proofs_admin_read" on storage.objects;

create policy "reload_screenshots_member_upload_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'reload-screenshots'
  and name like ('member-' || public.current_member_id()::text || '/%')
);

create policy "reload_screenshots_member_read_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'reload-screenshots'
  and (
    public.current_is_admin()
    or name like ('member-' || public.current_member_id()::text || '/%')
  )
);

create policy "registration_proofs_admin_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'registration-proofs'
  and public.current_is_admin()
);

-- Public registration proof upload is deliberately not re-enabled here.
-- Implement it through Supabase Auth signup plus a server-side RPC/Edge
-- Function, or keep using supabase_storage_setup.sql until registration is
-- migrated.
