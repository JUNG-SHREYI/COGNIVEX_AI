"""
Smart City Intelligence Domain Module
Covers: Dynamic Traffic Ingress, Electrical Substation Grid Load, and Stormwater Drainage.
"""

from typing import Dict, Any
from engine.knowledge import KnowledgeGraph

def get_smart_city_domain_data() -> Dict[str, Any]:
    kg = KnowledgeGraph()
    
    # Nodes
    kg.add_node("SUBSTATION_4B", "Metropolitan 220kV Substation #4B", "ASSET", {"rated_mva": 180})
    kg.add_node("TRANSFORMER_T2", "Step-Down Oil-Immersed Transformer T2", "ASSET", {"oil_temp_c": 78})
    kg.add_node("GRID_FREQ_SENSOR", "Synchrophasor PMU Sensor", "SENSOR", {"rate_hz": 60})
    kg.add_node("TRAFFIC_CAM_CORR_8", "Arterial Corridor 8 LiDAR & Optical", "SENSOR", {"flow_vph": 4200})
    kg.add_node("SUBSTATION_IMBALANCE", "Substation Peak Phase Imbalance & Thermal Saturation", "ROOT_CAUSE", {"phase": "B-Phase Surge"})
    kg.add_node("DYNAMIC_REROUTE", "Adaptive Traffic Signal Timing & Navigation Reroute", "INTERVENTION", {"delay_reduction_pct": 24})
    kg.add_node("GRID_LOAD_SHED", "Feeder Automated Selective Load Shedding", "INTERVENTION", {"shed_mw": 14.5})

    # Edges
    kg.add_edge("GRID_FREQ_SENSOR", "SUBSTATION_4B", "MONITORS", 0.97)
    kg.add_edge("TRAFFIC_CAM_CORR_8", "DYNAMIC_REROUTE", "TRIGGERS", 0.93)
    kg.add_edge("SUBSTATION_IMBALANCE", "TRANSFORMER_T2", "OVERHEATS", 0.95)
    kg.add_edge("GRID_LOAD_SHED", "SUBSTATION_IMBALANCE", "RELIEVES", 0.96)

    return {
        "id": "smart_city",
        "name": "Smart City Intelligence",
        "icon": "Building2",
        "tagline": "Dynamic Traffic Signal Optimization, Electrical Grid & Stormwater Flood Control",
        "theme_color": "#f59e0b", # Amber
        "sensors": [
            {"id": "GRID_FREQ", "name": "Grid Frequency Deviation", "unit": "Hz", "baseline": 50.0, "current": 49.62, "status": "CRITICAL"},
            {"id": "TRANSFORMER_LOAD", "name": "Substation 4B Thermal Load", "unit": "% Capacity", "baseline": 68.0, "current": 94.2, "status": "CRITICAL"},
            {"id": "TRAFFIC_CONGESTION", "name": "Corridor 8 Congestion Index", "unit": "Index (0-10)", "baseline": 3.2, "current": 8.7, "status": "CRITICAL"},
            {"id": "STORM_WATER_PUMP", "name": "Drainage Sump Level", "unit": "Meters", "baseline": 1.2, "current": 3.8, "status": "WARNING"}
        ],
        "active_incidents": [
            {
                "id": "INC-CTY-501",
                "entity": "Metropolitan 220kV Substation #4B (Transformer T2)",
                "headline": "Substation 4B 94.2% Peak Load Saturation & Grid Frequency Drop (49.62 Hz)",
                "telemetry_summary": "Thermal imaging and synchrophasor PMU detect severe phase imbalance on feeder circuit 12. Combined heatwave cooling load threatens cascade trip across urban district.",
                "metrics_breached": ["Transformer Load > 90%", "Frequency Drop < 49.7 Hz", "Phase Imbalance 8.4%"],
                "graph_trail": ["Synchrophasor PMU Sensor", "Metropolitan 220kV Substation #4B", "Substation Peak Phase Imbalance", "Feeder Automated Selective Load Shedding"]
            }
        ],
        "knowledge_graph": kg.to_dict()
    }
