"""
Cognivex AI Intelligence Platform - FastAPI Backend Server
Orchestrates Perception, Understanding, Knowledge, Cognivex Neural Engine, Decision (5 Pillars), and Action.
"""

import os
import sys
import uvicorn
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException
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
from cognivex_ai.chat_history import clear_history, get_history, save_exchange
from cognivex_ai.llm_provider import generate_with_provider
from cognivex_ai.response_engine import generate_intelligent_response
from cognivex_ai.web_search import format_sources, search_web
from cognivex_ai.weights import CAUSAL_CLASSES, ACTION_CLASSES
from domains.manager import DomainManager
from engine.action import ActionDispatcher

app = FastAPI(
    title="Cognivex AI Intelligence Platform API",
    description="Unified Reusable AI Intelligence Engine across Multi-Domain Verticals",
    version="2.0.0"
)

# Enable CORS for frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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

class ChatHistoryRequest(BaseModel):
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

# Routes
@app.get("/api/health")
def get_health():
    return {
        "status": "ONLINE",
        "engine": "Cognivex AI Causal Neural Engine",
        "parameters": cognivex.param_stats,
        "domains_registered": len(domain_mgr.domains) + len(domain_mgr.custom_domains)
    }

@app.get("/api/domains")
def list_domains():
    return {"domains": domain_mgr.get_all_domains_summary()}

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

@app.post("/api/cognivex/prompt")
def run_cognivex_prompt(req: CognivexPromptRequest):
    max_tokens = req.max_tokens or 200
    provider = os.getenv("LLM_PROVIDER", "local")

    # ── 1. Try external provider (OpenAI / Ollama) ──────────────────────────
    web_results = search_web(req.prompt)
    web_context = format_sources(web_results)
    generated = generate_with_provider(req.prompt, max_tokens=max_tokens, web_context=web_context)

    # ── 2. Fall back to Cognivex intelligent response engine ─────────────────
    if not generated:
        # Extract domain from session context prefix e.g. "Domain: village\n..."
        domain = None
        for line in req.prompt.splitlines()[:3]:
            if line.lower().startswith("domain:"):
                domain = line.split(":", 1)[1].strip().lower().split()[0]
                break
        generated = generate_intelligent_response(
            prompt=req.prompt,
            domain=domain,
            engine=cognivex,
            max_tokens=max_tokens,
        )

    # ── 3. Persist to Supabase / local fallback ──────────────────────────────
    save_exchange(
        session_id=req.session_id or "default",
        user_prompt=req.prompt,
        assistant_response=generated,
        sources=web_results,
        web_context=web_context,
        provider=provider,
    )

    # ── 4. Cognivex neural classification heads for sidebar analytics ─────────
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
    }

@app.get("/api/chat/history/{session_id}")
def read_chat_history(session_id: str):
    return {"messages": get_history(session_id)}

@app.delete("/api/chat/history/{session_id}")
def delete_chat_history(session_id: str):
    clear_history(session_id)
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
