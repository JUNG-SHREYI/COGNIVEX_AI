"""
Cognivex Knowledge Layer
Hybrid Knowledge Graph + Vector Semantic Store for causal path tracing and historical case retrieval.
"""

import math
from typing import Dict, Any, List, Optional

class KnowledgeNode:
    def __init__(self, node_id: str, label: str, node_type: str, metadata: Optional[Dict[str, Any]] = None):
        self.id = node_id
        self.label = label
        self.type = node_type # 'SENSOR', 'ASSET', 'ROOT_CAUSE', 'INTERVENTION', 'OUTCOME'
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "label": self.label,
            "type": self.type,
            "metadata": self.metadata
        }

class KnowledgeEdge:
    def __init__(self, source: str, target: str, relation: str, weight: float = 1.0):
        self.source = source
        self.target = target
        self.relation = relation # 'FEEDS_INTO', 'CAUSES', 'MITIGATES', 'MONITORS'
        self.weight = weight

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source": self.source,
            "target": self.target,
            "relation": self.relation,
            "weight": self.weight
        }

class KnowledgeGraph:
    def __init__(self):
        self.nodes: Dict[str, KnowledgeNode] = {}
        self.edges: List[KnowledgeEdge] = []

    def add_node(self, node_id: str, label: str, node_type: str, metadata: Optional[Dict[str, Any]] = None):
        self.nodes[node_id] = KnowledgeNode(node_id, label, node_type, metadata)

    def add_edge(self, source: str, target: str, relation: str, weight: float = 1.0):
        self.edges.append(KnowledgeEdge(source, target, relation, weight))

    def get_causal_path(self, start_node_id: str, max_depth: int = 3) -> List[Dict[str, Any]]:
        """Traverses directed causal edges from a symptom/sensor node to root causes and mitigations."""
        visited = set([start_node_id])
        queue = [(start_node_id, [start_node_id], 1.0)]
        paths = []
        
        while queue:
            curr, path, path_weight = queue.pop(0)
            if len(path) > 1:
                paths.append({
                    "path_nodes": path,
                    "terminal_node": self.nodes.get(curr, KnowledgeNode(curr, curr, "UNKNOWN")).label,
                    "cumulative_weight": round(path_weight, 2)
                })
                
            if len(path) >= max_depth:
                continue
                
            for edge in self.edges:
                if edge.source == curr and edge.target not in visited:
                    visited.add(edge.target)
                    queue.append((edge.target, path + [edge.target], path_weight * edge.weight))
                    
        return paths

    def to_dict(self) -> Dict[str, Any]:
        return {
            "nodes": [n.to_dict() for n in self.nodes.values()],
            "edges": [e.to_dict() for e in self.edges]
        }


class VectorSemanticStore:
    """Lightweight vector index using character/word n-gram frequency embeddings and cosine similarity."""
    def __init__(self):
        self.documents: List[Dict[str, Any]] = []

    def _embed(self, text: str) -> Dict[str, float]:
        words = text.lower().split()
        freq: Dict[str, float] = {}
        for w in words:
            clean = "".join(c for c in w if c.isalnum())
            if len(clean) > 2:
                freq[clean] = freq.get(clean, 0.0) + 1.0
        # Normalize
        norm = math.sqrt(sum(v * v for v in freq.values())) or 1.0
        return {k: v / norm for k, v in freq.items()}

    def add_incident(self, incident_id: str, title: str, domain: str, resolution: str, tags: List[str]):
        full_text = f"{title} {domain} {' '.join(tags)} {resolution}"
        vec = self._embed(full_text)
        self.documents.append({
            "id": incident_id,
            "title": title,
            "domain": domain,
            "resolution": resolution,
            "tags": tags,
            "vector": vec
        })

    def search_similar(self, query_text: str, top_k: int = 2) -> List[Dict[str, Any]]:
        q_vec = self._embed(query_text)
        results = []
        for doc in self.documents:
            d_vec = doc["vector"]
            # Cosine similarity
            sim = sum(q_vec.get(k, 0.0) * d_vec.get(k, 0.0) for k in q_vec)
            results.append((sim, doc))
            
        results.sort(key=lambda x: x[0], reverse=True)
        return [
            {
                "id": doc["id"],
                "title": doc["title"],
                "domain": doc["domain"],
                "resolution": doc["resolution"],
                "similarity": round(float(sim), 3)
            }
            for sim, doc in results[:top_k]
        ]
