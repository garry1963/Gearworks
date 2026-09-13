import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ScoreCalculationResult } from '../engine/scoring';
import { Star, Trophy, Clock, Play, RotateCcw, Grid, Home, Zap, Flame } from 'lucide-react';
import { sound } from '../engine/audio';

interface LevelCompleteModalProps {
  levelNumber: number;
  levelName: string;
  scoreResult: ScoreCalculationResult;
  timeRemaining: number;
  timeTaken: number;
  moves: number;
  bestScore: number;
  hasNextLevel: boolean;
  onNextLevel: () => void;
  onReplay: () => void;
  onLevelSelect: () => void;
  onMainMenu: () => void;
}

export const LevelCompleteModal: React.FC<LevelCompleteModalProps> = ({
  levelNumber,
  levelName,
  scoreResult,
  timeTaken,
  moves,
  bestScore,
  hasNextLevel,
  onNextLevel,
  onReplay,
  onLevelSelect,
  onMainMenu,
}) => {
  useEffect(() => {
    sound.playLevelComplete();

    // Trigger celebratory confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#38bdf8', '#fbbf24', '#34d399', '#f97316'],
      });
    } catch {
      // ignore
    }

    // Play star sounds sequentially
    for (let i = 0; i < scoreResult.starsEarned; i++) {
      setTimeout(() => {
        sound.playStarAward(i);
      }, 300 + i * 250);
    }
  }, [scoreResult.starsEarned]);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isBoss = levelNumber % 10 === 0;
  const worldNum = Math.ceil(levelNumber / 10);

  return (
    <div
      id="level-complete-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 md:p-6"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Glow Header */}
        <div className={`relative p-6 text-center border-b border-slate-800/80 ${
          isBoss ? 'bg-gradient-to-b from-amber-950/80 via-red-950/40 to-transparent' : 'bg-gradient-to-b from-sky-950/60 to-transparent'
        }`}>
          {isBoss ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2 border border-amber-500/40 animate-pulse">
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>WORLD {worldNum} BOSS CONQUERED!</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-2 border border-emerald-500/30">
              <Zap className="w-3.5 h-3.5" />
              <span>Rotational Harmony</span>
            </div>
          )}

          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white uppercase drop-shadow-md">
            {isBoss ? 'WORLD CONQUERED!' : 'MECHANISM COMPLETE!'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Level {levelNumber}: {levelName}
          </p>

          {/* Stars Awarded */}
          <div className="flex items-center justify-center gap-3 my-4">
            {[1, 2, 3].map((starIdx) => {
              const earned = starIdx <= scoreResult.starsEarned;
              return (
                <div
                  key={starIdx}
                  className={`relative flex items-center justify-center p-3 rounded-2xl border transition-all transform ${
                    earned
                      ? 'bg-amber-500/20 border-amber-400/50 scale-110 shadow-lg shadow-amber-500/20'
                      : 'bg-slate-800/40 border-slate-800 opacity-40'
                  }`}
                >
                  <Star
                    className={`w-8 h-8 ${
                      earned ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Score & Statistics Breakdown */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium">TOTAL SCORE</span>
                <div className="text-2xl font-black font-mono text-white">
                  {scoreResult.finalScore.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 font-medium">BEST SCORE</span>
              <div className="text-base font-bold font-mono text-slate-300">
                {Math.max(scoreResult.finalScore, bestScore).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Mini Details Matrix */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                COMPLETION TIME
              </span>
              <span className="text-lg font-bold font-mono text-slate-200 mt-0.5">
                {formatSeconds(timeTaken)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <span className="text-[11px] text-slate-400">MOVES TAKEN</span>
              <span className="text-lg font-bold font-mono text-slate-200 mt-0.5">
                {moves}
              </span>
            </div>
          </div>

          {/* Scoring Ledger */}
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs font-mono text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Base Score:</span>
              <span className="text-slate-200">+{scoreResult.baseScore}</span>
            </div>
            <div className="flex justify-between">
              <span>Time Bonus:</span>
              <span className="text-emerald-400">+{scoreResult.timeBonus}</span>
            </div>
            <div className="flex justify-between">
              <span>Move Efficiency Bonus:</span>
              <span className="text-sky-400">+{scoreResult.moveBonus}</span>
            </div>
            {scoreResult.invalidPenalty > 0 && (
              <div className="flex justify-between text-red-400">
                <span>Placement Fault Penalty:</span>
                <span>-{scoreResult.invalidPenalty}</span>
              </div>
            )}
            {scoreResult.hintPenalty > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>Hint Deductions:</span>
                <span>-{scoreResult.hintPenalty}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 pt-0 flex flex-col gap-2.5">
          {hasNextLevel ? (
            <button
              id="next-level-btn"
              onClick={() => {
                sound.playGearSelect();
                onNextLevel();
              }}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-base shadow-lg shadow-sky-600/30 active:scale-98 transition cursor-pointer"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>NEXT LEVEL</span>
            </button>
          ) : (
            <div className="py-2 text-center text-xs font-semibold text-emerald-400 bg-emerald-950/30 rounded-xl border border-emerald-900/50">
              WORLD 1 CONQUERED! ALL 10 LEVELS COMPLETE!
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <button
              id="replay-level-btn"
              onClick={() => {
                sound.playGearSelect();
                onReplay();
              }}
              className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition active:scale-95"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>REPLAY</span>
            </button>

            <button
              id="complete-level-select-btn"
              onClick={() => {
                sound.playGearSelect();
                onLevelSelect();
              }}
              className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition active:scale-95"
            >
              <Grid className="w-4 h-4 text-sky-400" />
              <span>LEVELS</span>
            </button>

            <button
              id="complete-main-menu-btn"
              onClick={() => {
                sound.playGearSelect();
                onMainMenu();
              }}
              className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition active:scale-95"
            >
              <Home className="w-4 h-4" />
              <span>MENU</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
