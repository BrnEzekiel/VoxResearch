# 🕸 VoxResearch

**Kiroween 2026 Hackathon — Frankenstein category**

A Frankenstein research assistant stitching together technologies that were never designed to work together: browser voice capture, Meta's speech-to-text model, and a live-grounded LLM — all wired into one seamless interface.

## What it does

1. Speak or type a question
2. Voice is transcribed by **Muse Voice Transcribe**
3. Query is answered live by **Muse Spark** with **search grounding** (real citations, no custom scraper)
4. Answer + sources appear in a spooky Halloween UI

## Stack

| Layer | Technology |
|---|---|
| Voice input | Web MediaRecorder API |
| Speech-to-text | Meta Muse Voice Transcribe |
| LLM + live search | Meta Muse Spark 1.3 + search grounding |
| Backend | FastAPI (Python 3.11) |
| Frontend | React 18 + Vite + Tailwind CSS |

## Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
set META_API_KEY=your_key_here   # Windows
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## How Kiro Was Used

- **Spec-driven development**: The `.kiro/specs/voxresearch.md` spec defined all requirements before a line of code was written. Kiro implemented from the spec, keeping scope tight.
- **Steering docs**: `.kiro/steering/stack.md` kept Kiro on the correct stack (FastAPI, not Flask; Tailwind, not plain CSS) across every generation.
- **Hooks**: `.kiro/hooks/pre-commit.json` warns if an API key is accidentally hardcoded.
- **Kiro Crew**: Used Kiro Crew to plan the project, pick the category, formulate the architecture, and generate all files iteratively.
- **MCP**: Kiro's web search MCP was used to look up the Meta Model API docs in real time during planning.

## License

MIT
