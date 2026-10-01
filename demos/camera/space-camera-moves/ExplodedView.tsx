import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { FakeDashboard } from '../../_fixtures/Fixtures';
import { Backdrop, EASE, Grain, ramp, softShadow } from '../../_fixtures/Polish';

// exploded-view：整页 dashboard 带 3D 倾斜，咔地沿 Z 轴炸开——顶栏/侧栏/六卡
// 各自浮到不同深度悬停（近大而实、远略暗），层间透出投影；hold 一拍后
// 逆序咔哒合体，2f 震屏收口。
//
// 节拍：0–24 静止建立（已倾斜，机位缓缓带入）→ 24–59 错峰炸开（每层 14f ease-out-back）
//      → 悬停（机位慢摇 6° 让层间视差读出深度）→ 90–123 逆序合体（每层 12f ease-in）
//      → 123 震屏 → 静止到 150
//
// 改版要点：每一层都是同一张 FakeDashboard 的真实切块（按原网格坐标裁切），
// 合体时严丝合缝；底板露出各构件的"插槽"虚线；层有厚度边、顶沿受光；
// 层间压暗改为带冷色相的遮罩（不再把白卡压成脏灰）；背景换柔光底 + 颗粒。

export const EXPLODED_VIEW_DURATION = 150;

const EXPLODE = 24; // 炸开起始帧
const ASSEMBLE = 90; // 合体起始帧
const STAGGER = 3; // 层间错峰
const N = 8; // 可动层数（顶栏 + 侧栏 + 6 卡）
const CLOSE = ASSEMBLE + (N - 1) * STAGGER + 12; // = 123，最后一层归位

// FakeDashboard variant A 的布局常量（绝对定位复刻）
const SIDE_W = 220;
const TOP_H = 72;
const PAD = 36;
const GAP = 28;
const CARD_W = (1920 - SIDE_W - PAD * 2 - GAP * 2) / 3; // 524
const CARD_H = (1080 - TOP_H - PAD * 2 - GAP) / 2; // 454
const PAGE_R = 18; // 整页圆角（底板与侧栏/顶栏外角）

type Layer = {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number; // 炸开深度 60–320
  order: number; // 错峰序
  radius: string;
  edge: string; // 厚度边颜色（层背面）
};

// 六卡深度：错落分布在 60–320，近的自然更大（perspective 缩放）
const CARD_Z = [150, 300, 80, 230, 320, 110];

const LAYERS: Layer[] = [
  { key: 'top', x: SIDE_W, y: 0, w: 1920 - SIDE_W, h: TOP_H, z: 260, order: 0, radius: `0 ${PAGE_R}px 0 0`, edge: '#d6d6d2' },
  { key: 'side', x: 0, y: 0, w: SIDE_W, h: 1080, z: 190, order: 1, radius: `${PAGE_R}px 0 0 ${PAGE_R}px`, edge: '#0c0d10' },
  ...Array.from({ length: 6 }).map((_, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    return {
      key: `card${i}`,
      x: SIDE_W + PAD + col * (CARD_W + GAP),
      y: TOP_H + PAD + row * (CARD_H + GAP),
      w: CARD_W,
      h: CARD_H,
      z: CARD_Z[i],
      order: 2 + i,
      radius: '14px',
      edge: '#d9d9d5',
    };
  }),
];

// 真实切块：整张 FakeDashboard 平移后按层矩形裁切——合体时各块严丝合缝拼回原页
const Slice: React.FC<{ L: Layer }> = ({ L }) => (
  <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: L.radius }}>
    <div style={{ position: 'absolute', left: -L.x, top: -L.y, width: 1920, height: 1080 }}>
      <FakeDashboard variant="A" />
    </div>
  </div>
);

// 底板：页面背景 + 各构件的插槽虚线（炸开后露出"这里本来插着什么"）
const BasePlate: React.FC<{ dim: number }> = ({ dim }) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      borderRadius: PAGE_R,
      overflow: 'hidden',
      background: 'linear-gradient(180deg, #f4f4f2 0%, #eeeeeb 100%)',
      boxShadow: 'inset 0 0 0 1px rgba(20,22,28,0.08)',
    }}
  >
    {LAYERS.map((L) => (
      <div
        key={L.key}
        style={{
          position: 'absolute',
          left: L.x + 6,
          top: L.y + 6,
          width: L.w - 12,
          height: L.h - 12,
          borderRadius: L.key.startsWith('card') ? 10 : 8,
          border: '1.5px dashed rgba(40,44,60,0.18)',
          background: 'rgba(40,44,60,0.025)',
          boxSizing: 'border-box',
          opacity: Math.min(1, dim * 3),
        }}
      />
    ))}
    {/* 炸开时底板压暗（≤22%，带冷色相） */}
    <div style={{ position: 'absolute', inset: 0, background: '#141624', opacity: dim * 0.22 }} />
  </div>
);

