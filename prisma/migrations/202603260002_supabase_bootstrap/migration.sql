-- Atelier Supabase bootstrap
-- Run this after the initial Prisma schema migration has created the app tables.

create extension if not exists vector;

alter table if exists public.users
  add column if not exists embedding vector(1536);

create index if not exists users_embedding_idx
  on public.users
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('portfolios', 'portfolios', true),
  ('documents', 'documents', false),
  ('attachments', 'attachments', false),
  ('reviews', 'reviews', true),
  ('chat', 'chat', false)
on conflict (id) do nothing;

alter table public.users enable row level security;
alter table public.requests enable row level security;
alter table public.offers enable row level security;
alter table public.projects enable row level security;
alter table public.milestones enable row level security;
alter table public.messages enable row level security;
alter table public.attachments enable row level security;
alter table public.payments enable row level security;
alter table public.reviews enable row level security;
-- storage.objects already has RLS enabled in Supabase-managed projects.

drop policy if exists "users_select_self_or_verified" on public.users;
create policy "users_select_self_or_verified"
  on public.users
  for select
  using (
    auth.uid()::text = "supabaseId"
    or verified = true
  );

drop policy if exists "users_update_self" on public.users;
create policy "users_update_self"
  on public.users
  for update
  using (auth.uid()::text = "supabaseId");

drop policy if exists "requests_select_owner_or_matching_pro" on public.requests;
create policy "requests_select_owner_or_matching_pro"
  on public.requests
  for select
  using (
    auth.uid()::text in (
      select "supabaseId"
      from public.users
      where id = "clientId"
    )
    or (
      status in ('MATCHING', 'OFFERS_RECEIVED')
      and exists (
        select 1
        from public.users
        where "supabaseId" = auth.uid()::text
          and role = 'PROFESSIONAL'
      )
    )
  );

drop policy if exists "requests_insert_owner" on public.requests;
create policy "requests_insert_owner"
  on public.requests
  for insert
  with check (
    auth.uid()::text in (
      select "supabaseId"
      from public.users
      where id = "clientId"
    )
  );

drop policy if exists "requests_update_owner" on public.requests;
create policy "requests_update_owner"
  on public.requests
  for update
  using (
    auth.uid()::text in (
      select "supabaseId"
      from public.users
      where id = "clientId"
    )
  );

drop policy if exists "offers_select_participants" on public.offers;
create policy "offers_select_participants"
  on public.offers
  for select
  using (
    auth.uid()::text in (
      select "supabaseId"
      from public.users
      where id = "professionalId"
    )
    or auth.uid()::text in (
      select u."supabaseId"
      from public.requests r
      join public.users u on u.id = r."clientId"
      where r.id = "requestId"
    )
  );

drop policy if exists "offers_insert_professional" on public.offers;
create policy "offers_insert_professional"
  on public.offers
  for insert
  with check (
    auth.uid()::text in (
      select "supabaseId"
      from public.users
      where id = "professionalId"
        and role = 'PROFESSIONAL'
    )
  );

drop policy if exists "projects_select_participants" on public.projects;
create policy "projects_select_participants"
  on public.projects
  for select
  using (
    auth.uid()::text in (
      select "supabaseId"
      from public.users
      where id in ("clientId", "professionalId")
    )
  );

drop policy if exists "projects_update_participants" on public.projects;
create policy "projects_update_participants"
  on public.projects
  for update
  using (
    auth.uid()::text in (
      select "supabaseId"
      from public.users
      where id in ("clientId", "professionalId")
    )
  );

drop policy if exists "milestones_select_participants" on public.milestones;
create policy "milestones_select_participants"
  on public.milestones
  for select
  using (
    exists (
      select 1
      from public.projects p
      join public.users u on u.id in (p."clientId", p."professionalId")
      where p.id = "projectId"
        and u."supabaseId" = auth.uid()::text
    )
  );

drop policy if exists "messages_select_participants" on public.messages;
create policy "messages_select_participants"
  on public.messages
  for select
  using (
    exists (
      select 1
      from public.projects p
      join public.users u on u.id in (p."clientId", p."professionalId")
      where p.id = "projectId"
        and u."supabaseId" = auth.uid()::text
    )
  );

drop policy if exists "messages_insert_participants" on public.messages;
create policy "messages_insert_participants"
  on public.messages
  for insert
  with check (
    auth.uid()::text in (
      select "supabaseId"
      from public.users
      where id = "senderId"
    )
    and exists (
      select 1
      from public.projects p
      join public.users u on u.id in (p."clientId", p."professionalId")
      where p.id = "projectId"
        and u."supabaseId" = auth.uid()::text
    )
  );

drop policy if exists "attachments_select_participants" on public.attachments;
create policy "attachments_select_participants"
  on public.attachments
  for select
  using (
    (
      "requestId" is not null
      and auth.uid()::text in (
        select u."supabaseId"
        from public.requests r
        join public.users u on u.id = r."clientId"
        where r.id = "requestId"
      )
    )
    or (
      "projectId" is not null
      and exists (
        select 1
        from public.projects p
        join public.users u on u.id in (p."clientId", p."professionalId")
        where p.id = "projectId"
          and u."supabaseId" = auth.uid()::text
      )
    )
  );

drop policy if exists "payments_select_participants" on public.payments;
create policy "payments_select_participants"
  on public.payments
  for select
  using (
    auth.uid()::text in (
      select "supabaseId"
      from public.users
      where id = "clientId"
    )
    or exists (
      select 1
      from public.projects p
      join public.users u on u.id = p."professionalId"
      where p.id = "projectId"
        and u."supabaseId" = auth.uid()::text
    )
  );

drop policy if exists "reviews_select_public" on public.reviews;
create policy "reviews_select_public"
  on public.reviews
  for select
  using (true);

drop policy if exists "reviews_insert_client" on public.reviews;
create policy "reviews_insert_client"
  on public.reviews
  for insert
  with check (
    auth.uid()::text in (
      select u."supabaseId"
      from public.projects p
      join public.users u on u.id = p."clientId"
      where p.id = "projectId"
    )
  );

drop policy if exists "storage_public_assets" on storage.objects;
create policy "storage_public_assets"
  on storage.objects
  for select
  using (bucket_id in ('avatars', 'portfolios', 'reviews'));

drop policy if exists "storage_private_assets_participants" on storage.objects;
create policy "storage_private_assets_participants"
  on storage.objects
  for select
  using (
    bucket_id in ('documents', 'attachments', 'chat')
    and auth.role() = 'authenticated'
  );

drop policy if exists "storage_authenticated_uploads" on storage.objects;
create policy "storage_authenticated_uploads"
  on storage.objects
  for insert
  with check (auth.role() = 'authenticated');
