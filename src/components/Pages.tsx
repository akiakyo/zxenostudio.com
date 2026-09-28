import type { CSSProperties, ReactNode } from "react";
import {
  Project,
  projects,
  showcaseProjects,
  brandsWorkedWith,
  brandPartners,
  galleryProjects,
  type Brand,
} from "../content";
import { GalleryCard } from "./Portfolio";
import {
  CreditCard,
  ClipboardList,
  Pencil,
  Timer,
  Lightbulb,
  ArrowUpRight,
  Code2,
  PanelsTopLeft,
  Clapperboard,
  Rocket,
  PenTool,
  Play,
  Fingerprint,
  Package,
  ChartNoAxesCombined,
  Monitor,
  Box,
  FolderOpen,
  Users,
  Layers,
  Wallet,
} from "lucide-react";
export const disciplines = [
  {
    name: "Website Development / Design",
    icon: Code2,
    copy: "Responsive websites, designed and built.",
  },
  {
    name: "UI/UX Design",
    icon: PanelsTopLeft,
    copy: "Intuitive interfaces for digital products.",
  },
  {
    name: "Motion Graphics",
    icon: Clapperboard,
    copy: "Brand stories in motion.",
  },
  {
    name: "Startup Design",
    icon: Rocket,
    copy: "From first pitch to launch.",
  },
  {
    name: "Graphic Design",
    icon: PenTool,
    copy: "Campaigns, social content and more.",
  },
  {
    name: "Animation",
    icon: Play,
    copy: "Stories brought to life.",
  },
  {
    name: "Brand Identity Design",
    icon: Fingerprint,
    copy: "Logos and cohesive visual systems.",
  },
  {
    name: "Print, Merchandise & Packaging Design",
    icon: Package,
    copy: "Design you can hold.",
  },
  {
    name: "Infographic Design & Illustration",
    icon: ChartNoAxesCombined,
    copy: "Clear information. Original illustration.",
  },
  {
    name: "LED Design",
    icon: Monitor,
    copy: "Visuals for screens and stages.",
  },
  {
    name: "3D Modeling",
    icon: Box,
    copy: "Products and worlds in 3D.",
  },
];
export function PageHeading({
  label,
  title,
  copy,
}: {
  label: string;
  title: ReactNode;
  copy: string;
}) {
  return (
    <section className="page-heading" data-tone="paper">
      <span className="eyebrow">ZXENO / {label}</span>
      <h1>{title}</h1>
      <p>{copy}</p>
    </section>
  );
}
export function ServiceDirectory() {
  return (
    <>
      <section className="discipline-grid" data-tone="paper">
        {disciplines.map(({ name, icon: Icon, copy }, i) => (
          <article key={name} id={`service-${i + 1}`}>
            <div className="discipline-top">
              <Icon aria-hidden="true" />
              <span className="eyebrow">{String(i + 1).padStart(2, "0")}</span>
            </div>
            <h2>{name}</h2>
            <p>{copy}</p>
            <a
              className="text-link"
              href={`/book?service=${encodeURIComponent(name)}`}
            >
              Let's talk <ArrowUpRight aria-hidden="true" />
            </a>
          </article>
        ))}
      </section>
    </>
  );
}

