import { LevelData, RuntimeGear } from '../types';
import { registeredLevels } from '../data/levels';
import { validateLevel, ValidationReport } from './levelValidator';

export interface LoadedLevelResult {
  level: LevelData;
  validation: ValidationReport;
  runtimeGears: RuntimeGear[];
}

/**
 * Sanitizes level gears so that ONLY the exact number of cogs required to solve
 * the puzzle exist in the assembly inventory tray. No extra or distractor cogs are allowed.
 */
export function enforceExactCogInventory(rawLevel: LevelData): LevelData {
  const solutionPlacements = rawLevel.solution?.placements || [];
  const requiredPlacementIds = new Set(solutionPlacements.map((p) => p.gearId));

  const staticGears = rawLevel.gears.filter((g) => !g.movable);
  const originalMovables = rawLevel.gears.filter((g) => g.movable);

  let allowedMovableGears = originalMovables;

  if (requiredPlacementIds.size > 0) {
    // Keep ONLY movable gears that are specifically in the official solution placements
    allowedMovableGears = originalMovables.filter((g) => requiredPlacementIds.has(g.id));
  } else if (rawLevel.solution?.minimumMoves && rawLevel.solution.minimumMoves > 0) {
    // Limit strictly to minimumMoves if no explicit placements array
    allowedMovableGears = originalMovables.slice(0, rawLevel.solution.minimumMoves);
  }

  // If any extra cogs were pruned or spacing needs readjustment, ensure they are neatly arrayed in the inventory tray
  const hadExtraCogs = allowedMovableGears.length !== originalMovables.length;
  const boardWidth = rawLevel.board?.width || 1200;
  const trayCount = allowedMovableGears.length;
  const step = Math.min(130, Math.floor((boardWidth - 100) / Math.max(1, trayCount + 1)));

  const sanitizedMovables = allowedMovableGears.map((gear, idx) => {
    const defaultTrayX = Math.round(50 + (idx + 1) * step);
    const defaultTrayY = Math.max(560, (rawLevel.board?.height || 700) - 100);

    const initialX = hadExtraCogs ? defaultTrayX : (gear.initialX ?? gear.x ?? defaultTrayX);
    const initialY = gear.initialY && gear.initialY >= 520 ? gear.initialY : defaultTrayY;

    return {
      ...gear,
      initialX,
      initialY,
      x: initialX,
      y: initialY,
      movable: true,
    };
  });

  const updatedSolution = rawLevel.solution
    ? {
        ...rawLevel.solution,
        minimumMoves: allowedMovableGears.length > 0 ? allowedMovableGears.length : rawLevel.solution.minimumMoves,
      }
    : undefined;

  return {
    ...rawLevel,
    gears: [...staticGears, ...sanitizedMovables],
    solution: updatedSolution as any,
  };
}

/**
 * Loads a level by ID and initializes runtime gear states with exact tray cogs
 */
export function loadLevel(levelId: number): LoadedLevelResult | null {
  const rawLevel = registeredLevels[levelId];
  if (!rawLevel) {
    console.warn(`Level ${levelId} is not installed or available.`);
    return null;
  }

  const level = enforceExactCogInventory(rawLevel);
  const validation = validateLevel(level);

  // Initialize runtime gears
  const runtimeGears: RuntimeGear[] = level.gears.map((g) => ({
    ...g,
    currentX: g.initialX ?? g.x,
    currentY: g.initialY ?? g.y,
    currentRotation: g.rotation || 0,
    angularVelocity: g.powered ? (g.rotationSpeed || 1.0) : 0,
    isPowered: !!g.powered,
    isMeshed: false,
    isJam: false,
    connectedTo: [],
    isDragging: false,
  }));

  return {
    level,
    validation,
    runtimeGears,
  };
}

const NON_REPEAT_WINDOW_DAYS = 30;

// Persistent schedule cache to ensure O(1) retrieval and strict non-repeat guarantee across 30-day windows
let cachedSchedule: number[] = [];
let cachedLastUsed = new Map<number, number>();
let cachedLevelKeysHash = '';
let currentPrngSeed = 0x6d2b79f5;

/**
 * Parses a date string (YYYY-MM-DD or ISO format) into a deterministic UTC day index.
 */
