import { REALITY } from '../engine/RealityMatrix.js';
import { Platform, MovingPlatform, Switch, PushableBox, Checkpoint, LevelExit } from '../entities/PuzzleObjects.js';

export const LEVEL_DATA = [
  // =========================================================================
  // LEVEL 1: INTRODUCTION (Easy & Smooth)
  // =========================================================================
  {
    name: "LEVEL 1 — INTRODUCTION",
    description: "Welcome to Split Reality! P1 sees Reality A (Cyan). P2 sees Reality B (Coral). Reach the exit together!",
    spawnP1: { x: 80, y: 380 },
    spawnP2: { x: 140, y: 380 },
    platforms: [
      // Base Floor
      new Platform(0, 440, 1200, 40, REALITY.BOTH),
      new Platform(0, 0, 40, 440, REALITY.BOTH),
      new Platform(1160, 0, 40, 440, REALITY.BOTH),
      // Stepping Platforms
      new Platform(260, 360, 200, 24, REALITY.A),
      new Platform(500, 360, 200, 24, REALITY.B),
      new Platform(800, 360, 300, 24, REALITY.BOTH)
    ],
    switches: [
      new Switch('sw1_a', 320, 344, REALITY.A, false),
      new Switch('sw1_b', 560, 344, REALITY.B, false)
    ],
    doors: [],
    boxes: [],
    checkpoints: [
      new Checkpoint('cp1', 500, 380)
    ],
    exit: new LevelExit(1000, 280)
  },

  // =========================================================================
  // LEVEL 2: TRUST (Easy & Smooth)
  // =========================================================================
  {
    name: "LEVEL 2 — TRUST",
    description: "Navigate side by side across friendly reality stepping stones to reach the exit checkpoint!",
    spawnP1: { x: 80, y: 380 },
    spawnP2: { x: 140, y: 380 },
    platforms: [
      new Platform(0, 440, 1200, 40, REALITY.BOTH),
      new Platform(0, 0, 40, 440, REALITY.BOTH),
      new Platform(1160, 0, 40, 440, REALITY.BOTH),

      new Platform(280, 360, 180, 24, REALITY.A),
      new Platform(500, 360, 180, 24, REALITY.B),
      new Platform(720, 360, 180, 24, REALITY.BOTH),
      new Platform(940, 360, 200, 24, REALITY.BOTH)
    ],
    switches: [
      new Switch('sw2_a', 340, 344, REALITY.A, false),
      new Switch('sw2_b', 560, 344, REALITY.B, false)
    ],
    doors: [],
    boxes: [],
    checkpoints: [
      new Checkpoint('cp2', 500, 380)
    ],
    exit: new LevelExit(1020, 280)
  },

  // =========================================================================
  // LEVEL 3: TIMING (Easy & Smooth)
  // =========================================================================
  {
    name: "LEVEL 3 — TIMING",
    description: "Enjoy smooth moving platforms carrying both players easily to the final platform!",
    spawnP1: { x: 80, y: 380 },
    spawnP2: { x: 140, y: 380 },
    platforms: [
      new Platform(0, 440, 1200, 40, REALITY.BOTH),
      new Platform(0, 0, 40, 440, REALITY.BOTH),
      new Platform(1160, 0, 40, 440, REALITY.BOTH),

      new Platform(240, 360, 180, 24, REALITY.A),
      new MovingPlatform(460, 360, 200, 24, REALITY.BOTH, [
        { x: 460, y: 360 },
        { x: 760, y: 360 }
      ], 80),
      new Platform(820, 360, 300, 24, REALITY.BOTH)
    ],
    switches: [
      new Switch('sw3_a', 300, 344, REALITY.A, false)
    ],
    doors: [],
    boxes: [],
    checkpoints: [
      new Checkpoint('cp3', 500, 380)
    ],
    exit: new LevelExit(1000, 280)
  },

  // =========================================================================
  // LEVEL 4: MOVING OBJECTS (Easy & Smooth)
  // =========================================================================
  {
    name: "LEVEL 4 — MOVING OBJECTS",
    description: "Push the box or hop onto the stepping ledge to reach the exit!",
    spawnP1: { x: 80, y: 380 },
    spawnP2: { x: 140, y: 380 },
    platforms: [
      new Platform(0, 440, 1200, 40, REALITY.BOTH),
      new Platform(0, 0, 40, 440, REALITY.BOTH),
      new Platform(1160, 0, 40, 440, REALITY.BOTH),

      new Platform(340, 360, 200, 24, REALITY.BOTH),
      new Platform(620, 360, 200, 24, REALITY.BOTH),
      new Platform(880, 360, 240, 24, REALITY.BOTH)
    ],
    switches: [],
    doors: [],
    boxes: [
      new PushableBox('box1', 260, 390, 40, 40, REALITY.BOTH)
    ],
    checkpoints: [
      new Checkpoint('cp4', 500, 380)
    ],
    exit: new LevelExit(980, 280)
  },

  // =========================================================================
  // LEVEL 5: FINAL ESCAPE (Easy & Fun Final Checkpoint)
  // =========================================================================
  {
    name: "LEVEL 5 — FINAL ESCAPE",
    description: "A fun victory run! Cross the welcoming bridges to reach the final exit portal!",
    spawnP1: { x: 80, y: 380 },
    spawnP2: { x: 140, y: 380 },
    platforms: [
      new Platform(0, 440, 1200, 40, REALITY.BOTH),
      new Platform(0, 0, 40, 440, REALITY.BOTH),
      new Platform(1160, 0, 40, 440, REALITY.BOTH),

      new Platform(260, 360, 180, 24, REALITY.A),
      new Platform(480, 360, 180, 24, REALITY.B),
      new Platform(700, 360, 180, 24, REALITY.BOTH),
      new Platform(920, 360, 220, 24, REALITY.BOTH)
    ],
    switches: [
      new Switch('sw5_a', 320, 344, REALITY.A, false),
      new Switch('sw5_b', 540, 344, REALITY.B, false)
    ],
    doors: [],
    boxes: [],
    checkpoints: [
      new Checkpoint('cp5', 500, 380)
    ],
    exit: new LevelExit(1000, 280)
  }
];
