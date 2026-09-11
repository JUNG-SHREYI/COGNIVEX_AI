-- Run this in Supabase SQL Editor.
create table if not exists public."Chat_History" (
  id uuid primary key,
  session_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb not null default '[]'::jsonb,
  web_context text not null default '',
  provider text not null default 'local',
  created_at timestamptz not null default now()
);

-- Repair an existing Chat_History table created with a different schema.
alter table public."Chat_History" add column if not exists session_id text;
alter table public."Chat_History" add column if not exists role text;
alter table public."Chat_History" add column if not exists content text;
alter table public."Chat_History" add column if not exists sources text default '[]';
alter table public."Chat_History" add column if not exists web_context text default '';
alter table public."Chat_History" add column if not exists provider text default 'local';
alter table public."Chat_History" add column if not exists created_at timestamptz default now();

create index if not exists chat_history_session_created_idx
  on public."Chat_History" (session_id, created_at);

-- The backend uses the service-role key, so the table stays private to the API.
-- Do not expose SUPABASE_SERVICE_ROLE_KEY in the frontend.
