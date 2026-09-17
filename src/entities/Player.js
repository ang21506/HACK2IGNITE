import { audioManager } from '../engine/AudioManager.js';

// Cache transparent sprites once loaded
const spriteCache = {
  p1: null,
  p2: null
};

// Load Player 1 Image (Brown hair guy with maroon shirt)
const p1Img = new Image();
p1Img.src = '/assets/player1.png';
p1Img.onload = () => {
  spriteCache.p1 = processTransparentSprite(p1Img);
};

// Load Player 2 Image (Bald guy with white shirt)
const p2Img = new Image();
p2Img.src = '/assets/player2.png';
p2Img.onload = () => {
  spriteCache.p2 = processTransparentSprite(p2Img);
};

function processTransparentSprite(img) {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, c.width, c.height);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    // Remove white or near-white background pixels
    if (d[i] > 235 && d[i + 1] > 235 && d[i + 2] > 235) {
      d[i + 3] = 0;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return c;
}

export class Player {
  constructor(role, x, y) {
    this.role = role; // 'p1' (Reality A) or 'p2' (Reality B)
    this.x = x;
    this.y = y;
    this.w = 36;
    this.h = 46;

    this.vx = 0;
    this.vy = 0;
    this.speed = 240;
    this.jumpForce = -520;
    this.grounded = false;

    this.facing = 1; // 1 = right, -1 = left
    this.squishX = 1;
    this.squishY = 1;

    this.chatMessage = '';
    this.chatTimer = 0;

    // Dust particles
    this.particles = [];
  }

  update(dt, inputState) {
    // Horizontal Movement
    let dir = 0;
    if (inputState.left) dir -= 1;
    if (inputState.right) dir += 1;

    this.vx = dir * this.speed;

    if (dir !== 0) {
      this.facing = dir;
      // Add running dust occasionally
      if (this.grounded && Math.random() < 0.25) {
        this.addDust(this.x + this.w / 2, this.y + this.h, (Math.random() - 0.5) * 20, -10);
      }
    }

    // Jump
    if (inputState.jump && this.grounded) {
      this.vy = this.jumpForce;
      this.grounded = false;
      this.squishX = 0.7;
      this.squishY = 1.3;
      audioManager.playSfx('jump');
      this.addDust(this.x + this.w / 2, this.y + this.h, 0, -15, 6);
    }

    // Recover squish/stretch elasticity
    this.squishX += (1 - this.squishX) * 12 * dt;
    this.squishY += (1 - this.squishY) * 12 * dt;

    // Update dust particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= 2.5 * dt;
      p.radius *= 0.95;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update chat bubble timer
    if (this.chatTimer > 0) {
      this.chatTimer -= dt;
      if (this.chatTimer <= 0) {
        this.chatMessage = '';
      }
    }
  }

  setChatMessage(msg) {
    this.chatMessage = msg;
    this.chatTimer = 4.0;
  }

  addDust(x, y, vx, vy, count = 1) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y,
        vx: vx + (Math.random() - 0.5) * 30,
        vy: vy + (Math.random() - 0.5) * 20,
        alpha: 0.8,
        radius: 3 + Math.random() * 4
      });
    }
  }

  draw(ctx, viewportOffset = { x: 0, y: 0 }) {
    const drawX = this.x - viewportOffset.x;
    const drawY = this.y - viewportOffset.y;

    // Draw dust particles
    ctx.fillStyle = this.role === 'p1' ? 'rgba(54, 209, 220, 0.4)' : 'rgba(255, 81, 47, 0.4)';
    for (const p of this.particles) {
      ctx.beginPath();
      ctx.arc(p.x - viewportOffset.x, p.y - viewportOffset.y, p.radius, 0, Math.PI * 2);
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Apply squish/stretch transform centered at character bottom
    ctx.save();
    ctx.translate(drawX + this.w / 2, drawY + this.h);
    ctx.scale(this.facing * this.squishX, this.squishY);

    const sprite = this.role === 'p1' ? spriteCache.p1 : spriteCache.p2;

    if (sprite) {
      // Pixel-art image character rendering
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sprite, -this.w / 2, -this.h, this.w, this.h);
    } else {
      // Fallback vector character while loading
      ctx.fillStyle = this.role === 'p1' ? '#36d1dc' : '#ff512f';
      ctx.fillRect(-this.w / 2, -this.h, this.w, this.h);
    }

    ctx.restore();

    // Draw Player Indicator Label (P1 / P2)
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = this.role === 'p1' ? '#00e5ff' : '#ff3366';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.fillText(this.role === 'p1' ? 'P1' : 'P2', drawX + this.w / 2, drawY - 10);
    ctx.shadowBlur = 0;

    // Draw Speech Bubble if Chat Message Active
    if (this.chatMessage) {
      this.drawSpeechBubble(ctx, drawX + this.w / 2, drawY - 30, this.chatMessage);
    }
  }

  drawSpeechBubble(ctx, cx, cy, text) {
    ctx.font = '13px Outfit, sans-serif';
    const textWidth = ctx.measureText(text).width;
    const padding = 10;
    const bw = Math.max(60, textWidth + padding * 2);
    const bh = 26;
    const bx = cx - bw / 2;
    const by = cy - bh;

    // Bubble Background
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 8);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    // Bubble Pointer
    ctx.beginPath();
    ctx.moveTo(cx - 5, by + bh);
    ctx.lineTo(cx, by + bh + 6);
    ctx.lineTo(cx + 5, by + bh);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Text
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, by + bh / 2);
  }
}
