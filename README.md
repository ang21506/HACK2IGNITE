<div align="center">
  <img src="https://img.shields.io/badge/Status-Live-success?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/Hackathon-HACK2IGNITE-blue?style=for-the-badge" alt="Hackathon" />
  <br>
  <h1>🌗 SPLIT REALITY</h1>
  <p><strong>Two Realities. One World. Perfect Synchronization.</strong></p>
  <p>A cooperative multiplayer puzzle platformer where communication is your only lifeline.</p>

  [**Live Demo**](https://split-reality-d457.onrender.com) | [**Pitch Deck / Presentation**](https://drive.google.com/drive/folders/15Zj5Z9WmX1N3g-Vh7lvVmCyV9eN9_5fd?usp=sharing)
</div>

<br>

## 📖 The Vision

**Split Reality** is an intense 2D cooperative puzzle game built entirely for the web. You and your partner are trapped in the same physical space, but you exist in **two entirely different dimensions**. 

- **Player 1 (Cyan Reality):** Sees paths, platforms, and hazards that Player 2 cannot see.
- **Player 2 (Coral Reality):** Sees buttons, doors, and boxes that Player 1 cannot see.

To survive, you cannot rely only on what is on your screen. You must communicate constantly, describe your surroundings, and perfectly synchronize your movements to guide each other through invisible hazards. **If one player falls, both fail.**

---

## ✨ Features

- 🌐 **Real-Time Multiplayer:** Built on WebSockets for zero-latency player synchronization.
- 🧩 **Asymmetric Information Engine:** The game selectively renders physics bodies based on the player's assigned reality.
- 🎨 **Cinematic WebGL/Canvas Graphics:** Features a procedural city skyline, 60fps parallax scrolling, and dynamic weather (rain particles).
- 🔊 **Immersive Audio:** Integrated BGM and SFX that react to game state changes (checkpoints, respawns, victories).
- 📱 **Responsive UI:** Modern, glassmorphism-inspired UI with a built-in chat system for players without microphones.
- ♿ **Accessibility First:** Includes a built-in Colorblind Mode that adds distinct visual patterns and icons to reality-specific objects.

---

## 🛠️ Architecture & Tech Stack

This game is built from the ground up using a custom 2D engine over HTML5 Canvas. We did not use heavy game engines like Unity or Godot, allowing for instant loading times in any browser.

**Frontend:**
- **HTML5 Canvas API:** Custom rendering engine.
- **JavaScript (ES6):** Game logic and physics calculations.
- **Vite:** Lightning-fast frontend build tooling.
- **CSS3:** Animations, transitions, and glassmorphism UI.

**Backend & Networking:**
- **Node.js & Express:** Lightweight HTTP server.
- **WebSocket (ws):** Bidirectional, low-latency communication protocol handling player positional data and physics object state.

---

## 🚀 Play the Game

### Live Deployment
The game is currently deployed and playable online! Grab a friend and jump in:
👉 **[Play Split Reality](https://split-reality-d457.onrender.com)**

### Pitch Presentation
View our HACK2IGNITE slide deck and system diagrams here:
👉 **[Google Drive Folder](https://drive.google.com/drive/folders/15Zj5Z9WmX1N3g-Vh7lvVmCyV9eN9_5fd?usp=sharing)**

---

## 💻 Local Setup (For Judges / Developers)

Want to run the game locally on your machine?

**1. Clone the repository:**
```bash
git clone https://github.com/ang21506/HACK2IGNITE.git
cd HACK2IGNITE
```

**2. Install dependencies:**
```bash
npm install
```

**3. Build the frontend:**
```bash
npm run build
```

**4. Start the multiplayer server:**
```bash
npm start
```

**5. Play:**
Open `http://localhost:3000` in two separate browser windows to test the multiplayer locally!

---

<div align="center">
  <i>Built with ❤️ for HACK2IGNITE.</i>
</div>
