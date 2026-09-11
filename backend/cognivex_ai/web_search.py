"""Small dependency-free web search client for grounding assistant responses."""

from html.parser import HTMLParser
import json
from typing import Dict, List
from urllib.error import HTTPError, URLError
from urllib.parse import quote_plus, urlencode
from urllib.request import Request, urlopen


class _DuckDuckGoParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.results: List[Dict[str, str]] = []
        self._current: Dict[str, str] = {}
        self._capture: str = ""

    def handle_starttag(self, tag: str, attrs: list) -> None:
        attributes = dict(attrs)
        classes = attributes.get("class", "").split()
        if tag == "a" and "result__a" in classes:
            self._current = {"title": "", "url": attributes.get("href", ""), "snippet": ""}
            self._capture = "title"
        elif "result__snippet" in classes and self._current:
            self._capture = "snippet"

    def handle_data(self, data: str) -> None:
        if self._capture and self._current:
            self._current[self._capture] += data

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self._capture == "title" and self._current:
            self._capture = ""
        elif self._capture == "snippet" and self._current:
            result = {key: value.strip() for key, value in self._current.items()}
            if result["title"] and result["url"]:
                self.results.append(result)
                self._current = {}
            self._capture = ""


def _search_json(query: str, max_results: int) -> List[Dict[str, str]]:
    request_url = "https://api.duckduckgo.com/?" + urlencode({
        "q": query,
        "format": "json",
        "no_html": "1",
        "skip_disambig": "1",
    })
    request = Request(request_url, headers={"User-Agent": "CognivexAI/1.0 (+web-grounding)"})
    with urlopen(request, timeout=8) as response:
        data = json.loads(response.read().decode("utf-8"))

    results: List[Dict[str, str]] = []
    if data.get("AbstractText") and data.get("AbstractURL"):
        results.append({
            "title": data.get("Heading", query),
            "url": data["AbstractURL"],
            "snippet": data["AbstractText"],
        })

    def add_topics(topics: list) -> None:
        for topic in topics:
            if len(results) >= max_results:
                return
            if topic.get("FirstURL") and topic.get("Text"):
                results.append({
                    "title": topic["Text"].split(" - ")[0],
                    "url": topic["FirstURL"],
                    "snippet": topic["Text"],
                })
            elif topic.get("Topics"):
                add_topics(topic["Topics"])

    add_topics(data.get("RelatedTopics", []))
    return results[:max_results]


def _search_html(query: str, max_results: int) -> List[Dict[str, str]]:
    cleaned_query = query.strip()
    if not cleaned_query:
        return []

    request = Request(
        f"https://html.duckduckgo.com/html/?q={quote_plus(cleaned_query)}",
        headers={"User-Agent": "CognivexAI/1.0 (+web-grounding)"},
    )
    try:
        with urlopen(request, timeout=8) as response:
            html = response.read().decode("utf-8", errors="replace")
        parser = _DuckDuckGoParser()
        parser.feed(html)
        return parser.results[:max_results]
    except (HTTPError, URLError, TimeoutError, OSError, ValueError):
        return []


def search_web(query: str, max_results: int = 5) -> List[Dict[str, str]]:
    """Search DuckDuckGo without requiring an API key."""
    cleaned_query = query.strip()
    if not cleaned_query:
        return []
    try:
        results = _search_json(cleaned_query, max_results)
        if results:
            return results
    except (HTTPError, URLError, TimeoutError, OSError, ValueError, KeyError, TypeError):
        pass
    return _search_html(cleaned_query, max_results)


def format_sources(results: List[Dict[str, str]]) -> str:
    """Format search results as grounding context for a language model."""
    if not results:
        return "No web search results were available. Answer from your existing knowledge and say when you are uncertain."

    lines = ["Use these current web sources to answer the user. Cite the relevant URLs in your answer:"]
    for index, result in enumerate(results, start=1):
        lines.append(
            f"[{index}] {result['title']}\nURL: {result['url']}\nSnippet: {result['snippet']}"
        )
    return "\n\n".join(lines)
