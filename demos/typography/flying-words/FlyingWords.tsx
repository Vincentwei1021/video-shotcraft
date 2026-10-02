// flying-words — Flying Words 词语纵深隧道（motion-lab 定稿转原生 Remotion）
// 占位词语在远处纵深生成，沿 z 轴向相机飞来擦身而过，透明度按 [0,1,0.5,0.2,0]
// 生命周期曲线变化，形成 3D 词语隧道；相机不动、元素动，spawn 完全确定性、首尾无缝。
// 词表可整体替换为项目关键词。设计坐标 480×270（DesignStage 等比放大）。
// 质感层（改版）：透视投影改为手算（scale = P/(P−z)，与 CSS perspective 1100 逐点等价），
// 这样每个词能按屏幕空间速度做径向方向性运动模糊（近镜头时拉出"擦身"的速度线）；
// 远端加大气雾（低亮 + 轻微失焦）；彩虹 hsl 收成冷白三阶 + 4 个靛蓝强调词，光晕只给强调词；
// 加一层同隧道运动的细尘埃强化纵深；暗场柔光底 + 颗粒 + 暗角。
import React from 'react';
import { DesignStage, lerp, rand, useT } from '../../_fixtures/Motion';
import { FONT, Grain, SpeedBlur, Vignette } from '../../_fixtures/Polish';

export const FLYING_WORDS_DURATION = 180; // 6000ms @30fps

// 占位词表：换成项目自己的关键词即可，词数/字长接近就不影响节奏
const WORDS = ['Motion', 'Layout', 'Camera', 'Stagger', 'Easing', 'Beat', 'Keyframe', 'Blur',
  'Scale', 'Transform', 'Rotate', 'Parallax', 'Opacity', 'Depth', 'Tween', 'Loop',
  'Spring', 'Delay', 'Fade', 'Composite', 'Grid', 'Pivot'];
const N = WORDS.length;

const PERSP = 1100; // 透视距离（设计 px）
const CX = 240;
const CY = 135;
const ACCENT_IDX = new Set([2, 6, 11, 19]); // Camera / Keyframe / Parallax / Composite：强调色词
const INKS = ['#eef0f6', '#cdd2df', '#aab1c4']; // 冷白三阶：亮 / 中 / 暗

// 每个词的静态属性全部由 rand(seed) 确定（种子与原稿一致，跨渲染可复现）
const ITEMS = WORDS.map((w, i) => {
  // 角度按黄金角铺开 + 半径避开正中，防止近处堆在一起糊成一团
  const a = i * 2.39996 + rand(i * 7 + 1) * 0.8;
  const r = 82 + rand(i * 13 + 2) * 165;
  const accent = ACCENT_IDX.has(i);
  return {
    text: w,
    fontSize: 20 + rand(i + 3) * 16,
    color: accent ? '#a3a9ff' : INKS[Math.floor(rand(i + 5) * 3)],
    accent,
    x: Math.cos(a) * r,
    y: Math.sin(a) * r * 0.6,
    rz: (rand(i + 21) - 0.5) * 14,
    ph: i / N,
  };
});

// 细尘埃：同一条隧道运动（更远、更密、更小），只做纵深参照
const DUST = Array.from({ length: 40 }, (_, i) => {
  const a = i * 2.39996 + rand(i * 5 + 77) * 1.2;
  const r = 40 + rand(i * 3 + 91) * 230;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.62, ph: rand(i * 9 + 13), size: 0.5 + rand(i + 50) * 0.7 };
});

// 生命周期透明曲线：[0,1,0.5,0.2,0] 分段线性
const OP = [0, 1, 0.5, 0.2, 0];
const OT = [0, 0.25, 0.6, 0.85, 1];
const curve = (u: number) => {
  for (let k = 0; k < 4; k++) {
    if (u <= OT[k + 1]) {
      const p = (u - OT[k]) / (OT[k + 1] - OT[k]);
      return OP[k] + (OP[k + 1] - OP[k]) * p;
    }
  }
  return 0;
};

