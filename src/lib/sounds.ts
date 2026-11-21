let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function blip(frequency: number, duration: number, when = 0, gain = 0.05) {
  const audio = getCtx();
  if (!audio) return;
  const osc = audio.createOscillator();
  const env = audio.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequency;
  env.gain.setValueAtTime(0, audio.currentTime + when);
  env.gain.linearRampToValueAtTime(gain, audio.currentTime + when + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + when + duration);
  osc.connect(env);
  env.connect(audio.destination);
  osc.start(audio.currentTime + when);
  osc.stop(audio.currentTime + when + duration + 0.02);
}

export const sounds = {
  micOn() {
    blip(660, 0.14, 0, 0.04);
    blip(880, 0.12, 0.09, 0.035);
  },
  micOff() {
    blip(620, 0.1, 0, 0.04);
    blip(420, 0.12, 0.08, 0.035);
  },
  assistantReply() {
    blip(523.25, 0.1, 0, 0.03);
    blip(783.99, 0.16, 0.07, 0.03);
  },
};
