import os
import sys
from io import BytesIO
from contextlib import contextmanager
from datetime import datetime, timezone
from urllib.parse import urljoin
import re
import io
import wave
import struct
import math

import requests
from bs4 import BeautifulSoup

from config import NOAA_URL

try:
    from langchain_sarvamcloud import SarvamSTT, ChatSarvam  # noqa: F401
except ImportError:
    SarvamSTT = None
    ChatSarvam = None

class DisasterAgents:
    @contextmanager
    def _without_proxy_env(self):
        proxy_keys = [
            "HTTP_PROXY",
            "HTTPS_PROXY",
            "ALL_PROXY",
            "http_proxy",
            "https_proxy",
            "all_proxy",
        ]
        original = {k: os.environ.get(k) for k in proxy_keys}
        try:
            for key in proxy_keys:
                os.environ.pop(key, None)
            yield
        finally:
            for key, value in original.items():
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value

    def translate_query(self, text):
        # Placeholder for Sarvam Translation
        return text

    def fetch_noaa_data(self, query):
        # Default to reliable offline data so local runs work without network/proxy setup.
        if os.getenv("DISASTER_USE_ONLINE_DATA", "0") != "1":
            return {
                "content": "Default climate data (offline mode)",
                "source": "offline-fallback",
            }

        url = NOAA_URL
        try:
            with self._without_proxy_env():
                res = requests.get(url, timeout=5)
            res.raise_for_status()
            soup = BeautifulSoup(res.text, "html.parser")
            return {"content": soup.get_text()[:500], "source": "noaa"}
        except Exception as e:
            # Keep runtime clean unless explicit debugging is requested.
            if os.getenv("DISASTER_DEBUG", "0") == "1":
                print("Error fetching NOAA data:", e)
            return {
                "content": "Default climate data (network unavailable)",
                "source": "offline-fallback",
            }

    def fetch_nesdis_weather_forecast(self, query):
        url = "https://www.nesdis.noaa.gov/news-events/search-news?page=0"
        keywords = {
            "weather",
            "storm",
            "flood",
            "rain",
            "snow",
            "heat",
            "hurricane",
            "cyclone",
            "cold",
            "wind",
            "forecast",
            "drought",
            "wildfire",
        }
        q = (query or "").lower()
        stopwords = {
            "is",
            "there",
            "the",
            "a",
            "an",
            "in",
            "on",
            "of",
            "for",
            "to",
            "and",
            "risk",
            "noida",
        }
        query_tokens = {t for t in q.replace("?", " ").split() if len(t) >= 4 and t not in stopwords}
        match_terms = keywords.union(query_tokens)

        try:
            with self._without_proxy_env():
                res = requests.get(url, timeout=8)
            res.raise_for_status()
            soup = BeautifulSoup(res.text, "html.parser")
            candidates = []
            for tag in soup.find_all("a"):
                headline = " ".join(tag.get_text(" ", strip=True).split())
                if len(headline) < 20 or len(headline) > 180:
                    continue
                low = headline.lower()
                # Drop artifacts like standalone negative numeric tokens (e.g., "-13").
                if re.search(r"\b-\d+\b", headline):
                    continue
                if "official website" in low or "here's how you know" in low:
                    continue
                if any(ch.isdigit() for ch in headline) and "hurricane" not in low:
                    continue
                if not any(term in low for term in match_terms):
                    continue
                href = tag.get("href", "")
                link = urljoin("https://www.nesdis.noaa.gov", href)
                candidates.append(
                    {
                        "headline": headline,
                        "context": headline,
                        "url": link,
                    }
                )

            dedup = []
            seen = set()
            for item in candidates:
                head = item["headline"].lower()
                if head not in seen:
                    dedup.append(item)
                    seen.add(head)
                if len(dedup) >= 3:
                    break

            if not dedup:
                return {
                    "source": "nesdis-search-news",
                    "items": [],
                    "brief": "No weather forecast highlights found on NESDIS search page.",
                }

            brief = "; ".join([re.sub(r"\b-\d+\b", "", it["headline"]).strip() for it in dedup]).strip("; ")
            return {
                "source": "nesdis-search-news",
                "items": dedup,
                "brief": brief,
                "url": url,
            }
        except Exception as exc:
            if os.getenv("DISASTER_DEBUG", "0") == "1":
                print("Error fetching NESDIS weather forecast:", exc)
            return {
                "source": "nesdis-search-news",
                "items": [],
                "brief": "NESDIS weather forecast feed unavailable; using baseline risk estimation.",
                "url": url,
            }

    def predict_risk(self, data):
        # Placeholder for ML model output in [0.0, 1.0].
        return 0.75

    def transcribe_audio(self, audio_bytes, mime_type=None, language_code="en-IN"):
        if not audio_bytes:
            return {"ok": False, "error": "No audio was recorded."}

        if SarvamSTT is None:
            return {
                "ok": False,
                "error": "Voice transcription is unavailable. Install `langchain-sarvamcloud`.",
            }

        api_key = os.getenv("SARVAM_API_KEY", "").strip()
        if not api_key:
            return {
                "ok": False,
                "error": "Set SARVAM_API_KEY in your .env file to enable voice transcription.",
            }

        extension = "wav"
        if mime_type == "audio/webm":
            extension = "webm"
        elif mime_type == "audio/mp4":
            extension = "mp4"
        elif mime_type == "audio/mpeg":
            extension = "mp3"

        try:
            with self._without_proxy_env():
                stt = SarvamSTT(
                    model="saaras:v3",
                    mode="transcribe",
                    language_code=language_code,
                    api_subscription_key=api_key,
                )
                audio_file = BytesIO(audio_bytes)
                audio_file.name = f"voice_input.{extension}"
                result = stt.transcribe(audio_file, language_code=language_code)
            transcript = str(result.get("transcript", "")).strip()
            request_id = result.get("request_id")

            if not transcript:
                return {
                    "ok": False,
                    "error": (
                        "Could not transcribe this recording. Ensure microphone permission is enabled in Chrome "
                        "and speak clearly for 2-5 seconds."
                    ),
                    "request_id": request_id,
                }

            return {
                "ok": True,
                "transcript": transcript,
                "language_code": result.get("language_code"),
                "engine": "sarvam-stt",
                "request_id": request_id,
            }
        except Exception as exc:
            return {
                "ok": False,
                "error": f"Voice transcription failed: {exc}",
            }

    def voice_status(self):
        api_key = os.getenv("SARVAM_API_KEY", "").strip()
        if SarvamSTT is None:
            return {
                "ready": False,
                "message": "Missing dependency: install `langchain-sarvamcloud`.",
            }
        if not api_key:
            return {
                "ready": False,
                "message": "Missing SARVAM_API_KEY in .env.",
            }
        return {
            "ready": True,
            "message": "Sarvam voice transcription is configured.",
        }

    def validate_voice_connection(self):
        if SarvamSTT is None:
            return {"ok": False, "error": "Missing dependency: install `langchain-sarvamcloud`."}

        api_key = os.getenv("SARVAM_API_KEY", "").strip()
        if not api_key:
            return {"ok": False, "error": "Missing SARVAM_API_KEY in .env."}

        # Build a short synthetic WAV clip as a lightweight connectivity check.
        fr = 16000
        duration = 0.3
        frequency = 440
        buf = io.BytesIO()
        wav = wave.open(buf, "wb")
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(fr)
        for n in range(int(fr * duration)):
            wav.writeframesraw(struct.pack("<h", int(2500 * math.sin(2 * math.pi * frequency * n / fr))))
        wav.close()
        clip = io.BytesIO(buf.getvalue())
        clip.name = "sarvam_probe.wav"

        try:
            with self._without_proxy_env():
                stt = SarvamSTT(
                    model="saaras:v3",
                    mode="transcribe",
                    language_code="en-IN",
                    api_subscription_key=api_key,
                )
                result = stt.transcribe(clip, language_code="en-IN")
            return {
                "ok": True,
                "request_id": result.get("request_id"),
                "language_code": result.get("language_code"),
            }
        except Exception as exc:
            return {"ok": False, "error": f"Sarvam connectivity check failed: {exc}"}

    def _risk_level(self, risk_score):
        if risk_score < 0.35:
            return "low"
        if risk_score < 0.7:
            return "moderate"
        return "high"

    def _confidence_score(self, state):
        source = state["raw_data"].get("source", "unknown")
        forecast_items = state.get("forecast_data", {}).get("items", [])
        base = 0.55 if source == "offline-fallback" else 0.75
        if forecast_items:
            base = min(base + 0.1, 0.9)
        score_distance = abs(state["risk_score"] - 0.5)
        confidence = base + min(score_distance, 0.3)
        return round(min(confidence, 0.95), 2)

    def _precautions_for_query(self, query, risk_level):
        q = query.lower()
        if "flood" in q:
            precautions = [
                "Keep emergency supplies and drinking water for at least 48 hours.",
                "Avoid low-lying roads and underpasses during heavy rain.",
                "Keep phones charged and emergency contacts accessible.",
            ]
        elif "heat" in q or "heatwave" in q:
            precautions = [
                "Limit outdoor exposure during peak afternoon heat.",
                "Hydrate regularly and check on vulnerable neighbors.",
                "Use cooling shelters if indoor spaces become unsafe.",
            ]
        else:
            precautions = [
                "Monitor official weather alerts for your location.",
                "Prepare a basic emergency kit and communication plan.",
                "Follow local authority advisories promptly.",
            ]

        if risk_level == "high":
            precautions.insert(0, "Consider early evacuation planning if local warnings escalate.")
        return precautions

    def generate_final_response(self, state):
        risk_level = self._risk_level(state["risk_score"])
        confidence = self._confidence_score(state)
        precautions = self._precautions_for_query(state["english_query"], risk_level)

        advisory = {
            "low": "Continue monitoring local updates; immediate disruption risk appears limited.",
            "moderate": "Stay prepared and follow local weather updates closely.",
            "high": "Take immediate precautions and be ready to act on evacuation or safety instructions.",
        }[risk_level]

        return {
            "query": state["query"],
            "translated_query": state["english_query"],
            "risk_score": round(state["risk_score"], 2),
            "risk_level": risk_level,
            "confidence": confidence,
            "advisory": advisory,
            "precautions": precautions,
            "source": state["raw_data"].get("source", "unknown"),
            "forecast_source": state.get("forecast_data", {}).get("source", "nesdis"),
            "forecast_url": state.get("forecast_data", {}).get("url", "https://www.nesdis.noaa.gov/"),
            "forecast_brief": state.get("forecast_data", {}).get("brief", ""),
            "forecast_context": state.get("forecast_data", {}).get("items", []),
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "summary": (
                f"Analysis complete for {state['english_query']}. "
                f"Estimated risk level is {risk_level} (score {state['risk_score']:.2f})."
            ),
        }


def run_local_demo(user_input: str):
    agents = DisasterAgents()
    state = {"query": user_input}
    state["english_query"] = agents.translate_query(user_input)
    state["raw_data"] = agents.fetch_noaa_data(state["english_query"])
    state["risk_score"] = agents.predict_risk(state["raw_data"])
    return agents.generate_final_response(state)


if __name__ == "__main__":
    query = " ".join(sys.argv[1:]).strip() or "Is there a flood risk in Noida?"
    result = run_local_demo(query)
    print("Query:", query)
    print("Response:", result["summary"])
    print("Risk Level:", result["risk_level"])
    print("Risk Score:", result["risk_score"])
    print("Confidence:", result["confidence"])
    print("Source:", result["source"])
    print("Advisory:", result["advisory"])
