import {HIGH_SCORE_KEY, TROPHY_KEY} from "./constants";

const buildKey = (scopeKey: string) => `${HIGH_SCORE_KEY}-${scopeKey}`;
const buildTrophyKey = (scopeKey: string) => `${TROPHY_KEY}-${scopeKey}`;

export const loadHighScore = (scopeKey: string) => {
  const value = localStorage.getItem(buildKey(scopeKey));
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const saveHighScore = (scopeKey: string, score: number) => {
  localStorage.setItem(buildKey(scopeKey), String(score));
};

export const loadBestTrophyId = (scopeKey: string) =>
  localStorage.getItem(buildTrophyKey(scopeKey)) ?? "rookie";

export const saveBestTrophyId = (scopeKey: string, trophyId: string) => {
  localStorage.setItem(buildTrophyKey(scopeKey), trophyId);
};
