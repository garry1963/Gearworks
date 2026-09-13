import { LevelData, RuntimeGear } from '../types';
import { areGearsColliding, checkObstacleCollision } from './gearPhysics';
import { calculateConnections } from './connectionEngine';

export interface ValidationReport {
  levelId: number;
  levelName: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  solutionSolvesLevel: boolean;
  details: {
    gearCount: number;
    poweredCount: number;
    targetCount: number;
    expectedMinMoves: number;
  };
}

/**
 * Validates a level data object against all 11 mechanical rules
 */
export function validateLevel(level: LevelData): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Primary powered gear check (at least 1, exactly 1 starter for initial campaign)
  const poweredGears = level.gears.filter((g) => g.powered);
  if (poweredGears.length === 0) {
    errors.push('Rule 1 Failed: No powered starter gear found.');
  } else if (poweredGears.length > 1) {
    warnings.push('Multiple powered drive gears detected.');
  }

  // 2. Every required target exists
  if (!level.targets || level.targets.length === 0) {
    errors.push('Rule 2 Failed: No target requirements specified.');
  } else {
    for (const target of level.targets) {
      const gear = level.gears.find((g) => g.id === target.gearId);
      if (!gear) {
        errors.push(`Rule 2 Failed: Target references non-existent gear '${target.gearId}'.`);
      }
    }
  }

  // 3. All gear IDs are unique
  const idSet = new Set<string>();
  for (const gear of level.gears) {
    if (idSet.has(gear.id)) {
      errors.push(`Rule 3 Failed: Duplicate gear ID '${gear.id}'.`);
    }
    idSet.add(gear.id);
  }

  // 4. Gear dimensions valid
  for (const gear of level.gears) {
    if (!gear.radius || gear.radius <= 0) {
      errors.push(`Rule 4 Failed: Gear '${gear.id}' has invalid radius ${gear.radius}.`);
    }
    if (!gear.teeth || gear.teeth < 6) {
      errors.push(`Rule 4 Failed: Gear '${gear.id}' has insufficient tooth count ${gear.teeth}.`);
    }
  }

  // 5. Gear positions inside the board boundaries
  const { width: bw, height: bh } = level.board;
  for (const gear of level.gears) {
    const x = gear.initialX ?? gear.x;
    const y = gear.initialY ?? gear.y;
    if (x - gear.radius < 0 || x + gear.radius > bw || y - gear.radius < 0 || y + gear.radius > bh) {
      warnings.push(`Gear '${gear.id}' bounds touch or exceed logical board margins (${bw}x${bh}).`);
    }
  }

  // 6. Starting gears do not illegally overlap
  for (let i = 0; i < level.gears.length; i++) {
    for (let j = i + 1; j < level.gears.length; j++) {
      const g1 = level.gears[i];
      const g2 = level.gears[j];
      const p1 = { x: g1.initialX ?? g1.x, y: g1.initialY ?? g1.y, radius: g1.radius };
      const p2 = { x: g2.initialX ?? g2.x, y: g2.initialY ?? g2.y, radius: g2.radius };
      if (areGearsColliding(p1, p2)) {
        errors.push(`Rule 6 Failed: Initial positions of '${g1.id}' and '${g2.id}' collide.`);
      }
    }
  }

  // 7. Obstacles do not overlap required starting objects
  if (level.obstacles) {
    for (const obs of level.obstacles) {
      for (const gear of level.gears) {
        const p = { x: gear.initialX ?? gear.x, y: gear.initialY ?? gear.y, radius: gear.radius };
        if (checkObstacleCollision(p, obs)) {
          errors.push(`Rule 7 Failed: Obstacle '${obs.id}' collides with gear '${gear.id}'.`);
        }
      }
    }
  }

  // 8 & 9. Official solution verification
  let solutionSolvesLevel = false;
  if (!level.solution || !level.solution.placements) {
    errors.push('Rule 8 Failed: No official solution placements defined.');
  } else {
    // Simulate solution placement
    const simulatedGears: RuntimeGear[] = level.gears.map((g) => {
      const placement = level.solution.placements.find((p) => p.gearId === g.id);
      return {
        ...g,
        currentX: placement ? placement.x : (g.initialX ?? g.x),
        currentY: placement ? placement.y : (g.initialY ?? g.y),
        currentRotation: 0,
        angularVelocity: 0,
        isPowered: false,
        isMeshed: false,
        isJam: false,
        connectedTo: [],
      };
    });

    // Check collisions among solution placements
    for (let i = 0; i < simulatedGears.length; i++) {
      for (let j = i + 1; j < simulatedGears.length; j++) {
        const g1 = simulatedGears[i];
        const g2 = simulatedGears[j];
        if (
          areGearsColliding(
            { x: g1.currentX, y: g1.currentY, radius: g1.radius },
            { x: g2.currentX, y: g2.currentY, radius: g2.radius }
          )
        ) {
          errors.push(`Rule 8 Failed: Solution placement collision between '${g1.id}' and '${g2.id}'.`);
        }
      }
    }

    // Check solution connectivity
    const connectionTest = calculateConnections(simulatedGears, level.targets);
    if (!connectionTest.isLevelComplete) {
      errors.push('Rule 9 Failed: Official solution does not satisfy all required targets.');
    } else {
      solutionSolvesLevel = true;
    }
  }

  // 10. Minimum moves valid
  if (!level.solution || level.solution.minimumMoves <= 0) {
    errors.push('Rule 10 Failed: Minimum moves must be a positive number.');
  }

  // 11. Time limit valid
  if (level.rules.timed && (!level.rules.timeLimit || level.rules.timeLimit < 10)) {
    errors.push('Rule 11 Failed: Level time limit must be at least 10 seconds.');
  }

  return {
    levelId: level.id,
    levelName: level.name,
    isValid: errors.length === 0,
    errors,
    warnings,
    solutionSolvesLevel,
    details: {
      gearCount: level.gears.length,
      poweredCount: poweredGears.length,
      targetCount: level.targets.length,
      expectedMinMoves: level.solution?.minimumMoves || 0,
    },
  };
}
