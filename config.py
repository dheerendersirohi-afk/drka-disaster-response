import os
from dotenv import load_dotenv

# Load environment variables from a local .env file if present.
load_dotenv()

# Configuration for API Keys and Endpoints
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "").strip()
NOAA_URL = "https://www.nesdis.noaa.gov/news/how-reliable-are-weather-forecasts"
MODEL_PATH = "models/risk_predictor.pkl"


if __name__ == "__main__":
    key_set = bool(SARVAM_API_KEY)
    masked_key = f"{SARVAM_API_KEY[:4]}..." if key_set and len(SARVAM_API_KEY) >= 4 else "Not set"

    print("Configuration Check")
    print("SARVAM_API_KEY set:", key_set)
    print("SARVAM_API_KEY preview:", masked_key)
    print("NOAA_URL:", NOAA_URL)
    print("MODEL_PATH:", MODEL_PATH)
    if not key_set:
        print("Set SARVAM_API_KEY in environment or .env file to enable Sarvam features.")
