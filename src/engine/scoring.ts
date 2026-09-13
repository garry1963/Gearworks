import { ScoringConfig, LevelStars } from '../types';

export interface ScoreCalculationResult {
  baseScore: number;
  timeBonus: number;
  moveBonus: number;
  invalidPenalty: number;
  hintPenalty: number;
  finalScore: number;
  starsEarned: number;
}

export function calculateScoreAndStars(
  scoring: ScoringConfig,
  starsConfig: LevelStars,
  timeRemaining: number,
  moves: number,
  expectedMinMoves: number,
  invalidPlacements: number,
  hintsUsed: number
): ScoreCalculationResult {
  const baseScore = scoring.baseScore || 1000;
  const timeBonus = Math.max(0, Math.floor(timeRemaining * (scoring.timeMultiplier || 10)));
  const extraMoveAllowance = 2;
  const moveBonus = Math.max(
    0,
    Math.floor((expectedMinMoves + extraMoveAllowance - moves) * (scoring.moveMultiplier || 50))
  );
  const invalidPenalty = Math.floor(invalidPlacements * (scoring.invalidPlacementPenalty || 25));
  const hintPenalty = Math.floor(hintsUsed * (scoring.hintPenalty || 100));

  const rawScore = baseScore + timeBonus + moveBonus - invalidPenalty - hintPenalty;
  const finalScore = Math.max(100, rawScore);

  // Evaluate stars
  let starsEarned = 1; // 1 star for basic completion

  // 2 stars check
  const req2 = starsConfig.two;
  const passedMoves2 = req2.maxMoves === undefined || moves <= req2.maxMoves;
  const passedTime2 = req2.minimumTimeRemaining === undefined || timeRemaining >= req2.minimumTimeRemaining;
  if (passedMoves2 && passedTime2) {
    starsEarned = 2;
  }

  // 3 stars check
  const req3 = starsConfig.three;
  const passedMoves3 = req3.maxMoves === undefined || moves <= req3.maxMoves;
  const passedTime3 = req3.minimumTimeRemaining === undefined || timeRemaining >= req3.minimumTimeRemaining;
  const passedHints3 = req3.maxHints === undefined || hintsUsed <= req3.maxHints;

  if (passedMoves3 && passedTime3 && passedHints3) {
    starsEarned = 3;
  }

  return {
    baseScore,
    timeBonus,
    moveBonus,
    invalidPenalty,
    hintPenalty,
    finalScore,
    starsEarned,
  };
}
