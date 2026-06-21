import {clamp} from "./math";

export class ExponentialSmoother {
  private current: number | null = null;
  private readonly alpha: number;

  constructor(alpha = 0.2) {
    this.alpha = alpha;
  }

  public reset(nextValue: number | null = null) {
    this.current = nextValue;
  }

  public update(nextValue: number): number {
    if (this.current === null) {
      this.current = nextValue;
      return nextValue;
    }

    const smoothed = this.current + (nextValue - this.current) * this.alpha;
    this.current = clamp(smoothed, 0, 1);
    return this.current;
  }
}
