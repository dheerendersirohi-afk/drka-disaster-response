from agents import DisasterAgents


def run_disaster_flow(user_input: str):
    agents = DisasterAgents()
    state = {"query": user_input}

    # 1. Translate
    state["english_query"] = agents.translate_query(user_input)

    # 2. Fetch Data
    state["raw_data"] = agents.fetch_noaa_data(state["english_query"])
    state["forecast_data"] = agents.fetch_nesdis_weather_forecast(state["english_query"])

    # 3. Predict
    state["risk_score"] = agents.predict_risk(state["raw_data"])

    # 4. Final Response
    return agents.generate_final_response(state)


def transcribe_voice_input(audio_bytes: bytes, mime_type: str | None = None, language_code: str = "en-IN"):
    agents = DisasterAgents()
    return agents.transcribe_audio(audio_bytes=audio_bytes, mime_type=mime_type, language_code=language_code)


def get_voice_status():
    agents = DisasterAgents()
    return agents.voice_status()


def test_voice_connection():
    agents = DisasterAgents()
    return agents.validate_voice_connection()


if __name__ == "__main__":
    sample_query = "Is there a flood risk in Noida?"
    result = run_disaster_flow(sample_query)
    print("Query:", sample_query)
    print("Response:", result["summary"])
    print("Risk Level:", result["risk_level"])
    print("Risk Score:", result["risk_score"])
    print("Confidence:", result["confidence"])
    print("Source:", result["source"])
    print("Forecast Source:", result.get("forecast_source"))
    print("Forecast Brief:", result.get("forecast_brief"))
    print("Advisory:", result["advisory"])
    print("Precautions:")
    for idx, item in enumerate(result["precautions"], start=1):
        print(f"  {idx}. {item}")
