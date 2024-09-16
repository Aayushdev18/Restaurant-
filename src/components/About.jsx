import React from "react";
import { Link } from "react-router-dom";
import { HiOutlineArrowRight } from "react-icons/hi";

const About = () => {
  return (
    <>
      <section className="about" id="about">
        <div className="container">
          <div className="banner">
            <div className="top">
              <h1 className="heading">ABOUT US</h1>
              <p>The only thing we're serious about is food.</p>
            </div>
            <p className="mid">
            Welcome to AYUSH RESTAURANT, where passion for food meets a love for community! Nestled in the 
            heart of DELHI, our restaurant is a celebration of culinary creativity, fresh ingredients, a
            nd exceptional service. We believe in more than just serving meals—we create experiences.
            At AYUSH RESTAURANT, every dish is thoughtfully prepared by our talented chefs, who blend 
            traditional techniques with modern flavors. We source the finest ingredients locally, ensuring 
            each bite is bursting with freshness and authenticity. Our warm and inviting atmosphere makes 
            every moment memorable.
            </p>
            <Link to={"/"}>
              Explore Menu{" "}
              <span>
                <HiOutlineArrowRight />
              </span>
            </Link>
          </div>
          <div className="banner">
            <img src="about.png" alt="about" />
          </div>
        </div>
      </section>
    </>
  );
};

export default About;