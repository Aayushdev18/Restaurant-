import React, { useState } from "react";
import { data } from "../restApi.json";
import { Link } from "react-scroll";
import { GiHamburgerMenu } from "react-icons/gi";

const Navbar = () => {
  const [show, setShow] = useState(false);
  const [isComingSoonVisible, setComingSoonVisible] = useState(false);

  const handleMenuClick = () => {
    setComingSoonVisible(true); 
    setTimeout(() => {
      setComingSoonVisible(false); 
    }, 2000); 
  };

  return (
    <>
      <nav>
        <div className="logo">AYUSH</div>
        <div className={show ? "navLinks showmenu" : "navLinks"}>
          <div className="links">
            {data[0].navbarLinks.map((element) => (
              <Link
                to={element.link}
                spy={true}
                smooth={true}
                duration={500}
                key={element.id}
              >
                {element.title}
              </Link>
            ))}
          </div>

          {/* Button text changes to "COMING SOON" on click */}
          <button
            className="menuBtn"
            onClick={handleMenuClick}
          >
            {isComingSoonVisible ? "COMING SOON" : "OUR MENU"}
          </button>

          {/* Conditionally render the "COMING SOON" message */}
          {isComingSoonVisible && (
            <div className="coming-soon-message">
              <h2>COMING SOON</h2>
            </div>
          )}
        </div>
        <div className="hamburger" onClick={() => setShow(!show)}>
          <GiHamburgerMenu />
        </div>
      </nav>
    </>
  );
};

export default Navbar;
