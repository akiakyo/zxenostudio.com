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

/* Interface sounds (button taps, sent messages, checks) have their own
   switch, separate from the notification tones above. */
const SFX_KEY = "zxeno-admin-sfx";

export function sfxOn(): boolean {
  try {
    return localStorage.getItem(SFX_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSfxOn(on: boolean) {
  try {
    localStorage.setItem(SFX_KEY, on ? "on" : "off");
  } catch {}
}

/* `to` glides the pitch over the tone; `wave` defaults to a pure sine */
type Shaped = Tone & { to?: number; wave?: OscillatorType };

function play(tones: Shaped[], level: number, name: string, enabled = soundOn) {
  if (!enabled()) return;
  /* tests read which sound played from here, since they can't listen */
  (window as { __sfxLog?: string[] }).__sfxLog?.push(name);
  const ctx = ready();
  /* still locked, or the device has no audio: stay silent rather than throw */
  if (!ctx || ctx.state !== "running") return;
  for (const tone of tones) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = tone.wave ?? "sine";
    osc.frequency.value = tone.hz;
    const start = ctx.currentTime + tone.delay;
    if (tone.to && osc.frequency.exponentialRampToValueAtTime) {
      osc.frequency.setValueAtTime(tone.hz, start);
      osc.frequency.exponentialRampToValueAtTime(tone.to, start + tone.length);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(level, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.length);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + tone.length + 0.02);
  }
}

const ui = (tones: Shaped[], level: number, name: string) => () =>
  play(tones, level, name, sfxOn);

/* Short and quiet on purpose: they confirm, they don't announce. */
export const sfx = {
  /* any button press */
  tap: ui([{ hz: 1500, to: 1100, delay: 0, length: 0.035, wave: "triangle" }], 0.02, "tap"),
  /* your message went out */
  sent: ui([{ hz: 520, to: 1180, delay: 0, length: 0.13 }], 0.04, "sent"),
  /* a reaction added */
  pop: ui([{ hz: 900, to: 1500, delay: 0, length: 0.06 }], 0.035, "pop"),
  /* a task or milestone checked, and unchecked */
  check: ui(
    [
      { hz: 880, delay: 0, length: 0.07 },
      { hz: 1320, delay: 0.06, length: 0.11 },
    ],
    0.035,
    "check",
  ),
  uncheck: ui([{ hz: 900, to: 600, delay: 0, length: 0.08 }], 0.03, "uncheck"),
  /* saved, sent, done */
  success: ui(
    [
      { hz: 784, delay: 0, length: 0.08 },
      { hz: 1046, delay: 0.07, length: 0.14 },
    ],
    0.03,
    "success",
  ),
  /* something went wrong */
  error: ui(
    [
      { hz: 240, to: 200, delay: 0, length: 0.12, wave: "triangle" },
      { hz: 200, to: 160, delay: 0.13, length: 0.16, wave: "triangle" },
    ],
    0.045,
    "error",
  ),
  /* a fuse burned out: deleted or archived */
  remove: ui([{ hz: 220, to: 90, delay: 0, length: 0.18 }], 0.06, "remove"),
  /* undo inside the fuse window */
  undo: ui([{ hz: 560, to: 980, delay: 0, length: 0.1 }], 0.035, "undo"),
  /* a hold-to-confirm completed */
  confirm: ui(
    [
      { hz: 523, delay: 0, length: 0.2 },
      { hz: 784, delay: 0, length: 0.2 },
      { hz: 1046, delay: 0.05, length: 0.18 },
    ],
    0.025,
    "confirm",
  ),
  /* a row swiped away */
  swipe: ui([{ hz: 1400, to: 420, delay: 0, length: 0.16 }], 0.03, "swipe"),
  /* a switch turned off */
  off: ui([{ hz: 760, to: 480, delay: 0, length: 0.09 }], 0.03, "off"),
};

export const chime = {
  /* a new message from someone else */
  message: () => play([{ hz: 659, delay: 0, length: 0.13 }], 0.05, "message"),
  /* something waiting for this person */
  notification: () =>
    play(
      [
        { hz: 880, delay: 0, length: 0.1 },
        { hz: 1174, delay: 0.11, length: 0.18 },
      ],
      0.045,
      "notification",
    ),
};
