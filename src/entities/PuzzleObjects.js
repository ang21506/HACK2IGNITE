import { RealityMatrix, REALITY } from '../engine/RealityMatrix.js';
import { audioManager } from '../engine/AudioManager.js';

// Base Platform Object
export class Platform {
  constructor(x, y, w, h, reality = REALITY.BOTH, label = '') {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.reality = reality;
    this.label = label;
  }

  draw(ctx, viewportOffset, viewerRole, colorblindMode = false) {
    if (!RealityMatrix.isVisibleToPlayer(this.reality, viewerRole, colorblindMode)) return;

    const drawX = this.x - viewportOffset.x;
    const drawY = this.y - viewportOffset.y;
    const style = RealityMatrix.getStyle(this.reality, colorblindMode);
    const isSolid = RealityMatrix.isSolidToPlayer(this.reality, viewerRole);

    ctx.save();
    ctx.globalAlpha = isSolid ? 1.0 : 0.25; // Ghost outline if not solid to viewer

    // Platform Body
    ctx.fillStyle = style.primaryColor;
    ctx.beginPath();
    ctx.roundRect(drawX, drawY, this.w, this.h, 6);
    ctx.fill();

    // Outline & Border
    ctx.lineWidth = 3;
    ctx.strokeStyle = style.borderColor;
    ctx.stroke();

    // Pattern Hatching for Colorblind Clarity
    if (this.reality !== REALITY.BOTH) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let px = drawX + 8; px < drawX + this.w; px += 16) {
        ctx.moveTo(px, drawY);
        ctx.lineTo(px - 8, drawY + this.h);
      }
      ctx.stroke();
    }

    // Symbol / Label — enlarged in colorblind mode for shape-only recognition
    if (colorblindMode) {
      // Large bold label (A / B / ★) dominates the platform tile
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `bold ${Math.min(this.h - 4, 20)}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(style.label, drawX + this.w / 2, drawY + this.h / 2);
    } else {
      // Default: small symbol icon badge
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(style.symbol, drawX + this.w / 2, drawY + this.h / 2);
    }

    ctx.restore();
  }
}

// Moving Platform Object
export class MovingPlatform extends Platform {
  constructor(x, y, w, h, reality, waypoints, speed = 80) {
    super(x, y, w, h, reality);
    this.isMoving = true;
    this.waypoints = waypoints; // Array of {x, y}
    this.speed = speed;
    this.currentWaypointIndex = 0;
    this.vx = 0;
    this.vy = 0;
  }

  update(dt) {
    if (!this.waypoints || this.waypoints.length === 0) return;

    const target = this.waypoints[this.currentWaypointIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 4) {
      this.x = target.x;
      this.y = target.y;
      this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
    } else {
      this.vx = (dx / dist) * this.speed;
      this.vy = (dy / dist) * this.speed;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }
  }
}

// Switch / Button Object
export class Switch {
  constructor(id, x, y, reality = REALITY.BOTH, isTimed = false, timerDuration = 4.0) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.w = 36;
    this.h = 16;
    this.reality = reality;
    this.isTimed = isTimed;
    this.timerDuration = timerDuration;
    this.timer = 0;
    this.active = false;
  }

  update(dt, players, boxes) {
    const triggerRect = { x: this.x, y: this.y - 4, w: this.w, h: this.h + 4 };
    let currentlyPressed = false;

    // Check player pressing switch
    for (const p of players) {
      if (!RealityMatrix.isSolidToPlayer(this.reality, p.role)) continue;
      if (p.x < triggerRect.x + triggerRect.w && p.x + p.w > triggerRect.x &&
          p.y < triggerRect.y + triggerRect.h && p.y + p.h > triggerRect.y) {
        currentlyPressed = true;
        break;
      }
    }

    // Check box pressing switch
    if (!currentlyPressed) {
      for (const b of boxes) {
        if (b.reality !== this.reality && b.reality !== REALITY.BOTH && this.reality !== REALITY.BOTH) continue;
        if (b.x < triggerRect.x + triggerRect.w && b.x + b.w > triggerRect.x &&
            b.y < triggerRect.y + triggerRect.h && b.y + b.h > triggerRect.y) {
          currentlyPressed = true;
          break;
        }
      }
    }

    if (this.isTimed) {
      if (currentlyPressed) {
        if (!this.active) {
          this.active = true;
          audioManager.playSfx('switch');
        }
        this.timer = this.timerDuration;
      } else if (this.active) {
        this.timer -= dt;
        if (Math.floor(this.timer * 4) !== Math.floor((this.timer + dt) * 4)) {
          audioManager.playSfx('tick');
        }
        if (this.timer <= 0) {
          this.active = false;
          this.timer = 0;
        }
      }
    } else {
      if (currentlyPressed !== this.active) {
        this.active = currentlyPressed;
        audioManager.playSfx('switch');
      }
    }
  }

  draw(ctx, viewportOffset, viewerRole, colorblindMode = false) {
    if (!RealityMatrix.isVisibleToPlayer(this.reality, viewerRole, true)) return;

    const drawX = this.x - viewportOffset.x;
    const drawY = this.y - viewportOffset.y;
    const style = RealityMatrix.getStyle(this.reality, colorblindMode);

    // Switch Base
    ctx.fillStyle = '#334155';
    ctx.fillRect(drawX, drawY + 8, this.w, 8);

    // Pressable Button Top
    const btnHeight = this.active ? 4 : 10;
    const btnY = drawY + 16 - btnHeight - 4;
    ctx.fillStyle = this.active ? '#22c55e' : style.primaryColor;
    ctx.beginPath();
    ctx.roundRect(drawX + 4, btnY, this.w - 8, btnHeight, 3);
    ctx.fill();

    // Colorblind mode: show reality label on the button
    if (colorblindMode) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(style.label, drawX + this.w / 2, btnY + btnHeight / 2);
    }

    // Timed indicator
    if (this.isTimed && this.active) {
      ctx.fillStyle = '#eab308';
      ctx.font = 'bold 10px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.ceil(this.timer)}s`, drawX + this.w / 2, drawY - 6);
    }
  }
}

