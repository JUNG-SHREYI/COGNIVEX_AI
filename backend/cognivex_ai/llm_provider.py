"""Provider-backed language generation with a local Cognivex fallback."""

import json
import os
from typing import Dict, List, Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


SYSTEM_PROMPT = (
    "You are Cognivex, a capable conversational AI assistant powered by an OpenAI "
    "language model and a local domain intelligence engine. Answer naturally, "
    "accurately, and directly. Maintain continuity with the conversation. Use the "
    "supplied domain, scenario, and web context when relevant. Do not invent "
    "measurements, actions, sources, or facts. When information is missing, say "
    "what is needed. For operational, healthcare, infrastructure, or safety "
    "questions, clearly separate observed facts, likely explanations, and suggested "
    "next steps."
)


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


def _ollama_is_available(base_url: str) -> bool:
    try:
        with urlopen(f"{base_url.rstrip('/')}/api/tags", timeout=1.5):
            return True
    except (HTTPError, URLError, TimeoutError, OSError):
        return False


def test_openai_connection(api_key: Optional[str] = None, model: Optional[str] = None) -> dict:
    """Test connection to OpenAI and return a structured diagnostic report."""
    key = (api_key or _get_openai_key()).strip()
    if not key:
        return {
            "status": "missing_key",
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


def generate_with_provider_detailed(
    prompt: str,
    max_tokens: int = 120,
    web_context: str = "",
    conversation: Optional[List[Dict[str, str]]] = None,
) -> dict:
    """Return provider generation result with diagnostics."""
    provider = os.getenv("LLM_PROVIDER", "auto").strip().lower()
    if provider in {"", "local", "none"}:
        return {"content": None, "provider": "local", "status": "disabled", "error": None}

    openai_model = os.getenv("LLM_MODEL", "gpt-4o-mini").strip()
    ollama_model = os.getenv("OLLAMA_MODEL", "llama3.2:3b").strip()
    ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
    if provider == "auto":
        if _get_openai_key() and openai_model:
            provider = "openai"
            model = openai_model
        elif _ollama_is_available(ollama_base_url):
            provider = "ollama"
            model = ollama_model
        else:
            return {"content": None, "provider": "auto", "status": "no_external_provider", "error": "No configured external AI provider is available"}
    else:
        model = openai_model if provider == "openai" else (ollama_model if provider == "ollama" else os.getenv("LLM_MODEL", "").strip())
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

    elif provider == "openai":
        base_url = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1").rstrip("/")
        api_key = _get_openai_key()
        if not api_key:
            return {
                "content": None,
                "provider": "openai",
                "model": model,
                "status": "missing_key",
                "error": "OpenAI API key not configured. Set LLM_API_KEY or OPENAI_API_KEY in backend/.env."
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
                return {"content": content.strip(), "provider": "openai", "model": model, "status": "ok", "error": None}
        except HTTPError as err:
            try:
                err_body = json.loads(err.read().decode("utf-8"))
                err_msg = err_body.get("error", {}).get("message", str(err))
            except Exception:
                err_msg = str(err)

            is_quota = err.code == 429
            return {
                "content": None,
                "provider": "openai",
                "model": model,
                "status": "quota_exhausted" if is_quota else f"http_{err.code}",
                "error": err_msg,
                "usage_url": "https://platform.openai.com/usage"
            }
        except Exception as exc:
            return {
                "content": None,
                "provider": "openai",
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

