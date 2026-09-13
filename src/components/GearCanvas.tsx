import React, { useRef, useEffect, useCallback, memo } from 'react';
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

// ---------------------------------------------------------
// 1. HARDWARE ACCELERATED SPRITE GENERATORS
// ---------------------------------------------------------

function renderGearToSprite(gear: RuntimeGear, highContrast: boolean) {
  const r = gear.radius;
  const teeth = gear.teeth;
  const toothHeight = Math.max(8, r * 0.18);
  const outerR = r + toothHeight * 0.5;
  const innerR = r - toothHeight * 0.5;

  const scale = 2; // 2x for high-DPI crispness
  const padding = 16;
  const logicalSize = Math.ceil((outerR + padding) * 2);
  const size = logicalSize * scale;

  const offscreen = document.createElement('canvas');
  offscreen.width = size;
  offscreen.height = size;
  const ctx = offscreen.getContext('2d');
  if (!ctx) return { canvas: offscreen, logicalSize };

  ctx.scale(scale, scale);
  const logicalCenter = logicalSize / 2;
  ctx.translate(logicalCenter, logicalCenter);

  let outerColor = '#64748b';
  let innerColor = '#475569';
  let rimHighlight = '#94a3b8';
  let hubColor = '#1e293b';

  if (highContrast) {
    outerColor = '#94a3b8'; innerColor = '#64748b'; hubColor = '#1e293b'; rimHighlight = '#ffffff';
  } else if (gear.material === 'brass' || gear.type === 'small') {
    outerColor = '#d97706'; innerColor = '#b45309'; hubColor = '#451a03'; rimHighlight = '#fde68a';
  } else if (gear.material === 'copper' || gear.type === 'large') {
    outerColor = '#ea580c'; innerColor = '#c2410c'; hubColor = '#431407'; rimHighlight = '#fed7aa';
  } else if (gear.type === 'powered') {
    outerColor = '#0284c7'; innerColor = '#0369a1'; hubColor = '#0c4a6e'; rimHighlight = '#7dd3fc';
  } else if (gear.target) {
    outerColor = '#b45309'; innerColor = '#92400e'; hubColor = '#451a03'; rimHighlight = '#fcd34d';
  }

  ctx.beginPath();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a0 = i * step; const a1 = a0 + step * 0.28; const a2 = a0 + step * 0.45; const a3 = a0 + step * 0.73; const a4 = a0 + step;
    ctx.lineTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
    ctx.lineTo(Math.cos(a1) * outerR, Math.sin(a1) * outerR);
    ctx.lineTo(Math.cos(a2) * outerR, Math.sin(a2) * outerR);
    ctx.lineTo(Math.cos(a3) * innerR, Math.sin(a3) * innerR);
    ctx.lineTo(Math.cos(a4) * innerR, Math.sin(a4) * innerR);
  }
  ctx.closePath();

  const grad = ctx.createLinearGradient(-r, -r, r, r);
  grad.addColorStop(0, rimHighlight); grad.addColorStop(0.3, outerColor); grad.addColorStop(0.7, innerColor); grad.addColorStop(1, rimHighlight);

  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = innerColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const rimCutoutR = r * 0.72;
  ctx.beginPath(); ctx.arc(0, 0, rimCutoutR, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a'; ctx.fill();
  ctx.strokeStyle = outerColor; ctx.lineWidth = 2; ctx.stroke();

  const spokeCount = teeth <= 14 ? 3 : teeth <= 18 ? 4 : 5;
  const spokeAngle = (Math.PI * 2) / spokeCount;
  const spokeWidth = Math.max(6, r * 0.16);

  ctx.strokeStyle = grad; ctx.lineWidth = spokeWidth; ctx.lineCap = 'round';
  for (let s = 0; s < spokeCount; s++) {
    const angle = s * spokeAngle;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(angle) * rimCutoutR, Math.sin(angle) * rimCutoutR); ctx.stroke();
  }

  const hubR = Math.max(16, r * 0.38);
  ctx.beginPath(); ctx.arc(0, 0, hubR, 0, Math.PI * 2);
  const hubGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, hubR);
  hubGrad.addColorStop(0, '#0f172a'); hubGrad.addColorStop(1, hubColor);
  ctx.fillStyle = hubGrad; ctx.fill();
  ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.stroke();

  ctx.beginPath(); ctx.arc(0, 0, hubR * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = '#020617'; ctx.fill();

  return { canvas: offscreen, logicalSize };
}

