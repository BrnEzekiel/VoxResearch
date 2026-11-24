# Publish VoxResearch on voxresearch.work.gd (all free)

The app has two halves: the page you see (frontend) and the brain (backend).
They go on two free hosts, then your domain points at the page.

## 1. Push this folder to GitHub (one time)

1. Go to github.com/new, name it `voxresearch`, Create repository.
2. In a terminal inside this folder:
   ```
   git remote add origin https://github.com/YOURNAME/voxresearch.git
   git branch -M main
   git push -u origin main
   ```
   Your API key is NOT in the repo (`.env` is ignored). Safe to push.

## 2. Put the brain on Render (free)

1. Go to render.com, sign up with GitHub.
2. New + → Blueprint → pick the `voxresearch` repo. It reads `render.yaml`.
3. It asks for `META_API_KEY`: open `backend\.env` on your PC, copy the key
   after `META_API_KEY=`, paste it. Deploy.
4. When live, copy your API address, something like
   `https://voxresearch-api.onrender.com`. Test it: open
   `https://voxresearch-api.onrender.com/health` — you should see `{"status":"ok"}`.
   (Free Render sleeps when idle; first answer of the day takes ~50s to wake up.)

## 3. Put the page on Vercel (free)

1. Go to vercel.com, sign up with GitHub.
2. Add New → Project → Import the `voxresearch` repo.
3. Root Directory: `frontend`. Framework: Vite (auto-detected).
4. Environment Variables: add `VITE_API_URL` = your Render address from step 2
   (no trailing slash). Deploy.
5. Open the vercel.app link it gives you and ask something. If answers stream,
   frontend + backend are talking.

## 4. Point your domain at the page

1. In Vercel: Project → Settings → Domains → add `voxresearch.work.gd`
   and `www.voxresearch.work.gd`. Vercel shows the DNS records it wants
   (an A record for `@`, and www pointing at it).
2. In your freedomain.one DNS panel for voxresearch.work.gd:
   - Edit the Host/A record `voxresearch.work.gd.` → change the IP to Vercel's.
   - `www` CNAME already points at the root — leave it.
3. Wait 5–30 minutes, then open https://voxresearch.work.gd. Done.

## Later changes

Just push to GitHub (`git add -A; git commit -m "..."; git push`) —
Render and Vercel redeploy automatically.
