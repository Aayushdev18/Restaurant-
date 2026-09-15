"""Host agent: optional OpenAI tool-calling, plus a local slot-filling agent that uses the same tools."""

from __future__ import annotations

import json
import os
import re
from typing import Any

import httpx

from knowledge import format_guest_date, load_dishes, parse_booking_date
from tools import TOOL_SCHEMAS, find_dish, run_tool

SYSTEM = (
    "You are the floor concierge at Ayush Restaurant in Connaught Place, New Delhi. "
    "Speak in short, warm sentences. You can check hours, menu, today's offer, address, "
    "book a table, and place takeaway. Prices are before GST. "
    "For bookings you need first name, last name, 10-digit Indian mobile, date, time, party size. "
    "Do not ask for email. If they give one, use it; otherwise use guest.{phone}@ayushrestaurant.com. "
    "Never invent a confirmed table — only book via the book_table tool. "
    "If you are unsure what they want, ask how you can help. Never list example dates, times, or sample bookings. "
    "Check check_availability before booking. Offer nearby times. "
    "Use modify_reservation and cancel_reservation for existing tables. "
    "Answer vegetarian and recommendation questions from the menu tools. "
    "If a tool fails, say so and offer WhatsApp +91 99990 85486."
)

WORD_NUMBERS = {
    "one": "1",
    "two": "2",
    "three": "3",
    "four": "4",
    "five": "5",
    "six": "6",
    "seven": "7",
    "eight": "8",
    "nine": "9",
    "ten": "10",
    "couple": "2",
}


