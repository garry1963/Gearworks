import React, { useState, useEffect } from 'react';
import { LevelData, RuntimeGear } from '../types';
import { registeredLevels } from '../data/levels';
import { validateLevel, ValidationReport } from '../engine/levelValidator';
import { X, CheckCircle2, AlertTriangle, Bug, Play, Terminal, Cpu, Unlock } from 'lucide-react';
import { sound } from '../engine/audio';

interface DevDebugDrawerProps {
  currentLevel: LevelData | null;
  runtimeGears: RuntimeGear[];
  onSelectLevel: (levelId: number) => void;
  onApplySolution: () => void;
  onUnlockAllLevels?: () => void;
  onClose: () => void;
}

export const DevDebugDrawer: React.FC<DevDebugDrawerProps> = ({
  currentLevel,
  runtimeGears,
  onSelectLevel,
  onApplySolution,
  onUnlockAllLevels,
  onClose,
}) => {
  const [reports, setReports] = useState<ValidationReport[]>([]);
  const [activeTab, setActiveTab] = useState<'validator' | 'gears'>('validator');
  const [selectedValidationWorld, setSelectedValidationWorld] = useState<number>(0); // 0 = all

  useEffect(() => {
    // Validate all 100 registered levels
    const results: ValidationReport[] = [];
    for (let i = 1; i <= 100; i++) {
      const lvl = registeredLevels[i];
      if (lvl) {
        results.push(validateLevel(lvl));
      }
    }
    setReports(results);
  }, []);

  const filteredReports = selectedValidationWorld === 0
    ? reports
    : reports.filter((r) => Math.ceil(r.levelId / 10) === selectedValidationWorld);

  return (
    <div
      id="dev-debug-drawer"
      className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col text-slate-100 font-sans backdrop-blur-lg"
    >
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-500/20 border border-sky-400/30 text-sky-400">
            <Bug className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-sky-400 uppercase">
                DEVELOPER DIAGNOSTICS & TELEMETRY
              </span>
              <span className="text-[10px] bg-sky-950 text-sky-300 px-2 py-0.5 rounded border border-sky-800">
                100 LEVELS ONLINE
              </span>
            </div>
            <h2 className="text-lg font-bold text-white">
              {currentLevel ? `Level ${currentLevel.levelNumber}: ${currentLevel.name}` : 'Engine Sandbox'}
            </h2>
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

      {/* Quick Controls Bar */}
      <div className="p-4 bg-slate-900/40 border-b border-slate-800/80 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">Jump Level:</span>
          <select
            value={currentLevel?.levelNumber || 1}
            onChange={(e) => {
              sound.playGearSelect();
              onSelectLevel(Number(e.target.value));
            }}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs font-mono max-w-[240px]"
          >
            {Array.from({ length: 10 }, (_, wIdx) => {
              const worldNum = wIdx + 1;
              return (
                <optgroup key={worldNum} label={`World ${worldNum} (Levels ${(worldNum - 1) * 10 + 1}-${worldNum * 10})`}>
                  {Array.from({ length: 10 }, (_, lIdx) => {
                    const num = (worldNum - 1) * 10 + lIdx + 1;
                    return (
                      <option key={num} value={num}>
                        Lvl {num}: {registeredLevels[num]?.name || `Mechanism ${num}`}
                      </option>
                    );
                  })}
                </optgroup>
              );
            })}
          </select>
        </div>

        {currentLevel && (
          <button
            onClick={() => {
              sound.playGearSelect();
              onApplySolution();
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition active:scale-95 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Apply Solution Placements</span>
          </button>
        )}

        {onUnlockAllLevels && (
          <button
            onClick={() => {
              sound.playGearSelect();
              onUnlockAllLevels();
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow transition active:scale-95 cursor-pointer"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Unlock All 100 Levels</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 px-4">
        <button
          onClick={() => setActiveTab('validator')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === 'validator'
              ? 'border-sky-500 text-sky-400 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>All 100 Levels Validation ({reports.length}/100)</span>
        </button>

        <button
          onClick={() => setActiveTab('gears')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === 'gears'
              ? 'border-sky-500 text-sky-400 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Active Gears Telemetry ({runtimeGears.length})</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4">
        {activeTab === 'validator' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
              <div className="flex items-center gap-2">
                <span>Filter World:</span>
                <select
                  value={selectedValidationWorld}
                  onChange={(e) => setSelectedValidationWorld(Number(e.target.value))}
                  className="bg-slate-800 border border-slate-700 text-white rounded px-2 py-0.5 text-xs font-mono"
                >
                  <option value={0}>All 100 Levels</option>
                  {Array.from({ length: 10 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      World {i + 1} (Lvl {i * 10 + 1}-{(i + 1) * 10})
                    </option>
                  ))}
                </select>
              </div>

              <span className="font-mono text-emerald-400 font-bold">
                {reports.filter((r) => r.isValid && r.solutionSolvesLevel).length} / 100 Fully Solvable & Valid
              </span>
            </div>

            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/50 max-h-[420px] overflow-y-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="p-3">Lvl</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Solves?</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredReports.map((rep) => (
                    <tr key={rep.levelId} className="hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-sky-400">#{rep.levelId}</td>
                      <td className="p-3 text-slate-200 truncate max-w-[140px]">{rep.levelName}</td>
                      <td className="p-3">
                        {rep.solutionSolvesLevel ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            YES
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-400 font-bold">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            NO
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {rep.isValid ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[11px] border border-emerald-800 font-bold">
                            PASS
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 text-[11px] border border-red-800 font-bold">
                            FAIL ({rep.errors.length})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Error / Warning Details if any */}
            {reports.some((r) => r.errors.length > 0) && (
              <div className="p-4 rounded-2xl bg-red-950/30 border border-red-900/60 text-xs text-red-300 font-mono space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Detected Validation Errors:
                </div>
                {reports.flatMap((r) =>
                  r.errors.map((e, idx) => (
                    <div key={`${r.levelId}-${idx}`}>
                      • Level {r.levelId}: {e}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'gears' && (
          <div className="space-y-3">
            {runtimeGears.map((gear) => (
              <div
                key={gear.id}
                className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-400">
                    ID: {gear.id} ({gear.type})
                  </span>
                  <div className="flex items-center gap-1.5">
                    {gear.isPowered && (
                      <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 text-[10px]">
                        POWERED
                      </span>
                    )}
                    {gear.isJam && (
                      <span className="px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 text-[10px]">
                        JAM
                      </span>
                    )}
                    {gear.target && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px]">
                        TARGET
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-slate-400 text-[11px]">
                  <div>Pos: ({Math.round(gear.currentX)}, {Math.round(gear.currentY)})</div>
                  <div>Radius: {gear.radius}px</div>
                  <div>Teeth: {gear.teeth}</div>
                  <div>Rot: {gear.currentRotation.toFixed(2)} rad</div>
                  <div>ω: {gear.angularVelocity.toFixed(2)}</div>
                  <div>Meshed: {gear.connectedTo.length} gears</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
