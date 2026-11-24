# 🕸 VoxResearch

**Kiroween 2026 Hackathon — Frankenstein category**

A Frankenstein research assistant stitching together technologies that were never
designed to work together: browser voice capture, Meta's speech-to-text model,
a live-grounded LLM, 90+ auto-detected visualizations, and one-click PDF export —
all wired into one seamless interface.

**Live app:** https://voxresearch-app.vercel.app

## What it does

1. Speak or type a question (voice is converted to WAV in-browser, then
   transcribed by **Muse Voice Transcribe**)
2. The query is answered live by **Muse Spark 1.3** with **search grounding**
   (real citations, streaming word-by-word)
3. Answers auto-sprout visualizations: charts, tables, timelines, diagrams,
   maps, math, checklists, FAQs and more — each rendered on demand
4. Chats live in Gemini-style sessions with history, pins, rename and search
5. Any answer or full session exports to a styled, branded PDF
6. Free tier: 10 messages per device, enforced server-side by fingerprint

## Stack

| Layer | Technology |
|---|---|
| Voice input | Web MediaRecorder API + in-browser WAV conversion |
| Speech-to-text | Meta Muse Voice Transcribe 1.0 |
| LLM + live search | Meta Muse Spark 1.3 + search grounding |
| Production backend | Vercel serverless functions (Node) |
| Local-dev backend | FastAPI (Python) |
| Frontend | React 18 + Vite + Tailwind CSS |
| Quota store | Vercel Edge Config keyed by device fingerprint |

## Setup (local dev)

```bash
# Backend — http://localhost:8000
cd backend
pip install -r requirements.txt
set META_API_KEY=your_key_here   # Windows (CMD)
uvicorn main:app --host 0.0.0.0 --port 8000

# Frontend — http://localhost:3000
cd frontend
npm install
npm run dev
```

The frontend calls same-origin `/api/*` in production and `http://localhost:8000`
locally (`VITE_API_URL` overrides both). See [DEPLOY.md](DEPLOY.md) for hosting.

## How Kiro Was Used

- **Spec-driven development**: `.kiro/specs/voxresearch.md` defined every
  requirement before a line of code existed. Kiro implemented from the spec,
  keeping scope tight while the app grew from a demo into a full product.
- **Steering docs**: `.kiro/steering/stack.md` pinned the stack (FastAPI, React
  + Vite + Tailwind, orange-on-dark Halloween theme) across dozens of
  generations so nothing drifted.
- **Hooks**: `.kiro/hooks/pre-commit.json` blocks accidental API-key commits.
- **Kiro Crew**: the project was planned, architected and built iteratively in
  a Crew workspace — including a 20-feature round and a 30-feature round
  shipped in single sessions.
- **MCP**: Kiro's web search was used to pull the Meta Model API docs live
  during planning.

See [SUBMISSION.md](SUBMISSION.md) for the full hackathon write-up.

## License

MIT
