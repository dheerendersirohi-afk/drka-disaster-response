import streamlit as st
from streamlit.runtime.scriptrunner import get_script_run_ctx

from orchestrator import (
    get_voice_status,
    run_disaster_flow,
    test_voice_connection,
    transcribe_voice_input,
)
from relief_dashboard import render_relief_dashboard


def safe_rerun():
    if hasattr(st, "rerun"):
        st.rerun()
    else:
        st.experimental_rerun()


def apply_perplexity_style():
    st.markdown(
        """
        <style>
        :root {
            --bg: #0b1020;
            --bg-soft: #131a2f;
            --panel: #141b34;
            --panel-soft: #1a2342;
            --border: #2a355c;
            --text: #e9edff;
            --muted: #a6b0d8;
            --accent: #61a9ff;
            --success: #63d2b0;
        }
        [data-testid="stAppViewContainer"] {
            background: radial-gradient(1000px 300px at 50% -30%, #1b2a56 0%, var(--bg) 55%);
        }
        [data-testid="stSidebar"] {
            background: linear-gradient(180deg, #0d1429 0%, #0a1020 100%);
            border-right: 1px solid #1f2950;
        }
        [data-testid="stSidebar"] * {
            color: var(--text) !important;
        }
        .block-container {
            max-width: 940px;
            padding-top: 0.7rem;
            padding-bottom: 7rem;
        }
        [data-testid="stChatMessage"] {
            border: 1px solid var(--border);
            background: rgba(20, 27, 52, 0.92);
            border-radius: 16px;
            padding: 0.9rem 1rem;
            margin-bottom: 0.6rem;
            backdrop-filter: blur(4px);
        }
        [data-testid="chatAvatarIcon-user"] {
            color: #8fb9ff;
        }
        [data-testid="stChatInput"] {
            background: transparent;
            border-top: none;
        }
        [data-testid="stChatInput"] > div {
            border: 1px solid var(--border);
            border-radius: 16px;
            background: var(--panel);
        }
        .app-title {
            color: var(--text);
            font-size: 1.35rem;
            font-weight: 650;
            margin-bottom: 0.2rem;
        }
        .app-sub {
            color: var(--muted);
            font-size: 0.92rem;
            margin-bottom: 0.9rem;
        }
        .hero {
            border: 1px solid var(--border);
            border-radius: 18px;
            padding: 1.1rem;
            background: linear-gradient(180deg, #172041 0%, #121a34 100%);
        }
        .hero h3 {
            color: var(--text);
            margin: 0 0 0.2rem 0;
            font-size: 1.1rem;
        }
        .hero p {
            color: var(--muted);
            margin: 0;
            font-size: 0.9rem;
        }
        .chip {
            display: inline-block;
            border: 1px solid #33518f;
            color: #bfd1ff;
            background: rgba(45, 72, 135, 0.2);
            border-radius: 999px;
            padding: 2px 10px;
            font-size: 0.78rem;
            margin-right: 6px;
        }
        .meta {
            color: var(--muted);
            font-size: 0.78rem;
            margin-top: 0.35rem;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def append_user_message(text):
    st.session_state.messages.append({"role": "user", "content": text})


def append_assistant_result(result):
    prediction_text = (
        f"{result['risk_level'].title()} risk "
        f"(score {result['risk_score']}, confidence {result['confidence']})"
    )
    st.session_state.messages.append(
        {
            "role": "assistant",
            "summary": result["summary"],
            "prediction_text": prediction_text,
            "risk_level": result["risk_level"],
            "risk_score": result["risk_score"],
            "confidence": result["confidence"],
            "source": result["source"],
            "forecast_source": result.get("forecast_source"),
            "forecast_url": result.get("forecast_url"),
            "forecast_brief": result.get("forecast_brief"),
            "forecast_context": result.get("forecast_context", []),
            "generated_at_utc": result["generated_at_utc"],
            "advisory": result["advisory"],
            "precautions": result["precautions"],
        }
    )


def render_assistant_result(msg):
    st.markdown(f"**{msg.get('summary', 'Analysis complete.')}**")
    prediction_text = msg.get(
        "prediction_text",
        f"{msg.get('risk_level', 'Unknown').title()} risk "
        f"(score {msg.get('risk_score', 'n/a')}, confidence {msg.get('confidence', 'n/a')})",
    )
    st.markdown(f"**Prediction:** {prediction_text}")
    st.markdown(
        f"<span class='chip'>Risk: {msg.get('risk_level', 'n/a').title()}</span>"
        f"<span class='chip'>Score: {msg.get('risk_score', 'n/a')}</span>"
        f"<span class='chip'>Confidence: {msg.get('confidence', 'n/a')}</span>",
        unsafe_allow_html=True,
    )
    st.info(f"Advisory: {msg.get('advisory', 'No advisory available.')}")
    forecast_brief = msg.get("forecast_brief")
    if forecast_brief:
        st.markdown(f"**NESDIS Weather Forecast Context:** {forecast_brief}")
    forecast_items = msg.get("forecast_context", [])
    if forecast_items:
        st.markdown("NESDIS Highlights:")
        for item in forecast_items:
            st.markdown(f"- {item.get('headline', '')}")
    st.markdown("Precautions:")
    for item in msg.get("precautions", []):
        st.markdown(f"- {item}")
    st.markdown(
        f"<div class='meta'>Source: {msg.get('source', 'unknown')} | "
        f"Forecast Source: {msg.get('forecast_source', 'nesdis')} | "
        f"Generated: {msg.get('generated_at_utc', 'n/a')}</div>",
        unsafe_allow_html=True,
    )


def handle_prompt(prompt):
    append_user_message(prompt)
    with st.chat_message("assistant"):
        try:
            with st.spinner("Researching and predicting risk..."):
                result = run_disaster_flow(prompt)
            append_assistant_result(result)
            render_assistant_result(st.session_state.messages[-1])
        except Exception as exc:
            st.error(f"Analysis failed: {exc}")


def render_risk_assistant():
    st.markdown("<div class='app-title'>Disaster Assistant</div>", unsafe_allow_html=True)
    st.markdown(
        "<div class='app-sub'>Ask focused questions and get risk predictions with actionable guidance.</div>",
        unsafe_allow_html=True,
    )

    if not st.session_state.messages:
        st.markdown(
            "<div class='hero'><h3>What do you want to investigate?</h3>"
            "<p>Try: Is there flood risk in Noida this week? | Heatwave risk in Delhi tomorrow?</p></div>",
            unsafe_allow_html=True,
        )

    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            if msg["role"] == "user":
                st.markdown(msg["content"])
            else:
                render_assistant_result(msg)

    prompt = st.chat_input("Ask a disaster-risk question...")
    if prompt:
        handle_prompt(prompt)
        safe_rerun()


def render_sidebar():
    st.sidebar.markdown("### Disaster Research")
    if st.sidebar.button("+ New Thread", use_container_width=True):
        st.session_state.messages = []
        safe_rerun()

    st.sidebar.caption("Perplexity-inspired interface")
    st.sidebar.markdown("---")

    with st.sidebar.expander("Voice (Sarvam AI)", expanded=True):
        voice_status = get_voice_status()
        if voice_status["ready"]:
            st.success(voice_status["message"])
        else:
            st.warning(voice_status["message"])

        if st.button("Test Sarvam Connection", use_container_width=True, disabled=not voice_status["ready"]):
            with st.spinner("Testing..."):
                test_result = test_voice_connection()
            if test_result.get("ok"):
                st.success(f"Connected. Request ID: {test_result.get('request_id', 'n/a')}")
            else:
                st.error(test_result.get("error", "Sarvam connectivity test failed."))

        lang = st.selectbox("Voice language", options=["en-IN", "hi-IN"], index=0)
        voice_clip = None
        audio_input_supported = hasattr(st, "audio_input")
        if audio_input_supported:
            voice_clip = st.audio_input("Record your question")
        else:
            st.info("This Streamlit version does not support `audio_input`.")

        if st.button(
            "Analyze Recorded Voice",
            use_container_width=True,
            disabled=(voice_clip is None or not voice_status["ready"] or not audio_input_supported),
        ):
            with st.spinner("Transcribing..."):
                transcribed = transcribe_voice_input(
                    audio_bytes=voice_clip.getvalue(),
                    mime_type=getattr(voice_clip, "type", None),
                    language_code=lang,
                )
            if transcribed.get("ok"):
                transcript = transcribed["transcript"]
                st.success(f"Transcript: {transcript}")
                if transcribed.get("request_id"):
                    st.caption(f"Request ID: {transcribed['request_id']}")
                handle_prompt(transcript)
                safe_rerun()
            else:
                st.error(transcribed.get("error", "Voice transcription failed."))
                if transcribed.get("request_id"):
                    st.caption(f"Request ID: {transcribed['request_id']}")


def run_streamlit_app():
    st.set_page_config(page_title="Disaster Assistant", layout="wide")
    apply_perplexity_style()

    if "messages" not in st.session_state:
        st.session_state.messages = []

    render_sidebar()
    assistant_tab, relief_tab = st.tabs(["Risk Assistant", "Relief Dashboard"])

    with assistant_tab:
        render_risk_assistant()

    with relief_tab:
        render_relief_dashboard()


def run_cli_fallback():
    query = "Is there a flood risk in Noida?"
    result = run_disaster_flow(query)
    print("Run this UI with: streamlit run app.py")
    print("Query:", query)
    print("Response:", result["summary"])
    print("Risk Level:", result["risk_level"])
    print("Risk Score:", result["risk_score"])
    print("Confidence:", result["confidence"])
    print("Source:", result["source"])
    print("Forecast Source:", result.get("forecast_source"))
    print("Forecast Brief:", result.get("forecast_brief"))
    print("Advisory:", result["advisory"])


if get_script_run_ctx(suppress_warning=True) is not None:
    run_streamlit_app()
elif __name__ == "__main__":
    run_cli_fallback()
