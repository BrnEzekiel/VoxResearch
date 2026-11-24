# VoxResearch — Steering

## Stack rules
- Production backend is Vercel serverless functions (Node) in `frontend/api/`.
  Local dev keeps the FastAPI backend in `backend/`. Do not add other frameworks.
- Frontend is React + Vite + Tailwind. Do not add Next.js.
- All Meta Model API calls go through `frontend/api/*.js` in production and
  `httpx` in `backend/main.py` locally.
- API key is always read from the `META_API_KEY` environment variable.
- Device quota state lives in Edge Config, keyed by fingerprint. Never trust
  client-side counts alone.

## Style rules
- UI theme: light background, orange accents (`orange-400`, `orange-500`).
- Keep components small and single-purpose.
- Visualizations render on demand behind the picker — never auto-inject.
- Every streamed render path must batch updates for weak devices.

## Kiro usage
- Use Kiro for all code generation, refactoring, and debugging.
- Document Kiro feature usage in README.md under "How Kiro Was Used".
