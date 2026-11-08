# COGNIVEX_AI

Cognivex is a multi-domain AI assistant with conversational chat, internet-grounded answers, local neural analysis, and persistent chat history through Supabase.

## Features

- ChatGPT-style conversational interface
- Village, college, industry, healthcare, and smart-city domains
- Live web search through DuckDuckGo
- Google Gemini integration with conversational memory and a local Cognivex fallback
- Local Cognivex model fallback when no external LLM is configured
- Chat history containing user prompts, assistant answers, web context, sources, provider, and timestamps
- Private, per-user Supabase history for authenticated users; Guest/Demo history stays local

## Project Structure

```text
backend/     FastAPI API, AI engine, web search, and Supabase persistence
frontend/    React and Vite chat application
dsa-ai-tutor/ Standalone Gemini-powered Data Structures and Algorithms tutor
```

## Requirements

- Python 3.10+
- Node.js 18+
- Optional: Ollama for local LLM responses
- Optional: Supabase project for persistent history

## Backend Setup

```powershell
cd backend
pip install fastapi uvicorn pydantic torch
```

Create `backend/.env` locally. Never commit this file:

```env
# Use Google AI Studio Gemini; OpenAI is not used
LLM_PROVIDER=gemini
GEMINI_API_KEY=your-google-ai-studio-api-key
GEMINI_MODEL=gemini-3.1-flash-lite

# Or use Ollama locally:
# LLM_PROVIDER=ollama
# OLLAMA_MODEL=llama3.2:3b
# OLLAMA_BASE_URL=http://127.0.0.1:11434

SUPABASE_URL=https://tgqjilgdnyzktppkybmu.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
SUPABASE_CHAT_TABLE=Chat_History

# Optional, server-only key for allowlisted admin history access
# SUPABASE_SECRET_KEY=your-sb_secret-key
# Legacy equivalent: SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

For Ollama:

```powershell
ollama pull llama3.2:3b
```

The backend sends conversation history and optional web context to Gemini.
The API key stays in `backend/.env` and is never sent to the frontend. OpenAI
API calls are disabled.

Run the API:

```powershell
python app.py
```

The backend runs at `http://127.0.0.1:8000`.

## Supabase Setup

Run [backend/supabase_schema.sql](backend/supabase_schema.sql) in the Supabase SQL Editor. This script creates `Chat_Sessions`, upgrades `Chat_History` with a conversation ID, migrates existing user history into one saved conversation per user, enables row-level security (RLS), and creates per-user policies. Apply the migration before using persistent signed-in history.

Authenticated requests forward the user's Supabase access token to the backend and Supabase REST API; RLS enforces ownership. Each conversation is listed separately in the left sidebar, and **New chat** starts an independent conversation while retaining previous chats. Guest/Demo conversations are stored locally in backend JSON files. The service-role key, if configured for server-side admin features, must remain on the backend. Never place it in React code, commit it, or share it publicly.

## Chat History in Supabase

The backend saves each user question and its assistant answer as separate rows
in `public."Chat_History"`, linked by `chat_id` to a saved row in
`public."Chat_Sessions"`. Chat titles use the first prompt. General Cognivex and
DSA Tutor conversations share the same per-chat history. The table definitions
and RLS migration are in [backend/supabase_schema.sql](backend/supabase_schema.sql);
run it in the Supabase SQL Editor before signed-in chat history is used.

Each signed-in user's session ID is their Supabase user ID. To view one user's
conversation in the SQL Editor, replace the value below with that ID:

```sql
select chat.title, history.role, history.content, history.provider, history.created_at
from public."Chat_History" as history
join public."Chat_Sessions" as chat on chat.id = history.chat_id
where history.user_id = 'your-supabase-user-id'
order by chat.created_at desc, history.created_at asc;
```

Guest / Demo Mode stores its history in the backend's local JSON file instead
of Supabase. Each browser gets its own guest session ID.

## Frontend Setup

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs at the Vite URL shown in the terminal, usually `http://127.0.0.1:5173`.
Choose **DSA AI Tutor** above the chat composer to send DSA questions to Gemini.
General chat also uses Gemini; keep `GEMINI_API_KEY` in `backend/.env`, never in
frontend configuration.

## DSA AI Tutor

The imported standalone tutor lives in [dsa-ai-tutor](dsa-ai-tutor/). Follow its
[setup instructions](dsa-ai-tutor/README.md) to create its virtual environment
and install dependencies. To use it in the frontend, configure `GEMINI_API_KEY`
in `backend/.env`. To run the standalone command-line version, add the key to
`dsa-ai-tutor/.env` and run it from that folder with:

```powershell
python main.py
```

## API Highlights

| Endpoint | Purpose |
| --- | --- |
| `POST /api/cognivex/prompt` | Search the web, generate an answer, and save the exchange |
| `POST /api/dsa-tutor/prompt` | Generate a Gemini DSA tutoring answer and save the exchange |
| `GET /api/chat/sessions` | List saved conversations |
| `POST /api/chat/sessions` | Start a new conversation |
| `DELETE /api/chat/sessions/{chat_id}` | Delete one conversation and its messages |
| `DELETE /api/chat/sessions` | Delete all conversations and messages for the current session |
| `GET /api/chat/history/{chat_id}` | Load one conversation |
| `DELETE /api/chat/history/{chat_id}` | Clear one conversation |
| `GET /api/domains` | List available domains |
| `POST /api/domain/custom/create` | Create a custom domain |
| `GET /api/health` | Check backend status |

## Validation

```powershell
cd frontend
npm run build
```

```powershell
cd backend
python -m compileall -q app.py cognivex_ai
```
