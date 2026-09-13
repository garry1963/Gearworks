import { PlayerSaveData, LevelProgress, PlayerStatistics, GameSettings, CustomPuzzle } from '../types';

const STORAGE_KEY = 'GEARWORKS_SAVE_DATA_v1';
const CUSTOM_PUZZLES_KEY = 'GEARWORKS_CUSTOM_PUZZLES_v1';
const CURRENT_VERSION = '1.0.0';

export const DEFAULT_STARTER_PUZZLE: CustomPuzzle = {
  id: 1001,
  worldId: 1,
  levelNumber: 1,
  name: 'Clockwork Prelude',
  difficulty: 'easy',
  concept: 'custom_creation',
  board: {
    width: 1200,
    height: 700,
    gridSize: 25,
    snapToGrid: true,
  },
  rules: {
    timed: true,
    timeLimit: 120,
    allowUndo: true,
    allowReset: true,
    allowHints: true,
    allowPause: true,
  },
  gears: [
    {
      id: 'power_01',
      type: 'powered',
      name: 'Primary Motor',
      x: 350,
      y: 280,
      radius: 48,
      teeth: 14,
      rotation: 0,
      rotationSpeed: 1,
      movable: false,
      powered: true,
      target: false,
      material: 'titanium',
      snapDistance: 50,
    },
    {
      id: 'target_01',
      type: 'fixed',
      name: 'Chrono Output',
      x: 750,
      y: 280,
      radius: 48,
      teeth: 14,
      rotation: 0,
      rotationSpeed: 1,
      movable: false,
      powered: false,
      target: true,
      material: 'brass',
      snapDistance: 50,
    },
    {
      id: 'gear_01',
      type: 'standard',
      name: 'Transfer Cog 1',
      x: 480,
      y: 600,
      initialX: 480,
      initialY: 600,
      radius: 44,
      teeth: 13,
      rotation: 0,
      rotationSpeed: 1,
      movable: true,
      powered: false,
      target: false,
      material: 'steel',
      snapDistance: 50,
    },
    {
      id: 'gear_02',
      type: 'standard',
      name: 'Transfer Cog 2',
      x: 620,
      y: 600,
      initialX: 620,
      initialY: 600,
      radius: 44,
      teeth: 13,
      rotation: 0,
      rotationSpeed: 1,
      movable: true,
      powered: false,
      target: false,
      material: 'copper',
      snapDistance: 50,
    },
  ],
  obstacles: [],
  targets: [
    {
      id: 'req_target_01',
      gearId: 'target_01',
      required: true,
      mustRotate: true,
      requiredDirection: 'any',
    },
  ],
  solution: {
    minimumMoves: 2,
    multipleSolutions: true,
    placements: [
      { gearId: 'gear_01', x: 442, y: 280 },
      { gearId: 'gear_02', x: 658, y: 280 },
    ],
    connectionOrder: ['power_01', 'gear_01', 'gear_02', 'target_01'],
  },
  scoring: {
    baseScore: 1200,
    timeMultiplier: 10,
    moveMultiplier: 50,
    invalidPlacementPenalty: 25,
    hintPenalty: 100,
  },
  stars: {
    three: { maxMoves: 2, minimumTimeRemaining: 60 },
    two: { maxMoves: 4, minimumTimeRemaining: 30 },
    one: { completionRequired: true },
  },
  hints: [
    {
      id: 1,
      type: 'highlightGear',
      gearId: 'gear_01',
      text: 'Place the steel transfer cog tangent to the drive motor.',
    },
  ],
  metadata: {
    tutorial: false,
    dailyEligible: false,
    challengeEligible: false,
    tags: ['custom', 'starter'],
    description: 'Connect the primary titanium motor to the brass chrono output.',
  },
  createdAt: '2026-09-13T00:00:00.000Z',
  updatedAt: '2026-09-13T00:00:00.000Z',
  author: 'Master Clockmaker',
  isVerified: true,
};

export const defaultSettings: GameSettings = {
  masterVolume: 0.8,
  soundEffects: true,
  music: true,
  highContrast: false,
  reducedAnimation: false,
  largeUI: false,
  hapticFeedback: true,
  snapSensitivity: 1.0,
};

