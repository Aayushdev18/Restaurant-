import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.VERCEL ? "/tmp/ayush-store" : path.join(__dirname, "data");
const dataFile = path.join(dataDir, "store.json");

const empty = () => ({ reservations: [], orders: [], inquiries: [] });

const memoryKey = "__ayushRestaurantStore";
const memory = () => {
  if (!globalThis[memoryKey]) globalThis[memoryKey] = empty();
  return globalThis[memoryKey];
};

const read = () => {
  const data = empty();
  const mem = memory();
  for (const key of Object.keys(data)) {
    if (Array.isArray(mem[key])) data[key] = mem[key];
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    for (const key of Object.keys(data)) {
      if (Array.isArray(parsed[key]) && parsed[key].length >= data[key].length) {
        data[key] = parsed[key];
      }
    }
  } catch {
    // Memory/tmp store until the first write.
  }
  globalThis[memoryKey] = data;
  return data;
};

const write = (data) => {
  globalThis[memoryKey] = data;
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
  } catch {
    // Vercel disk can be read-only outside /tmp; memory still holds the row.
  }
};

const stamp = (doc) => ({
  ...doc,
  id: doc.id || randomUUID(),
  createdAt: doc.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const fileStore = {
  async create(collection, doc) {
    const data = read();
    const saved = stamp(doc);
    data[collection].unshift(saved);
    write(data);
    return saved;
  },
  async list(collection) {
    return read()[collection];
  },
  async update(collection, id, patch) {
    const data = read();
    const index = data[collection].findIndex((row) => row.id === id || String(row._id) === id);
    if (index === -1) return null;
    data[collection][index] = {
      ...data[collection][index],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    write(data);
    return data[collection][index];
  },
};
