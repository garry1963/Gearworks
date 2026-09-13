import React from 'react';
import { PlayerSaveData, LevelProgress } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Play,
  Grid,
  Calendar,
  Zap,
  Award,
  BarChart3,
  Settings,
  Star,
  Trophy,
  Flame,
  CheckCircle2,
  Sliders,
  Wrench,
  PenTool,
} from 'lucide-react';
import { sound } from '../engine/audio';

interface MainMenuProps {
  saveData: PlayerSaveData;
  onPlayCurrentLevel: () => void;
  onOpenLevelSelect: () => void;
  onOpenDaily: () => void;
  onOpenChallenge: () => void;
  onOpenAchievements: () => void;
  onOpenStatistics: () => void;
  onOpenSettings: () => void;
  onOpenDevMode: () => void;
  onOpenWorkshop: () => void;
  onCreatePuzzle: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  saveData,
  onPlayCurrentLevel,
  onOpenLevelSelect,
  onOpenDaily,
  onOpenChallenge,
  onOpenAchievements,
  onOpenStatistics,
  onOpenSettings,
  onOpenDevMode,
  onOpenWorkshop,
  onCreatePuzzle,
}) => {
  const { currentLevel, levels } = saveData.playerProgress;
  const levelsList = Object.values(levels) as LevelProgress[];
  const completedCount = levelsList.filter((l) => l && l.completed).length;
  const totalStars = levelsList.reduce((acc, l) => acc + (l?.stars || 0), 0);
  const bestScore = saveData.statistics.highestScore;
  const dailyStreak = saveData.statistics.currentDailyStreak;

  return (
    <div
      id="main-menu-screen"
      className="relative w-full h-full flex flex-col justify-between p-6 md:p-10 bg-radial from-[#1e293b]/40 via-[#0e1318] to-[#090d12] text-slate-100 overflow-y-auto"
    >
      {/* Background Decorative Blueprint Gears */}
      <div className="absolute inset-0 pointer-events-none opacity-5 overflow-hidden flex items-center justify-center">
        <svg
          viewBox="0 0 1000 1000"
          className="w-[1200px] h-[1200px] animate-spin"
          style={{ animationDuration: '90s' }}
        >
          <circle cx="500" cy="500" r="400" stroke="#38bdf8" strokeWidth="8" fill="none" strokeDasharray="20 15" />
          <circle cx="500" cy="500" r="280" stroke="#f59e0b" strokeWidth="6" fill="none" />
          <circle cx="500" cy="500" r="160" stroke="#94a3b8" strokeWidth="12" fill="none" strokeDasharray="30 20" />
        </svg>
      </div>

      {/* Top Header Bar */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center shadow-lg shadow-sky-900/30 border border-sky-400/30">
            <Sliders className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xs tracking-widest font-mono text-sky-400 font-semibold uppercase">
              Industrial Physics Engine
            </span>
            <div className="text-xs text-slate-400">Tablet Edition v1.0.0</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <PWAInstallButton />
          <button
            id="open-dev-mode-btn"
            onClick={() => {
              sound.playGearSelect();
              onOpenDevMode();
            }}
            title="Developer Diagnostics & Level Validator"
            className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-sky-400 hover:bg-slate-700 transition"
          >
            <span className="text-xs font-mono font-bold px-1">DEV</span>
          </button>
          <button
            id="main-settings-btn"
            onClick={() => {
              sound.playGearSelect();
              onOpenSettings();
            }}
            className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 active:scale-95 transition"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center Branding & Action Cluster */}
      <div className="relative z-10 my-auto flex flex-col items-center text-center py-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-medium text-amber-400 mb-4 shadow-sm">
          <Flame className="w-3.5 h-3.5" />
          <span>Rotational Power Transmission</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-2 drop-shadow-md">
          GEAR<span className="text-sky-400">WORKS</span>
        </h1>
        <p className="text-sm md:text-base text-slate-400 max-w-xl font-normal mb-8">
          Assemble mechanical gear trains, mesh interlocking teeth, and relay kinetic power from drive motors to output targets.
        </p>

        {/* Primary Large Play Button */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xl">
          <button
            id="play-game-btn"
            onClick={() => {
              sound.playGearSelect();
              onPlayCurrentLevel();
            }}
            className="w-full sm:flex-1 group flex items-center justify-center gap-3 py-4 md:py-5 px-6 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white font-bold text-lg md:text-xl shadow-xl shadow-sky-600/25 hover:from-sky-400 hover:to-indigo-500 active:scale-98 transition transform cursor-pointer border border-sky-300/30"
          >
            <Play className="w-6 h-6 fill-white group-hover:translate-x-0.5 transition-transform" />
            <span>PLAY LEVEL {currentLevel}</span>
          </button>

          <button
            id="level-select-btn"
            onClick={() => {
              sound.playGearSelect();
              onOpenLevelSelect();
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 py-4 md:py-5 px-5 rounded-2xl bg-slate-800/90 border border-slate-700 text-slate-200 font-semibold text-base hover:bg-slate-700 hover:text-white active:scale-98 transition cursor-pointer"
          >
            <Grid className="w-5 h-5 text-sky-400" />
            <span>LEVELS</span>
          </button>

          <button
            id="create-puzzle-btn"
            onClick={() => {
              sound.playGearSelect();
              onCreatePuzzle();
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 py-4 md:py-5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-base shadow-lg shadow-amber-900/25 hover:from-amber-400 hover:to-orange-500 active:scale-98 transition cursor-pointer border border-amber-300/30"
          >
            <Wrench className="w-5 h-5 text-white" />
            <span>CREATE</span>
          </button>
        </div>

        {/* Secondary Navigation Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 w-full max-w-2xl mt-6">
          <button
            id="daily-puzzle-btn"
            onClick={() => {
              sound.playGearSelect();
              onOpenDaily();
            }}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:bg-slate-800 hover:border-slate-600 transition active:scale-95 text-slate-200"
          >
            <Calendar className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-semibold">DAILY</span>
          </button>

          <button
            id="challenge-mode-btn"
            onClick={() => {
              sound.playGearSelect();
              onOpenChallenge();
            }}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:bg-slate-800 hover:border-slate-600 transition active:scale-95 text-slate-200"
          >
            <Zap className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-semibold">CHALLENGE</span>
          </button>

          <button
            id="workshop-btn"
            onClick={() => {
              sound.playGearSelect();
              onOpenWorkshop();
            }}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:bg-slate-800 hover:border-slate-600 transition active:scale-95 text-slate-200"
          >
            <PenTool className="w-5 h-5 text-orange-400" />
            <span className="text-xs font-semibold">WORKSHOP</span>
          </button>

          <button
            id="achievements-btn"
            onClick={() => {
              sound.playGearSelect();
              onOpenAchievements();
            }}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:bg-slate-800 hover:border-slate-600 transition active:scale-95 text-slate-200"
          >
            <Award className="w-5 h-5 text-purple-400" />
            <span className="text-xs font-semibold">ACHIEVE</span>
          </button>

          <button
            id="statistics-btn"
            onClick={() => {
              sound.playGearSelect();
              onOpenStatistics();
            }}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:bg-slate-800 hover:border-slate-600 transition active:scale-95 text-slate-200"
          >
            <BarChart3 className="w-5 h-5 text-sky-400" />
            <span className="text-xs font-semibold">STATS</span>
          </button>
        </div>
      </div>

      {/* Bottom Status & Metrics Strip */}
      <div className="relative z-10 w-full max-w-3xl mx-auto rounded-2xl bg-slate-900/80 border border-slate-800 p-3.5 backdrop-blur-md">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center divide-x divide-slate-800">
          <div className="flex flex-col items-center">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              COMPLETED
            </span>
            <span className="text-lg font-bold text-white mt-0.5">
              {completedCount} / 100
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              TOTAL STARS
            </span>
            <span className="text-lg font-bold text-amber-400 mt-0.5">
              {totalStars} / 300
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-sky-400" />
              BEST SCORE
            </span>
            <span className="text-lg font-bold text-sky-400 mt-0.5 font-mono">
              {bestScore.toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              DAILY STREAK
            </span>
            <span className="text-lg font-bold text-orange-400 mt-0.5">
              {dailyStreak} {dailyStreak === 1 ? 'Day' : 'Days'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
