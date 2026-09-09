import { useEffect } from "react";
import { setupExperience } from "./experience";
import {
  Hero,
  Creative,
  SelectedWork,
  About,
  Team,
  Services,
  Screening,
  Contact,
  Navigation,
  FilmPlayer,
} from "./components/Sections";
export default function App() {
  useEffect(() => setupExperience(), []);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navigation />
      <main id="main">
        <Hero />
        <Creative />
        <SelectedWork />
        <About />
        <Team />
        <Services />
        <Screening />
        <Contact />
      </main>
      <FilmPlayer />
    </>
  );
}
