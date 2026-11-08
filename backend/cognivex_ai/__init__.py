"""
Cognivex AI Package
Proprietary Causal Neural Architecture & Language Intelligence
"""

__all__ = ["CognivexTokenizer", "CognivexModel", "CognivexEngine", "CAUSAL_CLASSES", "ACTION_CLASSES"]


def __getattr__(name):
	if name == "CognivexTokenizer":
		from .tokenizer import CognivexTokenizer
		return CognivexTokenizer
	if name == "CognivexModel":
		from .model import CognivexModel
		return CognivexModel
	if name == "CognivexEngine":
		from .engine import CognivexEngine
		return CognivexEngine
	if name == "CAUSAL_CLASSES":
		from .weights import CAUSAL_CLASSES
		return CAUSAL_CLASSES
	if name == "ACTION_CLASSES":
		from .weights import ACTION_CLASSES
		return ACTION_CLASSES
	raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
