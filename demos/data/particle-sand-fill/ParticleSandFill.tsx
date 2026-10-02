// particle-sand-fill —— 粒子落斗成柱（柱不是长高的，是"下雨下出来"的）
//
// 第二轮重设计（纸 · 瑞士网格数据信息图 · 雨量筒）：
// - look = paper（暖白纸 · 墨 · 朱红），但不是衬线编辑风：粗黑体 + 等宽刻度的瑞士网格信息图。
//   内容让手法"名副其实"：十月降雨量（毫米），四座城市各一支量雨筒——方点雨粒真的从筒口落下、
//   一颗颗堆出降雨量。记录城市 Bergen 用朱红，其余三城用墨色；左上 120px 大标题、右上图例，
//   左侧共用 mm 刻度与虚网格线，筒内壁有细刻度（纹理级），筒下城市名 + 国家代码。
// - 落体：16px 圆角方点，每层 10 颗（层内列序打乱，不是打字机式从左到右）；重力加速坠落（落地帧闭式反解），
//   下落中按速度纵向拉长成雨滴，触面 15% 单次回弹；各筒错峰 6f 启动，同一出雨速率 → 矮筒先满。
// - 凝结：堆满 → 颗粒间隙 2px→0、圆角收平（9f, smooth）→ 实体柱接管（墨柱带纸感微渐变、朱红柱带受光渐变）
//   → 数值从柱顶 overshoot 弹出（数字 72px + mm）。Bergen 最后满，接着图例里的"Record"一行加粗点亮。
//
// 时间表（30fps，共 168f）：
//   0–22    预备：眉题、标题逐行升起；网格线与基线从左向右画出；四支量雨筒自下而上描出（错峰 4f）
//   16–97   主动作：雨（Porto 先满 ~f85 → Cardiff → Galway → Bergen 最后 ~f97）；落点闭式预解析
//   满后    +2f 凝结 9f → +11f 实体柱交接 8f → +12f 数值弹出 → +16f 读数引线画到液面
//   113–123 余波：Bergen 读数落定后图例「Wettest October on record」加粗点亮
//   123–168 hold：干净信息图海报（全程 2% 极缓推镜）
import React from 'react';
import { AbsoluteFill, interpolateColors, useCurrentFrame } from 'remotion';
import { EASE, FONT, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, springAt, type } from '../../_fixtures/Look';

export const PARTICLE_SAND_FILL_DURATION = 168; // 雨 ~80f + 凝结/数值 ~26f + hold ≥45f

const L = LOOKS.paper;
const frac = (x: number) => x - Math.floor(x);
const rnd = (i: number, salt: number) => frac(Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453);

// ───── 版式 ─────
const TYPE_H1 = 124; // 大标题
const BASE_Y = 900; // 基线（筒底）
const PX_PER_MM = 1.3;
const AXIS_X = 150; // 刻度列
const PLOT_R = 1780;
const GRAIN = 16; // 方点边长
const PER_LAYER = 10; // 每层 10 颗 → 柱宽 160
const BAR_W = GRAIN * PER_LAYER;
const TUBE_PAD = 10; // 筒壁与雨柱的间隙
const TUBE_MM = 360; // 筒高（mm）
const TUBE_TOP = BASE_Y - TUBE_MM * PX_PER_MM;
const GRAV = 1.7; // px/f²
const RATE = 4; // 每帧出雨颗数（同一雨势 → 矮筒先满：Porto ~f85 → Cardiff → Galway → Bergen ~f97，依次凝结）
const STAGGER = 4; // 各筒错峰启动（左→右）

const CITIES = [
  { name: 'Bergen', code: 'NO', mm: 336, cx: 520, hero: true },
  { name: 'Galway', code: 'IE', mm: 294, cx: 860, hero: false },
  { name: 'Cardiff', code: 'GB', mm: 238, cx: 1200, hero: false },
  { name: 'Porto', code: 'PT', mm: 182, cx: 1540, hero: false },
].map((c, b) => {
  const layers = Math.round((c.mm * PX_PER_MM) / GRAIN);
  const n = layers * PER_LAYER;
  const start = 16 + b * STAGGER;
  return { ...c, b, layers, n, start, h: layers * GRAIN };
});

