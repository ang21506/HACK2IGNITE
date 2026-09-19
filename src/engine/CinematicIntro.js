/**
 * CinematicIntro.js
 * Standalone 10-second cinematic intro sequence.
 * - Renders entirely on the game canvas (game render loop is paused via game.introPlaying)
 * - Calls onComplete() when done or skipped
 * - Skip: any key (after 1.5s lock-out to prevent accidental skips on page load)
 */

export class CinematicIntro {
  constructor(canvas, ctx, onComplete) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.onComplete = onComplete;

    this.startTime = null;
    this.done = false;
    this.raf = null;
    this.skipAllowed = false; // locked out for first 1.5s

    this.lines = [
      'TWO REALITIES.',
      'ONE WORLD.',
      '',
      'YOU CANNOT SEE WHAT YOUR PARTNER SEES.',
      'YOU CANNOT SURVIVE WITHOUT TALKING.',
    ];
    this.typeDelay = 42;

    this._rain = Array.from({ length: 80 }, () => ({
      x: Math.random() * 1600,
      y: Math.random() * 900,
      spd: 280 + Math.random() * 220,
      len: 10 + Math.random() * 18,
      op: 0.05 + Math.random() * 0.20
    }));

    // Only keyboard skip — gated by lock-out
    this._bindSkip = () => {
      if (this.skipAllowed && !this.done) this._finish();
    };
    window.addEventListener('keydown', this._bindSkip);

    // Enable skip after 1.5 seconds (prevents accidental skips on focus)
    setTimeout(() => { this.skipAllowed = true; }, 1500);

    this._loop = this._loop.bind(this);
    this.raf = requestAnimationFrame(this._loop);
  }

  _finish() {
    if (this.done) return;
    this.done = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this._bindSkip);
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

    // Background: pure black
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // Rain
    const dt = 0.016;
    ctx.lineWidth = 0.9;
    for (const p of this._rain) {
      p.y += p.spd * dt;
      p.x -= p.spd * 0.18 * dt;
      if (p.y > H + p.len) { p.y = -p.len; p.x = Math.random() * (W + 80); }
      ctx.strokeStyle = `rgba(150,200,255,${p.op})`;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.len * 0.18, p.y + p.len);
      ctx.stroke();
    }

    // Phase 1: Fade in from black (0-1.2s)
    if (t < 1.2) {
      ctx.fillStyle = `rgba(0,0,0,${1 - t / 1.2})`;
      ctx.fillRect(0, 0, W, H);
    }

    // Phase 2: SPLIT REALITY logo — properly centered (0.8-3.5s)
    if (t >= 0.8) {
      const logoAlpha = Math.min(1, (t - 0.8) / 0.9);
      const fontSize = Math.round(Math.min(W * 0.075, H * 0.11, 96));
      ctx.save();
      ctx.globalAlpha = logoAlpha;
      ctx.font = `900 ${fontSize}px 'Press Start 2P', monospace`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';

      const logoY = H * 0.41;
      const gap = fontSize * 0.25;
      const wSplit   = ctx.measureText('SPLIT').width;
      const wReality = ctx.measureText('REALITY').width;
      const totalW   = wSplit + gap + wReality;
      const originX  = W / 2 - totalW / 2;

      // SPLIT (cyan)
      ctx.shadowBlur = 36;
      ctx.shadowColor = '#36d1dc';
      ctx.fillStyle = '#36d1dc';
      ctx.fillText('SPLIT', originX, logoY);

      // REALITY (coral)
      ctx.shadowColor = '#ff512f';
      ctx.fillStyle = '#ff512f';
      ctx.fillText('REALITY', originX + wSplit + gap, logoY);

      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Phase 3: Typewriter briefing (3.2-7.8s)
    if (t >= 3.2) {
      const elType = elapsed - 3200;
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
      ctx.globalAlpha = Math.min(1, (t - 3.2) / 0.5);
      const fontSize = Math.round(Math.min(W * 0.019, H * 0.028, 24));
      ctx.font = `500 ${fontSize}px 'Outfit', 'Inter', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const lineH = Math.round(fontSize * 2.0);
      const startY = H * 0.56;

      for (let i = 0; i < displayLines.length; i++) {
        const line = displayLines[i];
        if (!line) continue;
        ctx.fillStyle = line.includes('CANNOT') ? 'rgba(130,150,185,0.9)' : 'rgba(235,242,255,0.95)';
        ctx.fillText(line, W / 2, startY + i * lineH);
      }

      // Blinking cursor on active line
      const totalTyped = displayLines.join('').replace(/\s/g, '').length;
      const totalFull  = this.lines.join('').replace(/\s/g, '').length;
      if (totalTyped < totalFull && Math.floor(timestamp / 500) % 2 === 0) {
        const lastLine = displayLines[displayLines.length - 1] || '';
        const lineIdx  = displayLines.length - 1;
        const lx = W / 2 + ctx.measureText(lastLine).width / 2 + 8;
        const ly = startY + lineIdx * lineH;
        ctx.fillStyle = '#36d1dc';
        ctx.fillRect(lx, ly + 2, 5, fontSize);
      }
      ctx.restore();
    }

    // Phase 4: "Press any key" prompt (8.0s+)
    if (t >= 8.0) {
      const pulse = 0.5 + 0.5 * Math.sin(timestamp / 380);
      ctx.save();
      ctx.globalAlpha = Math.min(1, (t - 8.0) / 0.5) * pulse;
      const fontSize = Math.round(Math.min(W * 0.016, 18));
      ctx.font = `700 ${fontSize}px 'Outfit', 'Inter', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffb703';
      ctx.letterSpacing = '2px';
      ctx.fillText('[ PRESS ANY KEY TO CONTINUE ]', W / 2, H * 0.89);
      ctx.restore();
    }

    // Auto-advance at 11s
    if (t >= 11.0) { this._finish(); return; }

    this.raf = requestAnimationFrame(this._loop);
  }
}
