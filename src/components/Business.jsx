import React from "react";
import { FaWhatsapp } from "react-icons/fa";
import toast from "react-hot-toast";
import {
  giftMessage,
  lunchSetMessage,
  privateDiningMessage,
  restaurant,
  whatsappUrl,
} from "../restaurant";
import { api } from "../api";

const products = [
  {
    type: "Office lunch set",
    eyebrow: "Weekdays 11am–4pm",
    title: "Office lunch set",
    copy: "Two courses, one drink, 45-minute turn. Built for CP meetings that still need to eat.",
    price: "From ₹449 a head",
    message: lunchSetMessage,
    cta: "Hold a lunch table",
  },
  {
    type: "Private dining",
    eyebrow: "8 guests and up",
    title: "Private dining",
    copy: "Birthdays, closes, and client dinners. A set menu, one bill, the room to yourselves after 8pm on request.",
    price: "From ₹1,899 a head",
    message: privateDiningMessage,
    cta: "Plan an event",
  },
  {
    type: "Gift a table",
    eyebrow: "No expiry in 6 months",
    title: "Gift a table",
    copy: "Send someone a meal credit. We WhatsApp them a code. Better than flowers if they actually like food.",
    price: "₹2,000 / ₹5,000",
    message: giftMessage,
    cta: "Buy a gift credit",
  },
];

const Business = () => {
  const sendInquiry = async (product) => {
    try {
      await api.post("/inquiries", {
        type: product.type,
        message: product.message,
      });
      toast.success("Logged in the kitchen. WhatsApp is opening to finish details.");
    } catch {
      toast.error("Kitchen API offline — WhatsApp still works.");
    }
    window.open(whatsappUrl(product.message), "_blank", "noopener,noreferrer");
  };

  return (
    <section className="business" id="groups">
      <div className="container">
        <div className="heading_section">
          <h1 className="heading">FOR THE BUSINESS OF EATING</h1>
          <p>
            Lunch covers the afternoon. Private dining covers the bill. A gift credit brings someone
            back. First booking: mention <strong>AYUSH-FIRST</strong> on WhatsApp for a complimentary dessert.
          </p>
        </div>
        <div className="business_grid">
          {products.map((product) => (
            <article className="business_card" key={product.title}>
              <p className="eyebrow">{product.eyebrow}</p>
              <h3>{product.title}</h3>
              <p>{product.copy}</p>
              <p className="business_price">{product.price}</p>
              <button type="button" className="business_cta" onClick={() => sendInquiry(product)}>
                <FaWhatsapp /> {product.cta}
              </button>
            </article>
          ))}
        </div>
        <p className="business_note">
          GST extra. Same-day lunch needs a message before 11am. Events: 48 hours’ notice. Call{" "}
          <a href={`tel:${restaurant.phoneTel}`}>{restaurant.phoneDisplay}</a> if WhatsApp is slow.
        </p>
      </div>
    </section>
  );
};

export default Business;
