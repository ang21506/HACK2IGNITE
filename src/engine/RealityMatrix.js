// Reality Matrix Definitions
export const REALITY = {
  A: 'REALITY_A',
  B: 'REALITY_B',
  BOTH: 'BOTH'
};

export class RealityMatrix {
  static isVisibleToPlayer(objectReality, playerRole, showAllRealityHints = false) {
    if (objectReality === REALITY.BOTH) return true;
    if (playerRole === 'p1' && objectReality === REALITY.A) return true;
    if (playerRole === 'p2' && objectReality === REALITY.B) return true;
    // If showAllRealityHints is enabled, player can see ghosted/faint outlines of partner's reality objects!
    return showAllRealityHints;
  }

  static isSolidToPlayer(objectReality, playerRole) {
    if (objectReality === REALITY.BOTH) return true;
    if (playerRole === 'p1' && objectReality === REALITY.A) return true;
    if (playerRole === 'p2' && objectReality === REALITY.B) return true;
    return false; // Intentionally ghostable! Player can walk through partner's reality platforms unless both standing on shared object
  }

  static getStyle(objectReality, colorblindMode = true) {
    switch (objectReality) {
      case REALITY.A:
        return {
          primaryColor: '#36d1dc', // Cyan/Teal
          borderColor: '#1890ff',
          pattern: 'hatch-a',
          symbol: '▲',
          label: 'A'
        };
      case REALITY.B:
        return {
          primaryColor: '#ff512f', // Coral/Orange
          borderColor: '#f5222d',
          pattern: 'hatch-b',
          symbol: '■',
          label: 'B'
        };
      case REALITY.BOTH:
      default:
        return {
          primaryColor: '#a855f7', // Purple Shared
          borderColor: '#7e22ce',
          pattern: 'solid',
          symbol: '★',
          label: 'BOTH'
        };
    }
  }
}
