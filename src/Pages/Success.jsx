import React, { useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import { HiOutlineArrowNarrowRight } from "react-icons/hi";
import { FaWhatsapp } from "react-icons/fa";
import {
  buildReservationMessage,
  formatDisplayDate,
  formatDisplayTime,
  whatsappUrl,
} from "../restaurant";

const Success = () => {
  const { state } = useLocation();
  const booking = state?.booking;
  const whatsapp = useMemo(
    () => (booking ? whatsappUrl(buildReservationMessage(booking)) : null),
    [booking]
  );

  return (
    <section className="notFound successPage">
      <div className="container">
        <img src="/sandwich.png" alt="Reservation confirmed" />
        <h1>
          {state?.saved === false
            ? "Your table request is on WhatsApp."
            : "Your table request is in the kitchen."}
        </h1>
        {booking ? (
          <div className="booking_summary">
            <p>
              {booking.firstName} {booking.lastName} · {booking.partySize} guests · {booking.seating}
            </p>
            <p>
              {formatDisplayDate(booking.date)} at {formatDisplayTime(booking.time)}
            </p>
            {booking.notes ? <p>{booking.notes}</p> : null}
          </div>
        ) : (
          <p>The kitchen has the booking. WhatsApp is optional if you want a human ping.</p>
        )}
        {whatsapp && (
          <a className="whatsapp_cta" href={whatsapp} target="_blank" rel="noreferrer">
            <FaWhatsapp /> Open WhatsApp again
          </a>
        )}
        <Link to="/">
          Back to Home <HiOutlineArrowNarrowRight />
        </Link>
      </div>
    </section>
  );
};

export default Success;
