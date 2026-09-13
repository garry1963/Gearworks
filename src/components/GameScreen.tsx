import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LevelData,
  RuntimeGear,
  LevelHint,
  MoveHistoryState,
  GameSettings,
} from '../types';
import { GearCanvas } from './GearCanvas';
import { calculateConnections } from '../engine/connectionEngine';
import { findSnapPosition, areGearsColliding, checkObstacleCollision } from '../engine/gearPhysics';
import { sound } from '../engine/audio';
import {
  Home,
  RotateCcw,
  Undo2,
  Redo2,
  Lightbulb,
  Pause,
  Clock,
  Radio,
  SlidersHorizontal,
  Flame,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import { TutorialOverlay } from './TutorialOverlay';

interface GameScreenProps {
  levelData: LevelData;
  initialGears: RuntimeGear[];
  settings: GameSettings;
  onHome: () => void;
  onPause: () => void;
  onLevelComplete: (stats: {
    timeRemaining: number;
    moves: number;
    invalidPlacements: number;
    hintsUsed: number;
  }) => void;
  onLevelFailed: (stats: { moves: number; invalidPlacements: number }) => void;
  onOpenDevMode: () => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  levelData,
  initialGears,
  settings,
  onHome,
  onPause,
  onLevelComplete,
  onLevelFailed,
  onOpenDevMode,
}) => {
  // Runtime gear states
  const [gears, setGears] = useState<RuntimeGear[]>(() =>
    initialGears.map((g) => ({ ...g }))
  );

  // Selected gear and hints
  const [selectedGearId, setSelectedGearId] = useState<string | null>(null);
  const [currentHintIndex, setCurrentHintIndex] = useState<number>(-1);
  const [activeHint, setActiveHint] = useState<LevelHint | null>(null);

  // Gameplay tracking
  const [moves, setMoves] = useState<number>(0);
  const [invalidPlacements, setInvalidPlacements] = useState<number>(0);
  const [hintsUsedCount, setHintsUsedCount] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(
    levelData.rules.timed ? levelData.rules.timeLimit : 180
  );
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [hasJam, setHasJam] = useState<boolean>(false);
  const [targetsSatisfied, setTargetsSatisfied] = useState<number>(0);
  const [totalTargets, setTotalTargets] = useState<number>(levelData.targets.length);
  const [warningFlash, setWarningFlash] = useState<boolean>(false);

  // Level 1 tutorial overlay visibility
  const isLevelOne = levelData.levelNumber === 1 || Boolean(levelData.metadata?.tutorial);
  const [showTutorial, setShowTutorial] = useState<boolean>(() => isLevelOne);

  // Undo / Redo Stacks
  const undoStack = useRef<MoveHistoryState[]>([]);
  const redoStack = useRef<MoveHistoryState[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Stats ref to stabilize evaluateMechanism and completion callbacks
  const statsRef = useRef({
    timeRemaining,
    moves,
    invalidPlacements,
    hintsUsedCount,
    isGameOver,
  });
  statsRef.current = {
    timeRemaining,
    moves,
    invalidPlacements,
    hintsUsedCount,
    isGameOver,
  };

  const updateUndoRedoAvailability = () => {
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(redoStack.current.length > 0);
  };

  // Recalculate connections and win condition
  const evaluateMechanism = useCallback(
    (currentGears: RuntimeGear[]) => {
      const result = calculateConnections(currentGears, levelData.targets);
      setHasJam(result.hasJam);
      setTargetsSatisfied(result.targetsSatisfied);
      setTotalTargets(result.totalTargets);

      // Apply updated power & velocities to state
      setGears((prev) =>
        prev.map((g) => {
          const updated = result.updatedGears.find((ug) => ug.id === g.id);
          if (!updated) return g;
          return {
            ...g,
            isPowered: updated.isPowered,
            isMeshed: updated.isMeshed,
            isJam: updated.isJam,
            angularVelocity: updated.angularVelocity,
            connectedTo: updated.connectedTo,
          };
        })
      );

      // Check level completion
      if (result.isLevelComplete && !statsRef.current.isGameOver) {
        setIsGameOver(true);
        sound.playGearMesh();
        setTimeout(() => {
          onLevelComplete({
            timeRemaining: statsRef.current.timeRemaining,
            moves: statsRef.current.moves,
            invalidPlacements: statsRef.current.invalidPlacements,
            hintsUsed: statsRef.current.hintsUsedCount,
          });
        }, 500);
      }
    },
    [levelData.targets, onLevelComplete]
  );

  // Initial connectivity evaluation on mount
  useEffect(() => {
    evaluateMechanism(gears);
  }, []);

  // Timer countdown hook
  useEffect(() => {
    if (!levelData.rules.timed || isGameOver) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsGameOver(true);
          sound.playLevelFailed();
          onLevelFailed({ moves, invalidPlacements });
          return 0;
        }

        // Warnings at 30s and 10s
        if (prev === 31 || prev === 11) {
          setWarningFlash(true);
          setTimeout(() => setWarningFlash(false), 800);
          sound.playTimerWarning();
        } else if (prev <= 10) {
          sound.playTimerWarning();
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [levelData.rules.timed, isGameOver, moves, invalidPlacements, onLevelFailed]);

  // Gear Movement handler during drag
  const handleMoveGear = useCallback((gearId: string, x: number, y: number) => {
    setGears((prev) =>
      prev.map((g) => {
        if (g.id !== gearId) return g;
        return {
          ...g,
          currentX: x,
          currentY: y,
          isDragging: true,
        };
      })
    );
  }, []);

  // Gear Release & Snapping handler
  const handleReleaseGear = useCallback(
    (gearId: string, rawX: number, rawY: number) => {
      const movingGear = gears.find((g) => g.id === gearId);
      if (!movingGear) return;

      const previousX = movingGear.currentX;
      const previousY = movingGear.currentY;

      // If the gear barely moved (tap to select or tiny jitter), keep it in place without fault
      if (Math.hypot(rawX - previousX, rawY - previousY) < 6) {
        setGears((prev) =>
          prev.map((g) => (g.id === gearId ? { ...g, isDragging: false } : g))
        );
        return;
      }

      // 1. Calculate best snap position
      const snapResult = findSnapPosition(
        movingGear,
        rawX,
        rawY,
        gears,
        levelData.obstacles,
        levelData.board.width,
        levelData.board.height,
        settings.snapSensitivity
      );

      const targetX = snapResult.x;
      const targetY = snapResult.y;

      // 2. Validate legal placement (no illegal collision with other stationary gears or obstacles)
      let isColliding = false;
      for (const other of gears) {
        if (other.id === gearId) continue;
        if (
          areGearsColliding(
            { x: targetX, y: targetY, radius: movingGear.radius },
            { x: other.currentX, y: other.currentY, radius: other.radius }
          )
        ) {
          isColliding = true;
          break;
        }
      }

      if (!isColliding) {
        for (const obs of levelData.obstacles) {
          if (checkObstacleCollision({ x: targetX, y: targetY, radius: movingGear.radius }, obs)) {
            isColliding = true;
            break;
          }
        }
      }

      // Check bounds with staging tray tolerance
      const margin = movingGear.radius;
      const minX = margin;
      const maxX = levelData.board.width - margin;
      const minY = margin;
      const maxY = levelData.board.height - Math.min(margin, 25);

      const outOfBounds =
        targetX < minX ||
        targetX > maxX ||
        targetY < minY ||
        targetY > maxY;

      if (isColliding || outOfBounds) {
        // Invalid placement: snap back to original start position
        sound.playInvalidPlacement();
        setInvalidPlacements((c) => c + 1);

        const revertX = movingGear.initialX ?? movingGear.x;
        const revertY = movingGear.initialY ?? movingGear.y;

        const updated = gears.map((g) =>
          g.id === gearId
            ? { ...g, currentX: revertX, currentY: revertY, isDragging: false }
            : g
        );
        setGears(updated);
        evaluateMechanism(updated);
        return;
      }

      // Valid placement: place gear at target coordinates
      sound.playValidPlacement();
      if (snapResult.snapped) {
        sound.playGearMesh();
      }

      // Record move into history
      undoStack.current.push({
        gearId,
        fromX: previousX,
        fromY: previousY,
        toX: targetX,
        toY: targetY,
      });
      redoStack.current = [];
      updateUndoRedoAvailability();

      setMoves((m) => m + 1);
      if (isLevelOne) {
        setShowTutorial(false);
      }

      const updated = gears.map((g) =>
        g.id === gearId
          ? { ...g, currentX: targetX, currentY: targetY, isDragging: false }
          : g
      );
      setGears(updated);
      evaluateMechanism(updated);
    },
    [gears, levelData, settings.snapSensitivity, evaluateMechanism]
  );

  // Undo Action
  const handleUndo = () => {
    if (undoStack.current.length === 0) return;
    const lastMove = undoStack.current.pop()!;
    redoStack.current.push(lastMove);
    updateUndoRedoAvailability();

    sound.playGearSelect();
    const updated = gears.map((g) =>
      g.id === lastMove.gearId
        ? { ...g, currentX: lastMove.fromX, currentY: lastMove.fromY }
        : g
    );
    setGears(updated);
    evaluateMechanism(updated);
  };

  // Redo Action
  const handleRedo = () => {
    if (redoStack.current.length === 0) return;
    const nextMove = redoStack.current.pop()!;
    undoStack.current.push(nextMove);
    updateUndoRedoAvailability();

    sound.playGearSelect();
    const updated = gears.map((g) =>
      g.id === nextMove.gearId
        ? { ...g, currentX: nextMove.toX, currentY: nextMove.toY }
        : g
    );
    setGears(updated);
    evaluateMechanism(updated);
  };

  // Reset Level Action
  const handleReset = () => {
    sound.playGearSelect();
    undoStack.current = [];
    redoStack.current = [];
    updateUndoRedoAvailability();

    const resetGears = levelData.gears.map((g) => ({
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

    setGears(resetGears);
    setMoves(0);
    setInvalidPlacements(0);
    setCurrentHintIndex(-1);
    setActiveHint(null);
    setTimeRemaining(levelData.rules.timed ? levelData.rules.timeLimit : 180);
    if (isLevelOne) {
      setShowTutorial(true);
    }
    evaluateMechanism(resetGears);
  };

  // Hint Trigger Action
  const handleTriggerHint = () => {
    sound.playGearSelect();
    if (!levelData.hints || levelData.hints.length === 0) return;

    const nextIdx = (currentHintIndex + 1) % levelData.hints.length;
    setCurrentHintIndex(nextIdx);
    setActiveHint(levelData.hints[nextIdx]);
    setHintsUsedCount((c) => c + 1);

    if (levelData.hints[nextIdx].gearId) {
      setSelectedGearId(levelData.hints[nextIdx].gearId!);
    }
  };

  // Format time (MM:SS)
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      id="gameplay-screen"
      className="relative w-full h-full flex flex-col justify-between bg-[#0e1318] text-slate-100 overflow-hidden select-none"
    >
      {/* Top Header Controls */}
      <header className="relative z-20 h-14 md:h-16 px-4 md:px-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between backdrop-blur-md">
        {/* Left: HOME & LEVEL TITLE */}
        <div className="flex items-center gap-3">
          <button
            id="game-home-btn"
            onClick={() => {
              sound.playGearSelect();
              onHome();
            }}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 active:scale-95 transition"
            title="Return to Main Menu"
          >
            <Home className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wider">
                LEVEL {levelData.levelNumber.toString().padStart(2, '0')}
              </span>
              {levelData.isWorldBoss && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-red-500/20 border border-amber-500/50 text-[10px] font-extrabold text-amber-300 uppercase tracking-wider animate-pulse">
                  <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                  WORLD BOSS
                </span>
              )}
              <span className="text-xs font-medium text-slate-400 hidden sm:inline">
                | {levelData.name}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 capitalize hidden md:block">
              {levelData.concept?.replace(/_/g, ' ') || 'Mechanical Connection'}
            </div>
          </div>
        </div>

        {/* Center: TARGET CONNECTION COUNTER & TIMER */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700">
            <Radio className={`w-4 h-4 ${targetsSatisfied === totalTargets ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
            <span className="text-xs font-mono font-bold">
              TARGETS {targetsSatisfied}/{totalTargets}
            </span>
          </div>

          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono font-bold text-sm transition-colors ${
              timeRemaining <= 10
                ? 'bg-red-950/80 border-red-500 text-red-400 animate-pulse'
                : timeRemaining <= 30
                ? 'bg-amber-950/80 border-amber-500 text-amber-400'
                : 'bg-slate-800/80 border-slate-700 text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{formatTime(timeRemaining)}</span>
          </div>
        </div>

        {/* Right: TUTORIAL GUIDE (Level 1), DEV DIAGNOSTICS & PAUSE */}
        <div className="flex items-center gap-2">
          {isLevelOne && (
            <button
              id="game-tutorial-btn"
              onClick={() => {
                sound.playGearSelect();
                setShowTutorial((prev) => !prev);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition active:scale-95 cursor-pointer ${
                showTutorial
                  ? 'bg-sky-500/20 border-sky-400/60 text-sky-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
              title="Toggle Tutorial Instructions"
            >
              <HelpCircle className="w-4 h-4 text-sky-400" />
              <span className="hidden sm:inline font-mono">GUIDE</span>
            </button>
          )}

          <button
            id="game-dev-btn"
            onClick={() => {
              sound.playGearSelect();
              onOpenDevMode();
            }}
            title="Developer Diagnostics"
            className="hidden sm:flex items-center justify-center px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-sky-400 text-xs font-mono font-bold transition"
          >
            DEV
          </button>

          <button
            id="game-pause-btn"
            onClick={() => {
              sound.playGearSelect();
              onPause();
            }}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 active:scale-95 transition"
            title="Pause Game"
          >
            <Pause className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* World Boss Alert Banner */}
      {levelData.isWorldBoss && (
        <div className="relative z-20 bg-gradient-to-r from-amber-950/70 via-red-950/60 to-amber-950/70 border-b border-amber-500/40 px-4 py-1.5 flex items-center justify-between text-amber-200 text-xs shadow-md">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0 animate-bounce" />
            <span>
              <strong>WORLD BOSS MECHANISM:</strong> Synchronize all kinetic outputs to master World {levelData.worldId}!
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-900/60 border border-amber-600/50 text-amber-300 font-bold">
            WORLD {levelData.worldId} FINALE
          </span>
        </div>
      )}

      {/* Active Hint Banner */}
      {activeHint && (
        <div className="relative z-20 bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-amber-300 text-xs">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>HINT {currentHintIndex + 1}:</strong> {activeHint.text}
            </span>
          </div>
          <button
            onClick={() => setActiveHint(null)}
            className="text-amber-400/70 hover:text-amber-300 font-bold px-2 py-0.5 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Canvas Stage (75-85% screen) */}
      <main className={`relative flex-1 w-full h-full min-h-0 ${levelData.isWorldBoss ? 'ring-1 ring-inset ring-amber-500/20' : ''}`}>
        <GearCanvas
          board={levelData.board}
          gears={gears}
          obstacles={levelData.obstacles}
          selectedGearId={selectedGearId}
          activeHint={activeHint}
          hasJam={hasJam}
          onSelectGear={setSelectedGearId}
          onMoveGear={handleMoveGear}
          onReleaseGear={handleReleaseGear}
          highContrast={settings.highContrast}
          reducedAnimation={settings.reducedAnimation}
        />

        {/* Level 1 Contextual Drag-and-Drop Tutorial Overlay */}
        {isLevelOne && (
          <TutorialOverlay
            isVisible={showTutorial}
            onDismiss={() => setShowTutorial(false)}
            isGearBeingDragged={gears.some((g) => g.isDragging)}
            hasMadeMove={moves > 0}
          />
        )}
      </main>

      {/* Bottom Controls Bar */}
      <footer className="relative z-20 h-16 md:h-18 px-4 md:px-8 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between backdrop-blur-md">
        {/* Left: UNDO, REDO, RESET, HINT */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="game-undo-btn"
            onClick={handleUndo}
            disabled={!canUndo}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
              canUndo
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 active:scale-95 cursor-pointer'
                : 'bg-slate-800/40 text-slate-500 cursor-not-allowed'
            }`}
            title="Undo last gear move"
          >
            <Undo2 className="w-4 h-4" />
            <span className="hidden sm:inline">UNDO</span>
          </button>

          <button
            id="game-redo-btn"
            onClick={handleRedo}
            disabled={!canRedo}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
              canRedo
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 active:scale-95 cursor-pointer'
                : 'bg-slate-800/40 text-slate-500 cursor-not-allowed'
            }`}
            title="Redo gear move"
          >
            <Redo2 className="w-4 h-4" />
            <span className="hidden sm:inline">REDO</span>
          </button>

          <button
            id="game-reset-btn"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold active:scale-95 transition cursor-pointer"
            title="Reset level to starting state"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">RESET</span>
          </button>

          <button
            id="game-hint-btn"
            onClick={handleTriggerHint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-300 text-xs font-semibold active:scale-95 transition cursor-pointer"
            title="Get tactical placement hint"
          >
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span>HINT</span>
          </button>
        </div>

        {/* Right: MOVES DISPLAY & PENALTIES */}
        <div className="flex items-center gap-4">
          {invalidPlacements > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-red-400 bg-red-950/40 px-2.5 py-1 rounded-lg border border-red-900/50">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>FAULTS: {invalidPlacements}</span>
            </div>
          )}

          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 font-mono">
            <span className="text-xs text-slate-400 font-medium">MOVES</span>
            <span className="text-base font-bold text-white">{moves}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
