import { LevelData, RuntimeGear } from '../types';
import { registeredLevels } from '../data/levels';
import { validateLevel, ValidationReport } from './levelValidator';

export interface LoadedLevelResult {
  level: LevelData;
  validation: ValidationReport;
  runtimeGears: RuntimeGear[];
}

/**
 * Loads a level by ID and initializes runtime gear states
 */
export function loadLevel(levelId: number): LoadedLevelResult | null {
  const level = registeredLevels[levelId];
  if (!level) {
    console.warn(`Level ${levelId} is not installed or available.`);
    return null;
  }

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

/**
 * Generates or retrieves the daily puzzle for a specific date string (YYYY-MM-DD)
 */
export function getDailyLevel(dateStr: string): LoadedLevelResult {
  // Hash the date to pick a level from available levels
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  
  const levelKeys = Object.keys(registeredLevels).map(Number).sort((a, b) => a - b);
  if (levelKeys.length === 0) {
    throw new Error("No levels are registered in the game.");
  }
  
  const levelNumber = levelKeys[Math.abs(hash) % levelKeys.length];
  const loaded = loadLevel(levelNumber)!;

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
 * Loads a custom player-created puzzle into runtime gears and validation
 */
export function loadCustomLevel(customLevel: LevelData): LoadedLevelResult {
  const validation = validateLevel(customLevel);

  const runtimeGears: RuntimeGear[] = customLevel.gears.map((g) => ({
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
    level: customLevel,
    validation,
    runtimeGears,
  };
}

