# COGNIVEX_AI

Cognivex is a multi-domain AI assistant with conversational chat, internet-grounded answers, local neural analysis, and persistent chat history through Supabase.

## Features

- ChatGPT-style conversational interface
- Village, college, industry, healthcare, and smart-city domains
- Live web search through DuckDuckGo
- Google Gemini integration with conversational memory and a local Cognivex fallback
- Local Cognivex model fallback when no external LLM is configured
- Chat history containing user prompts, assistant answers, web context, sources, provider, and timestamps
- Account-required AI chat with private, per-user Supabase history

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
pip install --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt
```

Create `backend/.env` locally. Never commit this file:

```env
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

Signed-in users connect the same Google account as their Cognivex email and
provide their Google Cloud Project ID in Settings. Chat uses their temporary
Google OAuth access token with Vertex AI; Cognivex does not collect or store a
Gemini API key. The user project must have billing and the Vertex AI API enabled,
and grant that Google account the Vertex AI User role.

Run the API:

```powershell
python app.py
```

The backend runs at `http://127.0.0.1:8000`.

## Supabase Setup

Run [backend/supabase_schema.sql](backend/supabase_schema.sql) in the Supabase SQL Editor. This script creates `Chat_Sessions`, upgrades `Chat_History` with a conversation ID, migrates existing user history into one saved conversation per user, enables row-level security (RLS), and creates per-user policies. Apply the migration before using persistent signed-in history.

AI chat requires a valid Supabase sign-in. Requests forward the user's access token to the backend and Supabase REST API; the backend verifies the token with Supabase Auth and RLS enforces ownership. Each conversation is listed separately in the left sidebar, and **New chat** starts an independent conversation while retaining previous chats. The service-role key, if configured for server-side admin features, must remain on the backend. Never place it in React code, commit it, or share it publicly.

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

AI chat is available to signed-in users only. Anyone can create an account
through the sign-up form; update Supabase Auth's Site URL and redirect allowlist
after deploying the frontend.

## Frontend Setup

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs at the Vite URL shown in the terminal, usually `http://127.0.0.1:5173`.
Choose **DSA AI Tutor** above the chat composer to send DSA questions to Gemini.
Before chatting, use **Settings → Connect Google account** to authorize Vertex AI
and save your Google Cloud Project ID. The OAuth token is held only in memory and
must be renewed after it expires or the app is reloaded.

## Public Deployment

The app is configured for a Vercel frontend and a Render FastAPI service. Both
services are created from the GitHub repository; Render uses [render.yaml](render.yaml).

1. In Google Cloud, create a Web OAuth client ID for Cognivex, configure its
   consent screen for `openid`, `email`, and the Cloud Platform scope, and add
   your local and deployed frontend origins as authorized JavaScript origins.
   The Cloud Platform scope may require Google verification before public use.
2. In Render, create a Blueprint from this repository's `main` branch. Choose
   the free plan and enter the `SUPABASE_PUBLISHABLE_KEY` in Render's
   environment-variable prompts. Render provides the API URL after deployment.
3. In Vercel, import this repository and set the project root to the repository
   root (`.`). The root [vercel.json](vercel.json) builds only the Vite frontend;
   `.vercelignore` excludes the Python backend from Vercel's build and dependency
   detection. Set `VITE_API_BASE_URL` to the Render API origin (without `/api`),
   `VITE_SUPABASE_URL` to the Supabase project URL, and
   `VITE_SUPABASE_PUBLISHABLE_KEY` to the project's publishable key, and
   `VITE_GOOGLE_OAUTH_CLIENT_ID` to the Web OAuth client ID. These frontend
   variables are public; never use a Supabase secret/service-role key.
4. After Vercel provides the site URL, add it to the Google OAuth client's
   authorized JavaScript origins. Set Render's `CORS_ORIGINS` to that
   origin only (for example, `https://your-app.vercel.app`) and redeploy the
   API. Update Supabase Authentication's Site URL and redirect allowlist to
   include the Vercel URL.
5. Configure custom SMTP and review Supabase Auth rate limits before promoting
   public sign-up to a large audience.

The free Render API can spin down while idle, and Supabase may pause a Free Plan
project after 7 days of low activity. The first request after a Render spin-down
may take longer; Supabase availability is managed separately from the browser.
Upgrade either service if continuous availability is required.

## DSA AI Tutor

The imported standalone tutor lives in [dsa-ai-tutor](dsa-ai-tutor/). Follow its
[setup instructions](dsa-ai-tutor/README.md) to create its virtual environment
and install dependencies. To run the standalone command-line version, add a
Gemini API key to `dsa-ai-tutor/.env` and run it from that folder with:

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
