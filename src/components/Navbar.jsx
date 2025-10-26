import React, { useState } from "react";
import { data } from "../restApi.json";
import { Link } from "react-scroll";
import { GiHamburgerMenu } from "react-icons/gi";
import { HiOutlineArrowLeft } from "react-icons/hi";
import { useNavigate, useLocation } from "react-router-dom";

const Navbar = () => {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleMenuClick = () => {
    navigate("/menu");
  };

  const handleBackClick = () => {
    navigate("/");
  };

  return (
    <>
      <nav>
        <div className="logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>AYUSH</div>
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

          {location.pathname === "/menu" ? (
            <button
              className="menuBtn backBtn"
              onClick={handleBackClick}
            >
              <HiOutlineArrowLeft /> BACK
            </button>
          ) : (
            <button
              className="menuBtn"
              onClick={handleMenuClick}
            >
              OUR MENU
            </button>
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
