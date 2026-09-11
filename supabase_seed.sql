-- Run after supabase_setup.sql in the Supabase SQL Editor.
-- These are clearly labeled development-only records.

insert into public."Chat_History"
  (id, session_id, role, content, sources, web_context, provider, created_at)
values
  (
    '00000000-0000-0000-0000-000000000101',
    'test-seed-2026-09-11',
    'user',
    'TEST DATA: What is Cognivex?',
    '[]',
    '',
    'test',
    '2026-09-11T00:00:00Z'
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    'test-seed-2026-09-11',
    'assistant',
    'TEST DATA: Cognivex is an AI assistant with web search and persistent chat history.',
    '[]',
    'Test seed record.',
    'test',
    '2026-09-11T00:00:01Z'
  )
on conflict (id) do nothing;

-- Verify the inserted test conversation.
select id, session_id, role, content, provider, created_at
from public."Chat_History"
where session_id = 'test-seed-2026-09-11'
order by created_at;
