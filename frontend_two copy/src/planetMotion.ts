export const SPIN_RADIANS_PER_SECOND = 0.055

// Shared sun vector (upper-left-front) so Earth, Moon, and Mars shadows match identically.
export const SUN_DIRECTION: readonly [number, number, number] = [-0.76, 0.28, 0.58]

// Globe surface fills 96.8% of .planet-stage radius; outer atmosphere spans the remaining 3.2%.
export const GLOBE_STAGE_SCALE = 0.968

export function planetSpin(now: number, reducedMotion: boolean): number {
  if (reducedMotion) return 0
  return (now / 1000) * SPIN_RADIANS_PER_SECOND
}
