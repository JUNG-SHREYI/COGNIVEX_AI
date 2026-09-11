"""
Cognivex Understanding Layer
Extracts semantic entities, associates symptoms, and detects multi-sensor correlation patterns.
"""

from typing import Dict, Any, List

class UnderstandingLayer:
    def __init__(self):
        pass

    def correlate_symptoms(
        self,
        domain: str,
        telemetry_breaches: List[Dict[str, Any]],
        document_entities: List[str]
    ) -> Dict[str, Any]:
        """Correlates multiple breached telemetry signals into unified symptom signatures."""
        symptom_tags = []
        for breach in telemetry_breaches:
            sensor = breach.get("sensor_id", "")
            val = breach.get("value", 0)
            z = breach.get("z_score", 0)
            direction = "CRITICAL_HIGH" if z > 0 else "CRITICAL_LOW"
            symptom_tags.append(f"{sensor}:{direction} (val={val}, z={z})")

        return {
            "domain": domain,
            "symptom_signature": " + ".join(symptom_tags) if symptom_tags else "NOMINAL_STABLE",
            "correlated_breach_count": len(telemetry_breaches),
            "linked_entities": document_entities
        }
