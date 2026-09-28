# Dreamina Video Extractor

A small Node.js app that inspects a public Dreamina or CapCut share page and returns direct media URLs that the page already exposes. It is designed for downloading videos you own or are authorized to save.

It does not log in, bypass private links, DRM, regional controls, or other platform protections. Some Dreamina pages—including the supplied example from this environment—may not expose a media URL because of regional availability or page protections.

## Run locally or in GitHub Codespaces

Requires Node.js 20 or newer. Install the app dependency, then start it:

```bash
npm install
npm start
```

## Use an Australian IP for page loading

The extractor can send **only its outbound Dreamina and media requests** through an Australian HTTP proxy. Your computer, browser, and visitors to the app are not put on a VPN or proxy.

1. Obtain an Australian HTTP(S) proxy endpoint from a provider that permits your intended use.
2. In Railway, open the service, then **Variables**, and add this variable:

   ```text
   OUTBOUND_PROXY_URL=http://USERNAME:PASSWORD@AU_PROXY_HOST:PORT
   ```

   URL-encode special characters in the username or password (for example, `@` becomes `%40`). Do not commit this credential to GitHub.
3. Redeploy the service. Its startup log will say `Outbound Dreamina requests will use the configured proxy.`

To run locally in PowerShell for one app session:

```powershell
$env:OUTBOUND_PROXY_URL = 'http://USERNAME:PASSWORD@AU_PROXY_HOST:PORT'
npm start
```

Remove the variable or delete it in Railway to return to the host's normal IP address.

Open `http://localhost:3000`, paste a Dreamina/CapCut share URL, and choose **Find video**. If a public video file is found, use **Download**. Links expire after ten minutes and are single-use.

## Relay videos from a site you control

The **Owned-site video relay** is separate from the Dreamina share-link checker. It inspects only publicly declared video markup on your own site, then gives you a one-time URL that streams that video through this app. It is not an open proxy and does not accept arbitrary sites.

The default source and media allowlist is `jonjonjovi.com` and `www.jonjonjovi.com`. To use other domains you control, set these Railway variables (comma-separated hostnames, no protocol or paths):

```text
OWNED_SOURCE_HOSTS=www.example.com,example.com
OWNED_MEDIA_HOSTS=cdn.example.com,www.example.com
```

The page must publicly declare the video in a `<video>`/`<source>` element or Open Graph video metadata, and the actual video host must be listed in `OWNED_MEDIA_HOSTS`. Relay URLs expire after ten minutes and can be opened once.

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

No environment variables or database are required unless you want proxy-based regional testing. GitHub Pages alone cannot host this app because the server safely fetches the share page and streams the download; it needs a Node server such as Railway.

If you later want it at a URL under `jonjonjovi.com`, add a Railway custom domain such as `video.jonjonjovi.com`, then create the DNS record Railway shows in your GoDaddy DNS manager. Keep the Railway-generated domain active until the custom domain works.

## Safety design

- Accepts only HTTPS Dreamina/CapCut share links and validates every redirect.
- Finds only publicly embedded `.mp4`, `.webm`, `.mov`, or `.m3u8` URLs.
- Never accepts arbitrary fetch targets from the browser.
- Uses short-lived, one-time download tokens.
