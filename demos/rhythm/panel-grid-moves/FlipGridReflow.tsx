// flip-grid-reflow —— 网格集体重排：一个节拍点，6 张卡从横排一齐换位成 3×2 网格。
//
// 第二轮重设计（暖沙 · 字体铸造厂的样张库）：
// - look = sand（米色 · 赤陶）。主体换成虚构字体厂「Fount」的样张库：6 张卡 = 6 个字族，每张卡一个巨大的
//   「Ag」——Didot 的发丝衬线、Futura 的几何圆、Rockwell 的板衬、窄体黑、等宽、斜体——卡与卡之间
//   靠字形本身形成节奏，不再是灰色骨架条。赤陶色只给主推字族「Vellum Display」一张卡。
// - 重排有界面上的"因"：光标滑到右上角 Row / Grid 切换器，按下（2f 压缩）→ 滑块滑到 Grid →
//   卡片同拍起飞。不是等比放大：卡片从竖版 262×380 形变成横版 520×300，卡内版式同步重排
//   （字形从顶部居中移到左侧，名称沉到底部），落定后右侧才长出一句样张文字——网格视图"看到更多"。
// - 运动：起飞前 4f 集体下沉预备（被按下的感觉）→ 22f 不对称 in-out 飞行（上排走上弧、下排走下弧，
//   互不对穿；按速度方向性运动模糊；两层软阴影随飞行抬高变大变虚）→ 弹簧落座（damping 15，一次可见回弹）。
//   错峰 2f/张，从左往右像一排多米诺被推倒。飞行期画面浮出 12 栏版式参考线，落定后退去。
//
// 时间表（30fps，共 150f）：
//   0–18    头部与 6 张竖卡错峰升起（每张 2f，16f snappy）——第 1 帧就有页头
//   12–30   光标从右下滑向 Grid 按钮（swift），30f 按下
//   30–38   切换器滑块滑到 Grid（snappy）
//   32–36   卡片集体下沉 10px 预备
//   36–68   6 张卡错峰起飞（36 + 2i，各 22f）→ 弹簧落座
//   62–84   样张句逐张 blur 入（落座后一拍）
//   84–150  hold：整页 1.5% 极缓推近，干净落定
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, SpeedBlur, mix, ramp, softShadow, velocity } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, springAt, type } from '../../_fixtures/Look';

export const FLIP_GRID_REFLOW_DURATION = 150;

const L = LOOKS.sand;
const N = 6;

// ───────────── 时间 ─────────────
const CLICK = 30; // 按下 Grid
const DIP = 32; // 集体下沉预备
const LIFT = 36; // 第一张起飞
const STAG = 2; // 每张错峰
const FLY = 22; // 飞行帧数
const SAMPLE = 62; // 样张句开始浮现

// ───────────── 两套坐标表（卡中心 + 尺寸）─────────────
const ROW = { w: 262, h: 380, y: 640, x0: 119, gap: 22 };
const rowCenter = (i: number): [number, number] => [ROW.x0 + ROW.w / 2 + i * (ROW.w + ROW.gap), ROW.y];
const GRID = { w: 520, h: 300, cols: [408, 960, 1512], rows: [486, 818] };
// 交错映射：偶数去上排、奇数去下排（相邻两张卡同列，轨迹互不对穿）
const gridCenter = (i: number): [number, number] => [GRID.cols[Math.floor(i / 2)], GRID.rows[i % 2]];

