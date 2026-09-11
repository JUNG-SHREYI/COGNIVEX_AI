"""
Industry Intelligence Domain Module
Covers: Predictive Maintenance, Bearing Vibration Harmonics, Machine Vision Safety, and Line Throughput.
"""

from typing import Dict, Any
from engine.knowledge import KnowledgeGraph

def get_industry_domain_data() -> Dict[str, Any]:
    kg = KnowledgeGraph()
    
    # Nodes
    kg.add_node("CNC_MILL_04", "5-Axis High-Torque CNC Mill #04", "ASSET", {"make": "DMG Mori", "line": "Aero-Fab 2"})
    kg.add_node("VIB_BEARING_F", "Front Spindle Ceramic Bearing", "ASSET", {"installed_hrs": 3840, "rated_hrs": 5000})
    kg.add_node("ACCEL_S1", "Tri-axial Accelerometer 10kHz", "SENSOR", {"unit": "mm/s RMS"})
    kg.add_node("THERMAL_HYD", "Hydraulic Sump Thermocouple", "SENSOR", {"unit": "°C"})
    kg.add_node("BEARING_FATIGUE", "Bearing Race Micro-Spalling & Lubrication Starvation", "ROOT_CAUSE", {"failure_mode": "Fatigue Spalling"})
    kg.add_node("THROTTLE_POLICY", "Automated RPM Throttling (15% Derate)", "INTERVENTION", {"downtime_saved_hrs": 36})
    kg.add_node("AUTO_WORKORDER", "SAP PM Auto-Purchase Requisition for Bearing Kit", "INTERVENTION", {"supplier_sla_hrs": 18})

    # Edges
    kg.add_edge("ACCEL_S1", "VIB_BEARING_F", "SENSES_VIBRATION", 0.98)
    kg.add_edge("VIB_BEARING_F", "CNC_MILL_04", "SUBSYSTEM_OF", 0.96)
    kg.add_edge("BEARING_FATIGUE", "VIB_BEARING_F", "DEGRADES", 0.94)
    kg.add_edge("THROTTLE_POLICY", "CNC_MILL_04", "PROTECTS", 0.92)
    kg.add_edge("AUTO_WORKORDER", "VIB_BEARING_F", "RESTORES", 0.95)

    return {
        "id": "industry",
        "name": "Industry Intelligence",
        "icon": "Factory",
        "tagline": "IIoT Predictive Maintenance, Harmonic Vibration & Robotic Safety Vision",
        "theme_color": "#06b6d4", # Cyan
        "sensors": [
            {"id": "ACCEL_S1", "name": "Spindle Vibration (RMS)", "unit": "mm/s", "baseline": 1.4, "current": 4.85, "status": "CRITICAL"},
            {"id": "THERMAL_HYD", "name": "Hydraulic Oil Temp", "unit": "°C", "baseline": 52.0, "current": 71.4, "status": "CRITICAL"},
            {"id": "SPINDLE_RPM", "name": "Milling Head Speed", "unit": "RPM", "baseline": 12000.0, "current": 11850.0, "status": "NOMINAL"},
            {"id": "CURRENT_DRAW", "name": "Spindle Motor Current", "unit": "Amps", "baseline": 28.0, "current": 39.6, "status": "WARNING"}
        ],
        "active_incidents": [
            {
                "id": "INC-IND-301",
                "entity": "5-Axis High-Torque CNC Mill #04 (Spindle Bearing)",
                "headline": "Harmonic Vibration Spike (4.85 mm/s) & Hydraulic Thermal Surge",
                "telemetry_summary": "Front spindle bearing vibration breached ISO 10816 Class IV critical boundary (4.85 mm/s vs 1.4 mm/s baseline). Fast Fourier Transform reveals 3.2x peak at ball pass frequency outer race (BPFO). Hydraulic temperature rose to 71.4°C.",
                "metrics_breached": ["Vibration RMS > 4.5 mm/s", "Hydraulic Sump Temp > 70°C", "Motor Amps +41%"],
                "graph_trail": ["Tri-axial Accelerometer 10kHz", "Front Spindle Ceramic Bearing", "Bearing Fatigue & Lubrication", "Automated RPM Throttling (15% Derate)"]
            },
            {
                "id": "INC-IND-302",
                "entity": "Robotic Welding Cell Safety Curtain",
                "headline": "Optical Laser Curtain Interruption During High-Speed Traverse",
                "telemetry_summary": "Vision perception flagged foreign object clearance breach 400ms prior to robotic arm extension.",
                "metrics_breached": ["Optical Perimeter Intrusion", "Clearance < 1.2m"],
                "graph_trail": ["Optical Laser Curtain", "Operator Zone Safety Violation", "Emergency Deceleration E-Stop"]
            }
        ],
        "knowledge_graph": kg.to_dict()
    }
