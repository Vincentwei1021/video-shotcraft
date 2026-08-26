import { interpolate } from 'remotion';
import { E } from './tokens';

export const progress = (
  frame: number,
  start: number,
  duration: number,
  easing: (value: number) => number = E.quint,
) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });

export const lerp = (from: number, to: number, value: number) => from + (to - from) * value;

/** 确定性有界漂移（极轻的"呼吸"，Recordly 语言下幅度要小） */
export const drift = (frame: number, cycleFrames: number, amplitude: number) =>
  Math.sin((frame / cycleFrames) * Math.PI * 2) * amplitude;

export type Key<T> = { f: number } & T;

/** 分段关键帧插值：相邻 key 之间用 easing 过渡，段外 clamp。 */
export const keyframes = <T extends Record<string, number>>(
  keys: Array<Key<T>>,
  frame: number,
  easing: (v: number) => number = E.quint,
): T => {
  if (keys.length === 0) throw new Error('keyframes: empty');
  const sorted = keys;
  if (frame <= sorted[0].f) return sorted[0];
  if (frame >= sorted[sorted.length - 1].f) return sorted[sorted.length - 1];
  let i = 0;
  while (i < sorted.length - 1 && sorted[i + 1].f <= frame) i++;
  const a = sorted[i];
  const b = sorted[Math.min(i + 1, sorted.length - 1)];
  const t = b.f === a.f ? 1 : easing((frame - a.f) / (b.f - a.f));
  const out: Record<string, number> = {};
  for (const k of Object.keys(a)) {
    if (k === 'f') continue;
    out[k] = lerp(a[k] as number, (b as Record<string, number>)[k] ?? (a[k] as number), t);
  }
  return out as T;
};
