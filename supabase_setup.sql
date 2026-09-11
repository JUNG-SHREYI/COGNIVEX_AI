-- ═══════════════════════════════════════════════════════════════════════════
-- Cognivex AI Intelligence Platform — Supabase Schema Setup
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- Create the Chat_History table
CREATE TABLE IF NOT EXISTS "Chat_History" (
    id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  text         NOT NULL,
    role        text         NOT NULL CHECK (role IN ('user', 'assistant')),
    content     text         NOT NULL,
    sources     text         DEFAULT '[]',       -- JSON string of web sources
    web_context text         DEFAULT '',
    provider    text         DEFAULT 'local',
    created_at  timestamptz  NOT NULL DEFAULT now()
);

-- Index for fast session lookups
CREATE INDEX IF NOT EXISTS idx_chat_history_session_id
    ON "Chat_History" (session_id, created_at ASC);

-- ── Row-Level Security (RLS) ─────────────────────────────────────────────────
-- Option A: Disable RLS entirely (easiest — for internal/demo use)
ALTER TABLE "Chat_History" DISABLE ROW LEVEL SECURITY;

-- Option B (recommended for production): Enable RLS with anon read/write
-- ALTER TABLE "Chat_History" ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "anon_all" ON "Chat_History"
--     FOR ALL TO anon USING (true) WITH CHECK (true);

-- Verify creation
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'Chat_History'
ORDER BY ordinal_position;
