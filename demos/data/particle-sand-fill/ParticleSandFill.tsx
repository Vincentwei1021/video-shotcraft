// particle-sand-fill —— 粒子落斗成柱
// 图表卡内 4 根柱，每根柱上方"下雨"：14px 方点错峰坠落（重力加速），触堆积面即停
// + 15% 回弹一下，逐层堆高——堆积高度闭式预解析（第 k 层顶面 = 基线 - (k+1)×粒径，
// 无真碰撞）。各柱错峰 6f 启动；堆满后粒子面凝成实体柱 + 顶部数值标签弹出。
// 结尾全部粒子条件卸载、只剩实体柱 + 标签，真静止 ≥25f。
// 帧确定性：sin 散列派生每颗出发帧抖动/起点错高，落地帧由高度差闭式反解。
//
// 质感升级：去掉调试标题与骨架条，图表卡换出版级（发丝线 + 内高光 + 两层阴影 + 标题/单位/坐标/类目），
// 柔光亮场 + 颗粒；雨帘裁进绘图区并在顶部渐隐出现（不再从卡片外穿帮落下）；粒子与实体柱同色系
// （灰柱冷灰颗粒、主角柱琥珀颗粒，逐颗 ±明度微差），不再是灰柱里混琥珀噪点；坠落颗粒按速度纵向拉长
// 读出加速度；"凝成实体"改为真凝结——堆满后颗粒间隙 2px→0、圆角收平，再由带受光渐变的实体柱接管。
import React from 'react';
import { useCurrentFrame, interpolate, interpolateColors } from 'remotion';
import { G } from '../../_fixtures/Fixtures';
import { Backdrop, EASE, FONT, Grain, innerHighlight, mix, ramp, softShadow, tracking } from '../../_fixtures/Polish';

export const PARTICLE_SAND_FILL_DURATION = 150; // 雨 ~95f + 凝结/标签 ~25f + 静止，5s @30fps

const AMBER = '#b45309';
const frac = (x: number) => x - Math.floor(x);
const rnd = (i: number, salt: number) => frac(Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453);

const CARD = { x: 460, y: 180, w: 1000, h: 720 };
const PLOT_BOTTOM = CARD.y + CARD.h - 96; // 堆积地面（卡内基线）
const PLOT_TOP = CARD.y + 150; // 绘图区上沿：雨帘在此之下渐隐出现
const GRAIN = 14; // 方点边长（宁大勿小：4px 在 1080p 卡内不可感，加码到 14）
const PER_LAYER = 9; // 每层 9 颗 → 柱宽 126px
const BAR_W = GRAIN * PER_LAYER;
const DROP_FROM = 230; // 距各自落点上方 ~230px 起落
const GRAV = 1.6; // px/f²
const STAGGER = 6; // 各柱错峰启动
const RATE = 0.28; // 颗间出发间隔（帧）——最高柱 216 颗需 ~60f 发完，全局 f120 内收束

const BARS = [
  { cx: CARD.x + 200, h: 238, label: '238', name: 'North' },
  { cx: CARD.x + 400, h: 336, label: '336', name: 'West' },
  { cx: CARD.x + 600, h: 182, label: '182', name: 'South' },
  { cx: CARD.x + 800, h: 294, label: '294', name: 'East' },
].map((b) => ({ ...b, layers: Math.round(b.h / GRAIN), n: Math.round(b.h / GRAIN) * PER_LAYER }));

// 色系：灰柱 = 冷灰，主角柱（West）= 琥珀；颗粒在本色上 ±明度微差
const isHero = (b: number) => b === 1;
const grainTone = (b: number, i: number) => {
  const k = rnd(i, b * 13 + 7);
  return isHero(b)
    ? interpolateColors(k, [0, 0.5, 1], ['#a3470a', '#bd5a0d', '#cf6d18'])
    : interpolateColors(k, [0, 0.5, 1], ['#b4b8c1', '#c3c6ce', '#d2d5db']);
};

const fallTime = (dist: number) => Math.sqrt((2 * dist) / GRAV);
const departOf = (bar: number, i: number) => 8 + bar * STAGGER + i * RATE + rnd(i, bar * 7 + 1) * 1.5;

