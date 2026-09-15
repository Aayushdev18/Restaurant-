# Ayush Restaurant

Full-stack restaurant site for a Connaught Place dining room: public booking, takeaway, a staff operations board, and a voice concierge that writes into the same kitchen API.

## Stack

| Layer | What it does |
| --- | --- |
| React 18 + Vite | Guest site, menu, reservation form, concierge UI |
| Express + MongoDB | Reservations, orders, inquiries. Falls back to a local JSON store if Mongo is down |
| FastAPI host agent | Tools: availability, book, modify, cancel, menu, recommend; WhatsApp notify link |
| Browser speech | Web Speech API (STT) + `speechSynthesis` (TTS). Optional OpenAI Whisper + function calling |

## Architecture

```text
Browser (React)
  ├── /api/*      → Express :5001  → MongoDB or server/data/store.json
  └── /agent/*    → FastAPI :8000  → tools → Express kitchen API
        └── optional OpenAI tool-calling if OPENAI_API_KEY is set
```

The agent never invents a booking. It checks seat availability, offers nearby times, then writes to `/api/reservations`. After a hold it opens WhatsApp (`wa.me`) to the restaurant with the table details. Guests can change party size or cancel from the same chat.

## Run locally

```bash
python3 -m venv agent/.venv
agent/.venv/bin/pip install -r agent/requirements.txt
cp server/.env.example server/.env
cp agent/.env.example agent/.env
npm install
npm run dev
```

- Site: http://localhost:5173
- Kitchen API: http://localhost:5001/api/health
- Concierge: http://localhost:8000/docs
- Staff board: http://localhost:5173/kitchen (password is `ADMIN_KEY` in `server/.env`, default `ayush-kitchen`)

MongoDB is optional (`docker compose up -d` or Atlas). Without it, data is stored in `server/data/store.json`.

Put an `OPENAI_API_KEY` in `agent/.env` to switch the concierge from the local slot-filling agent to OpenAI function calling. The tools stay the same.

## Resume (copy as written)

**Ayush Restaurant — full-stack booking platform**

- React guest site with menu, hours, WhatsApp, and table / takeaway flows backed by Express and MongoDB (file-store fallback).
- FastAPI concierge agent with tools for menu search, hours, reservations, and orders; browser speech for voice in / typed chat out.
- Staff operations board to confirm, seat, and cancel reservations written by both the form and the agent.

Do not list Tailwind unless you add it. Node, Express, Mongo, React, FastAPI, and Python agents are accurate.
