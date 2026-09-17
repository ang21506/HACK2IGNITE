import { REALITY } from '../engine/RealityMatrix.js';
import { Platform, MovingPlatform, Switch, Door, PushableBox, Checkpoint, LevelExit } from '../entities/PuzzleObjects.js';

export const LEVEL_DATA = [
  // =========================================================================
  // LEVEL 1: INTRODUCTION
  // =========================================================================
  {
    name: "LEVEL 1 — INTRODUCTION",
    description: "Welcome to Split Reality! P1 sees Reality A (Cyan). P2 sees Reality B (Coral). Stand on both switches to open the exit door!",
    spawnP1: { x: 80, y: 380 },
    spawnP2: { x: 140, y: 380 },
    platforms: [
      // Base Floor
      new Platform(0, 440, 1200, 40, REALITY.BOTH),
      // Side Walls
      new Platform(0, 0, 40, 440, REALITY.BOTH),
      new Platform(1160, 0, 40, 440, REALITY.BOTH),
      // P1 Exclusive Platform (Reality A)
      new Platform(260, 340, 160, 24, REALITY.A),
      // P2 Exclusive Platform (Reality B)
      new Platform(500, 340, 160, 24, REALITY.B),
      // Shared Exit Ledge
      new Platform(900, 340, 260, 24, REALITY.BOTH)
    ],
    switches: [
      new Switch('sw1_a', 320, 324, REALITY.A, false),
      new Switch('sw1_b', 560, 324, REALITY.B, false)
    ],
    doors: [
      new Door('door1', 880, 244, 24, 96, REALITY.BOTH, ['sw1_a', 'sw1_b'])
    ],
    boxes: [],
    checkpoints: [
      new Checkpoint('cp1', 700, 380)
    ],
    exit: new LevelExit(1040, 260)
  },

  // =========================================================================
  // LEVEL 2: TRUST
  // =========================================================================
  {
    name: "LEVEL 2 — TRUST",
    description: "Some platforms are invisible in your partner's reality! Communicate using chat (T) to guide them across safely.",
    spawnP1: { x: 80, y: 380 },
    spawnP2: { x: 140, y: 380 },
    platforms: [
      // Spawn Floor
      new Platform(0, 440, 320, 40, REALITY.BOTH),
      new Platform(0, 0, 40, 440, REALITY.BOTH),

      // Chasm Platforms (Reality A visible to P1, invisible to P2!)
      new Platform(380, 380, 120, 24, REALITY.A),
      new Platform(560, 320, 120, 24, REALITY.A),

      // Chasm Platforms (Reality B visible to P2, invisible to P1!)
      new Platform(740, 320, 120, 24, REALITY.B),

      // Destination Ledge
      new Platform(940, 360, 260, 40, REALITY.BOTH),
      new Platform(1160, 0, 40, 440, REALITY.BOTH)
    ],
    switches: [
      new Switch('sw2_a', 430, 364, REALITY.A, false),
      new Switch('sw2_b', 790, 304, REALITY.B, false)
    ],
    doors: [
      new Door('door2', 960, 264, 24, 96, REALITY.BOTH, ['sw2_a', 'sw2_b'])
    ],
    boxes: [],
    checkpoints: [
      new Checkpoint('cp2', 240, 380)
    ],
    exit: new LevelExit(1050, 280)
  },

  // =========================================================================
  // LEVEL 3: TIMING
  // =========================================================================
  {
    name: "LEVEL 3 — TIMING",
    description: "Timed switches require fast coordination! P1 must activate the timed switch so P2 can reach the moving platform switch.",
    spawnP1: { x: 80, y: 380 },
    spawnP2: { x: 140, y: 380 },
    platforms: [
      new Platform(0, 440, 300, 40, REALITY.BOTH),
      new Platform(0, 0, 40, 440, REALITY.BOTH),

      // Timed Door Barrier Section
      new Platform(360, 360, 180, 24, REALITY.A),
      new Platform(600, 320, 180, 24, REALITY.B),

      // Dynamic Moving Platform
      new MovingPlatform(300, 260, 120, 24, REALITY.BOTH, [
        { x: 300, y: 260 },
        { x: 800, y: 260 }
      ], 100),

      // End Floor
      new Platform(900, 440, 300, 40, REALITY.BOTH),
      new Platform(1160, 0, 40, 440, REALITY.BOTH)
    ],
    switches: [
      new Switch('sw3_timed', 420, 344, REALITY.A, true, 5.0),
      new Switch('sw3_perm', 680, 304, REALITY.B, false)
    ],
    doors: [
      new Door('door3_timed', 580, 224, 24, 96, REALITY.A, ['sw3_timed']),
      new Door('door3_exit', 920, 344, 24, 96, REALITY.BOTH, ['sw3_perm'])
    ],
    boxes: [],
    checkpoints: [
      new Checkpoint('cp3', 200, 380)
    ],
    exit: new LevelExit(1040, 360)
  },

  // =========================================================================
  // LEVEL 4: MOVING OBJECTS
  // =========================================================================
  {
    name: "LEVEL 4 — MOVING OBJECTS",
    description: "Push boxes onto pressure switches or use them as stepping blocks across reality boundaries!",
    spawnP1: { x: 80, y: 380 },
    spawnP2: { x: 140, y: 380 },
    platforms: [
      new Platform(0, 440, 1200, 40, REALITY.BOTH),
      new Platform(0, 0, 40, 440, REALITY.BOTH),
      new Platform(1160, 0, 40, 440, REALITY.BOTH),

      // High Ledge needing box boost
      new Platform(400, 320, 200, 24, REALITY.BOTH),
      new Platform(750, 260, 200, 24, REALITY.BOTH)
    ],
    switches: [
      new Switch('sw4_box_plate', 480, 304, REALITY.A, false),
      new Switch('sw4_high', 820, 244, REALITY.B, false)
    ],
    doors: [
      new Door('door4', 980, 344, 24, 96, REALITY.BOTH, ['sw4_box_plate', 'sw4_high'])
    ],
    boxes: [
      new PushableBox('box1', 260, 390, 40, 40, REALITY.A)
    ],
    checkpoints: [
      new Checkpoint('cp4', 180, 380)
    ],
    exit: new LevelExit(1060, 360)
  },

  // =========================================================================
  // LEVEL 5: FINAL ESCAPE
  // =========================================================================
  {
    name: "LEVEL 5 — FINAL ESCAPE",
    description: "The ultimate test! Combine timing, invisible platforms, box positioning, and sync jumps to escape!",
    spawnP1: { x: 80, y: 380 },
    spawnP2: { x: 140, y: 380 },
    platforms: [
      // Starting Ledge
      new Platform(0, 440, 280, 40, REALITY.BOTH),
      new Platform(0, 0, 40, 440, REALITY.BOTH),

      // Section 1: Split Risers
      new Platform(320, 360, 120, 24, REALITY.A),
      new Platform(480, 300, 120, 24, REALITY.B),

      // Section 2: Box Platform Bridge
      new Platform(640, 360, 200, 24, REALITY.BOTH),

      // Section 3: Final Exit Tower
      new Platform(900, 280, 260, 24, REALITY.BOTH),
      new Platform(1160, 0, 40, 440, REALITY.BOTH)
    ],
    switches: [
      new Switch('sw5_t1', 360, 344, REALITY.A, true, 6.0),
      new Switch('sw5_t2', 520, 284, REALITY.B, true, 6.0),
      new Switch('sw5_box', 720, 344, REALITY.BOTH, false)
    ],
    doors: [
      new Door('door5_1', 620, 264, 24, 96, REALITY.BOTH, ['sw5_t1', 'sw5_t2']),
      new Door('door5_final', 880, 184, 24, 96, REALITY.BOTH, ['sw5_box'])
    ],
    boxes: [
      new PushableBox('box5', 180, 390, 40, 40, REALITY.BOTH)
    ],
    checkpoints: [
      new Checkpoint('cp5', 200, 380)
    ],
    exit: new LevelExit(1020, 200)
  }
];
