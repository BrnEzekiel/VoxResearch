# VoxResearch is live on Vercel (site + backend in one project)

Everything runs on Vercel: the page plus two serverless functions
(`frontend/api/research.js`, `frontend/api/transcribe.js`) that talk to Meta's API.
There is no separate backend host. Local dev still uses `backend/` (FastAPI on :8000).

## Redeploy after code changes

From the `frontend/` folder:

```
npx vercel --prod
```

(That's it. The project is already linked.)

## Environment

- `META_API_KEY` is set on the Vercel project (production + preview).
  Never commit `backend/.env` — it's git-ignored.
- The frontend calls same-origin `/api/*` in production, `http://localhost:8000`
  in local dev. `VITE_API_URL` overrides both when set.

## Domain

`voxresearch.work.gd` + `www` are attached to the Vercel project.
DNS (freedomain.one panel):

- `@` A → `216.198.79.1` and (second row) `64.29.17.1`
- `www` CNAME → `f2db8d2bdf22ca9d.vercel-dns-017.com`

## Notes

- The temporary `*.vercel.app` URLs are team-login protected (SSO);
  the custom domain is fully public. Don't remove the SSO setting.
- Serverless functions time out at 60s; related questions run in parallel
  with the answer stream to stay well under that.
- Meta's API refuses Render's network (model_not_found from any Render
  region) but works from Vercel and residential IPs. Don't move the
  backend back to Render.
