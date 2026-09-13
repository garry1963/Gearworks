import { RuntimeGear, TargetRequirement } from '../types';
import { areGearsMeshed } from './gearPhysics';

export interface ConnectionResult {
  isLevelComplete: boolean;
  poweredCount: number;
  targetsSatisfied: number;
  totalTargets: number;
  hasJam: boolean;
  updatedGears: RuntimeGear[];
  activeConnections: [string, string][];
}

/**
 * Calculates complete gear network connectivity, power propagation, and target satisfaction
 */
export function calculateConnections(
  gears: RuntimeGear[],
  targets: TargetRequirement[]
): ConnectionResult {
  const updatedGears: RuntimeGear[] = gears.map((g) => ({
    ...g,
    isPowered: false,
    isMeshed: false,
    isJam: false,
    angularVelocity: 0,
    connectedTo: [],
  }));

  const gearMap = new Map<string, RuntimeGear>();
  for (const g of updatedGears) {
    gearMap.set(g.id, g);
  }

  // 1. Build adjacency list of physically meshed gears
  const adj = new Map<string, string[]>();
  for (const g of updatedGears) {
    adj.set(g.id, []);
  }

  const activeConnections: [string, string][] = [];

  for (let i = 0; i < updatedGears.length; i++) {
    for (let j = i + 1; j < updatedGears.length; j++) {
      const g1 = updatedGears[i];
      const g2 = updatedGears[j];

      // If either gear is actively being dragged, don't establish physical mesh connection yet
      if (g1.isDragging || g2.isDragging) continue;

      if (
        areGearsMeshed(
          { x: g1.currentX, y: g1.currentY, radius: g1.radius },
          { x: g2.currentX, y: g2.currentY, radius: g2.radius }
        )
      ) {
        adj.get(g1.id)!.push(g2.id);
        adj.get(g2.id)!.push(g1.id);
        g1.connectedTo.push(g2.id);
        g2.connectedTo.push(g1.id);
        g1.isMeshed = true;
        g2.isMeshed = true;
        activeConnections.push([g1.id, g2.id]);
      }
    }
  }

  // 2. Traverse power from powered gear(s)
  const poweredStarters = updatedGears.filter((g) => g.powered);
  const visited = new Set<string>();
  const queue: string[] = [];
  let hasJam = false;

  for (const starter of poweredStarters) {
    starter.isPowered = true;
    starter.angularVelocity = starter.rotationSpeed || 1.0;
    visited.add(starter.id);
    queue.push(starter.id);
  }

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentGear = gearMap.get(currentId)!;
    const neighbors = adj.get(currentId) || [];

    for (const neighborId of neighbors) {
      const neighbor = gearMap.get(neighborId)!;
      // Direction alternates: omegaNeighbor = -omegaCurrent * (teethCurrent / teethNeighbor)
      const calculatedOmega =
        -currentGear.angularVelocity * (currentGear.teeth / neighbor.teeth);

      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        neighbor.isPowered = true;
        neighbor.angularVelocity = calculatedOmega;
        queue.push(neighborId);
      } else {
        // Already visited: verify there is no direction conflict (jam)
        const currentSign = Math.sign(neighbor.angularVelocity);
        const expectedSign = Math.sign(calculatedOmega);
        if (currentSign !== 0 && expectedSign !== 0 && currentSign !== expectedSign) {
          hasJam = true;
          neighbor.isJam = true;
          currentGear.isJam = true;
        }
      }
    }
  }

  // If there's a jam, gears cannot rotate freely
  if (hasJam) {
    for (const g of updatedGears) {
      if (g.isPowered && !g.powered) {
        // Freeze non-motor gears during a mechanical jam
        g.angularVelocity = 0;
      }
    }
  }

  // 3. Evaluate target goals
  let targetsSatisfied = 0;
  const totalTargets = targets.length;

  for (const target of targets) {
    const gear = gearMap.get(target.gearId);
    if (!gear) continue;

    let satisfied = gear.isPowered && !hasJam;

    if (target.mustRotate && Math.abs(gear.angularVelocity) < 0.001) {
      satisfied = false;
    }

    if (target.requiredDirection && target.requiredDirection !== 'any') {
      const isClockwise = gear.angularVelocity > 0;
      if (target.requiredDirection === 'clockwise' && !isClockwise) {
        satisfied = false;
      } else if (target.requiredDirection === 'counter-clockwise' && isClockwise) {
        satisfied = false;
      }
    }

    if (satisfied) {
      targetsSatisfied++;
    }
  }

  const isLevelComplete =
    totalTargets > 0 && targetsSatisfied === totalTargets && !hasJam;
  const poweredCount = updatedGears.filter((g) => g.isPowered).length;

  return {
    isLevelComplete,
    poweredCount,
    targetsSatisfied,
    totalTargets,
    hasJam,
    updatedGears,
    activeConnections,
  };
}