const CYCLES = 2; // 整数圈 → t=0/t=1 画面一致
const DT = 1 / (FLYING_WORDS_DURATION - 1);

// 手算透视：z −1750 → +800 线性推进，drift 越近越向外散；返回屏幕坐标与缩放
const project = (x: number, y: number, u: number) => {
  const z = lerp(u, -1750, 800); // 远处生成 → 擦身而过
  const drift = 0.5 + u * 1.35; // 远处收拢、越近越向外散开
  const s = PERSP / (PERSP - z);
  return { sx: CX + x * drift * s, sy: CY + y * drift * s, s };
};

export const FlyingWords: React.FC = () => {
  const t = useT();
  return (
    <>
      {/* 底：带色相的深蓝黑 + 中心柔光（合成分辨率下原生栅格化，避免缩放容器里的色带） */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(62% 62% at 50% 50%, #151b2e 0%, #0b0e18 45%, #06070c 80%)',
        }}
      />
      <DesignStage bg="transparent">
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          {/* 尘埃（最远层，无模糊） */}
          {DUST.map((d, i) => {
            const u = (t * CYCLES + d.ph) % 1;
            const p = project(d.x, d.y, u);
            return (
              <div
                key={`d${i}`}
                style={{
                  position: 'absolute',
                  left: p.sx,
                  top: p.sy,
                  width: d.size * p.s,
                  height: d.size * p.s,
                  marginLeft: (-d.size * p.s) / 2,
                  marginTop: (-d.size * p.s) / 2,
                  borderRadius: '50%',
                  background: '#c9cfff',
                  opacity: curve(u) * 0.45,
                }}
              />
            );
          })}

          {ITEMS.map((it, i) => {
            const u = (t * CYCLES + it.ph) % 1;
            const p = project(it.x, it.y, u);
            // 屏幕空间速度（设计 px/帧）：u 跨循环接缝时速度按同一侧取，不出现一帧巨跳
            const u0 = Math.max(0, u - (DT * CYCLES) / 2);
            const u1 = Math.min(1, u + (DT * CYCLES) / 2);
            const a = project(it.x, it.y, u0);
            const b = project(it.x, it.y, u1);
            const k = (DT * CYCLES) / Math.max(1e-6, u1 - u0);
            const vx = (b.sx - a.sx) * k;
            const vy = (b.sy - a.sy) * k;
            // 远端大气雾：前 22% 行程轻微失焦；近端糊化（原 u>0.86 规则，系数收到 18 交给运动模糊分担）
            const fog = u < 0.22 ? (1 - u / 0.22) * 0.9 : 0;
            const near = u > 0.86 ? (u - 0.86) * 18 : 0;
            const blur = fog + near;
            return (
              <SpeedBlur key={i} vx={vx} vy={vy} amount={0.22} max={7}>
                <div
                  style={{
                    position: 'absolute',
                    left: p.sx,
                    top: p.sy,
                    transform: `translate(-50%,-50%) scale(${p.s}) rotate(${it.rz}deg)`,
                    whiteSpace: 'nowrap',
                    fontWeight: 700,
                    fontSize: it.fontSize,
                    lineHeight: 1,
                    fontFamily: FONT.sans,
                    letterSpacing: '-0.015em',
                    color: it.color,
                    textShadow: it.accent ? '0 0 10px rgba(130,138,255,0.45)' : '0 0 6px rgba(200,210,255,0.12)',
                    opacity: curve(u),
                    filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined,
                  }}
                >
                  {it.text}
                </div>
              </SpeedBlur>
            );
          })}

          {/* 中心光晕，强化"隧道尽头"（DOM 序在词语之后 → 叠在上层） */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 220,
              height: 220,
              margin: -110,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(118,126,255,.20), rgba(118,126,255,.06) 40%, transparent 68%)',
              filter: 'blur(6px)',
              opacity: 0.75 + Math.sin(t * Math.PI * 4) * 0.12,
            }}
          />
        </div>
      </DesignStage>
      <Vignette strength={0.55} inner={0.4} color="#020308" cy={0.5} />
      <Grain opacity={0.08} blend="soft-light" />
    </>
  );
};
