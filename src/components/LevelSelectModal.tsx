import React, { useState } from 'react';
import { PlayerSaveData } from '../types';
import { registeredLevels } from '../data/levels';
import gameMetadata from '../data/game.json';
import { X, Star, Lock, CheckCircle2, Play, Trophy, Flame } from 'lucide-react';
import { sound } from '../engine/audio';

interface LevelSelectModalProps {
  saveData: PlayerSaveData;
  onSelectLevel: (levelId: number) => void;
  onClose: () => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  saveData,
  onSelectLevel,
  onClose,
}) => {
  const [selectedWorldId, setSelectedWorldId] = useState<number>(1);
  const worlds = gameMetadata.worlds;
  const currentWorld = worlds.find((w) => w.id === selectedWorldId) || worlds[0];

  const levelsProgress = saveData.playerProgress.levels;

  return (
    <div
      id="level-select-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-8"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-wider text-sky-400 uppercase">
                WORLD {currentWorld.id} / {worlds.length}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">
                Levels {currentWorld.levelRange[0]}–{currentWorld.levelRange[1]}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mt-1">
              {currentWorld.name}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {currentWorld.description}
            </p>
          </div>

          <button
            id="close-level-select-btn"
            onClick={() => {
              sound.playGearSelect();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* World Tabs Navigation */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {worlds.map((world) => {
            const isSelected = world.id === selectedWorldId;
            const isUnlocked =
              world.id === 1 ||
              !!levelsProgress[(world.id - 1) * 10]?.completed ||
              !!levelsProgress[world.levelRange[0]]?.unlocked;

            return (
              <button
                key={world.id}
                onClick={() => {
                  sound.playGearSelect();
                  setSelectedWorldId(world.id);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isSelected
                    ? 'bg-sky-600 text-white shadow-md'
                    : isUnlocked
                    ? 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                    : 'bg-slate-900/40 text-slate-500 hover:text-slate-400 border border-slate-800/60'
                }`}
              >
                {!isUnlocked && <Lock className="w-3 h-3 text-slate-500" />}
                <span>W{world.id}: {world.name}</span>
              </button>
            );
          })}
        </div>

        {/* Level Cards Grid */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
            {Array.from({ length: 10 }, (_, i) => (selectedWorldId - 1) * 10 + i + 1).map((lvlNum) => {
              const progress = levelsProgress[lvlNum];
              // Level is unlocked if progress says unlocked, or if it's level 1,
              // or if the immediately preceding level in the same world was completed
              const isFirstInWorld = lvlNum === (selectedWorldId - 1) * 10 + 1;
              const prevCompleted = lvlNum > 1 && !!levelsProgress[lvlNum - 1]?.completed;
              const worldUnlocked =
                selectedWorldId === 1 ||
                !!levelsProgress[(selectedWorldId - 1) * 10]?.completed ||
                !!levelsProgress[(selectedWorldId - 1) * 10 + 1]?.unlocked;

              const isUnlocked = progress
                ? progress.unlocked
                : (lvlNum === 1) || (worldUnlocked && (isFirstInWorld || prevCompleted));

              const isCompleted = progress ? progress.completed : false;
              const stars = progress ? progress.stars : 0;
              const bestScore = progress ? progress.bestScore : 0;
              const levelConfig = registeredLevels[lvlNum];
              const isBoss = lvlNum % 10 === 0;

              return (
                <div
                  key={lvlNum}
                  id={`level-card-${lvlNum}`}
                  onClick={() => {
                    if (isUnlocked) {
                      sound.playGearSelect();
                      onSelectLevel(lvlNum);
                    }
                  }}
                  className={`relative flex flex-col justify-between p-4 rounded-2xl border transition-all ${
                    isBoss && isUnlocked
                      ? 'bg-gradient-to-b from-amber-950/40 to-slate-900/90 border-amber-500/50 hover:border-amber-400 shadow-amber-950/30 hover:scale-[1.02] cursor-pointer shadow-lg'
                      : isUnlocked
                      ? 'bg-slate-800/80 border-slate-700 hover:border-sky-500 hover:bg-slate-800 active:scale-95 cursor-pointer shadow-lg'
                      : 'bg-slate-900/40 border-slate-800/60 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  {/* Top Row: Number & Status & Boss Tag */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xl font-mono font-extrabold text-white">
                        {lvlNum.toString().padStart(2, '0')}
                      </span>
                      {isBoss && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                          <Flame className="w-2.5 h-2.5 text-amber-400" />
                          BOSS
                        </span>
                      )}
                    </div>
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : !isUnlocked ? (
                      <Lock className="w-4 h-4 text-slate-600" />
                    ) : (
                      <Play className="w-4 h-4 text-sky-400 fill-sky-400" />
                    )}
                  </div>

                  {/* Level Name */}
                  <div className="text-xs font-semibold text-slate-200 line-clamp-1 mb-3">
                    {levelConfig ? levelConfig.name : `Level ${lvlNum}`}
                  </div>

                  {/* Stars Row */}
                  <div className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-slate-900/60 border border-slate-800/60 mb-2">
                    {[1, 2, 3].map((starIndex) => (
                      <Star
                        key={starIndex}
                        className={`w-4 h-4 ${
                          starIndex <= stars
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-700'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Best Score */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-amber-500/70" />
                      BEST
                    </span>
                    <span className="font-bold text-slate-300">
                      {bestScore > 0 ? bestScore.toLocaleString() : '---'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
