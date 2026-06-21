import type {NormalizedLandmark} from "@mediapipe/tasks-vision";
import type {TrackerSource} from "../types/game";

const VISIBILITY_THRESHOLD = 0.45;

const getVisible = (landmark: NormalizedLandmark | undefined) => {
  if (!landmark) {
    return null;
  }

  const visibility = landmark.visibility ?? 1;
  return visibility >= VISIBILITY_THRESHOLD ? landmark : null;
};

const midpoint = (a: NormalizedLandmark, b: NormalizedLandmark) =>
  (a.x + b.x) / 2;

export const getTrackedX = (
  landmarks: NormalizedLandmark[] | undefined,
): {x: number | null; source: TrackerSource} => {
  if (!landmarks?.length) {
    return {x: null, source: "none"};
  }

  const leftWrist = getVisible(landmarks[15]);
  const rightWrist = getVisible(landmarks[16]);
  if (leftWrist && rightWrist) {
    return {x: midpoint(leftWrist, rightWrist), source: "hands"};
  }

  if (leftWrist) {
    return {x: leftWrist.x, source: "left-hand"};
  }

  if (rightWrist) {
    return {x: rightWrist.x, source: "right-hand"};
  }

  const leftShoulder = getVisible(landmarks[11]);
  const rightShoulder = getVisible(landmarks[12]);
  if (leftShoulder && rightShoulder) {
    return {x: midpoint(leftShoulder, rightShoulder), source: "shoulders"};
  }

  const nose = getVisible(landmarks[0]);
  if (nose) {
    return {x: nose.x, source: "nose"};
  }

  const leftHip = getVisible(landmarks[23]);
  const rightHip = getVisible(landmarks[24]);
  if (leftHip && rightHip) {
    return {x: midpoint(leftHip, rightHip), source: "hips"};
  }

  return {x: null, source: "none"};
};
