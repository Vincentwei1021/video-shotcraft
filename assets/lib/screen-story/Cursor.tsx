import React from 'react';
import { C } from './tokens';
import { keyframes, lerp, progress, type Key } from './motion';
import { E } from './tokens';

// Cursor — 合成光标层（页面坐标系，挂在相机层内部，随 zoom 一起缩放）。
// waypoints 分段 quint 插值（真实鼠标"甩-停"手感）；click 帧出涟漪 + 按压回弹。

export type CursorKey = Key<{ x: number; y: number }>;

const ARROW = // macOS 风格箭头（黑体白描边）
  'M0,0 L0,26.4 L5.5,21.6 L9.4,30.6 L13.3,28.9 L9.4,20.0 L16.6,19.6 Z';

export const Cursor: React.FC<{
  frame: number;
  keys: CursorKey[];
  clicks: number[];
  /** 进场帧：之前不渲染 */
  appearAt?: number;
  size?: number;
}> = ({ frame, keys, clicks, appearAt = 0, size = 34 }) => {
  if (frame < appearAt || keys.length === 0) return null;
  const pos = keyframes(keys, frame, E.glide);

  // 按压回弹
  let press = 1;
  for (const fc of clicks) {
    if (frame >= fc && frame <= fc + 12) {
      const down = progress(frame, fc, 4, E.out);
      const up = progress(frame, fc + 4, 8, E.quint);
      press = lerp(1, 0.84, down) + lerp(0, 0.16, up) * (frame > fc + 4 ? 1 : 0);
      press = Math.min(press, 1);
    }
  }

  return (
    <div style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
      {/* 点击涟漪（锚定在点击发生时的光标位置，不随光标移动） */}
      {clicks.map((fc) => {
        if (frame < fc || frame > fc + 22) return null;
        const anchor = keyframes(keys, fc, E.glide);
        const t = progress(frame, fc, 22, E.out);
        const r = lerp(10, 56, t);
        return (
          <div
            key={fc}
            style={{
              position: 'absolute',
              left: anchor.x - r,
              top: anchor.y - r,
              width: r * 2,
              height: r * 2,
              borderRadius: '50%',
              border: `${lerp(5, 1.5, t)}px solid ${C.accent}`,
              opacity: lerp(0.6, 0, t),
            }}
          />
        );
      })}
      {/* 箭头本体 */}
      <svg
        width={size}
        height={size * 1.9}
        viewBox="-2 -2 21 35"
        style={{
          position: 'absolute',
          left: pos.x,
          top: pos.y,
          transform: `scale(${press})`,
          transformOrigin: '2px 2px',
          filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.35))',
        }}
      >
        <path d={ARROW} fill="#0B0B0B" stroke="#FFFFFF" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </div>
  );
};
