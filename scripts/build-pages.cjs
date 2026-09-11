const fs = require("node:fs");
const path = require("node:path");
const html = fs.readFileSync("dist/index.html", "utf8");
for (const [route, title] of Object.entries({
  services: "Our services",
  work: "Our works",
  about: "About the studio",
  pricing: "Pricing",
  book: "Book a call",
})) {
  const folder = path.join("dist", route);
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(
    path.join(folder, "index.html"),
    html
      .replace(/<title>.*?<\/title>/, `<title>${title} — ZXENO Studio</title>`)
      .replace(
        /<link rel="canonical" href="[^"]*" \/>/,
        `<link rel="canonical" href="https://zxenostudio.com/${route}" />`,
      ),
  );
}
fs.writeFileSync(
  "dist/404.html",
  html.replace(
    /<title>.*?<\/title>/,
    "<title>Page not found — ZXENO Studio</title>",
  ),
);
