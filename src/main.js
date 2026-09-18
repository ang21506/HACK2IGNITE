import { Game } from './engine/Game.js';
import { audioManager } from './engine/AudioManager.js';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const game = new Game(canvas);
  game.run();

  // Panels
  const mainMenu = document.getElementById('mainMenu');
  const hostScreen = document.getElementById('hostScreen');
  const joinScreen = document.getElementById('joinScreen');
  const settingsScreen = document.getElementById('settingsScreen');
  const victoryScreen = document.getElementById('victoryScreen');

  function showPanel(panel) {
    [mainMenu, hostScreen, joinScreen, settingsScreen, victoryScreen].forEach(p => p?.classList.remove('active'));
    panel?.classList.add('active');
  }

  // --- UI SOUND EFFECTS BINDINGS ---
  document.querySelectorAll('button, select, input[type="range"]').forEach(el => {
    el.addEventListener('mouseenter', () => audioManager.playSfx('uiHover'));
    el.addEventListener('click', () => audioManager.playSfx('uiClick'));
  });

  // --- BUTTON ACTIONS ---

  // Host Button
  document.getElementById('btnHost')?.addEventListener('click', async () => {
    showPanel(hostScreen);
    try {
      await game.net.connect();
      const selectLevel = document.getElementById('selectLevel');
      const startLevelIndex = parseInt(selectLevel?.value || '0', 10);
      game.net.createRoom(startLevelIndex);
    } catch (err) {
      console.error('Failed to connect host websocket:', err);
      const displayIp = document.getElementById('displayIp');
      if (displayIp) displayIp.textContent = 'Server Disconnected';
    }
  });

  // Start Hosted Game
  document.getElementById('btnStartGame')?.addEventListener('click', () => {
    const selectLevel = document.getElementById('selectLevel');
    const startLevelIndex = parseInt(selectLevel?.value || '0', 10);
    game.net.startGame(startLevelIndex);
  });

  // Join Button
  document.getElementById('btnJoin')?.addEventListener('click', () => {
    showPanel(joinScreen);
  });

  // Join Connect Action
  document.getElementById('btnJoinConnect')?.addEventListener('click', async () => {
    const inputCode = document.getElementById('inputRoomCode')?.value.trim();
    const inputUrl = document.getElementById('inputServerUrl')?.value.trim();
    const errorMsg = document.getElementById('joinErrorMsg');

    if (!inputCode) {
      if (errorMsg) errorMsg.textContent = 'Please enter a valid 4-letter Room Code!';
      return;
    }

    try {
      if (errorMsg) errorMsg.textContent = 'Connecting to server...';
      await game.net.connect(inputUrl);
      game.net.joinRoom(inputCode);
    } catch (err) {
      if (errorMsg) errorMsg.textContent = 'Could not connect to host server!';
    }
  });

  // Local 2-Player Co-op
  document.getElementById('btnLocal')?.addEventListener('click', () => {
    showPanel(null);
    game.startLocalGame(0);
  });

  // Settings Modal
  document.getElementById('btnSettings')?.addEventListener('click', () => {
    showPanel(settingsScreen);
  });

  // --- SETTINGS CONTROLS ---
  const sfxSlider = document.getElementById('sfxVolume');
  const bgmSlider = document.getElementById('bgmVolume');
  const toggleSfxBtn = document.getElementById('toggleSfx');
  const toggleBgmBtn = document.getElementById('toggleBgm');

  sfxSlider?.addEventListener('input', (e) => {
    audioManager.sfxVolume = parseFloat(e.target.value) / 100;
  });

  bgmSlider?.addEventListener('input', (e) => {
    audioManager.bgmVolume = parseFloat(e.target.value) / 100;
  });

  toggleSfxBtn?.addEventListener('click', (e) => {
    audioManager.sfxMuted = !audioManager.sfxMuted;
    if (audioManager.sfxMuted) {
      e.target.textContent = 'OFF';
      e.target.className = 'pill-toggle off';
    } else {
      e.target.textContent = 'ON';
      e.target.className = 'pill-toggle active';
    }
  });

  toggleBgmBtn?.addEventListener('click', (e) => {
    audioManager.bgmMuted = !audioManager.bgmMuted;
    if (audioManager.bgmMuted) {
      e.target.textContent = 'OFF';
      e.target.className = 'pill-toggle off';
      audioManager.stopBgm();
    } else {
      e.target.textContent = 'ON';
      e.target.className = 'pill-toggle active';
      audioManager.startBgm();
    }
  });

  document.getElementById('toggleViewportMode')?.addEventListener('click', (e) => {
    game.localViewportMode = game.localViewportMode === 'SPLIT' ? 'SINGLE' : 'SPLIT';
    e.target.textContent = game.localViewportMode === 'SPLIT' ? 'SPLIT SCREEN' : 'SINGLE SCREEN';
  });

  // Back Buttons
  document.getElementById('btnHostBack')?.addEventListener('click', () => showPanel(mainMenu));
  document.getElementById('btnJoinBack')?.addEventListener('click', () => showPanel(mainMenu));
  document.getElementById('btnSettingsBack')?.addEventListener('click', () => showPanel(mainMenu));

  // Victory Screen Actions
  document.getElementById('btnNextLevel')?.addEventListener('click', () => {
    game.nextLevel();
  });

  document.getElementById('btnVictoryMenu')?.addEventListener('click', () => {
    showPanel(mainMenu);
    game.state = 'MENU';
    game.updateUIVisibility();
  });
});
