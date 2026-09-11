"""
Cognivex Perception Layer
Multimodal ingestion: Time-series IoT sensors, Documents, Computer Vision flags, and API streams.
Normalizes incoming signals and prepares perceptual tokens for the Cognivex Transformer.
"""

import time
import math
from typing import Dict, Any, List, Optional

class PerceptionLayer:
    def __init__(self):
        self.sensor_baselines: Dict[str, Dict[str, float]] = {}

    def register_sensor(self, sensor_id: str, mean: float, std: float, unit: str):
        self.sensor_baselines[sensor_id] = {
            "mean": mean,
            "std": std,
            "unit": unit
        }

    def process_telemetry(self, sensor_id: str, current_value: float, timestamp: Optional[float] = None) -> Dict[str, Any]:
        """Calculates z-score deviation, anomaly status, and normalized signal."""
        baseline = self.sensor_baselines.get(sensor_id, {"mean": current_value, "std": 1.0, "unit": ""})
        mean = baseline["mean"]
        std = max(baseline["std"], 0.001)
        z_score = (current_value - mean) / std
        
        is_breach = abs(z_score) > 2.0
        pct_deviation = ((current_value - mean) / mean * 100) if mean != 0 else 0
        
        return {
            "sensor_id": sensor_id,
            "value": round(current_value, 2),
            "unit": baseline.get("unit", ""),
            "mean": round(mean, 2),
            "z_score": round(z_score, 2),
            "pct_deviation": round(pct_deviation, 1),
            "is_breach": is_breach,
            "timestamp": timestamp or time.time()
        }

    def process_document(self, title: str, text_content: str, source_type: str = "report") -> Dict[str, Any]:
        """Extracts key sentences, length, and extracts critical keywords."""
        words = text_content.split()
        summary_tokens = [w.strip(".,;:!?()[]\"'").lower() for w in words if len(w) > 4]
        return {
            "title": title,
            "source_type": source_type,
            "word_count": len(words),
            "key_tokens": summary_tokens[:20],
            "raw_snippet": text_content[:240] + ("..." if len(text_content) > 240 else "")
        }

    def process_vision_frame(self, camera_id: str, detected_objects: List[Dict[str, Any]], frame_anomaly_score: float) -> Dict[str, Any]:
        """Normalizes visual inspection metadata from edge camera inferences."""
        return {
            "camera_id": camera_id,
            "objects_count": len(detected_objects),
            "objects": detected_objects,
            "visual_anomaly_score": round(frame_anomaly_score, 3),
            "safety_hazard": frame_anomaly_score > 0.7
        }
