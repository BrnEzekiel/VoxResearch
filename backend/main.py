from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import httpx
import json
import re
import os

load_dotenv()

app = FastAPI(title="VoxResearch API")

CORS_ORIGINS = [o.strip() for o in os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,https://voxresearch.work.gd,https://www.voxresearch.work.gd",
).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

META_API_KEY = os.getenv("META_API_KEY", "")
META_BASE = "https://api.meta.ai/v1"
HEADERS = {
    "Authorization": f"Bearer {META_API_KEY}",
    "Content-Type": "application/json",
}


class QueryRequest(BaseModel):
    query: str
    context: list = []
    language: str = "English"
    length: str = "Detailed"


async def stream_research(query: str, context: list = [], language: str = "English", length: str = "Detailed"):
    """Stream SSE events: token chunks, then citations, then related questions."""
    length_instruction = {
        "Brief": "Answer in 2-3 sentences only.",
        "Detailed": "Give a thorough, detailed answer.",
        "Bullet points": "Answer using bullet points only.",
    }.get(length, "")
    lang_instruction = f"You MUST reply entirely in {language}. Do not use any other language." if language != "English" else ""
    history = "\n".join(f"Previous Q: {m.get('content', '')}" for m in (context or [])[-3:])
    history_block = f"Conversation so far:\n{history}\n\n" if history else ""
    viz_hint = "When the answer involves a process, flow, timeline, hierarchy, or sequence, also include a ```mermaid diagram for it."
    full_input = f"{lang_instruction} {length_instruction}\n\n{history_block}{viz_hint}\n\nQuestion: {query}".strip()

    payload = {
        "model": "muse-spark-1.3",
        "input": full_input,
        "tools": [{"type": "web_search"}],
        "stream": True,
    }

    full_text = ""
    citations = []

    try:
        async with httpx.AsyncClient(timeout=90) as client:
            async with client.stream("POST", f"{META_BASE}/responses", headers=HEADERS, json=payload) as resp:
                if resp.status_code != 200:
                    body = await resp.aread()
                    # Fall back to non-streaming
                    yield f"data: {json.dumps({'type': 'error', 'text': body.decode()})}\n\n"
                    return

                async for line in resp.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    raw = line[5:].strip()
                    if raw == "[DONE]":
                        break
                    try:
                        chunk = json.loads(raw)
                    except Exception:
                        continue

                    # Text delta
                    delta = ""
                    for item in chunk.get("output", []):
                        if item.get("type") == "message":
                            for c in item.get("content", []):
                                if c.get("type") == "output_text":
                                    delta = c.get("text", "")
                                    anns = c.get("annotations", [])
                                    if anns:
                                        citations = anns

                    # Some APIs send delta directly
                    delta = delta or chunk.get("delta", {}).get("text", "")

                    if delta:
                        full_text += delta
                        yield f"data: {json.dumps({'type': 'token', 'text': delta})}\n\n"

    except Exception as e:
        # Non-streaming fallback
        try:
            payload_ns = {
                "model": "muse-spark-1.3",
                "input": full_input,
                "tools": [{"type": "web_search"}],
            }
            async with httpx.AsyncClient(timeout=90) as client:
                resp = await client.post(f"{META_BASE}/responses", headers=HEADERS, json=payload_ns)
                if resp.status_code == 200:
                    data = resp.json()
                    for item in data.get("output", []):
                        if item.get("type") == "message":
                            for c in item.get("content", []):
                                if c.get("type") == "output_text":
                                    full_text = c.get("text", "")
                                    citations = c.get("annotations", [])
                    # Send full text as single token
                    yield f"data: {json.dumps({'type': 'token', 'text': full_text})}\n\n"
                else:
                    yield f"data: {json.dumps({'type': 'error', 'text': resp.text})}\n\n"
                    return
        except Exception as e2:
            yield f"data: {json.dumps({'type': 'error', 'text': str(e2)})}\n\n"
            return

    # Send citations
    if citations:
        yield f"data: {json.dumps({'type': 'citations', 'data': citations})}\n\n"

    # Generate related questions (non-streaming, runs after main answer)
    related = []
    try:
        rq_payload = {
            "model": "muse-spark-1.3",
            "input": f"Given the question '{query}', suggest exactly 3 short follow-up questions. Return only a JSON array of 3 strings.",
        }
        async with httpx.AsyncClient(timeout=20) as client3:
            rq_resp = await client3.post(f"{META_BASE}/responses", headers=HEADERS, json=rq_payload)
            if rq_resp.status_code == 200:
                rq_data = rq_resp.json()
                for item in rq_data.get("output", []):
                    if item.get("type") == "message":
                        for c in item.get("content", []):
                            if c.get("type") == "output_text":
                                match = re.search(r'\[.*?\]', c.get("text", ""), re.DOTALL)
                                if match:
                                    related = json.loads(match.group())[:3]
    except Exception:
        pass

    yield f"data: {json.dumps({'type': 'related', 'data': related})}\n\n"
    yield f"data: {json.dumps({'type': 'done'})}\n\n"


@app.post("/research")
async def research(req: QueryRequest):
    return StreamingResponse(
        stream_research(req.query, req.context, req.language, req.length),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    audio_bytes = await audio.read()
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{META_BASE}/asr/transcribe",
            headers={"Authorization": f"Bearer {META_API_KEY}"},
            files={"file": (audio.filename, audio_bytes, audio.content_type)},
            data={"model": "muse-voice-transcribe-1.0"},
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        result = resp.json()

    transcript = " ".join(t.get("text", "") for t in result.get("turns", []))
    return {"transcript": transcript}


@app.get("/health")
async def health():
    return {"status": "ok"}
