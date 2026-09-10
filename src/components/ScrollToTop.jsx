import React, { useState, useEffect } from "react";
import { AiFillCaretUp } from "react-icons/ai";
import { FaWhatsapp } from "react-icons/fa";
import { restaurant, whatsappUrl } from "../restaurant";

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.pageYOffset > 300);
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  return (
    <div className="float_actions">
      <a
        className="whatsapp_float"
        href={whatsappUrl(`Hi ${restaurant.name}, I have a question.`)}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp"
      >
        <FaWhatsapp />
      </a>
      {isVisible && (
        <button
          className="scroll-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Scroll to top"
        >
          <AiFillCaretUp />
        </button>
      )}
    </div>
  );
};

export default ScrollToTop;
