import streamlit as st
from orchestrator import run_disaster_flow

st.set_page_config(page_title="AI Disaster Agent", layout="wide")
st.title("🛡️ Universal Disaster Management Agent")

with st.sidebar:
    st.header("Agent Execution Logs")
    log_area = st.empty()

if prompt := st.chat_input("Ask about disaster risks (e.g., 'Is there a flood risk in Noida?')"):
    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):
        with st.spinner("Agents are analyzing data..."):
            log_area.code("Step 1: Processing Voice/Text\nStep 2: Translating via Sarvam\nStep 3: Scraping NOAA Data...")
            response, advisory = run_disaster_flow(prompt)
            st.markdown(f"### ⚠️ Status Update\n{response}")
            st.info(f"**Advisory:** {advisory}")
