import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  PlayerSaveData,
  LevelData,
  RuntimeGear,
  LevelProgress,
  CustomPuzzle,
} from './types';
import {
  loadSaveData,
  saveGameData,
  defaultSaveData,
  loadCustomPuzzles,
  saveCustomPuzzle,
  deleteCustomPuzzle,
  DEFAULT_STARTER_PUZZLE,
} from './engine/storage';
import {
  loadLevel,
  getDailyLevel,
  loadCustomLevel,
  LoadedLevelResult,
} from './engine/levelLoader';
import { calculateScoreAndStars, ScoreCalculationResult } from './engine/scoring';
import scoringConfig from './data/scoring.json';
import { sound } from './engine/audio';

// Components
import { MainMenu } from './components/MainMenu';
import { GameScreen } from './components/GameScreen';
import { LevelSelectModal } from './components/LevelSelectModal';
import { LevelCompleteModal } from './components/LevelCompleteModal';
import { LevelFailedModal } from './components/LevelFailedModal';
import { PauseModal } from './components/PauseModal';
import { SettingsModal } from './components/SettingsModal';
import { DailyModal } from './components/DailyModal';
import { ChallengeModal } from './components/ChallengeModal';
import { AchievementsModal } from './components/AchievementsModal';
import { StatisticsModal } from './components/StatisticsModal';
import { DevDebugDrawer } from './components/DevDebugDrawer';
import { PuzzleEditorScreen } from './components/PuzzleEditorScreen';
import { CustomPuzzleModal } from './components/CustomPuzzleModal';
import { ExportImportModal } from './components/ExportImportModal';

type ScreenType = 'menu' | 'game' | 'editor';
type ModalType =
  | null
  | 'levelSelect'
  | 'daily'
  | 'challenge'
  | 'achievements'
  | 'statistics'
  | 'settings'
  | 'pause'
  | 'levelComplete'
  | 'levelFailed'
  | 'workshop'
  | 'exportImport';

