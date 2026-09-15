"""Tools the host agent can call. Bookings and orders go through the Express kitchen API."""

from __future__ import annotations

import os
from urllib.parse import quote

import httpx

from knowledge import (
    CLOSED_DATES,
    DAILY_SPECIALS,
    format_dish,
    format_guest_date,
    format_guest_time,
    is_open_at,
    kitchen_status,
    load_dishes,
    now_ist,
    opening_label,
    search_menu,
    today_iso,
)

KITCHEN_API = os.getenv("KITCHEN_API", "http://127.0.0.1:5001")
WHATSAPP = os.getenv("RESTAURANT_WHATSAPP", "919999085486")


def _ok(message: str, **extra) -> dict:
    return {"message": message, **extra}


def _whatsapp(text: str) -> str:
    return f"https://wa.me/{WHATSAPP}?text={quote(text)}"


def get_hours(_query: str = "") -> dict:
    status = kitchen_status()
    holiday = CLOSED_DATES.get(today_iso())
    extra = f" Today is {holiday}, so we are shut." if holiday else ""
    return _ok(f"{status['label']}. Today {status['hours_today']}.{extra}")


def get_location(_query: str = "") -> dict:
    return _ok(
        "We are at B-Block, Rajiv Chowk (CP), New Delhi. Rajiv Chowk Metro Gate 4 is the shortest walk."
    )


def get_today_offer(_query: str = "") -> dict:
    day = now_ist().weekday()
    js_day = (day + 1) % 7
    return _ok(DAILY_SPECIALS[js_day])


def lookup_menu(query: str = "") -> dict:
    q = (query or "").lower()
    dishes = load_dishes()
    veg = [d for d in dishes if d["diet"].lower() == "veg"]
    if "veg" in q and "non" not in q:
        names = ", ".join(d["title"].title() for d in veg)
        return _ok(f"We have {len(veg)} vegetarian dishes. {names}.")
    hits = search_menu(query)
    lines = [format_dish(d) for d in hits[:8]]
    return _ok(" ".join(lines))


def recommend_dishes(party_size: str = "2", diet: str = "") -> dict:
    guests = max(1, int(str(party_size).split()[0] or 2))
    dishes = load_dishes()
    if diet.lower() == "veg":
        dishes = [d for d in dishes if d["diet"].lower() == "veg"]
    picks = dishes[: min(guests + 1, len(dishes))]
    names = ", ".join(f"{d['title'].title()} (₹{d['price']})" for d in picks)
    return _ok(f"For {guests}, I would do {names}. That shares well without over-ordering.")


def check_availability(date: str, time: str, party_size: str) -> dict:
    try:
        response = httpx.post(
            f"{KITCHEN_API}/api/reservations/availability",
            json={"date": date, "time": time, "partySize": party_size},
            timeout=12,
        )
        data = response.json()
    except httpx.HTTPError:
        return _ok("I could not check the book just now.")
    if data.get("closed"):
        return _ok(f"We are closed that day for {data['closed']}.")
    options = data.get("options") or []
    if not options:
        exact = data.get("exact")
        if exact:
            label = format_guest_time(exact["time"])
            return _ok(f"{label} is free for {party_size}. Shall I hold it?", options=options, exact=exact)
        return _ok("That window is full. Could you try another time?")
    labels = [format_guest_time(row["time"]) for row in options]
    listed = "\n".join(labels)
    return _ok(
        f"I found two available times:\n{listed}\nWhich works better?",
        options=options,
        exact=data.get("exact"),
    )


