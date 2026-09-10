import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "store.json");

const empty = () => ({ reservations: [], orders: [], inquiries: [] });

const read = () => {
  try {
    return { ...empty(), ...JSON.parse(fs.readFileSync(dataFile, "utf8")) };
  } catch {
    return empty();
  }
};

const write = (data) => {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
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
