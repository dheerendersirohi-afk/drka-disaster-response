# Agentic Disaster Management System

This workspace contains two connected parts:

1. The DRKA MVP app in the repository root
2. The public disaster response dashboard in `whatsapp-relief-system/`

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

- [`render.yaml`](./render.yaml)
- [`whatsapp-relief-system/Dockerfile`](./whatsapp-relief-system/Dockerfile)
- [`whatsapp-relief-system/DEPLOYMENT.md`](./whatsapp-relief-system/DEPLOYMENT.md)

One-click deploy:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/dheerendersirohi-afk/drka-disaster-response)

GitHub Pages showcase:

[DRKA Showcase Site](https://dheerendersirohi-afk.github.io/drka-disaster-response/)

If you only want a web showcase and not a live backend, GitHub Pages is enough. The static showcase files are in [`docs/`](./docs).

Fastest release path:

1. Push this project to GitHub
2. Create a Render service from the repo
3. Let Render use [`render.yaml`](./render.yaml)
4. After deploy, open:
   - `/`
   - `/api/disaster-reports`
   - `/health`

## WhatsApp Bot Note

The web dashboard can be public, but the WhatsApp bot still runs separately because it needs a real WhatsApp browser session.

After the dashboard is live, point the bot to the hosted API with:

`API_ENDPOINT=https://your-live-url/api/disaster-reports`
