"""Provider-backed language generation with a local Cognivex fallback."""

import json
import os
from typing import Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


SYSTEM_PROMPT = (
    "You are Cognivex, a practical AI assistant for multi-domain operations. "
    "Answer the user's question directly and clearly. Use the supplied domain or "
    "scenario context when relevant. Do not invent measurements, actions, or facts. "
    "If information is missing, say what is needed."
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


def generate_with_provider(
    prompt: str,
    max_tokens: int = 120,
    web_context: str = "",
) -> Optional[str]:
    """Return provider-generated text, or None when local fallback should be used.

    Supported providers:
    - openai: any OpenAI-compatible /v1/chat/completions endpoint
    - ollama: a local Ollama server using /api/chat

    Configuration is read from environment variables so API keys never enter the
    request body from the browser.
    """
    provider = os.getenv("LLM_PROVIDER", "local").strip().lower()
    if provider in {"", "local", "none"}:
        return None

    model = os.getenv("LLM_MODEL", "").strip()
    if not model:
        return None

    timeout = float(os.getenv("LLM_TIMEOUT_SECONDS", "45"))
    user_message = prompt
    if web_context:
        user_message = f"{prompt}\n\nWEB SEARCH CONTEXT:\n{web_context}"

    try:
        if provider == "ollama":
            base_url = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                "stream": False,
                "options": {"num_predict": max_tokens},
            }
            result = _post_json(f"{base_url}/api/chat", payload, {}, timeout)
            content = result.get("message", {}).get("content")
        elif provider == "openai":
            base_url = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1").rstrip("/")
            api_key = os.getenv("LLM_API_KEY", "").strip()
            if not api_key:
                return None
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                "max_tokens": max_tokens,
                "temperature": 0.2,
            }
            result = _post_json(
                f"{base_url}/chat/completions",
                payload,
                {"Authorization": f"Bearer {api_key}"},
                timeout,
            )
            content = result.get("choices", [{}])[0].get("message", {}).get("content")
        else:
            return None

        if isinstance(content, str) and content.strip():
            return content.strip()
    except (HTTPError, URLError, TimeoutError, ValueError, KeyError, IndexError, OSError):
        return None

    return None
