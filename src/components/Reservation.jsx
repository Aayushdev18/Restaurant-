import React, { useMemo, useState } from "react";
import { FaWhatsapp, FaPhoneAlt } from "react-icons/fa";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import {
  buildReservationMessage,
  closedReason,
  isOpenAt,
  openingLabel,
  persistReservation,
  restaurant,
  todayLocal,
  whatsappUrl,
} from "../restaurant";

const Reservation = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [seating, setSeating] = useState("Indoor");
  const [notes, setNotes] = useState("");
  const [alsoWhatsapp, setAlsoWhatsapp] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const today = todayLocal();
  const holiday = date ? closedReason(date) : null;
  const hoursHint = useMemo(() => (date && !holiday ? openingLabel(date) : null), [date, holiday]);

  const handleReservation = async (e) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !date || !time || !phone.trim()) {
      toast.error("Please fill in name, date, time, and mobile number.");
      return;
    }

    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      toast.error("First and last name should be at least 2 characters.");
      return;
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error("Please enter a valid email address, or leave it blank.");
      return;
    }

    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) {
      toast.error("Please enter a 10-digit Indian mobile number.");
      return;
    }

    if (date < today) {
      toast.error("Please choose today or a later date.");
      return;
    }

    if (holiday) {
      toast.error(`We are closed on ${holiday}. Please pick another evening.`);
      return;
    }

    if (!isOpenAt(date, time)) {
      toast.error(`That time is outside our hours (${openingLabel(date)}).`);
      return;
    }

    const booking = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: trimmedEmail || `guest.${digits}@ayushrestaurant.com`,
      phone: digits,
      date,
      time,
      partySize,
      seating,
      notes: notes.trim(),
    };

    persistReservation(booking);
    if (alsoWhatsapp) {
      window.open(whatsappUrl(buildReservationMessage(booking)), "_blank", "noopener,noreferrer");
    }

    try {
      setSubmitting(true);
      const { data } = await api.post("/reservations", booking);
      toast.success(data.message || "Table request saved.");
      navigate("/success", { state: { booking, saved: true } });
    } catch {
      toast.success("Request sent on WhatsApp. The kitchen will confirm there.");
      navigate("/success", { state: { booking, saved: false } });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="reservation" id="reservation">
      <div className="container">
        <div className="banner">
          <img src="/reservation.png" alt="A plated dish at Ayush Restaurant" />
        </div>
        <div className="banner">
          <div className="reservation_form_box">
            <h1>MAKE A RESERVATION</h1>
            <p>
              Saved to the kitchen first. Call{" "}
              <a href={`tel:${restaurant.phoneTel}`}>{restaurant.phoneDisplay}</a> for same-day.
            </p>
            <form onSubmit={handleReservation} noValidate>
              <div>
                <input
                  type="text"
                  name="firstName"
                  placeholder="First Name"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <input
                  type="text"
                  name="lastName"
                  placeholder="Last Name"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <div>
                <input
                  type="date"
                  name="date"
                  min={today}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  aria-label="Reservation date"
                />
                <input
                  type="time"
                  name="time"
                  min="10:00"
                  max="23:00"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  aria-label="Reservation time"
                />
              </div>
              {holiday && (
                <p className="reservation_hint closed">Closed for {holiday}. Choose another date.</p>
              )}
              {hoursHint && <p className="reservation_hint">Open {hoursHint} on this date.</p>}
              <div>
                <select
                  aria-label="Party size"
                  value={partySize}
                  onChange={(e) => setPartySize(e.target.value)}
                >
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((size) => (
                    <option key={size} value={size}>
                      {size} {size === 1 ? "guest" : "guests"}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Seating"
                  value={seating}
                  onChange={(e) => setSeating(e.target.value)}
                >
                  <option>Indoor</option>
                  <option>Outdoor</option>
                  <option>Bar counter</option>
                </select>
              </div>
              <div>
                <input
                  type="email"
                  name="email"
                  placeholder="Email (optional)"
                  className="email_tag"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone"
                  autoComplete="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <textarea
                placeholder="Occasion, allergies, high chair, or anything we should know"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                aria-label="Special requests"
              />
              <label className="whatsapp_check">
                <input
                  type="checkbox"
                  checked={alsoWhatsapp}
                  onChange={(e) => setAlsoWhatsapp(e.target.checked)}
                />
                Also ping WhatsApp
              </label>
              <button type="submit" disabled={Boolean(holiday) || submitting}>
                {submitting ? "SAVING..." : "CONFIRM TABLE"}
                <span>
                  <FaWhatsapp />
                </span>
              </button>
            </form>
            <div className="reservation_alt">
              <a href={`tel:${restaurant.phoneTel}`}>
                <FaPhoneAlt /> Call
              </a>
              <a href={`mailto:${restaurant.email}?subject=Table%20request`}>Email</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Reservation;
