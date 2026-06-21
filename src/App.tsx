import { useEffect, useMemo, useRef, useState } from 'react'
import { ControlBar } from './components/ControlBar'
import { GameArena } from './components/GameArena'
import { Hud } from './components/Hud'
import { MathSettingsPanel } from './components/MathSettingsPanel'
import { WebcamPanel } from './components/WebcamPanel'
import { CALIBRATION_SECONDS } from './lib/constants'
import { DIFFICULTY_LEVELS } from './lib/mathChallenge'
import { clamp } from './lib/math'
import { getTrophyTierById } from './lib/trophies'
import { useCatchGame } from './hooks/useCatchGame'
import { usePoseTracking } from './hooks/usePoseTracking'
import { useWebcam } from './hooks/useWebcam'
import type { MathOperator } from './types/game'

const ALL_OPERATORS: MathOperator[] = ['+', '-', '*', '/']

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const calibrationRafRef = useRef<number | null>(null)
  const calibrationSamplesRef = useRef<number[]>([])

  const [soundEnabled, setSoundEnabled] = useState(true)
  const [debugEnabled, setDebugEnabled] = useState(false)
  const [selectedLevelId, setSelectedLevelId] = useState(DIFFICULTY_LEVELS[0].id)
  const [selectedOperators, setSelectedOperators] = useState<MathOperator[]>(ALL_OPERATORS)
  const [calibrationCenter, setCalibrationCenter] = useState(0.5)
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [calibrationRemaining, setCalibrationRemaining] = useState(0)

  const { stream, status: webcamStatus, errorMessage, requestAccess } = useWebcam()

  useEffect(() => {
    if (!videoRef.current || !stream) {
      return
    }

    videoRef.current.srcObject = stream
  }, [stream])

  const { trackerStatus, trackerError, signal, handPoints, debugInfo } = usePoseTracking(
    videoRef,
    webcamStatus === 'ready',
  )

  const controlX = useMemo(() => {
    if (signal.x === null) {
      return 0.5
    }

    const spread = 1.7
    return clamp(0.5 + (signal.x - calibrationCenter) * spread, 0.08, 0.92)
  }, [signal.x, calibrationCenter])

  const game = useCatchGame({
    controlX,
    handPoints,
    soundEnabled,
    settings: {
      levelId: selectedLevelId,
      operators: selectedOperators,
    },
  })

  const currentTrophy = getTrophyTierById(game.snapshot.currentTrophyId)
  const bestTrophy = getTrophyTierById(game.snapshot.bestTrophyId)

  const canStart =
    webcamStatus === 'ready' &&
    trackerStatus === 'ready' &&
    signal.isDetected &&
    selectedOperators.length > 0

  const isSettingsLocked = isCalibrating || game.status === 'playing' || game.status === 'paused'

  const toggleOperator = (operator: MathOperator) => {
    if (isSettingsLocked) {
      return
    }

    setSelectedOperators((prev) => {
      if (prev.includes(operator)) {
        return prev.filter((value) => value !== operator)
      }

      return [...prev, operator]
    })
  }

  const stopCalibration = () => {
    if (calibrationRafRef.current !== null) {
      cancelAnimationFrame(calibrationRafRef.current)
      calibrationRafRef.current = null
    }

    setIsCalibrating(false)
    setCalibrationRemaining(0)
  }

  const beginCalibrationAndStart = () => {
    if (!canStart) {
      return
    }

    stopCalibration()
    game.pause()
    calibrationSamplesRef.current = []
    setIsCalibrating(true)

    const startAt = performance.now()

    const tick = (now: number) => {
      const elapsedMs = now - startAt
      const remaining = Math.max(0, CALIBRATION_SECONDS - Math.floor(elapsedMs / 1000))
      setCalibrationRemaining(remaining)

      if (signal.x !== null) {
        calibrationSamplesRef.current.push(signal.x)
      }

      if (elapsedMs >= CALIBRATION_SECONDS * 1000) {
        const values = calibrationSamplesRef.current
        const avg = values.length
          ? values.reduce((sum, value) => sum + value, 0) / values.length
          : 0.5

        setCalibrationCenter(avg)
        stopCalibration()
        game.start()
        return
      }

      calibrationRafRef.current = requestAnimationFrame(tick)
    }

    calibrationRafRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    return () => {
      if (calibrationRafRef.current !== null) {
        cancelAnimationFrame(calibrationRafRef.current)
      }
    }
  }, [])

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-brand-paper px-4 py-4 text-slate-800 sm:px-6 sm:py-5 lg:px-10">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,rgba(20,184,166,0.18),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(251,191,36,0.16),transparent_42%),linear-gradient(120deg,#fffdf8_0%,#f8fafc_45%,#eef2ff_100%)]" />

      <header className="mx-auto mb-3 flex w-full max-w-7xl items-end justify-between gap-3">
        <div>
          <p className="font-sans text-[10px] uppercase tracking-[0.16em] text-slate-500">Webcam Arcade</p>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 sm:text-3xl lg:text-4xl">
            Math Balloon Pop
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-slate-600 sm:text-sm">
            Move your hands to pop the balloon with the correct answer.
          </p>
        </div>
      </header>

      <main
        className={`mx-auto grid w-full gap-5 lg:grid-cols-[2.2fr_1fr] lg:items-start ${
          debugEnabled ? 'max-w-[1480px]' : 'max-w-[1280px]'
        }`}
      >
        <WebcamPanel
          videoRef={videoRef}
          webcamStatus={webcamStatus}
          webcamError={errorMessage}
          trackerStatus={trackerStatus}
          trackerError={trackerError}
          signal={signal}
          debugInfo={debugInfo}
          debugEnabled={debugEnabled}
          gameOverlay={
            <GameArena
              catcherX={game.snapshot.catcherX}
              handPoints={game.snapshot.handPoints}
              activeProblem={game.snapshot.activeProblem}
              objects={game.snapshot.objects}
              particles={game.snapshot.particles}
              isPaused={game.status === 'paused' || isCalibrating}
              isOver={game.status === 'over'}
            />
          }
          calibrationRemaining={isCalibrating ? calibrationRemaining : 0}
          requestAccess={requestAccess}
        />

        <section className="space-y-4 lg:sticky lg:top-4">
          <Hud
            score={game.snapshot.score}
            highScore={game.highScore}
            streak={game.snapshot.streak}
            lives={game.snapshot.lives}
            remainingMs={game.snapshot.remainingMs}
            bonusTokensCaught={game.snapshot.bonusTokensCaught}
            trophyTitle={currentTrophy.title}
          />

          <ControlBar
            canStart={canStart && !isCalibrating}
            status={game.status}
            soundEnabled={soundEnabled}
            debugEnabled={debugEnabled}
            onStart={beginCalibrationAndStart}
            onPause={game.pause}
            onResume={game.resume}
            onRestart={beginCalibrationAndStart}
            onToggleSound={() => setSoundEnabled((prev) => !prev)}
            onToggleDebug={() => setDebugEnabled((prev) => !prev)}
          />

          <MathSettingsPanel
            levelId={selectedLevelId}
            selectedOperators={selectedOperators}
            disabled={isSettingsLocked}
            onLevelChange={setSelectedLevelId}
            onToggleOperator={toggleOperator}
            onSelectAllOperators={() => {
              if (!isSettingsLocked) {
                setSelectedOperators(ALL_OPERATORS)
              }
            }}
          />

          {isCalibrating && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Stand centered and face the camera. Starting in {calibrationRemaining}s...
            </div>
          )}

          {game.status === 'over' && (
            <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-4 shadow-lg shadow-slate-300/35">
              <h3 className="font-display text-2xl font-bold text-slate-900">Game Over</h3>
              <p className="mt-1 text-sm text-slate-600">
                Final score: {game.snapshot.score}. Best score: {Math.max(game.highScore, game.snapshot.score)}.
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Golden collected: {game.snapshot.bonusTokensCaught}. Trophy: {currentTrophy.title}. Best trophy: {bestTrophy.title}.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