export const defaultStatistics: PlayerStatistics = {
  levelsAttempted: 0,
  levelsCompleted: 0,
  totalPlayTime: 0,
  totalMoves: 0,
  averageMoves: 0,
  averageCompletionTime: 0,
  totalScore: 0,
  highestScore: 0,
  totalStars: 0,
  threeStarLevels: 0,
  hintsUsed: 0,
  invalidPlacements: 0,
  currentDailyStreak: 0,
  longestDailyStreak: 0,
  challengeRecord: {
    highestLevel: 0,
    highestScore: 0,
    longestStreak: 0,
  },
};

export const defaultSaveData: PlayerSaveData = {
  saveVersion: CURRENT_VERSION,
  playerProgress: {
    currentWorld: 1,
    currentLevel: 1,
    levels: {
      1: {
        unlocked: true,
        completed: false,
        stars: 0,
        bestScore: 0,
        bestTime: null,
        bestMoves: null,
        attempts: 0,
        hintsUsed: 0,
      },
    },
  },
  statistics: defaultStatistics,
  settings: defaultSettings,
  achievements: {},
  dailyPuzzles: {},
  challenge: {
    currentRun: {
      active: false,
      level: 0,
      score: 0,
      streak: 0,
    },
    records: {
      highestLevel: 0,
      highestScore: 0,
      longestStreak: 0,
    },
  },
};

export function loadSaveData(): PlayerSaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return JSON.parse(JSON.stringify(defaultSaveData));
    }
    const parsed = JSON.parse(raw);
    // Version migration check
    if (!parsed.saveVersion) {
      parsed.saveVersion = CURRENT_VERSION;
    }
    // Merge deeply with defaults to prevent missing keys
    const merged: PlayerSaveData = {
      ...defaultSaveData,
      ...parsed,
      playerProgress: {
        ...defaultSaveData.playerProgress,
        ...(parsed.playerProgress || {}),
        levels: {
          ...defaultSaveData.playerProgress.levels,
          ...(parsed.playerProgress?.levels || {}),
        },
      },
      statistics: {
        ...defaultSaveData.statistics,
        ...(parsed.statistics || {}),
      },
      settings: {
        ...defaultSaveData.settings,
        ...(parsed.settings || {}),
      },
      achievements: {
        ...(parsed.achievements || {}),
      },
      dailyPuzzles: {
        ...(parsed.dailyPuzzles || {}),
      },
      challenge: {
        ...defaultSaveData.challenge,
        ...(parsed.challenge || {}),
      },
    };

    // Ensure level 1 is always unlocked
    if (!merged.playerProgress.levels[1]) {
      merged.playerProgress.levels[1] = {
        unlocked: true,
        completed: false,
        stars: 0,
        bestScore: 0,
        bestTime: null,
        bestMoves: null,
        attempts: 0,
        hintsUsed: 0,
      };
    } else {
      merged.playerProgress.levels[1].unlocked = true;
    }

    return merged;
  } catch (err) {
    console.error('Failed to load save data, resetting safely:', err);
    return JSON.parse(JSON.stringify(defaultSaveData));
  }
}

export function saveGameData(data: PlayerSaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to persist game data to localStorage:', err);
  }
}

/**
 * Custom Puzzles Management (Offline persistent in localStorage)
 */
export function loadCustomPuzzles(): CustomPuzzle[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PUZZLES_KEY);
    if (!raw) {
      // Seed with initial starter template
      const initial = [DEFAULT_STARTER_PUZZLE];
      localStorage.setItem(CUSTOM_PUZZLES_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return [DEFAULT_STARTER_PUZZLE];
  } catch (err) {
    console.error('Failed to load custom puzzles:', err);
    return [DEFAULT_STARTER_PUZZLE];
  }
}

export function saveCustomPuzzle(puzzle: CustomPuzzle): void {
  try {
    const current = loadCustomPuzzles();
    const existingIndex = current.findIndex((p) => p.id === puzzle.id);
    const updated = [...current];

    const toSave: CustomPuzzle = {
      ...puzzle,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      updated[existingIndex] = toSave;
    } else {
      updated.unshift(toSave);
    }

    localStorage.setItem(CUSTOM_PUZZLES_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save custom puzzle:', err);
  }
}

export function deleteCustomPuzzle(id: number | string): void {
  try {
    const current = loadCustomPuzzles();
    const filtered = current.filter((p) => p.id !== Number(id) && String(p.id) !== String(id));
    localStorage.setItem(CUSTOM_PUZZLES_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to delete custom puzzle:', err);
  }
}

export function getCustomPuzzle(id: number | string): CustomPuzzle | null {
  const current = loadCustomPuzzles();
  return current.find((p) => p.id === Number(id) || String(p.id) === String(id)) || null;
}

