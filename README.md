# Agentic Disaster Management System

This workspace contains two connected parts:

1. The DRKA MVP app in the repository root
2. The public disaster response dashboard in [whatsapp-relief-system](C:\Users\Administrator\Documents\New%20project\whatsapp-relief-system)

## DRKA MVP

1. Install requirements:
   `pip install -r requirements.txt`
2. Create `.env` from `.env.example` and set:
   `SARVAM_API_KEY=your_key_here`
3. Run the app:
   `streamlit run app.py`
4. Open:
   `http://localhost:8501`

## Voice Input (Sarvam AI)

1. Open the sidebar section `Voice Input`.
2. Confirm status shows `Sarvam voice transcription is configured.`
3. Pick language (`en-IN` or `hi-IN`), record your question, then click `Analyze Recorded Voice`.
4. The transcript is passed to the same disaster-risk analysis pipeline.

## Public Web Release

The disaster response dashboard/API is already prepared for web deployment.

Main release files:

- [render.yaml](C:\Users\Administrator\Documents\New%20project\render.yaml)
- [Dockerfile](C:\Users\Administrator\Documents\New%20project\whatsapp-relief-system\Dockerfile)
- [DEPLOYMENT.md](C:\Users\Administrator\Documents\New%20project\whatsapp-relief-system\DEPLOYMENT.md)

Fastest release path:

1. Push this project to GitHub
2. Create a Render service from the repo
3. Let Render use [render.yaml](C:\Users\Administrator\Documents\New%20project\render.yaml)
4. After deploy, open:
   - `/`
   - `/api/disaster-reports`
   - `/health`

## WhatsApp Bot Note

The web dashboard can be public, but the WhatsApp bot still runs separately because it needs a real WhatsApp browser session.

After the dashboard is live, point the bot to the hosted API with:

`API_ENDPOINT=https://your-live-url/api/disaster-reports`
