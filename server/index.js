import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Inquiry, Order, Reservation, serialize } from "./models.js";
import { fileStore } from "./fileStore.js";
import { computeAvailability } from "./availability.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = Number(process.env.PORT) || 5001;
const ADMIN_KEY = process.env.ADMIN_KEY || "ayush-kitchen";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ayush-restaurant";

app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));
app.use(express.json());

let useMongo = false;

const requireAdmin = (req, res, next) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (token !== ADMIN_KEY) {
    return res.status(401).json({ message: "Kitchen login required." });
  }
  next();
};

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    store: useMongo ? "mongodb" : "file",
    restaurant: "Ayush Restaurant",
  });
});

app.post("/api/auth/login", (req, res) => {
  const password = String(req.body?.password || "");
  if (password !== ADMIN_KEY) {
    return res.status(401).json({ message: "Wrong kitchen password." });
  }
  res.json({ token: ADMIN_KEY, message: "Logged in." });
});

app.post("/api/reservations", async (req, res) => {
  try {
    const body = req.body || {};
    const required = ["firstName", "lastName", "email", "phone", "date", "time", "partySize"];
    if (required.some((key) => !String(body[key] || "").trim())) {
      return res.status(400).json({ message: "Please fill in every reservation field." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return res.status(400).json({ message: "Enter a valid email." });
    }
    const phone = String(body.phone).replace(/\D/g, "");
    if (phone.length !== 10) {
      return res.status(400).json({ message: "Enter a 10-digit mobile number." });
    }

    const payload = {
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      email: body.email.trim().toLowerCase(),
      phone,
      date: body.date,
      time: body.time,
      partySize: String(body.partySize),
      seating: body.seating || "Indoor",
      notes: body.notes?.trim() || "",
      status: "pending",
    };

    if (useMongo) {
      const saved = await Reservation.create(payload);
      return res.status(201).json({ message: "Table request saved.", reservation: serialize(saved) });
    }
    const saved = await fileStore.create("reservations", payload);
    return res.status(201).json({ message: "Table request saved.", reservation: saved });
  } catch (error) {
    res.status(500).json({ message: error.message || "Could not save reservation." });
  }
});

const listReservations = async () =>
  useMongo ? (await Reservation.find()).map(serialize) : fileStore.list("reservations");

const findReservation = async (id) => {
  if (useMongo) {
    const row = await Reservation.findById(id);
    return row ? serialize(row) : null;
  }
  const rows = await fileStore.list("reservations");
  return rows.find((row) => row.id === id) || null;
};

app.post("/api/reservations/availability", async (req, res) => {
  try {
    const date = String(req.body?.date || "");
    const time = String(req.body?.time || "");
    const partySize = req.body?.partySize || req.body?.guests || 2;
    const rows = await listReservations();
    res.json(computeAvailability(rows, date, time, partySize));
  } catch (error) {
    res.status(500).json({ message: error.message || "Could not check availability." });
  }
});

app.get("/api/reservations/lookup", async (req, res) => {
  const phone = String(req.query.phone || "").replace(/\D/g, "");
  if (phone.length !== 10) {
    return res.status(400).json({ message: "Need a 10-digit mobile number." });
  }
  const rows = (await listReservations()).filter(
    (row) => row.phone === phone && row.status !== "cancelled"
  );
  res.json({ reservations: rows });
});

app.patch("/api/reservations/:id/guest", async (req, res) => {
  try {
    const phone = String(req.body?.phone || "").replace(/\D/g, "");
    const existing = await findReservation(req.params.id);
    if (!existing || existing.phone !== phone) {
      return res.status(404).json({ message: "No matching reservation." });
    }
    const patch = {};
    if (req.body.partySize != null) patch.partySize = String(req.body.partySize);
    if (req.body.date) patch.date = req.body.date;
    if (req.body.time) patch.time = req.body.time;
    if (req.body.seating) patch.seating = req.body.seating;
    if (req.body.status === "cancelled") patch.status = "cancelled";
    if (!Object.keys(patch).length) {
      return res.status(400).json({ message: "Nothing to update." });
    }
    if (useMongo) {
      const saved = await Reservation.findByIdAndUpdate(req.params.id, patch, { new: true });
      return res.json({ reservation: serialize(saved) });
    }
    const saved = await fileStore.update("reservations", req.params.id, patch);
    res.json({ reservation: saved });
  } catch (error) {
    res.status(500).json({ message: error.message || "Could not update reservation." });
  }
});

app.get("/api/reservations", requireAdmin, async (_req, res) => {
  const rows = useMongo
    ? (await Reservation.find().sort({ createdAt: -1 })).map(serialize)
    : await fileStore.list("reservations");
  res.json({ reservations: rows });
});

app.patch("/api/reservations/:id", requireAdmin, async (req, res) => {
  const status = req.body?.status;
  const allowed = ["pending", "confirmed", "cancelled", "seated"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "Invalid status." });
  }
  if (useMongo) {
    const saved = await Reservation.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!saved) return res.status(404).json({ message: "Not found." });
    return res.json({ reservation: serialize(saved) });
  }
  const saved = await fileStore.update("reservations", req.params.id, { status });
  if (!saved) return res.status(404).json({ message: "Not found." });
  res.json({ reservation: saved });
});

