-- Run in Supabase SQL Editor to enable private, per-user conversations.
create table if not exists public."Chat_Sessions" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id text not null,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public."Chat_Sessions"
  add column if not exists user_id uuid;
alter table public."Chat_Sessions"
  add column if not exists session_id text;
alter table public."Chat_Sessions"
  add column if not exists title text not null default 'New chat';
alter table public."Chat_Sessions"
  add column if not exists created_at timestamptz not null default now();
alter table public."Chat_Sessions"
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public."Chat_History" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  chat_id uuid,
  session_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources text not null default '[]',
  web_context text not null default '',
  provider text not null default 'local',
  created_at timestamptz not null default now()
);

alter table public."Chat_History" add column if not exists user_id uuid;
alter table public."Chat_History" add column if not exists chat_id uuid;
alter table public."Chat_History" add column if not exists session_id text;
alter table public."Chat_History" add column if not exists role text;
alter table public."Chat_History" add column if not exists content text;
alter table public."Chat_History" add column if not exists sources text not null default '[]';
alter table public."Chat_History" add column if not exists web_context text not null default '';
alter table public."Chat_History" add column if not exists provider text not null default 'local';
alter table public."Chat_History" add column if not exists created_at timestamptz not null default now();

update public."Chat_History" as history
set user_id = auth_user.id
from auth.users as auth_user
where history.user_id is null
  and history.session_id = auth_user.id::text;

do $$
declare
  legacy_chat record;
  new_chat_id uuid;
begin
  for legacy_chat in
    select user_id, session_id
    from public."Chat_History"
    where chat_id is null and user_id is not null
    group by user_id, session_id
  loop
    insert into public."Chat_Sessions" (user_id, session_id, title, created_at, updated_at)
    select
      legacy_chat.user_id,
      legacy_chat.session_id,
      left(coalesce((
        select content
        from public."Chat_History"
        where user_id = legacy_chat.user_id
          and session_id = legacy_chat.session_id
          and role = 'user'
        order by created_at asc
        limit 1
      ), 'Previous chat'), 80),
      min(created_at),
      max(created_at)
    from public."Chat_History"
    where user_id = legacy_chat.user_id
      and session_id = legacy_chat.session_id
    returning id into new_chat_id;

    update public."Chat_History"
    set chat_id = new_chat_id
    where user_id = legacy_chat.user_id
      and session_id = legacy_chat.session_id
      and chat_id is null;
  end loop;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public."Chat_Sessions"'::regclass
      and conname = 'chat_sessions_user_id_fkey'
  ) then
    alter table public."Chat_Sessions"
      add constraint chat_sessions_user_id_fkey
      foreign key (user_id) references auth.users (id) on delete cascade;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public."Chat_History"'::regclass
      and conname = 'chat_history_user_id_fkey'
  ) then
    alter table public."Chat_History"
      add constraint chat_history_user_id_fkey
      foreign key (user_id) references auth.users (id) on delete cascade;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public."Chat_History"'::regclass
      and conname = 'chat_history_chat_id_fkey'
  ) then
    alter table public."Chat_History"
      add constraint chat_history_chat_id_fkey
      foreign key (chat_id) references public."Chat_Sessions" (id) on delete cascade;
  end if;
end
$$;

create index if not exists chat_sessions_user_updated_idx
  on public."Chat_Sessions" (user_id, updated_at desc);
create index if not exists chat_history_user_chat_created_idx
  on public."Chat_History" (user_id, chat_id, created_at);

alter table public."Chat_Sessions" enable row level security;
alter table public."Chat_History" enable row level security;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('Chat_Sessions', 'Chat_History')
  loop
    execute format(
      'drop policy %I on public.%I',
      existing_policy.policyname,
      existing_policy.tablename
    );
  end loop;
end
$$;

revoke all on table public."Chat_Sessions" from public, anon, authenticated;
revoke all on table public."Chat_History" from public, anon, authenticated;
grant select on table public."Chat_Sessions" to anon;
grant select on table public."Chat_History" to anon;
grant select, insert, update, delete on table public."Chat_Sessions" to authenticated;
grant select, insert, delete on table public."Chat_History" to authenticated;

create policy "chat_sessions_select_own"
  on public."Chat_Sessions"
  for select to authenticated
  using ((select auth.uid()) = user_id and session_id = (select auth.uid())::text);

create policy "chat_sessions_insert_own"
  on public."Chat_Sessions"
  for insert to authenticated
  with check ((select auth.uid()) = user_id and session_id = (select auth.uid())::text);

create policy "chat_sessions_update_own"
  on public."Chat_Sessions"
  for update to authenticated
  using ((select auth.uid()) = user_id and session_id = (select auth.uid())::text)
  with check ((select auth.uid()) = user_id and session_id = (select auth.uid())::text);

create policy "chat_sessions_delete_own"
  on public."Chat_Sessions"
  for delete to authenticated
  using ((select auth.uid()) = user_id and session_id = (select auth.uid())::text);

create policy "chat_history_select_own"
  on public."Chat_History"
  for select to authenticated
  using (
    (select auth.uid()) = user_id
    and session_id = (select auth.uid())::text
    and exists (
      select 1
      from public."Chat_Sessions" as chat
      where chat.id = chat_id
        and chat.user_id = (select auth.uid())
        and chat.session_id = (select auth.uid())::text
    )
  );

create policy "chat_history_insert_own"
  on public."Chat_History"
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and session_id = (select auth.uid())::text
    and exists (
      select 1
      from public."Chat_Sessions" as chat
      where chat.id = chat_id
        and chat.user_id = (select auth.uid())
        and chat.session_id = (select auth.uid())::text
    )
  );

create policy "chat_history_delete_own"
  on public."Chat_History"
  for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and session_id = (select auth.uid())::text
    and exists (
      select 1
      from public."Chat_Sessions" as chat
      where chat.id = chat_id
        and chat.user_id = (select auth.uid())
        and chat.session_id = (select auth.uid())::text
    )
  );