// 雨帘遮罩：绘图区上沿往下 90px 内渐显（相对卡片坐标）
const RAIN_MASK = `linear-gradient(180deg, transparent ${PLOT_TOP - CARD.y - 40}px, #000 ${PLOT_TOP - CARD.y + 50}px)`;

export const ParticleSandFill: React.FC = () => {
  const frame = useCurrentFrame();
  const cardIn = ramp(frame, 0, 14, EASE.out);
  const headIn = ramp(frame, 3, 16, EASE.out);
  const axisIn = ramp(frame, 4, 18, EASE.snappy);

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', fontFamily: FONT.sans }}>
      <Backdrop tone="light" light={{ x: 0.4, y: 0.16 }} vignette={0.16} grain={0} />

      {/* 图表卡 */}
      <div
        style={{
          position: 'absolute',
          left: CARD.x,
          top: CARD.y,
          width: CARD.w,
          height: CARD.h,
          boxSizing: 'border-box',
          borderRadius: 22,
          background: 'linear-gradient(180deg, #ffffff 0%, #fbfbfa 100%)',
          border: `1px solid ${G.hairline}`,
          boxShadow: `${innerHighlight(0.9)}, ${softShadow(mix(20, 6, cardIn))}`,
          opacity: cardIn,
          transform: `translateY(${mix(16, 0, cardIn).toFixed(2)}px)`,
          padding: '40px 48px',
        }}
      >
        <div style={{ opacity: headIn, transform: `translateY(${mix(6, 0, headIn).toFixed(2)}px)` }}>
          <div style={{ fontSize: 40, fontWeight: 680, color: G.ink1, letterSpacing: tracking(40) }}>New signups by region</div>
          <div style={{ marginTop: 6, fontSize: 32, fontWeight: 500, color: G.ink3, letterSpacing: tracking(32) }}>
            Q3 2026 · thousands
          </div>
        </div>
      </div>

      {/* 网格线 100/200/300 + 基线 */}
      {[100, 200, 300].map((v) => (
        <React.Fragment key={v}>
          <div
            style={{
              position: 'absolute',
              left: CARD.x + 96,
              width: (CARD.w - 144) * axisIn,
              top: PLOT_BOTTOM - v,
              height: 1,
              background: 'rgba(20,22,28,0.06)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: CARD.x + 40,
              width: 44,
              textAlign: 'right',
              top: PLOT_BOTTOM - v - 12,
              fontSize: 22,
              fontWeight: 500,
              color: '#b0b3ba',
              fontVariantNumeric: 'tabular-nums',
              opacity: axisIn,
            }}
          >
            {v}
          </div>
        </React.Fragment>
      ))}
      <div
        style={{
          position: 'absolute',
          left: CARD.x + 96,
          top: PLOT_BOTTOM,
          width: (CARD.w - 144) * axisIn,
          height: 2,
          background: 'rgba(20,22,28,0.16)',
          borderRadius: 1,
        }}
      />

      {/* 粒子层：裁进卡片，顶部渐隐 */}
      <div
        style={{
          position: 'absolute',
          left: CARD.x,
          top: CARD.y,
          width: CARD.w,
          height: PLOT_BOTTOM - CARD.y,
          overflow: 'hidden',
          WebkitMaskImage: RAIN_MASK,
          maskImage: RAIN_MASK,
        }}
      >
        {BARS.map((bar, b) => {
          const left = bar.cx - BAR_W / 2 - CARD.x;
          const lastLand = departOf(b, bar.n - 1) + fallTime(DROP_FROM);
          const doneAt = lastLand + 7;
          const solidOp = ramp(frame, doneAt + 4, 8, EASE.out);
          if (solidOp >= 1) return null; // 交接完成 → 粒子整体卸载
          // 凝结：堆满后颗粒间隙 2px→0、圆角收平
          const fuse = ramp(frame, lastLand + 2, 9, EASE.smooth);
          const gap = mix(2, 0, fuse);
          return (
            <React.Fragment key={b}>
              {Array.from({ length: bar.n }).map((_, i) => {
                const depart = departOf(b, i);
                const age = frame - depart;
                if (age <= 0) return null;
                const layer = Math.floor(i / PER_LAYER);
                const col = i % PER_LAYER;
                const targetTop = PLOT_BOTTOM - CARD.y - (layer + 1) * GRAIN; // 闭式堆积面
                const startTop = targetTop - DROP_FROM - rnd(i, b * 13 + 3) * 70;
                const dist = targetTop - startTop;
                const tLand = fallTime(dist);
                let top: number;
                let stretch = 1;
                if (age < tLand) {
                  top = startTop + 0.5 * GRAV * age * age;
                  // 坠落速度 → 纵向拉长（底边对齐，像带拖影的雨滴）
                  stretch = 1 + Math.min(0.75, (GRAV * age) / 42);
                } else {
                  const ba = age - tLand;
                  const bounce = ba < 6 ? Math.sin((ba / 6) * Math.PI) * GRAIN * 2 * 0.15 * (1 + rnd(i, b * 13 + 9)) : 0;
                  top = targetTop - bounce;
                }
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: left + col * GRAIN + gap / 2,
                      top: top + gap / 2,
                      width: GRAIN - gap,
                      height: GRAIN - gap,
                      background: grainTone(b, i),
                      borderRadius: mix(2.5, 0, fuse),
                      transformOrigin: '50% 100%',
                      transform: stretch > 1.001 ? `scaleY(${stretch.toFixed(3)})` : undefined,
                      opacity: age < tLand ? 0.92 : 1,
                    }}
                  />
                );
              })}
            </React.Fragment>
          );
        })}
      </div>

      {/* 实体柱 + 数值标签 + 类目 */}
      {BARS.map((bar, b) => {
        const left = bar.cx - BAR_W / 2;
        // 末颗落地帧（闭式）：末颗落点在堆顶，坠距仍 ≈DROP_FROM
        const lastLand = departOf(b, bar.n - 1) + fallTime(DROP_FROM);
        const doneAt = lastLand + 7; // 回弹收完 → 开始交接
        const solidOp = ramp(frame, doneAt, 10, EASE.out);
        const lab = ramp(frame, doneAt + 6, 14, EASE.overshoot);
        const labOp = ramp(frame, doneAt + 6, 6, EASE.out);
        const hero = isHero(b);
        return (
          <React.Fragment key={b}>
            {solidOp > 0 && (
              <div
                style={{
                  position: 'absolute',
                  left,
                  top: PLOT_BOTTOM - bar.h,
                  width: BAR_W,
                  height: bar.h,
                  borderRadius: '8px 8px 0 0',
                  background: hero
                    ? 'linear-gradient(180deg, #cc6a17 0%, #b45309 55%, #9f4608 100%)'
                    : 'linear-gradient(180deg, #d0d3d9 0%, #c3c6ce 60%, #b9bcc4 100%)',
                  boxShadow: hero
                    ? 'inset 0 1px 0 rgba(255,220,180,0.45), 0 10px 24px -10px rgba(180,83,9,0.45)'
                    : 'inset 0 1px 0 rgba(255,255,255,0.6)',
                  opacity: solidOp,
                }}
              />
            )}
            {labOp > 0 && (
              <div
                style={{
                  position: 'absolute',
                  left: bar.cx - 80,
                  top: PLOT_BOTTOM - bar.h - 64,
                  width: 160,
                  textAlign: 'center',
                  fontWeight: 720,
                  fontSize: 46,
                  letterSpacing: tracking(46),
                  fontVariantNumeric: 'tabular-nums',
                  color: hero ? AMBER : G.ink1,
                  opacity: labOp,
                  transformOrigin: '50% 100%',
                  transform: `translateY(${mix(10, 0, lab).toFixed(2)}px) scale(${mix(0.7, 1, lab).toFixed(4)})`,
                }}
              >
                {bar.label}
              </div>
            )}
            <div
              style={{
                position: 'absolute',
                left: bar.cx - 90,
                width: 180,
                top: PLOT_BOTTOM + 22,
                textAlign: 'center',
                fontSize: 32,
                fontWeight: hero ? 650 : 500,
                color: hero ? G.ink1 : G.ink2,
                letterSpacing: tracking(32),
                opacity: axisIn,
              }}
            >
              {bar.name}
            </div>
          </React.Fragment>
        );
      })}
      <Grain opacity={0.05} />
    </div>
  );
};
