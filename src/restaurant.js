export const restaurant = {
  name: "Ayush Restaurant",
  phoneDisplay: "+91 99990 85486",
  phoneTel: "+919999085486",
  whatsapp: "919999085486",
  email: "info@ayushrestaurant.com",
  addressLine: "B-Block, Rajiv Chowk (CP)",
  city: "New Delhi 110001",
  mapsQuery: "B-Block Rajiv Chowk Connaught Place New Delhi",
  closedDates: {
    "2026-01-26": "Republic Day",
    "2026-03-14": "Holi",
    "2026-08-15": "Independence Day",
    "2026-11-08": "Diwali",
    "2026-12-25": "Christmas",
  },
};

export const todayLocal = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().split("T")[0];
};

export const formatDisplayDate = (dateStr) =>
  new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const formatDisplayTime = (timeStr) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
};

export const closedReason = (dateStr) => restaurant.closedDates[dateStr] || null;

export const openingLabel = (dateStr) => {
  const day = new Date(`${dateStr}T12:00:00`).getDay();
  if (day === 0) return "10:00 AM – 10:00 PM";
  if (day === 6) return "10:00 AM – 11:00 PM";
  return "11:00 AM – 11:00 PM";
};

export const isOpenAt = (dateStr, timeStr) => {
  if (closedReason(dateStr)) return false;
  const [hours, minutes] = timeStr.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return false;
  const day = new Date(`${dateStr}T12:00:00`).getDay();
  const stamp = hours * 60 + minutes;
  const opens = day === 0 || day === 6 ? 10 * 60 : 11 * 60;
  const closes = day === 0 ? 22 * 60 : 23 * 60;
  return stamp >= opens && stamp < closes;
};

export const getKitchenStatus = () => {
  const now = new Date();
  const dateStr = todayLocal();
  const holiday = closedReason(dateStr);
  if (holiday) {
    return { open: false, label: `Closed for ${holiday}`, detail: "We reopen the next working day." };
  }
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const open = isOpenAt(dateStr, `${hh}:${mm}`);
  const day = now.getDay();
  const lastOrder = day === 0 ? "9:30 PM" : "10:30 PM";
  if (open) {
    return {
      open: true,
      label: "Kitchen is open",
      detail: `Last order ${lastOrder}. Walk-ins if we have a table.`,
    };
  }
  return {
    open: false,
    label: "Kitchen is closed",
    detail: `We open at ${day === 0 || day === 6 ? "10:00 AM" : "11:00 AM"} · ${openingLabel(dateStr)}`,
  };
};

export const mapsEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
  restaurant.mapsQuery
)}&z=16&output=embed`;

export const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
  restaurant.mapsQuery
)}`;

export const whatsappUrl = (text) =>
  `https://wa.me/${restaurant.whatsapp}?text=${encodeURIComponent(text)}`;

const dailySpecials = [
  {
    day: 0,
    title: "Sunday brunch table",
    plate: "Harvest grain bowl + filter coffee",
    price: "₹599 for two",
    pitch: "Walk in from 10am, or hold a table before noon.",
  },
  {
    day: 1,
    title: "Monday office lunch",
    plate: "Spaghetti or burger + a soft drink",
    price: "₹449 a head",
    pitch: "In and out in 45 minutes. Tell us the headcount on WhatsApp.",
  },
  {
    day: 2,
    title: "Tuesday biryani night",
    plate: "Dum biryani for two",
    price: "₹1,099",
    pitch: "We cook a limited pot. Message before 6pm.",
  },
  {
    day: 3,
    title: "Wednesday pasta + wine",
    plate: "Italian spaghetti and a house pour",
    price: "₹899",
    pitch: "Quiet midweek table. Good for two.",
  },
  {
    day: 4,
    title: "Thursday after-work",
    plate: "Burger meal and a mocktail",
    price: "₹749",
    pitch: "From 6pm. We keep a few high tables free.",
  },
  {
    day: 5,
    title: "Friday catch",
    plate: "Grilled fish, market vegetables",
    price: "₹1,299",
    pitch: "Weekend starts here. Book 7–9pm.",
  },
  {
    day: 6,
    title: "Saturday chef’s table",
    plate: "Four courses, chef’s pick",
    price: "₹2,499 a head",
    pitch: "Eight seats. Confirm by Friday noon.",
  },
];

export const getTodayOffer = () => dailySpecials[new Date().getDay()];

export const orderDishMessage = (dish) =>
  [
    `Takeaway / parcel — ${restaurant.name}`,
    `Dish: ${dish.title}`,
    `Price: ₹${dish.price}`,
    "Name:",
    "Pickup time:",
    "Notes:",
  ].join("\n");

export const offerMessage = (offer) =>
  `Hi ${restaurant.name}, I want today's offer: ${offer.title} (${offer.price}). Name and time:`;

export const lunchSetMessage =
  `Hi ${restaurant.name}, office lunch set for __ people on __ (Mon–Fri, 11am–4pm). GST extra.`;

export const privateDiningMessage =
  `Hi ${restaurant.name}, private dining enquiry.\nDate:\nGuests (8+):\nOccasion:\nBudget per head:`;

export const giftMessage =
  `Hi ${restaurant.name}, I want to gift a meal / table credit.\nRecipient name:\nAmount:\nOccasion:`;


export const buildReservationMessage = (booking) =>
  [
    `Table request — ${restaurant.name}`,
    `Name: ${booking.firstName} ${booking.lastName}`,
    `Guests: ${booking.partySize}`,
    `When: ${formatDisplayDate(booking.date)} at ${formatDisplayTime(booking.time)}`,
    `Seating: ${booking.seating}`,
    `Phone: ${booking.phone}`,
    `Email: ${booking.email}`,
    booking.notes ? `Notes: ${booking.notes}` : "Notes: none",
  ].join("\n");

export const persistReservation = (payload) => {
  try {
    const existing = JSON.parse(localStorage.getItem("ayushReservations") || "[]");
    existing.push({ ...payload, savedAt: new Date().toISOString() });
    localStorage.setItem("ayushReservations", JSON.stringify(existing));
  } catch {
    // Ignore storage failures.
  }
};
