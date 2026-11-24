# VoxResearch — Steering

## Stack rules
- Backend is FastAPI (Python). Do not add Django or Flask.
- Frontend is React + Vite + Tailwind. Do not add Next.js.
- All Meta Model API calls go through `httpx` in `backend/main.py`.
- API key is always read from the `META_API_KEY` environment variable.

## Style rules
- UI theme: dark background (`gray-950`), orange accents (`orange-400`, `orange-500`).
- Spooky Halloween aesthetic — use 🕸 🎃 👻 emoji sparingly in headings only.
- Keep components small and single-purpose.

## Kiro usage
- Use Kiro for all code generation, refactoring, and debugging.
- Document Kiro feature usage in README.md under "How Kiro Was Used".
