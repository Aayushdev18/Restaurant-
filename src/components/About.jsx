import React from "react";
import { Link } from "react-router-dom";
import { HiOutlineArrowRight } from "react-icons/hi";

const About = () => {
  return (
    <section className="about" id="about">
      <div className="container">
        <div className="banner">
          <div className="top">
            <h1 className="heading">ABOUT US</h1>
            <p>The only thing we&apos;re serious about is food.</p>
          </div>
          <p className="mid">
            Ayush Restaurant is a neighbourhood table in the heart of Connaught Place.
            We cook with Delhi produce, a slow-fire kitchen, and the kind of hospitality
            that makes a weeknight dinner feel like an occasion. Every plate is finished
            to order — traditional technique, a little modern seasoning, and no shortcuts.
          </p>
          <Link to="/menu">
            Explore Menu{" "}
            <span>
              <HiOutlineArrowRight />
            </span>
          </Link>
        </div>
        <div className="banner">
          <img src="/about.png" alt="Inside Ayush Restaurant" />
        </div>
      </div>
    </section>
  );
};

export default About;
