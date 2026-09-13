import React, { useRef, useEffect, useCallback, useState } from 'react';
import { GearData, ObstacleData, RuntimeGear, BoardConfig, TargetRequirement } from '../types';
import { sound } from '../engine/audio';
import { areGearsColliding, checkObstacleCollision } from '../engine/gearPhysics';
import { calculateConnections } from '../engine/connectionEngine';

interface PuzzleEditorCanvasProps {
  board: BoardConfig;
  gears: GearData[];
  obstacles: ObstacleData[];
  targets: TargetRequirement[];
  selectedId: string | null;
  selectedType: 'gear' | 'obstacle' | null;
  mode: 'design' | 'test';
  snapToGrid: boolean;
  snapToTangent: boolean;
  onSelect: (id: string | null, type: 'gear' | 'obstacle' | null) => void;
  onUpdateGearPosition: (id: string, x: number, y: number) => void;
  onUpdateObstaclePosition: (id: string, x: number, y: number, width?: number, height?: number) => void;
  onTestSolved?: (solutionPlacements: { gearId: string; x: number; y: number }[]) => void;
}

export const PuzzleEditorCanvas: React.FC<PuzzleEditorCanvasProps> = ({
  board,
  gears,
  obstacles,
  targets,
  selectedId,
  selectedType,
  mode,
  snapToGrid,
  snapToTangent,
  onSelect,
  onUpdateGearPosition,
  onUpdateObstaclePosition,
  onTestSolved,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // In test mode, we maintain test runtime gears with physics simulation
  const [testRuntimeGears, setTestRuntimeGears] = useState<RuntimeGear[]>([]);
  const [testSolved, setTestSolved] = useState<boolean>(false);

  // When mode changes to 'test', initialize runtime gears
  useEffect(() => {
    if (mode === 'test') {
      const runtime: RuntimeGear[] = gears.map((g) => ({
        ...g,
        currentX: g.x,
        currentY: g.y,
        currentRotation: 0,
        angularVelocity: g.powered ? (g.rotationSpeed || 1.0) : 0,
        isPowered: !!g.powered,
        isMeshed: false,
        isJam: false,
        connectedTo: [],
        isDragging: false,
      }));
      setTestRuntimeGears(runtime);
      setTestSolved(false);
    } else {
      setTestSolved(false);
    }
  }, [mode, gears]);

  // Keep latest refs for 60fps render loop
  const propsRef = useRef({
    board,
    gears,
    obstacles,
    targets,
    selectedId,
    selectedType,
    mode,
    snapToGrid,
    snapToTangent,
    testRuntimeGears,
    testSolved,
  });
  propsRef.current = {
    board,
    gears,
    obstacles,
    targets,
    selectedId,
    selectedType,
    mode,
    snapToGrid,
    snapToTangent,
    testRuntimeGears,
    testSolved,
  };

  // Interaction and layout state
  const lastTimeRef = useRef<number>(0);
  const dragRef = useRef<{
    type: 'gear' | 'obstacle' | 'obstacle-resize';
    id: string;
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    originW: number;
    originH: number;
    currentX: number;
    currentY: number;
    currentW: number;
    currentH: number;
  } | null>(null);

  // Cached layout metrics to avoid DOM thrashing and layout loops on Android tablets
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

  // Screen to Logical Board coordinates using cached metrics (zero DOM layout queries)
  const clientToBoard = useCallback((clientX: number, clientY: number) => {
    const { left, top, offsetX, offsetY, scale } = layoutRef.current;
    if (scale <= 0) return { x: 0, y: 0 };
    const canvasX = clientX - left;
    const canvasY = clientY - top;
    const x = (canvasX - offsetX) / scale;
    const y = (canvasY - offsetY) / scale;
    return { x, y };
  }, []);

  // Snapping logic
  const applySnapping = useCallback(
    (targetGearId: string, rawX: number, rawY: number) => {
      let x = rawX;
      let y = rawY;

      const targetGear = propsRef.current.gears.find((g) => g.id === targetGearId);
      if (!targetGear) return { x, y };

      // 1. Tangent snapping to other gears (if active)
      if (propsRef.current.snapToTangent) {
        const otherGears = propsRef.current.gears.filter((g) => g.id !== targetGearId);
        for (const other of otherGears) {
          const dx = rawX - other.x;
          const dy = rawY - other.y;
          const dist = Math.hypot(dx, dy);
          const perfectDist = targetGear.radius + other.radius;

          if (Math.abs(dist - perfectDist) < 18 && dist > 1) {
            // Snap along normal vector to exact pitch tangent
            const angle = Math.atan2(dy, dx);
            x = Math.round(other.x + Math.cos(angle) * perfectDist);
            y = Math.round(other.y + Math.sin(angle) * perfectDist);
            return { x, y, isTangentSnapped: true };
          }
        }
      }

      // 2. Grid Snapping (if active)
      if (propsRef.current.snapToGrid) {
        const grid = propsRef.current.board.gridSize || 25;
        x = Math.round(x / grid) * grid;
        y = Math.round(y / grid) * grid;
      }

      // Constrain inside board bounds
      x = Math.max(targetGear.radius, Math.min(propsRef.current.board.width - targetGear.radius, x));
      y = Math.max(targetGear.radius, Math.min(propsRef.current.board.height - targetGear.radius, y));

      return { x, y, isTangentSnapped: false };
    },
    []
  );

  // Draw Gear procedure
  const drawGear = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      gear: GearData,
      isSelected: boolean,
      rotation: number,
      isPowered: boolean,
      isMeshed: boolean,
      isJam: boolean,
      isTarget: boolean
    ) => {
      ctx.save();
      ctx.translate(gear.x, gear.y);

      // Elevated shadow
      ctx.shadowColor = isSelected ? 'rgba(56, 189, 248, 0.5)' : 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = isSelected ? 20 : 10;
      ctx.shadowOffsetX = isSelected ? 0 : 3;
      ctx.shadowOffsetY = isSelected ? 0 : 5;

      // Rotate for teeth
      ctx.rotate(rotation);

      const r = gear.radius;
      const teeth = gear.teeth;
      const toothHeight = Math.max(8, r * 0.18);
      const outerR = r + toothHeight * 0.5;
      const innerR = r - toothHeight * 0.5;

      // Color scheme based on material & status
      let outerColor = '#64748b'; // steel
      let innerColor = '#475569';
      let spokeColor = '#334155';
      let hubColor = '#1e293b';
      let rimHighlight = '#94a3b8';

      if (gear.material === 'brass') {
        outerColor = '#d97706';
        innerColor = '#b45309';
        spokeColor = '#78350f';
        hubColor = '#451a03';
        rimHighlight = '#fde68a';
      } else if (gear.material === 'copper') {
        outerColor = '#ea580c';
        innerColor = '#c2410c';
        spokeColor = '#9a3412';
        hubColor = '#7c2d12';
        rimHighlight = '#fdba74';
      } else if (gear.material === 'titanium') {
        outerColor = '#38bdf8';
        innerColor = '#0284c7';
        spokeColor = '#0369a1';
        hubColor = '#075985';
        rimHighlight = '#bae6fd';
      } else if ((gear.material as string) === 'heavy') {
        outerColor = '#475569';
        innerColor = '#334155';
        spokeColor = '#1e293b';
        hubColor = '#0f172a';
        rimHighlight = '#94a3b8';
      }

      if (isJam) {
        outerColor = '#ef4444';
        innerColor = '#dc2626';
        spokeColor = '#991b1b';
      }

      // Draw Teeth
      ctx.fillStyle = outerColor;
      ctx.beginPath();
      const angleStep = (Math.PI * 2) / teeth;
      for (let i = 0; i < teeth; i++) {
        const mid = i * angleStep;
        const halfStep = angleStep * 0.28;
        const p1 = { x: Math.cos(mid - halfStep) * outerR, y: Math.sin(mid - halfStep) * outerR };
        const p2 = { x: Math.cos(mid + halfStep) * outerR, y: Math.sin(mid + halfStep) * outerR };
        const root1 = { x: Math.cos(mid - halfStep * 1.5) * innerR, y: Math.sin(mid - halfStep * 1.5) * innerR };
        const root2 = { x: Math.cos(mid + halfStep * 1.5) * innerR, y: Math.sin(mid + halfStep * 1.5) * innerR };

        if (i === 0) {
          ctx.moveTo(root1.x, root1.y);
        } else {
          ctx.lineTo(root1.x, root1.y);
        }
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(root2.x, root2.y);
      }
      ctx.closePath();
      ctx.fill();

      // Outer Rim
      ctx.beginPath();
      ctx.arc(0, 0, innerR, 0, Math.PI * 2);
      ctx.fillStyle = innerColor;
      ctx.fill();

      // Rim edge stroke
      ctx.strokeStyle = rimHighlight;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Spokes / Cutouts
      const spokeCount = Math.max(3, Math.min(6, Math.floor(teeth / 3)));
      ctx.strokeStyle = spokeColor;
      ctx.lineWidth = Math.max(3, r * 0.12);
      for (let s = 0; s < spokeCount; s++) {
        const spAngle = (s * Math.PI * 2) / spokeCount;
        ctx.beginPath();
        ctx.moveTo(Math.cos(spAngle) * (r * 0.3), Math.sin(spAngle) * (r * 0.3));
        ctx.lineTo(Math.cos(spAngle) * (innerR * 0.82), Math.sin(spAngle) * (innerR * 0.82));
        ctx.stroke();
      }

      // Hub Center Pin
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(7, r * 0.3), 0, Math.PI * 2);
      ctx.fillStyle = hubColor;
      ctx.fill();
      ctx.strokeStyle = rimHighlight;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Center Axle Pin
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(3, r * 0.12), 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();

      // Special overlay icons
      ctx.restore();

      // Non-rotated badge overlays
      ctx.save();
      ctx.translate(gear.x, gear.y);

      // Powered Motor Badge
      if (gear.powered) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, gear.radius + 6, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PWR', 0, 0);
      }

      // Target Output Badge
      if (gear.target || isTarget) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, gear.radius + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fef3c7';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TGT', 0, 0);
      }

      // Movable Tray Badge (if movable)
      if (gear.movable) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(gear.radius * 0.65, -gear.radius * 0.65, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('M', gear.radius * 0.65, -gear.radius * 0.65);
      }

      // Selection Ring
      if (isSelected) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, gear.radius + 12, 0, Math.PI * 2);
        ctx.stroke();

        // 4 Reticle markers
        const retR = gear.radius + 12;
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-retR - 4, -2, 4, 4);
        ctx.fillRect(retR, -2, 4, 4);
        ctx.fillRect(-2, -retR - 4, 4, 4);
        ctx.fillRect(-2, retR, 4, 4);
      }

      ctx.restore();
    },
    []
  );

  // Main Render Animation Loop
  const render = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const {
        board,
        gears,
        obstacles,
        targets,
        selectedId,
        selectedType,
        mode,
        testRuntimeGears,
      } = propsRef.current;

      const { cssW, cssH, dpr, scale, offsetX, offsetY } = layoutRef.current;
      if (cssW <= 0 || cssH <= 0) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Background fill
      ctx.fillStyle = '#0a0e14';
      ctx.fillRect(0, 0, cssW, cssH);

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      // Blueprint Board
      ctx.fillStyle = '#0f1724';
      ctx.fillRect(0, 0, board.width, board.height);

      // Precision Grid
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
      ctx.lineWidth = 1;
      const grid = board.gridSize || 25;
      ctx.beginPath();
      for (let x = 0; x <= board.width; x += grid) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, board.height);
      }
      for (let y = 0; y <= board.height; y += grid) {
        ctx.moveTo(0, y);
        ctx.lineTo(board.width, y);
      }
      ctx.stroke();

      // Major Crosshairs
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
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

      // Assembly Inventory Tray Divider
      const stagingY = 520;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, stagingY, board.width, board.height - stagingY);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 6]);
      ctx.beginPath();
      ctx.moveTo(0, stagingY);
      ctx.lineTo(board.width, stagingY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = '600 13px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.fillText('PLAYER ASSEMBLY TRAY (Gears placed here start in the player inventory)', 24, stagingY + 26);

      // Tangent Meshing Pitch Rings when a gear is selected in design mode
      if (mode === 'design' && selectedType === 'gear' && selectedId) {
        const activeGear = gears.find((g) => g.id === selectedId);
        if (activeGear) {
          for (const other of gears) {
            if (other.id === activeGear.id) continue;
            const tangentR = activeGear.radius + other.radius;
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(other.x, other.y, tangentR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // If active gear is currently tangent, highlight green!
            const curDist = Math.hypot(activeGear.x - other.x, activeGear.y - other.y);
            if (Math.abs(curDist - tangentR) <= 3) {
              ctx.strokeStyle = '#22c55e';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(other.x, other.y, tangentR, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
        }
      }

      // Draw Obstacles
      for (const obs of obstacles) {
        const isSelected = selectedType === 'obstacle' && selectedId === obs.id;
        ctx.save();
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        // Hazard Stripes
        ctx.save();
        ctx.beginPath();
        ctx.rect(obs.x, obs.y, obs.width, obs.height);
        ctx.clip();
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.25)';
        ctx.lineWidth = 10;
        const stripeStep = 24;
        for (let sx = -obs.height; sx < obs.width + obs.height; sx += stripeStep) {
          ctx.beginPath();
          ctx.moveTo(obs.x + sx, obs.y);
          ctx.lineTo(obs.x + sx + obs.height, obs.y + obs.height);
          ctx.stroke();
        }
        ctx.restore();

        // Border
        ctx.strokeStyle = isSelected ? '#38bdf8' : '#475569';
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

        // Resize handle at bottom-right corner if selected
        if (isSelected && mode === 'design') {
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(obs.x + obs.width - 12, obs.y + obs.height - 12, 12, 12);
        }

        ctx.restore();
      }

      // Draw Gears
      if (mode === 'design') {
        const timeSec = timestamp / 1000;
        for (const gear of gears) {
          const isSelected = selectedType === 'gear' && selectedId === gear.id;
          const isTarget = targets.some((t) => t.gearId === gear.id);
          const rotation = gear.powered ? timeSec * (gear.rotationSpeed || 1) : 0;
          drawGear(ctx, gear, isSelected, rotation, !!gear.powered, false, false, isTarget);
        }
      } else {
        // Test Simulation Mode
        // Run continuous physics simulation
        let hasJam = false;
        let isLevelComplete = false;

        if (testRuntimeGears.length > 0) {
          const sim = calculateConnections(testRuntimeGears, targets);
          hasJam = sim.hasJam;
          isLevelComplete = sim.isLevelComplete;

          // Update rotation for powered/meshed gears
          if (!lastTimeRef.current) lastTimeRef.current = timestamp;
          const rawDt = (timestamp - lastTimeRef.current) / 1000;
          lastTimeRef.current = timestamp;
          const dt = Math.max(0.001, Math.min(rawDt, 0.15));

          for (const g of testRuntimeGears) {
            if (g.isPowered && !hasJam) {
              g.currentRotation += (g.angularVelocity || 1.5) * dt;
            }
          }

          if (isLevelComplete && !propsRef.current.testSolved) {
            propsRef.current.testSolved = true;
            setTestSolved(true);
            sound.playLevelComplete();
            if (onTestSolved) {
              onTestSolved(
                testRuntimeGears
                  .filter((g) => g.movable)
                  .map((g) => ({ gearId: g.id, x: Math.round(g.currentX), y: Math.round(g.currentY) }))
              );
            }
          }

          for (const rg of testRuntimeGears) {
            const gearData: GearData = {
              id: rg.id,
              type: rg.type,
              name: rg.name,
              x: rg.currentX,
              y: rg.currentY,
              radius: rg.radius,
              teeth: rg.teeth,
              rotation: rg.currentRotation,
              rotationSpeed: rg.angularVelocity,
              movable: rg.movable,
              powered: rg.isPowered,
              target: targets.some((t) => t.gearId === rg.id),
              material: rg.material,
              snapDistance: rg.snapDistance,
            };
            const isSelected = selectedType === 'gear' && selectedId === rg.id;
            drawGear(
              ctx,
              gearData,
              isSelected,
              rg.currentRotation,
              rg.isPowered,
              rg.isMeshed,
              rg.isJam,
              targets.some((t) => t.gearId === rg.id)
            );
          }
        }
      }

      ctx.restore();
    },
    [drawGear, onTestSolved]
  );

  // Resize handling decoupled to prevent layout feedback loops
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const updateLayoutMetrics = () => {
      const rect = container.getBoundingClientRect();
      const cssW = Math.floor(rect.width);
      const cssH = Math.floor(rect.height);
      if (cssW <= 0 || cssH <= 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
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
    };

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

    // Prevent touch scrolling on Android
    const preventTouch = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
    };
    canvas.addEventListener('touchstart', preventTouch, { passive: false });
    canvas.addEventListener('touchmove', preventTouch, { passive: false });

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', debouncedUpdate);
      window.removeEventListener('orientationchange', debouncedUpdate);
      canvas.removeEventListener('touchstart', preventTouch);
      canvas.removeEventListener('touchmove', preventTouch);
      if (resizeTimer) cancelAnimationFrame(resizeTimer);
    };
  }, []);

  // Animation Loop
  useEffect(() => {
    let running = true;
    const loop = (timestamp: number) => {
      if (!running) return;
      render(timestamp);
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [render]);

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Fallback
    }

    const { x, y } = clientToBoard(e.clientX, e.clientY);
    const { mode, gears, obstacles, testRuntimeGears } = propsRef.current;

    // In Design Mode: can select and drag any gear, or select and drag/resize obstacles
    if (mode === 'design') {
      // 1. Check obstacle resize handle (if an obstacle is already selected)
      const selectedObs = obstacles.find((o) => o.id === propsRef.current.selectedId);
      if (selectedObs && propsRef.current.selectedType === 'obstacle') {
        const handleX = selectedObs.x + selectedObs.width;
        const handleY = selectedObs.y + selectedObs.height;
        if (Math.hypot(x - handleX, y - handleY) <= 24) {
          dragRef.current = {
            type: 'obstacle-resize',
            id: selectedObs.id,
            pointerId: e.pointerId,
            startX: x,
            startY: y,
            originX: selectedObs.x,
            originY: selectedObs.y,
            originW: selectedObs.width,
            originH: selectedObs.height,
            currentX: selectedObs.x,
            currentY: selectedObs.y,
            currentW: selectedObs.width,
            currentH: selectedObs.height,
          };
          return;
        }
      }

      // 2. Check gear clicks (topmost first)
      for (let i = gears.length - 1; i >= 0; i--) {
        const g = gears[i];
        const dist = Math.hypot(x - g.x, y - g.y);
        if (dist <= Math.max(g.radius + 15, 36)) {
          onSelect(g.id, 'gear');
          sound.playGearSelect();

          dragRef.current = {
            type: 'gear',
            id: g.id,
            pointerId: e.pointerId,
            startX: x,
            startY: y,
            originX: g.x,
            originY: g.y,
            originW: 0,
            originH: 0,
            currentX: g.x,
            currentY: g.y,
            currentW: 0,
            currentH: 0,
          };
          return;
        }
      }

      // 3. Check obstacle clicks
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        if (x >= obs.x && x <= obs.x + obs.width && y >= obs.y && y <= obs.y + obs.height) {
          onSelect(obs.id, 'obstacle');
          sound.playGearSelect();

          dragRef.current = {
            type: 'obstacle',
            id: obs.id,
            pointerId: e.pointerId,
            startX: x,
            startY: y,
            originX: obs.x,
            originY: obs.y,
            originW: obs.width,
            originH: obs.height,
            currentX: obs.x,
            currentY: obs.y,
            currentW: obs.width,
            currentH: obs.height,
          };
          return;
        }
      }

      // Clicked on empty canvas
      onSelect(null, null);
    } else {
      // In Test Mode: can only drag movable runtime gears
      for (let i = testRuntimeGears.length - 1; i >= 0; i--) {
        const rg = testRuntimeGears[i];
        if (!rg.movable) continue;
        const dist = Math.hypot(x - rg.currentX, y - rg.currentY);
        if (dist <= Math.max(rg.radius + 15, 36)) {
          onSelect(rg.id, 'gear');
          sound.playGearSelect();

          dragRef.current = {
            type: 'gear',
            id: rg.id,
            pointerId: e.pointerId,
            startX: x,
            startY: y,
            originX: rg.currentX,
            originY: rg.currentY,
            originW: 0,
            originH: 0,
            currentX: rg.currentX,
            currentY: rg.currentY,
            currentW: 0,
            currentH: 0,
          };
          return;
        }
      }
      onSelect(null, null);
    }
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    const { x, y } = clientToBoard(e.clientX, e.clientY);
    const drag = dragRef.current;

    if (drag.type === 'gear') {
      const deltaX = x - drag.startX;
      const deltaY = y - drag.startY;
      const rawX = drag.originX + deltaX;
      const rawY = drag.originY + deltaY;

      const snapped = applySnapping(drag.id, rawX, rawY);
      drag.currentX = snapped.x;
      drag.currentY = snapped.y;

      if (propsRef.current.mode === 'design') {
        onUpdateGearPosition(drag.id, snapped.x, snapped.y);
      } else {
        // Update in test runtime gears
        setTestRuntimeGears((prev) =>
          prev.map((g) => (g.id === drag.id ? { ...g, currentX: snapped.x, currentY: snapped.y } : g))
        );
      }

      sound.playGearDrag();
    } else if (drag.type === 'obstacle') {
      const deltaX = x - drag.startX;
      const deltaY = y - drag.startY;
      let newX = drag.originX + deltaX;
      let newY = drag.originY + deltaY;

      if (propsRef.current.snapToGrid) {
        const grid = propsRef.current.board.gridSize || 25;
        newX = Math.round(newX / grid) * grid;
        newY = Math.round(newY / grid) * grid;
      }

      onUpdateObstaclePosition(drag.id, newX, newY, drag.originW, drag.originH);
    } else if (drag.type === 'obstacle-resize') {
      const newW = Math.max(30, Math.round((x - drag.originX) / 25) * 25);
      const newH = Math.max(30, Math.round((y - drag.originY) / 25) * 25);
      onUpdateObstaclePosition(drag.id, drag.originX, drag.originY, newW, newH);
    }
  };

  // Pointer Up
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    dragRef.current = null;
    sound.playValidPlacement();
  };

  return (
    <div
      ref={containerRef}
      id="puzzle-editor-canvas-container"
      className="relative w-full h-full overflow-hidden select-none touch-none bg-[#090d12]"
    >
      <canvas
        ref={canvasRef}
        id="puzzle-editor-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="absolute inset-0 block cursor-crosshair active:cursor-grabbing touch-none select-none"
        style={{
          width: '100%',
          height: '100%',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      />
    </div>
  );
};