// ───────────── 内容：6 个字族（系统字体渲染，名称是虚构的 Fount 字族）─────────────
type Fam = { name: string; meta: string; font: string; weight: number; italic?: boolean; sample: string; glyph?: string };
const FAMS: Fam[] = [
  { name: 'Orbit Sans', meta: '8 styles', font: 'Futura, "Avenir Next", sans-serif', weight: 500, sample: 'Round, even, quietly modern.' },
  { name: 'Marrow Slab', meta: '6 styles', font: 'Rockwell, "Roboto Slab", Georgia, serif', weight: 700, sample: 'Built like a workbench.' },
  { name: 'Vellum Display', meta: 'Variable', font: 'Didot, "Bodoni 72", "Playfair Display", serif', weight: 400, sample: 'Hairlines for headlines.' },
  { name: 'Tallis Condensed', meta: '9 styles', font: '"Avenir Next Condensed", "Arial Narrow", sans-serif', weight: 800, sample: 'More words per line.' },
  { name: 'Ledger Mono', meta: '4 styles', font: 'Menlo, "SF Mono", monospace', weight: 500, sample: 'Every glyph, one width.' },
  { name: 'Elm Italic', meta: '5 styles', font: 'Baskerville, "Libre Baskerville", Georgia, serif', weight: 400, italic: true, sample: 'A slower, warmer voice.' },
];
const HERO = 2; // 主推字族：赤陶底

// 卡片飞行进度（0→1，不对称 in-out：起步利落、落点很软）+ 落座弹簧
const flyAt = (i: number, f: number) => ramp(f, LIFT + i * STAG, FLY, EASE.swift);
const posAt = (i: number, f: number): [number, number] => {
  const t = flyAt(i, f);
  const [x0, y0] = rowCenter(i);
  const [x1, y1] = gridCenter(i);
  const arc = (i % 2 === 0 ? -1 : 1) * 70 * Math.sin(Math.PI * t); // 上排走上弧、下排走下弧
  const dip = 10 * ramp(f, DIP, 4, EASE.out) * (1 - ramp(f, LIFT + i * STAG, 6, EASE.out));
  return [mix(x0, x1, t), mix(y0, y1, t) + arc + dip];
};

// 切换器几何（右上角）
const TOG = { right: 96, top: 104, segW: 150, h: 64 };
const GRID_BTN: [number, number] = [1920 - TOG.right - 6 - TOG.segW / 2, TOG.top + 6 + TOG.h / 2];

const Glyph: React.FC<{ fam: Fam; size: number; color: string }> = ({ fam, size, color }) => (
  <span style={{
    fontFamily: fam.font, fontWeight: fam.weight, fontStyle: fam.italic ? 'italic' : 'normal', fontSize: size,
    lineHeight: 1, color, letterSpacing: fam.font.startsWith('Menlo') ? '-0.06em' : '-0.02em', whiteSpace: 'nowrap',
  }}>Ag</span>
);

