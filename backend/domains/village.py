"""
Village Intelligence Domain Module
Covers: Precision Agriculture, Borewell Water Grid, Crop Pathology, and Rural Governance.
"""

from typing import Dict, Any, List
from engine.knowledge import KnowledgeGraph

def get_village_domain_data() -> Dict[str, Any]:
    # Build Topological Knowledge Graph
    kg = KnowledgeGraph()
    
    # Nodes
    kg.add_node("WELL_04", "Borewell Pump #04", "SENSOR", {"depth_m": 85, "zone": "North Aquifer"})
    kg.add_node("AQUIFER_N", "Deep Fractured Rock Aquifer", "ASSET", {"capacity_m3": 450000})
    kg.add_node("FARM_SECTOR_A", "Paddy & Maize Sector A", "ASSET", {"area_acres": 120})
    kg.add_node("SOIL_CLUSTER_02", "Soil Moisture Node #02", "SENSOR", {"cluster": "Block B"})
    kg.add_node("BLIGHT_FUNGAL", "Helminthosporium Leaf Blight", "ROOT_CAUSE", {"type": "Pathogen"})
    kg.add_node("RECHARGING_PIT", "Community Rain Recharging Pit", "ASSET", {"status": "Functional"})
    kg.add_node("DRONE_SPRAY", "Subsidized Biocide Drone Squad", "INTERVENTION", {"fleet_size": 3})
    kg.add_node("IRRIG_SCHEDULE", "Dynamic Low-Drawdown Irrigation Shift", "INTERVENTION", {"policy_id": "VIL-WAT-09"})
    
    # Edges
    kg.add_edge("WELL_04", "AQUIFER_N", "EXTRACTS_FROM", 0.95)
    kg.add_edge("AQUIFER_N", "FARM_SECTOR_A", "SUSTAINS", 0.88)
    kg.add_edge("SOIL_CLUSTER_02", "FARM_SECTOR_A", "MONITORS", 0.90)
    kg.add_edge("BLIGHT_FUNGAL", "FARM_SECTOR_A", "INFECTS", 0.82)
    kg.add_edge("DRONE_SPRAY", "BLIGHT_FUNGAL", "MITIGATES", 0.94)
    kg.add_edge("IRRIG_SCHEDULE", "AQUIFER_N", "PRESERVES", 0.91)

    return {
        "id": "village",
        "name": "Village Intelligence",
        "icon": "Wheat",
        "tagline": "Agri-telemetry, Groundwater Hydrology & Rural Governance",
        "theme_color": "#10b981", # Emerald
        "sensors": [
            {"id": "WELL_04", "name": "Borewell-04 Water Depth", "unit": "meters", "baseline": 62.0, "current": 78.4, "status": "CRITICAL"},
            {"id": "SOIL_CLUSTER_02", "name": "Sector A Soil Moisture", "unit": "% VWC", "baseline": 34.0, "current": 18.2, "status": "WARNING"},
            {"id": "WEATHER_HUMID", "name": "Microclimate Humidity", "unit": "% RH", "baseline": 65.0, "current": 89.5, "status": "ELEVATED"},
            {"id": "PAN_SOLAR_KW", "name": "Gram Panchayat Solar Grid", "unit": "kW", "baseline": 48.0, "current": 46.2, "status": "NOMINAL"}
        ],
        "active_incidents": [
            {
                "id": "INC-VIL-201",
                "entity": "Borewell Pump #04 (North Aquifer)",
                "headline": "Borewell-04 Drawdown Collapse & Soil Moisture Deficit",
                "telemetry_summary": "Water depth dropped past critical 78m mark. Soil moisture fell below 20% VWC while relative humidity jumped to 89.5% favoring fungal incubation.",
                "metrics_breached": ["Aquifer Drawdown > 2.6σ", "Soil Moisture < 19%", "Humidity Spike 89.5% RH"],
                "graph_trail": ["Borewell Pump #04", "Deep Fractured Rock Aquifer", "Groundwater Aquifer Depletion", "Helminthosporium Leaf Blight", "Subsidized Biocide Drone Squad"]
            },
            {
                "id": "INC-VIL-202",
                "entity": "Gram Panchayat Well Grid #12",
                "headline": "Well Salinity Infiltration Warning",
                "telemetry_summary": "Total dissolved solids in drinking reservoir climbed by 28% following dry-season drawdowns.",
                "metrics_breached": ["TDS Spike 740 ppm (Threshold: 500 ppm)"],
                "graph_trail": ["Well Grid #12", "Salinity Intrusion", "Panchayat RO Filter"]
            }
        ],
        "knowledge_graph": kg.to_dict()
    }
