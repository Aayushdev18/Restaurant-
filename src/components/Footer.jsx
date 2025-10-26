import React from "react";
import { FaFacebookF, FaInstagram, FaTwitter, FaYoutube } from "react-icons/fa";

const Footer = () => {
  return (
    <footer>
      <div className="container">
        <div className="footer_section">
          <div className="footer_col">
            <h3>AYUSH RESTAURANT</h3>
            <p>The only thing we're serious about is food.</p>
            <div className="social_icons">
              <a href="#" aria-label="Facebook"><FaFacebookF /></a>
              <a href="#" aria-label="Instagram"><FaInstagram /></a>
              <a href="#" aria-label="Twitter"><FaTwitter /></a>
              <a href="#" aria-label="Youtube"><FaYoutube /></a>
            </div>
          </div>
          
          <div className="footer_col">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#heroSection">Home</a></li>
              <li><a href="#about">About Us</a></li>
              <li><a href="#qualities">Services</a></li>
              <li><a href="#team">Team</a></li>
            </ul>
          </div>
          
          <div className="footer_col">
            <h4>Contact Info</h4>
            <ul>
              <li>📍 B-Block, Rajiv Chowk (CP), Delhi</li>
              <li>📞 +91 123-456-7890</li>
              <li>✉️ info@ayushrestaurant.com</li>
              <li>🕐 Open: 11:00 AM - 11:00 PM</li>
            </ul>
          </div>
          
          <div className="footer_col">
            <h4>Opening Hours</h4>
            <ul>
              <li>Monday - Friday: 11:00 AM - 11:00 PM</li>
              <li>Saturday: 10:00 AM - 11:00 PM</li>
              <li>Sunday: 10:00 AM - 10:00 PM</li>
            </ul>
          </div>
        </div>
        
        <div className="footer_bottom">
          <p>&copy; 2024 AYUSH RESTAURANT. All rights reserved. Developed By AYUSH.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;