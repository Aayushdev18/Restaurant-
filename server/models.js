import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, minlength: 2 },
    lastName: { type: String, required: true, minlength: 2 },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    partySize: { type: String, required: true },
    seating: { type: String, default: "Indoor" },
    notes: { type: String, default: "" },
    status: { type: String, enum: ["pending", "confirmed", "cancelled", "seated"], default: "pending" },
  },
  { timestamps: true }
);

const orderSchema = new mongoose.Schema(
  {
    dishTitle: { type: String, required: true },
    price: { type: Number, required: true },
    customerName: { type: String, required: true },
    phone: { type: String, required: true },
    pickupTime: { type: String, default: "" },
    notes: { type: String, default: "" },
    status: { type: String, enum: ["pending", "preparing", "ready", "cancelled"], default: "pending" },
  },
  { timestamps: true }
);

const inquirySchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    name: { type: String, default: "" },
    phone: { type: String, default: "" },
    message: { type: String, required: true },
    status: { type: String, enum: ["new", "contacted", "closed"], default: "new" },
  },
  { timestamps: true }
);

export const Reservation = mongoose.model("Reservation", reservationSchema);
export const Order = mongoose.model("Order", orderSchema);
export const Inquiry = mongoose.model("Inquiry", inquirySchema);

export const serialize = (doc) => {
  const json = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return { ...json, id: json.id || String(json._id) };
};
