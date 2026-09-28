import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, X } from "lucide-react";
import { galleryProjects } from "../content";
export function PortfolioGallery() {
  return (
    <section
      className="portfolio-gallery"
      data-tone="paper"
      aria-labelledby="portfolio-heading"
    >
      <h2 id="portfolio-heading">In three dimensions.</h2>
      <div className="portfolio-grid">
        {galleryProjects.map((p) => (
          <GalleryCard key={p.slug} project={p} />
        ))}
      </div>
    </section>
  );
}
// A gallery cover plus its image viewer. Shared by the Work page grid and
// the home page showcase. The dialog only mounts while open, so a page with
// several cards still has a single gallery dialog at a time.
export function GalleryCard({
  project,
}: {
  project: (typeof galleryProjects)[number];
}) {
  const [open, setOpen] = useState(false);
  const [frame, setFrame] = useState(1);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);
  const step = (offset: number) =>
    setFrame((n) => ((n - 1 + offset + project.count) % project.count) + 1);
  return (
    <article className="gallery-card">
      <button
        ref={trigger}
        className="gallery-cover"
        onClick={() => {
          setFrame(1);
          setOpen(true);
        }}
        aria-label={`View ${project.name} gallery`}
      >
        <img
          src={`/media/portfolio/${project.slug}-1.png`}
          alt={`${project.name} artwork`}
          loading="lazy"
        />
        <span>
          View project · {project.count} images{" "}
          <ArrowUpRight aria-hidden="true" />
        </span>
      </button>
      <h3>{project.name}</h3>
      <p>{project.type}</p>
      {open && (
        <dialog
          className="gallery-dialog"
          ref={dialog}
          aria-labelledby="gallery-title"
          onClose={() => {
            setOpen(false);
            trigger.current?.focus();
          }}
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
      )}
    </article>
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
