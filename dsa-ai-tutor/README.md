# DSA AI Tutor

A command-line Data Structures and Algorithms tutor powered by the Google
Gemini API.

## Setup

From the repository root, create and activate a virtual environment and install
the tutor's dependencies:

```powershell
cd dsa-ai-tutor
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Add your Gemini API key to `dsa-ai-tutor/.env`:

```env
GEMINI_API_KEY=your-gemini-api-key
```

Keep `.env` private; it is excluded from Git.

## Run

With the virtual environment active:

```powershell
python main.py
```

The tutor prompts for a question, prints the answer, and reports token usage
when the API provides it. API and network errors are shown by the Google SDK.
