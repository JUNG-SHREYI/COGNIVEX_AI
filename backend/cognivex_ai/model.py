"""
Cognivex AI: Proprietary Multi-Task Causal Transformer Architecture
Built with PyTorch: Causal Attention, Anomaly Head, Causal Attribution Head, Prognosis Head, and Prescriptive Policy Head.
"""

import math
import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Dict, List, Optional, Tuple

class CognivexCausalAttention(nn.Module):
    """Multi-Head Causal Self-Attention with Attention Map Retention for UI Visualization."""
    def __init__(self, d_model: int = 256, n_heads: int = 8, dropout: float = 0.1):
        super().__init__()
        assert d_model % n_heads == 0
        self.d_model = d_model
        self.n_heads = n_heads
        self.d_head = d_model // n_heads
        
        self.q_proj = nn.Linear(d_model, d_model)
        self.k_proj = nn.Linear(d_model, d_model)
        self.v_proj = nn.Linear(d_model, d_model)
        self.out_proj = nn.Linear(d_model, d_model)
        
        self.dropout = nn.Dropout(dropout)
        self.last_attn_weights: Optional[torch.Tensor] = None

    def forward(self, x: torch.Tensor, mask: Optional[torch.Tensor] = None) -> torch.Tensor:
        B, T, C = x.size()
        
        q = self.q_proj(x).view(B, T, self.n_heads, self.d_head).transpose(1, 2)
        k = self.k_proj(x).view(B, T, self.n_heads, self.d_head).transpose(1, 2)
        v = self.v_proj(x).view(B, T, self.n_heads, self.d_head).transpose(1, 2)
        
        scores = torch.matmul(q, k.transpose(-2, -1)) / math.sqrt(self.d_head)
        
        # Causal mask (prevent looking into the future)
        causal_mask = torch.tril(torch.ones((T, T), device=x.device)).unsqueeze(0).unsqueeze(0)
        scores = scores.masked_fill(causal_mask == 0, float("-inf"))
        
        if mask is not None:
            scores = scores.masked_fill(mask == 0, float("-inf"))
            
        attn_weights = F.softmax(scores, dim=-1)
        self.last_attn_weights = attn_weights.detach()
        
        attn_applied = torch.matmul(self.dropout(attn_weights), v)
        attn_applied = attn_applied.transpose(1, 2).contiguous().view(B, T, C)
        return self.out_proj(attn_applied)


