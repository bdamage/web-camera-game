import {CATCHER_WIDTH, CATCHER_Y} from "./constants";
import type {FallingObject, HandPoint} from "../types/game";

export const collidesWithCatcher = (
  catcherX: number,
  object: FallingObject,
) => {
  const halfWidth = CATCHER_WIDTH / 2;
  const horizontalHit =
    Math.abs(catcherX - object.x) <= halfWidth + object.size * 0.45;
  const verticalHit =
    object.y >= CATCHER_Y - 0.03 && object.y <= CATCHER_Y + 0.04;
  return horizontalHit && verticalHit;
};

export const collidesWithHand = (hand: HandPoint, object: FallingObject) => {
  if (!hand.isClosed) {
    return false;
  }

  const dx = hand.x - object.x;
  const dy = hand.y - object.y;
  const distance = Math.hypot(dx, dy);
  const hitRadius = object.size * 0.52 + 0.035;
  return distance <= hitRadius;
};

export const collidesWithAnyHand = (
  hands: HandPoint[],
  object: FallingObject,
) => hands.some((hand) => collidesWithHand(hand, object));
