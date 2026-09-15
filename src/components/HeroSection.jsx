import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Link } from "react-scroll";
import Navbar from "./Navbar";

const HeroSection = () => {
  return (
    <section className="heroSection" id="heroSection">
      <Navbar />
      <div className="hero_inner">
        <div className="hero_copy">
          <p className="hero_eyebrow">Connaught Place · New Delhi</p>
          <h1>A proper table in CP.</h1>
          <p className="hero_lede">
            Dum biryani, catch of the day, and a room that does not rush you. Reserve online,
            on WhatsApp, or with the concierge.
          </p>
          <div className="hero_actions">
            <RouterLink className="hero_btn" to="/menu">
              See the menu
            </RouterLink>
            <Link className="hero_btn ghost" to="reservation" smooth duration={500}>
              Book a table
            </Link>
          </div>
        </div>
        <div className="hero_photos">
          <img src="/hero1.png" alt="Breakfast pancakes at Ayush Restaurant" />
          <img src="/hero2.png" alt="Crispy burger plated in the dining room" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
