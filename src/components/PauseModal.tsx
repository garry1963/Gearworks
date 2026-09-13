import React from 'react';
import { Play, RotateCcw, Grid, Settings, Home, X } from 'lucide-react';
import { sound } from '../engine/audio';

interface PauseModalProps {
  levelNumber: number;
  levelName: string;
  onResume: () => void;
  onRestart: () => void;
  onLevelSelect: () => void;
  onSettings: () => void;
  onQuitToMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  levelNumber,
  levelName,
  onResume,
  onRestart,
  onLevelSelect,
  onSettings,
  onQuitToMenu,
}) => {
  return (
    <div
      id="pause-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-6"
    >
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 text-slate-100 flex flex-col text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="text-left">
            <span className="text-xs font-mono font-bold tracking-wider text-sky-400 uppercase">
              LEVEL {levelNumber.toString().padStart(2, '0')}
            </span>
            <h2 className="text-xl font-bold text-white">{levelName}</h2>
          </div>
          <button
            onClick={() => {
              sound.playGearSelect();
              onResume();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2.5 my-3">
          <button
            id="pause-resume-btn"
            onClick={() => {
              sound.playGearSelect();
              onResume();
            }}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-md active:scale-98 transition cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>RESUME GAME</span>
          </button>

          <button
            id="pause-restart-btn"
            onClick={() => {
              sound.playGearSelect();
              onRestart();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs active:scale-98 transition"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>RESTART LEVEL</span>
          </button>

          <button
            id="pause-level-select-btn"
            onClick={() => {
              sound.playGearSelect();
              onLevelSelect();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs active:scale-98 transition"
          >
            <Grid className="w-4 h-4 text-sky-400" />
            <span>LEVEL SELECT</span>
          </button>

          <button
            id="pause-settings-btn"
            onClick={() => {
              sound.playGearSelect();
              onSettings();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs active:scale-98 transition"
          >
            <Settings className="w-4 h-4 text-purple-400" />
            <span>SETTINGS</span>
          </button>

          <button
            id="pause-quit-btn"
            onClick={() => {
              sound.playGearSelect();
              onQuitToMenu();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold text-xs active:scale-98 transition"
          >
            <Home className="w-4 h-4" />
            <span>QUIT TO MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
