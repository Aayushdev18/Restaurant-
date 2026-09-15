import React from "react";
import { FaFacebookF, FaInstagram, FaTwitter, FaYoutube, FaWhatsapp } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import { directionsUrl, restaurant, whatsappUrl } from "../restaurant";

const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const goToSection = (sectionId) => {
    if (location.pathname === "/") {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }
    navigate("/", { state: { scrollTo: sectionId } });
  };

  return (
    <footer>
      <div className="container">
        <div className="footer_section">
          <div className="footer_col">
            <h3>AYUSH RESTAURANT</h3>
            <p>The only thing we&apos;re serious about is food.</p>
            <div className="social_icons">
              <a href="https://www.instagram.com" aria-label="Instagram" target="_blank" rel="noreferrer">
                <FaInstagram />
              </a>
              <a href="https://www.facebook.com" aria-label="Facebook" target="_blank" rel="noreferrer">
                <FaFacebookF />
              </a>
              <a href="https://twitter.com" aria-label="Twitter" target="_blank" rel="noreferrer">
                <FaTwitter />
              </a>
              <a href="https://www.youtube.com" aria-label="Youtube" target="_blank" rel="noreferrer">
                <FaYoutube />
              </a>
            </div>
          </div>

          <div className="footer_col">
            <h4>Quick Links</h4>
            <ul>
              <li>
                <button type="button" onClick={() => goToSection("heroSection")}>
                  Home
                </button>
              </li>
              <li>
                <button type="button" onClick={() => goToSection("about")}>
                  About Us
                </button>
              </li>
              <li>
                <button type="button" onClick={() => goToSection("location")}>
                  Find Us
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate("/kitchen")}>
                  Staff board
                </button>
              </li>
            </ul>
          </div>

          <div className="footer_col">
            <h4>Contact Info</h4>
            <ul>
              <li>
                <a href={directionsUrl} target="_blank" rel="noreferrer">
                  📍 {restaurant.addressLine}, {restaurant.city}
                </a>
              </li>
              <li>
                <a href={`tel:${restaurant.phoneTel}`}>📞 {restaurant.phoneDisplay}</a>
              </li>
              <li>
                <a href={`mailto:${restaurant.email}`}>✉️ {restaurant.email}</a>
              </li>
              <li>
                <a href={whatsappUrl(`Hi ${restaurant.name}`)} target="_blank" rel="noreferrer">
                  <FaWhatsapp /> WhatsApp the restaurant
                </a>
              </li>
            </ul>
          </div>

          <div className="footer_col">
            <h4>Opening Hours</h4>
            <ul>
              <li>Monday – Friday: 11:00 AM – 11:00 PM</li>
              <li>Saturday: 10:00 AM – 11:00 PM</li>
              <li>Sunday: 10:00 AM – 10:00 PM</li>
            </ul>
          </div>
        </div>

        <div className="footer_bottom">
          <p>&copy; {new Date().getFullYear()} AYUSH RESTAURANT. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
