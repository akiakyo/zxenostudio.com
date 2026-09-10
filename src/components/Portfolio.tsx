import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { galleryProjects } from "../content";
export function PortfolioGallery() {
  const [active, setActive] = useState(0);
  const [frame, setFrame] = useState(1);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const project = galleryProjects[active];
  const step = (offset: number) =>
    setFrame((n) => ((n - 1 + offset + project.count) % project.count) + 1);
  return (
    <section
      className="portfolio-gallery"
      data-tone="paper"
      aria-labelledby="portfolio-heading"
    >
      <h2 id="portfolio-heading">In three dimensions.</h2>
      <div className="portfolio-grid">
        {galleryProjects.map((p, i) => (
          <article key={p.slug}>
            <button
              className="gallery-cover"
              onClick={(e) => {
                trigger.current = e.currentTarget;
                setActive(i);
                setFrame(1);
                dialog.current?.showModal();
              }}
              aria-label={`View ${p.name} gallery`}
            >
              <img
                src={`/media/portfolio/${p.slug}-1.png`}
                alt={`${p.name} 3D artwork`}
                loading="lazy"
              />
              <span>View project · {p.count} images ↗</span>
            </button>
            <h3>{p.name}</h3>
            <p>{p.type}</p>
          </article>
        ))}
      </div>
      <dialog
        className="gallery-dialog"
        ref={dialog}
        aria-labelledby="gallery-title"
        onClose={() => trigger.current?.focus()}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            step(1);
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            step(-1);
          }
        }}
      >
        <div className="gallery-toolbar">
          <h2 id="gallery-title">{project.name}</h2>
          <button
            onClick={() => dialog.current?.close()}
            aria-label="Close gallery"
          >
            <X />
          </button>
        </div>
        <img
          className="gallery-full"
          src={`/media/portfolio/${project.slug}-${frame}.png`}
          alt={`${project.name} — view ${frame}`}
        />
        <div className="gallery-toolbar">
          <button onClick={() => step(-1)} aria-label="Previous image">
            <ArrowLeft />
          </button>
          <span aria-live="polite">
            {frame} / {project.count}
          </span>
          <button onClick={() => step(1)} aria-label="Next image">
            <ArrowRight />
          </button>
        </div>
      </dialog>
    </section>
  );
}
export function ServiceArtwork({
  file,
  label,
}: {
  file: string;
  label: string;
}) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const reset = () => setTilt({ x: 0, y: 0 });
  return (
    <figure className="interactive-artwork">
      <div
        className="artwork-tilt"
        role="group"
        tabIndex={0}
        aria-label={`${label}. Move pointer or drag to tilt. Arrow keys rotate; Home resets.`}
        onPointerMove={(e) => {
          if (reduced() || (e.pointerType !== "mouse" && !e.buttons)) return;
          const r = e.currentTarget.getBoundingClientRect();
          setTilt({
            x: (-(e.clientY - r.top - r.height / 2) / r.height) * 24,
            y: ((e.clientX - r.left - r.width / 2) / r.width) * 24,
          });
        }}
        onPointerLeave={reset}
        onPointerUp={reset}
        onPointerCancel={reset}
        onBlur={reset}
        onKeyDown={(e) => {
          if (
            ![
              "ArrowLeft",
              "ArrowRight",
              "ArrowUp",
              "ArrowDown",
              "Home",
            ].includes(e.key)
          )
            return;
          e.preventDefault();
          if (e.key === "Home") reset();
          else if (!reduced())
            setTilt((t) => ({
              x: Math.max(
                -14,
                Math.min(
                  14,
                  t.x +
                    (e.key === "ArrowUp" ? 3 : e.key === "ArrowDown" ? -3 : 0),
                ),
              ),
              y: Math.max(
                -14,
                Math.min(
                  14,
                  t.y +
                    (e.key === "ArrowRight"
                      ? 3
                      : e.key === "ArrowLeft"
                        ? -3
                        : 0),
                ),
              ),
            }));
        }}
      >
        <img
          src={`/media/services/${file}-cutout.png`}
          alt={label}
          width="1254"
          height="1254"
          loading="lazy"
          draggable={false}
          style={{
            transform: `perspective(850px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          }}
        />
      </div>
      <figcaption>{label}</figcaption>
    </figure>
  );
}