class HostAgent:
    def __init__(self) -> None:
        self.sessions: dict[str, dict[str, Any]] = {}

    def _state(self, session_id: str) -> dict[str, Any]:
        if session_id not in self.sessions:
            self.sessions[session_id] = {"pending": None, "slots": {}, "history": []}
        return self.sessions[session_id]

    def turn(self, session_id: str, message: str) -> dict[str, Any]:
        state = self._state(session_id)
        state["history"].append({"role": "user", "content": message})
        if os.getenv("OPENAI_API_KEY"):
            reply = self._llm_turn(state, message)
            mode = "openai"
        else:
            reply = self._local_turn(state, message)
            mode = "local"
        state["history"].append({"role": "assistant", "content": reply})
        state["history"] = state["history"][-16:]
        return {
            "reply": reply,
            "mode": mode,
            "intent": state.get("pending") or "answer",
            "pending": state.get("pending"),
            "slots": dict(state.get("slots") or {}),
            "whatsapp_url": state.get("whatsapp_url"),
        }

    def reset(self, session_id: str) -> None:
        self.sessions.pop(session_id, None)

    def _llm_turn(self, state: dict[str, Any], message: str) -> str:
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        messages: list[dict[str, Any]] = [{"role": "system", "content": SYSTEM}]
        messages.extend(state["history"][-10:])
        if not messages[-1]["content"] == message:
            messages.append({"role": "user", "content": message})

        for _ in range(4):
            payload = {
                "model": model,
                "messages": messages,
                "tools": TOOL_SCHEMAS,
                "tool_choice": "auto",
            }
            response = httpx.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {os.getenv('OPENAI_API_KEY')}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=45,
            )
            response.raise_for_status()
            choice = response.json()["choices"][0]["message"]
            tool_calls = choice.get("tool_calls") or []
            if not tool_calls:
                return (choice.get("content") or "Sorry, say that again?").strip()
            messages.append(choice)
            for call in tool_calls:
                name = call["function"]["name"]
                try:
                    args = json.loads(call["function"].get("arguments") or "{}")
                except json.JSONDecodeError:
                    args = {}
                result = run_tool(name, args)
                self._remember_tool(state, result)
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": call["id"],
                        "content": result.get("message", ""),
                    }
                )
        return "I got stuck talking to the kitchen. WhatsApp +91 99990 85486 and we will sort it."

    def _remember_tool(self, state: dict[str, Any], result: dict[str, Any]) -> None:
        if result.get("reservation"):
            state["last_reservation"] = result["reservation"]
        if result.get("whatsapp_url"):
            state["whatsapp_url"] = result["whatsapp_url"]
        if result.get("options"):
            state["offered_slots"] = result["options"]

    def _tool(self, state: dict[str, Any], name: str, args: dict) -> str:
        result = run_tool(name, args)
        self._remember_tool(state, result)
        return result.get("message", "")

    def _local_turn(self, state: dict[str, Any], message: str) -> str:
        text = message.strip()
        lower = text.lower()
        pending = state["pending"]
        self._harvest_slots(state, text)

        if pending == "confirm_cancel":
            if any(word in lower for word in ("yes", "sure", "confirm", "please", "ok", "yeah")):
                last = state.get("last_reservation") or {}
                state["pending"] = None
                return self._tool(
                    state,
                    "cancel_reservation",
                    {"reservation_id": last.get("id"), "phone": last.get("phone")},
                )
            state["pending"] = None
            return "No problem. Your table stays as it is."

        if self._wants_cancel(lower):
            last = state.get("last_reservation")
            if not last:
                return "I don't have a reservation on this chat yet."
            state["pending"] = "confirm_cancel"
            guests = last.get("partySize") or last.get("party_size")
            return (
                f"Are you sure you'd like to cancel your {format_guest_date(last['date'])} "
                f"reservation for {guests} guests?"
            )

        if self._wants_modify(lower) and state.get("last_reservation"):
            party = _parse_party(lower)
            last = state["last_reservation"]
            if party:
                return self._tool(
                    state,
                    "modify_reservation",
                    {
                        "reservation_id": last.get("id"),
                        "phone": last.get("phone"),
                        "party_size": party,
                    },
                )
            return "What would you like to change?"

        if pending == "book_table" and lower in {"cancel", "stop", "never mind", "nevermind"}:
            state["pending"] = None
            state["slots"] = {}
            state["offered_slots"] = []
            state["time_confirmed"] = False
            return "Okay."

        if pending == "choose_slot" or (state.get("offered_slots") and pending == "book_table"):
            if self._apply_slot_choice(state, lower):
                state["pending"] = "book_table"
                return self._continue_booking(state)

        if self._wants_recommend(lower):
            party = _parse_party(lower) or "3"
            diet = "veg" if "veg" in lower and "non" not in lower else ""
            return self._tool(state, "recommend_dishes", {"party_size": party, "diet": diet})

        if pending == "book_table" or self._wants_booking(lower):
            state["pending"] = "book_table"
            return self._continue_booking(state)
        if pending == "place_order" or self._wants_order(lower):
            state["pending"] = "place_order"
            return self._continue_order(state, text)
        if any(word in lower for word in ("hour", "open", "close", "timing", "when do you")):
            return self._tool(state, "get_hours", {})
        if any(word in lower for word in ("where", "address", "park", "metro", "location", "map")):
            return self._tool(state, "get_location", {})
        if any(word in lower for word in ("offer", "special", "today's", "todays")):
            return self._tool(state, "get_today_offer", {})
        if any(word in lower for word in ("menu", "biryani", "veg", "allerg", "dish", "price", "eat", "serve")):
            return self._tool(state, "lookup_menu", {"query": text})
        return "How can I help you?"

    def _wants_booking(self, lower: str) -> bool:
        if self._wants_cancel(lower) or self._wants_modify(lower) or self._wants_recommend(lower):
            return False
        return any(
            phrase in lower
            for phrase in ("book", "reserve", "reservation", "hold a table", "get a table", "table for")
        )

    def _wants_cancel(self, lower: str) -> bool:
        return "cancel" in lower and any(word in lower for word in ("reservation", "booking", "table"))

    def _wants_modify(self, lower: str) -> bool:
        return any(word in lower for word in ("actually", "make it", "change to", "update to", "change it"))

    def _wants_recommend(self, lower: str) -> bool:
        return "recommend" in lower or "what should we eat" in lower

    def _wants_order(self, lower: str) -> bool:
        return any(word in lower for word in ("order", "takeaway", "parcel", "pickup", "take away"))

    def _apply_slot_choice(self, state: dict[str, Any], lower: str) -> bool:
        offered = state.get("offered_slots") or []
        times = [row["time"] if isinstance(row, dict) else row for row in offered]
        if not times:
            return False
        parsed = _parse_time(lower)
        if parsed and parsed in times:
            state["slots"]["time"] = parsed
            state["time_confirmed"] = True
            return True
        if any(word in lower for word in ("later", "second", "last")):
            state["slots"]["time"] = times[-1]
            state["time_confirmed"] = True
            return True
        if any(word in lower for word in ("earlier", "first", "sooner")):
            state["slots"]["time"] = times[0]
            state["time_confirmed"] = True
            return True
        return False

    def _needed_slot(self, slots: dict[str, Any]) -> str | None:
        for key in ("party_size", "date", "time", "first_name", "last_name", "phone"):
            if not slots.get(key):
                return key
        return None

    def _harvest_slots(self, state: dict[str, Any], text: str) -> None:
        slots = state["slots"]
        lower = text.lower().strip()
        needed = self._needed_slot(slots) if state.get("pending") == "book_table" else None

        if needed == "party_size":
            party = _parse_party(lower)
            if party:
                slots["party_size"] = party
                return
        if needed == "date":
            date = parse_booking_date(lower)
            if date:
                slots["date"] = date
                return
        if needed == "time":
            time = _parse_time(lower)
            if not time:
                bare = re.fullmatch(r"(\d{1,2})(?:\s*o'?clock)?", lower)
                if bare:
                    hour = int(bare.group(1))
                    if 1 <= hour <= 12:
                        time = _parse_time(f"{hour} pm")
            if time:
                slots["time"] = time
                return
        if needed == "first_name":
            parts = re.findall(r"[A-Za-z]+", text)
            if parts:
                slots["first_name"] = parts[0].title()
                if len(parts) > 1:
                    slots["last_name"] = parts[1].title()
                return
        if needed == "last_name":
            parts = re.findall(r"[A-Za-z]+", text)
            if parts:
                slots["last_name"] = parts[-1].title()
                return
        if needed == "phone":
            digits = re.sub(r"\D", "", text)
            if len(digits) >= 10:
                slots["phone"] = digits[-10:]
                return

        date = parse_booking_date(lower)
        if date and needed != "party_size":
            slots["date"] = date
        time = _parse_time(lower)
        if time and needed != "party_size":
            slots["time"] = time
        digits = re.sub(r"\D", "", text)
        if len(digits) == 10:
            slots["phone"] = digits
        email = re.search(r"[^\s@]+@[^\s@]+\.[^\s@]+", text)
        if email:
            slots["email"] = email.group(0)
        party = _parse_party(lower)
        if party and (
            "for" in lower
            or "guest" in lower
            or "people" in lower
            or "party" in lower
            or "make it" in lower
        ):
            slots["party_size"] = party
        seating = "Outdoor" if "outdoor" in lower or "outside" in lower else None
        if "indoor" in lower:
            seating = "Indoor"
        if seating:
            slots["seating"] = seating
        name = re.search(r"(?:i am|i'm|this is|my name is|name is)\s+([a-zA-Z]+)(?:\s+([a-zA-Z]+))?", text, re.I)
        if name:
            slots["first_name"] = name.group(1).title()
            slots["last_name"] = (name.group(2) or "Guest").title()

    def _continue_booking(self, state: dict[str, Any]) -> str:
        slots = state["slots"]
        if slots.get("party_size") and slots.get("date") and slots.get("time") and not state.get("time_confirmed"):
            avail = run_tool(
                "check_availability",
                {"date": slots["date"], "time": slots["time"], "party_size": slots["party_size"]},
            )
            self._remember_tool(state, avail)
            state["pending"] = "choose_slot"
            return avail.get("message", "")
        need = [
            ("party_size", "How many guests?"),
            ("date", "Which date?"),
            ("time", "What time?"),
            ("first_name", "May I have a name for the table?"),
            ("last_name", "And the last name?"),
            ("phone", "Your mobile number?"),
        ]
        for key, prompt in need:
            if not slots.get(key):
                return prompt
        email = slots.get("email") or f"guest.{slots['phone']}@ayushrestaurant.com"
        result = self._tool(
            state,
            "book_table",
            {
                "first_name": slots["first_name"],
                "last_name": slots["last_name"],
                "email": email,
                "phone": slots["phone"],
                "date": slots["date"],
                "time": slots["time"],
                "party_size": slots["party_size"],
                "seating": slots.get("seating", "Indoor"),
                "notes": "Booked by concierge",
            },
        )
        state["pending"] = None
        state["slots"] = {}
        state["offered_slots"] = []
        state["time_confirmed"] = False
        return result

    def _continue_order(self, state: dict[str, Any], text: str) -> str:
        slots = state["slots"]
        lower = text.lower().strip()
        if not slots.get("dish_title") and lower not in {"order", "takeaway", "parcel", "pickup", "take away"}:
            for dish in load_dishes():
                title = dish["title"].lower()
                tokens = [part for part in title.replace("’", "'").split() if len(part) > 3]
                if title in lower or any(token in lower for token in tokens):
                    slots["dish_title"] = dish["title"]
                    slots["price"] = dish["price"]
                    break
            if not slots.get("dish_title"):
                maybe = find_dish(text)
                if maybe and len(lower) > 4:
                    slots["dish_title"] = maybe["title"]
                    slots["price"] = maybe["price"]
        if not slots.get("dish_title"):
            return "Which dish? Biryani, salmon toast, grain bowl, berry slice, burger, mussels, spaghetti, or grilled fish."
        if not slots.get("first_name"):
            return "Name for the takeaway?"
        if not slots.get("phone"):
            return "10-digit mobile for the order?"
        pickup = _parse_time(lower)
        result = self._tool(
            state,
            "place_order",
            {
                "dish_title": slots["dish_title"],
                "price": slots["price"],
                "customer_name": f"{slots['first_name']} {slots.get('last_name', 'Guest')}".strip(),
                "phone": slots["phone"],
                "pickup_time": pickup or slots.get("time", ""),
                "notes": "Placed by concierge",
            },
        )
        state["pending"] = None
        state["slots"] = {}
        return result


