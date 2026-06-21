import {
  BASE_MAX_SPEED,
  BASE_MIN_SPEED,
  BASE_OBJECT_SIZE,
  BASE_SPAWN_INTERVAL,
  MIN_SPAWN_INTERVAL,
} from "./constants";
import {randomBetween} from "./math";
import type {FallingObject} from "../types/game";

let objectId = 0;

const FALL_SPEED_SCALE = 0.385;

const MAX_SPAWN_POSITION_ATTEMPTS = 14;

const overlapsAtSpawn = (x: number, size: number, existing: FallingObject) => {
  const horizontalGap = Math.abs(x - existing.x);
  const verticalGap = Math.abs(-size - existing.y);
  const minHorizontalGap = (size + existing.size) * 0.82;
  const minVerticalGap = (size + existing.size) * 1.1;
  return horizontalGap < minHorizontalGap && verticalGap < minVerticalGap;
};

const pickSpawnX = (size: number, existingObjects: FallingObject[]) => {
  const minX = size / 2;
  const maxX = 1 - size / 2;
  let bestX = randomBetween(minX, maxX);

  for (let attempt = 0; attempt < MAX_SPAWN_POSITION_ATTEMPTS; attempt += 1) {
    const candidateX = randomBetween(minX, maxX);
    const hasOverlap = existingObjects.some((existing) =>
      overlapsAtSpawn(candidateX, size, existing),
    );

    if (!hasOverlap) {
      return candidateX;
    }

    bestX = candidateX;
  }

  return bestX;
};

const getSpeedMultiplier = (elapsedSeconds: number) => {
  const introPhaseSeconds = 20;
  if (elapsedSeconds <= introPhaseSeconds) {
    const introProgress = elapsedSeconds / introPhaseSeconds;
    return 0.62 + introProgress * 0.14;
  }

  const rampProgress = (elapsedSeconds - introPhaseSeconds) / 90;
  return Math.min(1.2, 0.76 + rampProgress * 0.44);
};

interface CreateFallingObjectOptions {
  elapsedSeconds: number;
  kind?: "answer" | "golden-token";
  value: number;
  label?: string;
  existingObjects?: FallingObject[];
}

export const createFallingObject = ({
  elapsedSeconds,
  kind = "answer",
  value,
  label,
  existingObjects = [],
}: CreateFallingObjectOptions): FallingObject => {
  const speedMultiplier = getSpeedMultiplier(elapsedSeconds);
  const isGoldenToken = kind === "golden-token";
  const size =
    BASE_OBJECT_SIZE *
    (isGoldenToken ? randomBetween(0.62, 0.85) : randomBetween(0.75, 1.2));
  return {
    id: ++objectId,
    kind,
    x: pickSpawnX(size, existingObjects),
    y: -size,
    speed:
      randomBetween(BASE_MIN_SPEED, BASE_MAX_SPEED) *
      speedMultiplier *
      (isGoldenToken ? 0.9 : 1) *
      FALL_SPEED_SCALE,
    size,
    hue: isGoldenToken ? randomBetween(38, 54) : randomBetween(20, 190),
    value,
    label: label ?? (isGoldenToken ? "★" : String(value)),
  };
};

export const getSpawnIntervalSeconds = (elapsedSeconds: number) => {
  const difficulty = 1 + elapsedSeconds / 60;
  return Math.max(MIN_SPAWN_INTERVAL, BASE_SPAWN_INTERVAL / difficulty);
};
