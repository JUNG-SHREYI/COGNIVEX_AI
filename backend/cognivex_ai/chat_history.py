"""Persist authenticated chat history in Supabase and guest history locally."""

import json
import os
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote
from typing import Any, Dict, List, Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

_LOCAL_FILE = Path(__file__).resolve().parent.parent / "data" / "chat_history.json"
_LOCAL_SESSIONS_FILE = Path(__file__).resolve().parent.parent / "data" / "chat_sessions.json"
_LOCK = threading.Lock()
_DEFAULT_SUPABASE_URL = "https://tgqjilgdnyzktppkybmu.supabase.co"
_LAST_SUPABASE_ERROR: Optional[str] = None


def _table_name() -> str:
    return os.getenv("SUPABASE_CHAT_TABLE", "Chat_History")


def _get_api_key() -> Optional[str]:
    """Return a backend Supabase key, preferring server-only credentials."""
    return (
        os.getenv("SUPABASE_SECRET_KEY")
        or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("SUPABASE_PUBLISHABLE_KEY")
        or os.getenv("SUPABASE_ANON_KEY")
    )


def _get_user_api_key() -> Optional[str]:
    return os.getenv("SUPABASE_PUBLISHABLE_KEY") or os.getenv("SUPABASE_ANON_KEY")


def _supabase_headers(api_key: str, access_token: Optional[str] = None) -> Dict[str, str]:
    headers = {"apikey": api_key}
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    elif api_key.startswith("eyJ"):
        headers["Authorization"] = f"Bearer {api_key}"
    return headers


def get_last_supabase_error() -> Optional[str]:
    return _LAST_SUPABASE_ERROR


def test_supabase_connection() -> dict:
    """Test connectivity to Supabase and verify Chat_History table schema."""
    global _LAST_SUPABASE_ERROR
    key = _get_api_key()
    url = os.getenv("SUPABASE_URL", _DEFAULT_SUPABASE_URL).rstrip("/")
    table = _table_name()

    if not key:
        return {
            "status": "unconfigured",
            "url": url,
            "table": table,
            "message": (
                "Configure SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY for chat history "
                "(SUPABASE_SECRET_KEY is optional for admin access)."
            ),
        }

    expected_columns = [
        "id", "user_id", "chat_id", "session_id", "role", "content",
        "sources", "web_context", "provider", "created_at",
    ]
    missing_columns = []

    # Test checking columns
    headers = {
        **_supabase_headers(key),
    }

    for col in expected_columns:
        req = Request(f"{url}/rest/v1/{table}?select={col}&limit=1", headers=headers)
        try:
            with urlopen(req, timeout=8):
                pass
        except HTTPError as err:
            if err.code == 400:
                missing_columns.append(col)
            elif err.code == 401 or err.code == 403:
                _LAST_SUPABASE_ERROR = f"Authentication error ({err.code}): check API key or RLS permissions."
                return {
                    "status": "auth_error",
                    "code": err.code,
                    "url": url,
                    "table": table,
                    "message": _LAST_SUPABASE_ERROR,
                }
            elif err.code == 404:
                _LAST_SUPABASE_ERROR = f"Table '{table}' not found in Supabase."
                return {
                    "status": "table_not_found",
                    "url": url,
                    "table": table,
                    "message": _LAST_SUPABASE_ERROR,
                }
            else:
                _LAST_SUPABASE_ERROR = f"HTTP {err.code}: {err.reason}"
                return {
                    "status": "error",
                    "code": err.code,
                    "url": url,
                    "table": table,
                    "message": _LAST_SUPABASE_ERROR,
                }
        except Exception as exc:
            _LAST_SUPABASE_ERROR = str(exc)
            return {
                "status": "network_error",
                "url": url,
                "table": table,
                "message": str(exc),
            }

    sessions_request = Request(
        f"{url}/rest/v1/Chat_Sessions?select=id&limit=1",
        headers=headers,
    )
    try:
        with urlopen(sessions_request, timeout=8):
            pass
    except HTTPError as err:
        if err.code == 404:
            missing_columns.append("Chat_Sessions table")
        elif err.code == 400:
            missing_columns.append("Chat_Sessions.id")
        elif err.code in (401, 403):
            _LAST_SUPABASE_ERROR = f"Authentication error ({err.code}): check API key or RLS permissions."
            return {
                "status": "auth_error",
                "code": err.code,
                "url": url,
                "table": "Chat_Sessions",
                "message": _LAST_SUPABASE_ERROR,
            }
        else:
            _LAST_SUPABASE_ERROR = f"HTTP {err.code}: {err.reason}"
            return {
                "status": "error",
                "code": err.code,
                "url": url,
                "table": "Chat_Sessions",
                "message": _LAST_SUPABASE_ERROR,
            }
    except Exception as exc:
        _LAST_SUPABASE_ERROR = str(exc)
        return {
            "status": "network_error",
            "url": url,
            "table": "Chat_Sessions",
            "message": str(exc),
        }

    if missing_columns:
        _LAST_SUPABASE_ERROR = f"Table '{table}' is missing columns: {', '.join(missing_columns)}. Run ALTER TABLE in Supabase SQL Editor."
        return {
            "status": "schema_incomplete",
            "url": url,
            "table": table,
            "missing_columns": missing_columns,
            "message": _LAST_SUPABASE_ERROR,
            "sql_repair": (
                Path(__file__).resolve().parent.parent / "supabase_schema.sql"
            ).read_text(encoding="utf-8")
        }

    _LAST_SUPABASE_ERROR = None
    return {
        "status": "connected",
        "url": url,
        "table": table,
        "message": f"Successfully connected to Supabase table '{table}' with all required columns.",
    }


