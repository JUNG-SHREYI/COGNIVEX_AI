"""Provider-backed language generation with a local Cognivex fallback."""

import json
import os
from typing import Dict, List, Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


SYSTEM_PROMPT = (
    "You are Cognivex, a capable conversational AI assistant powered by Gemini "
    "language model and a local domain intelligence engine. Answer naturally, "
    "accurately, and directly. Maintain continuity with the conversation. Use the "
    "supplied domain, scenario, and web context when relevant. Do not invent "
    "measurements, actions, sources, or facts. When information is missing, say "
    "what is needed. For operational, healthcare, infrastructure, or safety "
    "questions, clearly separate observed facts, likely explanations, and suggested "
    "next steps."
)

GEMINI_CHAT_MODELS = {
    "gemini-4-argon": "Gemini 4 Argon - Flagship",
    "gemini-3.8-flash": "Gemini 3.8 Flash",
    "gemini-3.6-flash": "Gemini 3.6 Flash",
    "gemini-3.5-flash-lite": "Gemini 3.5 Flash-Lite",
    "gemini-3.1-flash-lite": "Gemini 3.1 Flash-Lite",
}


def _post_json(url: str, payload: dict, headers: dict, timeout: float) -> dict:
    request = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", **headers},
        method="POST",
    )
    with urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def _get_openai_key() -> str:
    return (os.getenv("LLM_API_KEY", "") or os.getenv("OPENAI_API_KEY", "")).strip()


def _get_gemini_key() -> str:
    return os.getenv("GEMINI_API_KEY", "").strip()


def _get_groq_key() -> str:
    return os.getenv("GROQ_API_KEY", "").strip()


def _ollama_is_available(base_url: str) -> bool:
    try:
        with urlopen(f"{base_url.rstrip('/')}/api/tags", timeout=1.5):
            return True
    except (HTTPError, URLError, TimeoutError, OSError):
        return False


def test_gemini_connection(api_key: Optional[str] = None, model: Optional[str] = None) -> dict:
    """Test the configured Gemini API key and model."""
    key = (api_key or _get_gemini_key()).strip()
    if not key:
        return {
            "status": "missing_key",
            "provider": "gemini",
            "message": "No Gemini API key found in environment (GEMINI_API_KEY).",
            "usage_url": "https://aistudio.google.com/apikey",
        }

    target_model = model or os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite").strip()
    try:
        result = _post_json(
            f"https://generativelanguage.googleapis.com/v1beta/models/{target_model}:generateContent",
            {
                "contents": [{"role": "user", "parts": [{"text": "ping"}]}],
                "generationConfig": {"maxOutputTokens": 1},
            },
            {"x-goog-api-key": key},
            10,
        )
        if not result.get("candidates"):
            return {
                "status": "error",
                "provider": "gemini",
                "model": target_model,
                "message": "Gemini returned no candidate response.",
                "usage_url": "https://aistudio.google.com/apikey",
            }
        return {
            "status": "online",
            "provider": "gemini",
            "model": target_model,
            "message": f"Successfully connected to Gemini ({target_model}).",
            "usage_url": "https://aistudio.google.com/apikey",
        }
    except HTTPError as err:
        try:
            error_body = json.loads(err.read().decode("utf-8"))
            message = error_body.get("error", {}).get("message", str(err))
        except (UnicodeDecodeError, json.JSONDecodeError):
            message = str(err)
        return {
            "status": "invalid_key" if err.code in (401, 403) else "quota_exhausted" if err.code == 429 else f"http_{err.code}",
            "provider": "gemini",
            "code": err.code,
            "message": message,
            "usage_url": "https://aistudio.google.com/apikey",
        }
    except (URLError, TimeoutError, OSError, ValueError) as exc:
        return {
            "status": "network_error",
            "provider": "gemini",
            "model": target_model,
            "message": str(exc),
            "usage_url": "https://aistudio.google.com/apikey",
        }