export const ExplodedView: React.FC = () => {
  const frame = useCurrentFrame();

  // 每层进度：炸开 ease-out-back（带一点回弹的"咔"）× 合体逆序 ease-in
  const layerP = (order: number) => {
    const out = interpolate(
      frame,
      [EXPLODE + order * STAGGER, EXPLODE + order * STAGGER + 14],
      [0, 1],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.7)) },
    );
    const back = interpolate(
      frame,
      [ASSEMBLE + (N - 1 - order) * STAGGER, ASSEMBLE + (N - 1 - order) * STAGGER + 12],
      [0, 1],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic) },
    );
    return out * (1 - back);
  };

  // 全局散开度（驱动底板变暗）
  const g =
    interpolate(frame, [EXPLODE, EXPLODE + 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }) *
    (1 - interpolate(frame, [ASSEMBLE, CLOSE], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic) }));

  // 机位：开场 34f 缓缓带入基座倾角；悬停期慢摇 rotateY 再 6°、俯角收 2.5°，
  // 让各层按深度产生视差（深度靠运动读出，而不只靠大小）；合体前摇回原位
  const settleIn = 1 - ramp(frame, 0, 34, EASE.out);
  const hover = ramp(frame, EXPLODE + 8, 52, EASE.smooth) * (1 - ramp(frame, ASSEMBLE - 6, CLOSE - ASSEMBLE + 2, EASE.smooth));
  const rotX = 18 + 2 * settleIn - 2.5 * hover;
  const rotY = -12 + 4 * settleIn - 6 * hover;
  const camScale = 0.76 - 0.015 * settleIn - 0.06 * hover; // 悬停时略拉远，给浮起的近层留出画面
  const camY = 56 * hover; // 顶栏浮得最高，机位下移一点免得它出画
  const camX = -84; // rotateY 让右半页更近更大，整组左移把视觉重心拉回画面中线

  // 合体收口：2f 震屏，指数衰减
  const since = frame - CLOSE;
  const env = since >= 0 ? 13 * Math.exp(-since / 1.3) : 0;
  const shakeX = env * Math.sin(since * 3.3);
  const shakeY = env * 0.7 * Math.sin(since * 4.7 + 1.1);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Backdrop tone="light" light={{ x: 0.36, y: 0.1 }} accent="#5b63d3" vignette={0.2} grain={0} />
      <AbsoluteFill style={{ perspective: 1600, transform: `translate(${shakeX}px, ${shakeY}px)` }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 1920,
            height: 1080,
            transform: `translate(${camX}px, ${camY.toFixed(2)}px) scale(${camScale}) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
            transformOrigin: '50% 50%',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* 整页厚度：底板背后一块深一档的板，倾斜时从下沿/侧沿露出 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: PAGE_R,
              background: '#cfcfcb',
              transform: 'translateZ(-14px)',
              boxShadow: softShadow(56, { strength: 1.2 }),
            }}
          />
          {/* 底板：页面背景留在 Z=0，炸开时整体压暗，衬出层间深度 */}
          <BasePlate dim={g} />

          {/* 投到底板上的假投影：随层浮起而下移/变虚（主光左上） */}
          {LAYERS.map((L) => {
            const p = Math.min(1, Math.max(0, layerP(L.order)));
            if (p <= 0.01) return null;
            return (
              <div
                key={`sh-${L.key}`}
                style={{
                  position: 'absolute',
                  left: L.x + L.z * 0.16 * p,
                  top: L.y + L.z * 0.26 * p,
                  width: L.w,
                  height: L.h,
                  borderRadius: L.radius,
                  background: 'rgba(18,20,34,0.34)',
                  filter: `blur(${(8 + L.z * 0.11 * p).toFixed(1)}px)`,
                  opacity: 0.55 * p,
                  transform: 'translateZ(1px)',
                }}
              />
            );
          })}

          {/* 可动层：沿 Z 浮起，近的更大更实、远的略暗；背后一片厚度边 */}
          {LAYERS.map((L) => {
            const p = layerP(L.order);
            const pc = Math.min(1, Math.max(0, p));
            const dim = (1 - L.z / 320) * 0.28 * pc; // 深度越浅（z 小=离底板近=远离镜头）越暗
            const z = L.z * p;
            const box: React.CSSProperties = {
              position: 'absolute',
              left: L.x,
              top: L.y,
              width: L.w,
              height: L.h,
              borderRadius: L.radius,
            };
            return (
              <React.Fragment key={L.key}>
                {pc > 0.02 && (
                  <div style={{ ...box, background: L.edge, transform: `translateZ(${Math.max(1.5, z - 7).toFixed(2)}px)` }} />
                )}
                <div style={{ ...box, transform: `translateZ(${z.toFixed(2)}px)` }}>
                  <Slice L={L} />
                  {/* 受光上沿 + 发丝线外框：浮起后才出现，合体时无缝 */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: L.radius,
                      opacity: pc,
                      boxShadow: L.key === 'side'
                        ? 'inset 0 1px 0 rgba(255,255,255,0.10), inset 0 0 0 1px rgba(255,255,255,0.05)'
                        : 'inset 0 1px 0 rgba(255,255,255,0.95), inset 0 0 0 1px rgba(20,22,28,0.07)',
                    }}
                  />
                  {/* 深度压暗：冷色相遮罩，不把白卡压成脏灰 */}
                  {dim > 0.002 && (
                    <div style={{ position: 'absolute', inset: 0, borderRadius: L.radius, background: '#1a1d30', opacity: dim }} />
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </AbsoluteFill>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};
