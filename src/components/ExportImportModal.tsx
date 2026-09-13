import React, { useState } from 'react';
import { CustomPuzzle } from '../types';
import { Copy, Check, Download, Upload, X, AlertTriangle } from 'lucide-react';
import { sound } from '../engine/audio';

interface ExportImportModalProps {
  puzzle: CustomPuzzle;
  onImport: (importedPuzzle: CustomPuzzle) => void;
  onClose: () => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  puzzle,
  onImport,
  onClose,
}) => {
  const [tab, setTab] = useState<'export' | 'import'>('export');
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const jsonString = JSON.stringify(puzzle, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString).then(() => {
      setCopied(true);
      sound.playValidPlacement();
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${puzzle.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_puzzle.json`;
    a.click();
    URL.revokeObjectURL(url);
    sound.playValidPlacement();
  };

  const handleExecuteImport = () => {
    setError(null);
    try {
      const parsed = JSON.parse(importText.trim());
      if (!parsed || !Array.isArray(parsed.gears) || !parsed.board) {
        setError('Invalid format: Puzzle must contain a board configuration and gears array.');
        sound.playInvalidPlacement();
        return;
      }
      // Ensure required properties
      const custom: CustomPuzzle = {
        ...parsed,
        id: Date.now(),
        createdAt: parsed.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      sound.playLevelComplete();
      onImport(custom);
    } catch (err) {
      setError('JSON Parse Error: Please ensure you pasted valid JSON.');
      sound.playInvalidPlacement();
    }
  };

  return (
    <div
      id="export-import-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div
        id="export-import-modal-panel"
        className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setTab('export');
                setError(null);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition ${
                tab === 'export'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Export Puzzle
            </button>
            <button
              onClick={() => {
                setTab('import');
                setError(null);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition ${
                tab === 'import'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Import Puzzle
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {tab === 'export' ? (
            <>
              <p className="text-sm text-slate-300">
                Share this JSON representation with friends or save a backup copy of your puzzle design:
              </p>
              <div className="relative">
                <textarea
                  readOnly
                  value={jsonString}
                  rows={12}
                  className="w-full p-3 font-mono text-xs bg-slate-950 border border-slate-800 rounded-xl text-sky-300 focus:outline-none select-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition active:scale-95"
                >
                  <Download className="w-4 h-4 text-sky-400" />
                  <span>Download .json</span>
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold shadow-lg shadow-sky-600/30 transition active:scale-95"
                >
                  {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-300">
                Paste JSON code from another player or backup file to load and play their puzzle:
              </p>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <textarea
                placeholder="Paste puzzle JSON here..."
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={12}
                className="w-full p-3 font-mono text-xs bg-slate-950 border border-slate-800 rounded-xl text-sky-200 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none"
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  disabled={!importText.trim()}
                  onClick={handleExecuteImport}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none text-white text-sm font-semibold shadow-lg shadow-emerald-600/30 transition active:scale-95"
                >
                  <Upload className="w-4 h-4" />
                  <span>Import & Open</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
