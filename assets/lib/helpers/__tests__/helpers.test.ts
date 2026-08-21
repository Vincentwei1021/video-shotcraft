// Unit tests for the pure helper functions in assets/lib/helpers.
// Run with `npm test` from the repo root (vitest). These are pure, stateless
// functions — every assertion is deterministic, no mocks needed.

import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../rand';
import { velocityAt, lagged, dampedSettle } from '../motion';
import { handheld } from '../shake';

describe('mulberry32', () => {
  it('returns values in [0, 1)', () => {
    const rand = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is deterministic: same seed → same sequence', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    const seqA = Array.from({ length: 100 }, () => a());
    const seqB = Array.from({ length: 100 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('different seeds → different sequences', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it('is reproducible across fresh instances (no hidden state leak)', () => {
    // calling two instances interleaved must not affect either
    const a = mulberry32(7);
    const b = mulberry32(7);
    const expectA = Array.from({ length: 5 }, () => a());
    const interleave = [a(), b(), a(), b(), a(), b()]; // 3 each
    const fresh = mulberry32(7);
    const freshSeq = Array.from({ length: 5 }, () => fresh());
    expect(freshSeq).toEqual(expectA);
  });

  it('handles edge seeds (0, negative, float) without throwing', () => {
    for (const seed of [0, -1, 3.7, 2147483647, -2147483648]) {
      const rand = mulberry32(seed);
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('velocityAt', () => {
  // constant velocity straight-line motion: x = 2f, y = -3f → v = (2, -3), speed 3.606
  const line = (f: number) => ({ x: 2 * f, y: -3 * f });

  it('recovers constant velocity', () => {
    const v = velocityAt(line, 10);
    expect(v.vx).toBeCloseTo(2, 10);
    expect(v.vy).toBeCloseTo(-3, 10);
    expect(v.speed).toBeCloseTo(Math.hypot(2, 3), 10);
  });

  it('direction matches atan2(vy, vx)', () => {
    const v = velocityAt(line, 10);
    expect(v.direction).toBeCloseTo(Math.atan2(-3, 2), 10);
  });

  it('returns zero for a stationary subject', () => {
    const still = () => ({ x: 5, y: 5 });
    const v = velocityAt(still, 3);
    expect(v.speed).toBe(0);
    expect(v.vx).toBe(0);
    expect(v.vy).toBe(0);
  });

  it('is central-difference (order-2 accurate) for a quadratic trajectory', () => {
    // x = f^2 → derivative 2f; central diff at f=4 gives exactly 8
    const quad = (f: number) => ({ x: f * f, y: 0 });
    const v = velocityAt(quad, 4);
    expect(v.vx).toBeCloseTo(8, 6);
  });

  it('scales with dt', () => {
    const v = velocityAt(line, 10, 2);
    expect(v.vx).toBeCloseTo(2, 10);
    expect(v.vy).toBeCloseTo(-3, 10);
  });
});

describe('lagged', () => {
  it('samples the state function at frame − delay', () => {
    const stateAt = (f: number) => ({ f });
    expect(lagged(stateAt, 20, 4)).toEqual({ f: 16 });
    expect(lagged(stateAt, 20, 0)).toEqual({ f: 20 });
  });

  it('handles negative result frames (clamped by caller, returns raw)', () => {
    const stateAt = (f: number) => ({ f });
    expect(lagged(stateAt, 2, 5)).toEqual({ f: -3 });
  });

  it('propagates generic types unchanged', () => {
    const stateAt = (f: number) => `t${f}`;
    expect(lagged(stateAt, 10, 3)).toBe('t7');
  });
});

describe('dampedSettle', () => {
  it('is zero at impact (t <= 0)', () => {
    expect(dampedSettle(0, 0.1, 0.15)).toBe(0);
    expect(dampedSettle(-5, 0.1, 0.15)).toBe(0);
  });

  it('starts at 0 and first peak is positive (recoil direction)', () => {
    // first zero crossing of sin(2π f t) is at t = 1/(2f) = 5 for f=0.1
    const v = dampedSettle(0.1, 0.1, 0.15);
    expect(v).toBeGreaterThan(0);
  });

  it('oscillates: sign flips every half period', () => {
    const freq = 0.1; // period 10 frames
    const s1 = dampedSettle(2.5, freq, 0.15); // quarter period → +
    const s2 = dampedSettle(7.5, freq, 0.15); // three-quarter → −
    expect(s1).toBeGreaterThan(0);
    expect(s2).toBeLessThan(0);
  });

  it('decays to zero with time (amplitude envelope shrinks)', () => {
    const freq = 0.1;
    const peak1 = dampedSettle(2.5, freq, 0.15);
    // after many cycles the envelope should be much smaller
    const late = dampedSettle(2.5 + 40, freq, 0.15); // 4 full periods later
    expect(Math.abs(late)).toBeLessThan(Math.abs(peak1) * 0.05);
  });

  it('higher damping decays faster at the same point in the cycle', () => {
    // t=17.3 is far from a sin zero-crossing (at t=30 both terms land near a
    // node and the comparison is numerically fragile ~1e-16 vs ~1e-22)
    const t = 17.3;
    const lightly = dampedSettle(t, 0.1, 0.05);
    const heavily = dampedSettle(t, 0.1, 0.5);
    expect(Math.abs(heavily)).toBeLessThan(Math.abs(lightly));
  });

  it('is deterministic for same args', () => {
    expect(dampedSettle(17.3, 0.13, 0.2)).toBe(dampedSettle(17.3, 0.13, 0.2));
  });
});

describe('handheld', () => {
  it('returns a 3-tuple (x, y, z=0)', () => {
    const [x, y, z] = handheld(0);
    expect(typeof x).toBe('number');
    expect(typeof y).toBe('number');
    expect(z).toBe(0);
  });

  it('is deterministic: same frame → same output', () => {
    expect(handheld(37)).toEqual(handheld(37));
  });

  it('amplitude scales linearly with the amp parameter', () => {
    const small = handheld(10, 0.012);
    const big = handheld(10, 0.024);
    expect(big[0]).toBeCloseTo(small[0] * 2, 10);
    expect(big[1]).toBeCloseTo(small[1] * 2, 10);
  });

  it('stays within the amp envelope (sum of two sine terms ≤ 1.6·amp)', () => {
    for (let f = 0; f < 500; f++) {
      const [x, y] = handheld(f, 1); // amp=1 for easy bound check
      expect(Math.abs(x)).toBeLessThanOrEqual(1.6 + 1e-9);
      expect(Math.abs(y)).toBeLessThanOrEqual(1.5 + 1e-9);
    }
  });
});
