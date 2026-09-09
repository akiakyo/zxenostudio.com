const { spawnSync } = require("node:child_process");
const {
  mkdirSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const ffmpeg = require.resolve("@ffmpeg-installer/win32-x64/ffmpeg.exe");
mkdirSync("public/media", { recursive: true });
mkdirSync("public/assets", { recursive: true });
copyFileSync("assets/mark.svg", "public/assets/mark.svg");
const films = [
  ["dito", "DITO_MAXX_MODE ON_NO LIGHTNING.mp4", 2],
  ["ncfp", "NCFP FINAL WITH MUSIC.mp4", 5],
  ["redline", "RED LINE.mp4", 1],
];
for (const [slug, file, start] of films) {
  const source = "assets/projects/" + file;
  for (const args of [
    [
      "-ss",
      String(slug === "redline" ? 8 : slug === "dito" ? 4 : start),
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
      "-i",
      source,
      "-t",
      "12",
      "-an",
      "-vf",
      "scale=1280:-2",
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
