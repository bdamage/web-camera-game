interface HudProps {
  score: number
  highScore: number
  streak: number
  lives: number | string
  remainingMs: number
  bonusTokensCaught: number
  trophyTitle: string
}

const formatTime = (remainingMs: number) => {
  const seconds = Math.ceil(remainingMs / 1000)
  const mins = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${mins}:${String(rest).padStart(2, '0')}`
}

export function Hud({
  score,
  highScore,
  streak,
  lives,
  remainingMs,
  bonusTokensCaught,
  trophyTitle,
}: HudProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(112px,1fr))] gap-3">
      <StatCard label="Score" value={score} accent="text-amber-600" />
      <StatCard label="High Score" value={highScore} accent="text-teal-700" />
      <StatCard label="Streak" value={streak} accent="text-cyan-700" />
      <StatCard label="Golden" value={bonusTokensCaught} accent="text-amber-500" />
      <StatCard label="Trophy" value={trophyTitle} accent="text-violet-700" />
      <StatCard label="Lives" value={lives} accent="text-rose-700" />
      <StatCard label="Time" value={formatTime(remainingMs)} accent="text-slate-700" />
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent: string
}) {
  const isTextValue = typeof value === 'string'

  return (
    <div className="min-w-0 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-lg shadow-slate-200/40 backdrop-blur">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p
        className={`truncate font-display font-bold ${accent} ${
          isTextValue ? 'text-xl' : 'text-2xl'
        }`}
        title={String(value)}
      >
        {value}
      </p>
    </div>
  )
}
