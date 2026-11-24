# VoxResearch Spec

## Goal
Build a Frankenstein research assistant that stitches together:
- Muse Voice Transcribe (speech-to-text)
- Muse Spark with search grounding (live cited answers)
- React + Tailwind frontend
- 90+ auto-detected answer visualizations
- Styled PDF export with rendered diagrams
- Gemini-style chat sessions
- Wipe-proof device message quota

## Functional Requirements
1. User can type a query OR record voice
2. Browser audio is converted to WAV in-app, transcribed via POST /transcribe
   (Muse Voice Transcribe — WAV only, mono s16le 16/24 kHz)
3. Query is sent to POST /research (Muse Spark + search grounding, streamed)
4. Answer and citations are displayed in a result card
5. Visualization engine offers charts, tables, timelines, diagrams, maps, math
   and more behind an on-demand picker — nothing auto-renders except tables
6. Any answer or full session exports to a branded PDF (diagrams as images)
7. Chats persist in named sessions: new chat, pin, rename, duplicate, search,
   delete with confirm
8. File attach (+ button, drag-drop, paste): text rides with the next question,
   images preview; CSV/JSON opens the data lab
9. 10 free messages per device, fingerprint-identified, server-enforced

## Non-Functional Requirements
- Production backend: Vercel serverless functions (Node), 60s max duration
- Local-dev backend: FastAPI, Python 3.11+
- Frontend: React 18, Vite, Tailwind CSS (light theme, orange accents)
- API key stored in environment variable META_API_KEY, never in code
- Streamed renders batched (~8fps) so weak phones stay smooth
- Mobile-first responsive: no horizontal scroll at 320px and up

## Out of Scope
- User accounts / auth
- Real-time collaboration

## History
- v1 (spec-driven Kiro build): voice + grounded answers + result cards
- v2 (Kiro Crew feature rounds): sessions, 90+ visualizations, PDF export,
  quota system, serverless backend, mobile hardening
