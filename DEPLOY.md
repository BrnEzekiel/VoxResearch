# VoxResearch — live at https://voxresearch-app.vercel.app

(`voxresearch.vercel.app` itself is taken by someone else on Vercel.)

Everything runs on one Vercel project: the page plus two serverless functions
(`frontend/api/research.js`, `frontend/api/transcribe.js`) that talk to Meta's API.
Local dev still uses `backend/` (FastAPI on :8000).

## Deploys

The Vercel project is linked to this GitHub repo (root directory `frontend`).
Pushing to `main` auto-deploys. Manual deploy from `frontend/`:

```
npx vercel --prod
```

## Message quota (10 free per device, wipe-proof)

- Each browser gets a fingerprint id (`deviceQuota.js`); the used-count lives
  server-side in the `vox-quota` Edge Config store, keyed by that id.
- `/api/research` checks the count before streaming (429 when exhausted),
  returns `X-Quota-Left`, and persists used+1 only for delivered answers.
  `/api/transcribe` checks without counting.
- The frontend keeps a local mirror for instant checks and syncs down to the
  server value. Clearing browser data does NOT reset the server count.
- Local dev (`backend/`) has no quota — it uses your own key directly.

## Environment

- `META_API_KEY`, `EDGE_CONFIG`, `QUOTA_API_TOKEN` are set on the Vercel
  project (production + preview). Never commit `backend/.env` — it's
  git-ignored. If `QUOTA_API_TOKEN` (a Vercel API token) is ever exposed,
  revoke it in Vercel settings and set a fresh one.
- The frontend calls same-origin `/api/*` in production, `http://localhost:8000`
  in local dev. `VITE_API_URL` overrides both when set.

## Notes

- Serverless functions time out at 60s; related questions run in parallel
  with the answer stream to stay well under that.
- Meta's API refuses Render's network (model_not_found from any Render
  region) but works from Vercel and residential IPs. Don't move the
  backend to Render.
- The free subdomain voxresearch.work.gd couldn't be attached anywhere:
  Vercel demands parent-domain proof, Netlify has the whole work.gd zone
  claimed by another team, and GitHub Pages DNS verification stalls.
  Revisit only with a proper root domain.
