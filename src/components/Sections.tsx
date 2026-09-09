import { Project, projects, services, team } from "../content";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowUpRight,
  Mail,
  MapPin,
  RotateCcw,
  X,
  Maximize,
  Plus,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from "lucide-react";
export function Hero() {
  return (
    <section className="hero" id="top" data-tone="green">
      <div className="hero-kicker eyebrow">
        <Plus className="hero-registration" aria-hidden="true" />
        <span>Independent creative studio</span>
        <span>Philippines / Working everywhere</span>
      </div>
      <h1>
        MOTION WITH
        <br />
        <span className="hero-second">
          INTENTION<span className="period">.</span>
        </span>
      </h1>
      <div className="hero-bottom">
        <p>
          Ideas made tangible.
          <br />
          Stories made unforgettable.
        </p>
        <a
          className="scroll-link"
          href="#work"
          aria-label="Explore selected work"
        >
          <span className="scroll-icon"><ArrowDown aria-hidden="true" /></span>
          <span>Explore work</span>
        </a>
        <span className="eyebrow">
          Film. Design. Code.
          <br />
          One creative perspective.
        </span>
      </div>
      <div className="hero-film">
        <video
          id="hero-video"
          muted
          playsInline
          loop
          preload="auto"
          poster="/media/redline.webp"
          data-src="/media/redline-preview.mp4"
        ></video>
        <div className="film-caption">
          <span>In focus / RED LINE</span>
          <button data-film="1">
            Watch film <ArrowUpRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

export function Creative() {
  return (
    <section className="creative" id="creative" data-tone="green">
      <div className="section-top eyebrow">
        <span>The creative engine</span>
        <span>From the first idea to the final frame</span>
      </div>
      <div className="creative-stage">
        <h2>
          IDEAS IN.
          <br />
          <span>MOTION</span>
          <br />
          OUT.
        </h2>
        <div
          id="tools-scene"
          role="group"
          tabIndex={0}
          aria-label="Interactive 3D creative tools. Drag sideways or use arrow keys to rotate. Press Home to reset."
        >
          <div className="scene-fallback">
            Ae / Pr / Code / Blender / Ps / Resolve / Ai
          </div>
        </div>
        <span className="creative-note eyebrow">
          Many disciplines.
          <br />
          One point of view.
        </span>
      </div>
      <div className="tool-controls" aria-label="Explore creative tools">
        <span className="eyebrow">Drag to explore / Tap a tool</span>
        <div>
          {[
            "After Effects",
            "Premiere Pro",
            "Visual Studio Code",
            "Blender",
            "Photoshop",
            "DaVinci Resolve",
            "Illustrator",
          ].map((name, index) => (
            <button key={name} data-tool={index} aria-pressed="false">
              {name}
            </button>
          ))}
          <button data-reset-tools>
            Reset <RotateCcw aria-hidden="true" />
          </button>
        </div>
        <span className="tool-status eyebrow" aria-live="polite">
          The creative toolkit
        </span>
      </div>
      <div className="creative-bottom">
        <p>
          We connect design, moving image and technology.
          <br />
          Whatever the medium, the intention stays clear.
        </p>
        <a className="text-link" href="#services">
          Explore our capabilities <ArrowUpRight aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

export function SelectedWork() {
  return (
    <section id="work" className="work" data-tone="dark">
      <div className="section-top eyebrow">
        <span>Selected work</span>
        <span>A few things we've put into the world</span>
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
        POSSIBILITIES<span>.</span>
      </h2>
      <div className="about-copy">
        <img src="/assets/mark.svg" alt="ZXENO mark" width="130" height="134" />
        <div>
          <p>Good work starts with a point of view.</p>
          <p>
            We're ZXENO. A creative studio in Bacoor, Philippines, bringing
            together creative direction, film, motion, 3D and development. We
            move between disciplines to give each idea the form it deserves.
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
        <span>Different strengths. Shared intention.</span>
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
            </div>
            {member.email && (
              <a
                href={`mailto:${member.email}`}
                aria-label={`Email ${member.name}`}
              >
                <Mail aria-hidden="true" />
                <span>{member.email}</span>
              </a>
            )}
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
    <section id="contact" className="contact" data-tone="green">
      <div className="section-top eyebrow">
        <span>Your next project</span>
        <span>Good things start with a conversation</span>
      </div>
      <a className="contact-title" href="mailto:zxenostudio@gmail.com">
        LET'S MAKE
        <br />
        IT <em>MATTER.</em>
        <span>
          <ArrowUpRight aria-hidden="true" />
        </span>
      </a>
      <div className="contact-bottom">
        <a className="text-link" href="mailto:zxenostudio@gmail.com">
          <Mail aria-hidden="true" /> zxenostudio@gmail.com
        </a>
        <address className="studio-address"><MapPin aria-hidden="true"/><span>Bacoor City, Cavite<br/>Philippines · GMT+8</span></address>
      </div>
      <footer>
        <span>
          © ZXENO Studio <span id="year">2026</span>
        </span>
        <span className="footer-note">Design. Film. Code.</span>
      </footer>
    </section>
  );
}

export function Navigation() {
  return (
    <header className="navigation">
      <a className="brand" href="#top" aria-label="ZXENO Studio home">
        <img src="/assets/mark.svg" alt="" width="30" height="32" />
        <span>
          ZXENO
          <br />
          STUDIO<sup>®</sup>
        </span>
      </a>
      <nav aria-label="Main navigation">
        <a href="#work">Work</a>
        <a href="#about">About</a>
        <a href="#team">Team</a>
        <a href="#services">Services</a>
        <a href="#contact">
          Contact <ArrowUpRight aria-hidden="true" />
        </a>
      </nav>
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
