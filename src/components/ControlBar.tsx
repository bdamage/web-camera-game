import type { GameStatus } from '../types/game'

interface ControlBarProps {
  canStart: boolean
  status: GameStatus
  soundEnabled: boolean
  debugEnabled: boolean
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onRestart: () => void
  onToggleSound: () => void
  onToggleDebug: () => void
}

export function ControlBar({
  canStart,
  status,
  soundEnabled,
  debugEnabled,
  onStart,
  onPause,
  onResume,
  onRestart,
  onToggleSound,
  onToggleDebug,
}: ControlBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/70 p-3 shadow-lg shadow-slate-300/35 backdrop-blur-sm">
      {(status === 'idle' || status === 'over') && (
        <ActionButton onClick={onStart} disabled={!canStart} tone="primary" label="Start" />
      )}
      {status === 'playing' && (
        <ActionButton onClick={onPause} tone="secondary" label="Pause" />
      )}
      {status === 'paused' && (
        <ActionButton onClick={onResume} tone="secondary" label="Resume" />
      )}
      {(status === 'playing' || status === 'paused') && (
        <ActionButton onClick={onRestart} tone="ghost" label="Restart" />
      )}
      {status === 'over' && (
        <ActionButton onClick={onRestart} tone="primary" label="Play Again" />
      )}

      <button
        type="button"
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        onClick={onToggleSound}
      >
        Sound: {soundEnabled ? 'On' : 'Off'}
      </button>

      <button
        type="button"
        className="ml-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        onClick={onToggleDebug}
      >
        Tracking Debug: {debugEnabled ? 'On' : 'Off'}
      </button>
    </div>
  )
}

function ActionButton({
  label,
  onClick,
  tone,
  disabled,
}: {
  label: string
  onClick: () => void
  tone: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
}) {
  const toneClass =
    tone === 'primary'
      ? 'bg-slate-900 text-white hover:bg-slate-700 disabled:bg-slate-400'
      : tone === 'secondary'
        ? 'bg-cyan-600 text-white hover:bg-cyan-500'
        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${toneClass}`}
    >
      {label}
    </button>
  )
}
