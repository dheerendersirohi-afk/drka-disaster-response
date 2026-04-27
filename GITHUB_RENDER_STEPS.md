# GitHub And Render Steps

## 1. Create A GitHub Repository

Use a new empty GitHub repository, for example:

- `drka-disaster-response`

Do not upload:

- `.env`
- WhatsApp auth folders
- local report backup JSON files
- `node_modules`

The repository-level [.gitignore](C:\Users\Administrator\Documents\New%20project\.gitignore) now covers those.

## 2. Push This Project

Run these commands in the root folder:

```bash
git init
git add .
git commit -m "Prepare DRKA disaster response dashboard for web release"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

## 3. Deploy On Render

1. Sign in to Render
2. Click `New +`
3. Choose `Blueprint`
4. Connect your GitHub repo
5. Render will detect [render.yaml](C:\Users\Administrator\Documents\New%20project\render.yaml)
6. Create the service

## 4. Set Production Values

Render will use:

- `HOST=0.0.0.0`
- `PORT=10000`
- `DATA_DIR=/opt/render/project/src/data`

## 5. Optional But Recommended

Attach a persistent disk in Render and mount it to:

`/opt/render/project/src/data`

That keeps report JSON files after restarts and redeploys.

## 6. Connect The Bot Later

After the dashboard is live, set in:

- [\.env](C:\Users\Administrator\Documents\New%20project\whatsapp-relief-system\.env)

```env
API_ENDPOINT=https://your-service.onrender.com/api/disaster-reports
```

Then run the WhatsApp bot separately on your machine or VPS.
