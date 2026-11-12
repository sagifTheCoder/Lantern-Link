export type CultureOrigin = 'vietnam' | 'korea' | 'convergence';

export interface Vector2D {
  x: number;
  y: number;
}

export interface LanternStats {
  id: string;
  name: string;
  koreanName?: string;
  origin: CultureOrigin;
  description: string;
  culturalNote: string;
  mass: number; // lighter = floats higher
  buoyancy: number; // upward float force
  airResistance: number; // drag
  durability: number; // max health
  glowRadius: number; // light cast size
  glowColor: string; // primary light color
  secondaryColor?: string; // e.g. blue for cheongsachorong
  tasselLength: number;
  shape: 'round' | 'diamond' | 'cylinder_dual' | 'hexagonal' | 'lotus' | 'octagonal';
  unlocked: boolean;
  unlockRequirement?: string;
}

export interface CulturalPattern {
  id: string;
  name: string;
  koreanName?: string;
  culture: CultureOrigin;
  trivia: string;
  x: number;
  y: number;
  radius: number;
  collected: boolean;
}

export interface Obstacle {
  id: string;
  type: 'roof_slope' | 'wall' | 'bridge' | 'branch_soft' | 'spikes' | 'updraft' | 'vortex' | 'chime';
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: Vector2D[]; // For custom polygon roofs (e.g. hanok eaves)
  strength?: number; // for updraft or vortex
  color?: string;
  label?: string;
}

export interface Firefly {
  id: string;
  x: number;
  y: number;
  collected: boolean;
  baseX: number;
  baseY: number;
  offset: number;
}

export interface LevelConfig {
  id: number;
  chapter: CultureOrigin;
  title: string;
  subtitle: string;
  culturalStory: string;
  maxGusts: number;
  windPowerMultiplier: number;
  startPos: Vector2D;
  targetPos: Vector2D;
  targetRadius: number;
  waterLevel?: number; // Y position of river water (if any)
  obstacles: Obstacle[];
  patterns: CulturalPattern[];
  fireflies?: Firefly[];
  bestScore?: {
    stars: number;
    gustsUsed: number;
    patternsCollected: number;
  };
}

export interface WindTrail {
  points: { x: number; y: number; time: number }[];
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  force: Vector2D;
  life: number; // 0 to 1
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'ember' | 'petal' | 'dust' | 'spark' | 'smoke';
}
