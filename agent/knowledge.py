"""Restaurant facts the host agent can answer without calling the kitchen API."""

from __future__ import annotations

import json
import re
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")
ROOT = Path(__file__).resolve().parent.parent
MENU_PATH = ROOT / "src" / "restApi.json"

CLOSED_DATES = {
    "2026-01-26": "Republic Day",
    "2026-03-14": "Holi",
    "2026-08-15": "Independence Day",
    "2026-11-08": "Diwali",
    "2026-12-25": "Christmas",
}

DAILY_SPECIALS = {
    0: "Sunday brunch table — harvest grain bowl + filter coffee, ₹599 for two. From 10am.",
    1: "Monday office lunch — spaghetti or burger + a soft drink, ₹449 a head.",
    2: "Tuesday biryani night — dum biryani for two, ₹1,099. Message before 6pm.",
    3: "Wednesday pasta + wine — Italian spaghetti and a house pour, ₹899.",
    4: "Thursday after-work — burger meal and a mocktail, ₹749 from 6pm.",
    5: "Friday catch — grilled fish and market vegetables, ₹1,299. Book 7–9pm.",
    6: "Saturday chef’s table — four courses, ₹2,499 a head. Eight seats.",
}


def now_ist() -> datetime:
    return datetime.now(IST)


def format_guest_date(date_str: str) -> str:
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"]
    return f"{dt.strftime('%A')}, {months[dt.month - 1]} {dt.day}"


def format_guest_time(time_str: str) -> str:
    hours, minutes = [int(part) for part in time_str.split(":")[:2]]
    suffix = "AM" if hours < 12 else "PM"
    hour12 = hours % 12 or 12
    return f"{hour12}:{minutes:02d} {suffix}"


def today_iso() -> str:
    return now_ist().date().isoformat()


def opening_label(date_str: str) -> str:
    day = datetime.strptime(date_str, "%Y-%m-%d").weekday()
    # Python weekday: Mon=0 … Sun=6. JS getDay: Sun=0.
    js_day = (day + 1) % 7
    if js_day == 0:
        return "10:00 AM – 10:00 PM"
    if js_day == 6:
        return "10:00 AM – 11:00 PM"
    return "11:00 AM – 11:00 PM"


def is_open_at(date_str: str, time_str: str) -> bool:
    if date_str in CLOSED_DATES:
        return False
    try:
        hours, minutes = [int(part) for part in time_str.split(":")[:2]]
    except (ValueError, AttributeError):
        return False
    day = datetime.strptime(date_str, "%Y-%m-%d").weekday()
    js_day = (day + 1) % 7
    stamp = hours * 60 + minutes
    opens = 10 * 60 if js_day in (0, 6) else 11 * 60
    closes = 22 * 60 if js_day == 0 else 23 * 60
    return opens <= stamp < closes


def kitchen_status() -> dict:
    now = now_ist()
    date_str = now.date().isoformat()
    holiday = CLOSED_DATES.get(date_str)
    if holiday:
        return {"open": False, "label": f"Closed for {holiday}", "hours": opening_label(date_str)}
    hhmm = now.strftime("%H:%M")
    open_now = is_open_at(date_str, hhmm)
    return {
        "open": open_now,
        "label": "Kitchen is open" if open_now else "Kitchen is closed",
        "hours_today": opening_label(date_str),
        "now": now.strftime("%I:%M %p").lstrip("0"),
        "phone": "+91 99990 85486",
        "address": "B-Block, Rajiv Chowk (CP), New Delhi 110001",
    }


def load_dishes() -> list[dict]:
    payload = json.loads(MENU_PATH.read_text(encoding="utf-8"))
    return payload["data"][0]["dishes"]


def search_menu(query: str) -> list[dict]:
    dishes = load_dishes()
    q = (query or "").strip().lower()
    if not q or q in {"menu", "all", "everything"} or "menu" in q:
        dish_hit = any(d["title"].lower().split()[0] in q for d in dishes)
        if not dish_hit:
            return dishes
    hits = []
    for dish in dishes:
        blob = " ".join(
            [
                dish["title"],
                dish["category"],
                dish["diet"],
                dish["spice"],
                dish["description"],
                " ".join(dish.get("allergens") or []),
                dish.get("chefNote") or "",
            ]
        ).lower()
        if q in blob or any(word in blob for word in q.split() if len(word) > 2):
            hits.append(dish)
    return hits or dishes


