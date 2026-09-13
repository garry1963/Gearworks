import levelDatabase from '../src/data/levelDatabase.json';
import { areGearsColliding, areGearsMeshed, checkObstacleCollision } from '../src/engine/gearPhysics';
import { validateLevel } from '../src/engine/levelValidator';
import { LevelData, GearData, ObstacleData, TargetRequirement, SolutionPlacement } from '../src/types';

interface SpecItem {
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
}

function getTeeth(radius: number): number {
  return Math.max(8, Math.round((radius / 60) * 18));
}

function arrangeTrayGears(movableGears: GearData[], boardWidth = 1200) {
  const count = movableGears.length;
  const maxPerRow = 10;
  const row1Count = Math.min(maxPerRow, Math.ceil(count / 2));
  const row2Count = count - row1Count;

  const row1Spacing = 112;
  const row1StartX = (boardWidth - (row1Count - 1) * row1Spacing) / 2;

  const row2Spacing = 112;
  const row2StartX = (boardWidth - (Math.max(1, row2Count) - 1) * row2Spacing) / 2 + 56;

  movableGears.forEach((g, i) => {
    let tx: number;
    let ty: number;
    if (i < row1Count) {
      tx = Math.round(row1StartX + i * row1Spacing);
      ty = 540;
    } else {
      const idx = i - row1Count;
      tx = Math.round(row2StartX + idx * row2Spacing);
      ty = 645;
    }
    g.x = tx;
    g.y = ty;
    g.initialX = tx;
    g.initialY = ty;
  });
}

interface Node {
  id: string;
  type: 'powered' | 'standard' | 'fixed';
  name: string;
  radius: number;
  x: number;
  y: number;
  movable: boolean;
  powered: boolean;
  target: boolean;
  locked?: boolean;
  specialProperties?: Record<string, any>;
  material?: string;
  parentId?: string;
}

function placeChildGear(
  parent: Node,
  rad: number,
  id: string,
  type: 'standard' | 'fixed',
  name: string,
  movable: boolean,
  target: boolean,
  preferredAngle: number,
  existingNodes: Node[],
  locked?: boolean,
  specialProperties?: any,
  material?: string
): Node | null {
  const idealD = parent.radius + rad;
  const minX = 70;
  const maxX = 1130;
  const minY = 65;
  const maxY = 475;

  const anglesToTry: number[] = [preferredAngle];
  for (let step = 1; step <= 36; step++) {
    const delta = (step * 5 * Math.PI) / 180;
    anglesToTry.push(preferredAngle + delta);
    anglesToTry.push(preferredAngle - delta);
  }

  for (const angle of anglesToTry) {
    const cx = Math.round(parent.x + Math.cos(angle) * idealD);
    const cy = Math.round(parent.y + Math.sin(angle) * idealD);

    if (cx - rad < minX || cx + rad > maxX || cy - rad < minY || cy + rad > maxY) {
      continue;
    }

    let collides = false;
    for (const other of existingNodes) {
      if (other.id === parent.id) continue;
      if (areGearsColliding({ x: cx, y: cy, radius: rad }, other)) {
        collides = true;
        break;
      }
      if (areGearsMeshed({ x: cx, y: cy, radius: rad }, other)) {
        collides = true;
        break;
      }
    }

    if (!collides && areGearsMeshed({ x: cx, y: cy, radius: rad }, parent)) {
      return {
        id,
        type,
        name,
        radius: rad,
        x: cx,
        y: cy,
        movable,
        powered: false,
        target,
        locked,
        specialProperties,
        material,
        parentId: parent.id,
      };
    }
  }

  return null;
}