class CognivexFeedForward(nn.Module):
    """GELU feedforward projection layer with expansion."""
    def __init__(self, d_model: int = 256, d_ff: int = 512, dropout: float = 0.1):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(d_model, d_ff),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_ff, d_model),
            nn.Dropout(dropout)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class CognivexTransformerBlock(nn.Module):
    """Transformer block with Pre-LayerNorm & Residual Connections."""
    def __init__(self, d_model: int = 256, n_heads: int = 8, dropout: float = 0.1):
        super().__init__()
        self.ln1 = nn.LayerNorm(d_model)
        self.attn = CognivexCausalAttention(d_model, n_heads, dropout)
        self.ln2 = nn.LayerNorm(d_model)
        self.ffn = CognivexFeedForward(d_model, d_model * 2, dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = x + self.attn(self.ln1(x))
        x = x + self.ffn(self.ln2(x))
        return x


class CognivexModel(nn.Module):
    """
    Cognivex AI: Unified Causal Language & Intelligence Model
    Outputs:
      1. Next-Token Logits (Language Generation & Reasoning)
      2. Anomaly Score (Binary Probability & Severity)
      3. Causal Factor Attribution (Graph Node / Factor Distribution)
      4. Prognostic Risk (Hours to Failure / Risk Trajectory)
      5. Prescriptive Policy (Ranking of Intervention Strategies)
    """
    def __init__(
        self,
        vocab_size: int = 350,
        d_model: int = 256,
        n_heads: int = 8,
        n_layers: int = 4,
        max_seq_len: int = 256,
        num_causal_classes: int = 16,
        num_action_classes: int = 8,
        dropout: float = 0.1
    ):
        super().__init__()
        self.d_model = d_model
        self.max_seq_len = max_seq_len
        self.vocab_size = vocab_size
        
        # Token and Positional Embeddings
        self.token_emb = nn.Embedding(vocab_size, d_model)
        self.pos_emb = nn.Embedding(max_seq_len, d_model)
        self.emb_dropout = nn.Dropout(dropout)
        
        # Transformer Backbone
        self.blocks = nn.ModuleList([
            CognivexTransformerBlock(d_model, n_heads, dropout)
            for _ in range(n_layers)
        ])
        self.final_ln = nn.LayerNorm(d_model)
        
        # Multi-Task Heads
        # 1. Autoregressive Language Head
        self.lm_head = nn.Linear(d_model, vocab_size, bias=False)
        # Weight tie token embeddings with lm_head
        self.lm_head.weight = self.token_emb.weight
        
        # 2. Anomaly Detection Head
        self.anomaly_head = nn.Sequential(
            nn.Linear(d_model, 64),
            nn.GELU(),
            nn.Linear(64, 1),
            nn.Sigmoid()
        )
        
        # 3. Causal Attribution Head (Identifies the primary root cause)
        self.causal_head = nn.Sequential(
            nn.Linear(d_model, 64),
            nn.GELU(),
            nn.Linear(64, num_causal_classes)
        )
        
        # 4. Prognosis Head (Predicts Degradation Score / Time to Event)
        self.prognosis_head = nn.Sequential(
            nn.Linear(d_model, 64),
            nn.GELU(),
            nn.Linear(64, 1),
            nn.Sigmoid()
        )
        
        # 5. Prescriptive Policy Head (Scores ranking intervention options)
        self.policy_head = nn.Sequential(
            nn.Linear(d_model, 64),
            nn.GELU(),
            nn.Linear(64, num_action_classes)
        )
        
        self.apply(self._init_weights)

    def _init_weights(self, module):
        if isinstance(module, nn.Linear):
            nn.init.normal_(module.weight, mean=0.0, std=0.02)
            if module.bias is not None:
                nn.init.zeros_(module.bias)
        elif isinstance(module, nn.Embedding):
            nn.init.normal_(module.weight, mean=0.0, std=0.02)
        elif isinstance(module, nn.LayerNorm):
            nn.init.zeros_(module.bias)
            nn.init.ones_(module.weight)

    def forward(
        self,
        input_ids: torch.Tensor,
        telemetry_embed: Optional[torch.Tensor] = None
    ) -> Dict[str, torch.Tensor]:
        B, T = input_ids.size()
        assert T <= self.max_seq_len, f"Sequence length {T} exceeds maximum {self.max_seq_len}"
        
        positions = torch.arange(0, T, device=input_ids.device).unsqueeze(0)
        tok_vecs = self.token_emb(input_ids)
        pos_vecs = self.pos_emb(positions)
        
        hidden = self.emb_dropout(tok_vecs + pos_vecs)
        
        # Optional fusion of continuous telemetry vector into representation
        if telemetry_embed is not None:
            hidden = hidden + telemetry_embed.unsqueeze(1).expand(-1, T, -1)
            
        for block in self.blocks:
            hidden = block(hidden)
            
        hidden = self.final_ln(hidden)
        
        # Pooled representation (last non-pad token or average)
        pooled = hidden[:, -1, :]
        
        # Multi-task outputs
        logits = self.lm_head(hidden)
        anomaly_score = self.anomaly_head(pooled)
        causal_logits = self.causal_head(pooled)
        prognosis_score = self.prognosis_head(pooled)
        policy_logits = self.policy_head(pooled)
        
        return {
            "logits": logits,
            "anomaly_score": anomaly_score,
            "causal_logits": causal_logits,
            "prognosis_score": prognosis_score,
            "policy_logits": policy_logits,
            "hidden_states": hidden
        }

    def get_attention_matrix(self) -> List[List[float]]:
        """Returns the latest attention map from the final block for the frontend visualizer."""
        if len(self.blocks) > 0 and self.blocks[-1].attn.last_attn_weights is not None:
            # Average across heads for batch 0
            # Shape: [B, H, T, T] -> [T, T]
            attn = self.blocks[-1].attn.last_attn_weights[0].mean(dim=0).cpu().numpy()
            return attn.tolist()
        return []

    def count_parameters(self) -> Dict[str, int]:
        total = sum(p.numel() for p in self.parameters())
        trainable = sum(p.numel() for p in self.parameters() if p.requires_grad)
        return {"total_params": total, "trainable_params": trainable}

    @torch.no_grad()
    def generate(
        self,
        input_ids: torch.Tensor,
        max_new_tokens: int = 40,
        temperature: float = 0.7,
        top_k: int = 10,
        eos_id: Optional[int] = None
    ) -> torch.Tensor:
        """Autoregressive causal generation loop."""
        self.eval()
        for _ in range(max_new_tokens):
            idx_cond = input_ids[:, -self.max_seq_len:]
            outputs = self(idx_cond)
            logits = outputs["logits"][:, -1, :] / temperature
            
            if top_k is not None:
                v, _ = torch.topk(logits, min(top_k, logits.size(-1)))
                logits[logits < v[:, [-1]]] = -float("Inf")
                
            probs = F.softmax(logits, dim=-1)
            next_token = torch.multinomial(probs, num_samples=1)
            
            input_ids = torch.cat((input_ids, next_token), dim=1)
            if eos_id is not None and next_token.item() == eos_id:
                break
                
        return input_ids
