from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import base64
import hashlib
import httpx
import json
import re
import os
import time

load_dotenv()

# Shared answer cache (local-dev parity with the serverless function).
_CACHE_TTL = 7 * 24 * 3600
_CACHE_MAX = 200
_ANSWER_CACHE = {}


def _cache_key(query, language, length):
    norm = " ".join(str(query or "").lower().strip().split())
    return hashlib.sha256(f"v2|{language}|{length}|{norm}".encode()).hexdigest()


def _cache_get(key):
    v = _ANSWER_CACHE.get(key)
    if not v or time.time() - v["ts"] > _CACHE_TTL:
        _ANSWER_CACHE.pop(key, None)
        return None
    return v


def _store_cache(key, collect):
    if collect.get("text"):
        _ANSWER_CACHE[key] = {"text": collect["text"], "cites": collect.get("cites", []), "ts": time.time()}
        while len(_ANSWER_CACHE) > _CACHE_MAX:
            _ANSWER_CACHE.pop(next(iter(_ANSWER_CACHE)))

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


async def stream_research(query: str, context: list = [], language: str = "English", length: str = "Detailed", _collect=None):
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
    cite_hint = "You MUST call web_search before answering. Never answer from memory. Every answer MUST include at least 2 source citations attached to the facts they support."
    full_input = f"{lang_instruction} {length_instruction}\n\n{history_block}{viz_hint}\n{cite_hint}\n\nQuestion: {query}".strip()

    payload = {
        "model": "muse-spark-1.3",
        "input": full_input,
        "tools": [{"type": "web_search"}],
        "stream": True,
    }

    full_text = ""
    citations = []
    commentary_ids = set()

    def harvest(output):
        for item in output or []:
            if item.get("type") != "message":
                continue
            for c in item.get("content", []):
                if c.get("type") == "output_text" and c.get("annotations"):
                    for a in c["annotations"]:
                        if a.get("url") and not any(x.get("url") == a["url"] for x in citations):
                            citations.append(a)

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

                    t = chunk.get("type", "")
                    # Track commentary-phase items so thinking chatter stays hidden.
                    if t == "response.output_item.added":
                        item = chunk.get("item", {})
                        if item.get("phase") == "commentary" and item.get("id"):
                            commentary_ids.add(item["id"])
                        continue
                    # Real text deltas: plain strings on output_text.delta events.
                    if t == "response.output_text.delta":
                        d = chunk.get("delta", "")
                        if isinstance(d, str) and d and chunk.get("item_id") not in commentary_ids:
                            full_text += d
                            yield f"data: {json.dumps({'type': 'token', 'text': d})}\n\n"
                        continue
                    # Citations ride on the completed event (and legacy output shapes).
                    resp_obj = chunk.get("response") or {}
                    if isinstance(resp_obj.get("output"), list):
                        harvest(resp_obj["output"])
                    else:
                        harvest(chunk.get("output"))

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

    if _collect is not None:
        _collect["text"] = full_text
        _collect["cites"] = citations
    yield f"data: {json.dumps({'type': 'related', 'data': related})}\n\n"
    yield f"data: {json.dumps({'type': 'done'})}\n\n"


@app.post("/research")
async def research(req: QueryRequest, background_tasks: BackgroundTasks):
    if len(req.query or "") > 4000:
        raise HTTPException(status_code=400, detail="Question too long (max 4000 characters).")
    key = _cache_key(req.query, req.language, req.length)
    hit = _cache_get(key)
    if hit:
        async def hitgen():
            yield f"data: {json.dumps({'type': 'token', 'text': hit['text']})}\n\n"
            if hit["cites"]:
                yield f"data: {json.dumps({'type': 'citations', 'data': hit['cites']})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        return StreamingResponse(
            hitgen(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "X-Cache": "HIT"},
        )
    collect = {}
    background_tasks.add_task(_store_cache, key, collect)
    return StreamingResponse(
        stream_research(req.query, req.context, req.language, req.length, _collect=collect),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "X-Cache": "MISS"},
    )


@app.post("/transcribe")
async def transcribe(request: Request):
    ctype = request.headers.get("content-type", "")
    if "application/json" in ctype:
        body = await request.json()
        data_url = body.get("audio", "")
        b64 = data_url.split(",", 1)[-1]
        audio_bytes = base64.b64decode(b64)
        filename = body.get("filename", "recording.webm")
        mime = body.get("mime", "audio/webm")
    else:
        form = await request.form()
        f = form["audio"]
        audio_bytes = await f.read()
        filename, mime = f.filename, f.content_type
    # Meta's file endpoint only accepts WAV — the frontend converts first.
    audio_encoding = "WAV"
    req_json = json.dumps({"model": "muse-voice-transcribe-1.0", "audioEncoding": audio_encoding})
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{META_BASE}/asr/transcribe",
            headers={"Authorization": f"Bearer {META_API_KEY}"},
            # NOTE: the request part must be typed application/json or Meta 400s.
            files={
                "audio": (filename, audio_bytes, mime),
                "request": ("request.json", req_json, "application/json"),
            },
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        result = resp.json()
        if isinstance(result, dict) and result.get("error"):
            err = result["error"]
            raise HTTPException(status_code=502, detail=err.get("message", "transcription failed"))

    transcript = result.get("transcript") or " ".join(t.get("text", "") for t in result.get("turns", []))
    return {"transcript": transcript}


@app.get("/health")
async def health():
    return {"status": "ok"}
