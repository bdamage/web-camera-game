type Tone = "catch" | "miss";

export class SoundEngine {
  private ctx: AudioContext | null = null;

  private ensureContext() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }

    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }

    return this.ctx;
  }

  public play(tone: Tone) {
    const ctx = this.ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    const frequency = tone === "catch" ? 780 : 180;
    const end = tone === "catch" ? now + 0.08 : now + 0.12;

    osc.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.start(now);
    osc.stop(end);
  }
}