// 层内列序打乱（每层一个固定置换），避免"从左到右打字"的机械感
const colOrder = (b: number, layer: number) => {
  const idx = Array.from({ length: PER_LAYER }, (_, i) => i);
  return idx.sort((p, q) => rnd(p, b * 97 + layer * 13 + 1) - rnd(q, b * 97 + layer * 13 + 1));
};
const ORDERS = CITIES.map((c) => Array.from({ length: c.layers }, (_, k) => colOrder(c.b, k)));

const fallTime = (dist: number) => Math.sqrt((2 * dist) / GRAV);
const departOf = (b: number, i: number) => CITIES[b].start + i / RATE + rnd(i, b * 7 + 1) * 1.2;
const startTopOf = (b: number, i: number) => TUBE_TOP - 40 - rnd(i, b * 13 + 3) * 80;
const landOf = (b: number, i: number) => {
  const layer = Math.floor(i / PER_LAYER);
  const targetTop = BASE_Y - (layer + 1) * GRAIN;
  return departOf(b, i) + fallTime(targetTop - startTopOf(b, i));
};
// 每筒"满"的帧 = 最后落地的那颗
const FULL_AT = CITIES.map((c) => {
  let m = 0;
  for (let i = 0; i < c.n; i++) m = Math.max(m, landOf(c.b, i));
  return m;
});

const grainTone = (hero: boolean, b: number, i: number) => {
  const k = rnd(i, b * 13 + 7);
  return hero
    ? interpolateColors(k, [0, 0.5, 1], ['#c8341f', '#e5432d', '#f0614a'])
    : interpolateColors(k, [0, 0.5, 1], ['#120f0c', '#2a241e', '#3d362e']);
};

// 雨帘只在筒口附近出现：筒口上方 70px 起渐显，筒口下 10px 全显（不会飘到标题和图例上）
const RAIN_MASK = `linear-gradient(180deg, transparent ${TUBE_TOP - 70}px, #000 ${TUBE_TOP + 10}px)`;

