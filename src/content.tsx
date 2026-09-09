import { ArrowUpRight } from "lucide-react";
export const projects = [
  { slug: "ncfp", name: "NCFP", type: "Project film / Edit & finish" },
  { slug: "redline", name: "RED LINE", type: "Motion study / Moving image" },
  { slug: "dito", name: "DITO MAXX", type: "Brand film / Motion & edit" },
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

export const team = [
  {
    name: "Dominic Canatoy",
    role: "Founder / Creative Director",
    email: "dominic.zxeno@gmail.com",
  },
  {
    name: "Eince Villorente",
    role: "Co-Founder / Art Director",
    email: "eince.zxeno@gmail.com",
  },
  {
    name: "Cai Costillas",
    role: "Co-Founder / COO",
    email: "cai.zxeno@gmail.com",
  },
  {
    name: "Pascua Victor",
    role: "Full Stack Developer / CMO",
    email: "victor.zxeno@gmail.com",
  },
  {
    name: "Aquio Fulgencio",
    role: "Software Engineer / Full Stack Developer",
    email: "aquio.zxeno@gmail.com",
  },
  {
    name: "John Kenneth Bergonio",
    role: "Software Engineer / Full Stack Developer",
  },
  {
    name: "Jeff Eugenio",
    role: "3D / Motion Designer",
    email: "jeff.zxeno@gmail.com",
  },
  {
    name: "Karl Emanuel",
    role: "Video Editor / Motion Designer",
    email: "karl.zxeno@gmail.com",
  },
  { name: "V1nks", role: "Video Editor / Motion Designer" },
  {
    name: "Neo Hapa",
    role: "Colorist / Video Editor",
    email: "neo.zxeno@gmail.com",
  },
  {
    name: "Kierre Paolo",
    role: "Motion Designer",
    email: "zaevara.zxeno@gmail.com",
  },
  {
    name: "Haq Equia",
    role: "Motion Designer",
    email: "haqwelsir.zxeno@gmail.com",
  },
];
