# VoxResearch Spec

## Goal
Build a Frankenstein research assistant that stitches together:
- Muse Voice Transcribe (speech-to-text)
- Muse Spark with search grounding (live cited answers)
- React + Tailwind frontend (spooky Halloween UI)

## Functional Requirements
1. User can type a query OR record voice
2. Voice is transcribed via POST /transcribe (Muse Voice Transcribe)
3. Query is sent to POST /research (Muse Spark + search grounding)
4. Answer and citations are displayed in a result card
5. UI uses dark Halloween theme (orange on near-black)

## Non-Functional Requirements
- Backend: FastAPI, Python 3.11+
- Frontend: React 18, Vite, Tailwind CSS
- API key stored in environment variable META_API_KEY
- CORS enabled for localhost:5173

## Out of Scope
- User accounts / auth
- Conversation history
- Real-time streaming responses (v2)
