import React, { useRef, useEffect, useCallback } from 'react';
import { RuntimeGear, ObstacleData, LevelHint, BoardConfig } from '../types';
import { sound } from '../engine/audio';

interface GearCanvasProps {
  board: BoardConfig;
  gears: RuntimeGear[];
  obstacles: ObstacleData[];
  selectedGearId: string | null;
  activeHint: LevelHint | null;
  hasJam: boolean;
  onSelectGear: (gearId: string | null) => void;
  onMoveGear: (gearId: string, x: number, y: number) => void;
  onReleaseGear: (gearId: string, x: number, y: number) => void;
  highContrast?: boolean;
  reducedAnimation?: boolean;
}

/**
 * Pre-renders the static body of a gear (teeth, rim, spokes, hub, bevels) onto an offscreen canvas.
 * This hardware-accelerates rendering on Android tablets and eliminates GPU fillrate choking.
 */
function renderGearToSprite(
  gear: RuntimeGear,
  highContrast: boolean
): { canvas: HTMLCanvasElement; size: number; center: number } {
  const r = gear.radius;
  const teeth = gear.teeth;
  const toothHeight = Math.max(8, r * 0.18);
  const outerR = r + toothHeight * 0.5;
  const innerR = r - toothHeight * 0.5;

  // 2x supersampling for crisp display on high-DPI screens without GPU cost
  const scale = 2;
  const padding = 16;
  const logicalSize = Math.ceil((outerR + padding) * 2);
  const size = logicalSize * scale;
  const center = size / 2;

  const offscreen = document.createElement('canvas');
  offscreen.width = size;
  offscreen.height = size;
  const ctx = offscreen.getContext('2d');
  if (!ctx) return { canvas: offscreen, size: logicalSize, center: logicalSize / 2 };

  ctx.scale(scale, scale);
  const logicalCenter = logicalSize / 2;
  ctx.translate(logicalCenter, logicalCenter);

  // Color schemes
  let outerColor = '#64748b'; // steel
  let innerColor = '#475569';
  let spokeColor = '#334155';
  let hubColor = '#1e293b';
  let rimHighlight = '#94a3b8';

  if (highContrast) {
    outerColor = '#94a3b8';
    innerColor = '#64748b';
    spokeColor = '#475569';
    hubColor = '#1e293b';
    rimHighlight = '#ffffff';
  } else if (gear.material === 'brass' || gear.type === 'small') {
    outerColor = '#d97706';
    innerColor = '#b45309';
    spokeColor = '#78350f';
    hubColor = '#451a03';
    rimHighlight = '#fde68a';
  } else if (gear.material === 'copper' || gear.type === 'large') {
    outerColor = '#ea580c';
    innerColor = '#c2410c';
    spokeColor = '#9a3412';
    hubColor = '#431407';
    rimHighlight = '#fed7aa';
  } else if (gear.type === 'powered') {
    outerColor = '#0284c7';
    innerColor = '#0369a1';
    spokeColor = '#075985';
    hubColor = '#0c4a6e';
    rimHighlight = '#7dd3fc';
  } else if (gear.target) {
    outerColor = '#b45309';
    innerColor = '#92400e';
    spokeColor = '#78350f';
    hubColor = '#451a03';
    rimHighlight = '#fcd34d';
  }

  // 1. Draw gear teeth perimeter
  ctx.beginPath();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a0 = i * step;
    const a1 = a0 + step * 0.28;
    const a2 = a0 + step * 0.45;
    const a3 = a0 + step * 0.73;
    const a4 = a0 + step;

    ctx.lineTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
    ctx.lineTo(Math.cos(a1) * outerR, Math.sin(a1) * outerR);
    ctx.lineTo(Math.cos(a2) * outerR, Math.sin(a2) * outerR);
    ctx.lineTo(Math.cos(a3) * innerR, Math.sin(a3) * innerR);
    ctx.lineTo(Math.cos(a4) * innerR, Math.sin(a4) * innerR);
  }
  ctx.closePath();

  // Metallic gradient
  const grad = ctx.createLinearGradient(-r, -r, r, r);
  grad.addColorStop(0, rimHighlight);
  grad.addColorStop(0.3, outerColor);
  grad.addColorStop(0.7, innerColor);
  grad.addColorStop(1, rimHighlight);

  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = innerColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 2. Inner rim cutout (dark chamber)
  const rimCutoutR = r * 0.72;
  ctx.beginPath();
  ctx.arc(0, 0, rimCutoutR, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.strokeStyle = outerColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  // 3. Cutout Spokes
  const spokeCount = teeth <= 14 ? 3 : teeth <= 18 ? 4 : 5;
  const spokeAngle = (Math.PI * 2) / spokeCount;
  const spokeWidth = Math.max(6, r * 0.16);

  ctx.strokeStyle = grad;
  ctx.lineWidth = spokeWidth;
  ctx.lineCap = 'round';
  for (let s = 0; s < spokeCount; s++) {
    const angle = s * spokeAngle;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * rimCutoutR, Math.sin(angle) * rimCutoutR);
    ctx.stroke();
  }

  // 4. Center Hub
  const hubR = Math.max(16, r * 0.38);
  ctx.beginPath();
  ctx.arc(0, 0, hubR, 0, Math.PI * 2);
  const hubGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, hubR);
  hubGrad.addColorStop(0, rimHighlight);
  hubGrad.addColorStop(0.5, outerColor);
  hubGrad.addColorStop(1, hubColor);
  ctx.fillStyle = hubGrad;
  ctx.fill();
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 5. Center Shaft / Pin
  ctx.beginPath();
  ctx.arc(0, 0, hubR * 0.42, 0, Math.PI * 2);
  ctx.fillStyle = '#090d13';
  ctx.fill();
  ctx.strokeStyle = rimHighlight;
  ctx.lineWidth = 1;
  ctx.stroke();

  // 6. Rivets around the rim
  const rivetR = (rimCutoutR + r) / 2;
  const rivetCount = Math.min(teeth, 8);
  ctx.fillStyle = rimHighlight;
  for (let rv = 0; rv < rivetCount; rv++) {
    const rvAngle = (rv * Math.PI * 2) / rivetCount;
    ctx.beginPath();
    ctx.arc(Math.cos(rvAngle) * rivetR, Math.sin(rvAngle) * rivetR, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 7. Fixed Gear Mounting Flange
  if (!gear.movable && gear.type !== 'powered') {
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.strokeRect(-hubR * 0.25, -hubR * 0.25, hubR * 0.5, hubR * 0.5);
  }

  return { canvas: offscreen, size: logicalSize, center: logicalCenter };
}

export const GearCanvas: React.FC<GearCanvasProps> = ({
  board,
  gears,
  obstacles,
  selectedGearId,
  activeHint,
  hasJam,
  onSelectGear,
  onMoveGear,
  onReleaseGear,
  highContrast = false,
  reducedAnimation = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Smooth persistent rotation tracking: survives React re-renders without jerking
  const rotationsRef = useRef<Map<string, number>>(new Map());

  // Hardware-accelerated sprite cache for gears
  const spriteCacheRef = useRef<
    Map<string, { canvas: HTMLCanvasElement; size: number; center: number }>
  >(new Map());

  // Cached layout metrics to avoid DOM layout thrashing during 60fps render and touch drag
  const layoutRef = useRef({
    cssW: 800,
    cssH: 600,
    dpr: 1,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    left: 0,
    top: 0,
  });

  // Sound throttle during dragging
  const lastDragSoundRef = useRef<number>(0);

  // Store latest props in ref so animation loop doesn't restart
  const propsRef = useRef({
    board,
    gears,
    obstacles,
    selectedGearId,
    activeHint,
    hasJam,
    reducedAnimation,
    highContrast,
  });
  propsRef.current = {
    board,
    gears,
    obstacles,
    selectedGearId,
    activeHint,
    hasJam,
    reducedAnimation,
    highContrast,
  };

  // Dragging state tracking
  const dragRef = useRef<{
    gearId: string;
    pointerId: number;
    offsetX: number;
    offsetY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Fast mathematical coordinate conversion (zero DOM queries during drag)
  const clientToBoard = useCallback((clientX: number, clientY: number) => {
    const { left, top, offsetX, offsetY, scale } = layoutRef.current;
    if (scale <= 0) return { x: 0, y: 0 };
    const canvasX = clientX - left;
    const canvasY = clientY - top;
    const x = (canvasX - offsetX) / scale;
    const y = (canvasY - offsetY) / scale;
    return { x, y };
  }, []);

  // Update layout metrics without triggering ResizeObserver feedback loops
  const updateLayoutMetrics = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const rect = container.getBoundingClientRect();
    const cssW = Math.floor(rect.width);
    const cssH = Math.floor(rect.height);
    if (cssW <= 0 || cssH <= 0) return;

    // Cap DPR at 1.5 to prevent mobile GPU fillrate choking on Android tablet screens
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const targetW = Math.round(cssW * dpr);
    const targetH = Math.round(cssH * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const b = propsRef.current.board;
    const scaleX = cssW / b.width;
    const scaleY = cssH / b.height;
    const scale = Math.min(scaleX, scaleY);
    const renderedWidth = b.width * scale;
    const renderedHeight = b.height * scale;
    const offsetX = (cssW - renderedWidth) / 2;
    const offsetY = (cssH - renderedHeight) / 2;

    layoutRef.current = {
      cssW,
      cssH,
      dpr,
      scale,
      offsetX,
      offsetY,
      left: rect.left,
      top: rect.top,
    };
  }, []);

  // Set up resize observer and window resize listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    updateLayoutMetrics();

    let resizeTimer: number | null = null;
    const debouncedUpdate = () => {
      if (resizeTimer) cancelAnimationFrame(resizeTimer);
      resizeTimer = requestAnimationFrame(updateLayoutMetrics);
    };

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (
          Math.abs(width - layoutRef.current.cssW) >= 1 ||
          Math.abs(height - layoutRef.current.cssH) >= 1
        ) {
          debouncedUpdate();
        }
      }
    });

    ro.observe(container);
    window.addEventListener('resize', debouncedUpdate);
    window.addEventListener('orientationchange', debouncedUpdate);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', debouncedUpdate);
      window.removeEventListener('orientationchange', debouncedUpdate);
      if (resizeTimer) cancelAnimationFrame(resizeTimer);
    };
  }, [updateLayoutMetrics]);

  // Non-passive touch cancellation to eliminate touch scroll lag on Android Chrome
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventTouchGestures = (e: TouchEvent) => {
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    canvas.addEventListener('touchstart', preventTouchGestures, { passive: false });
    canvas.addEventListener('touchmove', preventTouchGestures, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', preventTouchGestures);
      canvas.removeEventListener('touchmove', preventTouchGestures);
    };
  }, []);

  // Main 60FPS / 120FPS Render Loop
  const render = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { cssW, cssH, dpr, scale, offsetX, offsetY } = layoutRef.current;
    if (cssW <= 0 || cssH <= 0) return;

    // Smooth delta time calculation clamped to avoid stutters after backgrounding
    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp;
    }
    const rawDt = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;
    const dt = Math.max(0.001, Math.min(rawDt, 0.15));

    const {
      board,
      gears,
      obstacles,
      selectedGearId,
      activeHint,
      hasJam,
      reducedAnimation,
      highContrast,
    } = propsRef.current;

    // Smooth rotational integration
    if (!reducedAnimation) {
      for (const gear of gears) {
        if (gear.isPowered && !gear.isJam) {
          const rotSpeed = (gear.angularVelocity || 1.0) * 1.6;
          let rot =
            (rotationsRef.current.get(gear.id) ?? gear.currentRotation ?? 0) + rotSpeed * dt;
          if (rot >= Math.PI * 2) rot -= Math.PI * 2;
          else if (rot < 0) rot += Math.PI * 2;
          rotationsRef.current.set(gear.id, rot);
          gear.currentRotation = rot;
        }
      }
    }

    // Set pixel density transform
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear entire viewport
    ctx.fillStyle = '#0c1017';
    ctx.fillRect(0, 0, cssW, cssH);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // 1. Draw Board Chassis & Blueprint Grid
    ctx.fillStyle = '#111722';
    ctx.fillRect(0, 0, board.width, board.height);

    // Grid lines
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.28)';
    ctx.lineWidth = 1;
    const gridStep = board.gridSize || 25;
    ctx.beginPath();
    for (let x = 0; x <= board.width; x += gridStep) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, board.height);
    }
    for (let y = 0; y <= board.height; y += gridStep) {
      ctx.moveTo(0, y);
      ctx.lineTo(board.width, y);
    }
    ctx.stroke();

    // Major coordinate grid lines every 100px
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x <= board.width; x += 100) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, board.height);
    }
    for (let y = 0; y <= board.height; y += 100) {
      ctx.moveTo(0, y);
      ctx.lineTo(board.width, y);
    }
    ctx.stroke();

    // Staging / Inventory Tray divider
    const stagingY = 520;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, stagingY, board.width, board.height - stagingY);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 6]);
    ctx.beginPath();
    ctx.moveTo(0, stagingY);
    ctx.lineTo(board.width, stagingY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Staging Tray Label
    ctx.font = '600 12px Rajdhani, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.fillText('ASSEMBLY INVENTORY TRAY', 24, stagingY + 24);

    // Chassis Outer Border
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, board.width - 4, board.height - 4);

    // Corner Brackets
    const cbSize = 24;
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, cbSize, cbSize);
    ctx.strokeRect(board.width - cbSize - 4, 4, cbSize, cbSize);
    ctx.strokeRect(4, board.height - cbSize - 4, cbSize, cbSize);
    ctx.strokeRect(board.width - cbSize - 4, board.height - cbSize - 4, cbSize, cbSize);

    // 2. Draw Obstacles
    for (const obs of obstacles) {
      if (!obs.visible) continue;
      ctx.save();
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

      // Hazard stripes
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.lineWidth = 3;
      for (let i = -obs.height; i < obs.width + obs.height; i += 16) {
        ctx.beginPath();
        ctx.moveTo(obs.x + i, obs.y);
        ctx.lineTo(obs.x + i + 12, obs.y + obs.height);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. Draw Hint Ghost Placements
    if (activeHint && activeHint.targetX !== undefined && activeHint.targetY !== undefined) {
      const hintGear = gears.find((g) => g.id === activeHint.gearId);
      const r = hintGear ? hintGear.radius : 60;
      ctx.save();
      ctx.translate(activeHint.targetX, activeHint.targetY);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.restore();
    }

    // 4. Draw Gears: Hardware Accelerated Sprites with Crisp Shadows
    const currentDrag = dragRef.current;

    const renderSingleGear = (gear: RuntimeGear, isDragging: boolean, isSelected: boolean) => {
      const gx = isDragging && currentDrag ? currentDrag.currentX : gear.currentX;
      const gy = isDragging && currentDrag ? currentDrag.currentY : gear.currentY;
      const rot = rotationsRef.current.get(gear.id) ?? gear.currentRotation ?? 0;
      const isHinted = activeHint?.gearId === gear.id;

      // 4a. Fast GPU-friendly drop shadow without expensive Skia Gaussian blur
      ctx.beginPath();
      if (isDragging || isSelected) {
        ctx.arc(gx + 5, gy + 9, gear.radius + 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      } else {
        ctx.arc(gx + 3, gy + 4, gear.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      }
      ctx.fill();

      // 4b. Draw Pre-rendered Gear Sprite
      const cacheKey = `${gear.teeth}_${gear.radius}_${gear.material}_${gear.type}_${gear.target ? '1' : '0'}_${gear.movable ? '1' : '0'}_${highContrast ? '1' : '0'}`;
      let spriteData = spriteCacheRef.current.get(cacheKey);
      if (!spriteData) {
        spriteData = renderGearToSprite(gear, highContrast);
        spriteCacheRef.current.set(cacheKey, spriteData);
      }

      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(rot);
      ctx.drawImage(
        spriteData.canvas,
        -spriteData.center,
        -spriteData.center,
        spriteData.size,
        spriteData.size
      );
      ctx.restore();

      // 4c. Dynamic Powered Core Glow / Indicator
      const hubR = Math.max(16, gear.radius * 0.38);
      if (gear.type === 'powered') {
        ctx.save();
        ctx.translate(gx, gy);
        const pulse = 0.85 + 0.15 * Math.sin(timestamp * 0.006);
        ctx.beginPath();
        ctx.arc(0, 0, hubR * 0.55 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();

        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-hubR * 0.3, 0);
        ctx.lineTo(hubR * 0.3, 0);
        ctx.moveTo(0, -hubR * 0.3);
        ctx.lineTo(0, hubR * 0.3);
        ctx.stroke();
        ctx.restore();
      }

      // 4d. Dynamic Target Dynamo Lamp
      if (gear.target) {
        ctx.save();
        ctx.translate(gx, gy);
        ctx.beginPath();
        ctx.arc(0, 0, hubR * (gear.isPowered ? 0.6 : 0.45), 0, Math.PI * 2);
        ctx.fillStyle = gear.isPowered ? '#10b981' : '#475569';
        ctx.fill();
        ctx.restore();
      }

      // 4e. Selected / Hint ring in world space (unrotated)
      if (isSelected || isHinted || isDragging) {
        ctx.save();
        ctx.translate(gx, gy);
        ctx.beginPath();
        ctx.arc(0, 0, gear.radius + 12, 0, Math.PI * 2);
        ctx.lineWidth = 3;
        if (isSelected || isDragging) {
          ctx.strokeStyle = '#38bdf8';
          ctx.setLineDash([8, 6]);
        } else if (isHinted) {
          ctx.strokeStyle = '#f59e0b';
          ctx.setLineDash([6, 4]);
        }
        ctx.stroke();
        ctx.restore();
      }

      // 4f. Direction Indicator Arrow when rotating
      if (gear.isPowered && Math.abs(gear.angularVelocity) > 0.01) {
        ctx.save();
        ctx.translate(gx, gy);
        const arrowR = gear.radius * 0.55;
        const cw = gear.angularVelocity > 0;
        ctx.strokeStyle = gear.target ? '#34d399' : '#7dd3fc';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, arrowR, 0, Math.PI * 0.6, !cw);
        ctx.stroke();
        ctx.restore();
      }
    };

    // Draw non-dragging gears first
    for (const g of gears) {
      if (currentDrag && g.id === currentDrag.gearId) continue;
      renderSingleGear(g, false, g.id === selectedGearId);
    }

    // Draw actively dragged gear on top
    if (currentDrag) {
      const draggedGear = gears.find((g) => g.id === currentDrag.gearId);
      if (draggedGear) {
        renderSingleGear(draggedGear, true, true);
      }
    }

    // 5. Draw Jam Alert Warning
    if (hasJam) {
      ctx.fillStyle = 'rgba(220, 38, 38, 0.15)';
      ctx.fillRect(0, 0, board.width, board.height);
      ctx.font = 'bold 18px Rajdhani, system-ui, sans-serif';
      ctx.fillStyle = '#ef4444';
      ctx.textAlign = 'center';
      ctx.fillText('MECHANICAL CONFLICT DETECTED - GEAR JAM', board.width / 2, 48);
      ctx.textAlign = 'left';
    }

    ctx.restore();
  }, []);

  // Continuous animation frame loop
  useEffect(() => {
    let isRunning = true;
    const loop = (timestamp: number) => {
      if (!isRunning) return;
      render(timestamp);
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [render]);

  // Touch / Pointer Down
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if unsupported
    }
    const { x, y } = clientToBoard(e.clientX, e.clientY);
    const currentGears = propsRef.current.gears;

    // Touch-tolerant selection radius (minimum 52px hit box for fingers on tablets)
    let clickedGear: RuntimeGear | null = null;
    for (let i = currentGears.length - 1; i >= 0; i--) {
      const g = currentGears[i];
      const dist = Math.hypot(x - g.currentX, y - g.currentY);
      const hitRadius = Math.max(g.radius + 20, 52);
      if (dist <= hitRadius) {
        clickedGear = g;
        break;
      }
    }

    if (clickedGear) {
      onSelectGear(clickedGear.id);
      sound.playGearSelect();

      if (clickedGear.movable && !clickedGear.locked) {
        dragRef.current = {
          gearId: clickedGear.id,
          pointerId: e.pointerId,
          offsetX: x - clickedGear.currentX,
          offsetY: y - clickedGear.currentY,
          currentX: clickedGear.currentX,
          currentY: clickedGear.currentY,
        };
      }
    } else {
      onSelectGear(null);
    }
  };

  // Touch / Pointer Move (Ultra-smooth, zero layout thrashing)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    const { x, y } = clientToBoard(e.clientX, e.clientY);

    dragRef.current.currentX = x - dragRef.current.offsetX;
    dragRef.current.currentY = y - dragRef.current.offsetY;

    // Throttle drag audio ticks
    const now = performance.now();
    if (now - lastDragSoundRef.current > 110) {
      lastDragSoundRef.current = now;
      sound.playGearDrag();
    }
  };

  // Touch / Pointer Up
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    const { gearId, currentX, currentY } = dragRef.current;
    dragRef.current = null;

    onReleaseGear(gearId, currentX, currentY);
  };

  return (
    <div
      ref={containerRef}
      id="gear-canvas-container"
      className="relative w-full h-full overflow-hidden select-none touch-none bg-[#0c1017]"
    >
      <canvas
        ref={canvasRef}
        id="gearworks-main-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="absolute inset-0 block cursor-grab active:cursor-grabbing touch-none select-none"
        style={{
          width: '100%',
          height: '100%',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          willChange: 'transform',
        }}
      />
    </div>
  );
};