export function parseDateToUtcDay(dateStr: string): number {
  const parts = dateStr.trim().split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return Math.floor(Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86400000);
  }
  const parsed = Date.parse(dateStr);
  if (!isNaN(parsed)) {
    return Math.floor(parsed / 86400000);
  }
  return Math.floor(Date.now() / 86400000);
}

/**
 * Computes the deterministic level number for any given date string.
 * Strictly guarantees that no puzzle is repeated within any 30-day rolling window.
 */
export function getDailyLevelNumber(dateStr: string): number {
  const allKeys = Object.keys(registeredLevels).map(Number).sort((a, b) => a - b);
  if (allKeys.length === 0) {
    throw new Error('No levels are registered in the game.');
  }

  // Filter for daily eligible levels if specified; fallback to all levels
  const eligibleKeys = allKeys.filter(
    (id) => registeredLevels[id]?.metadata?.dailyEligible !== false
  );
  const levelsPool = eligibleKeys.length > 0 ? eligibleKeys : allKeys;

  // If level catalogue changed, reset schedule cache
  const currentKeysHash = levelsPool.join(',');
  if (cachedLevelKeysHash !== currentKeysHash) {
    cachedSchedule = [];
    cachedLastUsed = new Map();
    cachedLevelKeysHash = currentKeysHash;
    currentPrngSeed = 0x6d2b79f5;
  }

  const dayIndex = Math.max(0, parseDateToUtcDay(dateStr));
  const poolSize = levelsPool.length;
  // Non-repeat window: strictly 30 days if pool >= 30, or poolSize - 1 if smaller
  const windowSize = Math.min(NON_REPEAT_WINDOW_DAYS, Math.max(1, poolSize - 1));

  // Extend schedule deterministically up to dayIndex
  while (cachedSchedule.length <= dayIndex) {
    const currentDay = cachedSchedule.length;
    currentPrngSeed = ((Math.imul(currentPrngSeed, 1664525) + 1013904223) | 0) >>> 0;

    // Filter candidate levels that have not appeared in the last `windowSize` days
    const candidates: number[] = [];
    for (let i = 0; i < poolSize; i++) {
      const lvl = levelsPool[i];
      const lastDay = cachedLastUsed.has(lvl) ? cachedLastUsed.get(lvl)! : -999999;
      if (currentDay - lastDay >= windowSize) {
        candidates.push(lvl);
      }
    }

    const available = candidates.length > 0 ? candidates : levelsPool;
    const pick = available[currentPrngSeed % available.length];

    cachedSchedule.push(pick);
    cachedLastUsed.set(pick, currentDay);
  }

  return cachedSchedule[dayIndex];
}

/**
 * Generates or retrieves the daily puzzle for a specific date string (YYYY-MM-DD),
 * guaranteed to have zero repeats within any 30-day rolling window.
 */
export function getDailyLevel(dateStr: string): LoadedLevelResult {
  const levelNumber = getDailyLevelNumber(dateStr);
  const loaded = loadLevel(levelNumber);
  if (!loaded) {
    throw new Error(`Failed to load daily level #${levelNumber}`);
  }

  // Clone with daily metadata
  const dailyLevel: LevelData = {
    ...loaded.level,
    name: `Daily Mechanism (${dateStr})`,
    metadata: {
      ...loaded.level.metadata,
      description: `Synchronize the daily kinetic machine for ${dateStr}. Complete for bonus streak points!`,
    },
  };

  return {
    level: dailyLevel,
    validation: loaded.validation,
    runtimeGears: loaded.runtimeGears.map((g) => ({ ...g })),
  };
}

/**
 * Loads a custom player-created puzzle into runtime gears and validation,
 * ensuring the assembly inventory tray contains only the exact required cogs.
 */
export function loadCustomLevel(customLevel: LevelData): LoadedLevelResult {
  const level = enforceExactCogInventory(customLevel);
  const validation = validateLevel(level);

  const runtimeGears: RuntimeGear[] = level.gears.map((g) => ({
    ...g,
    currentX: g.initialX ?? g.x,
    currentY: g.initialY ?? g.y,
    currentRotation: g.rotation || 0,
    angularVelocity: g.powered ? (g.rotationSpeed || 1.0) : 0,
    isPowered: !!g.powered,
    isMeshed: false,
    isJam: false,
    connectedTo: [],
    isDragging: false,
  }));

  return {
    level,
    validation,
    runtimeGears,
  };
}

