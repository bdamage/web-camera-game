import {
  FilesetResolver,
  HandLandmarker,
  PoseLandmarker,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import type {RefObject} from "react";
import {useEffect, useMemo, useRef, useState} from "react";
import {getTrackedX} from "../lib/poseSignal";
import {ExponentialSmoother} from "../lib/smoothing";
import type {
  HandDebugState,
  HandPoint,
  PoseSignal,
  TrackerStatus,
  TrackingDebugInfo,
} from "../types/game";

const MODEL_ASSET_PATH =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";
const HAND_MODEL_ASSET_PATH =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task";
const WASM_ASSET_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm";
const IMAGE_PROCESSING_OPTIONS = {rotationDegrees: 0};

interface UsePoseTrackingResult {
  trackerStatus: TrackerStatus;
  trackerError: string | null;
  signal: PoseSignal;
  handPoints: HandPoint[];
  debugInfo: TrackingDebugInfo;
}

type HandSide = "left" | "right";

interface HandObservation {
  side: HandSide;
  x: number;
  y: number;
  closeScore: number;
}

interface SideState {
  isClosed: boolean;
  stableFrames: number;
  closeScore: number;
}

const CLOSED_THRESHOLD = 0.67;
const OPEN_THRESHOLD = 0.44;
const MIN_STABLE_CLOSED_FRAMES = 2;

const distance = (a: NormalizedLandmark, b: NormalizedLandmark) =>
  Math.hypot(a.x - b.x, a.y - b.y);

const getPalmCenter = (landmarks: NormalizedLandmark[]) => {
  const ids = [0, 5, 9, 13, 17];
  const points = ids
    .map((id) => landmarks[id])
    .filter((point): point is NormalizedLandmark => Boolean(point));

  if (!points.length) {
    return null;
  }

  const averageX =
    points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const averageY =
    points.reduce((sum, point) => sum + point.y, 0) / points.length;
  return {x: averageX, y: averageY};
};

const getCloseScore = (landmarks: NormalizedLandmark[]): number => {
  const wrist = landmarks[0];
  const middleMcp = landmarks[9];
  const thumbTip = landmarks[4];
  const indexMcp = landmarks[5];

  if (!wrist || !middleMcp || !thumbTip || !indexMcp) {
    return 0;
  }

  const palmSize = Math.max(0.02, distance(wrist, middleMcp));
  const tipIds = [8, 12, 16, 20];

  let curledFingerCount = 0;
  for (const tipId of tipIds) {
    const tip = landmarks[tipId];
    if (!tip) {
      continue;
    }

    if (distance(tip, wrist) < palmSize * 1.75) {
      curledFingerCount += 1;
    }
  }

  const thumbToIndexRatio = distance(thumbTip, indexMcp) / palmSize;
  const fingerCurlScore = curledFingerCount / 4;
  const thumbCloseScore = Math.max(
    0,
    Math.min(1, (1.3 - thumbToIndexRatio) / 0.5),
  );

  return Math.max(
    0,
    Math.min(1, fingerCurlScore * 0.75 + thumbCloseScore * 0.25),
  );
};

const toHandObservations = (
  handLandmarks: NormalizedLandmark[][] | undefined,
  handednesses: Array<Array<{categoryName: string}>> | undefined,
): HandObservation[] => {
  if (!handLandmarks?.length) {
    return [];
  }

  const observations: HandObservation[] = [];

  for (let index = 0; index < handLandmarks.length; index += 1) {
    const landmarks = handLandmarks[index];
    if (!landmarks?.length) {
      continue;
    }

    const palmCenter = getPalmCenter(landmarks);
    if (!palmCenter) {
      continue;
    }

    const label = handednesses?.[index]?.[0]?.categoryName?.toLowerCase();
    const side: "left" | "right" = label === "right" ? "right" : "left";

    observations.push({
      x: 1 - palmCenter.x,
      y: palmCenter.y,
      side,
      closeScore: getCloseScore(landmarks),
    });
  }

  return observations;
};

export const usePoseTracking = (
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean,
): UsePoseTrackingResult => {
  const [trackerStatus, setTrackerStatus] = useState<TrackerStatus>("idle");
  const [trackerError, setTrackerError] = useState<string | null>(null);
  const [signal, setSignal] = useState<PoseSignal>({
    x: null,
    source: "none",
    isDetected: false,
  });
  const [handPoints, setHandPoints] = useState<HandPoint[]>([]);
  const [debugInfo, setDebugInfo] = useState<TrackingDebugInfo>({
    rawX: null,
    mirroredX: null,
    smoothedX: null,
    fps: 0,
    landmarkCount: 0,
    handCount: 0,
    closedHandCount: 0,
    hands: [],
  });

  const smoother = useMemo(() => new ExponentialSmoother(0.25), []);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const frameRequestRef = useRef<number | null>(null);
  const lastTimestampRef = useRef(-1);
  const lastFrameAtRef = useRef<number | null>(null);
  const sideStateRef = useRef<Record<HandSide, SideState>>({
    left: {isClosed: false, stableFrames: 0, closeScore: 0},
    right: {isClosed: false, stableFrames: 0, closeScore: 0},
  });

  const toDebugState = (
    side: HandSide,
    observation: HandObservation | undefined,
    sideState: SideState,
  ): HandDebugState => ({
    side,
    isDetected: Boolean(observation),
    isClosed:
      sideState.isClosed && sideState.stableFrames >= MIN_STABLE_CLOSED_FRAMES,
    closeScore: observation ? sideState.closeScore : null,
    x: observation ? observation.x : null,
    y: observation ? observation.y : null,
    stableFrames: sideState.stableFrames,
  });

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setTrackerStatus("loading");
      setTrackerError(null);

      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_ASSET_PATH);
        const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_ASSET_PATH,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        });
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: HAND_MODEL_ASSET_PATH,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
        });

        if (!isMounted) {
          poseLandmarker.close();
          handLandmarker.close();
          return;
        }

        landmarkerRef.current = poseLandmarker;
        handLandmarkerRef.current = handLandmarker;
        setTrackerStatus("ready");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load pose model.";
        setTrackerError(message);
        setTrackerStatus("error");
      }
    };

    void load();

    return () => {
      isMounted = false;
      if (frameRequestRef.current !== null) {
        cancelAnimationFrame(frameRequestRef.current);
      }
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      handLandmarkerRef.current?.close();
      handLandmarkerRef.current = null;
    };
  }, [smoother]);

  useEffect(() => {
    if (!enabled || trackerStatus !== "ready") {
      return;
    }

    const detectFrame = () => {
      const videoElement = videoRef.current;
      const landmarker = landmarkerRef.current;
      const handLandmarker = handLandmarkerRef.current;
      if (!landmarker || !handLandmarker || !videoElement) {
        return;
      }

      const readyState = videoElement.readyState >= 2;
      if (!readyState) {
        frameRequestRef.current = requestAnimationFrame(detectFrame);
        return;
      }

      if (videoElement.currentTime === lastTimestampRef.current) {
        frameRequestRef.current = requestAnimationFrame(detectFrame);
        return;
      }

      lastTimestampRef.current = videoElement.currentTime;

      const nowMs = performance.now();
      const result = landmarker.detectForVideo(
        videoElement,
        nowMs,
        IMAGE_PROCESSING_OPTIONS,
      );
      const handResult = handLandmarker.detectForVideo(
        videoElement,
        nowMs,
        IMAGE_PROCESSING_OPTIONS,
      );
      const landmarks = result.landmarks[0] as NormalizedLandmark[] | undefined;
      const next = getTrackedX(landmarks);
      const handObservations = toHandObservations(
        handResult.landmarks as NormalizedLandmark[][] | undefined,
        handResult.handednesses as
          | Array<Array<{categoryName: string}>>
          | undefined,
      );
      const observationBySide = new Map<HandSide, HandObservation>();
      for (const observation of handObservations) {
        observationBySide.set(observation.side, observation);
      }

      const nextHandPoints: HandPoint[] = [];
      const debugHands: HandDebugState[] = [];

      for (const side of ["left", "right"] as const) {
        const observation = observationBySide.get(side);
        const previous = sideStateRef.current[side];

        if (!observation) {
          sideStateRef.current[side] = {
            isClosed: false,
            stableFrames: 0,
            closeScore: 0,
          };
          debugHands.push(
            toDebugState(side, undefined, sideStateRef.current[side]),
          );
          continue;
        }

        const smoothedCloseScore =
          previous.closeScore * 0.62 + observation.closeScore * 0.38;
        const willClose = previous.isClosed
          ? smoothedCloseScore > OPEN_THRESHOLD
          : smoothedCloseScore >= CLOSED_THRESHOLD;
        const stableFrames =
          willClose === previous.isClosed ? previous.stableFrames + 1 : 1;

        const nextSideState: SideState = {
          isClosed: willClose,
          stableFrames,
          closeScore: smoothedCloseScore,
        };
        sideStateRef.current[side] = nextSideState;

        const stableClosed =
          nextSideState.isClosed &&
          nextSideState.stableFrames >= MIN_STABLE_CLOSED_FRAMES;

        nextHandPoints.push({
          side,
          x: observation.x,
          y: observation.y,
          isClosed: stableClosed,
          closeScore: smoothedCloseScore,
          stableFrames: nextSideState.stableFrames,
        });
        debugHands.push(toDebugState(side, observation, nextSideState));
      }

      setHandPoints(nextHandPoints);
      const closedHandCount = nextHandPoints.filter(
        (hand) => hand.isClosed,
      ).length;
      const now = performance.now();
      const elapsedMs =
        lastFrameAtRef.current === null
          ? 0
          : Math.max(0, now - lastFrameAtRef.current);
      const fps = elapsedMs > 0 ? Math.round(1000 / elapsedMs) : 0;
      lastFrameAtRef.current = now;

      if (next.x === null) {
        smoother.reset();
        setSignal({x: null, source: next.source, isDetected: false});
        setDebugInfo({
          rawX: null,
          mirroredX: null,
          smoothedX: null,
          fps,
          landmarkCount: landmarks?.length ?? 0,
          handCount: nextHandPoints.length,
          closedHandCount,
          hands: debugHands,
        });
      } else {
        const mirrored = 1 - next.x;
        const smoothed = smoother.update(mirrored);
        setSignal({x: smoothed, source: next.source, isDetected: true});
        setDebugInfo({
          rawX: next.x,
          mirroredX: mirrored,
          smoothedX: smoothed,
          fps,
          landmarkCount: landmarks?.length ?? 0,
          handCount: nextHandPoints.length,
          closedHandCount,
          hands: debugHands,
        });
      }

      frameRequestRef.current = requestAnimationFrame(detectFrame);
    };

    frameRequestRef.current = requestAnimationFrame(detectFrame);

    return () => {
      if (frameRequestRef.current !== null) {
        cancelAnimationFrame(frameRequestRef.current);
      }
    };
  }, [enabled, trackerStatus, smoother, videoRef]);

  return {
    trackerStatus,
    trackerError,
    signal,
    handPoints,
    debugInfo,
  };
};
