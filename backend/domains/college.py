"""
College Intelligence Domain Module
Covers: Student Academic Early Warning, Mastery Graphs, Retention Trajectory, and Campus Energy.
"""

from typing import Dict, Any
from engine.knowledge import KnowledgeGraph

def get_college_domain_data() -> Dict[str, Any]:
    kg = KnowledgeGraph()
    
    # Nodes
    kg.add_node("COHORT_CS_S4", "CS Sophomore Cohort S4", "ASSET", {"students": 140})
    kg.add_node("MATH_202", "Multivariate Calculus & Linear Algebra", "ASSET", {"credits": 4})
    kg.add_node("LMS_PORTAL", "Canvas LMS Engagement Stream", "SENSOR", {"avg_logins_wk": 14})
    kg.add_node("ATTENDANCE_RFID", "Lecture Hall RFID Gate Scanner", "SENSOR", {"threshold_pct": 75})
    kg.add_node("MATH_DEFICIT", "Foundational Linear Algebra Prerequisite Gap", "ROOT_CAUSE", {"impact": "High"})
    kg.add_node("SERVER_BLDG_E", "Campus Server Room Sub-station", "ASSET", {"cooling_tons": 24})
    kg.add_node("PEER_TUTOR_PGM", "Remedial Peer Tutoring & Workshop", "INTERVENTION", {"success_rate": 0.89})
    kg.add_node("DYNAMIC_HVAC", "Automated Peak Demand Power Shaving", "INTERVENTION", {"kw_reduction": 35})

    # Edges
    kg.add_edge("ATTENDANCE_RFID", "COHORT_CS_S4", "TRACKS", 0.92)
    kg.add_edge("LMS_PORTAL", "MATH_202", "METRICS_FOR", 0.86)
    kg.add_edge("MATH_DEFICIT", "COHORT_CS_S4", "JEOPARDIZES", 0.88)
    kg.add_edge("PEER_TUTOR_PGM", "MATH_DEFICIT", "RESOLVES", 0.93)
    kg.add_edge("SERVER_BLDG_E", "DYNAMIC_HVAC", "MANAGED_BY", 0.87)

    return {
        "id": "college",
        "name": "College Intelligence",
        "icon": "GraduationCap",
        "tagline": "Student Mastery Pathways, Early Dropout Intervention & Campus Energy",
        "theme_color": "#6366f1", # Indigo
        "sensors": [
            {"id": "ATTENDANCE_RFID", "name": "Cohort S4 Lecture Attendance", "unit": "%", "baseline": 84.0, "current": 66.5, "status": "CRITICAL"},
            {"id": "LMS_SUBMISSIONS", "name": "Calculus Problem Set Completion", "unit": "%", "baseline": 91.0, "current": 54.0, "status": "CRITICAL"},
            {"id": "SERVER_THERMAL", "name": "Dept Server Room Temp", "unit": "°C", "baseline": 21.0, "current": 29.8, "status": "WARNING"},
            {"id": "CAMPUS_GRID_KW", "name": "Sub-station Engineering Load", "unit": "kW", "baseline": 180.0, "current": 245.0, "status": "WARNING"}
        ],
        "active_incidents": [
            {
                "id": "INC-COL-101",
                "entity": "CS Sophomore Cohort S4 (Calculus Core)",
                "headline": "Calculus Academic Dropout Risk Surge in Cohort S4",
                "telemetry_summary": "Lecture attendance collapsed to 66.5% while problem set completion plunged to 54%. Predictive model flags 26 students at imminent risk of course failure before mid-term cutoff.",
                "metrics_breached": ["Attendance < 70% threshold", "LMS Problem Set Completion -37% vs Baseline"],
                "graph_trail": ["Lecture Hall RFID Gate Scanner", "CS Sophomore Cohort S4", "Academic Conceptual Deficit", "Remedial Peer Tutoring & Workshop"]
            },
            {
                "id": "INC-COL-102",
                "entity": "Campus Server Room Sub-station",
                "headline": "Thermal Runaway & HVAC Compressor Stalling",
                "telemetry_summary": "Server room ambient temperature spiked to 29.8°C with power draw reaching 245 kW.",
                "metrics_breached": ["Ambient Temp > 26°C", "Power Spike +36%"],
                "graph_trail": ["Server Room Sub-station", "Thermal / Energy Grid Overload", "Automated Peak Demand Power Shaving"]
            }
        ],
        "knowledge_graph": kg.to_dict()
    }
