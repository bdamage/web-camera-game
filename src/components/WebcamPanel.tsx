import type { ReactNode, RefObject } from 'react'
import type { PoseSignal, TrackerStatus, TrackingDebugInfo, WebcamStatus } from '../types/game'

interface WebcamPanelProps {
  videoRef: RefObject<HTMLVideoElement | null>
  webcamStatus: WebcamStatus
  webcamError: string | null
  trackerStatus: TrackerStatus
  trackerError: string | null
  signal: PoseSignal
  debugInfo: TrackingDebugInfo
  debugEnabled: boolean
  gameOverlay?: ReactNode
  calibrationRemaining: number
  requestAccess: () => void
}

export function WebcamPanel({
  videoRef,
  webcamStatus,
  webcamError,
  trackerStatus,
  trackerError,
  signal,
  debugInfo,
  debugEnabled,
  gameOverlay,
  calibrationRemaining,
  requestAccess,
}: WebcamPanelProps) {
  const leftHand = debugInfo.hands.find((hand) => hand.side === 'left')
  const rightHand = debugInfo.hands.find((hand) => hand.side === 'right')

  const message =
    webcamStatus === 'idle'
      ? 'Enable your webcam to begin.'
      : webcamStatus === 'requesting'
        ? 'Requesting camera access...'
        : webcamStatus === 'denied'
          ? 'Camera access denied. Allow access in browser settings and try again.'
          : webcamStatus === 'unsupported'
            ? 'Webcam API is not available in this browser.'
            : webcamStatus === 'error'
              ? webcamError ?? 'Webcam failed to start.'
              : trackerStatus === 'loading'
                ? 'Loading body tracking model...'
                : trackerStatus === 'error'
                  ? trackerError ?? 'Body tracker failed to load.'
                  : !signal.isDetected
                    ? 'No person detected. Step back so your upper body is visible.'
                    : `Tracking source: ${signal.source}`

  return (
    <section className="flex h-[min(calc(100svh-6.5rem),980px)] min-h-[420px] flex-col rounded-3xl border border-slate-200/80 bg-white/75 p-4 shadow-xl shadow-slate-300/35 backdrop-blur-sm sm:h-[min(calc(100svh-7rem),980px)] sm:p-5 lg:h-[min(calc(100svh-2.5rem),1080px)] lg:p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-slate-900">Live Camera</h2>
        {calibrationRemaining > 0 && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            Calibrating: {calibrationRemaining}s
          </span>
        )}
      </div>

      <div className={`grid h-full min-h-0 gap-3 ${debugEnabled ? 'lg:grid-cols-[320px_minmax(0,1fr)]' : 'grid-cols-1'}`}>
        {debugEnabled && (
          <aside className="order-2 min-h-0 overflow-auto rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 lg:order-1">
            <p className="font-semibold uppercase tracking-[0.1em] text-slate-500">Tracking Debug</p>
            <p className="mt-1">Source: {signal.source}</p>
            <p>Raw X: {debugInfo.rawX === null ? 'N/A' : debugInfo.rawX.toFixed(3)}</p>
            <p>Mirrored X: {debugInfo.mirroredX === null ? 'N/A' : debugInfo.mirroredX.toFixed(3)}</p>
            <p>Smoothed X: {debugInfo.smoothedX === null ? 'N/A' : debugInfo.smoothedX.toFixed(3)}</p>
            <p>FPS: {debugInfo.fps}</p>
            <p>Landmarks: {debugInfo.landmarkCount}</p>
            <p>Hands: {debugInfo.handCount}</p>
            <p>Closed Hands: {debugInfo.closedHandCount}</p>

            <p className="mt-2 font-semibold text-slate-600">Left Hand</p>
            <p>
              State: {leftHand?.isDetected ? (leftHand.isClosed ? 'Closed' : 'Open') : 'Not detected'}
            </p>
            <p>
              Close Score: {leftHand?.closeScore === null || leftHand?.closeScore === undefined ? 'N/A' : leftHand.closeScore.toFixed(3)}
            </p>
            <p>Stable Frames: {leftHand?.stableFrames ?? 0}</p>
            <p>
              Position: {leftHand?.x === null || leftHand?.x === undefined ? 'N/A' : `${leftHand.x.toFixed(3)}, ${leftHand.y?.toFixed(3) ?? 'N/A'}`}
            </p>

            <p className="mt-2 font-semibold text-slate-600">Right Hand</p>
            <p>
              State: {rightHand?.isDetected ? (rightHand.isClosed ? 'Closed' : 'Open') : 'Not detected'}
            </p>
            <p>
              Close Score: {rightHand?.closeScore === null || rightHand?.closeScore === undefined ? 'N/A' : rightHand.closeScore.toFixed(3)}
            </p>
            <p>Stable Frames: {rightHand?.stableFrames ?? 0}</p>
            <p>
              Position: {rightHand?.x === null || rightHand?.x === undefined ? 'N/A' : `${rightHand.x.toFixed(3)}, ${rightHand.y?.toFixed(3) ?? 'N/A'}`}
            </p>
          </aside>
        )}

        <div className={`order-1 flex min-h-0 flex-col ${debugEnabled ? 'lg:order-2' : ''}`}>
          <div className="relative min-h-[240px] flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950/90">
            <div className="absolute inset-0 origin-center scale-[0.9]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full -scale-x-100 object-contain"
              />
              {signal.x !== null && webcamStatus === 'ready' && trackerStatus === 'ready' && (
                <div
                  className="pointer-events-none absolute bottom-2 h-3 w-3 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_20px_2px_rgba(103,232,249,0.8)]"
                  style={{ left: `${signal.x * 100}%` }}
                />
              )}

              {debugEnabled && debugInfo.mirroredX !== null && (
                <div
                  className="pointer-events-none absolute inset-y-0 w-px bg-amber-300/90"
                  style={{ left: `${debugInfo.mirroredX * 100}%` }}
                />
              )}

              {debugEnabled && debugInfo.smoothedX !== null && (
                <div
                  className="pointer-events-none absolute inset-y-0 w-[2px] bg-cyan-300"
                  style={{ left: `${debugInfo.smoothedX * 100}%` }}
                />
              )}

              {gameOverlay}
            </div>
          </div>

          <p className="mt-3 text-sm text-slate-600">{message}</p>

          {webcamStatus !== 'ready' && (
            <button
              type="button"
              onClick={requestAccess}
              className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              {webcamStatus === 'requesting' ? 'Connecting...' : 'Enable Camera'}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
