import { ArrowUpRight } from "lucide-react";
export const projects = [
  { slug: "ncfp", name: "NCFP", type: "Project film / Edit & finish" },
  { slug: "redline", name: "RED LINE", type: "Motion study / Moving image" },
  { slug: "dito", name: "DITO MAXX", type: "Brand film / Motion & edit" },
];
// Home page showcase films. They share the film player with `projects`, so
// their `data-film` index continues on from it (see `films`).
export const showcaseProjects = [
  { slug: "sauvage", name: "Sauvage Dior", type: "Product film / 3D" },
  { slug: "jbl", name: "JBL Headset", type: "Product film / 3D" },
];
export const films = [...projects, ...showcaseProjects];
// Logos live in /media/brands, cropped to their visible edges. `ratio` is
// width / height, used to size each mark by area rather than by height so
// wide wordmarks and square marks read at a similar weight. `variant` names
// the extra file a mark needs to stay visible in the other theme:
// `-dark` lightens near-black parts, `-light` darkens a white-only mark.
export type Brand = {
  slug: string;
  name: string;
  ratio: number;
  variant?: "dark" | "light";
};
export const brandsWorkedWith: Brand[] = [
  {
    slug: "ncfp",
    name: "Noordhoff Craniofacial Foundation Philippines",
    ratio: 0.83,
    variant: "dark",
  },
  { slug: "dito", name: "DITO Telecommunity", ratio: 2.06, variant: "dark" },
  { slug: "gma", name: "GMA Network", ratio: 2.16 },
  { slug: "honda", name: "Honda", ratio: 1.58 },
  { slug: "puregold", name: "Puregold", ratio: 1.87, variant: "dark" },
  { slug: "calibre-co", name: "Calibre Co.", ratio: 3.8, variant: "dark" },
  { slug: "sintachat", name: "Sintachat", ratio: 0.75 },
];
export const brandPartners: Brand[] = [
  { slug: "calibre-co", name: "Calibre Co.", ratio: 3.8, variant: "dark" },
  { slug: "caidalum", name: "Caidalum", ratio: 0.94, variant: "light" },
];
// The Work page's 3D gallery. Shared with the intro's project showcase, so
// it lives here alongside `projects` rather than inside the Portfolio
// component.
export const galleryProjects = [
  {
    slug: "dito",
    name: "DITO Telecommunity",
    count: 5,
    type: "Campaign graphics / Design",
  },
  {
    slug: "vfx",
    name: "3D VFX",
    count: 7,
    type: "Visual effects / 3D studies",
  },
  {
    slug: "iphone",
    name: "iPhone",
    count: 5,
    type: "Product visualization / 3D",
  },
  {
    slug: "jbl",
    name: "JBL Headset",
    count: 4,
    type: "Product visualization / 3D",
  },
  {
    slug: "dior",
    name: "Sauvage Dior",
    count: 4,
    type: "Product visualization / 3D",
  },
];
export function Project({
  project,
  index,
}: {
  project: (typeof projects)[number];
  index: number;
}) {
  return (
    <article className="project">
      <button
        className="project-media"
        data-film={index}
        aria-label={`Watch ${project.name}`}
      >
        <video
          muted
          playsInline
          loop
          preload="none"
          poster={`/media/${project.slug}.webp`}
          data-skeleton
          data-src={`/media/${project.slug}-preview.mp4`}
        />
        <span className="project-play" aria-hidden="true">
          <ArrowUpRight />
        </span>
      </button>
      <div className="project-meta">
        <div>
          <h3>{project.name}</h3>
          <p>{project.type}</p>
        </div>
      </div>
    </article>
  );
}
export const services = [
  [
    "Creative & art direction",
    "Creative vision, visual language and art direction, led by Dominic Canatoy and Eince Villorente.",
  ],
  [
    "3D & motion design",
    "Dimensional worlds and moving images, shaped by Jeff Eugenio, Karl Emanuel, V1nks, Kierre Paolo and Haq Equia.",
  ],
  [
    "Video editing & colour",
    "Story, rhythm and the final grade, with Karl Emanuel, V1nks and Neo Hapa.",
  ],
  [
    "Full stack development",
    "Connected interfaces and systems, built by Pascua Victor, Aquio Fulgencio and John Kenneth Bergonio.",
  ],
  [
    "Software engineering",
    "Thoughtful software from architecture to implementation, with Aquio Fulgencio and John Kenneth Bergonio.",
  ],
  [
    "Operations & marketing",
    "A clear path from the brief to delivery, led by Cai Costillas in operations and Pascua Victor in marketing.",
  ],
];

