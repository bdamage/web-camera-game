export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const lerp = (from: number, to: number, t: number) =>
  from + (to - from) * t;

export const randomBetween = (min: number, max: number) =>
  Math.random() * (max - min) + min;

export const withDelta = (valuePerSecond: number, deltaSeconds: number) =>
  valuePerSecond * deltaSeconds;
