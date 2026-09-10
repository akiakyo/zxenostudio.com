import { useEffect, useState } from "react";
import { HeroShowcase } from "./HeroShowcase";
import { Project, projects, services, team } from "../content";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowUpRight,
  Mail,
  MapPin,
  X,
  Maximize,
  Plus,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sun,
  Moon,
} from "lucide-react";

/* The ZXENO mark, inline so it takes the colour of whatever tone it sits on. */
function Mark({ size = 29, height = 30 }: { size?: number; height?: number }) {
  return (
    <svg
      className="brand-mark"
      viewBox="0 0 1560 1600"
      width={size}
      height={height}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M0 0H456V456L908 980V984H456L444 975 0 462ZM0 1460L456 980V1600H0ZM1104 0H1560V621H1104ZM648 615H1104L1560 1140V1600H1104V1144Z"
      />
    </svg>
  );
}
export function Hero() {
  return (
    <section className="hero" id="top" data-tone="paper">
      <div className="hero-kicker eyebrow">
        <Plus className="hero-registration" aria-hidden="true" />
        <span>Independent creative studio</span>
        <span>Philippines / Working everywhere</span>
      </div>
      <div className="hero-layout">
        <div className="hero-copy">
          <h1>
            We build brands that move
            <br />
            <span className="hero-second">
              and products people trust<span className="period">.</span>
            </span>
          </h1>
          <div className="hero-bottom">
            <p>Design. Motion. Code.</p>

            <div className="hero-actions">
              <a className="booking-button" href="/book">
                Book a call <ArrowUpRight aria-hidden="true" />
              </a>
              <span className="hero-actions-divider" aria-hidden="true">
                |
              </span>
              <a className="text-link" href="/work">
                See our work <ArrowUpRight aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
        <HeroShowcase />
      </div>
    </section>
  );
}

export function SelectedWork() {
  return (
    <section id="work" className="work" data-tone="dark">
      <div className="section-top eyebrow">
        <span>Selected work</span>
      </div>
      <div className="work-title">
        <h2>
          BUILT TO
          <br />
          BE FELT.
          <ArrowUpRight className="work-direction" aria-hidden="true" />
        </h2>
        <span className="eyebrow">
          Selected projects
          <br />
          Film / Motion
        </span>
      </div>
      <div id="project-list">
        {projects.map((project, index) => (
          <Project key={project.slug} project={project} index={index} />
        ))}
      </div>
    </section>
  );
}

export function About() {
  return (
    <section id="about" className="about" data-tone="paper">
      <div className="section-top eyebrow">
        <span>About the studio</span>
        <span>Independent by design</span>
      </div>
      <h2>
        SMALL STUDIO.
        <br />
        WIDE OPEN
        <br />
        <span className="accent">POSSIBILITIES</span>
        <span>.</span>
      </h2>
      <div className="about-copy">
        <Mark size={130} height={134} />
        <div>
          <p>
            We're ZXENO. An independent studio for design, film, motion, 3D and
            development.
          </p>
          <span className="eyebrow">
            Based in Cavite. Built for everywhere.
          </span>
        </div>
      </div>
    </section>
  );
}

