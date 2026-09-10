import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import HeroSection from "../components/HeroSection";
import OfferStrip from "../components/OfferStrip";
import About from "../components/About";
import Qualities from "../components/Qualities";
import Menu from "../components/Menu";
import Business from "../components/Business";
import WhoAreWe from "../components/WhoAreWe";
import Team from "../components/Team";
import Testimonials from "../components/Testimonials";
import Faq from "../components/Faq";
import Location from "../components/Location";
import Reservation from "../components/Reservation";
import Footer from "../components/Footer";

const Home = () => {
  const location = useLocation();

  useEffect(() => {
    const sectionId = location.state?.scrollTo;
    if (!sectionId) return;

    const timer = window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [location.state]);

  return (
    <>
      <HeroSection />
      <OfferStrip />
      <About />
      <Qualities />
      <Menu />
      <Business />
      <WhoAreWe />
      <Team />
      <Testimonials />
      <Faq />
      <Location />
      <Reservation />
      <Footer />
    </>
  );
};

export default Home;
