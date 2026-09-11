"""Persistent chat history using Supabase REST with a local development fallback.

Supports both:
 - SUPABASE_SERVICE_ROLE_KEY (server-side, full access)
 - SUPABASE_ANON_KEY (public anon key from Supabase Dashboard → Settings → API)

The anon key is sufficient when Row-Level Security is disabled on Chat_History.
Priority: service role > anon key > local JSON file.
"""

import json
import os
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


_LOCAL_FILE = Path(__file__).resolve().parent.parent / "data" / "chat_history.json"
_LOCK = threading.Lock()
_DEFAULT_SUPABASE_URL = "https://tgqjilgdnyzktppkybmu.supabase.co"


def _table_name() -> str:
    return os.getenv("SUPABASE_CHAT_TABLE", "Chat_History")


def _get_api_key() -> Optional[str]:
    """Return whichever Supabase key is configured (service role preferred)."""
    return (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("SUPABASE_ANON_KEY")
    )


def _supabase_configured() -> bool:
    return bool(_get_api_key())


def _supabase_request(method: str, path: str, payload: Optional[Any] = None) -> Any:
    base_url = os.getenv("SUPABASE_URL", _DEFAULT_SUPABASE_URL).rstrip("/")
    key = _get_api_key()
    if not key:
        raise RuntimeError("No Supabase API key configured")
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    request = Request(
        f"{base_url}/rest/v1/{path}",
        data=body,
        headers=headers,
        method=method,
    )
    with urlopen(request, timeout=10) as response:
        raw = response.read().decode("utf-8")
        return json.loads(raw) if raw else []


def _read_local() -> List[Dict[str, Any]]:
    if not _LOCAL_FILE.exists():
        return []
    try:
        return json.loads(_LOCAL_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []


def _write_local(records: List[Dict[str, Any]]) -> None:
    _LOCAL_FILE.parent.mkdir(parents=True, exist_ok=True)
    _LOCAL_FILE.write_text(json.dumps(records, ensure_ascii=True, indent=2), encoding="utf-8")


def save_exchange(
    session_id: str,
    user_prompt: str,
    assistant_response: str,
    sources: List[Dict[str, str]],
    web_context: str,
    provider: str,
) -> None:
    """Persist one complete prompt/answer exchange and its web evidence."""
    timestamp = datetime.now(timezone.utc).isoformat()
    records = [
        {
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "role": "user",
            "content": user_prompt,
            "sources": json.dumps([]),
            "web_context": "",
            "provider": provider,
            "created_at": timestamp,
        },
        {
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "role": "assistant",
            "content": assistant_response,
            "sources": json.dumps(sources),
            "web_context": web_context,
            "provider": provider,
            "created_at": timestamp,
        },
    ]

    try:
        if _supabase_configured():
            _supabase_request("POST", _table_name(), records)
            return
    except (HTTPError, URLError, TimeoutError, OSError, ValueError, RuntimeError) as err:
        print(f"[Cognivex] Supabase write failed, using local fallback: {err}")

    with _LOCK:
        existing = _read_local()
        existing.extend(records)
        _write_local(existing[-2000:])


def get_history(session_id: str, limit: int = 100) -> List[Dict[str, Any]]:
    """Return messages in chronological order for one chat session."""
    try:
        if _supabase_configured():
            query = f"session_id=eq.{session_id}&order=created_at.asc&limit={limit}"
            rows = _supabase_request("GET", f"{_table_name()}?{query}")
            # Deserialize sources JSON string if needed
            for row in rows:
                if isinstance(row.get("sources"), str):
                    try:
                        row["sources"] = json.loads(row["sources"])
                    except (ValueError, TypeError):
                        row["sources"] = []
            return rows
    except (HTTPError, URLError, TimeoutError, OSError, ValueError, RuntimeError) as err:
        print(f"[Cognivex] Supabase read failed, using local fallback: {err}")

    with _LOCK:
        return [r for r in _read_local() if r.get("session_id") == session_id][-limit:]


def clear_history(session_id: str) -> None:
    """Delete one session from Supabase or the local fallback."""
    try:
        if _supabase_configured():
            _supabase_request("DELETE", f"{_table_name()}?session_id=eq.{session_id}")
            return
    except (HTTPError, URLError, TimeoutError, OSError, ValueError, RuntimeError) as err:
        print(f"[Cognivex] Supabase delete failed, using local fallback: {err}")

    with _LOCK:
        _write_local([r for r in _read_local() if r.get("session_id") != session_id])
