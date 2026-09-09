// Entrance motion for the page: display headings rise line by line out of a
// mask, and everything else fades up as it comes into view. Both are driven by
// one observer and both collapse to "just show it" under reduced motion.

const HEADINGS = [
  ".hero h1",
  ".creative h2",
  ".about h2",
  ".work-title h2",
  ".team-heading h2",
];

const FADES = [
  ".section-top",
  ".hero-bottom > *",
  ".hero-film",
  ".creative-bottom > *",
  ".project",
  ".about-copy > *",
  ".about-note",
  ".team-heading p",
  ".team-member",
  ".service",
  ".contact-title",
  ".contact-bottom > *",
  "footer > *",
];

/* Split a heading into per-line spans so each line can be masked separately.
   Absolutely positioned children (the contact arrow, the work direction mark)
   are left alone: a mask would clip them out of their corner. */
function splitLines(heading: HTMLElement) {
  if (heading.dataset.split === "true") return;
  const lines: Node[][] = [[]];
  const detached: Element[] = [];
  for (const node of [...heading.childNodes]) {
    if (node.nodeName === "BR") {
      lines.push([]);
      continue;
    }
    if (
      node instanceof HTMLElement &&
      getComputedStyle(node).position === "absolute"
    ) {
      detached.push(node);
      continue;
    }
    if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) continue;
    lines[lines.length - 1].push(node);
  }
  heading.replaceChildren();
  lines
    .filter((nodes) => nodes.length)
    .forEach((nodes, index) => {
      const line = document.createElement("span");
      line.className = "line";
      const inner = document.createElement("span");
      inner.className = "line-inner";
      inner.style.setProperty("--i", String(index));
      inner.append(...nodes);
      line.append(inner);
      heading.append(line);
    });
  heading.append(...detached);
  heading.dataset.split = "true";
}

export function setupReveals(reduced: boolean, signal: AbortSignal) {
  const headings = [
    ...document.querySelectorAll<HTMLElement>(HEADINGS.join(",")),
  ];
  const fades = [...document.querySelectorAll<HTMLElement>(FADES.join(","))];

  if (reduced) {
    // Nothing moves, but everything must still be on screen and readable.
    headings.forEach((el) => el.classList.add("is-in"));
    fades.forEach((el) => el.classList.add("is-in"));
    document.documentElement.dataset.revealsReady = "true";
    return () => {};
  }

  headings.forEach(splitLines);
  headings.forEach((el) => el.classList.add("reveal-lines"));
  fades.forEach((el, index) => {
    el.classList.add("reveal-fade");
    el.style.setProperty("--i", String(index % 6));
  });

  // A sweep rather than an IntersectionObserver, for two reasons an observer
  // got wrong here: content in the last screenful can never satisfy a negative
  // bottom margin and stayed invisible forever, and fast or programmatic
  // scrolling let elements pass through without a callback ever firing. This
  // reveals anything at or above the line, including anything already passed,
  // so nothing can end up stuck at opacity 0.
  let pending = [...headings, ...fades];
  let frame = 0;
  const sweep = () => {
    frame = 0;
    // Normally trigger a little before the bottom edge, but once the page can
    // scroll no further the line has to be the edge itself, or whatever sits in
    // the last few pixels (the footer) could never reveal.
    const doc = document.documentElement;
    const atEnd = innerHeight + window.scrollY >= doc.scrollHeight - 4;
    const line = atEnd ? innerHeight + 1 : innerHeight * 0.92;
    pending = pending.filter((el) => {
      if (el.getBoundingClientRect().top >= line) return true;
      el.classList.add("is-in");
      return false;
    });
    if (!pending.length) document.documentElement.dataset.revealsReady = "true";
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(sweep);
  };
  addEventListener("scroll", schedule, { passive: true, signal });
  addEventListener("resize", schedule, { signal });
  sweep();
  // Late layout shifts (fonts, media) move things across the line.
  addEventListener("load", schedule, { signal });
  const settle = setTimeout(sweep, 1200);
  return () => {
    cancelAnimationFrame(frame);
    clearTimeout(settle);
  };
}