const FontCard: React.FC<{ i: number; f: number }> = ({ i, f }) => {
  const fam = FAMS[i];
  const hero = i === HERO;
  const t = flyAt(i, f);
  // 落座弹簧：只在飞完后给尺寸一次轻微过冲（位置先到、尺寸晚一点收敛）
  const settle = f < LIFT + i * STAG + FLY ? 0 : 1 - springAt(f, LIFT + i * STAG + FLY - 2, { damping: 15, stiffness: 210 });
  const k = t; // 版式形变进度
  const w = mix(ROW.w, GRID.w, k) * (1 + 0.025 * settle);
  const h = mix(ROW.h, GRID.h, k) * (1 + 0.025 * settle);
  const [cx, cy] = posAt(i, f);
  const vx = velocity((g) => posAt(i, g)[0], f);
  const vy = velocity((g) => posAt(i, g)[1], f);
  const elev = 6 + 34 * Math.sin(Math.PI * t);
  // 入场：0–18f 错峰升起
  const enter = ramp(f, 2 + i * 2, 16, EASE.snappy);
  const ink = hero ? L.onAccent : L.ink;
  const ink2 = hero ? alpha(L.onAccent, 0.72) : L.ink2;
  const glyphSize = mix(150, 138, k);
  const sampleP = ramp(f, SAMPLE + i * 3, 14, EASE.out);
  return (
    <SpeedBlur vx={vx} vy={vy} amount={0.2} max={14} style={{ zIndex: t > 0 && t < 1 ? 10 + i : i }}>
      <div style={{
        position: 'absolute', left: cx - w / 2, top: cy - h / 2 + (1 - enter) * 60, width: w, height: h, opacity: enter,
        borderRadius: 22, overflow: 'hidden',
        background: hero ? `linear-gradient(160deg, #d2643a 0%, ${L.accent} 55%, #ad4524 100%)` : `linear-gradient(170deg, #fdf9f3 0%, ${L.surface} 60%, #f4ece1 100%)`,
        border: `1px solid ${hero ? 'rgba(120,40,10,0.35)' : L.line}`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,${hero ? 0.3 : 0.9}), ${softShadow(elev, { color: L.shadow, strength: 1.3 })}`,
      }}>
        {/* 字形：竖版居中靠上 → 横版靠左 */}
        <div style={{
          position: 'absolute', top: mix(54, 30, k), left: mix(w / 2, 40, k),
          transform: `translateX(${mix(-50, 0, k)}%)`,
        }}>
          <Glyph fam={fam} size={glyphSize} color={ink} />
        </div>
        {/* 样张句：只在网格视图里出现（右侧栏）*/}
        {sampleP > 0 && (
          <div style={{
            position: 'absolute', left: 282, top: 46, width: 206, color: ink, opacity: sampleP,
            fontFamily: fam.font, fontWeight: Math.min(fam.weight, 600), fontStyle: fam.italic ? 'italic' : 'normal',
            fontSize: 32, lineHeight: 1.18, letterSpacing: '-0.01em', transform: `translateY(${(1 - sampleP) * 10}px)`,
            filter: sampleP < 1 ? `blur(${((1 - sampleP) * 6).toFixed(2)}px)` : undefined,
          }}>{fam.sample}</div>
        )}
        {/* 名称 + 规格：沉在卡底 */}
        <div style={{ position: 'absolute', left: mix(22, 40, k), right: mix(22, 40, k), bottom: mix(26, 28, k) }}>
          <div style={{ height: 1, background: hero ? 'rgba(255,240,230,0.35)' : L.line, marginBottom: 16 }} />
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ ...type(34, 700), color: ink, whiteSpace: 'nowrap', fontSize: mix(28, 34, k) }}>{fam.name}</div>
            <div style={{ ...type(26, 500), color: ink2, whiteSpace: 'nowrap', opacity: k }}>{fam.meta}</div>
          </div>
        </div>
      </div>
    </SpeedBlur>
  );
};

const ViewToggle: React.FC<{ f: number }> = ({ f }) => {
  const k = ramp(f, CLICK, 9, EASE.snappy);
  const press = Math.sin(Math.PI * Math.min(1, Math.max(0, (f - CLICK + 1) / 5)));
  const icon = (grid: boolean, on: boolean) => (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={on ? L.ink : L.ink3} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={grid ? 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' : 'M3 6h4v12H3zM10 6h4v12h-4zM17 6h4v12h-4z'} />
    </svg>
  );
  return (
    <div style={{
      position: 'absolute', right: TOG.right, top: TOG.top, display: 'flex', padding: 6, borderRadius: 18,
      background: alpha(L.ink, 0.06), boxShadow: `inset 0 0 0 1px ${L.line}`, transform: `scale(${1 - 0.03 * press})`,
    }}>
      <div style={{
        position: 'absolute', top: 6, left: 6 + TOG.segW * k, width: TOG.segW, height: TOG.h, borderRadius: 13,
        background: L.surface, boxShadow: `inset 0 1px 0 #fff, ${softShadow(3, { color: L.shadow })}`,
      }} />
      {['Row', 'Grid'].map((label, j) => {
        const on = j === 0 ? k < 0.5 : k >= 0.5;
        return (
          <div key={label} style={{
            position: 'relative', width: TOG.segW, height: TOG.h, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            ...type(32, on ? 650 : 500), color: on ? L.ink : L.ink3,
          }}>
            {icon(j === 1, on)}
            {label}
          </div>
        );
      })}
    </div>
  );
};

