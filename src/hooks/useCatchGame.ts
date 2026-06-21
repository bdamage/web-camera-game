import {useCallback, useEffect, useRef, useState} from "react";
import {collidesWithAnyHand} from "../lib/collision";
import {
  GAME_DURATION_MS,
  GOLDEN_TOKEN_POINTS,
  GOLDEN_TOKEN_SPAWN_CHANCE,
  MAX_ACTIVE_GOLDEN_TOKENS,
  MAX_LIVES,
} from "../lib/constants";
import {createAnswerChoices, createMathProblem} from "../lib/mathChallenge";
import {clamp, withDelta} from "../lib/math";
import {SoundEngine} from "../lib/sound";
import {createFallingObject, getSpawnIntervalSeconds} from "../lib/spawn";
import {
  loadBestTrophyId,
  loadHighScore,
  saveBestTrophyId,
  saveHighScore,
} from "../lib/storage";
import {getHigherTrophyId, getTrophyTierForStats} from "../lib/trophies";
import type {
  FallingObject,
  GameSettings,
  GameSnapshot,
  GameStatus,
  HandPoint,
  MathProblem,
  Particle,
} from "../types/game";

interface UseCatchGameOptions {
  controlX: number;
  handPoints: HandPoint[];
  soundEnabled: boolean;
  settings: GameSettings;
}

interface UseCatchGameResult {
  status: GameStatus;
  snapshot: GameSnapshot;
  highScore: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
}

const createInitialSnapshot = (): GameSnapshot => ({
  score: 0,
  misses: 0,
  lives: MAX_LIVES,
  streak: 0,
  remainingMs: GAME_DURATION_MS,
  catcherX: 0.5,
  handPoints: [],
  bonusTokensCaught: 0,
  currentTrophyId: "rookie",
  bestTrophyId: "rookie",
  activeProblem: null,
  objects: [],
  particles: [],
});

let particleId = 0;
const MAX_VISIBLE_ANSWER_BALLOONS = 5;

const getOptionCountForProgress = (solvedCount: number) => {
  if (solvedCount < 8) {
    return 2;
  }

  if (solvedCount < 20) {
    return 3;
  }

  if (solvedCount < 40) {
    return 4;
  }

  if (solvedCount < 60) {
    return 5;
  }

  if (solvedCount < 80) {
    return 6;
  }

  return 7;
};

const getTargetAnswerBalloonCount = (solvedCount: number) =>
  Math.min(MAX_VISIBLE_ANSWER_BALLOONS, getOptionCountForProgress(solvedCount));

