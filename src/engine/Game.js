import { Player } from '../entities/Player.js';
import { LEVEL_DATA } from '../levels/LevelData.js';
import { Physics } from './Physics.js';
import { NetworkManager } from './NetworkManager.js';
import { audioManager } from './AudioManager.js';
import { RealityMatrix, REALITY } from './RealityMatrix.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.mode = 'LOCAL'; // 'LOCAL' or 'NETWORK'
    this.localViewportMode = 'SPLIT'; // 'SPLIT' or 'SINGLE'
    this.state = 'MENU'; // 'MENU', 'LOBBY', 'PLAYING', 'VICTORY', 'DISCONNECTED'
    this.colorblindMode = false; // Extra non-color shape/pattern differentiators

    this.currentLevelIndex = 0;
    this.levelData = null;

    this.player1 = new Player('p1', 100, 300);
    this.player2 = new Player('p2', 150, 300);

    this.platforms = [];
    this.switches = [];
    this.doors = [];
    this.boxes = [];
    this.checkpoints = [];
    this.exit = null;

    this.currentCheckpoint = null;
    this.respawnCount = 0;
    this.levelStartTime = 0;
    this.levelTime = 0;

    // Camera viewports
    this.camP1 = { x: 0, y: 0, w: 640, h: 720 };
    this.camP2 = { x: 0, y: 0, w: 640, h: 720 };

    // Inputs
    this.keys = {};
    this.net = new NetworkManager(this);

    this.lastTime = 0;
    this.isChatOpen = false;

    this.initInput();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  initInput() {
    window.addEventListener('keydown', (e) => {
      if (this.isChatOpen) {
        if (e.key === 'Enter') {
          this.submitChat();
        } else if (e.key === 'Escape') {
          this.toggleChat(false);
        }
        return;
      }

      this.keys[e.key] = true;

      if ((e.key === 't' || e.key === 'T') && this.state === 'PLAYING') {
        e.preventDefault();
        this.toggleChat(true);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (!this.isChatOpen) {
        this.keys[e.key] = false;
      }
    });
  }

  toggleChat(open) {
    this.isChatOpen = open;
    const chatOverlay = document.getElementById('chatOverlay');
    const chatInput = document.getElementById('chatInput');

    if (open) {
      chatOverlay?.classList.remove('hidden');
      chatInput?.focus();
      this.keys = {}; // Clear input state while chatting
    } else {
      chatOverlay?.classList.add('hidden');
      if (chatInput) chatInput.value = '';
    }
  }

  submitChat() {
    const chatInput = document.getElementById('chatInput');
    if (chatInput && chatInput.value.trim()) {
      const text = chatInput.value.trim();
      const myRole = this.mode === 'NETWORK' ? this.net.playerRole : 'p1';

      if (myRole === 'p1') this.player1.setChatMessage(text);
      else this.player2.setChatMessage(text);

      if (this.mode === 'NETWORK') {
        this.net.sendChatMessage(text);
      }
    }
    this.toggleChat(false);
  }

  onReceiveChatMessage(sender, text) {
    if (sender === 'p1') this.player1.setChatMessage(text);
    else if (sender === 'p2') this.player2.setChatMessage(text);
  }

  loadLevel(index) {
    if (index < 0 || index >= LEVEL_DATA.length) index = 0;
    this.currentLevelIndex = index;
    const data = LEVEL_DATA[index];
    this.levelData = data;

    // Reset Entities
    this.player1 = new Player('p1', data.spawnP1.x, data.spawnP1.y);
    this.player2 = new Player('p2', data.spawnP2.x, data.spawnP2.y);

    // Deep copy objects
    this.platforms = data.platforms.map(p => Object.assign(Object.create(Object.getPrototypeOf(p)), p));
    this.switches = data.switches.map(s => Object.assign(Object.create(Object.getPrototypeOf(s)), s));
    this.doors = data.doors.map(d => Object.assign(Object.create(Object.getPrototypeOf(d)), d));
    this.boxes = data.boxes.map(b => Object.assign(Object.create(Object.getPrototypeOf(b)), b));
    this.checkpoints = data.checkpoints.map(c => Object.assign(Object.create(Object.getPrototypeOf(c)), c));
    this.exit = Object.assign(Object.create(Object.getPrototypeOf(data.exit)), data.exit);

    this.currentCheckpoint = null;
    this.levelStartTime = performance.now();
    this.levelTime = 0;

    // Update HUD
    const hudTitle = document.getElementById('hudLevelTitle');
    if (hudTitle) hudTitle.textContent = data.name;

    this.showNotification(`LOADED: ${data.name}`);
    // Show the level description as a secondary toast below the banner
    if (data.description) this.showLevelDescription(data.description);
  }

  startLocalGame(levelIndex = 0) {
    this.mode = 'LOCAL';
    this.state = 'PLAYING';
    this.loadLevel(levelIndex);
    this.updateUIVisibility();
    audioManager.startBgm();
  }

  startNetworkGame(levelIndex = 0) {
    this.mode = 'NETWORK';
    this.state = 'PLAYING';
    this.loadLevel(levelIndex);
    this.updateUIVisibility();
    audioManager.startBgm();
  }

  updateUIVisibility() {
    document.querySelectorAll('.ui-panel').forEach(p => p.classList.remove('active'));
    const hudLayer = document.getElementById('hudLayer');

    if (this.state === 'PLAYING') {
      hudLayer?.classList.remove('hidden');
    } else {
      hudLayer?.classList.add('hidden');
    }
  }

  showNotification(text) {
    const banner = document.getElementById('hudNotification');
    const bannerText = document.getElementById('notificationText');
    if (banner && bannerText) {
      bannerText.textContent = text;
      banner.classList.remove('hidden');
      setTimeout(() => banner.classList.add('hidden'), 2500);
    }
  }

  showLevelDescription(text) {
    const toast = document.getElementById('hudDescToast');
    if (!toast) return;
    // Show description after the level-name banner hides (2.5s + tiny gap)
    setTimeout(() => {
      toast.textContent = text;
      toast.classList.remove('hidden');
      // Auto-hide after 4 seconds
      setTimeout(() => toast.classList.add('hidden'), 4000);
    }, 2700);
  }

  respawnAtCheckpoint() {
    audioManager.playSfx('respawn');
    this.respawnCount++;

    const spawn1 = this.currentCheckpoint ? { x: this.currentCheckpoint.x, y: this.currentCheckpoint.y } : this.levelData.spawnP1;
    const spawn2 = this.currentCheckpoint ? { x: this.currentCheckpoint.x + 20, y: this.currentCheckpoint.y } : this.levelData.spawnP2;

    this.player1.x = spawn1.x;
    this.player1.y = spawn1.y;
    this.player1.vx = 0;
    this.player1.vy = 0;

    this.player2.x = spawn2.x;
    this.player2.y = spawn2.y;
    this.player2.vx = 0;
    this.player2.vy = 0;

    this.showNotification('RESPAWNING AT CHECKPOINT');
  }

  update(dt) {
    this.lastDt = dt; // stored so render() can use it for particle animation
    if (this.state !== 'PLAYING') return;

    this.levelTime = (performance.now() - this.levelStartTime) / 1000;

    // Collect Input States
    const p1Input = {
      left: this.keys['a'] || this.keys['A'],
      right: this.keys['d'] || this.keys['D'],
      jump: this.keys['w'] || this.keys['W'] || this.keys[' '],
      interact: this.keys['e'] || this.keys['E']
    };

    const p2Input = {
      left: this.keys['ArrowLeft'],
      right: this.keys['ArrowRight'],
      jump: this.keys['ArrowUp'],
      interact: this.keys['Shift'] || this.keys['Enter']
    };

    // Apply Player Logic based on Game Mode
    if (this.mode === 'LOCAL') {
      this.player1.update(dt, p1Input);
      this.player2.update(dt, p2Input);
    } else {
      // Network Mode: Local player updates via local keys, remote player updates via network packets
      if (this.net.playerRole === 'p1') {
        this.player1.update(dt, p1Input);
        this.net.sendPlayerUpdate({
          x: this.player1.x,
          y: this.player1.y,
          vx: this.player1.vx,
          vy: this.player1.vy,
          facing: this.player1.facing,
          grounded: this.player1.grounded
        });
      } else {
        this.player2.update(dt, p2Input);
        this.net.sendPlayerUpdate({
          x: this.player2.x,
          y: this.player2.y,
          vx: this.player2.vx,
          vy: this.player2.vy,
          facing: this.player2.facing,
          grounded: this.player2.grounded
        });
      }
    }

    // Physics Resolution
    Physics.resolvePlayerTileCollisions(this.player1, this.platforms, dt);
    Physics.resolvePlayerTileCollisions(this.player2, this.platforms, dt);

    Physics.resolveBoxCollisions(this.player1, this.boxes, dt);
    Physics.resolveBoxCollisions(this.player2, this.boxes, dt);

    Physics.checkPlayerCoopStacking(this.player1, this.player2, dt);

    // Update Moving Platforms & Boxes
    for (const plat of this.platforms) {
      if (plat.isMoving) plat.update(dt);
    }

    for (const box of this.boxes) {
      Physics.updateBoxPhysics(box, this.platforms, this.boxes, dt);
    }

    // Update Switches & Doors
    const allPlayers = [this.player1, this.player2];
    for (const sw of this.switches) {
      sw.update(dt, allPlayers, this.boxes);
    }

    for (const door of this.doors) {
      door.update(dt, this.switches);
    }

    // Update Checkpoints
    for (const cp of this.checkpoints) {
      if (cp.checkActivation(this.player1, this.player2)) {
        this.currentCheckpoint = cp;
        this.showNotification('CHECKPOINT REACHED!');
        if (this.mode === 'NETWORK' && this.net.isHost) {
          this.net.sendObjectUpdate(cp.id, { activated: true });
        }
      }
    }

    // Check Fall Death
    if (this.player1.y > 600 || this.player2.y > 600) {
      if (this.mode === 'NETWORK') {
        this.net.sendRespawn();
      } else {
        this.respawnAtCheckpoint();
      }
    }

    // Check Level Exit Completion
    if (this.exit && this.exit.update(dt, this.player1, this.player2)) {
      this.onLevelComplete();
    }

    // Smooth Camera Follow
    this.updateCameras();
  }

  updateCameras() {
    const W = this.canvas.width;
    const H = this.canvas.height;

    if (this.mode === 'LOCAL' && this.localViewportMode === 'SPLIT') {
      const vWidth = W / 2;
      this.camP1.x += (this.player1.x - vWidth / 2 - this.camP1.x) * 0.1;
      this.camP1.y += (this.player1.y - H / 2 - this.camP1.y) * 0.1;

      this.camP2.x += (this.player2.x - vWidth / 2 - this.camP2.x) * 0.1;
      this.camP2.y += (this.player2.y - H / 2 - this.camP2.y) * 0.1;
    } else {
      // Single Viewport tracking midpoint between both players
      const targetX = (this.player1.x + this.player2.x) / 2 - W / 2;
      const targetY = (this.player1.y + this.player2.y) / 2 - H / 2;
      this.camP1.x += (targetX - this.camP1.x) * 0.1;
      this.camP1.y += (targetY - this.camP1.y) * 0.1;
    }
  }

  onLevelComplete() {
    audioManager.playSfx('win');
    this.state = 'VICTORY';
    this.updateUIVisibility();

    // Invalidate parallax cache so next level gets fresh atmosphere
    delete this._vpCity_p1;
    delete this._vpCity_p2;
    delete this._gameRain_p1;
    delete this._gameRain_p2;

    const victoryPanel  = document.getElementById('victoryScreen');
    const statTime      = document.getElementById('statTime');
    const statRespawns  = document.getElementById('statRespawns');
    const statTeamwork  = document.getElementById('statTeamwork');

    if (victoryPanel) victoryPanel.classList.add('active');

    const mins = Math.floor(this.levelTime / 60).toString().padStart(2, '0');
    const secs = Math.floor(this.levelTime % 60).toString().padStart(2, '0');
    if (statTime) statTime.textContent = `${mins}:${secs}`;
    if (statRespawns) statRespawns.textContent = this.respawnCount.toString();

    // Teamwork rank: S = 0 respawns, A = 1-2, B = 3-4, C = 5+
    if (statTeamwork) {
      const rank = this.respawnCount === 0 ? 'S'
                 : this.respawnCount <= 2  ? 'A'
                 : this.respawnCount <= 4  ? 'B' : 'C';
      statTeamwork.textContent = rank;
      statTeamwork.style.color = rank === 'S' ? '#ffb703'
                               : rank === 'A' ? '#36d1dc'
                               : rank === 'B' ? '#a855f7' : '#ff512f';
    }
  }

  nextLevel() {
    document.getElementById('victoryScreen')?.classList.remove('active');
    this.loadLevel(this.currentLevelIndex + 1);
    this.state = 'PLAYING';
    this.updateUIVisibility();
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.state !== 'PLAYING' && this.state !== 'VICTORY') {
      // Render animated background in menu
      this.renderMenuBackground();
      return;
    }

    const W = this.canvas.width;
    const H = this.canvas.height;

    if (this.mode === 'LOCAL' && this.localViewportMode === 'SPLIT') {
      // DUAL VIEWPORT SPLIT SCREEN
      const halfW = W / 2;

      // --- LEFT VIEWPORT: PLAYER 1 (REALITY A) ---
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(0, 0, halfW, H);
      this.ctx.clip();
      this.renderViewport(0, 0, halfW, H, this.camP1, 'p1');
      this.ctx.restore();

      // --- RIGHT VIEWPORT: PLAYER 2 (REALITY B) ---
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(halfW, 0, halfW, H);
      this.ctx.clip();
      this.renderViewport(halfW, 0, halfW, H, this.camP2, 'p2');
      this.ctx.restore();

      // Center Divider Line
      this.ctx.lineWidth = 4;
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      this.ctx.beginPath();
      this.ctx.moveTo(halfW, 0);
      this.ctx.lineTo(halfW, H);
      this.ctx.stroke();

    } else {
      // SINGLE VIEWPORT (Networked or Single Screen Local)
      const role = this.mode === 'NETWORK' ? this.net.playerRole : 'p1';
      this.renderViewport(0, 0, W, H, this.camP1, role);
    }
  }

  renderViewport(vx, vy, vw, vh, camera, viewerRole) {
    this.ctx.save();
    this.ctx.translate(vx, vy);

    // ── Base sky fill ──
    const skyBase = viewerRole === 'p1' ? '#070e18' : '#150508';
    this.ctx.fillStyle = skyBase;
    this.ctx.fillRect(0, 0, vw, vh);

    // ── Parallax city background layers ──
    this._drawViewportParallax(vw, vh, camera, viewerRole);

    // ── Reality tint overlay (preserves bg_texture if loaded) ──
    if (!this.bgImg) {
      this.bgImg = new Image();
      this.bgImg.src = '/assets/bg_texture.png';
    }
    if (this.bgImg.complete && this.bgImg.naturalWidth !== 0) {
      if (!this.bgPattern) {
        this.bgPattern = this.ctx.createPattern(this.bgImg, 'repeat');
      }
      this.ctx.globalAlpha = 0.08; // very subtle texture overlay
      this.ctx.fillStyle = this.bgPattern || 'transparent';
      this.ctx.fillRect(0, 0, vw, vh);
      this.ctx.globalAlpha = 1;
    }
    // Reality colour tint
    this.ctx.fillStyle = viewerRole === 'p1'
      ? 'rgba(9,30,42,0.28)'
      : 'rgba(42,9,20,0.28)';
    this.ctx.fillRect(0, 0, vw, vh);

    // ── Grid pattern overlay ──
    this.ctx.strokeStyle = viewerRole === 'p1' ? 'rgba(54,209,220,0.06)' : 'rgba(255,81,47,0.06)';
    this.ctx.lineWidth = 1;
    const gridStep = 40;
    const startX = -(camera.x % gridStep);
    const startY = -(camera.y % gridStep);
    for (let x = startX; x < vw; x += gridStep) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, vh);
      this.ctx.stroke();
    }
    for (let y = startY; y < vh; y += gridStep) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(vw, y);
      this.ctx.stroke();
    }

    // ── Rain overlay (drawn above grid, below game objects) ──
    this._drawViewportRain(vw, vh, viewerRole);

    // Render Platforms
    for (const plat of this.platforms) {
      plat.draw(this.ctx, camera, viewerRole, this.colorblindMode);
    }

    // Render Switches & Doors
    for (const sw of this.switches) {
      sw.draw(this.ctx, camera, viewerRole, this.colorblindMode);
    }
    for (const door of this.doors) {
      door.draw(this.ctx, camera, viewerRole, this.colorblindMode);
    }

    // Render Boxes
    for (const box of this.boxes) {
      box.draw(this.ctx, camera, viewerRole, this.colorblindMode);
    }

    // Render Checkpoints & Exit Portal
    for (const cp of this.checkpoints) {
      cp.draw(this.ctx, camera);
    }
    if (this.exit) {
      this.exit.draw(this.ctx, camera);
    }

    // Render Players
    this.player1.draw(this.ctx, camera);
    this.player2.draw(this.ctx, camera);

    this.ctx.restore();
  }

  renderMenuBackground() {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const t = this.lastTime / 1000;
    const dt = this.lastDt || 0.016;

    // Lazy-init city data (re-init if canvas resized)
    if (!this._menuCity || this._menuCityW !== W) {
      this._menuCityW = W;
      this._menuCity = this._buildMenuCity(W, H);
      this._menuRain = this._buildRainPool(90, W, H);
    }

    // ── Sky gradient ──
    const sky = this.ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#010208');
    sky.addColorStop(0.55, '#0d0f17');
    sky.addColorStop(1, '#0f1525');
    this.ctx.fillStyle = sky;
    this.ctx.fillRect(0, 0, W, H);

    // ── Moon glow ──
    const mx = W * 0.78, my = H * 0.14;
    const moonGrad = this.ctx.createRadialGradient(mx, my, 0, mx, my, 140);
    moonGrad.addColorStop(0, 'rgba(180,210,255,0.10)');
    moonGrad.addColorStop(0.4, 'rgba(100,150,255,0.04)');
    moonGrad.addColorStop(1, 'rgba(0,0,0,0)');
    this.ctx.fillStyle = moonGrad;
    this.ctx.fillRect(0, 0, W, H);

    // ── Far buildings (silhouette layer) ──
    for (const b of this._menuCity.far) {
      this.ctx.fillStyle = '#06080f';
      this.ctx.fillRect(b.x, b.y, b.w, b.h);
      for (const win of b.windows) {
        const off = win.flicker && (Math.sin(t * win.fr + win.ph) > 0.75);
        if (win.lit && !off) {
          this.ctx.fillStyle = win.warm
            ? `rgba(255,200,120,${0.25 + win.br * 0.2})`
            : `rgba(140,185,255,${0.20 + win.br * 0.2})`;
          this.ctx.fillRect(win.x, win.y, 3, 4);
        }
      }
    }

    // ── Horizon fog band ──
    const fogY = H * 0.58;
    const fog = this.ctx.createLinearGradient(0, fogY - 30, 0, fogY + 60);
    fog.addColorStop(0, 'rgba(13,15,23,0)');
    fog.addColorStop(0.5, 'rgba(13,15,23,0.55)');
    fog.addColorStop(1, 'rgba(13,15,23,0)');
    this.ctx.fillStyle = fog;
    this.ctx.fillRect(0, fogY - 30, W, 90);

    // ── Mid buildings ──
    for (const b of this._menuCity.mid) {
      this.ctx.fillStyle = '#09090f';
      this.ctx.fillRect(b.x, b.y, b.w, b.h);
      // Rooftop antenna / light
      if (b.antenna) {
        const pulse = Math.sin(t * 1.4 + b.ph) > 0.5;
        this.ctx.fillStyle = pulse ? 'rgba(255,60,60,0.9)' : 'rgba(255,60,60,0.3)';
        this.ctx.fillRect(b.x + b.w / 2 - 1, b.y - 10, 2, 10);
        this.ctx.fillRect(b.x + b.w / 2 - 2, b.y - 2, 4, 4);
      }
      for (const win of b.windows) {
        const off = win.flicker && (Math.sin(t * win.fr + win.ph) > 0.65);
        if (win.lit && !off) {
          this.ctx.fillStyle = win.warm
            ? `rgba(255,210,130,${0.50 + win.br * 0.3})`
            : `rgba(120,175,255,${0.45 + win.br * 0.3})`;
          this.ctx.fillRect(win.x, win.y, 5, 6);
        }
      }
    }

    // ── Ground plane + wet road reflection ──
    const groundY = H - 55;
    this.ctx.fillStyle = '#070810';
    this.ctx.fillRect(0, groundY, W, H - groundY);
    // Cyan tinted puddle sheen (Reality A)
    const roadRef = this.ctx.createLinearGradient(0, groundY, 0, H);
    roadRef.addColorStop(0, 'rgba(36,180,200,0.07)');
    roadRef.addColorStop(0.6, 'rgba(36,180,200,0.03)');
    roadRef.addColorStop(1, 'rgba(0,0,0,0)');
    this.ctx.fillStyle = roadRef;
    this.ctx.fillRect(0, groundY, W, H - groundY);

    // ── Rain particles ──
    this._updateRainPool(this._menuRain, W, H, dt);
    this.ctx.save();
    this.ctx.lineWidth = 0.9;
    for (const p of this._menuRain) {
      this.ctx.strokeStyle = `rgba(170,205,255,${p.op})`;
      this.ctx.beginPath();
      this.ctx.moveTo(p.x, p.y);
      this.ctx.lineTo(p.x - p.len * 0.18, p.y + p.len);
      this.ctx.stroke();
    }
    this.ctx.restore();

    // ── Vignette ──
    const vig = this.ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.82);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.60)');
    this.ctx.fillStyle = vig;
    this.ctx.fillRect(0, 0, W, H);
  }

  // ── City generation helpers ──────────────────────────────────────────────

  _drawViewportParallax(vw, vh, camera, role) {
    // Level-based intensity (heavier silhouettes as levels progress)
    const lvl = this.currentLevelIndex || 0;
    const intensity = 0.55 + lvl * 0.09;

    const isA = role === 'p1';
    const farCol  = isA ? `rgba(8,16,28,${intensity * 0.7})`  : `rgba(20,6,12,${intensity * 0.7})`;
    const midCol  = isA ? `rgba(10,20,34,${intensity})`        : `rgba(24,8,15,${intensity})`;
    const fogCol  = isA ? 'rgba(7,14,23,0.45)'                 : 'rgba(18,5,10,0.45)';

    // Lazy-init per-role parallax data
    const key = `_vpCity_${role}`;
    if (!this[key] || this[`${key}_vw`] !== vw) {
      this[`${key}_vw`] = vw;
      let s = role === 'p1' ? 7919 : 6271;
      const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
      const far = [], mid = [];
      // Far layer — thin distant skyscrapers
      for (let i = 0; i < 14; i++) {
        const bw = 20 + rng() * 50;
        const bh = vh * 0.15 + rng() * vh * 0.30;
        far.push({ x: (vw / 14) * i + rng() * 20, y: vh - bh, w: bw, h: bh });
      }
      // Mid layer — closer, taller, with rooftop details
      for (let i = 0; i < 8; i++) {
        const bw = 35 + rng() * 80;
        const bh = vh * 0.18 + rng() * vh * 0.22;
        mid.push({ x: (vw / 8) * i - 10 + rng() * 20, y: vh - bh, w: bw, h: bh, ant: rng() > 0.5 });
      }
      this[key] = { far, mid };
    }
    const city = this[key];

    // Far parallax (0.08x camera scroll)
    const offFar = -(camera.x * 0.08) % vw;
    this.ctx.fillStyle = farCol;
    for (const b of city.far) {
      this.ctx.fillRect(b.x + offFar, b.y, b.w, b.h);
      this.ctx.fillRect(b.x + offFar + vw, b.y, b.w, b.h); // wrap
    }

    // Fog
    const fogGrad = this.ctx.createLinearGradient(0, vh * 0.55, 0, vh * 0.75);
    fogGrad.addColorStop(0, 'rgba(0,0,0,0)');
    fogGrad.addColorStop(0.5, fogCol);
    fogGrad.addColorStop(1, 'rgba(0,0,0,0)');
    this.ctx.fillStyle = fogGrad;
    this.ctx.fillRect(0, vh * 0.55, vw, vh * 0.2);

    // Mid parallax (0.25x camera scroll)
    const offMid = -(camera.x * 0.25) % vw;
    this.ctx.fillStyle = midCol;
    const t = this.lastTime / 1000;
    for (const b of city.mid) {
      this.ctx.fillRect(b.x + offMid, b.y, b.w, b.h);
      this.ctx.fillRect(b.x + offMid + vw, b.y, b.w, b.h);
      if (b.ant) {
        const pulse = Math.sin(t * 1.2 + b.x) > 0.5;
        this.ctx.fillStyle = pulse ? 'rgba(255,50,50,0.85)' : 'rgba(255,50,50,0.2)';
        const bxr = b.x + offMid + b.w / 2;
        this.ctx.fillRect(bxr - 1, b.y - 8, 2, 8);
        this.ctx.fillRect(bxr - 2, b.y - 1, 4, 3);
        this.ctx.fillStyle = midCol;
      }
    }
  }

  _drawViewportRain(vw, vh, role) {
    // Per-role rain pool — lighter during early levels
    const lvl = this.currentLevelIndex || 0;
    const count = 40 + lvl * 8; // Level 1: 40 drops, Level 5: 80 drops
    const poolKey = `_gameRain_${role}`;
    if (!this[poolKey] || this[poolKey].length !== count) {
      this[poolKey] = this._buildRainPool(count, vw, vh);
    }
    this._updateRainPool(this[poolKey], vw, vh, this.lastDt || 0.016);

    this.ctx.save();
    this.ctx.lineWidth = 0.75;
    for (const p of this[poolKey]) {
      // Tint rain to match reality colour
      const r = role === 'p1' ? '150,210,255' : '255,160,140';
      this.ctx.strokeStyle = `rgba(${r},${p.op * 0.65})`;
      this.ctx.beginPath();
      this.ctx.moveTo(p.x, p.y);
      this.ctx.lineTo(p.x - p.len * 0.18, p.y + p.len);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  _buildMenuCity(W, H) {
    // Deterministic seeded RNG so city looks same every render
    let s = 1337;
    const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };

    const makeBuildings = (count, yMin, yMax, wMin, wMax, hasAntenna) => {
      const arr = [];
      const slotW = W / count;
      for (let i = 0; i < count; i++) {
        const bw = wMin + rng() * (wMax - wMin);
        const bh = yMin + rng() * (yMax - yMin);
        const bx = slotW * i + rng() * (slotW - bw);
        const by = H - 55 - bh;
        const windows = [];
        const cols = Math.max(1, Math.floor((bw - 8) / 14));
        const rows = Math.max(1, Math.floor((bh - 10) / 18));
        for (let c = 0; c < cols; c++) {
          for (let r = 0; r < rows; r++) {
            if (rng() > 0.45) {
              windows.push({
                x: bx + 5 + c * 14,
                y: by + 6 + r * 18,
                lit: rng() > 0.35,
                flicker: rng() > 0.72,
                fr: 0.4 + rng() * 4,
                ph: rng() * Math.PI * 2,
                br: rng(),
                warm: rng() > 0.45
              });
            }
          }
        }
        arr.push({ x: bx, y: by, w: bw, h: bh, windows, antenna: hasAntenna && rng() > 0.6, ph: rng() * Math.PI * 2 });
      }
      return arr;
    };

    return {
      far: makeBuildings(16, H * 0.28, H * 0.48, 28, 70, false),
      mid: makeBuildings(10, H * 0.20, H * 0.38, 44, 100, true)
    };
  }

  _buildRainPool(count, W, H) {
    const pool = [];
    for (let i = 0; i < count; i++) {
      pool.push({
        x: Math.random() * W,
        y: Math.random() * H,
        spd: 280 + Math.random() * 260,
        len: 9 + Math.random() * 14,
        op: 0.08 + Math.random() * 0.22
      });
    }
    return pool;
  }

  _updateRainPool(pool, W, H, dt) {
    for (const p of pool) {
      p.y += p.spd * dt;
      p.x -= p.spd * 0.18 * dt;
      if (p.y > H + p.len) {
        p.y = -p.len;
        p.x = Math.random() * (W + 60);
      }
    }
  }

  // Network Event Handlers
  onRoomCreated(code, localIp, port) {
    const displayCode = document.getElementById('displayRoomCode');
    const displayIp = document.getElementById('displayIp');
    if (displayCode) displayCode.textContent = code;
    if (displayIp) displayIp.textContent = `${localIp}:${port}`;
  }

  onRoomJoined(code, levelIndex) {
    this.loadLevel(levelIndex);
    this.startNetworkGame(levelIndex);
  }

  onRemotePlayerConnected() {
    const p2Status = document.getElementById('p2Status');
    const btnStart = document.getElementById('btnStartGame');
    if (p2Status) {
      p2Status.className = 'status-item ready';
      p2Status.innerHTML = '<span class="dot"></span> P2: CONNECTED & READY!';
    }
    if (btnStart) btnStart.disabled = false;
  }

  onGameStarted(levelIndex) {
    this.startNetworkGame(levelIndex);
  }

  onRemotePlayerUpdate(role, state) {
    const target = role === 'p1' ? this.player1 : this.player2;
    target.x = state.x;
    target.y = state.y;
    target.vx = state.vx;
    target.vy = state.vy;
    target.facing = state.facing;
    target.grounded = state.grounded;
  }

  onRemoteObjectUpdate(objectId, objectState) {
    const cp = this.checkpoints.find(c => c.id === objectId);
    if (cp && objectState.activated) cp.activated = true;
  }

  onRemotePlayerDisconnected() {
    // Pause the game loop rendering to prevent the frozen ghost player
    // from looking like the game is still running normally
    this.state = 'DISCONNECTED';
    this.updateUIVisibility();
    const overlay = document.getElementById('disconnectOverlay');
    overlay?.classList.add('active');
  }

  returnToMenuFromDisconnect() {
    // Close the WS connection cleanly
    if (this.net.ws && this.net.ws.readyState === WebSocket.OPEN) {
      this.net.ws.close();
    }
    this.net.connected = false;
    this.net.roomCode = null;
    this.net.isHost = false;
    this.net.playerRole = 'p1';

    // Hide the overlay
    document.getElementById('disconnectOverlay')?.classList.remove('active');

    // Return to main menu
    this.state = 'MENU';
    this.updateUIVisibility();
    document.getElementById('mainMenu')?.classList.add('active');
    document.getElementById('hudLayer')?.classList.add('hidden');
  }

  onNetworkError(msg) {
    const errDisplay = document.getElementById('joinErrorMsg');
    if (errDisplay) errDisplay.textContent = msg;
  }

  run() {
    const loop = (timestamp) => {
      const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
      this.lastTime = timestamp;

      this.update(dt);
      this.render();

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
