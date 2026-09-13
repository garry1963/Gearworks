import React from 'react';
import { PlayerSaveData } from '../types';
import { X, Zap, Trophy, Flame, Play, Timer } from 'lucide-react';
import { sound } from '../engine/audio';

interface ChallengeModalProps {
  saveData: PlayerSaveData;
  onStartChallenge: () => void;
  onClose: () => void;
}

export const ChallengeModal: React.FC<ChallengeModalProps> = ({
  saveData,
  onStartChallenge,
  onClose,
}) => {
  const records = saveData.challenge.records;

  return (
    <div
      id="challenge-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-6"
    >
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 text-slate-100 flex flex-col text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-left">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold tracking-wider text-emerald-400 uppercase">
                MECHANICAL GAUNTLET
              </span>
              <h2 className="text-xl font-bold text-white">CHALLENGE MODE</h2>
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
          Race against a rapid kinetic countdown across randomized assembly challenges. Each consecutive success increases your point multiplier and tests your reflex mechanics.
        </p>

        {/* Challenge Records */}
        <div className="grid grid-cols-3 gap-2.5 my-4">
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <Timer className="w-3 h-3 text-sky-400" />
              TOP TIER
            </span>
            <div className="text-lg font-black font-mono text-sky-400 mt-1">
              Lvl {records.highestLevel || 0}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" />
              BEST RUN
            </span>
            <div className="text-lg font-black font-mono text-amber-400 mt-1">
              {records.highestScore ? records.highestScore.toLocaleString() : 0}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <Flame className="w-3 h-3 text-orange-400" />
              STREAK
            </span>
            <div className="text-lg font-black font-mono text-orange-400 mt-1">
              {records.longestStreak || 0}
            </div>
          </div>
        </div>

        <button
          id="launch-challenge-btn"
          onClick={() => {
            sound.playGearSelect();
            onStartChallenge();
          }}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-base shadow-lg shadow-emerald-600/30 active:scale-98 transition cursor-pointer mt-2"
        >
          <Play className="w-5 h-5 fill-white" />
          <span>START GAUNTLET RUN</span>
        </button>
      </div>
    </div>
  );
};