// macOS 风箭头光标：滑向 Grid 按钮，按下时缩一下
const Cursor: React.FC<{ f: number }> = ({ f }) => {
  const m = ramp(f, 12, 18, EASE.swift);
  const x = mix(1500, GRID_BTN[0] + 14, m);
  const y = mix(760, GRID_BTN[1] + 8, m) - 40 * Math.sin(Math.PI * m);
  const press = Math.sin(Math.PI * Math.min(1, Math.max(0, (f - CLICK + 1) / 5)));
  const op = ramp(f, 8, 6, EASE.out) * (1 - ramp(f, 50, 10, EASE.exit));
  if (op <= 0) return null;
  return (
    <svg width={44} height={56} viewBox="0 0 22 28" style={{
      position: 'absolute', left: x, top: y, opacity: op, transform: `scale(${1 - 0.14 * press})`, transformOrigin: '0 0',
      filter: `drop-shadow(0 4px 8px ${alpha(L.shadow, 0.35)})`, zIndex: 40,
    }}>
      <path d="M2 2 L2 22 L7.2 17.4 L10.6 25.4 L14 24 L10.7 16.2 L17.6 16.2 Z" fill={L.ink} stroke="#fff" strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  );
};

// 12 栏版式参考线：飞行期浮出，落定后退去（重排"对齐到网格"的视觉注脚）
const Guides: React.FC<{ f: number }> = ({ f }) => {
  const o = ramp(f, LIFT - 2, 10, EASE.out) * (1 - ramp(f, 66, 16, EASE.smooth));
  if (o <= 0.01) return null;
  const cols = Array.from({ length: 12 }, (_, c) => 148 + c * (1624 + 32) / 12);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o * 0.9, pointerEvents: 'none' }}>
      {cols.map((x, c) => (
        <div key={c} style={{ position: 'absolute', left: x, top: 300, width: (1624 + 32) / 12 - 32, height: 680, background: alpha(L.accent, 0.05), borderLeft: `1px solid ${alpha(L.accent, 0.18)}`, borderRight: `1px solid ${alpha(L.accent, 0.18)}` }} />
      ))}
    </div>
  );
};

export const FlipGridReflow: React.FC = () => {
  const f = useCurrentFrame();
  const head = ramp(f, 0, 16, EASE.snappy);
  const push = 1 + 0.015 * ramp(f, 70, 80, EASE.smooth);
  const countP = ramp(f, LIFT + 10, 16, EASE.out);
  return (
    <AbsoluteFill style={{ fontFamily: FONT.sans, overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.3, y: 0.05 }} fill={{ x: 0.9, y: 0.95 }} />
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: '50% 55%' }}>
        <Guides f={f} />
        {/* 页头 */}
        <div style={{ position: 'absolute', left: 148, top: 84, opacity: head, transform: `translateY(${(1 - head) * 24}px)` }}>
          <div style={{ ...type(22, 750, { caps: true }), letterSpacing: '0.24em', color: L.accent }}>Fount · Type Library</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 28, marginTop: 14 }}>
            <div style={{ ...type(96, 800), color: L.ink }}>Specimens</div>
            <div style={{ ...type(36, 500), color: L.ink2, whiteSpace: 'nowrap' }}>
              6 families
              <span style={{ display: 'inline-block', opacity: countP, transform: `translateX(${(1 - countP) * -14}px)`, filter: countP < 1 ? `blur(${((1 - countP) * 6).toFixed(2)}px)` : undefined }}>&nbsp;· 38 styles</span>
            </div>
          </div>
        </div>
        <div style={{ opacity: head }}><ViewToggle f={f} /></div>
        {FAMS.map((_, i) => <FontCard key={i} i={i} f={f} />)}
      </div>
      <Cursor f={f} />
    </AbsoluteFill>
  );
};
