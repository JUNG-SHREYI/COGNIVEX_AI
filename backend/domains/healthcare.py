"""
Healthcare Intelligence Domain Module
Covers: ICU Vital Anomaly Detection, Early Sepsis Trajectory, and Clinical Triage Pathways.
"""

from typing import Dict, Any
from engine.knowledge import KnowledgeGraph

def get_healthcare_domain_data() -> Dict[str, Any]:
    kg = KnowledgeGraph()
    
    # Nodes
    kg.add_node("PATIENT_ICU_08", "Patient ICU Bed #08 (Post-Op Day 2)", "ASSET", {"age": 64, "risk_tier": "High"})
    kg.add_node("MONITOR_VITALS", "Philips IntelliVue Multi-Lead Monitor", "SENSOR", {"leads": 12})
    kg.add_node("SEPSIS_EARLY", "Early Systemic Inflammatory Response (SIRS / Sepsis)", "ROOT_CAUSE", {"biomarker": "Serum Lactate"})
    kg.add_node("HEMODYNAMIC_INST", "Hemodynamic Instability & Septic Shock Cascade", "ROOT_CAUSE", {"urgency": "Stat"})
    kg.add_node("SEPSIS_BUNDLE", "1-Hour Sepsis Bundle & Broad Spectrum IV", "INTERVENTION", {"protocol": "Surviving Sepsis Campaign"})
    kg.add_node("ICU_TRIAGE_ESCAL", "Stat Intensivist Bedside Escalation", "INTERVENTION", {"sla_min": 10})

    # Edges
    kg.add_edge("MONITOR_VITALS", "PATIENT_ICU_08", "STREAMS_FROM", 0.99)
    kg.add_edge("SEPSIS_EARLY", "PATIENT_ICU_08", "AFFLICTS", 0.94)
    kg.add_edge("SEPSIS_EARLY", "HEMODYNAMIC_INST", "PROGRESSES_TO", 0.91)
    kg.add_edge("SEPSIS_BUNDLE", "SEPSIS_EARLY", "ARRESTS", 0.96)
    kg.add_edge("ICU_TRIAGE_ESCAL", "HEMODYNAMIC_INST", "STABILIZES", 0.93)

    return {
        "id": "healthcare",
        "name": "Healthcare Intelligence",
        "icon": "HeartPulse",
        "tagline": "Real-time ICU Vital Telemetry, Sepsis Early Warning & Clinical Triage",
        "theme_color": "#ec4899", # Pink
        "sensors": [
            {"id": "HR_MONITOR", "name": "Heart Rate", "unit": "BPM", "baseline": 74.0, "current": 118.0, "status": "CRITICAL"},
            {"id": "SPO2_SENSOR", "name": "Pulse Oximetry (SpO2)", "unit": "%", "baseline": 98.0, "current": 89.0, "status": "CRITICAL"},
            {"id": "MEAN_ARTERIAL_BP", "name": "Mean Arterial Pressure (MAP)", "unit": "mmHg", "baseline": 82.0, "current": 61.0, "status": "CRITICAL"},
            {"id": "CORE_TEMP", "name": "Continuous Core Temperature", "unit": "°C", "baseline": 37.0, "current": 39.4, "status": "WARNING"}
        ],
        "active_incidents": [
            {
                "id": "INC-HLT-401",
                "entity": "Patient ICU Bed #08 (Post-Op Day 2)",
                "headline": "Tachycardia (118 BPM) & Desaturation (SpO2 89%) Sepsis Onset",
                "telemetry_summary": "Continuous vitals show persistent tachycardia (>110 BPM for 90 minutes) accompanied by sudden MAP drop to 61 mmHg and fever spike of 39.4°C. Biomarker lactate elevated to 3.8 mmol/L.",
                "metrics_breached": ["Heart Rate > 110 BPM", "MAP < 65 mmHg", "Core Temp > 39.0°C", "SpO2 < 90%"],
                "graph_trail": ["Philips IntelliVue Multi-Lead Monitor", "Patient ICU Bed #08", "Early Systemic Infection/Sepsis", "1-Hour Sepsis Bundle & Broad Spectrum IV"]
            }
        ],
        "knowledge_graph": kg.to_dict()
    }
