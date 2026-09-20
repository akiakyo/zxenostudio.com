/* Short tones made in the browser rather than audio files: nothing to ship,
   nothing to fetch, and nothing to fail on a slow connection. Browsers refuse
   to make noise before someone has interacted with the page, so the audio
   context is created on the first gesture and resumed if it was suspended. */

const KEY = "zxeno-admin-sound";
let context: AudioContext | null = null;

export function soundOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    /* private windows and blocked storage: default to audible */
    return true;
  }
}

export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* nothing to do: the preference simply will not persist */
  }
}

function ready(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    if (!context) context = new Ctor();
    if (context.state === "suspended") void context.resume();
    return context;
  } catch {
    return null;
  }
}

if (typeof document !== "undefined") {
  const unlock = () => {
    ready();
    document.removeEventListener("pointerdown", unlock);
    document.removeEventListener("keydown", unlock);
  };
  document.addEventListener("pointerdown", unlock);
  document.addEventListener("keydown", unlock);
}

type Tone = { hz: number; delay: number; length: number };

function play(tones: Tone[], level: number) {
  if (!soundOn()) return;
  const ctx = ready();
  /* still locked, or the device has no audio: stay silent rather than throw */
  if (!ctx || ctx.state !== "running") return;
  for (const tone of tones) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = tone.hz;
    const start = ctx.currentTime + tone.delay;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(level, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.length);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + tone.length + 0.02);
  }
}

export const chime = {
  /* a new message from someone else */
  message: () => play([{ hz: 659, delay: 0, length: 0.13 }], 0.05),
  /* something waiting for this person */
  notification: () =>
    play(
      [
        { hz: 880, delay: 0, length: 0.1 },
        { hz: 1174, delay: 0.11, length: 0.18 },
      ],
      0.045,
    ),
};
