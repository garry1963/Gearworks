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
  const lastTimeRef = useRef<number>(performance.now());

  // Store latest props in ref to prevent render loop restarts
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

  // Convert screen/client coordinates to board logical coordinates
  const clientToBoard = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };

    const b = propsRef.current.board;
    const scaleX = rect.width / b.width;
    const scaleY = rect.height / b.height;
    const scale = Math.min(scaleX, scaleY);
    const renderedWidth = b.width * scale;
    const renderedHeight = b.height * scale;
    const offsetX = (rect.width - renderedWidth) / 2;
    const offsetY = (rect.height - renderedHeight) / 2;

    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;
    const x = (canvasX - offsetX) / scale;
    const y = (canvasY - offsetY) / scale;
    return { x, y };
  }, []);

  // Draw tooth profiles and gear body
  const drawGear = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      gear: RuntimeGear,
      isSelected: boolean,
      isHinted: boolean,
      time: number
    ) => {
      ctx.save();
      ctx.translate(gear.currentX, gear.currentY);

      // Elevated shadow when dragging or selected
      if (gear.isDragging || isSelected) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetX = 6;
        ctx.shadowOffsetY = 12;
      } else {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 5;
      }

      // Rotate canvas for teeth
      ctx.rotate(gear.currentRotation);

      const r = gear.radius;
      const teeth = gear.teeth;
      const toothHeight = Math.max(8, r * 0.18);
      const outerR = r + toothHeight * 0.5;
      const innerR = r - toothHeight * 0.5;

      // Color scheme based on type / material
      let outerColor = '#64748b'; // steel
      let innerColor = '#475569';
      let spokeColor = '#334155';
      let hubColor = '#1e293b';
      let rimHighlight = '#94a3b8';

      if (gear.material === 'brass' || gear.type === 'small') {
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
        outerColor = gear.isPowered ? '#059669' : '#b45309';
        innerColor = gear.isPowered ? '#047857' : '#92400e';
        spokeColor = gear.isPowered ? '#065f46' : '#78350f';
        hubColor = gear.isPowered ? '#064e3b' : '#451a03';
        rimHighlight = gear.isPowered ? '#6ee7b7' : '#fcd34d';
      }

      if (gear.isJam) {
        outerColor = '#dc2626';
        innerColor = '#b91c1c';
        rimHighlight = '#fca5a5';
      }

      // Draw gear teeth perimeter
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

      // Reset shadows for inner details
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Inner rim cutout (dark chamber)
      const rimCutoutR = r * 0.72;
      ctx.beginPath();
      ctx.arc(0, 0, rimCutoutR, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = outerColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Cutout Spokes
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

      // Center Hub
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

      // Center Shaft / Pin
      ctx.beginPath();
      ctx.arc(0, 0, hubR * 0.42, 0, Math.PI * 2);
      ctx.fillStyle = '#090d13';
      ctx.fill();
      ctx.strokeStyle = rimHighlight;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Powered Core Glow / Indicator
      if (gear.type === 'powered') {
        const pulse = 0.8 + 0.2 * Math.sin(time * 0.006);
        ctx.beginPath();
        ctx.arc(0, 0, hubR * 0.55 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#0ea5e9';
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Drive motor coil lines
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-hubR * 0.3, 0);
        ctx.lineTo(hubR * 0.3, 0);
        ctx.moveTo(0, -hubR * 0.3);
        ctx.lineTo(0, hubR * 0.3);
        ctx.stroke();
      }

      // Target Dynamo Needle / Glow
      if (gear.target) {
        if (gear.isPowered) {
          ctx.beginPath();
          ctx.arc(0, 0, hubR * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = '#10b981';
          ctx.shadowColor = '#34d399';
          ctx.shadowBlur = 18;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          // Unpowered target indicator lamp
          ctx.beginPath();
          ctx.arc(0, 0, hubR * 0.45, 0, Math.PI * 2);
          ctx.fillStyle = '#334155';
          ctx.fill();
        }
      }

      // Rivets around the rim
      const rivetR = (rimCutoutR + r) / 2;
      const rivetCount = Math.min(teeth, 8);
      ctx.fillStyle = rimHighlight;
      for (let rv = 0; rv < rivetCount; rv++) {
        const rvAngle = (rv * Math.PI * 2) / rivetCount;
        ctx.beginPath();
        ctx.arc(Math.cos(rvAngle) * rivetR, Math.sin(rvAngle) * rivetR, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Fixed Gear Mounting Flange / Bolt
      if (!gear.movable && gear.type !== 'powered') {
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 3;
        ctx.strokeRect(-hubR * 0.25, -hubR * 0.25, hubR * 0.5, hubR * 0.5);
      }

      ctx.restore();

      // Draw Selected / Hint ring in world space (unrotated)
      if (isSelected || isHinted || gear.isDragging) {
        ctx.save();
        ctx.translate(gear.currentX, gear.currentY);
        ctx.beginPath();
        ctx.arc(0, 0, outerR + 6, 0, Math.PI * 2);
        ctx.lineWidth = 3;
        if (isSelected || gear.isDragging) {
          ctx.strokeStyle = '#38bdf8';
          ctx.setLineDash([8, 6]);
        } else if (isHinted) {
          ctx.strokeStyle = '#f59e0b';
          ctx.setLineDash([6, 4]);
        }
        ctx.stroke();
        ctx.restore();
      }

      // Direction Indicator Arrow when rotating
      if (gear.isPowered && Math.abs(gear.angularVelocity) > 0.01) {
        ctx.save();
        ctx.translate(gear.currentX, gear.currentY);
        const arrowR = r * 0.55;
        const cw = gear.angularVelocity > 0;
        ctx.strokeStyle = gear.target ? '#34d399' : '#7dd3fc';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, arrowR, 0, Math.PI * 0.6, !cw);
        ctx.stroke();
        ctx.restore();
      }
    },
    []
  );

  // Main render loop
  const render = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const dt = Math.min(0.1, (timestamp - lastTimeRef.current) / 1000);
      lastTimeRef.current = timestamp;

      const {
        board,
        gears,
        obstacles,
        selectedGearId,
        activeHint,
        hasJam,
        reducedAnimation,
      } = propsRef.current;

      // Update angular rotation based on velocity
      if (!reducedAnimation) {
        for (const gear of gears) {
          if (gear.isPowered && !gear.isJam) {
            const rotSpeed = (gear.angularVelocity || 1.0) * 1.6;
            gear.currentRotation += rotSpeed * dt;
          }
        }
      }

      const scaleX = rect.width / board.width;
      const scaleY = rect.height / board.height;
      const scale = Math.min(scaleX, scaleY);
      const renderedWidth = board.width * scale;
      const renderedHeight = board.height * scale;
      const offsetX = (rect.width - renderedWidth) / 2;
      const offsetY = (rect.height - renderedHeight) / 2;

      // Clear full canvas
      ctx.fillStyle = '#0c1017';
      ctx.fillRect(0, 0, rect.width, rect.height);

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      // 1. Draw Board Chassis & Blueprint Grid
      ctx.fillStyle = '#111722';
      ctx.fillRect(0, 0, board.width, board.height);

      // Precision Blueprint Grid
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.28)';
      ctx.lineWidth = 1;
      const step = board.gridSize || 25;
      ctx.beginPath();
      for (let x = 0; x <= board.width; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, board.height);
      }
      for (let y = 0; y <= board.height; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(board.width, y);
      }
      ctx.stroke();

      // Major coordinate crosshairs every 100px
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

      // Staging / Inventory Tray divider at bottom
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

      // Chassis Border & Rivets
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, board.width - 4, board.height - 4);

      // Draw Corner Brackets
      const cbSize = 24;
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3;
      // Top-Left
      ctx.strokeRect(4, 4, cbSize, cbSize);
      // Top-Right
      ctx.strokeRect(board.width - cbSize - 4, 4, cbSize, cbSize);
      // Bottom-Left
      ctx.strokeRect(4, board.height - cbSize - 4, cbSize, cbSize);
      // Bottom-Right
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

      // 4. Draw Gears: Non-dragging gears first, dragging gear on top
      const currentDrag = dragRef.current;
      for (const g of gears) {
        if (currentDrag && g.id === currentDrag.gearId) continue;
        const isSelected = g.id === selectedGearId;
        const isHinted = activeHint?.gearId === g.id;
        drawGear(ctx, g, isSelected, isHinted, timestamp);
      }

      if (currentDrag) {
        const draggedGear = gears.find((g) => g.id === currentDrag.gearId);
        if (draggedGear) {
          const draggingClone: RuntimeGear = {
            ...draggedGear,
            currentX: currentDrag.currentX,
            currentY: currentDrag.currentY,
            isDragging: true,
          };
          drawGear(ctx, draggingClone, true, false, timestamp);
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
    },
    [drawGear]
  );

  // Resize handler for Canvas devicePixelRatio without layout loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.max(1, Math.round(rect.width * dpr));
      const targetH = Math.max(1, Math.round(rect.height * dpr));

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    observer.observe(container);
    window.addEventListener('resize', handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Stable continuous animation frame loop (never stops or flickers)
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

  // Pointer / Touch Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Fallback if browser/platform pointer capture is unsupported
    }
    const { x, y } = clientToBoard(e.clientX, e.clientY);
    const currentGears = propsRef.current.gears;

    // Find clicked gear with generous touch-tolerant radius
    let clickedGear: RuntimeGear | null = null;
    for (let i = currentGears.length - 1; i >= 0; i--) {
      const g = currentGears[i];
      const dist = Math.hypot(x - g.currentX, y - g.currentY);
      const hitRadius = Math.max(g.radius + 18, 48);
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

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    const { x, y } = clientToBoard(e.clientX, e.clientY);

    dragRef.current.currentX = x - dragRef.current.offsetX;
    dragRef.current.currentY = y - dragRef.current.offsetY;

    sound.playGearDrag();
  };

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
      className="relative w-full h-full overflow-hidden flex items-center justify-center select-none touch-none"
    >
      <canvas
        ref={canvasRef}
        id="gearworks-main-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="block cursor-grab active:cursor-grabbing w-full h-full touch-none"
      />
    </div>
  );
};
