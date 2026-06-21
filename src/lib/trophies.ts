import type {TrophyTier} from "../types/game";

export const TROPHY_TIERS: TrophyTier[] = [
  {
    id: "rookie",
    title: "Rookie",
    minScore: 0,
    minStreak: 0,
    minBonusTokens: 0,
  },
  {
    id: "bronze",
    title: "Bronze Brain",
    minScore: 120,
    minStreak: 3,
    minBonusTokens: 1,
  },
  {
    id: "silver",
    title: "Silver Solver",
    minScore: 260,
    minStreak: 5,
    minBonusTokens: 2,
  },
  {
    id: "gold",
    title: "Golden Genius",
    minScore: 450,
    minStreak: 7,
    minBonusTokens: 3,
  },
  {
    id: "platinum",
    title: "Platinum Prodigy",
    minScore: 680,
    minStreak: 10,
    minBonusTokens: 4,
  },
];

const indexById = new Map(TROPHY_TIERS.map((tier, index) => [tier.id, index]));

export const getTrophyTierById = (id: string) =>
  TROPHY_TIERS.find((tier) => tier.id === id) ?? TROPHY_TIERS[0];

export const getTrophyTierForStats = (
  score: number,
  streak: number,
  bonusTokens: number,
) => {
  let best = TROPHY_TIERS[0];

  for (const tier of TROPHY_TIERS) {
    if (
      score >= tier.minScore &&
      streak >= tier.minStreak &&
      bonusTokens >= tier.minBonusTokens
    ) {
      best = tier;
    }
  }

  return best;
};

export const getHigherTrophyId = (currentId: string, candidateId: string) => {
  const currentIndex = indexById.get(currentId) ?? 0;
  const candidateIndex = indexById.get(candidateId) ?? 0;
  return candidateIndex > currentIndex ? candidateId : currentId;
};
