"""
Cognivex AI Tokenizer
Specialized vocabulary and subword encoding for causal intelligence, telemetry, and domain reasoning.
"""

import re
from typing import List, Dict

class CognivexTokenizer:
    def __init__(self):
        # Base special control tokens
        self.special_tokens = [
            "<PAD>", "<BOS>", "<EOS>", "<UNK>",
            "<SYSTEM>", "<PERCEPTION>", "<KNOWLEDGE>",
            "<WHAT_HAPPENED>", "<WHY_HAPPENED>", "<WHAT_NEXT>", 
            "<WHAT_TO_DO>", "<WHY_RECOMMEND>",
            "<ANOMALY>", "<SEVERITY_CRITICAL>", "<SEVERITY_HIGH>", "<SEVERITY_MED>", "<SEVERITY_LOW>",
            "<METRIC_SPIKE>", "<ROOT_CAUSE>", "<INTERVENTION>"
        ]
        
        # Domain specialized vocabulary
        self.domain_terms = [
            # Common AI & Reasoning
            "anomaly", "detected", "threshold", "breach", "baseline", "probability", "correlation",
            "causality", "degradation", "trajectory", "prescriptive", "mitigation", "confidence",
            "root_cause", "cascade", "intervention", "telemetry", "sensor", "risk", "critical",
            "fail", "failure", "temperature", "vibration", "drawdown", "voltage", "dropout",
            
            # Village
            "borewell", "groundwater", "aquifer", "depletion", "monsoon", "crop", "blight", "fungal",
            "irrigation", "panchayat", "yield", "soil_moisture", "ph", "nitrogen", "subsidized", "drone",
            
            # College
            "student", "attendance", "grade", "gpa", "prerequisite", "calculus", "dropout_risk",
            "lab_submission", "lms", "mentorship", "intervention_session", "faculty", "energy_kwh",
            
            # Industry
            "spindle", "bearing", "harmonic", "cnc", "hydraulic", "rpm", "lubrication", "fatigue",
            "throughput", "throttle", "preventative", "overhaul", "work_order", "downtime",
            
            # Healthcare
            "patient", "vital", "sepsis", "heart_rate", "spo2", "lactate", "hypotension", "icu",
            "antibiotic", "triage", "organ_dysfunction", "hemodynamic",
            
            # Smart City
            "traffic", "congestion", "grid", "substation", "transformer", "stormwater", "drainage",
            "pump_station", "signal_phase", "reroute", "load_shedding"
        ]
        
        # General subwords and words
        common_words = [
            "the", "of", "and", "to", "a", "in", "is", "it", "you", "that", "he", "was", "for",
            "on", "are", "as", "with", "his", "they", "at", "be", "this", "have", "from", "or",
            "one", "had", "by", "word", "but", "not", "what", "all", "were", "we", "when", "your",
            "can", "said", "there", "use", "an", "each", "which", "she", "do", "how", "their", "if",
            "will", "up", "other", "about", "out", "many", "then", "them", "these", "so", "some",
            "her", "would", "make", "like", "him", "into", "time", "has", "look", "two", "more",
            "write", "go", "see", "number", "no", "way", "could", "people", "my", "than", "first",
            "water", "been", "call", "who", "oil", "its", "now", "find", "long", "down", "day",
            "did", "get", "come", "made", "may", "part", "high", "low", "normal", "exceeded",
            "immediate", "action", "recommended", "analysis", "system", "due", "levels", "expected",
            "operating", "requires", "hours", "prevent", "schedule", "dispatch", "alert", "reduce"
        ]
        
        # Build vocabulary mapping
        self.vocab: Dict[str, int] = {}
        self.inv_vocab: Dict[int, str] = {}
        
        for token in self.special_tokens:
            self._add_token(token)
        for term in self.domain_terms:
            self._add_token(term)
        for word in common_words:
            self._add_token(word)
        for char in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:;!?-+/*_=%()[]{}<>\"'\n ":
            self._add_token(char)
            
        self.pad_token_id = self.vocab["<PAD>"]
        self.bos_token_id = self.vocab["<BOS>"]
        self.eos_token_id = self.vocab["<EOS>"]
        self.unk_token_id = self.vocab["<UNK>"]

    def _add_token(self, token: str):
        if token not in self.vocab:
            idx = len(self.vocab)
            self.vocab[token] = idx
            self.inv_vocab[idx] = token

    @property
    def vocab_size(self) -> int:
        return len(self.vocab)

    def tokenize(self, text: str) -> List[str]:
        pattern = "|".join(re.escape(tok) for tok in self.special_tokens)
        pattern += r"|\w+|[^\w\s]|\s+"
        
        tokens = []
        for match in re.finditer(pattern, text):
            token = match.group()
            token_lower = token.lower()
            if token in self.vocab:
                tokens.append(token)
            elif token_lower in self.vocab:
                tokens.append(token_lower)
            else:
                for c in token:
                    tokens.append(c if c in self.vocab else "<UNK>")
        return tokens

    def encode(self, text: str, add_special_tokens: bool = True, max_length: int = 128) -> List[int]:
        raw_tokens = self.tokenize(text)
        token_ids = []
        if add_special_tokens:
            token_ids.append(self.bos_token_id)
            
        for tok in raw_tokens:
            token_ids.append(self.vocab.get(tok, self.unk_token_id))
            if len(token_ids) >= max_length - (1 if add_special_tokens else 0):
                break
                
        if add_special_tokens:
            token_ids.append(self.eos_token_id)
            
        return token_ids

    def decode(self, token_ids: List[int], skip_special_tokens: bool = False) -> str:
        words = []
        for tid in token_ids:
            if tid in self.inv_vocab:
                token = self.inv_vocab[tid]
                if skip_special_tokens and token in self.special_tokens:
                    continue
                words.append(token)
            else:
                words.append("<UNK>")
                
        out = ""
        for w in words:
            if len(w) == 1 and not w.isalnum():
                out += w
            elif out and not out.endswith(" ") and not out.endswith("\n"):
                out += " " + w
            else:
                out += w
        return out.strip()
