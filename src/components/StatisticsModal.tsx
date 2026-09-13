import React from 'react';
import { PlayerStatistics } from '../types';
import { X, BarChart3, Star, Trophy, Clock, CheckCircle2, Flame, AlertTriangle, Lightbulb } from 'lucide-react';
import { sound } from '../engine/audio';

interface StatisticsModalProps {
  statistics: PlayerStatistics;
  onClose: () => void;
}

export const StatisticsModal: React.FC<StatisticsModalProps> = ({
  statistics,
  onClose,
}) => {
  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const remainingSecs = secs % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${remainingSecs}s`;
    return `${mins}m ${remainingSecs}s`;
  };

  const statItems = [
    {
      label: 'Levels Completed',
      value: `${statistics.levelsCompleted} / 100`,
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    },
    {
      label: 'Total Stars Earned',
      value: `${statistics.totalStars} / 300`,
      icon: <Star className="w-4 h-4 text-amber-400 fill-amber-400" />,
    },
    {
      label: '3-Star Masteries',
      value: statistics.threeStarLevels,
      icon: <Trophy className="w-4 h-4 text-amber-500" />,
    },
    {
      label: 'Highest Single Score',
      value: statistics.highestScore.toLocaleString(),
      icon: <Trophy className="w-4 h-4 text-sky-400" />,
    },
    {
      label: 'Total Cumulative Score',
      value: statistics.totalScore.toLocaleString(),
      icon: <BarChart3 className="w-4 h-4 text-blue-400" />,
    },
    {
      label: 'Total Play Time',
      value: formatTime(statistics.totalPlayTime || 0),
      icon: <Clock className="w-4 h-4 text-purple-400" />,
    },
    {
      label: 'Total Moves Executed',
      value: statistics.totalMoves,
      icon: <BarChart3 className="w-4 h-4 text-slate-400" />,
    },
    {
      label: 'Average Moves / Level',
      value: statistics.averageMoves ? statistics.averageMoves.toFixed(1) : '---',
      icon: <BarChart3 className="w-4 h-4 text-slate-400" />,
    },
    {
      label: 'Tactical Hints Consulted',
      value: statistics.hintsUsed,
      icon: <Lightbulb className="w-4 h-4 text-amber-400" />,
    },
    {
      label: 'Placement Faults',
      value: statistics.invalidPlacements,
      icon: <AlertTriangle className="w-4 h-4 text-red-400" />,
    },
    {
      label: 'Longest Daily Streak',
      value: `${statistics.longestDailyStreak} Days`,
      icon: <Flame className="w-4 h-4 text-orange-400" />,
    },
    {
      label: 'Challenge High Level',
      value: `Tier ${statistics.challengeRecord?.highestLevel || 0}`,
      icon: <Trophy className="w-4 h-4 text-teal-400" />,
    },
  ];

  return (
    <div
      id="statistics-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-6"
    >
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-sky-500/20 border border-sky-400/30 text-sky-400">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold tracking-wider text-sky-400 uppercase">
                PERFORMANCE LOGBOOK
              </span>
              <h2 className="text-2xl font-bold text-white">STATISTICS</h2>
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

        {/* Stats Grid */}
        <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[70vh]">
          {statItems.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between"
            >
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                {item.icon}
                {item.label}
              </span>
              <div className="text-lg font-bold font-mono text-white mt-2">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