def _parse_party(lower: str) -> str | None:
    compact = re.sub(r"[\s-]", "", lower)
    if compact in WORD_NUMBERS:
        return WORD_NUMBERS[compact]
    match = re.search(
        r"\b(?:for|party of|table for|we are|we're)?\s*(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten|couple|dozen)\s*(?:people|guests|of us|pax|persons?)?\b",
        lower,
    )
    if not match:
        match = re.fullmatch(r"(\d{1,3})", lower.strip())
    if not match:
        return None
    token = match.group(1)
    if token == "dozen":
        return "12"
    size = WORD_NUMBERS.get(token, token)
    if size.isdigit() and 1 <= int(size) <= 999:
        return str(int(size))
    return None


def _parse_time(lower: str) -> str | None:
    match = re.search(r"\b(\d{1,2})(?::(\d{2}))\s*(am|pm)?\b", lower)
    if not match:
        match = re.search(r"\b(\d{1,2})\s*(am|pm)\b", lower)
        if not match:
            if "noon" in lower:
                return "12:00"
            return None
        hour = int(match.group(1))
        suffix = match.group(2)
        if suffix == "pm" and hour < 12:
            hour += 12
        if suffix == "am" and hour == 12:
            hour = 0
        return f"{hour:02d}:00"
    hour = int(match.group(1))
    minute = int(match.group(2) or 0)
    suffix = match.group(3)
    if suffix == "pm" and hour < 12:
        hour += 12
    if suffix == "am" and hour == 12:
        hour = 0
    if not suffix and hour < 8:
        hour += 12
    return f"{hour:02d}:{minute:02d}"


host_agent = HostAgent()
