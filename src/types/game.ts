export type TrackerSource =
  | "hands"
  | "left-hand"
  | "right-hand"
  | "shoulders"
  | "nose"
  | "hips"
  | "none";

export type TrackerStatus = "idle" | "loading" | "ready" | "error";

export type WebcamStatus =
  | "idle"
  | "requesting"
  | "ready"
  | "denied"
  | "error"
  | "unsupported";

export type GameStatus = "idle" | "playing" | "paused" | "over";

export type MathOperator = "+" | "-" | "*" | "/";

export interface DifficultyLevel {
  id: string;
  label: string;
  minAge: number;
  maxAge: number;
}

export interface MathProblem {
  left: number;
  right: number;
  operator: MathOperator;
  answer: number;
  prompt: string;
}

export interface GameSettings {
  levelId: string;
  operators: MathOperator[];
  infiniteLives: boolean;
}

export interface FallingObject {
  id: number;
  kind: "answer" | "golden-token";
  x: number;
  y: number;
  speed: number;
  size: number;
  hue: number;
  value: number;
  label: string;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
}

export interface PoseSignal {
  x: number | null;
  source: TrackerSource;
  isDetected: boolean;
}

export interface HandPoint {
  x: number;
  y: number;
  side: "left" | "right";
  isClosed: boolean;
  closeScore: number;
  stableFrames: number;
}

export interface HandDebugState {
  side: "left" | "right";
  isDetected: boolean;
  isClosed: boolean;
  closeScore: number | null;
  x: number | null;
  y: number | null;
  stableFrames: number;
}

export interface TrackingDebugInfo {
  rawX: number | null;
  mirroredX: number | null;
  smoothedX: number | null;
  fps: number;
  landmarkCount: number;
  handCount: number;
  closedHandCount: number;
  hands: HandDebugState[];
}

export interface TrophyTier {
  id: string;
  title: string;
  minScore: number;
  minStreak: number;
  minBonusTokens: number;
}

export interface GameSnapshot {
  score: number;
  misses: number;
  lives: number;
  streak: number;
  remainingMs: number;
  catcherX: number;
  handPoints: HandPoint[];
  bonusTokensCaught: number;
  currentTrophyId: string;
  bestTrophyId: string;
  activeProblem: MathProblem | null;
  objects: FallingObject[];
  particles: Particle[];
}
