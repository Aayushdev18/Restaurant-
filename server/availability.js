const SEATS = 40;
const TURN_MINUTES = 90;

const closedDates = {
  "2026-01-26": "Republic Day",
  "2026-03-14": "Holi",
  "2026-08-15": "Independence Day",
  "2026-11-08": "Diwali",
  "2026-12-25": "Christmas",
};

export const toMinutes = (timeStr) => {
  const [hours, minutes] = String(timeStr || "").split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

export const fromMinutes = (stamp) => {
  const hours = Math.floor(stamp / 60);
  const minutes = stamp % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

export const isOpenAt = (dateStr, timeStr) => {
  if (closedDates[dateStr]) return false;
  const stamp = toMinutes(timeStr);
  if (stamp == null) return false;
  const day = new Date(`${dateStr}T12:00:00`).getDay();
  const opens = day === 0 || day === 6 ? 10 * 60 : 11 * 60;
  const closes = day === 0 ? 22 * 60 : 23 * 60;
  return stamp >= opens && stamp < closes;
};

const activeOnDate = (rows, dateStr) =>
  (rows || []).filter(
    (row) => row.date === dateStr && row.status !== "cancelled" && row.status !== "seated"
  );

const seatsAt = (rows, dateStr, stamp) =>
  activeOnDate(rows, dateStr).reduce((sum, row) => {
    const other = toMinutes(row.time);
    if (other == null) return sum;
    if (Math.abs(other - stamp) < TURN_MINUTES) return sum + Number(row.partySize || 0);
    return sum;
  }, 0);

export const computeAvailability = (rows, dateStr, timeStr, partySize) => {
  const guests = Math.max(1, Number(partySize) || 2);
  const requested = toMinutes(timeStr);
  if (!dateStr || requested == null) {
    return { ok: false, message: "Need a date and time to check the book." };
  }
  if (closedDates[dateStr]) {
    return { ok: false, closed: closedDates[dateStr], options: [] };
  }

  const neighborOffsets = [-15, 15, -30, 30];
  const options = [];
  for (const offset of neighborOffsets) {
    const stamp = requested + offset;
    const time = fromMinutes(stamp);
    if (!isOpenAt(dateStr, time)) continue;
    const used = seatsAt(rows, dateStr, stamp);
    if (used + guests <= SEATS) {
      options.push({ time, remaining: SEATS - used });
    }
    if (options.length >= 2) break;
  }

  const exactUsed = seatsAt(rows, dateStr, requested);
  const exact =
    isOpenAt(dateStr, timeStr) && exactUsed + guests <= SEATS
      ? { time: timeStr, remaining: SEATS - exactUsed }
      : null;

  return {
    ok: options.length > 0 || Boolean(exact),
    exact,
    options,
    guests,
    date: dateStr,
  };
};
