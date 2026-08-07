// fracture — Fracture Reassemble 碎片聚合（motion-lab 定稿转原生 Remotion）
// 5×5 瓦片从 3D 空间随机碎片态（±大位移 + 三轴随机旋转 + 透明）聚合成整面海报，
// 按曼哈顿距离从中心向外波纹式就位；hold 后全部碎片沿背离中心的方向加速旋转飞出画面。
// 正放=开场、倒放=转场。设计坐标 480×270（DesignStage 等比放大），参数以此坐标系标定。
import React from 'react';
import { DesignStage, E, rand, seg, useT } from '../../_fixtures/Motion';

export const FRACTURE_DURATION = 156; // 5200ms @30fps

const N = 5;
const ACCENT_HUE = 218; // 模板强调色相，可按项目替换
const HUES = [ACCENT_HUE, ACCENT_HUE + 8, ACCENT_HUE - 8, ACCENT_HUE + 4, ACCENT_HUE - 4];

// 瓦片参数表：位置/渐变 + 入场随机碎片态 + 退场方向（种子与 effect.js 完全一致）
const TILES = Array.from({ length: N * N }, (_, seed) => {
  const r = Math.floor(seed / N);
  const c = seed % N;
  const hue = HUES[(r * 3 + c * 5) % HUES.length];
  // 退场方向：背离画面中心（中心瓦片给随机角），保证全部飞出画面
  const ang =
    r === 2 && c === 2
      ? rand(seed + 300) * Math.PI * 2
      : Math.atan2(r - 2 + (rand(seed + 310) - 0.5) * 0.8, c - 2 + (rand(seed + 320) - 0.5) * 0.8);
  return {
    left: `${c * 20}%`,
    top: `${r * 20}%`,
    background: `linear-gradient(${135 + r * 20}deg, hsl(${hue},14%,${38 + ((r + c) % 3) * 14}%), hsl(${hue},20%,${22 + ((r * c) % 4) * 10}%))`,
    dx: (rand(seed) - 0.5) * 900,
    dy: (rand(seed + 50) - 0.5) * 600,
    dz: (rand(seed + 100) - 0.3) * 700,
    rx: (rand(seed + 150) - 0.5) * 360,
    ry: (rand(seed + 200) - 0.5) * 360,
    rz: (rand(seed + 250) - 0.5) * 360,
    exX: Math.cos(ang) * (620 + rand(seed + 330) * 260),
    exY: Math.sin(ang) * (470 + rand(seed + 340) * 220),
    exR: (rand(seed + 350) - 0.5) * 300,
    delay: (Math.abs(r - 2) + Math.abs(c - 2)) * 0.045,
  };
});

export const Fracture: React.FC = () => {
  const t = useT();
  return (
    <DesignStage bg="#0b0b10">
      <div style={{ position: 'absolute', inset: 0, perspective: 900, overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 380,
            height: 230,
            margin: '-115px 0 0 -190px',
            transformStyle: 'preserve-3d',
          }}
        >
          {TILES.map((tl, i) => {
            const tin = seg(t, tl.delay, tl.delay + 0.34, E.inOutCubic);
            // 退场窗口收紧：最晚的角瓦片 0.79 起飞、0.97 前飞完（原 0.85 起飞导致 t=1 时还没出画）
            const tout = seg(t, 0.70 + tl.delay * 0.5, 0.70 + tl.delay * 0.5 + 0.18, E.inCubic);
            const inv = 1 - tin; // 入场：碎片态 → 就位
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: tl.left,
                  top: tl.top,
                  width: '19.2%',
                  height: '19%',
                  borderRadius: 3,
                  background: tl.background,
                  transform: `translate3d(${tl.dx * inv + tl.exX * tout}px,${tl.dy * inv + tl.exY * tout}px,${tl.dz * inv}px)
          rotateX(${tl.rx * inv}deg) rotateY(${tl.ry * inv}deg) rotateZ(${tl.rz * inv + tl.exR * tout}deg)`,
                  opacity: Math.min(1, tin * 2.5), // 退场不淡出，实体飞出画面
                }}
              />
            );
          })}
        </div>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%,-50%)',
            color: '#fff',
            fontWeight: 800,
            fontSize: 26,
            letterSpacing: 8,
            opacity: seg(t, 0.42, 0.52) - seg(t, 0.7, 0.78),
            textShadow: '0 2px 30px rgba(0,0,0,.8)',
          }}
        >
          REASSEMBLE
        </div>
      </div>
    </DesignStage>
  );
};
