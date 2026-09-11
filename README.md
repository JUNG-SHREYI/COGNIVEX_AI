# COGNIVEX_AI

Cognivex is a multi-domain AI assistant with conversational chat, internet-grounded answers, local neural analysis, and persistent chat history through Supabase.

## Features

- ChatGPT-style conversational interface
- Village, college, industry, healthcare, and smart-city domains
- Live web search through DuckDuckGo
- Ollama or OpenAI-compatible LLM integration
- Local Cognivex model fallback when no external LLM is configured
- Chat history containing user prompts, assistant answers, web context, sources, provider, and timestamps
- Supabase REST persistence with a local JSON fallback for development

## Project Structure

```text
backend/     FastAPI API, AI engine, web search, and Supabase persistence
frontend/    React and Vite chat application
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
LLM_PROVIDER=ollama
LLM_MODEL=llama3.2:3b
OLLAMA_BASE_URL=http://127.0.0.1:11434

SUPABASE_URL=https://tgqjilgdnyzktppkybmu.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_CHAT_TABLE=Chat_History
```

For Ollama:

```powershell
ollama pull llama3.2:3b
```

Run the API:

```powershell
python app.py
```

The backend runs at `http://127.0.0.1:8000`.

## Supabase Setup

Run [backend/supabase_schema.sql](backend/supabase_schema.sql) in the Supabase SQL Editor. The backend writes to the `Chat_History` table through the REST API.

The service-role key must remain on the backend. Do not place it in React code, commit it, or share it publicly.

## Frontend Setup

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs at the Vite URL shown in the terminal, usually `http://127.0.0.1:5173`.

## API Highlights

| Endpoint | Purpose |
| --- | --- |
| `POST /api/cognivex/prompt` | Search the web, generate an answer, and save the exchange |
| `GET /api/chat/history/{session_id}` | Load conversation history |
| `DELETE /api/chat/history/{session_id}` | Clear one conversation |
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