def _supabase_request(
    method: str,
    path: str,
    payload: Optional[Any] = None,
    access_token: Optional[str] = None,
) -> Any:
    global _LAST_SUPABASE_ERROR
    base_url = os.getenv("SUPABASE_URL", _DEFAULT_SUPABASE_URL).rstrip("/")
    key = _get_user_api_key() if access_token else _get_api_key()
    if not key:
        if access_token:
            raise RuntimeError(
                "A SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY is required for authenticated history"
            )
        raise RuntimeError("No Supabase API key configured")
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {
        **_supabase_headers(key, access_token),
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    request = Request(
        f"{base_url}/rest/v1/{path}",
        data=body,
        headers=headers,
        method=method,
    )
    try:
        with urlopen(request, timeout=10) as response:
            raw = response.read().decode("utf-8")
            _LAST_SUPABASE_ERROR = None
            return json.loads(raw) if raw else []
    except HTTPError as err:
        detail = err.read().decode("utf-8", errors="replace")
        _LAST_SUPABASE_ERROR = detail
        raise RuntimeError(f"Supabase REST {err.code}: {detail}") from err
    except (URLError, TimeoutError, OSError) as err:
        _LAST_SUPABASE_ERROR = str(err)
        raise RuntimeError(f"Unable to reach Supabase REST: {err}") from err
    except (UnicodeDecodeError, json.JSONDecodeError) as err:
        _LAST_SUPABASE_ERROR = str(err)
        raise RuntimeError(f"Invalid response from Supabase REST: {err}") from err


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


def _read_local_sessions() -> List[Dict[str, Any]]:
    if not _LOCAL_SESSIONS_FILE.exists():
        return []
    try:
        return json.loads(_LOCAL_SESSIONS_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        raise RuntimeError(f"Unable to read local chat sessions: {error}") from error


def _write_local_sessions(sessions: List[Dict[str, Any]]) -> None:
    _LOCAL_SESSIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
    _LOCAL_SESSIONS_FILE.write_text(
        json.dumps(sessions, ensure_ascii=True, indent=2),
        encoding="utf-8",
    )


def _migrate_local_history(session_id: str) -> List[Dict[str, Any]]:
    records = _read_local()
    sessions = _read_local_sessions()
    legacy_records = [
        row for row in records
        if row.get("session_id") == session_id and not row.get("chat_id")
    ]
    if legacy_records:
        chat_id = str(uuid.uuid4())
        first_prompt = next(
            (row.get("content", "") for row in legacy_records if row.get("role") == "user"),
            "",
        )
        created_at = legacy_records[0].get("created_at") or datetime.now(timezone.utc).isoformat()
        sessions.append({
            "id": chat_id,
            "session_id": session_id,
            "title": (first_prompt or "Previous chat")[:80],
            "created_at": created_at,
            "updated_at": legacy_records[-1].get("created_at") or created_at,
        })
        for row in legacy_records:
            row["chat_id"] = chat_id
        _write_local(records)
        _write_local_sessions(sessions)
    return sessions


def create_chat(session_id: str, access_token: Optional[str] = None) -> Dict[str, Any]:
    """Create an empty conversation for a signed-in user or local guest."""
    if access_token:
        rows = _supabase_request(
            "POST",
            "Chat_Sessions",
            {"session_id": session_id, "user_id": session_id, "title": "New chat"},
            access_token=access_token,
        )
        if not rows:
            raise RuntimeError("Supabase did not return the newly created chat")
        return rows[0]

    now = datetime.now(timezone.utc).isoformat()
    chat = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "title": "New chat",
        "created_at": now,
        "updated_at": now,
    }
    with _LOCK:
        sessions = _migrate_local_history(session_id)
        sessions.insert(0, chat)
        _write_local_sessions(sessions)
    return chat


def get_chat_sessions(session_id: str, access_token: Optional[str] = None) -> List[Dict[str, Any]]:
    """List a user's conversations newest first."""
    if access_token:
        query = (
            "select=id,title,created_at,updated_at"
            f"&session_id=eq.{quote(session_id, safe='')}"
            "&order=updated_at.desc"
        )
        return _supabase_request(
            "GET",
            f"Chat_Sessions?{query}",
            access_token=access_token,
        )

    with _LOCK:
        sessions = _migrate_local_history(session_id)
        return sorted(
            (chat for chat in sessions if chat.get("session_id") == session_id),
            key=lambda chat: chat.get("updated_at", ""),
            reverse=True,
        )


def _touch_chat(
    session_id: str,
    chat_id: str,
    access_token: Optional[str],
    title: Optional[str] = None,
) -> None:
    now = datetime.now(timezone.utc).isoformat()
    payload: Dict[str, Any] = {"updated_at": now}
    if title:
        payload["title"] = title.strip()[:80] or "New chat"
    if access_token:
        query = (
            f"id=eq.{quote(chat_id, safe='')}"
            f"&session_id=eq.{quote(session_id, safe='')}"
        )
        _supabase_request(
            "PATCH",
            f"Chat_Sessions?{query}",
            payload,
            access_token=access_token,
        )
        return

    sessions = _read_local_sessions()
    for chat in sessions:
        if chat.get("id") == chat_id and chat.get("session_id") == session_id:
            chat.update(payload)
            break
    _write_local_sessions(sessions)


def delete_chat(
    session_id: str,
    chat_id: str,
    access_token: Optional[str] = None,
) -> None:
    """Delete one conversation and its messages."""
    if access_token:
        _supabase_request(
            "DELETE",
            f"{_table_name()}?session_id=eq.{quote(session_id, safe='')}"
            f"&chat_id=eq.{quote(chat_id, safe='')}",
            access_token=access_token,
        )
        _supabase_request(
            "DELETE",
            f"Chat_Sessions?id=eq.{quote(chat_id, safe='')}"
            f"&session_id=eq.{quote(session_id, safe='')}",
            access_token=access_token,
        )
        return

    with _LOCK:
        _write_local([
            row for row in _read_local()
            if not (row.get("session_id") == session_id and row.get("chat_id") == chat_id)
        ])
        _write_local_sessions([
            chat for chat in _read_local_sessions()
            if not (chat.get("session_id") == session_id and chat.get("id") == chat_id)
        ])


def delete_all_chats(session_id: str, access_token: Optional[str] = None) -> None:
    """Delete every conversation and message belonging to one user or guest session."""
    if access_token:
        _supabase_request(
            "DELETE",
            f"{_table_name()}?session_id=eq.{quote(session_id, safe='')}",
            access_token=access_token,
        )
        _supabase_request(
            "DELETE",
            f"Chat_Sessions?session_id=eq.{quote(session_id, safe='')}",
            access_token=access_token,
        )
        return

    with _LOCK:
        _write_local([
            row for row in _read_local()
            if row.get("session_id") != session_id
        ])
        _write_local_sessions([
            chat for chat in _read_local_sessions()
            if chat.get("session_id") != session_id
        ])


def save_exchange(
    session_id: str,
    user_prompt: str,
    assistant_response: str,
    sources: List[Dict[str, str]],
    web_context: str,
    provider: str,
    access_token: Optional[str] = None,
    chat_id: Optional[str] = None,
    title: Optional[str] = None,
) -> None:
    """Persist authenticated exchanges in Supabase and guest exchanges locally."""
    timestamp = datetime.now(timezone.utc).isoformat()
    user_id = session_id if access_token else None
    records = [
        {
            "id": str(uuid.uuid4()),
            "chat_id": chat_id,
            "user_id": user_id,
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
            "chat_id": chat_id,
            "user_id": user_id,
            "session_id": session_id,
            "role": "assistant",
            "content": assistant_response,
            "sources": json.dumps(sources),
            "web_context": web_context,
            "provider": provider,
            "created_at": timestamp,
        },
    ]

    if access_token:
        rest_records = [
            {key: value for key, value in record.items() if key != "id"}
            for record in records
        ]
        _supabase_request(
            "POST",
            _table_name(),
            rest_records,
            access_token=access_token,
        )
        if chat_id:
            _touch_chat(session_id, chat_id, access_token, title)
        return

    with _LOCK:
        existing = _read_local()
        existing.extend(records)
        _write_local(existing[-2000:])
        if chat_id:
            _touch_chat(session_id, chat_id, None, title)


def get_history(
    session_id: str,
    limit: int = 100,
    access_token: Optional[str] = None,
    chat_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Return a user's Supabase history or a guest's local history."""
    if access_token:
        query = (
            f"session_id=eq.{quote(session_id, safe='')}"
            + (f"&chat_id=eq.{quote(chat_id, safe='')}" if chat_id else "")
            + f"&order=created_at.asc&limit={limit}"
        )
        rows = _supabase_request(
            "GET",
            f"{_table_name()}?{query}",
            access_token=access_token,
        )
        for row in rows:
            if isinstance(row.get("sources"), str):
                try:
                    row["sources"] = json.loads(row["sources"])
                except (ValueError, TypeError):
                    row["sources"] = []
        return rows

    with _LOCK:
        records = _read_local()
        if chat_id:
            return [
                row for row in records
                if row.get("session_id") == session_id and row.get("chat_id") == chat_id
            ][-limit:]
        return [row for row in records if row.get("session_id") == session_id][-limit:]


def clear_history(
    session_id: str,
    access_token: Optional[str] = None,
    chat_id: Optional[str] = None,
) -> None:
    """Delete a user's Supabase history or a guest's local history."""
    if access_token:
        query = f"session_id=eq.{quote(session_id, safe='')}"
        if chat_id:
            query += f"&chat_id=eq.{quote(chat_id, safe='')}"
        _supabase_request("DELETE", f"{_table_name()}?{query}", access_token=access_token)
        if chat_id:
            _touch_chat(session_id, chat_id, access_token, "New chat")
        return

    with _LOCK:
        _write_local([
            row for row in _read_local()
            if not (
                row.get("session_id") == session_id
                and (chat_id is None or row.get("chat_id") == chat_id)
            )
        ])
        if chat_id:
            _touch_chat(session_id, chat_id, None, "New chat")
