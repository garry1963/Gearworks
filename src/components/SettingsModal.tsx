import React from 'react';
import { GameSettings } from '../types';
import { X, Volume2, VolumeX, Eye, Sparkles, Sliders, Trash2, Smartphone } from 'lucide-react';
import { sound } from '../engine/audio';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
  onResetAllData: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onResetAllData,
  onClose,
}) => {
  const handleChange = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    sound.playGearSelect();
    const updated = { ...settings, [key]: value };
    onUpdateSettings(updated);
    sound.setSettings(updated.masterVolume, updated.soundEffects, updated.music);
  };

  return (
    <div
      id="settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-6"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono font-bold tracking-wider text-sky-400 uppercase">
              WORKSHOP PREFERENCES
            </span>
            <h2 className="text-2xl font-bold text-white">SETTINGS</h2>
          </div>
          <button
            id="close-settings-btn"
            onClick={() => {
              sound.playGearSelect();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Audio Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-sky-400" />
              AUDIO CONTROLS
            </h3>

            {/* Master Volume */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-300">Master Volume</span>
                <span className="font-mono text-sky-400">{Math.round(settings.masterVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.masterVolume}
                onChange={(e) => handleChange('masterVolume', parseFloat(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
              />
            </div>

            {/* SFX Toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div>
                <div className="text-sm font-semibold text-slate-200">Sound Effects</div>
                <div className="text-xs text-slate-400">Mechanical clicks, mesh tones, chimes</div>
              </div>
              <button
                onClick={() => handleChange('soundEffects', !settings.soundEffects)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                  settings.soundEffects ? 'bg-sky-600 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>
          </div>

          {/* Accessibility & Mechanics Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-amber-400" />
              ACCESSIBILITY & INTERACTION
            </h3>

            {/* High Contrast */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div>
                <div className="text-sm font-semibold text-slate-200">High Contrast Mode</div>
                <div className="text-xs text-slate-400">Enhanced rim highlights & crisp outlines</div>
              </div>
              <button
                onClick={() => handleChange('highContrast', !settings.highContrast)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                  settings.highContrast ? 'bg-sky-600 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            {/* Reduced Animation */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div>
                <div className="text-sm font-semibold text-slate-200">Reduced Animation</div>
                <div className="text-xs text-slate-400">Pause continuous rotational spin</div>
              </div>
              <button
                onClick={() => handleChange('reducedAnimation', !settings.reducedAnimation)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                  settings.reducedAnimation ? 'bg-sky-600 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            {/* Snap Sensitivity */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-300">Touch Snapping Radius</span>
                <span className="font-mono text-sky-400">
                  {settings.snapSensitivity > 1.1 ? 'Generous' : settings.snapSensitivity < 0.9 ? 'Precise' : 'Balanced'}
                </span>
              </div>
              <input
                type="range"
                min="0.7"
                max="1.5"
                step="0.1"
                value={settings.snapSensitivity}
                onChange={(e) => handleChange('snapSensitivity', parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
              />
            </div>
          </div>

          {/* Reset Save Data */}
          <div className="pt-2">
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to reset all game progress and star records?')) {
                  onResetAllData();
                  onClose();
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-950/40 border border-red-900/60 text-red-400 text-xs font-semibold hover:bg-red-900/40 transition active:scale-98"
            >
              <Trash2 className="w-4 h-4" />
              <span>Reset All Progress and Statistics</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
