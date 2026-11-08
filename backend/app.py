"""
Cognivex AI Intelligence Platform - FastAPI Backend Server
Orchestrates Perception, Understanding, Knowledge, Cognivex Neural Engine, Decision (5 Pillars), and Action.
"""

import os
import sys
import json
import re
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
import uvicorn
from typing import Dict, Any, List, NoReturn, Optional
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Ensure backend directory is in pythonpath
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load .env automatically (no shell export needed)
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
except ImportError:
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(env_path):
        with open(env_path, encoding="utf-8") as env_file:
            for raw_line in env_file:
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                name, value = line.split("=", 1)
                os.environ.setdefault(name.strip(), value.strip().strip('"').strip("'"))


from cognivex_ai.engine import CognivexEngine
from cognivex_ai.chat_history import (
    _get_api_key,
    _supabase_headers,
    clear_history,
    create_chat,
    delete_all_chats,
    delete_chat,
    get_chat_sessions,
    get_history,
    save_exchange,
    test_supabase_connection,
)
from cognivex_ai.llm_provider import (
    GEMINI_CHAT_MODELS,
    generate_with_provider,
    generate_with_provider_detailed,
    test_llm_connection,
)
from cognivex_ai.web_search import format_sources, search_web
from cognivex_ai.weights import CAUSAL_CLASSES, ACTION_CLASSES
from domains.manager import DomainManager
from engine.action import ActionDispatcher

app = FastAPI(
    title="Cognivex AI Intelligence Platform API",
    description="Unified Reusable AI Intelligence Engine across Multi-Domain Verticals",
    version="2.0.0"
)

ADMIN_EMAIL = "bitrashreyi97@gmail.com"

cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins or ["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global singletons
cognivex = CognivexEngine.get_instance()
domain_mgr = DomainManager.get_instance()
action_dispatcher = ActionDispatcher()

# Request schemas
class AnalyzeRequest(BaseModel):
    domain: str
    headline: str
    telemetry_summary: str
    entity: str
    metrics_breached: Optional[List[str]] = None
    graph_trail: Optional[List[str]] = None

class ActionTriggerRequest(BaseModel):
    action_name: str
    domain: str
    entity: str
    parameters: Optional[Dict[str, Any]] = None

class CognivexPromptRequest(BaseModel):
    prompt: str
    max_tokens: Optional[int] = 35
    session_id: Optional[str] = "default"
    chat_id: Optional[str] = None
    title: Optional[str] = None
    gemini_model: Optional[str] = None


class DsaTutorPromptRequest(BaseModel):
    prompt: str
    session_id: Optional[str] = "default"
    chat_id: Optional[str] = None
    title: Optional[str] = None
    gemini_model: Optional[str] = None


class ChatSessionRequest(BaseModel):
    session_id: str

class CognivexTrainRequest(BaseModel):
    domain: str
    samples: List[str]
    epochs: Optional[int] = 5

class CustomDomainRequest(BaseModel):
    domain_id: str
    name: str
    tagline: str
    theme_color: str
    sensors: List[Dict[str, Any]]
    sample_incident: Dict[str, Any]


def _require_authenticated_user(authorization: Optional[str]) -> Dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
    api_key = _get_api_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="Supabase credentials are not configured")
    url = os.getenv("SUPABASE_URL", "https://tgqjilgdnyzktppkybmu.supabase.co").rstrip("/")
    request = Request(
        f"{url}/auth/v1/user",
        headers=_supabase_headers(api_key, token),
    )
    try:
        with urlopen(request, timeout=10) as response:
            user = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        if error.code in {401, 403}:
            raise HTTPException(status_code=401, detail="Invalid or expired session") from error
        raise HTTPException(
            status_code=503,
            detail="Unable to verify the Supabase session right now",
        ) from error
    except (URLError, TimeoutError, OSError, ValueError) as error:
        raise HTTPException(
            status_code=503,
            detail="Unable to verify the Supabase session right now",
        ) from error
    if not isinstance(user, dict) or not user.get("id"):
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return user


def _require_admin(authorization: Optional[str]) -> Dict[str, Any]:
    """Validate the Supabase session and enforce the designated admin email."""
    user = _require_authenticated_user(authorization)
    email = user.get("email")
    if not isinstance(email, str) or email.strip().lower() != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def _chat_access_token(authorization: Optional[str]) -> Optional[str]:
    if authorization is None:
        return None
    scheme, separator, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not separator or not token.strip():
        raise HTTPException(status_code=401, detail="Invalid Authorization header")
    return token.strip()