// Door Object
export class Door {
  constructor(id, x, y, w = 24, h = 96, reality = REALITY.BOTH, requiredSwitchIds = []) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.reality = reality;
    this.isDoor = true;
    this.requiredSwitchIds = requiredSwitchIds;
    this.solid = true;
    this.openProgress = 0; // 0 = closed, 1 = fully open
  }

  update(dt, switches) {
    // Check if all required switches are active
    let allActive = this.requiredSwitchIds.length > 0;
    for (const sId of this.requiredSwitchIds) {
      const sw = switches.find(s => s.id === sId);
      if (!sw || !sw.active) {
        allActive = false;
        break;
      }
    }

    if (allActive) {
      if (this.solid) {
        audioManager.playSfx('door');
      }
      this.solid = false;
      this.openProgress = Math.min(1.0, this.openProgress + 3.0 * dt);
    } else {
      this.solid = true;
      this.openProgress = Math.max(0.0, this.openProgress - 3.0 * dt);
    }
  }

  draw(ctx, viewportOffset, viewerRole, colorblindMode = false) {
    if (!RealityMatrix.isVisibleToPlayer(this.reality, viewerRole, true)) return;

    const drawX = this.x - viewportOffset.x;
    const drawY = this.y - viewportOffset.y;
    const style = RealityMatrix.getStyle(this.reality, colorblindMode);

    // Door Frame
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.strokeRect(drawX - 2, drawY - 2, this.w + 4, this.h + 4);

    // Sliding Door Panel
    const currentH = this.h * (1 - this.openProgress);
    if (currentH > 2) {
      ctx.fillStyle = style.primaryColor;
      ctx.fillRect(drawX, drawY, this.w, currentH);

      // Lock Symbol (Vector Canvas primitives)
      if (this.openProgress === 0) {
        const lockX = drawX + this.w / 2;
        const lockY = drawY + this.h / 2;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(lockX - 5, lockY - 2, 10, 8);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(lockX, lockY - 3, 4, Math.PI, 0);
        ctx.stroke();
        // Colorblind: add reality label below the lock icon
        if (colorblindMode) {
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.font = 'bold 11px Outfit, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(style.label, lockX, lockY + 14);
        }
      }
    }
  }
}