export default function App() {
  const [saveData, setSaveData] = useState<PlayerSaveData>(() => loadSaveData());
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('menu');
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isDevOpen, setIsDevOpen] = useState<boolean>(false);

  // Custom puzzle workshop state
  const [customPuzzles, setCustomPuzzles] = useState<CustomPuzzle[]>(() => loadCustomPuzzles());
  const [currentEditingPuzzle, setCurrentEditingPuzzle] = useState<CustomPuzzle | null>(null);
  const [exportTargetPuzzle, setExportTargetPuzzle] = useState<CustomPuzzle | null>(null);

  // Active game session state
  const [gameMode, setGameMode] = useState<'campaign' | 'daily' | 'challenge' | 'custom'>('campaign');
  const [currentLevelId, setCurrentLevelId] = useState<number>(1);
  const [loadedResult, setLoadedResult] = useState<LoadedLevelResult | null>(null);
  const [gameSessionId, setGameSessionId] = useState<number>(1);

  // Completion metrics
  const [lastScoreResult, setLastScoreResult] = useState<ScoreCalculationResult | null>(null);
  const [lastCompletionStats, setLastCompletionStats] = useState<{
    timeRemaining: number;
    timeTaken: number;
    moves: number;
    invalidPlacements: number;
  }>({
    timeRemaining: 0,
    timeTaken: 0,
    moves: 0,
    invalidPlacements: 0,
  });

  // Keep ref to latest saveData for auto-saving
  const saveDataRef = useRef<PlayerSaveData>(saveData);
  useEffect(() => {
    saveDataRef.current = saveData;
    saveGameData(saveData);
  }, [saveData]);

  // Total play time increment tracker
  useEffect(() => {
    const interval = setInterval(() => {
      setSaveData((prev) => ({
        ...prev,
        statistics: {
          ...prev.statistics,
          totalPlayTime: (prev.statistics.totalPlayTime || 0) + 1,
        },
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize audio settings on boot
  useEffect(() => {
    sound.setSettings(
      saveData.settings.masterVolume,
      saveData.settings.soundEffects,
      saveData.settings.music
    );
  }, []);

  // Helper to check and unlock achievements
  const checkAchievements = useCallback(
    (
      completedLevelId: number,
      starsEarned: number,
      timeRemaining: number,
      invalidPlacements: number,
      isDaily: boolean
    ) => {
      setSaveData((prev) => {
        const ach = { ...prev.achievements };
        const now = new Date().toISOString();

        // 1. first_turn
        if (completedLevelId === 1 && !ach.first_turn?.unlocked) {
          ach.first_turn = { unlocked: true, unlockedAt: now };
        }
        // 2. perfect_mesh
        if (starsEarned === 3 && !ach.perfect_mesh?.unlocked) {
          ach.perfect_mesh = { unlocked: true, unlockedAt: now };
        }
        // 3. flawless_calibration
        if (invalidPlacements === 0 && !ach.flawless_calibration?.unlocked) {
          ach.flawless_calibration = { unlocked: true, unlockedAt: now };
        }
        // 4. speed_machinist
        if (timeRemaining >= 60 && !ach.speed_machinist?.unlocked) {
          ach.speed_machinist = { unlocked: true, unlockedAt: now };
        }
        // 5. daily_operator
        if (isDaily && !ach.daily_operator?.unlocked) {
          ach.daily_operator = { unlocked: true, unlockedAt: now };
        }

        // 6. apprentice_clockmaker (all 10 levels of world 1)
        const allCompleted = Array.from({ length: 10 }, (_, i) => i + 1).every(
          (num) => prev.playerProgress.levels[num]?.completed || num === completedLevelId
        );
        if (allCompleted && !ach.apprentice_clockmaker?.unlocked) {
          ach.apprentice_clockmaker = { unlocked: true, unlockedAt: now };
        }

        // 7. gear_virtuoso (30 stars)
        let totalStars = 0;
        for (let i = 1; i <= 100; i++) {
          const s = i === completedLevelId ? Math.max(prev.playerProgress.levels[i]?.stars || 0, starsEarned) : (prev.playerProgress.levels[i]?.stars || 0);
          totalStars += s;
        }
        if (totalStars >= 30 && !ach.gear_virtuoso?.unlocked) {
          ach.gear_virtuoso = { unlocked: true, unlockedAt: now };
        }

        // 8. kinetic_streak (3 day daily streak)
        if (prev.statistics.currentDailyStreak >= 3 && !ach.kinetic_streak?.unlocked) {
          ach.kinetic_streak = { unlocked: true, unlockedAt: now };
        }

        return {
          ...prev,
          achievements: ach,
        };
      });
    },
    []
  );

  // Start Level
  const startLevel = useCallback((levelId: number, mode: 'campaign' | 'daily' | 'challenge' = 'campaign') => {
    setGameMode(mode);
    setCurrentLevelId(levelId);
    setGameSessionId((s) => s + 1);

    let loaded: LoadedLevelResult | null = null;
    if (mode === 'daily') {
      const todayStr = new Date().toISOString().split('T')[0];
      loaded = getDailyLevel(todayStr);
    } else {
      loaded = loadLevel(levelId);
    }

    if (loaded) {
      setLoadedResult(loaded);
      setCurrentScreen('game');
      setActiveModal(null);

      // Record attempt in statistics
      setSaveData((prev) => {
        const lvlProg = prev.playerProgress.levels[levelId] || {
          unlocked: true,
          completed: false,
          stars: 0,
          bestScore: 0,
          bestTime: null,
          bestMoves: null,
          attempts: 0,
          hintsUsed: 0,
        };

        return {
          ...prev,
          playerProgress: {
            ...prev.playerProgress,
            currentLevel: levelId,
            levels: {
              ...prev.playerProgress.levels,
              [levelId]: {
                ...lvlProg,
                attempts: lvlProg.attempts + 1,
              },
            },
          },
          statistics: {
            ...prev.statistics,
            levelsAttempted: prev.statistics.levelsAttempted + 1,
          },
        };
      });
    }
  }, []);

  // Handle Level Complete
  const handleLevelComplete = useCallback(
    (stats: {
      timeRemaining: number;
      moves: number;
      invalidPlacements: number;
      hintsUsed: number;
    }) => {
      if (!loadedResult) return;

      const level = loadedResult.level;
      const totalTime = level.rules.timeLimit || 180;
      const timeTaken = Math.max(1, totalTime - stats.timeRemaining);

      const scoreCalc = calculateScoreAndStars(
        scoringConfig,
        level.stars,
        stats.timeRemaining,
        stats.moves,
        level.solution?.minimumMoves || 4,
        stats.invalidPlacements,
        stats.hintsUsed
      );

      setLastScoreResult(scoreCalc);
      setLastCompletionStats({
        timeRemaining: stats.timeRemaining,
        timeTaken,
        moves: stats.moves,
        invalidPlacements: stats.invalidPlacements,
      });

      // Update Player Save Data
      setSaveData((prev) => {
        const prevLvl = prev.playerProgress.levels[level.id] || {
          unlocked: true,
          completed: false,
          stars: 0,
          bestScore: 0,
          bestTime: null,
          bestMoves: null,
          attempts: 1,
          hintsUsed: 0,
        };

        const newStars = Math.max(prevLvl.stars, scoreCalc.starsEarned);
        const newBestScore = Math.max(prevLvl.bestScore, scoreCalc.finalScore);
        const newBestTime = prevLvl.bestTime ? Math.min(prevLvl.bestTime, timeTaken) : timeTaken;
        const newBestMoves = prevLvl.bestMoves ? Math.min(prevLvl.bestMoves, stats.moves) : stats.moves;

        // Unlock next level if in campaign mode
        const nextLevelId = level.id + 1;
        const updatedLevels: Record<number, LevelProgress> = {
          ...prev.playerProgress.levels,
          [level.id]: {
            ...prevLvl,
            completed: true,
            stars: newStars,
            bestScore: newBestScore,
            bestTime: newBestTime,
            bestMoves: newBestMoves,
          },
        };

        if (nextLevelId <= 100 && !updatedLevels[nextLevelId]) {
          updatedLevels[nextLevelId] = {
            unlocked: true,
            completed: false,
            stars: 0,
            bestScore: 0,
            bestTime: null,
            bestMoves: null,
            attempts: 0,
            hintsUsed: 0,
          };
        } else if (nextLevelId <= 100 && updatedLevels[nextLevelId]) {
          updatedLevels[nextLevelId].unlocked = true;
        }

        // Daily mission update
        const todayStr = new Date().toISOString().split('T')[0];
        let dailyStreak = prev.statistics.currentDailyStreak;
        let longestStreak = prev.statistics.longestDailyStreak;
        const updatedDaily = { ...prev.dailyPuzzles };

        if (gameMode === 'daily') {
          if (!updatedDaily[todayStr]?.completed) {
            dailyStreak += 1;
            longestStreak = Math.max(longestStreak, dailyStreak);
          }
          updatedDaily[todayStr] = {
            completed: true,
            score: scoreCalc.finalScore,
            completedAt: new Date().toISOString(),
          };
        }

        // Calculate aggregate statistics
        const completedLevelsList = Object.values(updatedLevels).filter((l) => l.completed);
        const totalCompleted = completedLevelsList.length;
        const totalStarsAccum = Object.values(updatedLevels).reduce((acc, l) => acc + (l.stars || 0), 0);
        const threeStarCount = Object.values(updatedLevels).filter((l) => l.stars === 3).length;
        const totalMovesAccum = prev.statistics.totalMoves + stats.moves;
        const totalScoreAccum = prev.statistics.totalScore + scoreCalc.finalScore;

        return {
          ...prev,
          playerProgress: {
            ...prev.playerProgress,
            currentLevel: Math.min(10, Math.max(prev.playerProgress.currentLevel, nextLevelId)),
            levels: updatedLevels,
          },
          dailyPuzzles: updatedDaily,
          statistics: {
            ...prev.statistics,
            levelsCompleted: totalCompleted,
            totalScore: totalScoreAccum,
            highestScore: Math.max(prev.statistics.highestScore, scoreCalc.finalScore),
            totalStars: totalStarsAccum,
            threeStarLevels: threeStarCount,
            totalMoves: totalMovesAccum,
            averageMoves: totalMovesAccum / Math.max(1, prev.statistics.levelsAttempted),
            hintsUsed: prev.statistics.hintsUsed + stats.hintsUsed,
            invalidPlacements: prev.statistics.invalidPlacements + stats.invalidPlacements,
            currentDailyStreak: dailyStreak,
            longestDailyStreak: longestStreak,
          },
        };
      });

      // Check achievements
      checkAchievements(
        level.id,
        scoreCalc.starsEarned,
        stats.timeRemaining,
        stats.invalidPlacements,
        gameMode === 'daily'
      );

      setActiveModal('levelComplete');
    },
    [loadedResult, gameMode, checkAchievements]
  );

  // Handle Level Failed
  const handleLevelFailed = useCallback((stats: { moves: number; invalidPlacements: number }) => {
    setLastCompletionStats({
      timeRemaining: 0,
      timeTaken: loadedResult?.level.rules.timeLimit || 0,
      moves: stats.moves,
      invalidPlacements: stats.invalidPlacements,
    });
    setActiveModal('levelFailed');
  }, [loadedResult]);

  // Quick Solution Applier for Testing
  const handleApplySolution = useCallback(() => {
    if (!loadedResult) return;
    const sol = loadedResult.level.solution;
    if (!sol || !sol.placements) return;

    setLoadedResult((prev) => {
      if (!prev) return null;
      const updatedGears = prev.runtimeGears.map((g) => {
        const pl = sol.placements.find((p) => p.gearId === g.id);
        if (pl) {
          return { ...g, currentX: pl.x, currentY: pl.y };
        }
        return g;
      });
      return {
        ...prev,
        runtimeGears: updatedGears,
      };
    });
    setGameSessionId((s) => s + 1);
  }, [loadedResult]);

  // Unlock all 100 levels for debugging / exploration
  const handleUnlockAllLevels = useCallback(() => {
    setSaveData((prev) => {
      const allLevels: Record<number, LevelProgress> = { ...prev.playerProgress.levels };
      for (let i = 1; i <= 100; i++) {
        if (!allLevels[i]) {
          allLevels[i] = {
            unlocked: true,
            completed: false,
            stars: 0,
            bestScore: 0,
            bestTime: null,
            bestMoves: null,
            attempts: 0,
            hintsUsed: 0,
          };
        } else {
          allLevels[i] = {
            ...allLevels[i],
            unlocked: true,
          };
        }
      }
      return {
        ...prev,
        playerProgress: {
          ...prev.playerProgress,
          levels: allLevels,
        },
      };
    });
  }, []);

  // Custom Puzzle Handlers
  const startCustomPuzzle = useCallback((puzzle: CustomPuzzle) => {
    const loaded = loadCustomLevel(puzzle);
    setGameMode('custom');
    setLoadedResult(loaded);
    setCurrentScreen('game');
    setActiveModal(null);
  }, []);

  const handleCreateNewPuzzle = useCallback((templateType: 'blank' | 'starter' = 'blank') => {
    let newPuzzle: CustomPuzzle;
    if (templateType === 'starter') {
      newPuzzle = {
        ...DEFAULT_STARTER_PUZZLE,
        id: Date.now(),
        name: `Custom Contraption ${customPuzzles.length + 1}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else {
      newPuzzle = {
        id: Date.now(),
        levelNumber: 900 + customPuzzles.length + 1,
        worldId: 9,
        name: `Custom Puzzle ${customPuzzles.length + 1}`,
        difficulty: 'medium',
        author: 'Player',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        board: { width: 1200, height: 750, gridSize: 25, snapToGrid: true },
        gears: [
          {
            id: 'power_main',
            type: 'powered',
            name: 'Drive Motor',
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
            id: 'target_main',
            type: 'fixed',
            name: 'Output Target',
            x: 850,
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
            id: 'cog_tray_1',
            type: 'standard',
            name: 'Transfer Cog',
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
        ],
        obstacles: [],
        targets: [
          {
            id: 'req_target_main',
            gearId: 'target_main',
            required: true,
            mustRotate: true,
            requiredDirection: 'any',
          },
        ],
        rules: {
          timed: true,
          timeLimit: 120,
          allowUndo: true,
          allowReset: true,
          allowHints: true,
          allowPause: true,
        },
        stars: {
          three: { maxMoves: 4, minimumTimeRemaining: 60, maxHints: 0, completionRequired: true },
          two: { maxMoves: 6, minimumTimeRemaining: 30, maxHints: 1, completionRequired: true },
          one: { completionRequired: true },
        },
        solution: {
          minimumMoves: 1,
          multipleSolutions: true,
          placements: [],
          connectionOrder: [],
        },
        scoring: {
          baseScore: 1000,
          timeMultiplier: 10,
          moveMultiplier: 50,
          invalidPlacementPenalty: 25,
          hintPenalty: 100,
        },
        hints: [],
        metadata: {
          tutorial: false,
          dailyEligible: false,
          challengeEligible: false,
          tags: ['custom'],
          description: 'Custom player-created gear mechanism.',
        },
        isVerified: false,
      };
    }
    setCurrentEditingPuzzle(newPuzzle);
    setCurrentScreen('editor');
    setActiveModal(null);
  }, [customPuzzles.length]);

  const handleSaveCustomPuzzle = useCallback((puzzleToSave: CustomPuzzle) => {
    saveCustomPuzzle(puzzleToSave);
    setCustomPuzzles(loadCustomPuzzles());
  }, []);

  const handleDeleteCustomPuzzle = useCallback((id: number | string) => {
    deleteCustomPuzzle(id);
    setCustomPuzzles(loadCustomPuzzles());
  }, []);

  const handleDuplicateCustomPuzzle = useCallback((puzzleToDuplicate: CustomPuzzle) => {
    const cloned: CustomPuzzle = {
      ...puzzleToDuplicate,
      id: Date.now(),
      name: `${puzzleToDuplicate.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveCustomPuzzle(cloned);
    setCustomPuzzles(loadCustomPuzzles());
  }, []);

  // Reset all game data
  const handleResetAllData = useCallback(() => {
    setSaveData(JSON.parse(JSON.stringify(defaultSaveData)));
    saveGameData(defaultSaveData);
    setCurrentScreen('menu');
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* Screen Router */}
      {currentScreen === 'menu' && (
        <MainMenu
          saveData={saveData}
          onPlayCurrentLevel={() => startLevel(saveData.playerProgress.currentLevel)}
          onOpenLevelSelect={() => setActiveModal('levelSelect')}
          onOpenDaily={() => setActiveModal('daily')}
          onOpenChallenge={() => setActiveModal('challenge')}
          onOpenAchievements={() => setActiveModal('achievements')}
          onOpenStatistics={() => setActiveModal('statistics')}
          onOpenSettings={() => setActiveModal('settings')}
          onOpenDevMode={() => setIsDevOpen(true)}
          onOpenWorkshop={() => setActiveModal('workshop')}
          onCreatePuzzle={() => handleCreateNewPuzzle('blank')}
        />
      )}

      {currentScreen === 'editor' && currentEditingPuzzle && (
        <PuzzleEditorScreen
          initialPuzzle={currentEditingPuzzle}
          onSave={handleSaveCustomPuzzle}
          onPlayInGame={(puz) => {
            handleSaveCustomPuzzle(puz);
            startCustomPuzzle(puz);
          }}
          onBackToMenu={() => setCurrentScreen('menu')}
          onOpenWorkshop={() => setActiveModal('workshop')}
        />
      )}

      {currentScreen === 'game' && loadedResult && (
        <GameScreen
          key={`game-session-${loadedResult.level.id}-${gameSessionId}`}
          levelData={loadedResult.level}
          initialGears={loadedResult.runtimeGears}
          settings={saveData.settings}
          onHome={() => {
            sound.playGearSelect();
            setCurrentScreen('menu');
          }}
          onPause={() => setActiveModal('pause')}
          onLevelComplete={handleLevelComplete}
          onLevelFailed={handleLevelFailed}
          onOpenDevMode={() => setIsDevOpen(true)}
        />
      )}

      {/* Modals */}
      {activeModal === 'workshop' && (
        <CustomPuzzleModal
          puzzles={customPuzzles}
          onPlayPuzzle={(puz) => startCustomPuzzle(puz)}
          onEditPuzzle={(puz) => {
            setCurrentEditingPuzzle(puz);
            setCurrentScreen('editor');
            setActiveModal(null);
          }}
          onCreateNew={handleCreateNewPuzzle}
          onDuplicatePuzzle={handleDuplicateCustomPuzzle}
          onDeletePuzzle={handleDeleteCustomPuzzle}
          onOpenExportImport={(puz) => {
            setExportTargetPuzzle(puz || currentEditingPuzzle || customPuzzles[0] || DEFAULT_STARTER_PUZZLE);
            setActiveModal('exportImport');
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'exportImport' && (
        <ExportImportModal
          puzzle={exportTargetPuzzle || currentEditingPuzzle || customPuzzles[0] || DEFAULT_STARTER_PUZZLE}
          onImport={(imported) => {
            handleSaveCustomPuzzle(imported);
            setCurrentEditingPuzzle(imported);
            setCurrentScreen('editor');
            setActiveModal(null);
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'levelSelect' && (
        <LevelSelectModal
          saveData={saveData}
          onSelectLevel={(id) => startLevel(id, 'campaign')}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'levelComplete' && loadedResult && lastScoreResult && (
        <LevelCompleteModal
          levelNumber={loadedResult.level.levelNumber}
          levelName={loadedResult.level.name}
          scoreResult={lastScoreResult}
          timeRemaining={lastCompletionStats.timeRemaining}
          timeTaken={lastCompletionStats.timeTaken}
          moves={lastCompletionStats.moves}
          bestScore={saveData.playerProgress.levels[loadedResult.level.id]?.bestScore || 0}
          hasNextLevel={loadedResult.level.id < 100}
          onNextLevel={() => startLevel(loadedResult.level.id + 1, 'campaign')}
          onReplay={() => startLevel(loadedResult.level.id, gameMode)}
          onLevelSelect={() => {
            setActiveModal('levelSelect');
            setCurrentScreen('menu');
          }}
          onMainMenu={() => {
            setActiveModal(null);
            setCurrentScreen('menu');
          }}
        />
      )}

      {activeModal === 'levelFailed' && loadedResult && (
        <LevelFailedModal
          levelNumber={loadedResult.level.levelNumber}
          levelName={loadedResult.level.name}
          moves={lastCompletionStats.moves}
          bestScore={saveData.playerProgress.levels[loadedResult.level.id]?.bestScore || 0}
          onTryAgain={() => startLevel(loadedResult.level.id, gameMode)}
          onLevelSelect={() => {
            setActiveModal('levelSelect');
            setCurrentScreen('menu');
          }}
          onMainMenu={() => {
            setActiveModal(null);
            setCurrentScreen('menu');
          }}
        />
      )}

      {activeModal === 'pause' && loadedResult && (
        <PauseModal
          levelNumber={loadedResult.level.levelNumber}
          levelName={loadedResult.level.name}
          onResume={() => setActiveModal(null)}
          onRestart={() => startLevel(loadedResult.level.id, gameMode)}
          onLevelSelect={() => {
            setActiveModal('levelSelect');
            setCurrentScreen('menu');
          }}
          onSettings={() => setActiveModal('settings')}
          onQuitToMenu={() => {
            setActiveModal(null);
            setCurrentScreen('menu');
          }}
        />
      )}

      {activeModal === 'settings' && (
        <SettingsModal
          settings={saveData.settings}
          onUpdateSettings={(newSettings) =>
            setSaveData((prev) => ({ ...prev, settings: newSettings }))
          }
          onResetAllData={handleResetAllData}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'daily' && (
        <DailyModal
          saveData={saveData}
          onPlayDaily={() => startLevel(1, 'daily')}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'challenge' && (
        <ChallengeModal
          saveData={saveData}
          onStartChallenge={() => startLevel(1, 'challenge')}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'achievements' && (
        <AchievementsModal
          saveData={saveData}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'statistics' && (
        <StatisticsModal
          statistics={saveData.statistics}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* Developer Diagnostics Drawer */}
      {isDevOpen && (
        <DevDebugDrawer
          currentLevel={loadedResult?.level || null}
          runtimeGears={loadedResult?.runtimeGears || []}
          onSelectLevel={(id) => startLevel(id, 'campaign')}
          onApplySolution={handleApplySolution}
          onUnlockAllLevels={handleUnlockAllLevels}
          onClose={() => setIsDevOpen(false)}
        />
      )}
    </div>
  );
}