function renderBackgroundToSprite(board: BoardConfig, obstacles: ObstacleData[]) {
  const offscreen = document.createElement('canvas');
  offscreen.width = board.width; offscreen.height = board.height;
  const ctx = offscreen.getContext('2d', { alpha: false });
  if (!ctx) return offscreen;

  ctx.fillStyle = '#111722'; ctx.fillRect(0, 0, board.width, board.height);

  ctx.strokeStyle = 'rgba(51, 65, 85, 0.28)'; ctx.lineWidth = 1;
  const gridStep = board.gridSize || 25;
  ctx.beginPath();
  for (let x = 0; x <= board.width; x += gridStep) { ctx.moveTo(x, 0); ctx.lineTo(x, board.height); }
  for (let y = 0; y <= board.height; y += gridStep) { ctx.moveTo(0, y); ctx.lineTo(board.width, y); }
  ctx.stroke();

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = 0; x <= board.width; x += 100) { ctx.moveTo(x, 0); ctx.lineTo(x, board.height); }
  for (let y = 0; y <= board.height; y += 100) { ctx.moveTo(0, y); ctx.lineTo(board.width, y); }
  ctx.stroke();

  const stagingY = 520;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)'; ctx.fillRect(0, stagingY, board.width, board.height - stagingY);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)'; ctx.lineWidth = 2; ctx.setLineDash([12, 6]);
  ctx.beginPath(); ctx.moveTo(0, stagingY); ctx.lineTo(board.width, stagingY); ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = '600 12px Rajdhani, system-ui, sans-serif'; ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
  ctx.fillText('ASSEMBLY INVENTORY TRAY', 24, stagingY + 24);

  ctx.strokeStyle = '#334155'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, board.width - 4, board.height - 4);

  const cbSize = 24; ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, cbSize, cbSize); ctx.strokeRect(board.width - cbSize - 4, 4, cbSize, cbSize);
  ctx.strokeRect(4, board.height - cbSize - 4, cbSize, cbSize); ctx.strokeRect(board.width - cbSize - 4, board.height - cbSize - 4, cbSize, cbSize);

  for (const obs of obstacles) {
    if (!obs.visible) continue;
    ctx.save();
    ctx.fillStyle = '#1e293b'; ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)'; ctx.lineWidth = 3;
    for (let i = -obs.height; i < obs.width + obs.height; i += 16) {
      ctx.beginPath(); ctx.moveTo(obs.x + i, obs.y); ctx.lineTo(obs.x + i + 12, obs.y + obs.height); ctx.stroke();
    }
    ctx.restore();
  }
  return offscreen;
}

// ---------------------------------------------------------
// 2. DOM-BASED RENDER COMPONENTS
// ---------------------------------------------------------

const GearDOMSprite = memo(({ gear, highContrast }: { gear: RuntimeGear, highContrast: boolean }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const cacheKey = `${gear.teeth}_${gear.radius}_${gear.material}_${gear.type}_${gear.target ? '1' : '0'}_${gear.movable ? '1' : '0'}_${highContrast ? '1' : '0'}`;
  
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';
    
    const sprite = renderGearToSprite(gear, highContrast);
    sprite.canvas.style.width = '100%';
    sprite.canvas.style.height = '100%';
    sprite.canvas.style.position = 'absolute';
    sprite.canvas.style.left = '0';
    sprite.canvas.style.top = '0';
    sprite.canvas.style.pointerEvents = 'none';
    
    containerRef.current.appendChild(sprite.canvas);
  }, [cacheKey, gear, highContrast]); // Include dependencies

  const hubR = Math.max(16, gear.radius * 0.38);

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div ref={containerRef} className="absolute inset-0 pointer-events-none" />
      
      {gear.type === 'powered' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
           <div 
             className="rounded-full bg-sky-400 opacity-80 flex items-center justify-center border-2 border-sky-100" 
             style={{ 
               width: hubR * 1.1, 
               height: hubR * 1.1,
               animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
             }}
           >
             <div className="w-[60%] h-[2px] bg-sky-100 absolute" />
             <div className="w-[2px] h-[60%] bg-sky-100 absolute" />
           </div>
        </div>
      )}

      {gear.target && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
           <div 
             className={`rounded-full transition-colors duration-300 ${gear.isPowered ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]' : 'bg-slate-600'}`} 
             style={{ 
               width: hubR * (gear.isPowered ? 1.2 : 0.9), 
               height: hubR * (gear.isPowered ? 1.2 : 0.9) 
             }} 
           />
        </div>
      )}
    </div>
  );
});

