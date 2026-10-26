# crave.sayz site – deploy on Netlify

## What you get
- `public/index.html` – the sky-blue site (live quotes, like button, visitor counter, contact form, newsletter signup)
- `public/admin.html` – private admin panel at `/admin`
- `netlify/functions/api.mjs` – the backend (stores data in Netlify Blobs, free)

## Deploy (Git method, easiest)
1. Create a GitHub repo and push this folder to it.
2. Netlify → Add new site → Import from Git → pick the repo → Deploy (settings are read from `netlify.toml`).
3. Site settings → Environment variables → add `ADMIN_PASSWORD` with a long password → Deploys → Trigger deploy.
4. Open `https://YOUR-SITE.netlify.app/admin` and log in.

## Deploy (CLI method)
```
npm install
npx netlify-cli login
npx netlify-cli deploy --prod
```
Then add `ADMIN_PASSWORD` in Site settings → Environment variables and redeploy.

## Test locally
`npx netlify-cli dev` (set `ADMIN_PASSWORD=test` in a `.env` file first).

## Free custom domain
Site settings → Domain management. You can rename the free address to `cravesayz.netlify.app`.

## Notes
- Drag-and-drop deploys won’t build the function – use Git or the CLI.
- The counters are simple; two visitors at the exact same instant may count as one. Fine for a small page.
