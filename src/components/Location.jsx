import React from "react";
import { FaWhatsapp, FaPhoneAlt, FaLocationArrow } from "react-icons/fa";
import {
  directionsUrl,
  mapsEmbedUrl,
  restaurant,
  whatsappUrl,
} from "../restaurant";

const Location = () => {
  const walkInMessage = `Hi ${restaurant.name}, I'd like to ask about a table today.`;

  return (
    <section className="location" id="location">
      <div className="container">
        <div className="heading_section">
          <h1 className="heading">FIND US</h1>
          <p>B-Block, Rajiv Chowk — a short walk from the Metro. We do not have valet; parking is in the CP lots.</p>
        </div>
        <div className="location_grid">
          <div className="map_wrap">
            <iframe
              title="Map of Ayush Restaurant in Connaught Place"
              src={mapsEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
          <div className="location_card">
            <img src="/place/dining-room.jpg" alt="Dining room at Ayush Restaurant" />
            <address>
              {restaurant.addressLine}
              <br />
              {restaurant.city}
            </address>
            <div className="location_actions">
              <a href={`tel:${restaurant.phoneTel}`}>
                <FaPhoneAlt /> {restaurant.phoneDisplay}
              </a>
              <a
                href={whatsappUrl(walkInMessage)}
                target="_blank"
                rel="noreferrer"
              >
                <FaWhatsapp /> WhatsApp
              </a>
              <a href={directionsUrl} target="_blank" rel="noreferrer">
                <FaLocationArrow /> Get directions
              </a>
              <a href={`mailto:${restaurant.email}`}>{restaurant.email}</a>
            </div>
            <ul className="hours_list">
              <li>Monday – Friday: 11:00 AM – 11:00 PM</li>
              <li>Saturday: 10:00 AM – 11:00 PM</li>
              <li>Sunday: 10:00 AM – 10:00 PM</li>
              <li>Closed: Republic Day, Holi, Independence Day, Diwali, Christmas</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Location;
