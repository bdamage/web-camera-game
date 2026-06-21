import { CATCHER_WIDTH, CATCHER_Y } from '../lib/constants'
import type { FallingObject, HandPoint, MathProblem, Particle } from '../types/game'

interface GameArenaProps {
  catcherX: number
  handPoints: HandPoint[]
  activeProblem: MathProblem | null
  objects: FallingObject[]
  particles: Particle[]
  isPaused: boolean
  isOver: boolean
}

export function GameArena({
  catcherX,
  handPoints,
  activeProblem,
  objects,
  particles,
  isPaused,
  isOver,
}: GameArenaProps) {
  return (
    <section className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,6,23,0.05)_0%,rgba(2,6,23,0.14)_100%)]" />

      {activeProblem && (
        <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-xl border border-white/70 bg-white/85 px-5 py-2 text-center shadow-lg shadow-slate-900/20 backdrop-blur-sm">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Find The Correct Answer</p>
          <p className="font-display text-3xl font-bold text-slate-900">{activeProblem.prompt}</p>
        </div>
      )}

      {objects.map((object) => (
        <div
          key={object.id}
          className={`absolute grid -translate-x-1/2 place-items-center rounded-full text-base font-bold text-slate-900 shadow-lg shadow-slate-900/20 ${
            object.kind === 'golden-token'
              ? 'border-2 border-amber-100 ring-2 ring-amber-300/60'
              : 'border border-white/80'
          }`}
          style={{
            left: `${object.x * 100}%`,
            top: `${object.y * 100}%`,
            width: `${object.size * 100}%`,
            aspectRatio: '1 / 1',
            background:
              object.kind === 'golden-token'
                ? 'radial-gradient(circle at 28% 30%, #fef9c3 0%, #f59e0b 65%, #b45309 100%)'
                : `radial-gradient(circle at 30% 30%, hsl(${object.hue} 90% 80%), hsl(${object.hue} 85% 45%))`,
          }}
        >
          <span
            className={`rounded-full px-2 py-0.5 text-sm shadow-sm ${
              object.kind === 'golden-token'
                ? 'bg-amber-100/85 text-amber-900'
                : 'bg-white/85 text-slate-900'
            }`}
          >
            {object.label}
          </span>
        </div>
      ))}

      {particles.map((particle) => {
        const alpha = 1 - particle.life / particle.ttl
        return (
          <div
            key={particle.id}
            className="absolute h-2 w-2 -translate-x-1/2 rounded-full bg-cyan-300"
            style={{
              left: `${particle.x * 100}%`,
              top: `${particle.y * 100}%`,
              opacity: alpha,
              transform: `translate(-50%, -50%) scale(${0.6 + alpha})`,
            }}
          />
        )
      })}

      {handPoints.length > 0 &&
        handPoints.map((hand, index) => (
          <div
            key={`${hand.side}-${index}`}
            className={`absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-[0_0_24px_2px_rgba(34,211,238,0.55)] ${
              hand.isClosed
                ? 'border-emerald-100 bg-emerald-400/45'
                : 'border-cyan-100 bg-cyan-400/22'
            }`}
            style={{
              left: `${hand.x * 100}%`,
              top: `${hand.y * 100}%`,
            }}
          />
        ))}

      {handPoints.length === 0 && (
        <div
          className="absolute h-[3.8%] min-h-3 -translate-x-1/2 rounded-full border border-cyan-50 bg-gradient-to-r from-cyan-500 via-sky-400 to-teal-500 shadow-[0_10px_24px_-4px_rgba(6,182,212,0.55)]"
          style={{
            width: `${CATCHER_WIDTH * 100}%`,
            left: `${catcherX * 100}%`,
            top: `${CATCHER_Y * 100}%`,
          }}
        />
      )}

      {(isPaused || isOver) && (
        <div className="absolute inset-0 grid place-items-center bg-slate-900/35 backdrop-blur-[2px]">
          <div className="rounded-xl border border-white/20 bg-slate-900/70 px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white">
            {isOver ? 'Game Over' : 'Paused'}
          </div>
        </div>
      )}
    </section>
  )
}
