export const playTing = () => {
  if (typeof window === "undefined") return;
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const context = new AudioContext();
  const osc = context.createOscillator();
  const gain = context.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(880, context.currentTime);
  gain.gain.setValueAtTime(0.18, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.35);

  osc.connect(gain);
  gain.connect(context.destination);
  osc.start();
  osc.stop(context.currentTime + 0.4);

  setTimeout(() => {
    context.close().catch(() => undefined);
  }, 600);
};