def book_table(
    first_name: str,
    last_name: str,
    email: str,
    phone: str,
    date: str,
    time: str,
    party_size: str,
    seating: str = "Indoor",
    notes: str = "",
) -> dict:
    holiday = CLOSED_DATES.get(date)
    when = f"{format_guest_date(date)} at {format_guest_time(time)}"
    if holiday:
        return _ok(f"We are closed on {format_guest_date(date)} for {holiday}. Could you pick another day?")
    if not is_open_at(date, time):
        return _ok(f"We are not serving at that time on {format_guest_date(date)}. We are open {opening_label(date)}.")
    payload = {
        "firstName": first_name,
        "lastName": last_name,
        "email": email,
        "phone": phone,
        "date": date,
        "time": time,
        "partySize": str(party_size),
        "seating": seating or "Indoor",
        "notes": notes or "Booked by concierge",
    }
    try:
        response = httpx.post(f"{KITCHEN_API}/api/reservations", json=payload, timeout=12)
        data = response.json()
        if response.is_error:
            return _ok(data.get("message") or "I could not complete that reservation just now.")
        saved = data.get("reservation") or {}
        place = (seating or "Indoor").strip().lower()
        if place == "indoor":
            place = "indoors"
        guests = "1 guest" if str(party_size) == "1" else f"{party_size} guests"
        message = (
            f"Perfect. I've requested a table for {guests} on {when}, {place}. "
            "The restaurant will confirm your reservation via WhatsApp."
        )
        wa = _whatsapp(
            "\n".join(
                [
                    f"Table request — Ayush Restaurant",
                    f"Name: {first_name} {last_name}",
                    f"Guests: {party_size}",
                    f"When: {when}",
                    f"Seating: {seating or 'Indoor'}",
                    f"Phone: {phone}",
                ]
            )
        )
        return _ok(message, whatsapp_url=wa, reservation=saved)
    except httpx.HTTPError:
        return _ok("I could not reach the kitchen just now.")


def modify_reservation(reservation_id: str, phone: str, party_size: str | None = None, date: str | None = None, time: str | None = None) -> dict:
    payload = {"phone": phone}
    if party_size:
        payload["partySize"] = party_size
    if date:
        payload["date"] = date
    if time:
        payload["time"] = time
    try:
        response = httpx.patch(
            f"{KITCHEN_API}/api/reservations/{reservation_id}/guest",
            json=payload,
            timeout=12,
        )
        data = response.json()
        if response.is_error:
            return _ok(data.get("message") or "I could not update that reservation.")
        saved = data.get("reservation") or {}
        guests = saved.get("partySize") or party_size
        return _ok(f"Sure. I've updated your request to {guests} guests.", reservation=saved)
    except httpx.HTTPError:
        return _ok("I could not update that reservation just now.")


def cancel_reservation(reservation_id: str, phone: str) -> dict:
    try:
        response = httpx.patch(
            f"{KITCHEN_API}/api/reservations/{reservation_id}/guest",
            json={"phone": phone, "status": "cancelled"},
            timeout=12,
        )
        data = response.json()
        if response.is_error:
            return _ok(data.get("message") or "I could not cancel that reservation.")
        return _ok("Your reservation has been cancelled.", reservation=data.get("reservation"))
    except httpx.HTTPError:
        return _ok("I could not cancel that just now.")


def place_order(
    dish_title: str,
    price: float,
    customer_name: str,
    phone: str,
    pickup_time: str = "",
    notes: str = "",
) -> dict:
    payload = {
        "dishTitle": dish_title,
        "price": price,
        "customerName": customer_name,
        "phone": phone,
        "pickupTime": pickup_time,
        "notes": notes or "Placed by concierge",
    }
    try:
        response = httpx.post(f"{KITCHEN_API}/api/orders", json=payload, timeout=12)
        data = response.json()
        if response.is_error:
            return _ok(data.get("message") or "The kitchen could not take that order.")
        return _ok(
            f"Order in for {customer_name}: {dish_title}. "
            f"{'Pickup around ' + pickup_time + '.' if pickup_time else 'We will prep as soon as we can.'}"
        )
    except httpx.HTTPError:
        return _ok("I could not reach the kitchen just now.")


def find_dish(query: str) -> dict | None:
    hits = search_menu(query)
    if not hits:
        return None
    q = query.lower()
    for dish in hits:
        if q in dish["title"].lower():
            return dish
    return hits[0]


TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "get_hours",
            "description": "Kitchen hours and whether we are open.",
            "parameters": {"type": "object", "properties": {"query": {"type": "string"}}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_location",
            "description": "Address, metro, parking.",
            "parameters": {"type": "object", "properties": {"query": {"type": "string"}}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_today_offer",
            "description": "Today's daily special.",
            "parameters": {"type": "object", "properties": {"query": {"type": "string"}}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "lookup_menu",
            "description": "Search the menu, including vegetarian dishes.",
            "parameters": {
                "type": "object",
                "properties": {"query": {"type": "string"}},
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "recommend_dishes",
            "description": "Recommend dishes for a party size, optionally vegetarian.",
            "parameters": {
                "type": "object",
                "properties": {
                    "party_size": {"type": "string"},
                    "diet": {"type": "string"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_availability",
            "description": "Check table availability around a date and time for a party size. Returns nearby open slots.",
            "parameters": {
                "type": "object",
                "properties": {
                    "date": {"type": "string"},
                    "time": {"type": "string"},
                    "party_size": {"type": "string"},
                },
                "required": ["date", "time", "party_size"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "book_table",
            "description": "Create a reservation after availability is confirmed.",
            "parameters": {
                "type": "object",
                "properties": {
                    "first_name": {"type": "string"},
                    "last_name": {"type": "string"},
                    "email": {"type": "string"},
                    "phone": {"type": "string"},
                    "date": {"type": "string"},
                    "time": {"type": "string"},
                    "party_size": {"type": "string"},
                    "seating": {"type": "string"},
                    "notes": {"type": "string"},
                },
                "required": ["first_name", "last_name", "email", "phone", "date", "time", "party_size"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "modify_reservation",
            "description": "Change guests, date, or time on an existing reservation.",
            "parameters": {
                "type": "object",
                "properties": {
                    "reservation_id": {"type": "string"},
                    "phone": {"type": "string"},
                    "party_size": {"type": "string"},
                    "date": {"type": "string"},
                    "time": {"type": "string"},
                },
                "required": ["reservation_id", "phone"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "cancel_reservation",
            "description": "Cancel an existing reservation after the guest confirms.",
            "parameters": {
                "type": "object",
                "properties": {
                    "reservation_id": {"type": "string"},
                    "phone": {"type": "string"},
                },
                "required": ["reservation_id", "phone"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "place_order",
            "description": "Place a takeaway order.",
            "parameters": {
                "type": "object",
                "properties": {
                    "dish_title": {"type": "string"},
                    "price": {"type": "number"},
                    "customer_name": {"type": "string"},
                    "phone": {"type": "string"},
                    "pickup_time": {"type": "string"},
                    "notes": {"type": "string"},
                },
                "required": ["dish_title", "price", "customer_name", "phone"],
            },
        },
    },
]


def run_tool(name: str, args: dict) -> dict:
    if name == "get_hours":
        return get_hours(args.get("query", ""))
    if name == "get_location":
        return get_location(args.get("query", ""))
    if name == "get_today_offer":
        return get_today_offer(args.get("query", ""))
    if name == "lookup_menu":
        return lookup_menu(args.get("query", ""))
    if name == "recommend_dishes":
        return recommend_dishes(args.get("party_size", "2"), args.get("diet", ""))
    if name == "check_availability":
        return check_availability(args["date"], args["time"], str(args["party_size"]))
    if name == "book_table":
        return book_table(
            first_name=args["first_name"],
            last_name=args["last_name"],
            email=args["email"],
            phone=args["phone"],
            date=args["date"],
            time=args["time"],
            party_size=str(args["party_size"]),
            seating=args.get("seating") or "Indoor",
            notes=args.get("notes") or "",
        )
    if name == "modify_reservation":
        return modify_reservation(
            args["reservation_id"],
            args["phone"],
            party_size=args.get("party_size"),
            date=args.get("date"),
            time=args.get("time"),
        )
    if name == "cancel_reservation":
        return cancel_reservation(args["reservation_id"], args["phone"])
    if name == "place_order":
        return place_order(
            dish_title=args["dish_title"],
            price=float(args["price"]),
            customer_name=args["customer_name"],
            phone=args["phone"],
            pickup_time=args.get("pickup_time") or "",
            notes=args.get("notes") or "",
        )
    return _ok("Unknown tool.")
