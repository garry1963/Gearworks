import { GearData, RuntimeGear, ObstacleData } from '../types';

export const MESH_TOLERANCE = 14; // allowable variance in px for two gears to mesh
export const COLLISION_MARGIN = 12; // if closer than sum of radii minus this, gears collide illegally

/**
 * Calculates Euclidean distance between two points
 */
export function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

/**
 * Determines if two gears are physically meshed
 */
export function areGearsMeshed(
  g1: { x: number; y: number; radius: number },
  g2: { x: number; y: number; radius: number },
  toleranceMultiplier = 1.0
): boolean {
  const dist = getDistance(g1.x, g1.y, g2.x, g2.y);
  const idealDist = g1.radius + g2.radius;
  const tolerance = MESH_TOLERANCE * toleranceMultiplier;
  return Math.abs(dist - idealDist) <= tolerance;
}

/**
 * Determines if two gears are colliding illegally (overlapping too deeply)
 */
export function areGearsColliding(
  g1: { x: number; y: number; radius: number },
  g2: { x: number; y: number; radius: number }
): boolean {
  const dist = getDistance(g1.x, g1.y, g2.x, g2.y);
  const minAllowed = g1.radius + g2.radius - COLLISION_MARGIN;
  return dist < minAllowed;
}

/**
 * Checks if a point/gear collides with a rectangular obstacle
 */
export function checkObstacleCollision(
  gear: { x: number; y: number; radius: number },
  obstacle: ObstacleData
): boolean {
  if (!obstacle.collision) return false;
  // Rect bounds
  const closestX = Math.max(obstacle.x, Math.min(gear.x, obstacle.x + obstacle.width));
  const closestY = Math.max(obstacle.y, Math.min(gear.y, obstacle.y + obstacle.height));
  const distance = getDistance(gear.x, gear.y, closestX, closestY);
  return distance < gear.radius;
}

/**
 * Finds the best legal snap position for a moving gear among stationary/other placed gears
 */
export function findSnapPosition(
  movingGear: RuntimeGear,
  targetX: number,
  targetY: number,
  allGears: RuntimeGear[],
  obstacles: ObstacleData[],
  boardWidth: number,
  boardHeight: number,
  snapSensitivity = 1.0
): { x: number; y: number; snapped: boolean; snappedToId?: string } {
  const maxSnapSearchDist = (movingGear.snapDistance || 50) * snapSensitivity;
  let bestCandidate: { x: number; y: number; dist: number; gearId: string } | null = null;

  // Search candidate gears that movingGear could snap to
  for (const other of allGears) {
    if (other.id === movingGear.id) continue;
    // We only snap to gears on the board (not dragging)
    if (other.isDragging) continue;

    const dx = targetX - other.currentX;
    const dy = targetY - other.currentY;
    const centerDist = Math.hypot(dx, dy);
    const idealDist = movingGear.radius + other.radius;

    // Is the drag position close to a tangent circle around the other gear?
    const radialError = Math.abs(centerDist - idealDist);
    if (radialError < maxSnapSearchDist) {
      if (centerDist === 0) continue;

      // Project onto the exact ideal radius ring along the angle
      const angle = Math.atan2(dy, dx);
      // Snap to neat angles (e.g. 15 or 30 degrees or straight / 45 deg) if very close
      const snapX = Math.round(other.currentX + Math.cos(angle) * idealDist);
      const snapY = Math.round(other.currentY + Math.sin(angle) * idealDist);

      // Check if this snap candidate is within board bounds
      const margin = movingGear.radius + 10;
      if (
        snapX < margin ||
        snapX > boardWidth - margin ||
        snapY < margin ||
        snapY > boardHeight - margin
      ) {
        continue;
      }

      // Check if this candidate illegally collides with any other gear
      let collidesWithOthers = false;
      for (const checkGear of allGears) {
        if (checkGear.id === movingGear.id || checkGear.id === other.id) continue;
        if (checkGear.isDragging) continue;

        if (
          areGearsColliding(
            { x: snapX, y: snapY, radius: movingGear.radius },
            { x: checkGear.currentX, y: checkGear.currentY, radius: checkGear.radius }
          )
        ) {
          collidesWithOthers = true;
          break;
        }
      }

      // Check obstacles
      if (!collidesWithOthers) {
        for (const obs of obstacles) {
          if (checkObstacleCollision({ x: snapX, y: snapY, radius: movingGear.radius }, obs)) {
            collidesWithOthers = true;
            break;
          }
        }
      }

      if (!collidesWithOthers) {
        const distFromTarget = Math.hypot(snapX - targetX, snapY - targetY);
        if (!bestCandidate || distFromTarget < bestCandidate.dist) {
          bestCandidate = {
            x: snapX,
            y: snapY,
            dist: distFromTarget,
            gearId: other.id,
          };
        }
      }
    }
  }

  if (bestCandidate && bestCandidate.dist <= maxSnapSearchDist) {
    return {
      x: bestCandidate.x,
      y: bestCandidate.y,
      snapped: true,
      snappedToId: bestCandidate.gearId,
    };
  }

  return { x: targetX, y: targetY, snapped: false };
}
