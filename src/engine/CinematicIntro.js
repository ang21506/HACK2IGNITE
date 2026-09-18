/**
 * CinematicIntro.js
 * Standalone 8-second cinematic intro sequence.
 * Call: new CinematicIntro(canvas, ctx, onComplete)
 * - Renders entirely on the game canvas
 * - Calls onComplete() when finished or skipped
 * - Safe to skip instantly with any key/click
 */

export class CinematicIntro {
  constructor(canvas, ctx, onComplete) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.onComplete = onComplete;

    this.startTime = null;
    this.done = false;
    this.raf = null;

    this.lines = [
      'TWO REALITIES.',
      'ONE WORLD.',
      '',
      'YOU CANNOT SEE WHAT YOUR PARTNER SEES.',
      'YOU CANNOT SURVIVE WITHOUT TALKING.',
    ];
    this.typeDelay = 38;

    this._rain = Array.from({ length: 70 }, () => ({
      x: Math.random() * 1400,
      y: Math.random() * 900,
      spd: 300 + Math.random() * 200,
      len: 10 + Math.random() * 16,
      op: 0.06 + Math.random() * 0.18
    }));

    this._bindSkip = this._skip.bind(this);
    window.addEventListener('keydown', this._bindSkip);
    window.addEventListener('mousedown', this._bindSkip);
    window.addEventListener('touchstart', this._bindSkip);

    this._loop = this._loop.bind(this);
    this.raf = requestAnimationFrame(this._loop);
  }

  _skip() {
    if (!this.done) this._finish();
  }

  _finish() {
    this.done = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this._bindSkip);
    window.removeEventListener('mousedown', this._bindSkip);
    window.removeEventListener('touchstart', this._bindSkip);
    this.onComplete();
  }

  _loop(timestamp) {
    if (this.done) return;
    if (!this.startTime) this.startTime = timestamp;
    const elapsed = timestamp - this.startTime;
    const t = elapsed / 1000;

    const W = this.canvas.width;
    const H = this.canvas.height;
    const ctx = this.ctx;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    const dt = 0.016;
    ctx.lineWidth = 0.8;
    for (const p of this._rain) {
      p.y += p.spd * dt;
      p.x -= p.spd * 0.18 * dt;
      if (p.y > H + p.len) { p.y = -p.len; p.x = Math.random() * (W + 60); }
      ctx.strokeStyle = `rgba(150,200,255,${p.op})`;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.len * 0.18, p.y + p.len); ctx.stroke();
    }

    const fadeIn = t < 1.2 ? 1 - t / 1.2 : 0;
    if (fadeIn > 0) { ctx.fillStyle = `rgba(0,0,0,${fadeIn})`; ctx.fillRect(0, 0, W, H); }

    if (t >= 0.8) {
      const logoAlpha = Math.min(1, (t - 0.8) / 0.8);
      ctx.save();
      ctx.globalAlpha = logoAlpha;
      ctx.font = `900 ${Math.round(W * 0.055)}px 'Press Start 2P', monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowBlur = 28;
      ctx.shadowColor = '#36d1dc'; ctx.fillStyle = '#36d1dc';
      ctx.fillText('SPLIT', W / 2 - W * 0.13, H / 2 - 24);
      ctx.shadowColor = '#ff512f'; ctx.fillStyle = '#ff512f';
      ctx.fillText('REALITY', W / 2 + W * 0.13, H / 2 - 24);
      ctx.shadowBlur = 0; ctx.restore();
    }

    if (t >= 2.4) {
      const elType = timestamp - (this.startTime + 2400);
      let remaining = Math.max(0, Math.floor(elType / this.typeDelay));
      const displayLines = [];
      for (const line of this.lines) {
        if (remaining <= 0) break;
        if (!line.length) { displayLines.push(''); continue; }
        const take = Math.min(line.length, remaining);
        displayLines.push(line.slice(0, take));
        remaining -= take;
      }

      ctx.save();
      ctx.globalAlpha = Math.min(1, (t - 2.4) / 0.4);
      ctx.font = `600 ${Math.round(W * 0.017)}px 'Outfit', sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      const lineH = Math.round(W * 0.027);
      const startY = H / 2 + 32;
      for (let i = 0; i < displayLines.length; i++) {
        const line = displayLines[i]; if (!line) continue;
        ctx.fillStyle = line.includes('CANNOT') ? '#8a9bb8' : '#f0f4fc';
        ctx.fillText(line, W / 2, startY + i * lineH);
      }
      ctx.restore();
    }

    if (t >= 7.0) {
      const pulse = 0.5 + 0.5 * Math.sin(timestamp / 380);
      ctx.save();
      ctx.globalAlpha = Math.min(1, (t - 7.0) / 0.5) * pulse;
      ctx.font = `700 ${Math.round(W * 0.016)}px 'Outfit', sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffb703';
      ctx.fillText('[ PRESS ANY KEY TO CONTINUE ]', W / 2, H * 0.86);
      ctx.restore();
    }

    if (t >= 9.0) { this._finish(); return; }
    this.raf = requestAnimationFrame(this._loop);
  }
}
