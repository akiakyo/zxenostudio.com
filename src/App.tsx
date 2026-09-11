import { EmailModal } from "./components/EmailModal";
import { Footer } from "./components/Footer";
import { PortfolioGallery } from "./components/Portfolio";
import { useEffect } from "react";
import { setupExperience } from "./experience";
import {
  Hero,
  SelectedWork,
  About,
  Team,
  Screening,
  Contact,
  Navigation,
  FilmPlayer,
} from "./components/Sections";
import {
  PageHeading,
  ServiceDirectory,
  HomeOverview,
  Timeline,
  QuickLinks,
  ProjectApproach,
  Pricing,
  Booking,
} from "./components/Pages";
export default function App() {
  const path = location.pathname.replace(/\/+$/, "") || "/";
  const titles: Record<string, string> = {
    "/services": "Our services",
    "/work": "Our works",
    "/about": "About the studio",
    "/pricing": "Pricing",
    "/book": "Book a call",
  };
  useEffect(() => {
    document.title =
      path === "/"
        ? "ZXENO Studio"
        : `${titles[path] || "Page not found"} — ZXENO Studio`;
    document.querySelectorAll<HTMLAnchorElement>("nav a").forEach((a) => {
      if (a.pathname === path) a.setAttribute("aria-current", "page");
    });
    return setupExperience();
  }, []);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navigation />
      <main id="main">
        {path === "/" ? (
          <>
            <Hero />
            <HomeOverview />
            <Timeline />
            <ProjectApproach />
            <QuickLinks />
          </>
        ) : path === "/services" ? (
          <>
            <PageHeading
              label="Services"
              title={
                <>
                  <span className="accent-italic">Ideas,</span> in every
                  form.
                </>
              }
              copy="Eleven disciplines. One studio."
            />
            <ServiceDirectory />
          </>
        ) : path === "/work" ? (
          <>
            <PageHeading
              label="Our works"
              title="Made to move you."
              copy="3D, film and motion projects."
            />
            <PortfolioGallery />
            <SelectedWork />
            <Screening />
          </>
        ) : path === "/about" ? (
          <>
            <PageHeading
              label="About"
              title={
                <>
                  Meet <span className="accent-bold">ZXENO.</span>
                </>
              }
              copy="Bacoor, Philippines. Working everywhere."
            />
            <About />
            <Team />
          </>
        ) : path === "/pricing" ? (
          <>
            <PageHeading
              label="Pricing"
              title={
                <>
                  Let's talk <span className="accent-italic">scope.</span>
                </>
              }
              copy="Creative work built around your project. All pricing in PHP."
            />
            <Pricing />
            <ProjectApproach />
          </>
        ) : path === "/book" ? (
          <>
            <PageHeading
              label="Book a call"
              title={
                <span className="accent-bold">What's on your mind?</span>
              }
              copy="Tell us about your next project."
            />
            <Booking />
          </>
        ) : (
          <PageHeading
            label="404"
            title="A little off track."
            copy="This page doesn't exist. Use the navigation to find your way back."
          />
        )}
        <Contact />
      </main>
      <Footer />
      <FilmPlayer />
      <EmailModal />
    </>
  );
}