function BrandStrip({
  label,
  brands,
  reverse,
  children,
}: {
  label: string;
  brands: Brand[];
  reverse?: boolean;
  children?: ReactNode;
}) {
  // Each copy repeats the list until it holds at least eight marks, so a
  // short list still spans a wide viewport and the loop never shows a gap.
  const set = Array.from(
    { length: Math.ceil(8 / brands.length) },
    () => brands,
  ).flat();
  const logos = set.map((brand, i) => {
    const src = (suffix = "") => `/media/brands/${brand.slug}${suffix}.webp`;
    return (
      <span
        key={i}
        className="brand-logo"
        style={
          {
            "--ratio": brand.ratio,
            // Size by area: wide wordmarks shrink, square marks grow.
            "--scale": Math.pow(2 / brand.ratio, 0.45).toFixed(3),
          } as CSSProperties
        }
      >
        {brand.variant ? (
          <>
            <img
              className="on-light"
              src={src(brand.variant === "light" ? "-light" : "")}
              alt=""
              loading="lazy"
            />
            <img
              className="on-dark"
              src={src(brand.variant === "dark" ? "-dark" : "")}
              alt=""
              loading="lazy"
            />
          </>
        ) : (
          <img src={src()} alt="" loading="lazy" />
        )}
      </span>
    );
  });
  return (
    <section
      className={`brand-strip${reverse ? " is-reverse" : ""}`}
      data-tone="paper"
    >
      <span className="eyebrow">{label}</span>
      {/* The marquee repeats every logo, so it is hidden from screen
          readers, which get the names once from this list instead. */}
      <ul className="sr-only">
        {brands.map((brand) => (
          <li key={brand.slug}>{brand.name}</li>
        ))}
      </ul>
      <div className="brand-strip-viewport" aria-hidden="true">
        {/* Two identical copies back to back, animated left by exactly
            one copy's width, looping seamlessly — a real marquee rather
            than a wrapping row. */}
        <div className="brand-strip-track">
          <div className="brand-strip-set">{logos}</div>
          <div className="brand-strip-set">{logos}</div>
        </div>
      </div>
      {children}
    </section>
  );
}
export function HomeOverview() {
  return (
    <>
      <BrandStrip label="Brands we've worked with" brands={brandsWorkedWith} />
      <BrandStrip label="Brand partners" brands={brandPartners} reverse />
      <section className="showcase" data-tone="paper">
        <div className="showcase-top">
          <span className="eyebrow">Featured work</span>
          <a className="text-link" href="/work">
            Our works <ArrowUpRight aria-hidden="true" />
          </a>
        </div>
        <div className="showcase-list">
          {showcaseProjects.map((project, i) => (
            <Project
              key={project.slug}
              project={project}
              index={projects.length + i}
            />
          ))}
          <GalleryCard
            project={galleryProjects.find((p) => p.slug === "dito")!}
          />
        </div>
      </section>
      <section className="home-overview" data-tone="paper">
        <span className="eyebrow">Our services</span>
        <h2>
          One studio.
          <br />
          <span className="accent">Every dimension.</span>
        </h2>
        <p>Websites. Identity. Motion. 3D.</p>
        <a className="booking-button" href="/services">
          Explore all services <ArrowUpRight aria-hidden="true" />
        </a>
      </section>
      <section className="audiences" data-tone="paper">
        <span className="eyebrow">Who is it for?</span>
        <div>
          {[
            ["Startups with a vision", "Build your brand. Launch your idea."],
            ["Brands ready to grow", "Fresh ideas for your next chapter."],
            [
              "Teams making something new",
              "Extra creative hands for your team.",
            ],
          ].map(([title, copy]) => (
            <article key={title}>
              <h2>{title}</h2>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
const quickLinks = [
  {
    label: "Work",
    href: "/work",
    icon: FolderOpen,
    copy: "See what we've made.",
  },
  { label: "About", href: "/about", icon: Users, copy: "Meet the studio." },
  {
    label: "Services",
    href: "/services",
    icon: Layers,
    copy: "Everything we do.",
  },
  // Pricing hidden for now.
  // {
  //   label: "Pricing",
  //   href: "/pricing",
  //   icon: Wallet,
  //   copy: "How projects are priced.",
  // },
];
export function QuickLinks() {
  return (
    <section className="quick-links" data-tone="paper">
      <div className="section-top eyebrow">
        <span>Explore ZXENO</span>
        <span>Find your way around</span>
      </div>
      <div className="quick-links-grid">
        {quickLinks.map(({ label, href, icon: Icon, copy }) => (
          <a className="quick-link" href={href} key={label}>
            <ArrowUpRight className="quick-link-arrow" aria-hidden="true" />
            <span className="quick-link-icon">
              <Icon aria-hidden="true" />
            </span>
            <span className="quick-link-label">{label}</span>
            <span className="quick-link-copy">{copy}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
export function Pricing() {
  return (
    <section className="pricing-panel" data-tone="paper">
      <span className="eyebrow">Project pricing / Philippine peso</span>
      <div className="price">₱10,000,000</div>
      <span className="price-note">Temporary placeholder — not a quote</span>
      <h2>Big ideas. A price we'll discuss.</h2>
      <p>
        Final pricing depends on your project. Agreed in PHP before we start.
      </p>
      <a className="booking-button" href="/book">
        Discuss your project <ArrowUpRight aria-hidden="true" />
      </a>
    </section>
  );
}
export function Booking() {
  const service = new URLSearchParams(location.search).get("service");
  const href = `mailto:zxenostudio@gmail.com?subject=${encodeURIComponent(`Book a call${service ? ` — ${service}` : ""}`)}&body=${encodeURIComponent(`Hi ZXENO,\n\nI'd like to arrange a call${service ? ` about ${service}` : ""}.\n\nProject overview:\nPreferred dates and times (with timezone):\nTarget timeline:\nBudget in PHP:\n\nThanks!`)}`;
  return (
    <section className="booking-panel" data-tone="paper">
      <span className="eyebrow">Let's meet / Philippines · GMT+8</span>
      <h2>
        A good conversation.
        <br />A great starting point.
      </h2>
      <p>Share your idea. We'll arrange a call by email.</p>
      {service && (
        <p>
          Interested in: <strong>{service}</strong>
        </p>
      )}
      <a className="booking-button" href={href}>
        Request a call by email <ArrowUpRight aria-hidden="true" />
      </a>
      <p className="booking-note">
        Opens your email app. Time confirmed by email.
      </p>
    </section>
  );
}

export function ProjectApproach() {
  const items = [
    {
      icon: CreditCard,
      title: "Project-based pricing",
      description:
        "Every project is quoted based on its scope, requirements, and production needs.",
    },
    {
      icon: ClipboardList,
      title: "Defined project scope",
      description:
        "Deliverables, requirements, and expectations are clearly outlined before production begins.",
    },
    {
      icon: Pencil,
      title: "Structured revisions",
      description:
        "Revisions are handled according to the agreed scope and terms in the project agreement.",
    },
    {
      icon: Timer,
      title: "Milestone-based delivery",
      description:
        "Projects follow an agreed production timeline, with deliverables released according to milestones.",
    },
    {
      icon: Monitor,
      title: "Specialized creative team",
      description:
        "Bring together the right creative specialists based on the needs of each project.",
    },
    {
      icon: Lightbulb,
      title: "Tailored solutions",
      description:
        "Every project is approached differently, with creative solutions built around your goals and requirements.",
    },
  ];
  return (
    <section
      className="project-approach"
      data-tone="paper"
      aria-labelledby="approach-title"
    >
      <h2 id="approach-title" className="eyebrow">
        How we work
      </h2>
      <div className="approach-grid">
        {items.map(({ title, description }, i) => (
          <article className="approach-card" key={title}>
            <span className="approach-icon">
              <img
                src={`/assets/icons/icon-${[2, 3, 4, 5, 6, 1][i]}.png`}
                alt=""
                width="76"
                height="76"
                loading="lazy"
              />
            </span>
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
