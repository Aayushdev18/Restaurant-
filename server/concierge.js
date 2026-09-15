import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computeAvailability, isOpenAt } from "./availability.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MENU_PATH = path.join(__dirname, "../src/restApi.json");
const WHATSAPP = process.env.RESTAURANT_WHATSAPP || "919999085486";

const CLOSED_DATES = {
  "2026-01-26": "Republic Day",
  "2026-03-14": "Holi",
  "2026-08-15": "Independence Day",
  "2026-11-08": "Diwali",
  "2026-12-25": "Christmas",
};

const DAILY_SPECIALS = {
  0: "Sunday brunch table — harvest grain bowl + filter coffee, ₹599 for two. From 10am.",
  1: "Monday office lunch — spaghetti or burger + a soft drink, ₹449 a head.",
  2: "Tuesday biryani night — dum biryani for two, ₹1,099. Message before 6pm.",
  3: "Wednesday pasta + wine — Italian spaghetti and a house pour, ₹899.",
  4: "Thursday after-work — burger meal and a mocktail, ₹749 from 6pm.",
  5: "Friday catch — grilled fish and market vegetables, ₹1,299. Book 7–9pm.",
  6: "Saturday chef’s table — four courses, ₹2,499 a head. Eight seats.",
};

const WORD_NUMBERS = {
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
  couple: "2",
};

const MONTHS = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sept: 9,
  sep: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

const loadDishes = () => JSON.parse(fs.readFileSync(MENU_PATH, "utf8")).data[0].dishes;

const todayIso = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const openingLabel = (dateStr) => {
  const day = new Date(`${dateStr}T12:00:00`).getDay();
  if (day === 0) return "10:00 AM – 10:00 PM";
  if (day === 6) return "10:00 AM – 11:00 PM";
  return "11:00 AM – 11:00 PM";
};

const formatGuestDate = (dateStr) => {
  const dt = new Date(`${dateStr}T12:00:00`);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
  return `${dt.toLocaleDateString("en-IN", { weekday: "long" })}, ${months[dt.getMonth()]} ${dt.getDate()}`;
};

const formatGuestTime = (timeStr) => {
  const [hours, minutes] = String(timeStr).split(":").map(Number);
  const suffix = hours < 12 ? "AM" : "PM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
};

const formatDish = (dish) =>
  `${dish.title.replace(/\b\w/g, (c) => c.toUpperCase())} — ₹${dish.price}, ${dish.diet}, ${dish.spice} spice.`;