// Pushable Box Object
export class PushableBox {
  constructor(id, x, y, w = 38, h = 38, reality = REALITY.BOTH) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.reality = reality;
    this.vx = 0;
    this.vy = 0;
    this.isBox = true;
  }

  draw(ctx, viewportOffset, viewerRole, colorblindMode = false) {
    if (!RealityMatrix.isVisibleToPlayer(this.reality, viewerRole, true)) return;

    const drawX = this.x - viewportOffset.x;
    const drawY = this.y - viewportOffset.y;
    const style = RealityMatrix.getStyle(this.reality, colorblindMode);

    ctx.fillStyle = style.primaryColor;
    ctx.beginPath();
    ctx.roundRect(drawX, drawY, this.w, this.h, 6);
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Box Cross Pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.moveTo(drawX + 6, drawY + 6);
    ctx.lineTo(drawX + this.w - 6, drawY + this.h - 6);
    ctx.moveTo(drawX + this.w - 6, drawY + 6);
    ctx.lineTo(drawX + 6, drawY + this.h - 6);
    ctx.stroke();

    // Colorblind mode: reality label on the box face
    if (colorblindMode) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `bold 14px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(style.label, drawX + this.w / 2, drawY + this.h / 2);
    }
  }
}

// Checkpoint Object
export class Checkpoint {
  constructor(id, x, y) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.w = 40;
    this.h = 60;
    this.activated = false;
    this.reality = REALITY.BOTH;
  }

  checkActivation(p1, p2) {
    if (this.activated) return false;
    const rect = { x: this.x, y: this.y, w: this.w, h: this.h };
    if ((p1.x < rect.x + rect.w && p1.x + p1.w > rect.x && p1.y < rect.y + rect.h && p1.y + p1.h > rect.y) ||
        (p2.x < rect.x + rect.w && p2.x + p2.w > rect.x && p2.y < rect.y + rect.h && p2.y + p2.h > rect.y)) {
      this.activated = true;
      audioManager.playSfx('checkpoint');
      return true;
    }
    return false;
  }

  draw(ctx, viewportOffset) {
    const drawX = this.x - viewportOffset.x;
    const drawY = this.y - viewportOffset.y;

    // Pole
    ctx.fillStyle = '#64748b';
    ctx.fillRect(drawX + 6, drawY, 6, this.h);

    // Flag Banner
    ctx.fillStyle = this.activated ? '#22c55e' : '#ef4444';
    ctx.beginPath();
    ctx.moveTo(drawX + 12, drawY + 4);
    ctx.lineTo(drawX + 36, drawY + 16);
    ctx.lineTo(drawX + 12, drawY + 28);
    ctx.closePath();
    ctx.fill();

    if (this.activated) {
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }
}

// Level Exit Portal Object
export class LevelExit {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 64;
    this.h = 80;
    this.reality = REALITY.BOTH;
    this.p1Inside = false;
    this.p2Inside = false;
    this.rot = 0;
  }

  update(dt, p1, p2) {
    this.rot += dt * 2;
    const rect = { x: this.x, y: this.y, w: this.w, h: this.h };
    this.p1Inside = (p1.x < rect.x + rect.w && p1.x + p1.w > rect.x && p1.y < rect.y + rect.h && p1.y + p1.h > rect.y);
    this.p2Inside = (p2.x < rect.x + rect.w && p2.x + p2.w > rect.x && p2.y < rect.y + rect.h && p2.y + p2.h > rect.y);

    return this.p1Inside && this.p2Inside; // Returns true when both players enter portal!
  }

  draw(ctx, viewportOffset) {
    const drawX = this.x - viewportOffset.x + this.w / 2;
    const drawY = this.y - viewportOffset.y + this.h / 2;

    ctx.save();
    ctx.translate(drawX, drawY);

    // Golden Swirling Exit Portal
    const bothReady = this.p1Inside && this.p2Inside;
    ctx.fillStyle = bothReady ? '#22c55e' : '#eab308';
    ctx.shadowColor = bothReady ? '#22c55e' : '#eab308';
    ctx.shadowBlur = 20;

    // Render Portal Energy Orbiters
    for (let i = 0; i < 6; i++) {
      const angle = this.rot * 1.5 + (i * Math.PI / 3);
      const px = Math.cos(angle) * 36;
      const py = Math.sin(angle) * 44;
      ctx.fillStyle = bothReady ? '#4ade80' : '#fde047';
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    ctx.shadowBlur = 0;

    // Status Label
    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    const text = bothReady ? 'ENTERED!' : (this.p1Inside ? 'WAITING P2...' : (this.p2Inside ? 'WAITING P1...' : 'EXIT PORTAL'));
    ctx.fillText(text, drawX, drawY - 50);
  }
}
