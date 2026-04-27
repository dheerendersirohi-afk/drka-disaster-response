from agents import DisasterAgents

def run_disaster_flow(user_input: str):
    agents = DisasterAgents()
    state = {"query": user_input}
    
    # 1. Translate
    state['english_query'] = agents.translate_query(user_input)
    
    # 2. Fetch Data
    state['raw_data'] = agents.fetch_noaa_data(state['english_query'])
    
    # 3. Predict
    state['risk_score'] = agents.predict_risk(state['raw_data'])
    
    # 4. Final Response
    return agents.generate_final_response(state)
