import type {DifficultyLevel, MathOperator, MathProblem} from "../types/game";

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const DIFFICULTY_LEVELS: DifficultyLevel[] = [
  {id: "5-6", label: "Ages 5-6", minAge: 5, maxAge: 6},
  {id: "7-8", label: "Ages 7-8", minAge: 7, maxAge: 8},
  {id: "9-10", label: "Ages 9-10", minAge: 9, maxAge: 10},
  {id: "11-12", label: "Ages 11-12", minAge: 11, maxAge: 12},
  {id: "13-14", label: "Ages 13-14", minAge: 13, maxAge: 14},
  {id: "15-16", label: "Ages 15-16", minAge: 15, maxAge: 16},
];

const levelIndexById = new Map(
  DIFFICULTY_LEVELS.map((level, index) => [level.id, index]),
);

const levelCeilingById = (levelId: string) => {
  const index = levelIndexById.get(levelId) ?? 0;
  return {
    add: [40, 60, 100, 160, 240, 320][index],
    sub: [40, 60, 100, 160, 240, 320][index],
    mul: [3, 6, 10, 14, 18, 22][index],
    div: [3, 6, 10, 14, 18, 22][index],
  };
};

const progressiveSumLimit = (solvedCount: number, ceiling: number) => {
  const stage = Math.floor(solvedCount / 20);
  const stagedLimit = (stage + 1) * 10;
  return Math.min(ceiling, stagedLimit);
};

const buildAddition = (max: number): MathProblem => {
  const left = randomInt(0, max);
  const right = randomInt(0, max);
  const answer = left + right;
  return {
    left,
    right,
    operator: "+",
    answer,
    prompt: `${left} + ${right}`,
  };
};

const buildSubtraction = (max: number): MathProblem => {
  const left = randomInt(0, max);
  const right = randomInt(0, max);
  const top = Math.max(left, right);
  const bottom = Math.min(left, right);
  const answer = top - bottom;
  return {
    left: top,
    right: bottom,
    operator: "-",
    answer,
    prompt: `${top} - ${bottom}`,
  };
};

const buildMultiplication = (max: number): MathProblem => {
  const left = randomInt(0, max);
  const right = randomInt(0, max);
  const answer = left * right;
  return {
    left,
    right,
    operator: "*",
    answer,
    prompt: `${left} × ${right}`,
  };
};

const buildDivision = (max: number): MathProblem => {
  const divisor = randomInt(1, max);
  const quotient = randomInt(0, max);
  const dividend = divisor * quotient;
  return {
    left: dividend,
    right: divisor,
    operator: "/",
    answer: quotient,
    prompt: `${dividend} ÷ ${divisor}`,
  };
};

export const createMathProblem = (
  levelId: string,
  operators: MathOperator[],
  solvedCount = 0,
): MathProblem => {
  const fallback: MathOperator[] = ["+"];
  const enabledOperators = operators.length ? operators : fallback;
  const operator =
    enabledOperators[randomInt(0, enabledOperators.length - 1)] ?? "+";
  const ceilings = levelCeilingById(levelId);
  const limits = {
    add: progressiveSumLimit(solvedCount, ceilings.add),
    sub: progressiveSumLimit(solvedCount, ceilings.sub),
    mul: ceilings.mul,
    div: ceilings.div,
  };

  if (operator === "+") {
    return buildAddition(limits.add);
  }

  if (operator === "-") {
    return buildSubtraction(limits.sub);
  }

  if (operator === "*") {
    return buildMultiplication(limits.mul);
  }

  return buildDivision(limits.div);
};

export const createAnswerChoices = (
  answer: number,
  count: number,
): number[] => {
  const choices = new Set<number>([answer]);
  const spread = Math.max(4, Math.ceil(Math.abs(answer) * 0.25));

  while (choices.size < count) {
    const delta = randomInt(-spread, spread);
    const next = Math.max(0, answer + delta + (delta >= 0 ? 1 : -1));
    choices.add(next);
  }

  return Array.from(choices).sort(() => Math.random() - 0.5);
};
