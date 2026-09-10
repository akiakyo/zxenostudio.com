import { ArrowUpRight } from "lucide-react";
import { disciplines } from "./Pages";
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-columns">
        <div className="footer-studio">
          <a href="/" className="footer-brand" aria-label="ZXENO Studio home">
            <img src="/assets/mark.svg" width="48" height="50" alt="" />
            ZXENO
            <br />
            STUDIO
          </a>
          <address>
            Bacoor City, Cavite 4102
            <br />
            Philippines
          </address>
          <p>Design. Motion. Code.</p>
        </div>
        <div className="footer-pages">
          <h2>Studio</h2>
          <a href="/about">About us</a>
          <a href="/work">Portfolio</a>
          <a href="/services">Our services</a>
          <a href="/pricing">Pricing</a>
        </div>
        <div className="footer-capabilities">
          <h2>Capabilities</h2>
          <div>
            {disciplines.map(({ name }, i) => (
              <a href={`/services#service-${i + 1}`} key={name}>
                {name}
              </a>
            ))}
          </div>
        </div>
        <div className="footer-contact">
          <h2>Let's talk</h2>
          <a href="mailto:zxenostudio@gmail.com">zxenostudio@gmail.com</a>
          <p>Philippines · GMT+8</p>
          <a className="booking-button" href="/book">
            Book a call <ArrowUpRight aria-hidden="true" />
          </a>
        </div>
      </div>
      <div className="footer-base">
        <span>
          © ZXENO Studio <span id="year">{new Date().getFullYear()}</span>
        </span>
        <span>Independent studio. Working everywhere.</span>
      </div>
    </footer>
  );
}