// ---------------------------------------------------------
// 3. MAIN HARDWARE-ACCELERATED COMPOSITOR
// ---------------------------------------------------------

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
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const bgContainerRef = useRef<HTMLDivElement>(null);
  
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  
  const rotationsRef = useRef<Map<string, number>>(new Map());
  const lastDragSoundRef = useRef<number>(0);

  const layoutRef = useRef({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    left: 0,
    top: 0,
  });

  const propsRef = useRef({ gears, reducedAnimation });
  propsRef.current = { gears, reducedAnimation };

  const dragRef = useRef<{
    gearId: string;
    pointerId: number;
    offsetX: number;
    offsetY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  useEffect(() => {
    if (!bgContainerRef.current) return;
    bgContainerRef.current.innerHTML = '';
    const bgCanvas = renderBackgroundToSprite(board, obstacles);
    bgCanvas.style.width = '100%';
    bgCanvas.style.height = '100%';
    bgCanvas.style.position = 'absolute';
    bgContainerRef.current.appendChild(bgCanvas);
  }, [board.width, board.height, board.gridSize, obstacles]);

  const updateLayoutMetrics = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const cssW = rect.width;
    const cssH = rect.height;
    if (cssW <= 0 || cssH <= 0) return;

    const scaleX = cssW / board.width;
    const scaleY = cssH / board.height;
    const scale = Math.min(scaleX, scaleY);
    const renderedWidth = board.width * scale;
    const renderedHeight = board.height * scale;
    const offsetX = (cssW - renderedWidth) / 2;
    const offsetY = (cssH - renderedHeight) / 2;

    layoutRef.current = { scale, offsetX, offsetY, left: rect.left, top: rect.top };

    if (stageRef.current) {
      stageRef.current.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})`;
    }
  }, [board.width, board.height]);

  useEffect(() => {
    updateLayoutMetrics();
    window.addEventListener('resize', updateLayoutMetrics);
    window.addEventListener('orientationchange', updateLayoutMetrics);
    return () => {
      window.removeEventListener('resize', updateLayoutMetrics);
      window.removeEventListener('orientationchange', updateLayoutMetrics);
    };
  }, [updateLayoutMetrics]);

  const clientToBoard = useCallback((clientX: number, clientY: number) => {
    const { left, top, offsetX, offsetY, scale } = layoutRef.current;
    if (scale <= 0) return { x: 0, y: 0 };
    const x = ((clientX - left) - offsetX) / scale;
    const y = ((clientY - top) - offsetY) / scale;
    return { x, y };
  }, []);

  const renderLoop = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const rawDt = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;
    const dt = Math.max(0.001, Math.min(rawDt, 0.15));

    const { gears, reducedAnimation } = propsRef.current;
    const currentDrag = dragRef.current;

    for (const gear of gears) {
      if (!reducedAnimation && gear.isPowered && !gear.isJam) {
        const rotSpeed = (gear.angularVelocity || 1.0) * 1.6;
        let rot = (rotationsRef.current.get(gear.id) ?? gear.currentRotation ?? 0) + rotSpeed * dt;
        if (rot >= Math.PI * 2) rot -= Math.PI * 2;
        else if (rot < 0) rot += Math.PI * 2;
        rotationsRef.current.set(gear.id, rot);
        gear.currentRotation = rot;
      }

      const isDragging = currentDrag && currentDrag.gearId === gear.id;
      const x = isDragging ? currentDrag.currentX : gear.currentX;
      const y = isDragging ? currentDrag.currentY : gear.currentY;
      const rot = rotationsRef.current.get(gear.id) ?? gear.currentRotation ?? 0;

      const posNode = document.getElementById(`gear-pos-${gear.id}`);
      if (posNode) {
        posNode.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        posNode.style.zIndex = isDragging ? '100' : '10';
      }

      const rotNode = document.getElementById(`gear-rot-${gear.id}`);
      if (rotNode) {
        rotNode.style.transform = `rotate(${rot}rad)`;
      }
    }

    animFrameRef.current = requestAnimationFrame(renderLoop);
  }, []);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [renderLoop]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    const { x, y } = clientToBoard(e.clientX, e.clientY);
    const currentGears = propsRef.current.gears;

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

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    const { x, y } = clientToBoard(e.clientX, e.clientY);

    dragRef.current.currentX = x - dragRef.current.offsetX;
    dragRef.current.currentY = y - dragRef.current.offsetY;

    const now = performance.now();
    if (now - lastDragSoundRef.current > 110) {
      lastDragSoundRef.current = now;
      sound.playGearDrag();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}

    const { gearId, currentX, currentY } = dragRef.current;
    dragRef.current = null;
    onReleaseGear(gearId, currentX, currentY);
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full overflow-hidden select-none touch-none bg-[#0c1017]"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div 
        ref={stageRef} 
        className="absolute top-0 left-0 origin-top-left touch-none pointer-events-none will-change-transform"
        style={{ width: board.width, height: board.height }}
      >
        <div ref={bgContainerRef} className="absolute inset-0 pointer-events-none" />

        {activeHint && activeHint.targetX !== undefined && activeHint.targetY !== undefined && (
          <div 
            className="absolute border-4 border-amber-500 border-dashed rounded-full bg-amber-500/15 pointer-events-none"
            style={{
              width: (gears.find((g) => g.id === activeHint.gearId)?.radius || 60) * 2,
              height: (gears.find((g) => g.id === activeHint.gearId)?.radius || 60) * 2,
              transform: `translate3d(${activeHint.targetX}px, ${activeHint.targetY}px, 0) translate3d(-50%, -50%, 0)`
            }}
          >
            <div className="absolute inset-0 m-auto w-4 h-4 bg-amber-500 rounded-full" />
          </div>
        )}

        {gears.map((gear) => {
          const isSelected = selectedGearId === gear.id;
          const isHinted = activeHint?.gearId === gear.id;
          
          const toothHeight = Math.max(8, gear.radius * 0.18);
          const outerR = gear.radius + toothHeight * 0.5;
          const padding = 16;
          const logicalSize = Math.ceil((outerR + padding) * 2);

          return (
            <div
              key={gear.id}
              id={`gear-pos-${gear.id}`}
              className="absolute top-0 left-0 will-change-transform pointer-events-none"
              style={{
                width: logicalSize,
                height: logicalSize,
                marginLeft: -logicalSize / 2,
                marginTop: -logicalSize / 2,
                transform: `translate3d(${gear.currentX}px, ${gear.currentY}px, 0)`
              }}
            >
              {(isSelected || isHinted) && (
                <div 
                  className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-dashed ${isSelected ? 'border-sky-400' : 'border-amber-500'}`}
                  style={{ width: gear.radius * 2 + 24, height: gear.radius * 2 + 24 }}
                />
              )}

              <div 
                className="absolute top-1/2 left-1/2 rounded-full bg-black/40"
                style={{ 
                  width: gear.radius * 2, 
                  height: gear.radius * 2, 
                  transform: 'translate3d(calc(-50% + 5px), calc(-50% + 9px), 0)' 
                }}
              />

              <div 
                id={`gear-rot-${gear.id}`}
                className="absolute inset-0 will-change-transform pointer-events-none origin-center"
              >
                <GearDOMSprite gear={gear} highContrast={highContrast} />
              </div>
              
              {gear.isJam && hasJam && (
                <div className="absolute inset-0 flex items-center justify-center animate-pulse pointer-events-none">
                  <div className="text-red-500 rounded-full bg-red-950/80 p-2 shadow-[0_0_20px_rgba(239,68,68,0.8)] border border-red-500 flex items-center justify-center">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
