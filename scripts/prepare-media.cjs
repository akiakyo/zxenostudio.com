const { spawnSync } = require("node:child_process");
const {
  mkdirSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const ffmpeg = require("@ffmpeg-installer/ffmpeg").path;
mkdirSync("public/media", { recursive: true });
mkdirSync("public/assets", { recursive: true });
copyFileSync("assets/mark.svg", "public/assets/mark.svg");
// [slug, source file, preview start (s), poster frame (s),
//  preview length (s), stretches to drop from the preview as [from, to] (s)]
// Previews loop silently on the cards, so fades to black and end cards are
// trimmed out of them; the full film is left as cut.
const films = [
  ["dito", "DITO_MAXX_MODE ON_NO LIGHTNING.mp4", 2, 4],
  ["ncfp", "NCFP FINAL WITH MUSIC.mp4", 5, 5],
  ["redline", "RED LINE.mp4", 1, 8],
  ["sauvage", "SAUVAGE.ZXENO.mp4", 0, 0.5, 11.1, [[5.6, 7.3]]],
  ["jbl", "JBL ZXENO.mp4", 0, 2, 5.3],
];
const only = process.argv.slice(2);
for (const [slug, file, start, poster, length = 12, drop = []] of films) {
  const cut = drop.length
    ? `select='not(${drop.map(([a, b]) => `between(t,${a},${b})`).join("+")})',setpts=N/FRAME_RATE/TB,`
    : "";
  if (only.length && !only.includes(slug)) continue;
  const source = "assets/projects/" + file;
  for (const args of [
    [
      "-ss",
      String(poster),
      "-i",
      source,
      "-frames:v",
      "1",
      "-vf",
      "scale=1440:-2",
      "-quality",
      "85",
      `public/media/${slug}.webp`,
    ],
    [
      "-ss",
      String(start),
      // An input option, so `length` measures source time before any cuts.
      "-t",
      String(length),
      "-i",
      source,
      "-an",
      "-vf",
      cut + "scale=1280:-2",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "25",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      `public/media/${slug}-preview.mp4`,
    ],
    slug === "redline"
      ? [
          "-i",
          source,
          "-c",
          "copy",
          "-movflags",
          "+faststart",
          `public/media/${slug}.mp4`,
        ]
      : [
          "-i",
          source,
          "-c:v",
          "libx264",
          "-preset",
          "fast",
          "-crf",
          "22",
          "-vf",
          "scale='min(1920,iw)':-2",
          "-c:a",
          "aac",
          "-b:a",
          "160k",
          "-pix_fmt",
          "yuv420p",
          "-movflags",
          "+faststart",
          `public/media/${slug}.mp4`,
        ],
  ]) {
    const result = spawnSync(ffmpeg, ["-y", "-loglevel", "error", ...args], {
      stdio: "inherit",
    });
    if (result.status !== 0) process.exit(result.status || 1);
  }
}
