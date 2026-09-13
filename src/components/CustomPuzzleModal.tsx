import React, { useState } from 'react';
import { CustomPuzzle } from '../types';
import {
  Play,
  Edit3,
  Plus,
  Trash2,
  Copy,
  Share2,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  Wrench,
  X,
} from 'lucide-react';
import { sound } from '../engine/audio';

interface CustomPuzzleModalProps {
  puzzles: CustomPuzzle[];
  onPlayPuzzle: (puzzle: CustomPuzzle) => void;
  onEditPuzzle: (puzzle: CustomPuzzle) => void;
  onCreateNew: (templateType: 'blank' | 'starter') => void;
  onDuplicatePuzzle: (puzzle: CustomPuzzle) => void;
  onDeletePuzzle: (id: number | string) => void;
  onOpenExportImport: (puzzle?: CustomPuzzle) => void;
  onClose: () => void;
}

export const CustomPuzzleModal: React.FC<CustomPuzzleModalProps> = ({
  puzzles,
  onPlayPuzzle,
  onEditPuzzle,
  onCreateNew,
  onDuplicatePuzzle,
  onDeletePuzzle,
  onOpenExportImport,
  onClose,
}) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | string | null>(null);

  return (
    <div
      id="custom-puzzle-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-md"
    >
      <div
        id="custom-puzzle-modal-panel"
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden text-slate-100"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-900/30 border border-amber-400/30">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                PUZZLE WORKSHOP
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-sky-400">
                  {puzzles.length} {puzzles.length === 1 ? 'Puzzle' : 'Puzzles'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Design custom gear trains, test solvability, and challenge your friends.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onOpenExportImport()}
              title="Import puzzle from JSON"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition active:scale-95"
            >
              <Upload className="w-4 h-4 text-sky-400" />
              <span className="hidden sm:inline">Import</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-slate-900/90 border-b border-slate-800">
          <span className="text-xs text-slate-400">
            Create a custom puzzle or choose from your saved inventions:
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sound.playGearSelect();
                onCreateNew('blank');
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition active:scale-95"
            >
              <Plus className="w-4 h-4 text-slate-400" />
              <span>Blank Canvas</span>
            </button>
            <button
              onClick={() => {
                sound.playGearSelect();
                onCreateNew('starter');
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-sky-600/25 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Puzzle</span>
            </button>
          </div>
        </div>

        {/* Puzzle Cards Grid */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {puzzles.length === 0 ? (
            <div className="text-center py-16 flex flex-col items-center">
              <Wrench className="w-12 h-12 text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-slate-300">No Custom Puzzles Yet</h3>
              <p className="text-sm text-slate-500 max-w-sm mt-1 mb-6">
                Build your own kinetic gear puzzle from scratch or start from an interactive template.
              </p>
              <button
                onClick={() => onCreateNew('starter')}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold shadow-lg shadow-sky-600/30 transition active:scale-95"
              >
                Create Your First Puzzle
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {puzzles.map((puzzle) => {
                const poweredCount = puzzle.gears.filter((g) => g.powered).length;
                const targetCount = puzzle.targets?.length || 0;
                const movableCount = puzzle.gears.filter((g) => g.movable).length;

                return (
                  <div
                    key={puzzle.id}
                    className="flex flex-col justify-between p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 hover:border-slate-600 transition shadow-sm"
                  >
                    <div>
                      {/* Top Row: Title & Badges */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h4 className="font-bold text-base text-white tracking-tight leading-snug">
                            {puzzle.name}
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            {puzzle.metadata?.description || 'Custom mechanical puzzle contraption.'}
                          </span>
                        </div>
                        {puzzle.isVerified ? (
                          <span
                            title="Tested and verified solvable!"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 text-[10px] font-semibold shrink-0"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Solvable
                          </span>
                        ) : (
                          <span
                            title="Not yet tested or verified"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-700/80 text-amber-300 text-[10px] font-semibold shrink-0"
                          >
                            <AlertCircle className="w-3 h-3 text-amber-400" />
                            Unverified
                          </span>
                        )}
                      </div>

                      {/* Specs Row */}
                      <div className="flex flex-wrap items-center gap-2 my-3 text-xs text-slate-300 font-mono">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/60">
                          {puzzle.gears.length} Gears
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-sky-400">
                          {poweredCount} Motor{poweredCount !== 1 ? 's' : ''}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-amber-400">
                          {targetCount} Target{targetCount !== 1 ? 's' : ''}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-emerald-400">
                          {movableCount} Movable
                        </span>
                        {puzzle.rules?.timed && puzzle.rules?.timeLimit && (
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {puzzle.rules.timeLimit}s
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-700/60 mt-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            sound.playGearSelect();
                            onPlayPuzzle(puzzle);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition active:scale-95 shadow-md shadow-sky-600/25"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Play</span>
                        </button>
                        <button
                          onClick={() => {
                            sound.playGearSelect();
                            onEditPuzzle(puzzle);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition active:scale-95"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                          <span>Edit</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onDuplicatePuzzle(puzzle)}
                          title="Duplicate puzzle"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onOpenExportImport(puzzle)}
                          title="Export & Share JSON"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-700 transition"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>

                        {deleteConfirmId === puzzle.id ? (
                          <div className="flex items-center gap-1 pl-1">
                            <button
                              onClick={() => {
                                sound.playInvalidPlacement();
                                onDeletePuzzle(puzzle.id);
                                setDeleteConfirmId(null);
                              }}
                              className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold hover:bg-red-500"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 text-[10px]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(puzzle.id)}
                            title="Delete puzzle"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
