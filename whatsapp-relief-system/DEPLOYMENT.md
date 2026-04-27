# Web Release Guide

This project is now prepared for public web deployment.

## What Can Go Public

- `server.js` can be deployed as a public web app and API.
- The dashboard will be reachable on a live HTTPS URL.
- The GPS sharing button works on HTTPS because browsers allow geolocation in secure contexts.

## What Should Stay On A Server Or Local Machine

- `index.js` is the WhatsApp bot.
- It still needs a real browser session and WhatsApp login.
- For production, run the bot on a VPS, Windows server, or always-on machine.

## Quickest Public Release: Render

The repository root now includes [render.yaml](C:\Users\Administrator\Documents\New%20project\render.yaml) so Render can deploy the dashboard/API directly.

### Steps

1. Push this project to GitHub.
2. Sign in to Render.
3. Create a new Blueprint or Web Service from the GitHub repo.
4. Render will detect [render.yaml](C:\Users\Administrator\Documents\New%20project\render.yaml).
5. Deploy the `disaster-response-dashboard` service.
6. After deploy, open:
   - `/`
   - `/api/disaster-reports`
   - `/health`

### Important Environment Values

- `HOST=0.0.0.0`
- `PORT=10000` on Render
- `DATA_DIR=/opt/render/project/src/data`

### Persistence

For a demo deploy, the app can run without a persistent disk.

For production:

1. Add a persistent disk in Render.
2. Mount it to `/opt/render/project/src/data`.
3. Keep `DATA_DIR` pointed to that mount path.

This keeps `api-reports/` and `reports/` data across restarts and deploys.

## Bot To Hosted API Connection

After your dashboard/API is live, set the bot's `API_ENDPOINT` to the public URL:

```env
API_ENDPOINT=https://your-service.onrender.com/api/disaster-reports
```

Then run the bot separately:

```bash
npm run start:bot
```

## Docker Option

This folder now includes [Dockerfile](C:\Users\Administrator\Documents\New%20project\whatsapp-relief-system\Dockerfile).

Build and run locally:

```bash
docker build -t disaster-response-dashboard .
docker run -p 3000:3000 disaster-response-dashboard
```

This starts the public dashboard/API service only.

## Notes

- The dashboard is public unless you add your own authentication.
- The GPS button opens a WhatsApp draft; it does not auto-send.
- If you expose this widely, add authentication and move JSON storage to a database.
