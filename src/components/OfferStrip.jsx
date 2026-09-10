import React from "react";
import { FaWhatsapp } from "react-icons/fa";
import { getKitchenStatus, getTodayOffer, offerMessage, whatsappUrl } from "../restaurant";

const OfferStrip = () => {
  const offer = getTodayOffer();
  const kitchen = getKitchenStatus();

  return (
    <aside className="offerStrip" aria-label="Today's offer">
      <p>
        <span className={`offerStrip_label ${kitchen.open ? "open" : "shut"}`}>
          {kitchen.open ? "Open" : "Closed"}
        </span>
        {offer.title} — {offer.plate} · {offer.price}
        <span className="offerStrip_status"> {kitchen.detail}</span>
      </p>
      <a href={whatsappUrl(offerMessage(offer))} target="_blank" rel="noreferrer">
        <FaWhatsapp /> Book this
      </a>
    </aside>
  );
};

export default OfferStrip;
