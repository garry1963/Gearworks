import React from 'react';
import { PlayerSaveData } from '../types';
import { X, Calendar, Flame, Play, CheckCircle2, Award } from 'lucide-react';
import { sound } from '../engine/audio';

interface DailyModalProps {
  saveData: PlayerSaveData;
  onPlayDaily: () => void;
  onClose: () => void;
}

export const DailyModal: React.FC<DailyModalProps> = ({
  saveData,
  onPlayDaily,
  onClose,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const dailyRecord = saveData.dailyPuzzles[todayStr];
  const isCompletedToday = dailyRecord?.completed || false;
  const currentStreak = saveData.statistics.currentDailyStreak;
  const longestStreak = saveData.statistics.longestDailyStreak;

  return (
    <div
      id="daily-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-6"
    >
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 text-slate-100 flex flex-col text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-left">
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold tracking-wider text-amber-400 uppercase">
                DAILY KINETIC MISSION
              </span>
              <h2 className="text-xl font-bold text-white">{todayStr}</h2>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playGearSelect();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed my-2 text-left bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
          A unique mechanism is synchronized worldwide each day. Complete today's assembly to increment your consecutive daily streak and earn mechanic honors.
        </p>

        {/* Streak Stats */}
        <div className="grid grid-cols-2 gap-3 my-4">
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              CURRENT STREAK
            </span>
            <div className="text-2xl font-black font-mono text-orange-400 mt-1">
              {currentStreak} {currentStreak === 1 ? 'Day' : 'Days'}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <Award className="w-3.5 h-3.5 text-sky-400" />
              LONGEST RECORD
            </span>
            <div className="text-2xl font-black font-mono text-sky-400 mt-1">
              {longestStreak} {longestStreak === 1 ? 'Day' : 'Days'}
            </div>
          </div>
        </div>

        {isCompletedToday ? (
          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-900/60 text-emerald-300 flex items-center justify-center gap-2 text-xs font-semibold my-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>TODAY'S MISSION COMPLETE! (Score: {dailyRecord.score})</span>
          </div>
        ) : null}

        <button
          id="start-daily-puzzle-btn"
          onClick={() => {
            sound.playGearSelect();
            onPlayDaily();
          }}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-base shadow-lg shadow-orange-600/30 active:scale-98 transition cursor-pointer mt-2"
        >
          <Play className="w-5 h-5 fill-white" />
          <span>{isCompletedToday ? 'REPLAY DAILY PUZZLE' : 'START DAILY MISSION'}</span>
        </button>
      </div>
    </div>
  );
};
