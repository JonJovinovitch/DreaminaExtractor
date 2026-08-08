# Dreamina Video Extractor

A small Node.js app that inspects a public Dreamina or CapCut share page and returns direct media URLs that the page already exposes. It is designed for downloading videos you own or are authorized to save.

It does not log in, bypass private links, DRM, regional controls, or other platform protections. Some Dreamina pages—including the supplied example from this environment—may not expose a media URL because of regional availability or page protections.

## Run locally or in GitHub Codespaces

Requires Node.js 20 or newer. There are no dependencies to install.

```bash
npm start
```

Open `http://localhost:3000`, paste a Dreamina/CapCut share URL, and choose **Find video**. If a public video file is found, use **Download**. Links expire after ten minutes and are single-use.

## Deploy with GitHub and Railway

1. Create an empty GitHub repository, then commit and push this project:

   ```bash
   git add .
   git commit -m "Initial Dreamina Video Extractor"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
   git push -u origin main
   ```

2. At [Railway](https://railway.com/new), sign in with GitHub, choose **Deploy from GitHub repo**, and select this repository.
3. Railway detects the Node app and uses the included `railway.json` configuration to run `npm start`.
4. After it deploys, open the service **Settings → Networking → Generate Domain**. That generated Railway URL is the live app. Future pushes to `main` redeploy it automatically.

No environment variables or database are required. GitHub Pages alone cannot host this app because the server safely fetches the share page and streams the download; it needs a Node server such as Railway.

If you later want it at a URL under `jonjonjovi.com`, add a Railway custom domain such as `video.jonjonjovi.com`, then create the DNS record Railway shows in your GoDaddy DNS manager. Keep the Railway-generated domain active until the custom domain works.

## Safety design

- Accepts only HTTPS Dreamina/CapCut share links and validates every redirect.
- Finds only publicly embedded `.mp4`, `.webm`, `.mov`, or `.m3u8` URLs.
- Never accepts arbitrary fetch targets from the browser.
- Uses short-lived, one-time download tokens.