// Tech stacks below are confirmed for Aquio Fulgencio, Karl Emanuel and
// Pascua Victor; every other member's is a placeholder guessed from their
// role, pending the real list from each of them.
export const team = [
  {
    name: "Dominic Canatoy",
    role: "Founder / Creative Director",
    techStack: [
      "Figma",
      "Photoshop",
      "Illustrator",
      "After Effects",
      "Keynote",
      "Notion",
    ],
  },
  {
    name: "Eince Villorente",
    role: "Co-Founder / Art Director",
    techStack: ["Photoshop", "Illustrator", "Figma", "InDesign", "After Effects"],
  },
  {
    name: "Cai Costillas",
    role: "Co-Founder / COO",
    techStack: ["Notion", "Slack", "Google Workspace", "Asana", "Trello"],
  },
  {
    name: "Pascua Victor",
    role: "Full Stack Developer / CMO",
    techStack: [
      "Python",
      "C++",
      "Java",
      "Assembly",
      "MERN Stack",
      "LAMP Stack",
      "RESTful APIs",
      "GraphQL",
      "FastAPI",
      "Django",
      "Spring Boot",
      ".NET",
      "Ghidra",
      "IDA Pro",
      "OllyDbg",
      "Docker",
      "Kubernetes",
      "Terraform",
      "GitHub Actions",
      "AWS",
      "Google Cloud",
      "CI/CD",
      "After Effects",
      "Photoshop",
      "Illustrator",
      "Canva",
      "Wireshark",
      "Metasploit",
    ],
  },
  {
    name: "Aquio Fulgencio",
    role: "CTO / Software Engineer",
    techStack: [
      "C++",
      "Python",
      "Java",
      "JavaScript",
      "TypeScript",
      "Next.js",
      "React",
      "Tailwind CSS",
      "Node.js",
      "Express",
      "Prisma",
      "MySQL",
      "PostgreSQL",
      "VS Code",
      "IntelliJ IDEA",
      "Git",
      "GitHub",
      "Vercel",
      "Cloudflare",
      "Photoshop",
      "Illustrator",
      "After Effects",
    ],
  },
  {
    name: "John Kenneth Bergonio",
    role: "Software Engineer / Full Stack Developer",
    techStack: [
      "JavaScript",
      "TypeScript",
      "React",
      "Next.js",
      "Node.js",
      "Express",
      "PostgreSQL",
      "Tailwind CSS",
      "Git",
      "GitHub",
      "Docker",
    ],
  },
  {
    name: "Jeff Eugenio",
    role: "3D / Motion Designer",
    techStack: ["Blender", "Cinema 4D", "After Effects", "Photoshop", "Octane Render"],
  },
  {
    name: "Kierre Paolo",
    role: "Motion Designer",
    techStack: ["After Effects", "Cinema 4D", "Illustrator", "Photoshop"],
  },
  {
    name: "Haq Equia",
    role: "Motion Designer",
    techStack: ["After Effects", "Illustrator", "Photoshop", "Figma"],
  },
  {
    name: "Karl Emanuel",
    role: "Video Editor / Motion Designer",
    techStack: ["Photoshop", "After Effects", "DaVinci Resolve"],
  },
  {
    name: "Kenjie Villacorta",
    role: "Editor / Motion Designer",
    techStack: [],
  },
  {
    name: "V1nks",
    role: "Video Editor / Motion Designer",
    techStack: ["Premiere Pro", "After Effects", "DaVinci Resolve", "Photoshop"],
  },
  {
    name: "Neo Hapa",
    role: "Colorist / Video Editor",
    techStack: ["DaVinci Resolve", "Premiere Pro", "After Effects"],
  },
  {
    name: "James Rodbaq Ordena",
    role: "Graphic Designer",
    techStack: ["Photoshop", "Illustrator", "Figma", "Canva"],
  },
];