export const useCatchGame = ({
  controlX,
  handPoints,
  soundEnabled,
  settings,
}: UseCatchGameOptions): UseCatchGameResult => {
  const [status, setStatus] = useState<GameStatus>("idle");
  const [snapshot, setSnapshot] = useState<GameSnapshot>(createInitialSnapshot);
  const [highScore, setHighScore] = useState(0);
  const [bestTrophyId, setBestTrophyId] = useState("rookie");

  const soundRef = useRef(new SoundEngine());
  const statusRef = useRef<GameStatus>("idle");
  const frameRef = useRef<number | null>(null);
  const previousTimeRef = useRef(0);
  const startTimeRef = useRef(0);
  const spawnAccumulatorRef = useRef(0);
  const latestControlXRef = useRef(controlX);
  const latestHandPointsRef = useRef<HandPoint[]>(handPoints);

  const objectsRef = useRef<FallingObject[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const scoreRef = useRef(0);
  const missesRef = useRef(0);
  const streakRef = useRef(0);
  const bonusTokensRef = useRef(0);
  const bestStreakRef = useRef(0);
  const solvedProblemsRef = useRef(0);
  const activeProblemRef = useRef<MathProblem | null>(null);
  const answerChoicesRef = useRef<number[]>([]);

  const highScoreScopeKey = `${settings.levelId}:${settings.operators
    .slice()
    .sort()
    .join("|")}`;

  useEffect(() => {
    setHighScore(loadHighScore(highScoreScopeKey));
    setBestTrophyId(loadBestTrophyId(highScoreScopeKey));
  }, [highScoreScopeKey]);

  useEffect(() => {
    latestControlXRef.current = controlX;
  }, [controlX]);

  useEffect(() => {
    latestHandPointsRef.current = handPoints;
  }, [handPoints]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const stopLoop = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const syncSnapshot = useCallback(
    (now: number) => {
      const elapsed = now - startTimeRef.current;
      const remainingMs = Math.max(0, GAME_DURATION_MS - elapsed);

      setSnapshot({
        score: scoreRef.current,
        misses: missesRef.current,
        lives: settings.infiniteLives
          ? MAX_LIVES
          : Math.max(0, MAX_LIVES - missesRef.current),
        streak: streakRef.current,
        remainingMs,
        catcherX: latestControlXRef.current,
        handPoints: latestHandPointsRef.current,
        bonusTokensCaught: bonusTokensRef.current,
        currentTrophyId: getTrophyTierForStats(
          scoreRef.current,
          bestStreakRef.current,
          bonusTokensRef.current,
        ).id,
        bestTrophyId,
        activeProblem: activeProblemRef.current,
        objects: [...objectsRef.current],
        particles: [...particlesRef.current],
      });

      if (!settings.infiniteLives && missesRef.current >= MAX_LIVES) {
        statusRef.current = "over";
        setStatus("over");
        stopLoop();

        if (scoreRef.current > highScore) {
          saveHighScore(highScoreScopeKey, scoreRef.current);
          setHighScore(scoreRef.current);
        }

        const earnedTrophy = getTrophyTierForStats(
          scoreRef.current,
          bestStreakRef.current,
          bonusTokensRef.current,
        );
        const upgradedTrophyId = getHigherTrophyId(
          bestTrophyId,
          earnedTrophy.id,
        );
        if (upgradedTrophyId !== bestTrophyId) {
          saveBestTrophyId(highScoreScopeKey, upgradedTrophyId);
          setBestTrophyId(upgradedTrophyId);
        }
      }
    },
    [bestTrophyId, highScore, highScoreScopeKey, settings.infiniteLives, stopLoop],
  );

  const setupNextProblem = useCallback(() => {
    const optionCount = getOptionCountForProgress(solvedProblemsRef.current);
    const nextProblem = createMathProblem(
      settings.levelId,
      settings.operators,
      solvedProblemsRef.current,
    );
    activeProblemRef.current = nextProblem;
    answerChoicesRef.current = createAnswerChoices(
      nextProblem.answer,
      optionCount,
    );
  }, [settings.levelId, settings.operators]);

  const spawnAnswerBalloon = useCallback(
    (elapsedSeconds: number, forceCorrect = false) => {
      const activeProblem = activeProblemRef.current;
      if (!activeProblem) {
        return;
      }

      const answerCount = objectsRef.current.filter(
        (object) => object.kind === "answer",
      ).length;
      const targetAnswerCount = getTargetAnswerBalloonCount(solvedProblemsRef.current);
      if (!forceCorrect && answerCount >= targetAnswerCount) {
        return;
      }

      const visibleCorrectCount = objectsRef.current.filter(
        (object) => object.value === activeProblem.answer,
      ).length;

      const shouldSpawnCorrect =
        forceCorrect ||
        visibleCorrectCount === 0 ||
        (Math.random() < 0.24 && objectsRef.current.length > 1);

      if (shouldSpawnCorrect) {
        objectsRef.current.push(
          createFallingObject({
            elapsedSeconds,
            kind: "answer",
            value: activeProblem.answer,
            existingObjects: objectsRef.current,
          }),
        );
        return;
      }

      const wrongChoices = answerChoicesRef.current.filter(
        (choice) => choice !== activeProblem.answer,
      );

      const fallback = activeProblem.answer + (Math.random() > 0.5 ? 1 : -1);
      const wrongValue =
        wrongChoices[Math.floor(Math.random() * wrongChoices.length)] ??
        fallback;

      objectsRef.current.push(
        createFallingObject({
          elapsedSeconds,
          kind: "answer",
          value: Math.max(0, wrongValue),
          existingObjects: objectsRef.current,
        }),
      );
    },
    [],
  );

  const spawnGoldenToken = useCallback((elapsedSeconds: number) => {
    const activeGoldenCount = objectsRef.current.filter(
      (object) => object.kind === "golden-token",
    ).length;

    if (activeGoldenCount >= MAX_ACTIVE_GOLDEN_TOKENS) {
      return;
    }

    if (Math.random() > GOLDEN_TOKEN_SPAWN_CHANCE) {
      return;
    }

    objectsRef.current.push(
      createFallingObject({
        elapsedSeconds,
        kind: "golden-token",
        value: -1,
        label: "★",
        existingObjects: objectsRef.current,
      }),
    );
  }, []);

  const animate = useCallback(
    (now: number) => {
      if (previousTimeRef.current === 0) {
        previousTimeRef.current = now;
      }

      const deltaSeconds = Math.min(
        0.05,
        (now - previousTimeRef.current) / 1000,
      );
      previousTimeRef.current = now;

      const elapsedSeconds = (now - startTimeRef.current) / 1000;
      spawnAccumulatorRef.current += deltaSeconds;

      const spawnInterval = getSpawnIntervalSeconds(elapsedSeconds);
      if (spawnAccumulatorRef.current >= spawnInterval) {
        spawnAccumulatorRef.current = 0;
        spawnAnswerBalloon(elapsedSeconds);
        spawnGoldenToken(elapsedSeconds);
      }

      const nextObjects: FallingObject[] = [];
      let solvedProblem = false;
      const activeProblem = activeProblemRef.current;

      for (const object of objectsRef.current) {
        const nextObject = {
          ...object,
          y: object.y + withDelta(object.speed, deltaSeconds),
        };

        const hands = latestHandPointsRef.current;
        const hitByHand = collidesWithAnyHand(hands, nextObject);

        if (hitByHand) {
          if (nextObject.kind === "golden-token") {
            bonusTokensRef.current += 1;
            scoreRef.current += GOLDEN_TOKEN_POINTS;

            for (let index = 0; index < 10; index += 1) {
              particlesRef.current.push({
                id: ++particleId,
                x: nextObject.x,
                y: nextObject.y,
                vx: (Math.random() - 0.5) * 1,
                vy: -Math.random() * 1.1,
                life: 0,
                ttl: 0.4 + Math.random() * 0.35,
              });
            }

            if (soundEnabled) {
              soundRef.current.play("catch");
            }

            continue;
          }

          const isCorrect =
            activeProblem !== null && nextObject.value === activeProblem.answer;

          if (isCorrect) {
            streakRef.current += 1;
            bestStreakRef.current = Math.max(
              bestStreakRef.current,
              streakRef.current,
            );
            scoreRef.current += 12 + Math.min(32, streakRef.current * 3);
            solvedProblemsRef.current += 1;

            for (let index = 0; index < 8; index += 1) {
              particlesRef.current.push({
                id: ++particleId,
                x: nextObject.x,
                y: nextObject.y,
                vx: (Math.random() - 0.5) * 0.8,
                vy: -Math.random() * 0.9,
                life: 0,
                ttl: 0.35 + Math.random() * 0.2,
              });
            }

            solvedProblem = true;

            if (soundEnabled) {
              soundRef.current.play("catch");
            }
          } else {
            if (!settings.infiniteLives) {
              missesRef.current += 1;
            }
            streakRef.current = 0;

            if (soundEnabled) {
              soundRef.current.play("miss");
            }
          }

          continue;
        }

        if (nextObject.y > 1.05) {
          if (nextObject.kind === "golden-token") {
            continue;
          }

          if (!settings.infiniteLives) {
            missesRef.current += 1;
          }
          streakRef.current = 0;
          if (soundEnabled) {
            soundRef.current.play("miss");
          }
          continue;
        }

        nextObjects.push(nextObject);
      }

      if (solvedProblem) {
        setupNextProblem();
        objectsRef.current = [];
        spawnAnswerBalloon(elapsedSeconds, true);
        const optionCount = getTargetAnswerBalloonCount(
          solvedProblemsRef.current,
        );
        while (
          objectsRef.current.filter((object) => object.kind === "answer").length <
          optionCount
        ) {
          spawnAnswerBalloon(elapsedSeconds);
        }
      } else {
        objectsRef.current = nextObjects;
      }

      const optionCount = getTargetAnswerBalloonCount(solvedProblemsRef.current);
      while (
        objectsRef.current.filter((object) => object.kind === "answer").length <
          optionCount &&
        activeProblemRef.current
      ) {
        spawnAnswerBalloon(elapsedSeconds);
      }

      particlesRef.current = particlesRef.current
        .map((particle) => ({
          ...particle,
          x: clamp(particle.x + particle.vx * deltaSeconds, 0, 1),
          y: particle.y + particle.vy * deltaSeconds,
          vy: particle.vy + 1.8 * deltaSeconds,
          life: particle.life + deltaSeconds,
        }))
        .filter((particle) => particle.life <= particle.ttl);

      syncSnapshot(now);

      if (statusRef.current === "playing") {
        frameRef.current = requestAnimationFrame(animate);
      }
    },
    [
      setupNextProblem,
      settings.infiniteLives,
      soundEnabled,
      spawnAnswerBalloon,
      spawnGoldenToken,
      syncSnapshot,
    ],
  );

  const resetData = useCallback(() => {
    objectsRef.current = [];
    particlesRef.current = [];
    scoreRef.current = 0;
    missesRef.current = 0;
    streakRef.current = 0;
    bonusTokensRef.current = 0;
    bestStreakRef.current = 0;
    solvedProblemsRef.current = 0;
    activeProblemRef.current = null;
    answerChoicesRef.current = [];
    spawnAccumulatorRef.current = 0;
    setSnapshot(createInitialSnapshot());
  }, []);

  const start = useCallback(() => {
    stopLoop();
    resetData();
    setupNextProblem();

    startTimeRef.current = performance.now();
    previousTimeRef.current = 0;
    statusRef.current = "playing";
    setStatus("playing");
    frameRef.current = requestAnimationFrame(animate);
  }, [animate, resetData, setupNextProblem, stopLoop]);

  const pause = useCallback(() => {
    if (status !== "playing") {
      return;
    }

    statusRef.current = "paused";
    setStatus("paused");
    stopLoop();
  }, [status, stopLoop]);

  const resume = useCallback(() => {
    if (status !== "paused") {
      return;
    }

    previousTimeRef.current = 0;
    startTimeRef.current =
      performance.now() - (GAME_DURATION_MS - snapshot.remainingMs);
    statusRef.current = "playing";
    setStatus("playing");
    frameRef.current = requestAnimationFrame(animate);
  }, [animate, snapshot.remainingMs, status]);

  const restart = useCallback(() => {
    start();
  }, [start]);

  useEffect(() => stopLoop, [stopLoop]);

  return {
    status,
    snapshot,
    highScore,
    start,
    pause,
    resume,
    restart,
  };
};
