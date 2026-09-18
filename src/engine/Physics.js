import { RealityMatrix } from './RealityMatrix.js';

export class Physics {
  static GRAVITY = 1400; // px / s^2
  static MAX_FALL_SPEED = 800;

  static checkAABB(rect1, rect2) {
    return (
      rect1.x < rect2.x + rect2.w &&
      rect1.x + rect1.w > rect2.x &&
      rect1.y < rect2.y + rect2.h &&
      rect1.y + rect1.h > rect2.y
    );
  }

  static resolvePlayerTileCollisions(player, platforms, dt) {
    player.grounded = false;

    // Apply gravity
    player.vy += Physics.GRAVITY * dt;
    if (player.vy > Physics.MAX_FALL_SPEED) {
      player.vy = Physics.MAX_FALL_SPEED;
    }

    // Move X first
    player.x += player.vx * dt;
    const playerRectX = { x: player.x, y: player.y, w: player.w, h: player.h };

    for (const platform of platforms) {
      if (!RealityMatrix.isSolidToPlayer(platform.reality, player.role)) continue;
      if (platform.isDoor && !platform.solid) continue; // Unlocked open door

      if (Physics.checkAABB(playerRectX, platform)) {
        if (player.vx > 0) {
          player.x = platform.x - player.w;
        } else if (player.vx < 0) {
          player.x = platform.x + platform.w;
        }
        player.vx = 0;
        playerRectX.x = player.x;
      }
    }

    // Move Y second
    player.y += player.vy * dt;
    const playerRectY = { x: player.x, y: player.y, w: player.w, h: player.h };

    for (const platform of platforms) {
      if (!RealityMatrix.isSolidToPlayer(platform.reality, player.role)) continue;
      if (platform.isDoor && !platform.solid) continue;

      if (Physics.checkAABB(playerRectY, platform)) {
        if (player.vy > 0) {
          // Landing on platform top
          if (player.vy > 350 && player.game) {
            player.game.triggerScreenShake(4, 0.15);
          }
          player.y = platform.y - player.h;
          player.vy = 0;
          player.grounded = true;

          // If standing on moving platform, ride it!
          if (platform.isMoving && platform.vx) {
            player.x += platform.vx * dt;
          }
        } else if (player.vy < 0) {
          // Hitting ceiling
          player.y = platform.y + platform.h;
          player.vy = 0;
        }
        playerRectY.y = player.y;
      }
    }
  }

  static resolveBoxCollisions(player, boxes, dt) {
    const playerRect = { x: player.x, y: player.y, w: player.w, h: player.h };

    for (const box of boxes) {
      if (!RealityMatrix.isSolidToPlayer(box.reality, player.role)) continue;

      if (Physics.checkAABB(playerRect, box)) {
        // Horizontal pushing
        const overlapX1 = (player.x + player.w) - box.x;
        const overlapX2 = (box.x + box.w) - player.x;
        const overlapY1 = (player.y + player.h) - box.y;
        const overlapY2 = (box.y + box.h) - player.y;

        const minOverlapX = Math.min(overlapX1, overlapX2);
        const minOverlapY = Math.min(overlapY1, overlapY2);

        if (minOverlapX < minOverlapY) {
          if (overlapX1 < overlapX2 && player.vx > 0) {
            // Push box right
            box.vx = player.vx * 0.6;
            player.x = box.x - player.w;
          } else if (overlapX2 < overlapX1 && player.vx < 0) {
            // Push box left
            box.vx = player.vx * 0.6;
            player.x = box.x + box.w;
          }
        } else {
          if (overlapY1 < overlapY2 && player.vy > 0) {
            // Player landing on top of box
            player.y = box.y - player.h;
            player.vy = 0;
            player.grounded = true;
          } else if (overlapY2 < overlapY1 && player.vy < 0) {
            // Hitting bottom of box
            player.y = box.y + box.h;
            player.vy = 0;
          }
        }
      }
    }
  }

  static updateBoxPhysics(box, platforms, otherBoxes, dt) {
    box.vy += Physics.GRAVITY * dt;
    box.vx *= 0.85; // Friction

    box.x += box.vx * dt;
    const boxRectX = { x: box.x, y: box.y, w: box.w, h: box.h };

    for (const platform of platforms) {
      if (platform.reality !== box.reality && platform.reality !== 'BOTH' && box.reality !== 'BOTH') continue;
      if (platform.isDoor && !platform.solid) continue;

      if (Physics.checkAABB(boxRectX, platform)) {
        if (box.vx > 0) box.x = platform.x - box.w;
        else if (box.vx < 0) box.x = platform.x + platform.w;
        box.vx = 0;
        boxRectX.x = box.x;
      }
    }

    box.y += box.vy * dt;
    const boxRectY = { x: box.x, y: box.y, w: box.w, h: box.h };

    for (const platform of platforms) {
      if (platform.reality !== box.reality && platform.reality !== 'BOTH' && box.reality !== 'BOTH') continue;
      if (platform.isDoor && !platform.solid) continue;

      if (Physics.checkAABB(boxRectY, platform)) {
        if (box.vy > 0) {
          box.y = platform.y - box.h;
          box.vy = 0;
        } else if (box.vy < 0) {
          box.y = platform.y + platform.h;
          box.vy = 0;
        }
        boxRectY.y = box.y;
      }
    }
  }

  static checkPlayerCoopStacking(p1, p2, dt) {
    // Allows Player 1 and Player 2 to jump on top of each other to reach higher places!
    const rect1 = { x: p1.x, y: p1.y, w: p1.w, h: p1.h };
    const rect2 = { x: p2.x, y: p2.y, w: p2.w, h: p2.h };

    if (Physics.checkAABB(rect1, rect2)) {
      // Check if p1 is landing on p2
      if (p1.vy > 0 && p1.y + p1.h - p1.vy * dt <= p2.y + 10) {
        p1.y = p2.y - p1.h;
        p1.vy = 0;
        p1.grounded = true;
      }
      // Check if p2 is landing on p1
      else if (p2.vy > 0 && p2.y + p2.h - p2.vy * dt <= p1.y + 10) {
        p2.y = p1.y - p2.h;
        p2.vy = 0;
        p2.grounded = true;
      }
    }
  }
}