const safeDate = (year, month, day) => {
  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const parseBookingDate = (text) => {
  const t = String(text || "").toLowerCase().trim();
  const today = todayIso();
  const [ty, tm, td] = today.split("-").map(Number);

  const iso = t.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) return safeDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const monthNames = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join("|");
  let named = t.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${monthNames})(?:[,\\s]+(\\d{4}))?\\b`));
  if (named) {
    let built = safeDate(Number(named[3] || ty), MONTHS[named[2]], Number(named[1]));
    if (built && built < today && !named[3]) built = safeDate(Number(named[3] || ty) + 1, MONTHS[named[2]], Number(named[1]));
    return built;
  }
  named = t.match(new RegExp(`\\b(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:[,\\s]+(\\d{4}))?\\b`));
  if (named) {
    let built = safeDate(Number(named[3] || ty), MONTHS[named[1]], Number(named[2]));
    if (built && built < today && !named[3]) built = safeDate(Number(named[3] || ty) + 1, MONTHS[named[1]], Number(named[2]));
    return built;
  }

  if (t.includes("day after tomorrow")) {
    const d = new Date(ty, tm - 1, td + 2);
    return safeDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }
  if (t.includes("tomorrow")) {
    const d = new Date(ty, tm - 1, td + 1);
    return safeDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }
  if (/\btoday\b/.test(t)) return today;

  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const todayJs = new Date(`${today}T12:00:00`).getDay();
  for (let i = 0; i < weekdays.length; i += 1) {
    if (new RegExp(`\\b${weekdays[i]}\\b`).test(t) || new RegExp(`\\b${weekdays[i].slice(0, 3)}\\b`).test(t)) {
      let delta = (i - todayJs + 7) % 7;
      if (delta === 0) delta = 7;
      const d = new Date(ty, tm - 1, td + delta);
      return safeDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
    }
  }

  if (/^\d{1,2}$/.test(t)) {
    const day = Number(t);
    let built = safeDate(ty, tm, day);
    if (!built || built < today) {
      let month = tm + 1;
      let year = ty;
      if (month === 13) {
        month = 1;
        year += 1;
      }
      built = safeDate(year, month, day);
    }
    return built;
  }
  return null;
};

const parseParty = (lower) => {
  const compact = lower.replace(/[\s-]/g, "");
  if (WORD_NUMBERS[compact]) return WORD_NUMBERS[compact];
  let match = lower.match(
    /\b(?:for|party of|table for|we are|we're)?\s*(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten|couple|dozen)\s*(?:people|guests|of us|pax|persons?)?\b/
  );
  if (!match) match = lower.trim().match(/^(\d{1,3})$/);
  if (!match) return null;
  const token = match[1];
  if (token === "dozen") return "12";
  const size = WORD_NUMBERS[token] || token;
  if (/^\d+$/.test(size) && Number(size) >= 1 && Number(size) <= 999) return String(Number(size));
  return null;
};

const parseTime = (lower) => {
  let match = lower.match(/\b(\d{1,2})(?::(\d{2}))\s*(am|pm)?\b/);
  if (!match) {
    match = lower.match(/\b(\d{1,2})\s*(am|pm)\b/);
    if (!match) {
      if (lower.includes("noon")) return "12:00";
      return null;
    }
    let hour = Number(match[1]);
    const suffix = match[2];
    if (suffix === "pm" && hour < 12) hour += 12;
    if (suffix === "am" && hour === 12) hour = 0;
    return `${String(hour).padStart(2, "0")}:00`;
  }
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const suffix = match[3];
  if (suffix === "pm" && hour < 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  if (!suffix && hour < 8) hour += 12;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

const whatsappUrl = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;

const searchMenu = (query) => {
  const dishes = loadDishes();
  const q = String(query || "").trim().toLowerCase();
  if (!q || q === "menu" || q === "all" || q.includes("menu")) {
    const dishHit = dishes.some((d) => d.title.toLowerCase().split(" ")[0] && q.includes(d.title.toLowerCase().split(" ")[0]));
    if (!dishHit) return dishes;
  }
  const hits = dishes.filter((dish) => {
    const blob = [dish.title, dish.category, dish.diet, dish.spice, dish.description, ...(dish.allergens || []), dish.chefNote || ""]
      .join(" ")
      .toLowerCase();
    return blob.includes(q) || q.split(" ").filter((w) => w.length > 2).some((w) => blob.includes(w));
  });
  return hits.length ? hits : dishes;
};

export const createConcierge = (kitchen) => {
  const sessions = new Map();

  const stateFor = (id) => {
    if (!sessions.has(id)) sessions.set(id, { pending: null, slots: {}, history: [] });
    return sessions.get(id);
  };

  const ok = (message, extra = {}) => ({ message, ...extra });

  const kitchenStatus = () => {
    const dateStr = todayIso();
    const holiday = CLOSED_DATES[dateStr];
    if (holiday) return { open: false, label: `Closed for ${holiday}`, hours_today: openingLabel(dateStr) };
    const now = new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour12: false }).slice(0, 5);
    const openNow = isOpenAt(dateStr, now);
    return {
      open: openNow,
      label: openNow ? "Kitchen is open" : "Kitchen is closed",
      hours_today: openingLabel(dateStr),
    };
  };

  const tools = {
    get_hours: () => {
      const status = kitchenStatus();
      const holiday = CLOSED_DATES[todayIso()];
      const extra = holiday ? ` Today is ${holiday}, so we are shut.` : "";
      return ok(`${status.label}. Today ${status.hours_today}.${extra}`);
    },
    get_location: () =>
      ok("We are at B-Block, Rajiv Chowk (CP), New Delhi. Rajiv Chowk Metro Gate 4 is the shortest walk."),
    get_today_offer: () => ok(DAILY_SPECIALS[new Date(`${todayIso()}T12:00:00`).getDay()]),
    lookup_menu: ({ query = "" } = {}) => {
      const dishes = loadDishes();
      const q = String(query).toLowerCase();
      const veg = dishes.filter((d) => d.diet.toLowerCase() === "veg");
      if (q.includes("veg") && !q.includes("non")) {
        return ok(`We have ${veg.length} vegetarian dishes. ${veg.map((d) => d.title.replace(/\b\w/g, (c) => c.toUpperCase())).join(", ")}.`);
      }
      return ok(searchMenu(query).slice(0, 8).map(formatDish).join(" "));
    },
    recommend_dishes: ({ party_size = "2", diet = "" } = {}) => {
      const guests = Math.max(1, Number(String(party_size).split(" ")[0]) || 2);
      let dishes = loadDishes();
      if (String(diet).toLowerCase() === "veg") dishes = dishes.filter((d) => d.diet.toLowerCase() === "veg");
      const picks = dishes.slice(0, Math.min(guests + 1, dishes.length));
      const names = picks.map((d) => `${d.title.replace(/\b\w/g, (c) => c.toUpperCase())} (₹${d.price})`).join(", ");
      return ok(`For ${guests}, I would do ${names}. That shares well without over-ordering.`);
    },
    check_availability: async ({ date, time, party_size }) => {
      const rows = await kitchen.listReservations();
      const data = computeAvailability(rows, date, time, party_size);
      if (data.closed) return ok(`We are closed that day for ${data.closed}.`);
      const options = data.options || [];
      if (!options.length) {
        if (data.exact) return ok(`${formatGuestTime(data.exact.time)} is free for ${party_size}. Shall I hold it?`, { options, exact: data.exact });
        return ok("That window is full. Could you try another time?");
      }
      const listed = options.map((row) => formatGuestTime(row.time)).join("\n");
      return ok(`I found two available times:\n${listed}\nWhich works better?`, { options, exact: data.exact });
    },
    book_table: async (args) => {
      const holiday = CLOSED_DATES[args.date];
      const when = `${formatGuestDate(args.date)} at ${formatGuestTime(args.time)}`;
      if (holiday) return ok(`We are closed on ${formatGuestDate(args.date)} for ${holiday}. Could you pick another day?`);
      if (!isOpenAt(args.date, args.time)) {
        return ok(`We are not serving at that time on ${formatGuestDate(args.date)}. We are open ${openingLabel(args.date)}.`);
      }
      const saved = await kitchen.createReservation({
        firstName: args.first_name,
        lastName: args.last_name,
        email: args.email,
        phone: args.phone,
        date: args.date,
        time: args.time,
        partySize: String(args.party_size),
        seating: args.seating || "Indoor",
        notes: args.notes || "Booked by concierge",
      });
      const place = (args.seating || "Indoor").toLowerCase() === "indoor" ? "indoors" : (args.seating || "Indoor").toLowerCase();
      const guests = String(args.party_size) === "1" ? "1 guest" : `${args.party_size} guests`;
      const message = `Perfect. I've requested a table for ${guests} on ${when}, ${place}. The restaurant will confirm your reservation via WhatsApp.`;
      const wa = whatsappUrl(
        [
          "Table request — Ayush Restaurant",
          `Name: ${args.first_name} ${args.last_name}`,
          `Guests: ${args.party_size}`,
          `When: ${when}`,
          `Seating: ${args.seating || "Indoor"}`,
          `Phone: ${args.phone}`,
        ].join("\n")
      );
      return ok(message, { whatsapp_url: wa, reservation: saved });
    },
    modify_reservation: async ({ reservation_id, phone, party_size, date, time }) => {
      const saved = await kitchen.updateGuestReservation(reservation_id, phone, {
        partySize: party_size,
        date,
        time,
      });
      if (!saved) return ok("I could not update that reservation.");
      return ok(`Sure. I've updated your request to ${saved.partySize || party_size} guests.`, { reservation: saved });
    },
    cancel_reservation: async ({ reservation_id, phone }) => {
      const saved = await kitchen.updateGuestReservation(reservation_id, phone, { status: "cancelled" });
      if (!saved) return ok("I could not cancel that reservation.");
      return ok("Your reservation has been cancelled.", { reservation: saved });
    },
    place_order: async (args) => {
      await kitchen.createOrder({
        dishTitle: args.dish_title,
        price: args.price,
        customerName: args.customer_name,
        phone: args.phone,
        pickupTime: args.pickup_time || "",
        notes: args.notes || "Placed by concierge",
      });
      return ok(
        `Order in for ${args.customer_name}: ${args.dish_title}. ${args.pickup_time ? `Pickup around ${args.pickup_time}.` : "We will prep as soon as we can."}`
      );
    },
  };

  const runTool = async (state, name, args) => {
    const result = await tools[name](args || {});
    if (result.reservation) state.last_reservation = result.reservation;
    if (result.whatsapp_url) state.whatsapp_url = result.whatsapp_url;
    if (result.options) state.offered_slots = result.options;
    return result;
  };

  const neededSlot = (slots) => ["party_size", "date", "time", "first_name", "last_name", "phone"].find((key) => !slots[key]) || null;

  const harvest = (state, text) => {
    const slots = state.slots;
    const lower = text.toLowerCase().trim();
    const needed = state.pending === "book_table" ? neededSlot(slots) : null;

    if (needed === "party_size") {
      const party = parseParty(lower);
      if (party) {
        slots.party_size = party;
        return;
      }
    }
    if (needed === "date") {
      const date = parseBookingDate(lower);
      if (date) {
        slots.date = date;
        return;
      }
    }
    if (needed === "time") {
      let time = parseTime(lower);
      if (!time) {
        const bare = lower.match(/^(\d{1,2})(?:\s*o'?clock)?$/);
        if (bare && Number(bare[1]) >= 1 && Number(bare[1]) <= 12) time = parseTime(`${bare[1]} pm`);
      }
      if (time) {
        slots.time = time;
        return;
      }
    }
    if (needed === "first_name") {
      const parts = text.match(/[A-Za-z]+/g) || [];
      if (parts.length) {
        slots.first_name = parts[0][0].toUpperCase() + parts[0].slice(1).toLowerCase();
        if (parts[1]) slots.last_name = parts[1][0].toUpperCase() + parts[1].slice(1).toLowerCase();
        return;
      }
    }
    if (needed === "last_name") {
      const parts = text.match(/[A-Za-z]+/g) || [];
      if (parts.length) {
        const last = parts[parts.length - 1];
        slots.last_name = last[0].toUpperCase() + last.slice(1).toLowerCase();
        return;
      }
    }
    if (needed === "phone") {
      const digits = text.replace(/\D/g, "");
      if (digits.length >= 10) {
        slots.phone = digits.slice(-10);
        return;
      }
    }

    const date = parseBookingDate(lower);
    if (date && needed !== "party_size") slots.date = date;
    const time = parseTime(lower);
    if (time && needed !== "party_size") slots.time = time;
    const digits = text.replace(/\D/g, "");
    if (digits.length === 10) slots.phone = digits;
    const party = parseParty(lower);
    if (party && /for|guest|people|party|make it/.test(lower)) slots.party_size = party;
    if (/outdoor|outside/.test(lower)) slots.seating = "Outdoor";
    if (lower.includes("indoor")) slots.seating = "Indoor";
    const name = text.match(/(?:i am|i'm|this is|my name is|name is)\s+([a-zA-Z]+)(?:\s+([a-zA-Z]+))?/i);
    if (name) {
      slots.first_name = name[1][0].toUpperCase() + name[1].slice(1).toLowerCase();
      slots.last_name = name[2] ? name[2][0].toUpperCase() + name[2].slice(1).toLowerCase() : "Guest";
    }
  };

  const applySlotChoice = (state, lower) => {
    const times = (state.offered_slots || []).map((row) => (typeof row === "string" ? row : row.time));
    if (!times.length) return false;
    const parsed = parseTime(lower);
    if (parsed && times.includes(parsed)) {
      state.slots.time = parsed;
      state.time_confirmed = true;
      return true;
    }
    if (/(later|second|last)/.test(lower)) {
      state.slots.time = times[times.length - 1];
      state.time_confirmed = true;
      return true;
    }
    if (/(earlier|first|sooner)/.test(lower)) {
      state.slots.time = times[0];
      state.time_confirmed = true;
      return true;
    }
    return false;
  };

  const continueBooking = async (state) => {
    const slots = state.slots;
    if (slots.party_size && slots.date && slots.time && !state.time_confirmed) {
      const avail = await runTool(state, "check_availability", {
        date: slots.date,
        time: slots.time,
        party_size: slots.party_size,
      });
      state.pending = "choose_slot";
      return avail.message;
    }
    const need = [
      ["party_size", "How many guests?"],
      ["date", "Which date?"],
      ["time", "What time?"],
      ["first_name", "May I have a name for the table?"],
      ["last_name", "And the last name?"],
      ["phone", "Your mobile number?"],
    ];
    for (const [key, prompt] of need) {
      if (!slots[key]) return prompt;
    }
    const result = await runTool(state, "book_table", {
      first_name: slots.first_name,
      last_name: slots.last_name,
      email: slots.email || `guest.${slots.phone}@ayushrestaurant.com`,
      phone: slots.phone,
      date: slots.date,
      time: slots.time,
      party_size: slots.party_size,
      seating: slots.seating || "Indoor",
      notes: "Booked by concierge",
    });
    state.pending = null;
    state.slots = {};
    state.offered_slots = [];
    state.time_confirmed = false;
    return result.message;
  };

  const wantsCancel = (lower) => lower.includes("cancel") && /(reservation|booking|table)/.test(lower);
  const wantsModify = (lower) => /(actually|make it|change to|update to|change it)/.test(lower);
  const wantsRecommend = (lower) => lower.includes("recommend") || lower.includes("what should we eat");
  const wantsBooking = (lower) =>
    !wantsCancel(lower) &&
    !wantsModify(lower) &&
    !wantsRecommend(lower) &&
    /(book|reserve|reservation|hold a table|get a table|table for)/.test(lower);
  const wantsOrder = (lower) => /(order|takeaway|parcel|pickup|take away)/.test(lower);

  const localTurn = async (state, message) => {
    const text = message.trim();
    const lower = text.toLowerCase();
    harvest(state, text);

    if (state.pending === "confirm_cancel") {
      if (/(yes|sure|confirm|please|ok|yeah)/.test(lower)) {
        const last = state.last_reservation || {};
        state.pending = null;
        const result = await runTool(state, "cancel_reservation", {
          reservation_id: last.id,
          phone: last.phone,
        });
        return result.message;
      }
      state.pending = null;
      return "No problem. Your table stays as it is.";
    }

    if (wantsCancel(lower)) {
      const last = state.last_reservation;
      if (!last) return "I don't have a reservation on this chat yet.";
      state.pending = "confirm_cancel";
      return `Are you sure you'd like to cancel your ${formatGuestDate(last.date)} reservation for ${last.partySize || last.party_size} guests?`;
    }

    if (wantsModify(lower) && state.last_reservation) {
      const party = parseParty(lower);
      if (party) {
        const result = await runTool(state, "modify_reservation", {
          reservation_id: state.last_reservation.id,
          phone: state.last_reservation.phone,
          party_size: party,
        });
        return result.message;
      }
      return "What would you like to change?";
    }

    if (state.pending === "book_table" && /^(cancel|stop|never mind|nevermind)$/.test(lower)) {
      state.pending = null;
      state.slots = {};
      state.offered_slots = [];
      state.time_confirmed = false;
      return "Okay.";
    }

    if (state.pending === "choose_slot" || (state.offered_slots && state.pending === "book_table")) {
      if (applySlotChoice(state, lower)) {
        state.pending = "book_table";
        return continueBooking(state);
      }
    }

    if (wantsRecommend(lower)) {
      const result = await runTool(state, "recommend_dishes", {
        party_size: parseParty(lower) || "3",
        diet: lower.includes("veg") && !lower.includes("non") ? "veg" : "",
      });
      return result.message;
    }

    if (state.pending === "book_table" || wantsBooking(lower)) {
      state.pending = "book_table";
      return continueBooking(state);
    }
    if (state.pending === "place_order" || wantsOrder(lower)) {
      state.pending = "place_order";
      const slots = state.slots;
      if (!slots.dish_title && !["order", "takeaway", "parcel", "pickup", "take away"].includes(lower)) {
        for (const dish of loadDishes()) {
          const title = dish.title.toLowerCase();
          const tokens = title.replace(/’/g, "'").split(" ").filter((part) => part.length > 3);
          if (title && (lower.includes(title) || tokens.some((token) => lower.includes(token)))) {
            slots.dish_title = dish.title;
            slots.price = dish.price;
            break;
          }
        }
      }
      if (!slots.dish_title) {
        return "Which dish? Biryani, salmon toast, grain bowl, berry slice, burger, mussels, spaghetti, or grilled fish.";
      }
      if (!slots.first_name) return "Name for the takeaway?";
      if (!slots.phone) return "10-digit mobile for the order?";
      const pickup = parseTime(lower);
      const result = await runTool(state, "place_order", {
        dish_title: slots.dish_title,
        price: slots.price,
        customer_name: `${slots.first_name} ${slots.last_name || "Guest"}`.trim(),
        phone: slots.phone,
        pickup_time: pickup || slots.time || "",
      });
      state.pending = null;
      state.slots = {};
      return result.message;
    }
    if (/(hour|open|close|timing|when do you)/.test(lower)) return (await runTool(state, "get_hours", {})).message;
    if (/(where|address|park|metro|location|map)/.test(lower)) return (await runTool(state, "get_location", {})).message;
    if (/(offer|special|today's|todays)/.test(lower)) return (await runTool(state, "get_today_offer", {})).message;
    if (/(menu|biryani|veg|allerg|dish|price|eat|serve)/.test(lower)) {
      return (await runTool(state, "lookup_menu", { query: text })).message;
    }
    return "How can I help you?";
  };

  return {
    health: () => ({ ok: true, service: "concierge-agent", kitchen: kitchenStatus() }),
    reset: (sessionId) => {
      sessions.delete(sessionId);
      return { ok: true };
    },
    turn: async (sessionId, message, incoming = {}) => {
      const state = stateFor(sessionId);
      if (incoming.slots && typeof incoming.slots === "object") state.slots = { ...incoming.slots };
      if (incoming.pending !== undefined) state.pending = incoming.pending;
      if (incoming.last_reservation) state.last_reservation = incoming.last_reservation;
      if (incoming.offered_slots) state.offered_slots = incoming.offered_slots;
      if (incoming.time_confirmed) state.time_confirmed = true;
      const reply = await localTurn(state, message);
      return {
        reply,
        mode: "local",
        intent: state.pending || "answer",
        pending: state.pending || null,
        slots: { ...(state.slots || {}) },
        last_reservation: state.last_reservation || null,
        offered_slots: state.offered_slots || [],
        time_confirmed: Boolean(state.time_confirmed),
        whatsapp_url: state.whatsapp_url,
      };
    },
  };
};