export const ParticleSandFill: React.FC = () => {
  const frame = useCurrentFrame();
  const gridK = ramp(frame, 2, 24, EASE.snappy);
  const heroDone = FULL_AT[0];
  const recordOn = ramp(frame, heroDone + 16, 10, EASE.out);

  return (
    <AbsoluteFill style={{ overflow: 'hidden', fontFamily: FONT.sans }}>
      <Stage look={L} keyLight={{ x: 0.3, y: 0.05 }} fill={null} vignette={0.14} />
      {/* 相机：全程 1→1.02 极缓推（以图表中心为焦点），hold 段画面不死 */}
      <AbsoluteFill style={{ transform: `scale(${(1 + 0.02 * ramp(frame, 0, PARTICLE_SAND_FILL_DURATION, EASE.smooth)).toFixed(4)})`, transformOrigin: '50% 62%' }}>

      {/* ── 页眉：眉题 + 大标题（左）、图例（右） ── */}
      <div style={{ position: 'absolute', left: AXIS_X, top: 92 }}>
        <TextReveal text="BROLLY  ·  RAINFALL REPORT  ·  OCTOBER 2026" by="char" variant="track" start={0} each={16} gap={0.35}
          style={{ ...type(26, 600, { mono: true }), letterSpacing: '0.12em', color: L.ink3 }} />
        <div style={{ marginTop: 26 }}>
          <TextReveal text={'Rain, measured.'} by="word" variant="rise" start={3} each={20} gap={5}
            style={{ ...type(TYPE_H1, 820), letterSpacing: '-0.045em', color: L.ink }} />
        </div>
      </div>
      <div style={{ position: 'absolute', right: 1920 - PLOT_R, top: 86, width: 520, opacity: ramp(frame, 10, 16, EASE.out) }}>
        <div style={{ ...type(34, 500), color: L.ink2, lineHeight: 1.3 }}>
          Total rainfall, 1–31 October.<br />One station per city.
        </div>
        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 22, height: 22, background: L.accent, borderRadius: 3, transform: `scale(${(1 + 0.25 * Math.sin(recordOn * Math.PI)).toFixed(3)})` }} />
            <span style={{ ...type(32, recordOn > 0.5 ? 720 : 500), color: interpolateColors(recordOn, [0, 1], [L.ink2, L.ink]) }}>Wettest October on record</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 22, height: 22, background: L.ink, borderRadius: 3 }} />
            <span style={{ ...type(32, 500), color: L.ink2 }}>Within normal range</span>
          </div>
        </div>
      </div>

      {/* ── 刻度与网格：100 / 200 / 300 mm 虚线 ── */}
      {[100, 200, 300].map((v) => {
        const y = BASE_Y - v * PX_PER_MM;
        return (
          <React.Fragment key={v}>
            <div style={{
              position: 'absolute', left: AXIS_X + 90, top: y, width: (PLOT_R - AXIS_X - 90) * gridK, height: 0,
              borderTop: `2px dashed ${alpha(L.ink, 0.12)}`,
            }} />
            <div style={{ position: 'absolute', left: AXIS_X, top: y - 16, width: 76, textAlign: 'right', ...type(26, 500, { mono: true }), color: L.ink3, opacity: gridK }}>
              {v}
            </div>
          </React.Fragment>
        );
      })}
      <div style={{ position: 'absolute', left: AXIS_X, top: BASE_Y - TUBE_MM * PX_PER_MM - 44, width: 76, textAlign: 'right', ...type(24, 600, { mono: true }), color: L.ink3, opacity: gridK }}>mm</div>
      {/* 基线 */}
      <div style={{ position: 'absolute', left: AXIS_X + 90, top: BASE_Y, width: (PLOT_R - AXIS_X - 90) * gridK, height: 3, background: L.ink }} />

      {/* ── 量雨筒（细墨线，自下而上描出）+ 筒壁内刻度 ── */}
      {CITIES.map((c) => {
        const draw = ramp(frame, 4 + c.b * 4, 20, EASE.snappy);
        const w = BAR_W + TUBE_PAD * 2;
        const hTube = BASE_Y - TUBE_TOP;
        return (
          <div key={c.name} style={{ position: 'absolute', left: c.cx - w / 2, top: BASE_Y - hTube * draw, width: w, height: hTube * draw }}>
            <div style={{
              position: 'absolute', inset: 0, borderLeft: `2px solid ${alpha(L.ink, 0.55)}`, borderRight: `2px solid ${alpha(L.ink, 0.55)}`,
              borderBottom: `2px solid ${alpha(L.ink, 0.55)}`, borderRadius: '0 0 12px 12px',
              background: `linear-gradient(90deg, ${alpha('#ffffff', 0.5)} 0%, ${alpha('#ffffff', 0.12)} 30%, ${alpha('#ffffff', 0)} 60%, ${alpha(L.ink, 0.03)} 100%)`,
            }} />
            {/* 筒口外翻的唇 */}
            <div style={{ position: 'absolute', left: -8, right: -8, top: 0, height: 2, background: alpha(L.ink, 0.55), opacity: draw > 0.98 ? 1 : 0 }} />
            {/* 内壁刻度：每 20mm 一格，纹理级 */}
            {Array.from({ length: Math.floor(TUBE_MM / 20) }).map((_, k) => {
              const y = hTube - (k + 1) * 20 * PX_PER_MM;
              if (y < 0) return null;
              return <div key={k} style={{ position: 'absolute', left: 2, top: y, width: (k + 1) % 5 === 0 ? 18 : 9, height: 1.5, background: alpha(L.ink, 0.25) }} />;
            })}
          </div>
        );
      })}

      {/* ── 雨粒层（筒口上方渐隐出现） ── */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: BASE_Y, overflow: 'hidden', WebkitMaskImage: RAIN_MASK, maskImage: RAIN_MASK }}>
        {CITIES.map((c) => {
          const full = FULL_AT[c.b];
          const solidOp = ramp(frame, full + 11, 8, EASE.out);
          if (solidOp >= 1) return null; // 交接完成 → 粒子整体卸载
          const fuse = ramp(frame, full + 2, 9, EASE.smooth); // 凝结：间隙 2→0、圆角收平
          const gap = mix(2, 0, fuse);
          const left0 = c.cx - BAR_W / 2;
          const nodes: React.ReactNode[] = [];
          for (let i = 0; i < c.n; i++) {
            const age = frame - departOf(c.b, i);
            if (age <= 0) continue;
            const layer = Math.floor(i / PER_LAYER);
            const col = ORDERS[c.b][layer][i % PER_LAYER];
            const targetTop = BASE_Y - (layer + 1) * GRAIN;
            const startTop = startTopOf(c.b, i);
            const tLand = fallTime(targetTop - startTop);
            let top: number;
            let stretch = 1;
            if (age < tLand) {
              top = startTop + 0.5 * GRAV * age * age;
              stretch = 1 + Math.min(1.3, (GRAV * age) / 30); // 坠落速度 → 纵向拉长（雨滴）
            } else {
              const ba = age - tLand;
              top = targetTop - (ba < 6 ? Math.sin((ba / 6) * Math.PI) * GRAIN * 0.15 * (1 + rnd(i, c.b * 13 + 9)) : 0);
            }
            nodes.push(
              <div key={i} style={{
                position: 'absolute', left: left0 + col * GRAIN + gap / 2, top: top + gap / 2,
                width: GRAIN - gap, height: GRAIN - gap, background: grainTone(c.hero, c.b, i),
                borderRadius: mix(3.5, 0, fuse), transformOrigin: '50% 100%',
                transform: stretch > 1.001 ? `scaleY(${stretch.toFixed(3)})` : undefined,
                opacity: age < tLand ? 0.9 : 1,
              }} />,
            );
          }
          return <React.Fragment key={c.name}>{nodes}</React.Fragment>;
        })}
      </div>

      {/* ── 实体柱 + 数值 ── */}
      {CITIES.map((c) => {
        const full = FULL_AT[c.b];
        const solidOp = ramp(frame, full + 11, 8, EASE.out);
        const pop = frame < full + 12 ? 0 : springAt(frame, full + 12, { damping: 14, stiffness: 230 });
        const top = BASE_Y - c.h;
        const lead = ramp(frame, full + 16, 10, EASE.snappy); // 读数引线：从读数向下画到液面
        return (
          <React.Fragment key={c.name}>
            {solidOp > 0 && (
              <div style={{
                position: 'absolute', left: c.cx - BAR_W / 2, top, width: BAR_W, height: c.h, opacity: solidOp,
                background: c.hero
                  ? `linear-gradient(90deg, #d93a24 0%, ${L.accent} 40%, #c9301c 100%)`
                  : `linear-gradient(90deg, #221d18 0%, ${L.ink} 45%, #0c0a08 100%)`,
              }}>
                <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 3, background: alpha('#ffffff', c.hero ? 0.35 : 0.16) }} />
              </div>
            )}
            <div style={{
              // 数值统一落在筒口上方一行（瑞士网格：读数对齐成表头，不被筒壁切）
              position: 'absolute', left: c.cx - 160, width: 320, top: TUBE_TOP - 112, textAlign: 'center',
              opacity: Math.min(1, pop * 1.6), transform: `translateY(${((1 - pop) * 26).toFixed(1)}px) scale(${(0.7 + 0.3 * pop).toFixed(3)})`, transformOrigin: '50% 100%',
            }}>
              <span style={{ ...type(84, 820), letterSpacing: '-0.04em', color: c.hero ? L.accent : L.ink }}>{c.mm}</span>
              <span style={{ ...type(30, 600, { mono: true }), color: L.ink3, marginLeft: 8 }}>mm</span>
            </div>
            {lead > 0 && (
              <div style={{
                position: 'absolute', left: c.cx - 1, top: TUBE_TOP - 8, width: 0, height: Math.max(0, top - (TUBE_TOP - 8) - 6) * lead,
                borderLeft: `2px dotted ${alpha(c.hero ? L.accent : L.ink, 0.45)}`,
              }} />
            )}
            {/* 城市名 */}
            <div style={{ position: 'absolute', left: c.cx - 160, width: 320, top: BASE_Y + 26, textAlign: 'center', opacity: ramp(frame, 8 + c.b * 4, 14, EASE.out) }}>
              <span style={{ ...type(42, 700), color: L.ink }}>{c.name}</span>
              <span style={{ ...type(24, 600, { mono: true }), color: L.ink3, marginLeft: 12 }}>{c.code}</span>
            </div>
          </React.Fragment>
        );
      })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

