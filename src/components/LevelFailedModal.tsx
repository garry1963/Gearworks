import React from 'react';
import { AlertCircle, RotateCcw, Grid, Home } from 'lucide-react';
import { sound } from '../engine/audio';

interface LevelFailedModalProps {
  levelNumber: number;
  levelName: string;
  moves: number;
  bestScore: number;
  onTryAgain: () => void;
  onLevelSelect: () => void;
  onMainMenu: () => void;
}

export const LevelFailedModal: React.FC<LevelFailedModalProps> = ({
  levelNumber,
  levelName,
  moves,
  bestScore,
  onTryAgain,
  onLevelSelect,
  onMainMenu,
}) => {
  return (
    <div
      id="level-failed-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 md:p-6"
    >
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 text-slate-100 flex flex-col text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mb-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>

        <span className="text-xs font-mono font-bold tracking-wider text-red-400 uppercase">
          KINETIC TIMEOUT
        </span>
        <h2 className="text-3xl font-extrabold text-white mt-1">
          TIME'S UP!
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Level {levelNumber}: {levelName}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 my-6">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400">MOVES MADE</span>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{moves}</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400">BEST SCORE</span>
            <div className="text-xl font-bold font-mono text-slate-300 mt-0.5">
              {bestScore > 0 ? bestScore.toLocaleString() : '---'}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            id="try-again-btn"
            onClick={() => {
              sound.playGearSelect();
              onTryAgain();
            }}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-base shadow-lg shadow-red-600/30 active:scale-98 transition cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>TRY AGAIN</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              id="failed-level-select-btn"
              onClick={() => {
                sound.playGearSelect();
                onLevelSelect();
              }}
              className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition active:scale-95"
            >
              <Grid className="w-4 h-4 text-sky-400" />
              <span>LEVEL SELECT</span>
            </button>

            <button
              id="failed-main-menu-btn"
              onClick={() => {
                sound.playGearSelect();
                onMainMenu();
              }}
              className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition active:scale-95"
            >
              <Home className="w-4 h-4" />
              <span>MAIN MENU</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
