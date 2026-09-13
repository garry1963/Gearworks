/**
 * GEARWORKS - Core Data Types and Interfaces
 */

export type GearType =
  | 'standard'
  | 'small'
  | 'large'
  | 'fixed'
  | 'powered'
  | 'heavy'
  | 'directional'
  | 'locked'
  | 'target';

export type GearMaterial = 'steel' | 'brass' | 'copper' | 'titanium';

export interface GearData {
  id: string;
  type: GearType;
  x: number;
  y: number;
  radius: number;
  teeth: number;
  rotation: number;
  rotationSpeed: number; // base speed multiplier
  movable: boolean;
  powered: boolean;
  target?: boolean;
  locked?: boolean;
  snapDistance?: number;
  material?: GearMaterial;
  name?: string;
  // Starting position in the inventory/staging tray or initial position
  initialX?: number;
  initialY?: number;
}

export interface RuntimeGear extends GearData {
  currentX: number;
  currentY: number;
  isDragging?: boolean;
  currentRotation: number;
  angularVelocity: number; // directional: +1 clockwise, -1 counter-clockwise, 0 none
  isPowered: boolean;
  isMeshed: boolean;
  isJam: boolean; // if gear has conflicting rotation signals
  connectedTo: string[]; // IDs of meshed gears
}

export interface ObstacleData {
  id: string;
  type: 'block' | 'barrier' | 'pin';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  collision: boolean;
  visible: boolean;
  movable?: boolean;
}

export interface TargetRequirement {
  id: string;
  gearId: string;
  required: boolean;
  mustRotate: boolean;
  requiredDirection?: 'clockwise' | 'counter-clockwise' | 'any';
}

export interface SolutionPlacement {
  gearId: string;
  x: number;
  y: number;
}

export interface LevelSolution {
  minimumMoves: number;
  multipleSolutions: boolean;
  placements: SolutionPlacement[];
  connectionOrder: string[];
}

export interface LevelRules {
  timed: boolean;
  timeLimit: number;
  allowUndo: boolean;
  allowReset: boolean;
  allowHints: boolean;
  allowPause: boolean;
}

export interface ScoringConfig {
  baseScore: number;
  timeMultiplier: number;
  moveMultiplier: number;
  invalidPlacementPenalty: number;
  hintPenalty: number;
}

export interface StarRequirement {
  maxMoves?: number;
  minimumTimeRemaining?: number;
  maxHints?: number;
  completionRequired?: boolean;
}

export interface LevelStars {
  three: StarRequirement;
  two: StarRequirement;
  one: StarRequirement;
}

export interface LevelHint {
  id: number;
  type: 'highlightGear' | 'ghostPlacement' | 'connectionPath';
  gearId?: string;
  targetX?: number;
  targetY?: number;
  text?: string;
}

export interface LevelMetadata {
  tutorial: boolean;
  dailyEligible: boolean;
  challengeEligible: boolean;
  tags: string[];
  description?: string;
}

export interface BoardConfig {
  width: number;
  height: number;
  gridSize: number;
  snapToGrid: boolean;
}

export interface LevelData {
  id: number;
  worldId: number;
  levelNumber: number;
  name: string;
  difficulty:
    | 'tutorial'
    | 'very_easy'
    | 'easy'
    | 'medium'
    | 'hard'
    | 'very_hard'
    | 'expert'
    | 'master'
    | 'legendary';
  concept?: string;
  isWorldBoss?: boolean;
  board: BoardConfig;
  rules: LevelRules;
  gears: GearData[];
  obstacles: ObstacleData[];
  targets: TargetRequirement[];
  solution: LevelSolution;
  scoring: ScoringConfig;
  stars: LevelStars;
  hints: LevelHint[];
  metadata: LevelMetadata;
}

export interface LevelDatabaseSpec {
  databaseVersion: string;
  gameId: string;
  totalLevels: number;
  levelPacks: {
    id: string;
    name: string;
    levels: string;
  }[];
  worlds: {
    worldId: number;
    name: string;
    levels: number[];
  }[];
  levels: {
    id: number;
    world: number;
    name: string;
    difficulty: LevelData['difficulty'];
    timeLimit: number;
    gears: number;
    movable: number;
    fixed: number;
    powered: number;
    obstacles?: number;
    special?: string[];
    minimumMoves: number;
    concept: string;
  }[];
}

export interface LevelProgress {
  unlocked: boolean;
  completed: boolean;
  stars: number; // 0..3
  bestScore: number;
  bestTime: number | null; // seconds taken
  bestMoves: number | null;
  attempts: number;
  hintsUsed: number;
}

export interface PlayerStatistics {
  levelsAttempted: number;
  levelsCompleted: number;
  totalPlayTime: number; // in seconds
  totalMoves: number;
  averageMoves: number;
  averageCompletionTime: number;
  totalScore: number;
  highestScore: number;
  totalStars: number;
  threeStarLevels: number;
  hintsUsed: number;
  invalidPlacements: number;
  currentDailyStreak: number;
  longestDailyStreak: number;
  lastDailyDate?: string;
  challengeRecord: {
    highestLevel: number;
    highestScore: number;
    longestStreak: number;
  };
}

export interface GameSettings {
  masterVolume: number; // 0 to 1
  soundEffects: boolean;
  music: boolean;
  highContrast: boolean;
  reducedAnimation: boolean;
  largeUI: boolean;
  hapticFeedback: boolean;
  snapSensitivity: number; // tolerance multiplier
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  requirementType: 'levelsCompleted' | 'perfectLevel' | 'threeStarLevels' | 'speedRun' | 'streak';
  requirementValue: number;
  iconName: string;
  unlockedAt?: string | null;
}

export interface UserAchievementRecord {
  unlocked: boolean;
  unlockedAt?: string;
}

export interface PlayerSaveData {
  saveVersion: string;
  playerProgress: {
    currentWorld: number;
    currentLevel: number;
    levels: Record<number, LevelProgress>;
  };
  statistics: PlayerStatistics;
  settings: GameSettings;
  achievements: Record<string, UserAchievementRecord>;
  dailyPuzzles: Record<
    string,
    {
      levelId?: string;
      completed: boolean;
      score: number;
      time?: number | null;
      moves?: number | null;
      completedAt?: string;
    }
  >;
  challenge: {
    currentRun: {
      active: boolean;
      level: number;
      score: number;
      streak: number;
    };
    records: {
      highestLevel: number;
      highestScore: number;
      longestStreak: number;
    };
  };
  customPuzzles?: Record<string, CustomPuzzle>;
}

export interface CustomPuzzle extends LevelData {
  createdAt: string;
  updatedAt: string;
  author?: string;
  isVerified?: boolean;
}

export interface WorldDef {
  id: number;
  name: string;
  theme: string;
  levelRange: [number, number];
  description: string;
  unlocked: boolean;
}

export interface MoveHistoryState {
  gearId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}
