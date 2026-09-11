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

create index if not exists chat_history_session_created_idx
  on public."Chat_History" (session_id, created_at);

-- The backend uses the service-role key, so the table stays private to the API.
-- Do not expose SUPABASE_SERVICE_ROLE_KEY in the frontend.