def test_groq_connection(api_key: Optional[str] = None, model: Optional[str] = None) -> dict:
    """Test connection to Groq and return a structured diagnostic report."""
    key = (api_key or _get_groq_key()).strip()
    if not key:
        return {
            "status": "missing_key",
            "provider": "groq",
            "message": "No Groq API key found in environment (GROQ_API_KEY).",
            "usage_url": "https://console.groq.com/keys"
        }

    target_model = model or os.getenv("GROQ_MODEL", os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")).strip()
    base_url = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/")
    payload = {
        "model": target_model,
        "messages": [{"role": "user", "content": "ping"}],
        "max_tokens": 2,
    }

    try:
        req = Request(
            f"{base_url}/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
            method="POST",
        )
        with urlopen(req, timeout=10) as response:
            json.loads(response.read().decode("utf-8"))
            return {
                "status": "online",
                "provider": "groq",
                "model": target_model,
                "message": f"Successfully connected to Groq ({target_model}).",
                "usage_url": "https://console.groq.com/keys"
            }
    except HTTPError as err:
        try:
            err_body = json.loads(err.read().decode("utf-8"))
            err_msg = err_body.get("error", {}).get("message", str(err))
            err_code = err_body.get("error", {}).get("code", "")
        except Exception:
            err_msg = str(err)
            err_code = ""

        if err.code == 401:
            return {
                "status": "invalid_key",
                "provider": "groq",
                "code": 401,
                "message": "Invalid Groq API key. Check your key in the Groq dashboard.",
                "usage_url": "https://console.groq.com/keys"
            }
        if err.code == 429:
            return {
                "status": "quota_exhausted",
                "provider": "groq",
                "code": 429,
                "error_code": err_code,
                "message": err_msg or "Groq quota reached. Check your usage limits.",
                "usage_url": "https://console.groq.com/keys"
            }
        return {
            "status": "error",
            "provider": "groq",
            "code": err.code,
            "message": err_msg,
            "usage_url": "https://console.groq.com/keys"
        }
    except Exception as exc:
        return {
            "status": "network_error",
            "provider": "groq",
            "message": str(exc),
            "usage_url": "https://console.groq.com/keys"
        }


def test_openai_connection(api_key: Optional[str] = None, model: Optional[str] = None) -> dict:
    """Test connection to OpenAI and return a structured diagnostic report."""
    key = (api_key or _get_openai_key()).strip()
    if not key:
        return {
            "status": "missing_key",
            "provider": "openai",
            "message": "No OpenAI API key found in environment (LLM_API_KEY or OPENAI_API_KEY).",
            "usage_url": "https://platform.openai.com/usage",
            "billing_url": "https://platform.openai.com/settings/organization/billing"
        }

    target_model = model or os.getenv("LLM_MODEL", "gpt-4o-mini").strip()
    base_url = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    payload = {
        "model": target_model,
        "messages": [{"role": "user", "content": "ping"}],
        "max_tokens": 2,
    }

    try:
        req = Request(
            f"{base_url}/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
            method="POST",
        )
        with urlopen(req, timeout=10) as response:
            body = json.loads(response.read().decode("utf-8"))
            return {
                "status": "online",
                "model": target_model,
                "message": f"Successfully connected to OpenAI ({target_model}).",
                "usage_url": "https://platform.openai.com/usage"
            }
    except HTTPError as err:
        try:
            err_body = json.loads(err.read().decode("utf-8"))
            err_msg = err_body.get("error", {}).get("message", str(err))
            err_code = err_body.get("error", {}).get("code", "")
        except Exception:
            err_msg = str(err)
            err_code = ""

        if err.code == 429:
            return {
                "status": "quota_exhausted",
                "code": 429,
                "error_code": err_code,
                "message": err_msg or "You have no credits remaining. Please check your usage and billing.",
                "usage_url": "https://platform.openai.com/usage",
                "billing_url": "https://platform.openai.com/settings/organization/billing"
            }
        elif err.code == 401:
            return {
                "status": "invalid_key",
                "code": 401,
                "message": "Invalid OpenAI API key. Check your key at platform.openai.com/api-keys.",
                "usage_url": "https://platform.openai.com/api-keys"
            }
        return {
            "status": "error",
            "code": err.code,
            "message": err_msg,
            "usage_url": "https://platform.openai.com/usage"
        }
    except Exception as exc:
        return {
            "status": "network_error",
            "message": str(exc),
            "usage_url": "https://platform.openai.com/usage"
        }


def test_llm_connection() -> dict:
    """Return the active provider health status based on the configured LLM mode."""
    provider = os.getenv("LLM_PROVIDER", "auto").strip().lower()
    if provider == "gemini":
        return test_gemini_connection()
    if provider == "groq":
        return test_groq_connection()
    if provider == "openai":
        return {
            "status": "disabled",
            "provider": "gemini",
            "message": "OpenAI is disabled. Configure Gemini with GEMINI_API_KEY.",
        }
    if provider == "ollama":
        base_url = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
        try:
            with urlopen(f"{base_url}/api/tags", timeout=3):
                return {"status": "online", "provider": "ollama", "model": os.getenv("OLLAMA_MODEL", "llama3.2:3b"), "message": "Ollama is available."}
        except Exception as exc:
            return {"status": "offline", "provider": "ollama", "message": str(exc)}
    if provider in {"local", "none", ""}:
        return {"status": "disabled", "provider": "local", "message": "Local Cognivex mode is active."}

    if _get_gemini_key():
        return test_gemini_connection()
    if _get_groq_key():
        return test_groq_connection()
    return {"status": "disabled", "provider": "local", "message": "No external LLM provider configured."}


def generate_with_provider_detailed(
    prompt: str,
    max_tokens: int = 120,
    web_context: str = "",
    conversation: Optional[List[Dict[str, str]]] = None,
    gemini_model: Optional[str] = None,
) -> dict:
    """Return provider generation result with diagnostics."""
    provider = os.getenv("LLM_PROVIDER", "auto").strip().lower()
    if gemini_model and gemini_model not in GEMINI_CHAT_MODELS:
        return {
            "content": None,
            "provider": "gemini",
            "model": gemini_model,
            "status": "invalid_model",
            "error": "The selected Gemini model is not supported.",
        }
    if gemini_model:
        provider = "gemini"
    elif provider in {"", "local", "none"}:
        return {"content": None, "provider": "local", "status": "disabled", "error": None}
    elif provider == "openai":
        return {
            "content": None,
            "provider": "gemini",
            "status": "disabled",
            "error": "OpenAI is disabled. Configure Gemini with GEMINI_API_KEY.",
        }

    configured_gemini_model = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite").strip()
    groq_model = os.getenv("GROQ_MODEL", os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")).strip()
    ollama_model = os.getenv("OLLAMA_MODEL", "llama3.2:3b").strip()
    ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
    if provider == "auto":
        if _get_gemini_key() and configured_gemini_model:
            provider = "gemini"
            model = configured_gemini_model
        elif _get_groq_key() and groq_model:
            provider = "groq"
            model = groq_model
        elif _ollama_is_available(ollama_base_url):
            provider = "ollama"
            model = ollama_model
        else:
            return {"content": None, "provider": "auto", "status": "no_external_provider", "error": "No configured external AI provider is available"}
    else:
        if provider == "groq":
            model = groq_model or os.getenv("LLM_MODEL", "").strip()
        elif provider == "gemini":
            model = gemini_model or configured_gemini_model
        elif provider == "ollama":
            model = ollama_model
        else:
            model = os.getenv("LLM_MODEL", "").strip()
        if not model:
            return {"content": None, "provider": provider, "status": "no_model", "error": "LLM model is not configured"}

    timeout = float(os.getenv("LLM_TIMEOUT_SECONDS", "45"))
    user_message = prompt
    if web_context:
        user_message = f"{prompt}\n\nWEB SEARCH CONTEXT:\n{web_context}"

    messages: List[Dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for message in conversation or []:
        role = message.get("role")
        content = message.get("content")
        if role in {"user", "assistant"} and isinstance(content, str) and content.strip():
            messages.append({"role": role, "content": content[-12000:]})
    messages.append({"role": "user", "content": user_message})

    if provider == "gemini":
        api_key = _get_gemini_key()
        if not api_key:
            return {
                "content": None,
                "provider": "gemini",
                "model": model,
                "status": "missing_key",
                "error": "Gemini API key not configured. Set GEMINI_API_KEY in backend/.env.",
                "usage_url": "https://aistudio.google.com/apikey",
            }

        contents = [
            {
                "role": "model" if message["role"] == "assistant" else "user",
                "parts": [{"text": message["content"]}],
            }
            for message in messages[1:]
        ]
        payload = {
            "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "contents": contents,
            "generationConfig": {
                "maxOutputTokens": max_tokens,
                "temperature": 0.2,
            },
        }
        try:
            result = _post_json(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                payload,
                {"x-goog-api-key": api_key},
                timeout,
            )
            candidates = result.get("candidates") or []
            parts = candidates[0].get("content", {}).get("parts", []) if candidates else []
            content = "\n".join(part["text"] for part in parts if part.get("text")).strip()
            if content:
                return {
                    "content": content,
                    "provider": "gemini",
                    "model": model,
                    "status": "ok",
                    "error": None,
                    "usage_metadata": result.get("usageMetadata"),
                }
            return {
                "content": None,
                "provider": "gemini",
                "model": model,
                "status": "empty_response",
                "error": "Gemini returned no response text.",
                "usage_url": "https://aistudio.google.com/apikey",
            }
        except HTTPError as err:
            try:
                error_body = json.loads(err.read().decode("utf-8"))
                error_message = error_body.get("error", {}).get("message", str(err))
            except (UnicodeDecodeError, json.JSONDecodeError):
                error_message = str(err)
            return {
                "content": None,
                "provider": "gemini",
                "model": model,
                "status": "invalid_key" if err.code in (401, 403) else "quota_exhausted" if err.code == 429 else f"http_{err.code}",
                "error": error_message,
                "usage_url": "https://aistudio.google.com/apikey",
            }
        except (URLError, TimeoutError, OSError, ValueError) as exc:
            return {
                "content": None,
                "provider": "gemini",
                "model": model,
                "status": "network_error",
                "error": str(exc),
                "usage_url": "https://aistudio.google.com/apikey",
            }

    if provider == "ollama":
        payload = {
            "model": model,
            "messages": messages,
            "stream": False,
            "options": {"num_predict": max_tokens},
        }
        try:
            result = _post_json(f"{ollama_base_url}/api/chat", payload, {}, timeout)
            content = result.get("message", {}).get("content")
            if isinstance(content, str) and content.strip():
                return {"content": content.strip(), "provider": "ollama", "model": model, "status": "ok", "error": None}
        except Exception as exc:
            return {"content": None, "provider": "ollama", "model": model, "status": "error", "error": str(exc)}

    elif provider == "groq":
        base_url = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/")
        api_key = _get_groq_key()
        if not api_key:
            return {
                "content": None,
                "provider": provider,
                "model": model,
                "status": "missing_key",
                "error": "Groq API key not configured. Set GROQ_API_KEY in backend/.env."
            }
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": 0.2,
        }

        try:
            result = _post_json(
                f"{base_url}/chat/completions",
                payload,
                {"Authorization": f"Bearer {api_key}"},
                timeout,
            )
            content = result.get("choices", [{}])[0].get("message", {}).get("content")
            if isinstance(content, str) and content.strip():
                return {"content": content.strip(), "provider": provider, "model": model, "status": "ok", "error": None}
        except HTTPError as err:
            try:
                err_body = json.loads(err.read().decode("utf-8"))
                err_msg = err_body.get("error", {}).get("message", str(err))
            except Exception:
                err_msg = str(err)

            is_quota = err.code == 429
            return {
                "content": None,
                "provider": provider,
                "model": model,
                "status": "quota_exhausted" if is_quota else f"http_{err.code}",
                "error": err_msg,
                "usage_url": "https://console.groq.com/keys"
            }
        except Exception as exc:
            return {
                "content": None,
                "provider": provider,
                "model": model,
                "status": "network_error",
                "error": str(exc)
            }

    return {"content": None, "provider": provider, "model": model, "status": "unsupported", "error": f"Unsupported provider {provider}"}


def generate_with_provider(
    prompt: str,
    max_tokens: int = 120,
    web_context: str = "",
    conversation: Optional[List[Dict[str, str]]] = None,
) -> Optional[str]:
    """Return provider-generated text, or None when local fallback should be used."""
    result = generate_with_provider_detailed(
        prompt,
        max_tokens=max_tokens,
        web_context=web_context,
        conversation=conversation,
    )
    return result.get("content")
