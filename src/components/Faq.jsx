import React from "react";

const faqs = [
  {
    q: "Do I need a reservation?",
    a: "Walk-ins are welcome if we have a table. Friday–Sunday evenings and groups of 5+ should WhatsApp us first. We hold a booked table for 15 minutes.",
  },
  {
    q: "Where do I park?",
    a: "No valet. Use the Connaught Place paid lots or Rajiv Chowk Metro (Gate 4 is the shortest walk). We will not move your car.",
  },
  {
    q: "Are children allowed?",
    a: "Yes. We have two high chairs. After 8:30pm the room is quieter and more adult. No separate kids’ menu — half portions of pasta or biryani on request.",
  },
  {
    q: "I eat vegetarian / I have allergies.",
    a: "Veg dishes are marked on the menu. Tell us allergies on WhatsApp when you book. The kitchen is small; we cannot promise a zero-allergen line.",
  },
  {
    q: "Can I bring a cake or wine?",
    a: "Cake: yes, with notice. Corkage is ₹800 a bottle, two bottles max. No outside food besides a celebration cake.",
  },
  {
    q: "How do bills and GST work?",
    a: "Prices on the site are before GST. One bill for the table. We take UPI, cards, and cash. Service charge 5% for tables of 6+.",
  },
  {
    q: "How do I cancel or move a table?",
    a: "WhatsApp the same thread. Before 3pm on the day there is no fuss. After that we may not be able to fill the slot — please still message us.",
  },
  {
    q: "Can I talk to the restaurant from the site?",
    a: "Yes. Open the concierge (microphone, bottom right). It can answer hours and the menu, and it writes table requests and takeaway to the kitchen board. Chrome or Edge is best for voice; typing always works.",
  },
];

const Faq = () => {
  return (
    <section className="faq" id="faq">
      <div className="container">
        <div className="heading_section">
          <h1 className="heading">BEFORE YOU COME</h1>
          <p>The questions people actually send us on WhatsApp. Straight answers save both of us a call.</p>
        </div>
        <div className="faq_list">
          {faqs.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Faq;