def _require_google_access_token(access_token: Optional[str], user: Dict[str, Any]) -> str:
    token = (access_token or "").strip()
    if not token:
        raise HTTPException(
            status_code=400,
            detail="Connect your Google account in Settings before sending a chat message.",
        )
    if len(token) > 8192:
        raise HTTPException(status_code=400, detail="The Google access token is too long.")

    request = Request(
        "https://openidconnect.googleapis.com/v1/userinfo",
        headers={"Authorization": f"Bearer {token}"},
    )
    try:
        with urlopen(request, timeout=10) as response:
            google_user = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        if error.code in {401, 403}:
            raise HTTPException(
                status_code=401,
                detail="Google authorization expired. Reconnect your Google account.",
            ) from error
        raise HTTPException(status_code=503, detail="Unable to verify your Google account right now.") from error
    except (URLError, TimeoutError, OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise HTTPException(status_code=503, detail="Unable to verify your Google account right now.") from error

    google_email = google_user.get("email") if isinstance(google_user, dict) else None
    auth_email = user.get("email")
    if (
        not isinstance(google_email, str)
        or google_user.get("email_verified") is not True
        or not isinstance(auth_email, str)
        or google_email.strip().lower() != auth_email.strip().lower()
    ):
        raise HTTPException(
            status_code=403,
            detail="Connect the Google account that uses the same verified email as your Cognivex account.",
        )
    return token


def _require_google_project_id(project_id: Optional[str]) -> str:
    value = (project_id or "").strip()
    if not re.fullmatch(r"[a-z][a-z0-9-]{4,28}[a-z0-9]", value):
        raise HTTPException(status_code=400, detail="Enter a valid Google Cloud Project ID in Settings.")
    return value


def _raise_chat_history_error(error: RuntimeError) -> NoReturn:
    message = str(error)
    if "Supabase REST 401:" in message:
        raise HTTPException(status_code=401, detail="Invalid or expired Supabase session") from error
    if "Supabase REST 403:" in message:
        raise HTTPException(status_code=403, detail="Chat history access denied by Supabase") from error
    raise HTTPException(status_code=503, detail=f"Chat history persistence failed: {message}") from error


def _get_chat_history(
    session_id: str,
    limit: int = 100,
    access_token: Optional[str] = None,
    chat_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    try:
        return get_history(
            session_id,
            limit=limit,
            access_token=access_token,
            chat_id=chat_id,
        )
    except RuntimeError as error:
        _raise_chat_history_error(error)


def _admin_history(limit: int = 200) -> List[Dict[str, Any]]:
    """Read history through Supabase REST (service key or anon key) for authorized admins."""
    api_key = _get_api_key()
    if not api_key:
        from cognivex_ai.chat_history import _read_local
        return _read_local()[:limit]

    url = os.getenv("SUPABASE_URL", "https://tgqjilgdnyzktppkybmu.supabase.co").rstrip("/")
    table = os.getenv("SUPABASE_CHAT_TABLE", "Chat_History")
    request = Request(
        f"{url}/rest/v1/{table}?select=id,session_id,role,content,provider,created_at&order=created_at.desc&limit={limit}",
        headers=_supabase_headers(api_key),
    )
    try:
        with urlopen(request, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, OSError, ValueError):
        from cognivex_ai.chat_history import _read_local
        return _read_local()[:limit]

# Routes
@app.get("/api/health")
def get_health():
    return {
        "status": "ONLINE",
        "engine": "Cognivex AI Causal Neural Engine",
        "parameters": cognivex.param_stats,
        "domains_registered": len(domain_mgr.domains) + len(domain_mgr.custom_domains)
    }

@app.get("/api/integrations/status")
def get_integrations_status():
    """Return real-time diagnostic status of the database and active LLM provider."""
    llm_status = test_llm_connection()
    return {
        "supabase": test_supabase_connection(),
        "llm": llm_status,
        "gemini_models": [
            {"id": model_id, "label": label}
            for model_id, label in GEMINI_CHAT_MODELS.items()
        ],
    }


def _validate_gemini_model(model: Optional[str]) -> Optional[str]:
    if model is not None and model not in GEMINI_CHAT_MODELS:
        raise HTTPException(status_code=400, detail="Unsupported Gemini model selection.")
    return model

@app.get("/api/domains")
def list_domains():
    return {"domains": domain_mgr.get_all_domains_summary()}


@app.get("/api/admin/overview")
def admin_overview(authorization: Optional[str] = Header(default=None)):
    user = _require_admin(authorization)
    history = _admin_history()
    return {
        "admin_email": user["email"],
        "domains": domain_mgr.get_all_domains_summary(),
        "chat_messages": history,
        "chat_message_count": len(history),
    }

@app.get("/api/domain/{domain_id}")
def get_domain_details(domain_id: str):
    data = domain_mgr.get_domain(domain_id)
    if not data:
        raise HTTPException(status_code=404, detail="Domain not found")
    return data

@app.post("/api/analyze")
def analyze_incident(req: AnalyzeRequest):
    # 1. Run Cognivex neural forward pass & 5-pillar causal reasoning
    context_data = {
        "metrics_breached": req.metrics_breached or ["Sensor Variance > 2.0σ"],
        "graph_trail": req.graph_trail or [req.entity, "Systemic Risk", "Prescribed Action"]
    }
    
    result = cognivex.analyze_incident(
        domain_name=req.domain,
        headline=req.headline,
        telemetry_summary=req.telemetry_summary,
        entity_name=req.entity,
        context_data=context_data
    )
    
    # 2. Retrieve historical precedent from vector store (RAG enrichment)
    similar_cases = domain_mgr.vector_store.search_similar(f"{req.headline} {req.domain}", top_k=2)
    result["historical_precedents"] = similar_cases
    
    return result

@app.post("/api/action/trigger")
def trigger_action(req: ActionTriggerRequest):
    record = action_dispatcher.execute_action(
        action_name=req.action_name,
        domain=req.domain,
        entity_name=req.entity,
        parameters=req.parameters or {}
    )
    return {"success": True, "record": record}

@app.get("/api/actions/audit")
def get_action_audit():
    return {"audit_log": action_dispatcher.action_audit_log}

@app.post("/api/report/generate")
def generate_brief(analysis_data: Dict[str, Any]):
    brief_markdown = action_dispatcher.generate_intelligence_brief(analysis_data)
    return {"markdown": brief_markdown}

@app.get("/api/cognivex/model-info")
def get_model_info():
    return {
        "model_name": "Cognivex AI Causal Transformer v2.0",
        "architecture": {
            "d_model": cognivex.model.d_model,
            "layers": len(cognivex.model.blocks),
            "attention_heads": cognivex.model.blocks[0].attn.n_heads if cognivex.model.blocks else 4,
            "vocab_size": cognivex.tokenizer.vocab_size,
            "max_seq_len": cognivex.model.max_seq_len,
            "parameters": cognivex.param_stats
        },
        "causal_classes": CAUSAL_CLASSES,
        "action_classes": ACTION_CLASSES,
        "training_history": cognivex.training_history
    }

@app.post("/api/chat")
def chat_endpoint(
    req: CognivexPromptRequest,
    authorization: Optional[str] = Header(default=None),
    x_google_access_token: Optional[str] = Header(default=None, alias="X-Google-Access-Token"),
    x_google_project_id: Optional[str] = Header(default=None, alias="X-Google-Project-ID"),
):
    return run_cognivex_prompt(req, authorization, x_google_access_token, x_google_project_id)


@app.post("/api/dsa-tutor/prompt")
def run_dsa_tutor_prompt(
    req: DsaTutorPromptRequest,
    authorization: Optional[str] = Header(default=None),
    x_google_access_token: Optional[str] = Header(default=None, alias="X-Google-Access-Token"),
    x_google_project_id: Optional[str] = Header(default=None, alias="X-Google-Project-ID"),
):
    user = _require_authenticated_user(authorization)
    google_access_token = _require_google_access_token(x_google_access_token, user)
    google_project_id = _require_google_project_id(x_google_project_id)
    selected_model = _validate_gemini_model(req.gemini_model)

    session_id = req.session_id or "default"
    access_token = _chat_access_token(authorization)
    conversation = [
        {
            "role": message.get("role", ""),
            "content": message.get("content", ""),
        }
        for message in _get_chat_history(
            session_id,
            limit=100,
            access_token=access_token,
            chat_id=req.chat_id,
        )
        if message.get("provider") == "gemini-dsa-tutor"
        and message.get("role") in {"user", "assistant"}
        and message.get("content")
    ]
    model = selected_model or os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite").strip()
    provider_result = generate_with_provider_detailed(
        req.prompt,
        max_tokens=1024,
        conversation=conversation,
        gemini_model=model,
        google_access_token=google_access_token,
        google_project_id=google_project_id,
        system_instruction=(
            "You are a friendly Data Structures and Algorithms tutor. "
            "Explain concepts clearly with examples, analogies, and code "
            "when useful. Help the student understand the reasoning."
        ),
        temperature=0.4,
    )
    generated = provider_result.get("content")
    if not generated:
        status = {
            "unauthorized": 401,
            "permission_denied": 403,
            "quota_exhausted": 429,
        }.get(provider_result.get("status"), 502)
        raise HTTPException(
            status_code=status,
            detail=f"Gemini request failed: {provider_result.get('error') or provider_result.get('status')}.",
        )

    usage = provider_result.get("usage_metadata") or {}
    try:
        save_exchange(
            session_id=session_id,
            user_prompt=req.prompt,
            assistant_response=generated,
            sources=[],
            web_context="",
            provider="gemini-dsa-tutor",
            access_token=access_token,
            chat_id=req.chat_id,
            title=req.title,
        )
    except RuntimeError as error:
        _raise_chat_history_error(error)
    return {
        "generated_text": generated,
        "provider_used": "gemini-dsa-tutor",
        "provider_model": provider_result.get("model", model),
        "usage_metadata": usage,
    }


@app.post("/api/cognivex/prompt")
def run_cognivex_prompt(
    req: CognivexPromptRequest,
    authorization: Optional[str] = Header(default=None),
    x_google_access_token: Optional[str] = Header(default=None, alias="X-Google-Access-Token"),
    x_google_project_id: Optional[str] = Header(default=None, alias="X-Google-Project-ID"),
):
    user = _require_authenticated_user(authorization)
    google_access_token = _require_google_access_token(x_google_access_token, user)
    google_project_id = _require_google_project_id(x_google_project_id)
    max_tokens = req.max_tokens or 200
    selected_model = _validate_gemini_model(req.gemini_model)
    provider_config = os.getenv("LLM_PROVIDER", "local")
    access_token = _chat_access_token(authorization)

    # ── 1. Try the configured language model provider ────────────────────────
    previous_messages = _get_chat_history(
        req.session_id or "default",
        limit=20,
        access_token=access_token,
        chat_id=req.chat_id,
    )
    conversation = [
        {"role": message.get("role", ""), "content": message.get("content", "")}
        for message in previous_messages
        if message.get("role") in {"user", "assistant"}
    ]
    web_results = search_web(req.prompt)
    web_context = format_sources(web_results)
    provider_result = generate_with_provider_detailed(
        req.prompt,
        max_tokens=max_tokens,
        web_context=web_context,
        conversation=conversation,
        gemini_model=selected_model,
        google_access_token=google_access_token,
        google_project_id=google_project_id,
    )
    generated = provider_result.get("content")
    provider_used = provider_result.get("provider", provider_config)
    provider_status = provider_result.get("status", "ok")
    if not generated:
        status_code = {
            "unauthorized": 401,
            "permission_denied": 403,
            "quota_exhausted": 429,
            "missing_project": 400,
        }.get(provider_status, 502)
        raise HTTPException(
            status_code=status_code,
            detail=(
                f"Gemini model {selected_model or provider_result.get('model', 'selected')} is unavailable: "
                f"{provider_result.get('error') or provider_status}."
            ),
        )
    provider_model = provider_result.get("model") or os.getenv(
        "GEMINI_MODEL" if provider_used == "gemini" else "LLM_MODEL",
        "gemini-3.1-flash-lite" if provider_used == "gemini" else "gpt-4o-mini",
    )
    # ── 2. Persist to Supabase ───────────────────────────────────────────────
    try:
        save_exchange(
            session_id=req.session_id or "default",
            user_prompt=req.prompt,
            assistant_response=generated,
            sources=web_results,
            web_context=web_context,
            provider=provider_used,
            access_token=access_token,
            chat_id=req.chat_id,
            title=req.title,
        )
    except RuntimeError as error:
        _raise_chat_history_error(error)

    # ── 3. Cognivex neural classification heads for sidebar analytics ────────
    import torch
    token_ids = cognivex.tokenizer.encode(req.prompt, add_special_tokens=True, max_length=32)
    with torch.no_grad():
        out = cognivex.model(torch.tensor([token_ids], dtype=torch.long))
        anom = float(out["anomaly_score"][0, 0].item())
        causal_idx = int(torch.argmax(out["causal_logits"][0]).item())
        act_idx   = int(torch.argmax(out["policy_logits"][0]).item())
        attn_map  = cognivex.model.get_attention_matrix()

    return {
        "prompt": req.prompt,
        "generated_text": generated,
        "tokens": [cognivex.tokenizer.inv_vocab.get(t, "?") for t in token_ids],
        "attention_map": attn_map[:12] if attn_map else [],
        "anomaly_score": round(anom * 100, 1),
        "predicted_cause": CAUSAL_CLASSES[causal_idx] if causal_idx < len(CAUSAL_CLASSES) else "Unknown",
        "predicted_action": ACTION_CLASSES[act_idx] if act_idx < len(ACTION_CLASSES) else "Unknown",
        "sources": web_results,
        "provider_used": provider_used,
        "provider_status": provider_status,
        "provider_model": provider_model,
        "usage_metadata": provider_result.get("usage_metadata"),
    }

@app.get("/api/chat/sessions")
def read_chat_sessions(
    session_id: str,
    authorization: Optional[str] = Header(default=None),
):
    try:
        return {
            "chats": get_chat_sessions(
                session_id,
                access_token=_chat_access_token(authorization),
            )
        }
    except RuntimeError as error:
        _raise_chat_history_error(error)


@app.post("/api/chat/sessions")
def create_chat_session(
    req: ChatSessionRequest,
    authorization: Optional[str] = Header(default=None),
):
    try:
        chat = create_chat(
            req.session_id,
            access_token=_chat_access_token(authorization),
        )
        return {"chat": chat}
    except RuntimeError as error:
        _raise_chat_history_error(error)


@app.delete("/api/chat/sessions")
def remove_all_chat_sessions(
    session_id: str,
    authorization: Optional[str] = Header(default=None),
):
    try:
        delete_all_chats(
            session_id,
            access_token=_chat_access_token(authorization),
        )
    except RuntimeError as error:
        _raise_chat_history_error(error)
    return {"success": True}


@app.get("/api/chat/history/{chat_id}")
def read_chat_history(
    chat_id: str,
    session_id: str,
    authorization: Optional[str] = Header(default=None),
):
    try:
        return {
            "messages": _get_chat_history(
                session_id,
                access_token=_chat_access_token(authorization),
                chat_id=chat_id,
            )
        }
    except RuntimeError as error:
        _raise_chat_history_error(error)


@app.delete("/api/chat/history/{chat_id}")
def delete_chat_history(
    chat_id: str,
    session_id: str,
    authorization: Optional[str] = Header(default=None),
):
    try:
        clear_history(
            session_id,
            access_token=_chat_access_token(authorization),
            chat_id=chat_id,
        )
    except RuntimeError as error:
        _raise_chat_history_error(error)
    return {"success": True}


@app.delete("/api/chat/sessions/{chat_id}")
def remove_chat_session(
    chat_id: str,
    session_id: str,
    authorization: Optional[str] = Header(default=None),
):
    try:
        delete_chat(
            session_id,
            chat_id,
            access_token=_chat_access_token(authorization),
        )
    except RuntimeError as error:
        _raise_chat_history_error(error)
    return {"success": True}

@app.post("/api/cognivex/train")
def train_cognivex(req: CognivexTrainRequest):
    result = cognivex.fine_tune_domain(
        domain_name=req.domain,
        training_samples=req.samples,
        epochs=req.epochs or 5
    )
    return {"success": True, "training_result": result}

@app.post("/api/domain/custom/create")
def create_custom_domain(req: CustomDomainRequest):
    new_domain = domain_mgr.create_custom_domain(
        domain_id=req.domain_id,
        name=req.name,
        tagline=req.tagline,
        theme_color=req.theme_color,
        sensors=req.sensors,
        sample_incident=req.sample_incident
    )
    return {"success": True, "domain": new_domain}

if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