export function generateLevelFromSpec(spec: SpecItem): LevelData | null {
  const isBoss = spec.id % 10 === 0;
  const specials = spec.special || [];
  const hasSmall = specials.includes('small') || spec.concept.includes('small');
  const hasLarge = specials.includes('large') || spec.concept.includes('large') || spec.concept.includes('giant');
  const hasHeavy = specials.includes('heavy');
  const hasLocked = specials.includes('locked');
  const hasDirectional = specials.includes('directional');

  const movableCount = spec.movable;
  const targetCount = spec.fixed;

  const isDense = movableCount >= 14;
  const defaultRad = isDense ? 38 : 44;

  const motorRadius = hasLarge ? (isDense ? 48 : 56) : isDense ? 40 : 48;
  const movableRadii: number[] = [];
  for (let i = 0; i < movableCount; i++) {
    if (hasSmall && (i % 3 === 1 || i === movableCount - 1)) {
      movableRadii.push(32);
    } else if (hasLarge && i % 4 === 2) {
      movableRadii.push(isDense ? 46 : 54);
    } else if (spec.concept === 'mixed_sizes' || spec.concept === 'mixed_chain') {
      movableRadii.push(i % 2 === 0 ? defaultRad : 32);
    } else {
      movableRadii.push(defaultRad);
    }
  }

  const targetRadii: number[] = [];
  for (let i = 0; i < targetCount; i++) {
    targetRadii.push(hasLarge && i === 0 ? (isDense ? 46 : 54) : isDense ? 40 : 46);
  }

  for (let attempt = 0; attempt < 50; attempt++) {
    const nodes: Node[] = [];
    const startX = 120 + (attempt % 4) * 20;
    const startY = targetCount === 1 ? (attempt % 2 === 0 ? 130 : 200) : 260;

    const motorNode: Node = {
      id: 'power_01',
      type: 'powered',
      name: 'Drive Motor',
      radius: motorRadius,
      x: startX,
      y: startY,
      movable: false,
      powered: true,
      target: false,
      material: 'titanium',
    };
    nodes.push(motorNode);

    let success = true;

    if (targetCount === 1) {
      // Snaking chain across 1-3 horizontal passes
      let currentParent = motorNode;
      let movingRight = true;

      for (let i = 0; i < movableCount; i++) {
        const rad = movableRadii[i];
        let preferredAngle = movingRight ? 0 : Math.PI;

        if (movingRight && currentParent.x > 980) {
          preferredAngle = Math.PI / 2;
          movingRight = false;
        } else if (!movingRight && currentParent.x < 220) {
          preferredAngle = Math.PI / 2;
          movingRight = true;
        }

        const isDir = hasDirectional && i === Math.floor(movableCount / 2);
        const isLock = hasLocked && i === 1;
        const isHvy = hasHeavy && i === movableCount - 1;

        const newNode = placeChildGear(
          currentParent,
          rad,
          `gear_${(i + 1).toString().padStart(2, '0')}`,
          'standard',
          isHvy ? 'Heavy Flywheel' : isDir ? 'Directional Ratchet' : `Transfer Cog ${i + 1}`,
          true,
          false,
          preferredAngle,
          nodes,
          isLock,
          isDir ? { directional: true, allowedDirection: 'clockwise' } : undefined,
          isHvy ? 'heavy' : isLock ? 'brass' : i % 2 === 0 ? 'steel' : 'copper'
        );

        if (!newNode) {
          success = false;
          break;
        }

        nodes.push(newNode);
        currentParent = newNode;
      }

      if (success) {
        const tRad = targetRadii[0];
        const prefT = movingRight ? 0 : Math.PI;
        const targetNode = placeChildGear(
          currentParent,
          tRad,
          'target_01',
          'fixed',
          'Kinetic Output',
          false,
          true,
          prefT,
          nodes,
          false,
          undefined,
          'brass'
        );

        if (!targetNode) success = false;
        else nodes.push(targetNode);
      }
    } else {
      // Multi-target layout using 2-hub or 1-hub setup
      const numHubs = targetCount <= 2 ? 1 : 2;
      let gearIndex = 0;
      let spineParent = motorNode;

      // Available movable gears for spine
      const reservedForBranches = targetCount;
      const availableForSpine = Math.max(1, movableCount - reservedForBranches);
      const spinePerHub = Math.max(1, Math.min(3, Math.floor(availableForSpine / numHubs)));

      const hubNodes: Node[] = [];

      for (let h = 0; h < numHubs; h++) {
        const stepsToHub = spinePerHub;
        for (let s = 0; s < stepsToHub && gearIndex < movableCount - (numHubs - hubNodes.length); s++) {
          const rad = movableRadii[gearIndex];
          const newNode = placeChildGear(
            spineParent,
            rad,
            `gear_${(gearIndex + 1).toString().padStart(2, '0')}`,
            'standard',
            `Spine Cog ${gearIndex + 1}`,
            true,
            false,
            0,
            nodes,
            false,
            undefined,
            'steel'
          );
          if (!newNode) {
            success = false;
            break;
          }
          nodes.push(newNode);
          spineParent = newNode;
          gearIndex++;
        }
        if (!success) break;
        hubNodes.push(spineParent);
      }

      if (success) {
        // Now distribute branches across hubs with 4 distinct quadrants:
        // For targetCount == 2:
        // Branch 0 from Hub 0: UP (-PI/2)
        // Branch 1 from Hub 0: DOWN (PI/2)
        // For targetCount == 3:
        // Branch 0 from Hub 0: UP (-PI/2)
        // Branch 1 from Hub 0: DOWN (PI/2)
        // Branch 2 from Hub 1: RIGHT (0)
        // For targetCount == 4:
        // Branch 0 from Hub 0: UP-LEFT (-2.4 rad)
        // Branch 1 from Hub 0: DOWN-LEFT (2.4 rad)
        // Branch 2 from Hub 1: UP-RIGHT (-0.7 rad)
        // Branch 3 from Hub 1: DOWN-RIGHT (0.7 rad)

        interface BranchConfig {
          hubIndex: number;
          angle: number;
        }

        const branchConfigs: BranchConfig[] = [];
        if (targetCount === 2) {
          branchConfigs.push({ hubIndex: 0, angle: -Math.PI / 2 });
          branchConfigs.push({ hubIndex: 0, angle: Math.PI / 2 });
        } else if (targetCount === 3) {
          branchConfigs.push({ hubIndex: 0, angle: -Math.PI / 2 });
          branchConfigs.push({ hubIndex: 0, angle: Math.PI / 2 });
          branchConfigs.push({ hubIndex: 1, angle: 0 });
        } else {
          branchConfigs.push({ hubIndex: 0, angle: -2.3 });
          branchConfigs.push({ hubIndex: 0, angle: 2.3 });
          branchConfigs.push({ hubIndex: 1, angle: -0.8 });
          branchConfigs.push({ hubIndex: 1, angle: 0.8 });
        }

        const remainingMovable = movableCount - gearIndex;
        const gearsPerBranch = Math.floor(remainingMovable / targetCount);
        let remainder = remainingMovable % targetCount;

        for (let b = 0; b < targetCount; b++) {
          const cfg = branchConfigs[b];
          const hub = hubNodes[cfg.hubIndex] || hubNodes[0];
          const countInBranch = gearsPerBranch + (remainder > 0 ? 1 : 0);
          if (remainder > 0) remainder--;

          let branchParent = hub;

          for (let k = 0; k < countInBranch && gearIndex < movableCount; k++) {
            const rad = movableRadii[gearIndex];
            const isDir = hasDirectional && gearIndex === 2;
            const isLock = hasLocked && gearIndex === 3;
            const isHvy = hasHeavy && gearIndex === movableCount - 1;

            const newNode = placeChildGear(
              branchParent,
              rad,
              `gear_${(gearIndex + 1).toString().padStart(2, '0')}`,
              'standard',
              `Branch Cog ${gearIndex + 1}`,
              true,
              false,
              cfg.angle,
              nodes,
              isLock,
              isDir ? { directional: true, allowedDirection: 'clockwise' } : undefined,
              isHvy ? 'heavy' : isLock ? 'brass' : 'steel'
            );

            if (!newNode) {
              success = false;
              break;
            }

            nodes.push(newNode);
            branchParent = newNode;
            gearIndex++;
          }

          if (!success) break;

          // Target gear
          const tRad = targetRadii[b];
          const targetNode = placeChildGear(
            branchParent,
            tRad,
            `target_${(b + 1).toString().padStart(2, '0')}`,
            'fixed',
            `Kinetic Output ${b + 1}`,
            false,
            true,
            cfg.angle,
            nodes,
            false,
            undefined,
            'brass'
          );

          if (!targetNode) {
            success = false;
            break;
          }

          nodes.push(targetNode);
        }
      }
    }

    if (
      success &&
      nodes.filter((n) => n.movable).length === movableCount &&
      nodes.filter((n) => n.target).length === targetCount
    ) {
      const gears: GearData[] = nodes.map((n) => ({
        id: n.id,
        type: n.type,
        name: n.name,
        x: n.x,
        y: n.y,
        radius: n.radius,
        teeth: getTeeth(n.radius),
        rotation: 0,
        rotationSpeed: 1,
        movable: n.movable,
        powered: n.powered,
        target: n.target,
        locked: !!n.locked,
        snapDistance: 50,
        specialProperties: n.specialProperties,
        material: (n.material as any) || 'steel',
      }));

      const movableGears = gears.filter((g) => g.movable);
      arrangeTrayGears(movableGears);

      const solutionPlacements: SolutionPlacement[] = nodes
        .filter((n) => n.movable)
        .map((n) => ({
          gearId: n.id,
          x: n.x,
          y: n.y,
        }));

      const targets: TargetRequirement[] = nodes
        .filter((n) => n.target)
        .map((tn) => ({
          id: `req_${tn.id}`,
          gearId: tn.id,
          required: true,
          mustRotate: true,
          requiredDirection: 'any',
        }));

      const obstacles: ObstacleData[] = [];
      const obstacleCount = spec.obstacles || 0;
      if (obstacleCount > 0) {
        const candidateObstacles = [
          { x: 380, y: 70, width: 30, height: 70 },
          { x: 620, y: 410, width: 30, height: 60 },
          { x: 780, y: 70, width: 30, height: 70 },
          { x: 260, y: 410, width: 30, height: 60 },
          { x: 940, y: 70, width: 30, height: 70 },
          { x: 500, y: 240, width: 25, height: 25 },
          { x: 860, y: 410, width: 30, height: 60 },
          { x: 160, y: 70, width: 25, height: 65 },
        ];

        let placedObs = 0;
        for (const obs of candidateObstacles) {
          if (placedObs >= obstacleCount) break;

          let collides = false;
          for (const n of nodes) {
            if (
              checkObstacleCollision(
                { x: n.x, y: n.y, radius: n.radius + 15 },
                { ...obs, id: 'temp', type: 'barrier', collision: true, visible: true }
              )
            ) {
              collides = true;
              break;
            }
          }
          if (!collides) {
            for (const mg of movableGears) {
              if (
                checkObstacleCollision(
                  { x: mg.x, y: mg.y, radius: mg.radius + 15 },
                  { ...obs, id: 'temp', type: 'barrier', collision: true, visible: true }
                )
              ) {
                collides = true;
                break;
              }
            }
          }

          if (!collides) {
            obstacles.push({
              id: `obs_${placedObs + 1}`,
              x: obs.x,
              y: obs.y,
              width: obs.width,
              height: obs.height,
              type: 'barrier',
              collision: true,
              visible: true,
            });
            placedObs++;
          }
        }
      }

      const baseScore = isBoss ? 3000 : 1000 + spec.world * 150;
      const moveMultiplier = isBoss ? 100 : 50;

      const levelData: LevelData = {
        id: spec.id,
        worldId: spec.world,
        levelNumber: ((spec.id - 1) % 10) + 1,
        name: spec.name,
        difficulty: spec.difficulty,
        concept: spec.concept,
        isWorldBoss: isBoss,
        board: {
          width: 1200,
          height: 700,
          gridSize: 25,
          snapToGrid: true,
        },
        rules: {
          timed: true,
          timeLimit: spec.timeLimit,
          allowUndo: true,
          allowReset: true,
          allowHints: true,
          allowPause: true,
        },
        gears,
        obstacles,
        targets,
        solution: {
          minimumMoves: spec.minimumMoves,
          multipleSolutions: false,
          placements: solutionPlacements,
          connectionOrder: nodes.map((n) => n.id),
        },
        scoring: {
          baseScore,
          timeMultiplier: 10,
          moveMultiplier,
          invalidPlacementPenalty: 25,
          hintPenalty: 100,
        },
        stars: {
          three: {
            maxMoves: spec.minimumMoves,
            minimumTimeRemaining: Math.floor(spec.timeLimit * 0.4),
            maxHints: 0,
          },
          two: {
            maxMoves: spec.minimumMoves + 2,
            minimumTimeRemaining: Math.floor(spec.timeLimit * 0.2),
          },
          one: {
            completionRequired: true,
          },
        },
        hints: [
          {
            id: 1,
            type: 'highlightGear',
            gearId: movableGears[0]?.id || 'gear_01',
            text: `Inspect the mechanical requirements for ${spec.name}. Select a transfer gear from the assembly tray.`,
          },
          {
            id: 2,
            type: 'ghostPlacement',
            gearId: solutionPlacements[0]?.gearId || 'gear_01',
            targetX: solutionPlacements[0]?.x || 300,
            targetY: solutionPlacements[0]?.y || 250,
            text: `Snap the transfer cog into tangent alignment with the driving gear.`,
          },
          {
            id: 3,
            type: 'connectionPath',
            text: `Complete the kinetic train to synchronize all ${targetCount} output mechanisms.`,
          },
        ],
        metadata: {
          tutorial: spec.difficulty === 'tutorial',
          dailyEligible: true,
          challengeEligible: true,
          tags: [spec.concept, spec.difficulty, isBoss ? 'world_boss' : 'standard'],
          description: isBoss
            ? `WORLD BOSS: Master this climactic mechanism to conquer World ${spec.world}.`
            : `Synchronize kinetic power according to the '${spec.concept.replace(/_/g, ' ')}' principle.`,
        },
      };

      const report = validateLevel(levelData);
      if (report.isValid && report.solutionSolvesLevel) {
        return levelData;
      } else {
        if (spec.id === 100 && attempt === 0) {
          console.log('L100 attempt 0 failed validation:', report.errors);
        }
      }
    } else {
      if (spec.id === 100 && attempt === 0) {
        console.log('L100 attempt 0 failed to place nodes:', {
          success,
          movable: nodes.filter((n) => n.movable).length,
          target: nodes.filter((n) => n.target).length,
          totalNodes: nodes.length,
        });
      }
    }
  }

  return null;
}
