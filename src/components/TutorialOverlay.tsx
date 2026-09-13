import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Hand, ArrowUp, Zap, CheckCircle2, X, RotateCcw } from 'lucide-react';
import { sound } from '../engine/audio';

interface TutorialOverlayProps {
  isVisible: boolean;
  onDismiss: () => void;
  isGearBeingDragged: boolean;
  hasMadeMove: boolean;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  isVisible,
  onDismiss,
  isGearBeingDragged,
  hasMadeMove,
}) => {
  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between overflow-hidden">
        {/* Top Instructional Banner (interactive pointer-events-auto) */}
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="pointer-events-auto mx-auto mt-3 sm:mt-4 w-[94%] max-w-xl bg-slate-900/95 border border-sky-500/40 rounded-2xl p-3.5 sm:p-4 shadow-2xl backdrop-blur-md text-slate-100"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold tracking-wide text-white flex items-center gap-2 font-mono">
                  TUTORIAL: GEAR TRANSMISSION
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Connect the power motor to the kinetic output target
                </p>
              </div>
            </div>

            <button
              id="tutorial-close-btn"
              onClick={() => {
                sound.playGearSelect();
                onDismiss();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition active:scale-95 cursor-pointer"
              title="Dismiss Tutorial"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick 2-Step Guide */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs">
            <div className="flex items-start gap-2 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                1
              </span>
              <div>
                <span className="font-semibold text-sky-300">Lift from Tray:</span>
                <p className="text-slate-300 text-[11px] leading-relaxed mt-0.5">
                  Touch & drag the steel cog from the bottom assembly tray.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                2
              </span>
              <div>
                <span className="font-semibold text-emerald-300">Drop in Slot:</span>
                <p className="text-slate-300 text-[11px] leading-relaxed mt-0.5">
                  Place it between the blue motor and green output gear.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Action Row */}
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              {isGearBeingDragged ? (
                <span className="text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Now drop into the gap!
                </span>
              ) : (
                'You can grab the cog directly below'
              )}
            </span>

            <button
              id="tutorial-got-it-btn"
              onClick={() => {
                sound.playGearSelect();
                onDismiss();
              }}
              className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs shadow-md transition active:scale-95 cursor-pointer"
            >
              Got It
            </button>
          </div>
        </motion.div>

        {/* SVG Visual Overlay with Animated Drag Trajectory (viewBox matches board 1200x700) */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <svg
            viewBox="0 0 1200 700"
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full"
          >
            <defs>
              {/* Radial glow filter for animated guides */}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              {/* Gradient for trajectory line */}
              <linearGradient id="trajectory-grad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
                <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="1" />
              </linearGradient>

              {/* Arrowhead marker */}
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <polygon points="0 0, 8 4, 0 8" fill="#34d399" />
              </marker>
            </defs>

            {/* Target Slot Ghost Ring at (400, 320) */}
            <g transform="translate(400, 320)">
              {/* Pulsing Target Background */}
              <circle
                r="64"
                fill="rgba(52, 211, 153, 0.08)"
                stroke="#34d399"
                strokeWidth="2.5"
                strokeDasharray="8 6"
                className="animate-spin"
                style={{ animationDuration: '24s' }}
              />
              <circle
                r="72"
                fill="none"
                stroke="rgba(52, 211, 153, 0.35)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              {/* Center target crosshair */}
              <line x1="-12" y1="0" x2="12" y2="0" stroke="#34d399" strokeWidth="2" />
              <line x1="0" y1="-12" x2="0" y2="12" stroke="#34d399" strokeWidth="2" />

              {/* Label above target */}
              <rect
                x="-80"
                y="-96"
                width="160"
                height="26"
                rx="6"
                fill="#0f172a"
                stroke="#34d399"
                strokeWidth="1.5"
                opacity="0.95"
              />
              <text
                x="0"
                y="-79"
                textAnchor="middle"
                fill="#34d399"
                fontSize="12"
                fontWeight="bold"
                fontFamily="system-ui, sans-serif"
                letterSpacing="0.5"
              >
                TARGET SNAP ZONE
              </text>
            </g>

            {/* Trajectory Guide from (400, 550) up to (400, 395) */}
            <path
              d="M 400 535 L 400 395"
              fill="none"
              stroke="url(#trajectory-grad)"
              strokeWidth="4"
              strokeDasharray="10 8"
              markerEnd="url(#arrowhead)"
              className="animate-pulse"
            />

            {/* Inventory Tray Cog Highlight at (400, 590) */}
            <g transform="translate(400, 590)">
              {/* Pulsing ring around cog */}
              <circle
                r="70"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="3"
                strokeDasharray="10 6"
                className="animate-spin"
                style={{ animationDuration: '16s' }}
              />
              <circle
                r="82"
                fill="rgba(56, 189, 248, 0.08)"
                stroke="rgba(56, 189, 248, 0.4)"
                strokeWidth="1.5"
              />

              {/* Callout pill below cog */}
              <rect
                x="-100"
                y="74"
                width="200"
                height="26"
                rx="6"
                fill="#0f172a"
                stroke="#38bdf8"
                strokeWidth="1.5"
                opacity="0.95"
              />
              <text
                x="0"
                y="91"
                textAnchor="middle"
                fill="#38bdf8"
                fontSize="12"
                fontWeight="bold"
                fontFamily="system-ui, sans-serif"
                letterSpacing="0.5"
              >
                1. DRAG FROM HERE
              </text>
            </g>

            {/* Animated Dragging Hand / Pointer Gesture Icon moving from (400, 590) to (400, 320) */}
            <g>
              <animateTransform
                attributeName="transform"
                type="translate"
                values="400 590; 400 590; 400 330; 400 330; 400 590"
                keyTimes="0; 0.15; 0.7; 0.85; 1"
                dur="3s"
                repeatCount="indefinite"
              />
              {/* Elevated hand cursor silhouette */}
              <g transform="translate(-14, -14)">
                {/* Glow drop shadow */}
                <circle cx="14" cy="14" r="22" fill="rgba(56, 189, 248, 0.25)" />
                <circle cx="14" cy="14" r="14" fill="#0284c7" stroke="#ffffff" strokeWidth="2.5" />
                {/* Inner dot */}
                <circle cx="14" cy="14" r="5" fill="#ffffff" />
              </g>
            </g>
          </svg>
        </div>

        {/* Bottom Callout Indicator above Assembly Tray */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="pointer-events-auto mx-auto mb-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-sky-500/40 text-sky-300 text-xs font-medium shadow-lg backdrop-blur-md"
        >
          <ArrowUp className="w-3.5 h-3.5 animate-bounce text-sky-400" />
          <span>Drag the cog upward into the mechanical gear chain</span>
          <button
            onClick={() => {
              sound.playGearSelect();
              onDismiss();
            }}
            className="ml-2 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] transition cursor-pointer"
          >
            Hide
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
