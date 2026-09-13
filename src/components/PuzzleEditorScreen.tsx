import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  CustomPuzzle,
  GearData,
  ObstacleData,
  TargetRequirement,
  GearMaterial,
} from '../types';
import { PuzzleEditorCanvas } from './PuzzleEditorCanvas';
import { ExportImportModal } from './ExportImportModal';
import { validateLevel, ValidationReport } from '../engine/levelValidator';
import { sound } from '../engine/audio';
import {
  ArrowLeft,
  Save,
  Play,
  Hammer,
  FlaskConical,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Plus,
  Trash2,
  Copy,
  FolderOpen,
  Share2,
  Compass,
  Magnet,
  Maximize2,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Sliders,
  Settings2,
  Clock,
  ShieldAlert,
} from 'lucide-react';

interface PuzzleEditorScreenProps {
  initialPuzzle: CustomPuzzle;
  onSave: (puzzle: CustomPuzzle) => void;
  onPlayInGame: (puzzle: CustomPuzzle) => void;
  onBackToMenu: () => void;
  onOpenWorkshop: () => void;
}

export const PuzzleEditorScreen: React.FC<PuzzleEditorScreenProps> = ({
  initialPuzzle,
  onSave,
  onPlayInGame,
  onBackToMenu,
  onOpenWorkshop,
}) => {
  const [puzzle, setPuzzle] = useState<CustomPuzzle>(initialPuzzle);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'gear' | 'obstacle' | null>(null);
  const [mode, setMode] = useState<'design' | 'test'>('design');
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [snapToTangent, setSnapToTangent] = useState<boolean>(true);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showValidationDrawer, setShowValidationDrawer] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [solvedPlacements, setSolvedPlacements] = useState<{ gearId: string; x: number; y: number }[] | null>(null);

  // Sync if initialPuzzle changes
  useEffect(() => {
    setPuzzle(initialPuzzle);
  }, [initialPuzzle]);

  // Real-time validation against 11 mechanical rules
  const validation: ValidationReport = useMemo(() => {
    return validateLevel(puzzle);
  }, [puzzle]);

  // Currently selected elements
  const selectedGear = useMemo(() => {
    if (selectedType !== 'gear' || !selectedId) return null;
    return puzzle.gears.find((g) => g.id === selectedId) || null;
  }, [puzzle.gears, selectedId, selectedType]);

  const selectedObstacle = useMemo(() => {
    if (selectedType !== 'obstacle' || !selectedId) return null;
    return puzzle.obstacles.find((o) => o.id === selectedId) || null;
  }, [puzzle.obstacles, selectedId, selectedType]);

  const selectedTargetReq = useMemo(() => {
    if (!selectedGear) return null;
    return puzzle.targets.find((t) => t.gearId === selectedGear.id) || null;
  }, [puzzle.targets, selectedGear]);

  // Handle Save
  const handleSavePuzzle = useCallback(() => {
    const updated: CustomPuzzle = {
      ...puzzle,
      updatedAt: new Date().toISOString(),
    };
    onSave(updated);
    sound.playLevelComplete();
    setSaveToast('Puzzle saved successfully!');
    setTimeout(() => setSaveToast(null), 3000);
  }, [puzzle, onSave]);

  // Update Gear Position
  const handleUpdateGearPosition = useCallback((id: string, x: number, y: number) => {
    setPuzzle((prev) => {
      const isInTray = y >= 520;
      return {
        ...prev,
        gears: prev.gears.map((g) => {
          if (g.id !== id) return g;
          return {
            ...g,
            x,
            y,
            initialX: x,
            initialY: y,
            // If placed in tray, automatically make it movable
            movable: isInTray ? true : g.movable,
          };
        }),
      };
    });
  }, []);

  // Update Obstacle Position & Size
  const handleUpdateObstaclePosition = useCallback(
    (id: string, x: number, y: number, width?: number, height?: number) => {
      setPuzzle((prev) => ({
        ...prev,
        obstacles: prev.obstacles.map((o) => {
          if (o.id !== id) return o;
          return {
            ...o,
            x: Math.max(0, Math.min(prev.board.width - (width || o.width), x)),
            y: Math.max(0, Math.min(prev.board.height - (height || o.height), y)),
            width: width !== undefined ? width : o.width,
            height: height !== undefined ? height : o.height,
          };
        }),
      }));
    },
    []
  );

  // Add a new gear
  const handleAddGear = useCallback(
    (role: 'motor' | 'target' | 'movable' | 'fixed', sizePreset: 'S' | 'M' | 'L' | 'XL' = 'M') => {
      sound.playGearSelect();
      const nextNum = puzzle.gears.length + 1;
      const id = `gear_${Date.now()}_${nextNum}`;

      let radius = 44;
      let teeth = 13;
      if (sizePreset === 'S') {
        radius = 32;
        teeth = 10;
      } else if (sizePreset === 'L') {
        radius = 56;
        teeth = 17;
      } else if (sizePreset === 'XL') {
        radius = 72;
        teeth = 22;
      }

      let x = 600;
      let y = 300;
      let isPowered = false;
      let isTarget = false;
      let isMovable = false;
      let material: GearMaterial = 'steel';
      let name = `Cog ${nextNum}`;

      if (role === 'motor') {
        x = 300;
        y = 250;
        isPowered = true;
        material = 'titanium';
        name = `Motor ${nextNum}`;
      } else if (role === 'target') {
        x = 850;
        y = 250;
        isTarget = true;
        material = 'brass';
        name = `Target ${nextNum}`;
      } else if (role === 'movable') {
        // Place neatly in the assembly inventory tray
        const currentMovable = puzzle.gears.filter((g) => g.movable).length;
        x = 120 + currentMovable * 120;
        y = 600;
        isMovable = true;
        material = 'steel';
        name = `Player Cog ${nextNum}`;
      }

      const newGear: GearData = {
        id,
        type: role === 'motor' ? 'powered' : role === 'movable' ? 'standard' : 'fixed',
        name,
        x,
        y,
        initialX: x,
        initialY: y,
        radius,
        teeth,
        rotation: 0,
        rotationSpeed: 1,
        movable: isMovable,
        powered: isPowered,
        target: isTarget,
        material,
        snapDistance: 50,
      };

      setPuzzle((prev) => {
        const nextTargets = [...prev.targets];
        if (isTarget) {
          nextTargets.push({
            id: `req_${id}`,
            gearId: id,
            required: true,
            mustRotate: true,
            requiredDirection: 'any',
          });
        }
        return {
          ...prev,
          gears: [...prev.gears, newGear],
          targets: nextTargets,
        };
      });

      setSelectedId(id);
      setSelectedType('gear');
    },
    [puzzle.gears]
  );

  // Add an Obstacle Barrier
  const handleAddObstacle = useCallback(() => {
    sound.playGearSelect();
    const id = `obs_${Date.now()}`;
    const newObs: ObstacleData = {
      id,
      x: 550,
      y: 200,
      width: 50,
      height: 150,
      type: 'barrier',
      collision: true,
      visible: true,
    };

    setPuzzle((prev) => ({
      ...prev,
      obstacles: [...prev.obstacles, newObs],
    }));

    setSelectedId(id);
    setSelectedType('obstacle');
  }, []);

  // Delete currently selected element
  const handleDeleteSelected = useCallback(() => {
    if (!selectedId) return;
    sound.playInvalidPlacement();

    if (selectedType === 'gear') {
      setPuzzle((prev) => ({
        ...prev,
        gears: prev.gears.filter((g) => g.id !== selectedId),
        targets: prev.targets.filter((t) => t.gearId !== selectedId),
      }));
    } else if (selectedType === 'obstacle') {
      setPuzzle((prev) => ({
        ...prev,
        obstacles: prev.obstacles.filter((o) => o.id !== selectedId),
      }));
    }

    setSelectedId(null);
    setSelectedType(null);
  }, [selectedId, selectedType]);

  // Duplicate currently selected gear
  const handleDuplicateGear = useCallback(() => {
    if (!selectedGear) return;
    sound.playGearSelect();
    const newId = `gear_${Date.now()}`;
    const cloned: GearData = {
      ...selectedGear,
      id: newId,
      name: `${selectedGear.name} (Copy)`,
      x: Math.min(puzzle.board.width - selectedGear.radius, selectedGear.x + 60),
      y: Math.min(puzzle.board.height - selectedGear.radius, selectedGear.y + 60),
      initialX: Math.min(puzzle.board.width - selectedGear.radius, selectedGear.x + 60),
      initialY: Math.min(puzzle.board.height - selectedGear.radius, selectedGear.y + 60),
    };

    setPuzzle((prev) => ({
      ...prev,
      gears: [...prev.gears, cloned],
    }));
    setSelectedId(newId);
  }, [selectedGear, puzzle.board]);

  // Update Gear Properties
  const updateGearProps = useCallback((gearId: string, updates: Partial<GearData>) => {
    setPuzzle((prev) => ({
      ...prev,
      gears: prev.gears.map((g) => {
        if (g.id !== gearId) return g;
        const next = { ...g, ...updates };
        // If radius changed, adjust teeth proportionally
        if (updates.radius && !updates.teeth) {
          next.teeth = Math.max(8, Math.round(updates.radius * 0.3));
        }
        return next;
      }),
    }));
  }, []);

  // Change Gear Role
  const handleChangeGearRole = useCallback(
    (gearId: string, newRole: 'motor' | 'target' | 'movable' | 'fixed') => {
      sound.playGearSelect();
      setPuzzle((prev) => {
        const gear = prev.gears.find((g) => g.id === gearId);
        if (!gear) return prev;

        const isPowered = newRole === 'motor';
        const isTarget = newRole === 'target';
        const isMovable = newRole === 'movable';

        let nextTargets = prev.targets.filter((t) => t.gearId !== gearId);
        if (isTarget) {
          nextTargets.push({
            id: `req_${gearId}`,
            gearId,
            required: true,
            mustRotate: true,
            requiredDirection: 'any',
          });
        }

        return {
          ...prev,
          targets: nextTargets,
          gears: prev.gears.map((g) => {
            if (g.id !== gearId) return g;
            return {
              ...g,
              powered: isPowered,
              target: isTarget,
              movable: isMovable,
              material: isPowered ? 'titanium' : isTarget ? 'brass' : g.material,
            };
          }),
        };
      });
    },
    []
  );

  // Auto-Arrange Tray Gears evenly
  const handleAutoArrangeTray = useCallback(() => {
    sound.playValidPlacement();
    setPuzzle((prev) => {
      const movableGears = prev.gears.filter((g) => g.movable);
      if (movableGears.length === 0) return prev;

      const trayY = 600;
      const totalWidth = prev.board.width;
      const step = Math.min(140, (totalWidth - 100) / (movableGears.length + 1));

      return {
        ...prev,
        gears: prev.gears.map((g) => {
          if (!g.movable) return g;
          const idx = movableGears.findIndex((mg) => mg.id === g.id);
          const newX = Math.round(50 + (idx + 1) * step);
          return {
            ...g,
            x: newX,
            y: trayY,
            initialX: newX,
            initialY: trayY,
          };
        }),
      };
    });
  }, []);

  // Starter templates
  const handleLoadTemplate = useCallback((templateType: 'blank' | 'transmission' | 'dual_target' | 'maze') => {
    sound.playGearSelect();
    if (templateType === 'blank') {
      setPuzzle((prev) => ({
        ...prev,
        name: 'New Custom Contraption',
        gears: [],
        obstacles: [],
        targets: [],
        solution: { minimumMoves: 1, multipleSolutions: true, placements: [] },
      }));
    } else if (templateType === 'transmission') {
      setPuzzle((prev) => ({
        ...prev,
        name: 'Gear Transmission',
        gears: [
          {
            id: 'power_01',
            type: 'powered',
            name: 'Primary Drive',
            x: 350,
            y: 280,
            radius: 48,
            teeth: 14,
            rotation: 0,
            rotationSpeed: 1,
            movable: false,
            powered: true,
            target: false,
            material: 'titanium',
            snapDistance: 50,
          },
          {
            id: 'target_01',
            type: 'fixed',
            name: 'Chrono Target',
            x: 750,
            y: 280,
            radius: 48,
            teeth: 14,
            rotation: 0,
            rotationSpeed: 1,
            movable: false,
            powered: false,
            target: true,
            material: 'brass',
            snapDistance: 50,
          },
          {
            id: 'gear_01',
            type: 'standard',
            name: 'Transfer Cog 1',
            x: 480,
            y: 600,
            initialX: 480,
            initialY: 600,
            radius: 44,
            teeth: 13,
            rotation: 0,
            rotationSpeed: 1,
            movable: true,
            powered: false,
            target: false,
            material: 'steel',
            snapDistance: 50,
          },
          {
            id: 'gear_02',
            type: 'standard',
            name: 'Transfer Cog 2',
            x: 620,
            y: 600,
            initialX: 620,
            initialY: 600,
            radius: 44,
            teeth: 13,
            rotation: 0,
            rotationSpeed: 1,
            movable: true,
            powered: false,
            target: false,
            material: 'copper',
            snapDistance: 50,
          },
        ],
        obstacles: [],
        targets: [{ id: 'req_01', gearId: 'target_01', required: true, mustRotate: true, requiredDirection: 'any' }],
        solution: {
          minimumMoves: 2,
          multipleSolutions: true,
          placements: [
            { gearId: 'gear_01', x: 442, y: 280 },
            { gearId: 'gear_02', x: 658, y: 280 },
          ],
        },
      }));
    } else if (templateType === 'dual_target') {
      setPuzzle((prev) => ({
        ...prev,
        name: 'Dual Synchronizer',
        gears: [
          {
            id: 'power_01',
            type: 'powered',
            name: 'Central Motor',
            x: 600,
            y: 280,
            radius: 56,
            teeth: 17,
            rotation: 0,
            rotationSpeed: 1,
            movable: false,
            powered: true,
            target: false,
            material: 'titanium',
            snapDistance: 50,
          },
          {
            id: 'target_01',
            type: 'fixed',
            name: 'Left Target',
            x: 280,
            y: 280,
            radius: 44,
            teeth: 13,
            rotation: 0,
            rotationSpeed: 1,
            movable: false,
            powered: false,
            target: true,
            material: 'brass',
            snapDistance: 50,
          },
          {
            id: 'target_02',
            type: 'fixed',
            name: 'Right Target',
            x: 920,
            y: 280,
            radius: 44,
            teeth: 13,
            rotation: 0,
            rotationSpeed: 1,
            movable: false,
            powered: false,
            target: true,
            material: 'brass',
            snapDistance: 50,
          },
          {
            id: 'gear_01',
            type: 'standard',
            name: 'Left Transfer',
            x: 400,
            y: 600,
            initialX: 400,
            initialY: 600,
            radius: 44,
            teeth: 13,
            rotation: 0,
            rotationSpeed: 1,
            movable: true,
            powered: false,
            target: false,
            material: 'steel',
            snapDistance: 50,
          },
          {
            id: 'gear_02',
            type: 'standard',
            name: 'Right Transfer',
            x: 800,
            y: 600,
            initialX: 800,
            initialY: 600,
            radius: 44,
            teeth: 13,
            rotation: 0,
            rotationSpeed: 1,
            movable: true,
            powered: false,
            target: false,
            material: 'steel',
            snapDistance: 50,
          },
        ],
        obstacles: [],
        targets: [
          { id: 'req_01', gearId: 'target_01', required: true, mustRotate: true, requiredDirection: 'any' },
          { id: 'req_02', gearId: 'target_02', required: true, mustRotate: true, requiredDirection: 'any' },
        ],
      }));
    }
  }, []);

  // When test simulation solves the puzzle, capture the winning solution
  const handleTestSolved = useCallback((placements: { gearId: string; x: number; y: number }[]) => {
    setSolvedPlacements(placements);
  }, []);

  // Creator can click "Commit Solved Solution"
  const handleCommitSolution = useCallback(() => {
    if (!solvedPlacements) return;
    sound.playLevelComplete();
    setPuzzle((prev) => ({
      ...prev,
      isVerified: true,
      solution: {
        minimumMoves: solvedPlacements.length,
        multipleSolutions: true,
        placements: solvedPlacements,
      },
    }));
    setSaveToast('Solution verified and saved as official solution!');
    setTimeout(() => setSaveToast(null), 3500);
  }, [solvedPlacements]);

  return (
    <div
      id="puzzle-editor-screen"
      className="relative w-full h-full flex flex-col bg-[#0b0f14] text-slate-100 overflow-hidden select-none"
    >
      {/* Toast Banner */}
      {saveToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-sm shadow-xl shadow-emerald-900/50 flex items-center gap-2 border border-emerald-400/40">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Top Main Navigation Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sound.playGearSelect();
              onBackToMenu();
            }}
            title="Return to Menu"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition active:scale-95 border border-slate-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Puzzle Name Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={puzzle.name}
              onChange={(e) => setPuzzle((p) => ({ ...p, name: e.target.value }))}
              placeholder="Puzzle Title"
              className="px-2.5 py-1 text-sm md:text-base font-bold text-white bg-slate-800/80 hover:bg-slate-800 focus:bg-slate-950 rounded-lg border border-slate-700/80 focus:border-sky-500 focus:outline-none max-w-[200px] md:max-w-xs transition"
            />

            {/* Solvability Badge */}
            <button
              onClick={() => setShowValidationDrawer((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                validation.isValid && validation.solutionSolvesLevel
                  ? 'bg-emerald-950/80 border-emerald-700/80 text-emerald-300'
                  : validation.isValid
                  ? 'bg-sky-950/80 border-sky-700/80 text-sky-300'
                  : 'bg-amber-950/80 border-amber-700/80 text-amber-300'
              }`}
            >
              {validation.isValid && validation.solutionSolvesLevel ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Solvable</span>
                </>
              ) : validation.isValid ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden sm:inline">Valid Rules</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">{validation.errors.length} Issues</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Center Mode Switcher: Design vs Test Simulation */}
        <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800">
          <button
            onClick={() => {
              sound.playGearSelect();
              setMode('design');
              setSolvedPlacements(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              mode === 'design'
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Hammer className="w-3.5 h-3.5" />
            <span>Design</span>
          </button>
          <button
            onClick={() => {
              sound.playGearSelect();
              setMode('test');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              mode === 'test'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Test Play</span>
          </button>
        </div>

        {/* Right Top Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenWorkshop()}
            title="Open Workshop Library"
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition active:scale-95"
          >
            <FolderOpen className="w-4 h-4 text-amber-400" />
            <span>Workshop</span>
          </button>

          <button
            onClick={() => setShowExportModal(true)}
            title="Export / Share JSON"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition active:scale-95"
          >
            <Share2 className="w-4 h-4 text-sky-400" />
          </button>

          <button
            onClick={handleSavePuzzle}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/30 transition active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Save</span>
          </button>

          <button
            onClick={() => {
              sound.playGearSelect();
              onPlayInGame(puzzle);
            }}
            title="Play in standard game screen"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition active:scale-95"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Play</span>
          </button>
        </div>
      </div>

      {/* Validation Checklist Drawer */}
      {showValidationDrawer && (
        <div className="absolute top-14 left-4 z-40 w-80 p-4 rounded-2xl bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-md text-xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-sky-400" />
              11-Rule Mechanical Validator
            </span>
            <button
              onClick={() => setShowValidationDrawer(false)}
              className="text-slate-400 hover:text-white"
            >
              ×
            </button>
          </div>

          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 text-slate-300">
            <div className="flex items-center gap-2">
              {validation.details.poweredCount >= 1 ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>Drive Motor: {validation.details.poweredCount}</span>
            </div>

            <div className="flex items-center gap-2">
              {validation.details.targetCount >= 1 ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>Target Gears: {validation.details.targetCount}</span>
            </div>

            <div className="flex items-center gap-2">
              {puzzle.gears.some((g) => g.movable) ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>Tray Movable Gears: {puzzle.gears.filter((g) => g.movable).length}</span>
            </div>

            <div className="flex items-center gap-2">
              {validation.solutionSolvesLevel ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>Verified Solvable: {validation.solutionSolvesLevel ? 'Yes' : 'Not yet tested'}</span>
            </div>

            {validation.errors.map((err, i) => (
              <div key={i} className="p-1.5 rounded bg-red-950/50 border border-red-800/60 text-red-300 text-[11px]">
                {err}
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-800 flex justify-end">
            <button
              onClick={() => {
                setMode('test');
                setShowValidationDrawer(false);
              }}
              className="px-3 py-1 rounded-lg bg-sky-600 text-white font-semibold"
            >
              Test Play & Verify
            </button>
          </div>
        </div>
      )}

      {/* Test Mode Solved Confirmation Banner */}
      {mode === 'test' && solvedPlacements && (
        <div className="px-4 py-2 bg-gradient-to-r from-emerald-900/90 via-teal-900/90 to-emerald-950/90 border-b border-emerald-500/40 flex items-center justify-between text-xs z-20 shadow-lg">
          <div className="flex items-center gap-2 text-emerald-200 font-semibold">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-bounce" />
            <span>Success! The gear mechanism interlocks and satisfies all output targets!</span>
          </div>
          <button
            onClick={handleCommitSolution}
            className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-md transition active:scale-95"
          >
            Save as Verified Solution
          </button>
        </div>
      )}

      {/* Central Workspace Area */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Left Toolbox / Palette */}
        {mode === 'design' && (
          <div className="w-48 md:w-56 shrink-0 bg-slate-900/90 border-r border-slate-800 flex flex-col p-3 overflow-y-auto space-y-4 z-10">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
                Add Components
              </span>
              <div className="grid grid-cols-1 gap-2 mt-2">
                <button
                  onClick={() => handleAddGear('motor')}
                  className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition active:scale-95"
                >
                  <div className="w-7 h-7 rounded-lg bg-sky-600/30 border border-sky-400/40 flex items-center justify-center text-sky-400 font-bold text-xs">
                    P
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Drive Motor</div>
                    <div className="text-[10px] text-slate-400">Powered starter</div>
                  </div>
                </button>

                <button
                  onClick={() => handleAddGear('target')}
                  className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition active:scale-95"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-600/30 border border-amber-400/40 flex items-center justify-center text-amber-400 font-bold text-xs">
                    T
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Output Target</div>
                    <div className="text-[10px] text-slate-400">Must rotate</div>
                  </div>
                </button>

                <button
                  onClick={() => handleAddGear('movable')}
                  className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition active:scale-95"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-600/30 border border-emerald-400/40 flex items-center justify-center text-emerald-400 font-bold text-xs">
                    M
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Tray Movable Cog</div>
                    <div className="text-[10px] text-slate-400">Player inventory</div>
                  </div>
                </button>

                <button
                  onClick={() => handleAddGear('fixed')}
                  className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition active:scale-95"
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-700/60 border border-slate-600 flex items-center justify-center text-slate-300 font-bold text-xs">
                    F
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Fixed Idle Cog</div>
                    <div className="text-[10px] text-slate-400">Stationary pin</div>
                  </div>
                </button>

                <button
                  onClick={handleAddObstacle}
                  className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition active:scale-95"
                >
                  <div className="w-7 h-7 rounded-lg bg-orange-600/30 border border-orange-400/40 flex items-center justify-center text-orange-400 font-bold text-xs">
                    #
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Barrier Wall</div>
                    <div className="text-[10px] text-slate-400">Placement block</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Quick Size Selection */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
                Quick Size
              </span>
              <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                {(['S', 'M', 'L', 'XL'] as const).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => {
                      if (selectedGear) {
                        const r = sz === 'S' ? 32 : sz === 'M' ? 44 : sz === 'L' ? 56 : 72;
                        updateGearProps(selectedGear.id, { radius: r });
                      } else {
                        handleAddGear('movable', sz);
                      }
                    }}
                    className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-center text-slate-200 transition active:scale-95"
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Snapping Options */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
                Snapping Assists
              </span>
              <div className="space-y-1.5 mt-1.5 text-xs text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={snapToGrid}
                    onChange={(e) => setSnapToGrid(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-sky-500 focus:ring-0"
                  />
                  <span>25px Grid Snap</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={snapToTangent}
                    onChange={(e) => setSnapToTangent(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-sky-500 focus:ring-0"
                  />
                  <span>Mesh Pitch Snapping</span>
                </label>
              </div>
            </div>

            {/* Starter Presets */}
            <div className="pt-2 border-t border-slate-800">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
                Templates
              </span>
              <div className="grid grid-cols-1 gap-1.5 mt-1.5">
                <button
                  onClick={() => handleLoadTemplate('blank')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-left text-xs text-slate-300 border border-slate-700/60"
                >
                  Clear to Blank
                </button>
                <button
                  onClick={() => handleLoadTemplate('transmission')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-left text-xs text-slate-300 border border-slate-700/60"
                >
                  Transmission Setup
                </button>
                <button
                  onClick={() => handleLoadTemplate('dual_target')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-left text-xs text-slate-300 border border-slate-700/60"
                >
                  Dual Synchronizer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Central Canvas */}
        <div className="relative flex-1 h-full overflow-hidden">
          <PuzzleEditorCanvas
            board={puzzle.board}
            gears={puzzle.gears}
            obstacles={puzzle.obstacles}
            targets={puzzle.targets}
            selectedId={selectedId}
            selectedType={selectedType}
            mode={mode}
            snapToGrid={snapToGrid}
            snapToTangent={snapToTangent}
            onSelect={(id, type) => {
              setSelectedId(id);
              setSelectedType(type);
            }}
            onUpdateGearPosition={handleUpdateGearPosition}
            onUpdateObstaclePosition={handleUpdateObstaclePosition}
            onTestSolved={handleTestSolved}
          />
        </div>

        {/* Right Inspector Panel */}
        {mode === 'design' && (
          <div className="w-56 md:w-64 shrink-0 bg-slate-900/90 border-l border-slate-800 flex flex-col p-3 overflow-y-auto space-y-4 z-10">
            {selectedGear ? (
              // Gear Property Inspector
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-white">Gear Inspector</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleDuplicateGear}
                      title="Duplicate"
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleDeleteSelected}
                      title="Delete"
                      className="p-1 text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Role Switcher */}
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Role</label>
                  <select
                    value={
                      selectedGear.powered
                        ? 'motor'
                        : selectedGear.target
                        ? 'target'
                        : selectedGear.movable
                        ? 'movable'
                        : 'fixed'
                    }
                    onChange={(e) => handleChangeGearRole(selectedGear.id, e.target.value as any)}
                    className="w-full mt-1 p-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    <option value="motor">Drive Motor (Powered)</option>
                    <option value="target">Output Target (Must Spin)</option>
                    <option value="movable">Tray Movable (Player Cog)</option>
                    <option value="fixed">Fixed Stationary Pin</option>
                  </select>
                </div>

                {/* Radius / Size */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>Radius: {selectedGear.radius}px</span>
                    <span>{selectedGear.teeth} Teeth</span>
                  </div>
                  <input
                    type="range"
                    min="24"
                    max="88"
                    step="4"
                    value={selectedGear.radius}
                    onChange={(e) =>
                      updateGearProps(selectedGear.id, { radius: parseInt(e.target.value, 10) })
                    }
                    className="w-full mt-1 accent-sky-500"
                  />
                </div>

                {/* Material Selector */}
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Material</label>
                  <select
                    value={selectedGear.material || 'steel'}
                    onChange={(e) =>
                      updateGearProps(selectedGear.id, { material: e.target.value as GearMaterial })
                    }
                    className="w-full mt-1 p-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    <option value="steel">Standard Steel</option>
                    <option value="brass">Polished Brass</option>
                    <option value="copper">Cast Copper</option>
                    <option value="titanium">Alloy Titanium</option>
                    <option value="heavy">Cast Iron (Heavy)</option>
                  </select>
                </div>

                {/* If Target: Requirement Direction */}
                {selectedTargetReq && (
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Target Direction</label>
                    <select
                      value={selectedTargetReq.requiredDirection || 'any'}
                      onChange={(e) => {
                        setPuzzle((prev) => ({
                          ...prev,
                          targets: prev.targets.map((t) =>
                            t.gearId === selectedGear.id
                              ? { ...t, requiredDirection: e.target.value as any }
                              : t
                          ),
                        }));
                      }}
                      className="w-full mt-1 p-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-amber-300"
                    >
                      <option value="any">Any Rotation</option>
                      <option value="clockwise">Clockwise (CW)</option>
                      <option value="counter-clockwise">Counter-Clockwise (CCW)</option>
                    </select>
                  </div>
                )}

                {/* If Motor: Speed & Direction */}
                {selectedGear.powered && (
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Motor Speed</label>
                    <select
                      value={selectedGear.rotationSpeed || 1}
                      onChange={(e) =>
                        updateGearProps(selectedGear.id, {
                          rotationSpeed: parseFloat(e.target.value),
                        })
                      }
                      className="w-full mt-1 p-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-sky-300"
                    >
                      <option value="0.5">0.5x Slow</option>
                      <option value="1">1.0x Normal</option>
                      <option value="1.5">1.5x Fast</option>
                      <option value="2">2.0x Rapid</option>
                    </select>
                  </div>
                )}

                {/* Move to Tray / Move to Board Quick Action */}
                <div className="pt-2 border-t border-slate-800">
                  <button
                    onClick={() => {
                      if (selectedGear.y >= 520) {
                        handleUpdateGearPosition(selectedGear.id, selectedGear.x, 300);
                      } else {
                        handleUpdateGearPosition(selectedGear.id, selectedGear.x, 600);
                      }
                    }}
                    className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200"
                  >
                    {selectedGear.y >= 520 ? 'Move to Board' : 'Send to Assembly Tray'}
                  </button>
                </div>
              </div>
            ) : selectedObstacle ? (
              // Obstacle Inspector
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-white">Barrier Inspector</span>
                  <button
                    onClick={handleDeleteSelected}
                    title="Delete"
                    className="p-1 text-slate-400 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400">Width: {selectedObstacle.width}px</label>
                  <input
                    type="range"
                    min="25"
                    max="300"
                    step="25"
                    value={selectedObstacle.width}
                    onChange={(e) =>
                      handleUpdateObstaclePosition(
                        selectedObstacle.id,
                        selectedObstacle.x,
                        selectedObstacle.y,
                        parseInt(e.target.value, 10),
                        selectedObstacle.height
                      )
                    }
                    className="w-full mt-1 accent-sky-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400">Height: {selectedObstacle.height}px</label>
                  <input
                    type="range"
                    min="25"
                    max="400"
                    step="25"
                    value={selectedObstacle.height}
                    onChange={(e) =>
                      handleUpdateObstaclePosition(
                        selectedObstacle.id,
                        selectedObstacle.x,
                        selectedObstacle.y,
                        selectedObstacle.width,
                        parseInt(e.target.value, 10)
                      )
                    }
                    className="w-full mt-1 accent-sky-500"
                  />
                </div>
              </div>
            ) : (
              // Global Puzzle Properties
              <div className="space-y-3">
                <div className="border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-white">Puzzle Settings</span>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Difficulty</label>
                  <select
                    value={puzzle.difficulty}
                    onChange={(e) => setPuzzle((p) => ({ ...p, difficulty: e.target.value as any }))}
                    className="w-full mt-1 p-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    <option value="very_easy">Very Easy</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="expert">Expert</option>
                    <option value="master">Master</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>Time Limit</span>
                    <span>{puzzle.rules?.timeLimit || 120}s</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="300"
                    step="15"
                    value={puzzle.rules?.timeLimit || 120}
                    onChange={(e) =>
                      setPuzzle((p) => ({
                        ...p,
                        rules: { ...p.rules, timed: true, timeLimit: parseInt(e.target.value, 10) },
                      }))
                    }
                    className="w-full mt-1 accent-sky-500"
                  />
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <button
                    onClick={handleAutoArrangeTray}
                    className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200"
                  >
                    Auto-Arrange Tray
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Export / Import Modal */}
      {showExportModal && (
        <ExportImportModal
          puzzle={puzzle}
          onImport={(imported) => {
            setPuzzle(imported);
            setShowExportModal(false);
          }}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
};