app.post("/api/orders", async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.dishTitle || body.price == null || !body.customerName || !body.phone) {
      return res.status(400).json({ message: "Name, phone, and dish are required." });
    }
    const phone = String(body.phone).replace(/\D/g, "");
    if (phone.length !== 10) {
      return res.status(400).json({ message: "Enter a 10-digit mobile number." });
    }
    const payload = {
      dishTitle: body.dishTitle,
      price: Number(body.price),
      customerName: body.customerName.trim(),
      phone,
      pickupTime: body.pickupTime || "",
      notes: body.notes?.trim() || "",
      status: "pending",
    };
    if (useMongo) {
      const saved = await Order.create(payload);
      return res.status(201).json({ message: "Order received by the kitchen.", order: serialize(saved) });
    }
    const saved = await fileStore.create("orders", payload);
    return res.status(201).json({ message: "Order received by the kitchen.", order: saved });
  } catch (error) {
    res.status(500).json({ message: error.message || "Could not save order." });
  }
});

app.get("/api/orders", requireAdmin, async (_req, res) => {
  const rows = useMongo
    ? (await Order.find().sort({ createdAt: -1 })).map(serialize)
    : await fileStore.list("orders");
  res.json({ orders: rows });
});

app.patch("/api/orders/:id", requireAdmin, async (req, res) => {
  const status = req.body?.status;
  if (!["pending", "preparing", "ready", "cancelled"].includes(status)) {
    return res.status(400).json({ message: "Invalid status." });
  }
  if (useMongo) {
    const saved = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!saved) return res.status(404).json({ message: "Not found." });
    return res.json({ order: serialize(saved) });
  }
  const saved = await fileStore.update("orders", req.params.id, { status });
  if (!saved) return res.status(404).json({ message: "Not found." });
  res.json({ order: saved });
});

app.post("/api/inquiries", async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.type || !body.message) {
      return res.status(400).json({ message: "Inquiry type and message are required." });
    }
    const payload = {
      type: body.type,
      name: body.name?.trim() || "",
      phone: String(body.phone || "").replace(/\D/g, ""),
      message: body.message,
      status: "new",
    };
    if (useMongo) {
      const saved = await Inquiry.create(payload);
      return res.status(201).json({ message: "Inquiry saved.", inquiry: serialize(saved) });
    }
    const saved = await fileStore.create("inquiries", payload);
    return res.status(201).json({ message: "Inquiry saved.", inquiry: saved });
  } catch (error) {
    res.status(500).json({ message: error.message || "Could not save inquiry." });
  }
});

app.get("/api/inquiries", requireAdmin, async (_req, res) => {
  const rows = useMongo
    ? (await Inquiry.find().sort({ createdAt: -1 })).map(serialize)
    : await fileStore.list("inquiries");
  res.json({ inquiries: rows });
});

app.patch("/api/inquiries/:id", requireAdmin, async (req, res) => {
  const status = req.body?.status;
  if (!["new", "contacted", "closed"].includes(status)) {
    return res.status(400).json({ message: "Invalid status." });
  }
  if (useMongo) {
    const saved = await Inquiry.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!saved) return res.status(404).json({ message: "Not found." });
    return res.json({ inquiry: serialize(saved) });
  }
  const saved = await fileStore.update("inquiries", req.params.id, { status });
  if (!saved) return res.status(404).json({ message: "Not found." });
  res.json({ inquiry: saved });
});

const start = async () => {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 2500 });
    useMongo = true;
    console.log(`MongoDB connected: ${MONGO_URI}`);
  } catch (error) {
    useMongo = false;
    console.warn(`MongoDB unavailable (${error.message}). Using local JSON store.`);
  }

  app.listen(PORT, () => {
    console.log(`Ayush kitchen API on http://localhost:${PORT} [${useMongo ? "mongodb" : "file"}]`);
  });
};

start();
