/**
 * Synthesized cozy RPG chimes using the Web Audio API (no external audio files needed).
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  ensureContext() {
    if (!this.enabled) return null;
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playTone(freq, startOffset, duration, type = 'triangle', peakGain = 0.08) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playStart() {
    this.playTone(440, 0, 0.11, 'sine', 0.06);
    this.playTone(587.33, 0.07, 0.14, 'sine', 0.06);
  }

  playPause() {
    this.playTone(493.88, 0, 0.1, 'sine', 0.05);
    this.playTone(392.0, 0.07, 0.14, 'sine', 0.05);
  }

  playXpGain() {
    this.playTone(523.25, 0, 0.13, 'triangle', 0.07);
    this.playTone(659.25, 0.07, 0.15, 'triangle', 0.07);
    this.playTone(783.99, 0.14, 0.22, 'sine', 0.06);
  }

  playQuestClaim() {
    this.playTone(587.33, 0, 0.14, 'triangle', 0.08);
    this.playTone(739.99, 0.08, 0.16, 'triangle', 0.08);
    this.playTone(880.0, 0.16, 0.28, 'sine', 0.08);
  }

  playLevelUp() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, idx * 0.09, idx === notes.length - 1 ? 0.45 : 0.18, 'triangle', 0.09);
    });
    this.playTone(1046.5, 0.36, 0.5, 'sine', 0.06);
  }

  playAchievement() {
    this.playTone(659.25, 0, 0.14, 'sine', 0.07);
    this.playTone(880.0, 0.09, 0.16, 'triangle', 0.07);
    this.playTone(1174.66, 0.18, 0.35, 'sine', 0.07);
  }

  playBossVictory() {
    const notes = [392.0, 523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, idx * 0.085, idx === notes.length - 1 ? 0.55 : 0.2, 'triangle', 0.09);
    });
    this.playTone(523.25, 0.34, 0.55, 'sine', 0.06);
  }

  playCoinSpend() {
    this.playTone(987.77, 0, 0.1, 'sine', 0.07);
    this.playTone(1318.51, 0.07, 0.2, 'triangle', 0.07);
  }

  playSprintComplete() {
    const notes = [587.33, 739.99, 880.0, 1174.66];
    notes.forEach((n, idx) => {
      this.playTone(n, idx * 0.08, idx === notes.length - 1 ? 0.45 : 0.16, 'sine', 0.085);
    });
  }

  playChestOpen(rarity = 'rare') {
    const chord =
      rarity === 'legendary'
        ? [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98]
        : rarity === 'epic'
          ? [440, 554.37, 659.25, 880, 1108.73]
          : [440, 587.33, 739.99, 880];
    chord.forEach((n, idx) => {
      this.playTone(n, idx * 0.075, idx === chord.length - 1 ? 0.52 : 0.18, 'triangle', 0.085);
    });
  }

  playThemeUnlock() {
    this.playTone(523.25, 0, 0.25, 'sine', 0.07);
    this.playTone(659.25, 0.07, 0.28, 'sine', 0.07);
    this.playTone(783.99, 0.14, 0.36, 'triangle', 0.075);
  }
}

export const sound = new SoundEngine();