export function Team() {
  return (
    <section id="team" className="team" data-tone="paper">
      <div className="section-top eyebrow">
        <span>The people behind ZXENO</span>
      </div>
      <div className="team-heading">
        <h2>
          THE MINDS.
          <br />
          THE MAKERS.
        </h2>
        <p>
          Directors, designers and developers.
          <br />
          One studio, creating together.
        </p>
      </div>
      <div className="team-list">
        {team.map((member) => (
          <article className="team-member" key={member.name}>
            <span className="member-monogram" aria-hidden="true">
              {member.name
                .split(" ")
                .map((part) => part[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div className="member-identity">
              <h3>{member.name}</h3>
              <p>{member.role}</p>
              <ul className="member-tags">
                {member.techStack.map((tool) => (
                  <li key={tool}>{tool}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function Services() {
  return (
    <section id="services" className="services" data-tone="dark">
      <div className="section-top eyebrow">
        <span>Our disciplines</span>
        <span>The expertise behind the work</span>
      </div>
      <div id="service-list">
        {services.map(([name, copy]) => (
          <article className="service" key={name}>
            <h3>{name}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function Screening() {
  return (
    <section className="reel-transition" data-tone="green">
      <div className="reel-sticky">
        <svg className="reel-mask-defs" width="0" height="0" aria-hidden="true">
          <defs>
            <clipPath id="reel-portal" clipPathUnits="objectBoundingBox">
              <path
                id="reel-portal-shape"
                transform="translate(.5 .5) scale(0) translate(-.5 -.5)"
                d="M .12 .46 C -.02 .19,.24 -.06,.46 .15 C .61 .31,.72 -.02,.9 .18 C 1.08 .38,.79 .43,.89 .65 C 1.05 .99,.62 1.07,.48 .84 C .32 .65,.22 1.03,.07 .8 C -.06 .61,.22 .65,.12 .46 Z"
              />
            </clipPath>
          </defs>
        </svg>
        <div className="reel-frame" aria-hidden="true">
          <span>
            <Plus />
          </span>
          <span>
            <Plus />
          </span>
          <span>
            <Plus />
          </span>
          <span>
            <Plus />
          </span>
        </div>
        <div className="reel-heading">
          <span className="eyebrow">The moving image / A ZXENO experiment</span>
          <h2>
            <span>LESS TALK.</span>
            <em>MORE PLAY.</em>
          </h2>
          <div className="reel-editorial eyebrow">
            <span>Shape. Texture. Rhythm.</span>
            <span>
              Scroll to play <ArrowDownRight aria-hidden="true" />
            </span>
          </div>
        </div>
        <div className="reel-grain" aria-hidden="true" />
        <div className="reel-window" data-tone="dark">
          <video
            muted
            playsInline
            loop
            preload="none"
            poster="/media/redline.webp"
            data-src="/media/redline-preview.mp4"
          ></video>
          <div className="reel-dust" aria-hidden="true" />
          <div className="reel-label">
            <span className="eyebrow">ZXENO / Project screening</span>
            <button className="play-reel" data-film="1">
              PLAY
              <br />
              RED LINE <ArrowUpRight aria-hidden="true" />
            </button>
            <a
              className="eyebrow"
              href="https://mega.nz/file/20R31aCb#gy7-MGGH12vLROmwnsIZ_AGaJBOD8NyTYUTcc0szOo0"
              target="_blank"
              rel="noopener noreferrer"
            >
              Explore the full studio reel <ArrowUpRight aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Contact() {
  return (
    <section id="contact" className="contact" data-tone="paper">
      <div className="section-top eyebrow">
        <span>Your next project</span>
      </div>
      <a className="contact-title" href="mailto:zxenostudio@gmail.com">
        Let's make
        <br />
        it <em>matter.</em>
        <span>
          <ArrowUpRight aria-hidden="true" />
        </span>
      </a>
      <div className="contact-bottom">
        <a className="text-link" href="mailto:zxenostudio@gmail.com">
          <Mail aria-hidden="true" /> zxenostudio@gmail.com
        </a>
        <address className="studio-address">
          <MapPin aria-hidden="true" />
          <span>
            Bacoor City, Cavite
            <br />
            Philippines · GMT+8
          </span>
        </address>
      </div>
    </section>
  );
}

export function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  // Mobile-only drawer: closes on Escape, and locks background scroll while
  // open so the page underneath the full-screen panel can't scroll away.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);
  return (
    <header className="navigation">
      <a className="brand" href="/" aria-label="ZXENO Studio home">
        <Mark />
        <span>
          ZXENO
          <br />
          STUDIO<sup>®</sup>
        </span>
      </a>
      <nav
        id="primary-nav"
        aria-label="Main navigation"
        data-open={menuOpen || undefined}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setMenuOpen(false);
        }}
      >
        <a href="/work">Work</a>
        <a href="/about">About</a>
        <a href="/pricing">Pricing</a>
        <a href="/services">Services</a>
        <a href="/book">
          Book a call <ArrowUpRight aria-hidden="true" />
        </a>
      </nav>
      <div className="nav-controls">
        <button
          id="theme-toggle"
          type="button"
          className="theme-toggle"
          aria-pressed="false"
          aria-label="Switch to dark mode"
        >
          <Sun className="icon-light" aria-hidden="true" />
          <Moon className="icon-dark" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="primary-nav"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="menu-toggle-bar" aria-hidden="true" />
          <span className="menu-toggle-bar" aria-hidden="true" />
          <span className="menu-toggle-bar" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

export function FilmPlayer() {
  return (
    <dialog id="film-dialog" aria-labelledby="film-title">
      <div className="player-top">
        <h2 id="film-title">Project film</h2>
        <button id="close-film" aria-label="Close film">
          Close <X aria-hidden="true" />
        </button>
      </div>
      <video id="film-player" playsInline preload="none"></video>
      <div className="player-bottom">
        <button id="toggle-film" data-state="playing">
          <Play className="icon-play" aria-hidden="true" />
          <Pause className="icon-pause" aria-hidden="true" />
          <span>Pause</span>
        </button>
        <label>
          Seek{" "}
          <input
            id="film-seek"
            type="range"
            min="0"
            max="100"
            defaultValue="0"
            step="0.1"
            aria-label="Film position"
          />
        </label>
        <button id="mute-film" data-state="audible">
          <Volume2 className="icon-volume" aria-hidden="true" />
          <VolumeX className="icon-muted" aria-hidden="true" />
          <span>Mute</span>
        </button>
        <button id="fullscreen-film">
          Fullscreen <Maximize aria-hidden="true" />
        </button>
      </div>
    </dialog>
  );
}