def format_dish(dish: dict) -> str:
    return f"{dish['title'].title()} — ₹{dish['price']}, {dish['diet']}, {dish['spice']} spice."


MONTHS = {
    "january": 1,
    "jan": 1,
    "february": 2,
    "feb": 2,
    "march": 3,
    "mar": 3,
    "april": 4,
    "apr": 4,
    "may": 5,
    "june": 6,
    "jun": 6,
    "july": 7,
    "jul": 7,
    "august": 8,
    "aug": 8,
    "september": 9,
    "sept": 9,
    "sep": 9,
    "october": 10,
    "oct": 10,
    "november": 11,
    "nov": 11,
    "december": 12,
    "dec": 12,
}


def _safe_date(year: int, month: int, day: int) -> str | None:
    try:
        return datetime(year, month, day).date().isoformat()
    except ValueError:
        return None


def parse_booking_date(text: str) -> str | None:
    """Accept tomorrow, weekdays, 15 Sep, 15/09/2026, 2026-09-20, the 20th, etc."""
    t = (text or "").lower().strip()
    today = now_ist().date()

    iso = re.search(r"\b(20\d{2})-(\d{1,2})-(\d{1,2})\b", t)
    if iso:
        return _safe_date(int(iso.group(1)), int(iso.group(2)), int(iso.group(3)))

    month_names = "|".join(sorted(MONTHS, key=len, reverse=True))
    named = re.search(
        rf"\b(\d{{1,2}})(?:st|nd|rd|th)?\s+(?:of\s+)?({month_names})(?:[,\s]+(\d{{4}}))?\b",
        t,
    )
    if named:
        day, month = int(named.group(1)), MONTHS[named.group(2)]
        year = int(named.group(3) or today.year)
        built = _safe_date(year, month, day)
        if built and built < today.isoformat() and not named.group(3):
            built = _safe_date(year + 1, month, day)
        return built
    named = re.search(
        rf"\b({month_names})\s+(\d{{1,2}})(?:st|nd|rd|th)?(?:[,\s]+(\d{{4}}))?\b",
        t,
    )
    if named:
        month, day = MONTHS[named.group(1)], int(named.group(2))
        year = int(named.group(3) or today.year)
        built = _safe_date(year, month, day)
        if built and built < today.isoformat() and not named.group(3):
            built = _safe_date(year + 1, month, day)
        return built

    dotted = re.search(r"\b(\d{1,2})[./\-](\d{1,2})(?:[./\-](\d{2,4}))?\b", t)
    if dotted:
        first, second = int(dotted.group(1)), int(dotted.group(2))
        year = int(dotted.group(3) or today.year)
        if year < 100:
            year += 2000
        if first > 12:
            month, day = second, first
        elif second > 12:
            month, day = first, second
        else:
            month, day = second, first
        built = _safe_date(year, month, day)
        if built and built < today.isoformat() and not dotted.group(3):
            built = _safe_date(year + 1, month, day)
        return built

    if "day after tomorrow" in t:
        return (today + timedelta(days=2)).isoformat()
    if "tomorrow" in t:
        return (today + timedelta(days=1)).isoformat()
    if re.search(r"\btoday\b", t):
        return today.isoformat()
    if "next week" in t:
        return (today + timedelta(days=7)).isoformat()

    weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    for i, name in enumerate(weekdays):
        if re.search(rf"\b{name}\b", t) or re.search(rf"\b{name[:3]}\b", t):
            delta = (i - today.weekday()) % 7
            if delta == 0:
                delta = 7
            return (today + timedelta(days=delta)).isoformat()

    ordinal = re.search(r"\b(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b", t)
    if ordinal:
        day = int(ordinal.group(1))
        built = _safe_date(today.year, today.month, day)
        if not built or built < today.isoformat():
            month, year = today.month + 1, today.year
            if month == 13:
                month, year = 1, year + 1
            built = _safe_date(year, month, day)
        return built

    if re.fullmatch(r"\d{1,2}", t):
        day = int(t)
        if 1 <= day <= 31:
            built = _safe_date(today.year, today.month, day)
            if not built or built < today.isoformat():
                month, year = today.month + 1, today.year
                if month == 13:
                    month, year = 1, year + 1
                built = _safe_date(year, month, day)
            return built
    return None


def resolve_relative_date(text: str) -> str | None:
    return parse_booking_date(text)
