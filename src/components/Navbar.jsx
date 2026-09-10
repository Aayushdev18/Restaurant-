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
  const isHome = location.pathname === "/";

  const closeMenu = () => setShow(false);

  const goToSection = (sectionId) => {
    closeMenu();
    if (isHome) {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }
    navigate("/", { state: { scrollTo: sectionId } });
  };

  return (
    <nav>
      <div
        className="logo"
        onClick={() => {
          closeMenu();
          navigate("/");
        }}
        style={{ cursor: "pointer" }}
      >
        AYUSH
      </div>
      <div className={show ? "navLinks showmenu" : "navLinks"}>
        <div className="links">
          {data[0].navbarLinks.map((element) =>
            isHome ? (
              <Link
                to={element.link}
                spy={true}
                smooth={true}
                duration={500}
                key={element.id}
                onClick={closeMenu}
              >
                {element.title}
              </Link>
            ) : (
              <a
                href={`/#${element.link}`}
                key={element.id}
                onClick={(e) => {
                  e.preventDefault();
                  goToSection(element.link);
                }}
              >
                {element.title}
              </a>
            )
          )}
        </div>

        {location.pathname === "/menu" ? (
          <button
            className="menuBtn backBtn"
            onClick={() => {
              closeMenu();
              navigate("/");
            }}
          >
            <HiOutlineArrowLeft /> BACK
          </button>
        ) : (
          <button
            className="menuBtn"
            onClick={() => {
              closeMenu();
              navigate("/menu");
            }}
          >
            OUR MENU
          </button>
        )}
      </div>
      <div
        className="hamburger"
        onClick={() => setShow((open) => !open)}
        aria-label="Toggle navigation"
        role="button"
      >
        <GiHamburgerMenu />
      </div>
    </nav>
  );
};

export default Navbar;
