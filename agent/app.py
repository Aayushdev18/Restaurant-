from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv(Path(__file__).resolve().parent / ".env")

from host_agent import host_agent
from knowledge import kitchen_status

app = FastAPI(
    title="Ayush Restaurant concierge",
    description="Tool-using host agent for hours, menu, reservations, and takeaway.",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class TurnRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    session_id: str = Field(default="web", max_length=80)


class SessionRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=80)


@app.get("/agent/health")
def health():
    status = kitchen_status()
    return {
        "ok": True,
        "service": "concierge-agent",
        "llm": bool(os.getenv("OPENAI_API_KEY")),
        "kitchen": status,
    }


@app.post("/agent/reset")
def reset(body: SessionRequest):
    host_agent.reset(body.session_id)
    return {"ok": True}


@app.post("/agent/turn")
def turn(body: TurnRequest):
    try:
        result = host_agent.turn(body.session_id, body.message.strip())
        return result
    except Exception as exc:  # noqa: BLE001 — surface agent failures to the mic UI
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/agent/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        raise HTTPException(
            status_code=501,
            detail="Set OPENAI_API_KEY in agent/.env to transcribe audio, or use Chrome speech recognition.",
        )
    import httpx

    content = await audio.read()
    files = {"file": (audio.filename or "speech.webm", content, audio.content_type or "audio/webm")}
    data = {"model": "whisper-1"}
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            "https://api.openai.com/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {key}"},
            files=files,
            data=data,
        )
    if response.is_error:
        raise HTTPException(status_code=502, detail=response.text[:400])
    return {"text": response.json().get("text", "")}
