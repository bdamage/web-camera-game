import {DIFFICULTY_LEVELS} from '../lib/mathChallenge'
import type {MathOperator} from '../types/game'

interface MathSettingsPanelProps {
  levelId: string
  selectedOperators: MathOperator[]
  disabled: boolean
  onLevelChange: (levelId: string) => void
  onToggleOperator: (operator: MathOperator) => void
  onSelectAllOperators: () => void
}

const OPERATORS: Array<{value: MathOperator; label: string}> = [
  {value: '+', label: 'Addition (+)'},
  {value: '-', label: 'Subtraction (-)'},
  {value: '*', label: 'Multiplication (×)'},
  {value: '/', label: 'Division (÷)'},
]

export function MathSettingsPanel({
  levelId,
  selectedOperators,
  disabled,
  onLevelChange,
  onToggleOperator,
  onSelectAllOperators,
}: MathSettingsPanelProps) {
  const selectedCount = selectedOperators.length

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-lg shadow-slate-300/30 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">Math Setup</h2>
          <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Choose age band and operators</p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onSelectAllOperators}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          All Operators
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Age Difficulty Level
          <select
            value={levelId}
            disabled={disabled}
            onChange={(event) => onLevelChange(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {DIFFICULTY_LEVELS.map((level) => (
              <option key={level.id} value={level.id}>
                {level.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Operators</p>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              {selectedCount} Selected
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {OPERATORS.map((operator) => {
              const selected = selectedOperators.includes(operator.value)
              return (
                <button
                  key={operator.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => onToggleOperator(operator.value)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    selected
                      ? 'border-cyan-600 bg-cyan-50 text-cyan-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {operator.label}
                </button>
              )
            })}
          </div>

          {selectedCount === 0 && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              Select at least one operator to start.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
