// dolly-zoom 滑动变焦（轮 F）——主体卡（card4-hires）大小锁定屏中，
// 背景真实卡群 + 整页反向膨胀逼近（scale + blur 渐深），
// "世界压过来"而主角纹丝不动。伪 dolly-zoom：无需 3D，分层反向补偿。
// 升级：按真实 dolly-zoom 光学给每层算各自的膨胀率——机位后退 R 倍、焦距同步拉长保持主体
// 等大时，相对主体再远 δ（以主体距离为单位）的层屏幕缩放 = R(1+δ)/(R+δ)：越远膨胀越猛
// （整页 δ=6 → 1.91x，卡群 δ=1.2 → 1.43x，贴身搜索条 δ=0.3 → 1.17x），层间速度差就是
// "空间被拉伸"的那种眩晕感；景深随焦距变长而变浅，越远越糊。
// 节拍：0–15 静立（全景深）→ 15–110 推拉（不对称 in-out）→ 110–135 定格读主体。
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import layout from '../../_textures/live-layout.json';
import { Grain, Vignette, bezier, mix, ramp, softShadow } from '../../_fixtures/Polish';

export const DOLLYZOOM_DUR = 135;

const CARDS = layout.projects.cards;
const R_END = 2.25; // 无穷远处的膨胀倍率（= 机位后退倍数）
const EASE_DOLLY = bezier(0.4, 0, 0.3, 1);

// 主体：520 宽，按 card4 宽高比
const SUB_W = 520;
const SUB_H = (SUB_W * CARDS[3].h) / CARDS[3].w;

// 卡群（δ=1.2）：围着主体的一圈，相对屏心偏移；起始互不重叠、不压主体
const RING: { i: number; x: number; y: number }[] = [
  { i: 0, x: -620, y: -290 },
  { i: 1, x: 620, y: -290 },
  { i: 2, x: -700, y: 50 },
  { i: 4, x: 700, y: 50 },
  { i: 5, x: -560, y: 370 },
  { i: 6, x: 560, y: 370 },
];
const RING_W = 300;

// 层的屏幕缩放：R(1+δ)/(R+δ)
const layerScale = (R: number, delta: number) => (R * (1 + delta)) / (R + delta);

// 以屏心为灭点的整层缩放容器
const Layer: React.FC<{ s: number; blur: number; opacity?: number; children: React.ReactNode }> = ({ s, blur, opacity = 1, children }) => (
  <AbsoluteFill
    style={{
      transform: `scale(${s})`,
      transformOrigin: '960px 540px',
      filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined,
      opacity,
    }}
  >
    {children}
  </AbsoluteFill>
);

export const DollyZoomReal: React.FC = () => {
  const frame = useCurrentFrame();
  const t = ramp(frame, 15, 95, EASE_DOLLY);
  const R = mix(1, R_END, t);

  const sPage = layerScale(R, 6);
  const sRing = layerScale(R, 1.2);
  const sNear = layerScale(R, 0.3);

  return (
    <AbsoluteFill style={{ backgroundColor: '#f1eee8', overflow: 'hidden' }}>
      {/* 远景：整页（δ=6）——最先、最猛地压过来；开场就略软，随焦距拉长糊到 6px */}
      <Layer s={sPage} blur={1 + t * 5} opacity={0.6}>
        <Img src={staticFile('textures/live/projects-full.png')} style={{ position: 'absolute', left: 0, top: -380, width: 1920 }} />
      </Layer>
      {/* 空气层：远景与卡群之间罩一层同色薄雾，把整页推远（随推拉略增） */}
      <AbsoluteFill style={{ background: `rgba(241,238,232,${(0.38 + 0.12 * t).toFixed(3)})` }} />
      {/* 中景：真实卡群（δ=1.2） */}
      <Layer s={sRing} blur={t * 2.6}>
        {RING.map(({ i, x, y }) => {
          const c = CARDS[i];
          const h = (RING_W * c.h) / c.w;
          return (
            <Img
              key={c.file}
              src={staticFile(`textures/live/${c.file}`)}
              style={{
                position: 'absolute', left: 960 + x - RING_W / 2, top: 540 + y - h / 2, width: RING_W, height: h,
                borderRadius: 7,
                boxShadow: softShadow(10, { color: '#2a2218', strength: 0.9 }),
              }}
            />
          );
        })}
      </Layer>
      {/* 近景：贴着主体身后的搜索条（δ=0.3）——几乎不动，给主体一个"近邻"做速度参照 */}
      <Layer s={sNear} blur={t * 0.8}>
        <Img
          src={staticFile('textures/live/float-search.png')}
          style={{
            position: 'absolute', left: 960 - 330, top: 540 - SUB_H / 2 - 74, width: 660, height: (660 * 88) / 2032,
            borderRadius: 11,
            boxShadow: softShadow(8, { color: '#2a2218', strength: 0.9 }),
          }}
        />
      </Layer>
      {/* 推拉的压迫：暗角随进程收紧 */}
      <Vignette strength={0.1 + 0.22 * t} inner={0.38} color="#2a2218" cy={0.5} />
      {/* 主体：视觉大小恒定钉在屏中（不参与任何变换），两层落影随进程加深——"世界在动我不动" */}
      <Img
        src={staticFile('textures/live/card4-hires.png')}
        style={{
          position: 'absolute', left: 960 - SUB_W / 2, top: 540 - SUB_H / 2, width: SUB_W, height: SUB_H,
          borderRadius: 12,
          boxShadow: softShadow(14 + t * 26, { color: '#2a2218', strength: 1.2 }),
        }}
      />
      <Grain opacity={0.035} />
    </AbsoluteFill>
  );
};
