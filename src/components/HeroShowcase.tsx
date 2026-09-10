import { useEffect, useState } from "react";
import { ServiceArtwork } from "./Portfolio";
// The same four disciplines shown on the Services page, as real artwork
// instead of a WebGL scene. Cycles on its own every 3s; a click jumps
// straight there and restarts the 3s clock (see the effect's dependency).
const showcaseItems = [
  { file: "graphic-design", label: "Graphic design" },
  { file: "merchandise", label: "Merchandise" },
  { file: "motion", label: "Motion graphics" },
  { file: "web", label: "Website design & development" },
];
export function HeroShowcase() {
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      setSelected((s) => (s + 1) % showcaseItems.length);
    }, 3000);
    return () => window.clearInterval(id);
  }, [selected]);
  const current = showcaseItems[selected];
  return (
    <div className="hero-products">
      <div className="hero-showcase-stage" key={current.file}>
        <ServiceArtwork file={current.file} label={current.label} />
      </div>
      <div className="hero-products-controls">
        <div className="hero-product-tabs" aria-label="Creative disciplines">
          {showcaseItems.map((item, i) => (
            <button
              key={item.file}
              aria-pressed={selected === i}
              onClick={() => setSelected(i)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <span className="hero-drag-hint">Hover or drag to tilt</span>
    </div>
  );
}
