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
  CheckCircle2,
  Radio,
  Cloud,
  Film,
  Handshake,
  Upload,
  Music,
  Building2,
  Drama,
  FolderOpen,
  Users,
  Layers,
  Wallet,
  type LucideIcon,
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
  title: string;
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
const brandStripNames = ["NCFP", "RED LINE", "DITO MAXX"];
export function HomeOverview() {
  return (
    <>
      <section className="brand-strip" data-tone="paper">
        <span className="eyebrow">Brands featured in our work</span>
        <div className="brand-strip-viewport">
          {/* Two identical copies back to back, animated left by exactly
              one copy's width, looping seamlessly — a real marquee rather
              than a wrapping row. The second copy is decorative. */}
          <div className="brand-strip-track">
            <div className="brand-strip-set">
              {brandStripNames.map((name) => (
                <span key={name}>{name}</span>
              ))}
            </div>
            <div className="brand-strip-set" aria-hidden="true">
              {brandStripNames.map((name) => (
                <span key={name}>{name}</span>
              ))}
            </div>
          </div>
        </div>
        <a className="text-link" href="/work">
          Our works <ArrowUpRight aria-hidden="true" />
        </a>
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
// What the studio has lined up this quarter, month by month.
const timelineData: {
  month: string;
  items: {
    title: string;
    icon: LucideIcon;
    done?: boolean;
    details?: string[];
  }[];
}[] = [
  {
    month: "September",
    items: [
      {
        title: "DITO Telecomm",
        icon: Radio,
        done: true,
        details: ["1 animation", "8 graphics"],
      },
      {
        title: "Likhaan Animation",
        icon: Clapperboard,
        details: ["3 animations", "1 long-form animation"],
      },
      { title: "SaaS animation", icon: Cloud },
      { title: "Web development launch", icon: Rocket },
      { title: "2D animation project", icon: Film },
      { title: "ZXENO × Calibre", icon: Handshake },
      { title: "ZXENO × Caidalum", icon: Handshake },
    ],
  },
  {
    month: "October",
    items: [
      { title: "WAZ showreels posting", icon: Upload },
      { title: "Aurora Music Festival — Alabang prep", icon: Music },
    ],
  },
  {
    month: "November",
    items: [
      {
        title: "Aurora Music Festival",
        icon: Music,
        details: ["Around Nov 26"],
      },
    ],
  },
  {
    month: "December",
    items: [
      { title: "Municipality project", icon: Building2 },
      { title: "University of Perps Theater Play × ZXENO", icon: Drama },
    ],
  },
];
export function Timeline() {
  return (
    <section
      className="timeline"
      data-tone="paper"
      aria-labelledby="timeline-title"
    >
      <div className="section-top eyebrow">
        <span>ZXENO Studio timeline</span>
        <span>What's ahead this quarter</span>
      </div>
      <h2 id="timeline-title">
        Where the studio
        <br />
        <span className="accent">is headed.</span>
      </h2>
      <div className="timeline-rail">
        {timelineData.map((month) => (
          <div className="timeline-month" key={month.month}>
            <div className="timeline-marker">
              <span className="timeline-dot" aria-hidden="true" />
              <span className="timeline-month-label">{month.month}</span>
            </div>
            <ul className="timeline-items">
              {month.items.map((item) => (
                <li key={item.title}>
                  <div className="timeline-item-head">
                    <span className="timeline-item-title">
                      <item.icon aria-hidden="true" />
                      {item.title}
                    </span>
                    {item.done && (
                      <span className="timeline-done">
                        <CheckCircle2 aria-hidden="true" />
                        Done
                      </span>
                    )}
                  </div>
                  {item.details && (
                    <ul className="timeline-details">
                      {item.details.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
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
  {
    label: "Pricing",
    href: "/pricing",
    icon: Wallet,
    copy: "How projects are priced.",
  },
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
