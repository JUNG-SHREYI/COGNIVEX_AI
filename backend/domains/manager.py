"""
Cognivex Domain Manager
Aggregates built-in domains (Village, College, Industry, Healthcare, Smart City),
manages dynamic custom user domains, and coordinates historical incident vector stores.
"""

from typing import Dict, Any, List, Optional
from engine.knowledge import VectorSemanticStore
from .village import get_village_domain_data
from .college import get_college_domain_data
from .industry import get_industry_domain_data
from .healthcare import get_healthcare_domain_data
from .smart_city import get_smart_city_domain_data

class DomainManager:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = DomainManager()
        return cls._instance

    def __init__(self):
        self.domains: Dict[str, Dict[str, Any]] = {}
        self.custom_domains: Dict[str, Dict[str, Any]] = {}
        self.vector_store = VectorSemanticStore()
        self._load_domains()
        self._populate_historical_knowledge()

    def _load_domains(self):
        v = get_village_domain_data()
        c = get_college_domain_data()
        i = get_industry_domain_data()
        h = get_healthcare_domain_data()
        s = get_smart_city_domain_data()
        
        for d in [v, c, i, h, s]:
            self.domains[d["id"]] = d

    def _populate_historical_knowledge(self):
        # Village cases
        self.vector_store.add_incident(
            "HIST-VIL-01",
            "Acute North Aquifer Drawdown 2024",
            "village",
            "Switched to rotational drip irrigation and activated artificial recharge pits. Yield recovered in 14 days.",
            ["borewell", "drawdown", "irrigation", "groundwater"]
        )
        self.vector_store.add_incident(
            "HIST-VIL-02",
            "Paddy Helminthosporium Leaf Blight 2023",
            "village",
            "Autonomous drone swarm sprayed copper oxychloride across 200 acres within 24 hours. Crop loss curtailed to 4%.",
            ["crop", "fungal", "blight", "drone", "spray"]
        )
        # College cases
        self.vector_store.add_incident(
            "HIST-COL-01",
            "Calculus Early Warning Remediation 2024",
            "college",
            "Targeted peer mentorship and Khan Academy adaptive modules deployed. Pass rate improved by 22%.",
            ["calculus", "dropout_risk", "attendance", "mentorship"]
        )
        # Industry cases
        self.vector_store.add_incident(
            "HIST-IND-01",
            "CNC Spindle Bearing Micro-Spalling 2023",
            "industry",
            "Throttled RPM by 15%, prevented catastrophic catastrophic spindle seizure, replacement kit fitted on weekend shift.",
            ["spindle", "bearing", "vibration", "harmonic", "throttle"]
        )
        # Healthcare cases
        self.vector_store.add_incident(
            "HIST-HLT-01",
            "Septic Shock Rapid Response 2024",
            "healthcare",
            "Initiated 30mL/kg crystalloid bolus and broad-spectrum piperacillin within 45 minutes. Patient hemodynamically stabilized.",
            ["sepsis", "vital", "tachycardia", "hypotension", "antibiotic"]
        )

    def get_all_domains_summary(self) -> List[Dict[str, Any]]:
        all_d = list(self.domains.values()) + list(self.custom_domains.values())
        return [
            {
                "id": d["id"],
                "name": d["name"],
                "icon": d["icon"],
                "tagline": d["tagline"],
                "theme_color": d["theme_color"],
                "sensors_count": len(d.get("sensors", [])),
                "incidents_count": len(d.get("active_incidents", []))
            }
            for d in all_d
        ]

    def get_domain(self, domain_id: str) -> Optional[Dict[str, Any]]:
        if domain_id in self.domains:
            return self.domains[domain_id]
        if domain_id in self.custom_domains:
            return self.custom_domains[domain_id]
        return None

    def create_custom_domain(
        self,
        domain_id: str,
        name: str,
        tagline: str,
        theme_color: str,
        sensors: List[Dict[str, Any]],
        sample_incident: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Dynamically registers a new custom domain created by the user."""
        new_domain = {
            "id": domain_id,
            "name": name,
            "icon": "Layers",
            "tagline": tagline,
            "theme_color": theme_color or "#8b5cf6",
            "sensors": sensors,
            "active_incidents": [sample_incident],
            "knowledge_graph": {
                "nodes": [
                    {"id": "NODE_1", "label": sensors[0]["name"] if sensors else "Primary Sensor", "type": "SENSOR", "metadata": {}},
                    {"id": "NODE_2", "label": sample_incident.get("entity", "Core Asset"), "type": "ASSET", "metadata": {}},
                    {"id": "NODE_3", "label": "Prescribed Mitigation", "type": "INTERVENTION", "metadata": {}}
                ],
                "edges": [
                    {"source": "NODE_1", "target": "NODE_2", "relation": "MONITORS", "weight": 0.95},
                    {"source": "NODE_3", "target": "NODE_2", "relation": "PROTECTS", "weight": 0.92}
                ]
            }
        }
        self.custom_domains[domain_id] = new_domain
        return new_domain
