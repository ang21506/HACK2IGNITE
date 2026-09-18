import { Player } from '../entities/Player.js';
import { LEVEL_DATA } from '../levels/LevelData.js';
import { Physics } from './Physics.js';
import { NetworkManager } from './NetworkManager.js';
import { audioManager } from './AudioManager.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.mode = 'LOCAL'; // 'LOCAL' or 'NETWORK'
    this.localViewportMode = 'SPLIT'; // 'SPLIT' or 'SINGLE'
    this.state = 'MENU'; // 'MENU', 'LOBBY', 'PLAYING', 'VICTORY'

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

    // Screen Shake Engine
    this.shakeTime = 0;
    this.shakeIntensity = 0;

    // Ambient floating dust motes
    this.ambientMotes = [];
    this.initAmbientMotes();

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

  initAmbientMotes() {
    this.ambientMotes = [];
    for (let i = 0; i < 40; i++) {
      this.ambientMotes.push({
        x: Math.random() * 2000,
        y: Math.random() * 1000,
        vx: (Math.random() - 0.5) * 15,
        vy: -10 - Math.random() * 15,
        radius: 1 + Math.random() * 2.5
      });
    }
  }

  triggerScreenShake(intensity = 8, duration = 0.25) {
    this.shakeIntensity = intensity;
    this.shakeTime = duration;
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

    // Pass game reference for screen shake triggers
    this.player1.game = this;
    this.player2.game = this;

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

  respawnAtCheckpoint() {
    audioManager.playSfx('respawn');
    this.triggerScreenShake(10, 0.3);
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
    if (this.state !== 'PLAYING') return;

    this.levelTime = (performance.now() - this.levelStartTime) / 1000;

    // Update Screen Shake Decay
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      if (this.shakeTime <= 0) this.shakeTime = 0;
    }

    // Update Ambient Motes
    for (const mote of this.ambientMotes) {
      mote.x += mote.vx * dt;
      mote.y += mote.vy * dt;
      if (mote.y < 0) mote.y = 1000;
      if (mote.x < 0) mote.x = 2000;
      if (mote.x > 2000) mote.x = 0;
    }

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
        this.triggerScreenShake(6, 0.2);
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
      this.camP1.x += (this.player1.x - vWidth / 2 - this.camP1.x) * 0.12;
      this.camP1.y += (this.player1.y - H / 2 - this.camP1.y) * 0.12;

      this.camP2.x += (this.player2.x - vWidth / 2 - this.camP2.x) * 0.12;
      this.camP2.y += (this.player2.y - H / 2 - this.camP2.y) * 0.12;
    } else {
      const targetX = (this.player1.x + this.player2.x) / 2 - W / 2;
      const targetY = (this.player1.y + this.player2.y) / 2 - H / 2;
      this.camP1.x += (targetX - this.camP1.x) * 0.12;
      this.camP1.y += (targetY - this.camP1.y) * 0.12;
    }
  }

  onLevelComplete() {
    audioManager.playSfx('win');
    this.triggerScreenShake(12, 0.4);
    this.state = 'VICTORY';
    this.updateUIVisibility();

    const victoryPanel = document.getElementById('victoryScreen');
    const statTime = document.getElementById('statTime');
    const statRespawns = document.getElementById('statRespawns');

    if (victoryPanel) victoryPanel.classList.add('active');

    const mins = Math.floor(this.levelTime / 60).toString().padStart(2, '0');
    const secs = Math.floor(this.levelTime % 60).toString().padStart(2, '0');
    if (statTime) statTime.textContent = `${mins}:${secs}`;
    if (statRespawns) statRespawns.textContent = this.respawnCount.toString();
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
      this.renderMenuBackground();
      return;
    }

    const W = this.canvas.width;
    const H = this.canvas.height;

    if (this.mode === 'LOCAL' && this.localViewportMode === 'SPLIT') {
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
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      this.ctx.beginPath();
      this.ctx.moveTo(halfW, 0);
      this.ctx.lineTo(halfW, H);
      this.ctx.stroke();

    } else {
      const role = this.mode === 'NETWORK' ? this.net.playerRole : 'p1';
      this.renderViewport(0, 0, W, H, this.camP1, role);
    }
  }

  renderViewport(vx, vy, vw, vh, camera, viewerRole) {
    this.ctx.save();
    
    // Apply Screen Shake Offset
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeTime > 0) {
      shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      shakeY = (Math.random() - 0.5) * this.shakeIntensity;
    }

    this.ctx.translate(vx + shakeX, vy + shakeY);

    // Render User Provided Parchment Texture Background
    if (!this.bgImg) {
      this.bgImg = new Image();
      this.bgImg.src = '/assets/bg_texture.png';
    }

    if (this.bgImg.complete && this.bgImg.naturalWidth !== 0) {
      if (!this.bgPattern) {
        this.bgPattern = this.ctx.createPattern(this.bgImg, 'repeat');
      }
      this.ctx.fillStyle = this.bgPattern || '#d4b886';
      this.ctx.fillRect(0, 0, vw, vh);

      // Subtle Reality Ambiance Tint Overlay
      if (viewerRole === 'p1') {
        this.ctx.fillStyle = 'rgba(9, 30, 42, 0.45)'; // Teal Reality A tint
      } else {
        this.ctx.fillStyle = 'rgba(42, 9, 20, 0.45)'; // Coral Reality B tint
      }
      this.ctx.fillRect(0, 0, vw, vh);
    } else {
      this.ctx.fillStyle = viewerRole === 'p1' ? '#091e2a' : '#2a0914';
      this.ctx.fillRect(0, 0, vw, vh);
    }

    // Grid pattern overlay
    this.ctx.strokeStyle = viewerRole === 'p1' ? 'rgba(54, 209, 220, 0.08)' : 'rgba(255, 81, 47, 0.08)';
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

    // Render Ambient Floating Dust Motes
    this.ctx.fillStyle = viewerRole === 'p1' ? 'rgba(0, 229, 255, 0.35)' : 'rgba(255, 51, 102, 0.35)';
    for (const mote of this.ambientMotes) {
      this.ctx.beginPath();
      this.ctx.arc(mote.x % vw, mote.y % vh, mote.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Render Platforms
    for (const plat of this.platforms) {
      plat.draw(this.ctx, camera, viewerRole);
    }

    // Render Switches & Doors
    for (const sw of this.switches) {
      sw.draw(this.ctx, camera, viewerRole);
    }
    for (const door of this.doors) {
      door.draw(this.ctx, camera, viewerRole);
    }

    // Render Boxes
    for (const box of this.boxes) {
      box.draw(this.ctx, camera, viewerRole);
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

    // Canvas Post-Processing: Radial Lens Vignette Overlay
    const vignette = this.ctx.createRadialGradient(vw / 2, vh / 2, vw * 0.35, vw / 2, vh / 2, vw * 0.7);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
    this.ctx.fillStyle = vignette;
    this.ctx.fillRect(0, 0, vw, vh);

    this.ctx.restore();
  }

  renderMenuBackground() {
    const W = this.canvas.width;
    const H = this.canvas.height;

    // Sleek Dark Menu Background Gradient
    const grad = this.ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#0d0f17');
    grad.addColorStop(0.5, '#12172b');
    grad.addColorStop(1, '#090b12');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, W, H);
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
    this.showNotification('PARTNER DISCONNECTED!');
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
