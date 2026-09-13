import React from 'react';
import { PlayerSaveData, UserAchievementRecord } from '../types';
import achievementsData from '../data/achievements.json';
import { X, Award, CheckCircle2, Lock, Star } from 'lucide-react';
import { sound } from '../engine/audio';

interface AchievementsModalProps {
  saveData: PlayerSaveData;
  onClose: () => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  saveData,
  onClose,
}) => {
  const userAchievements = saveData.achievements || {};
  const achievementsList = achievementsData as Array<{
    id: string;
    name: string;
    description: string;
    requirementType: string;
    requirementValue: number;
    iconName: string;
  }>;
  const total = achievementsList.length;
  const unlockedCount = (Object.values(userAchievements) as UserAchievementRecord[]).filter(
    (a) => a && a.unlocked
  ).length;

  return (
    <div
      id="achievements-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-6"
    >
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold tracking-wider text-purple-400 uppercase">
                HONORS & BADGES
              </span>
              <h2 className="text-2xl font-bold text-white">ACHIEVEMENTS</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-purple-300">
              {unlockedCount} / {total}
            </span>
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
        </div>

        {/* List of achievements */}
        <div className="p-6 space-y-3 overflow-y-auto max-h-[70vh]">
          {achievementsList.map((ach) => {
            const userAch = userAchievements[ach.id];
            const isUnlocked = userAch?.unlocked || false;

            return (
              <div
                key={ach.id}
                className={`flex items-start gap-3.5 p-4 rounded-2xl border transition-all ${
                  isUnlocked
                    ? 'bg-slate-950/80 border-purple-500/40 text-slate-100'
                    : 'bg-slate-950/30 border-slate-800 text-slate-500 opacity-60'
                }`}
              >
                <div
                  className={`p-3 rounded-xl border shrink-0 ${
                    isUnlocked
                      ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                      : 'bg-slate-800 border-slate-700 text-slate-600'
                  }`}
                >
                  {isUnlocked ? <Award className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4
                      className={`text-sm font-bold ${
                        isUnlocked ? 'text-white' : 'text-slate-400'
                      }`}
                    >
                      {ach.name}
                    </h4>
                    {isUnlocked && (
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        UNLOCKED
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    {ach.description}
                  </p>
                  {userAch?.unlockedAt && (
                    <div className="text-[10px] font-mono text-slate-500 mt-1.5">
                      Earned: {new Date(userAch.unlockedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
