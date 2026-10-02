// portal-wipe 穿窗入景（纵深款）——网格里一张卡放大成全屏窗口，窗内是被点开那张卡的"世界"，
// 只 2 层视差（远景面板 0.08 + 近景 2 枚浮卡 0.3，不加 blur），穿窗完成后 8f 缓停 → 静止读清新景。
//
// 第二轮重设计（瓷白工作台 → 钴蓝预测世界）：
// - look = porcelain（冷白 · 钴蓝）。不再用通用灰阶 FakeDashboard：外景是为镜头设计的 video-shotcraft
//   「Workspace」主页（眉题前挂字标）——96px 问候标题 + 3×2 张「影片项目」卡，每张卡有自己的程序化封面
//   （同心圆 / 柱 / 点阵 / 斜纹 / 弧 / 波形）、40px 标题与 32px 元信息。目标卡 = 第 2 行居中的
//   「Premiere Forecast」（发布片的观看量预测，钴蓝封面 + 三道波形）。
// - 语义闭环：目标卡的**封面就是窗内世界的样子**——窗内是深钴蓝空间，三道同款波形放大成背景地貌；
//   远景层 = 一块玻璃预测面板（64px 标题 + 面积图：实线历史 + 虚线预测区间 + TODAY 标线），
//   近景层 = 两枚浮卡（+18.4% vs last launch / 94% confidence 环），落点压住面板两角，做出前后景。
// - 运动：目标卡先悬浮抬起作预备（−10px、1.03×、阴影变大变虚），邻卡同时退暗；窗放大 40f 用
//   bezier(0.7,0,0.3,1) 先慢后快再缓收；窗内整景 0.42→1 与窗几何同一个 t；面积图的线随 t 画出、
//   与穿窗同时完成；视差散开 Easing.out(cubic) 在穿窗完成后 8f 内速度归零，之后画面真静止。
//
// 时间表（30fps，共 140f）：
//   0–14    hold：Workspace 主页建立（第 0 帧即完整画面）
//   14–26   预备：目标卡抬起、邻卡退暗 18%
//   26–66   窗放大 40f：卡变全屏窗，卡面 0–28% 行程内渐隐露出窗内世界（再慢会被拉成巨字残影）
//   42–74   近/远两层视差散开（66f 穿窗完成后 8f 缓停）
//   74–140  静止 hold 66f：新世界完整可读
import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { EASE, FONT, ramp, mix, softShadow } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, type } from '../../_fixtures/Look';
import { ShotcraftWordmark } from '../../_fixtures/Brand';

export const PORTAL_WIPE_V2_DURATION = 140;

const L = LOOKS.porcelain;
const COBALT = { deep: '#040a26', mid: '#0b1a5c', hi: '#2f5bff', glow: '#7d9bff', mint: '#3fe0c5' };

// ───────── 外景：Workspace 网格 ─────────
const TILE = { w: 520, h: 300, gap: 32, cover: 176 };
const GRID_X = (1920 - (3 * TILE.w + 2 * TILE.gap)) / 2;
const GRID_Y = 330;
type Space = { name: string; meta: string; art: 'rings' | 'bars' | 'dots' | 'stripes' | 'waves' | 'arcs'; c: [string, string] };
const SPACES: Space[] = [
  { name: 'Launch Film', meta: 'Promo · 12 shots', art: 'rings', c: ['#ff9a6b', '#ff5f6d'] },
  { name: 'Changelog Reel', meta: 'Release · 8 shots', art: 'bars', c: ['#4fd1a5', '#1f9e89'] },
  { name: 'Onboarding Tour', meta: 'Explainer · 21 shots', art: 'dots', c: ['#b9a2ff', '#7a5cff'] },
  { name: 'Ink Press Teaser', meta: 'Template · 5 shots', art: 'stripes', c: ['#f2c879', '#d99a3e'] },
  { name: 'Premiere Forecast', meta: 'Analytics · 9 films', art: 'waves', c: ['#3d6bff', '#0f2a9e'] },
  { name: 'Render Queue', meta: 'Renders · 14 jobs', art: 'arcs', c: ['#5cc8e8', '#2a7fb8'] },
];
const TARGET = 4;
const slotOf = (i: number) => ({ x: GRID_X + (i % 3) * (TILE.w + TILE.gap), y: GRID_Y + Math.floor(i / 3) * (TILE.h + TILE.gap) });

// 三道波形（封面与窗内世界共用同一组曲线 = 语义闭环）
const wavePath = (w: number, h: number, k: number, phase: number) => {
  const pts: string[] = [];
  for (let i = 0; i <= 48; i++) {
    const x = (i / 48) * w;
    const y = h * (0.62 - 0.1 * k) + Math.sin(i / 48 * Math.PI * 2.2 + phase + k * 0.9) * h * 0.11 - (i / 48) * h * 0.16;
    pts.push(`${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return pts.join(' ');
};

const Cover: React.FC<{ s: Space; w: number; h: number }> = ({ s, w, h }) => {
  const stroke = 'rgba(255,255,255,0.55)';
  let art: React.ReactNode = null;
  if (s.art === 'rings') art = [0, 1, 2, 3, 4].map((k) => <circle key={k} cx={w * 0.78} cy={h * 0.62} r={30 + k * 34} fill="none" stroke={stroke} strokeWidth={2} opacity={1 - k * 0.16} />);
  if (s.art === 'bars') art = Array.from({ length: 9 }, (_, k) => { const bh = h * (0.25 + 0.5 * Math.abs(Math.sin(k * 1.3 + 0.6))); return <rect key={k} x={w * 0.42 + k * 30} y={h - bh} width={16} height={bh} rx={4} fill="rgba(255,255,255,0.42)" />; });
  if (s.art === 'dots') art = Array.from({ length: 40 }, (_, k) => <circle key={k} cx={w * 0.46 + (k % 10) * 26} cy={h * 0.2 + Math.floor(k / 10) * 32} r={4 + ((k * 7) % 5)} fill="rgba(255,255,255,0.45)" />);
  if (s.art === 'stripes') art = Array.from({ length: 12 }, (_, k) => <line key={k} x1={w * 0.3 + k * 34} y1={h + 10} x2={w * 0.3 + k * 34 + 120} y2={-10} stroke={stroke} strokeWidth={10} opacity={0.5} />);
  if (s.art === 'arcs') art = [0, 1, 2, 3].map((k) => <path key={k} d={`M ${w * 0.35} ${h + 4} A ${90 + k * 46} ${90 + k * 46} 0 0 1 ${w * 0.35 + 2 * (90 + k * 46)} ${h + 4}`} fill="none" stroke={stroke} strokeWidth={2.5} />);
  if (s.art === 'waves') art = [0, 1, 2].map((k) => <path key={k} d={wavePath(w, h, k, 0)} fill="none" stroke={k === 0 ? COBALT.mint : stroke} strokeWidth={k === 0 ? 4 : 2.5} />);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, background: `linear-gradient(135deg, ${s.c[0]} 0%, ${s.c[1]} 100%)`, overflow: 'hidden' }}>
      <svg width={w} height={h} style={{ position: 'absolute', inset: 0 }}>{art}</svg>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 40%)' }} />
    </div>
  );
};

const Tile: React.FC<{ s: Space }> = ({ s }) => (
  <div style={{ position: 'absolute', inset: 0, borderRadius: 22, overflow: 'hidden', background: L.surface, border: `1px solid ${L.line}` }}>
    <Cover s={s} w={TILE.w} h={TILE.cover} />
    <div style={{ position: 'absolute', left: 26, top: TILE.cover + 22, ...type(40, 650), color: L.ink, whiteSpace: 'nowrap' }}>{s.name}</div>
    <div style={{ position: 'absolute', left: 26, top: TILE.cover + 74, ...type(32, 450), color: L.ink3, whiteSpace: 'nowrap' }}>{s.meta}</div>
  </div>
);

// ───────── 窗内世界：钴蓝预测空间 ─────────
// 预测曲线：确定性序列（0–39 历史实线，39–59 预测虚线 + 区间带）
const SERIES = Array.from({ length: 60 }, (_, i) => 0.28 + i * 0.007 + 0.065 * Math.sin(i * 0.55) + 0.02 * Math.sin(i * 1.7 + 1));
const NOW = 39;
const CH = { x: 64, y: 196, w: 1112, h: 360 };
const px = (i: number) => CH.x + (i / 59) * CH.w;
const py = (v: number) => CH.y + CH.h * (1 - v);
const line = (a: number, b: number) => SERIES.slice(a, b + 1).map((v, k) => `${k ? 'L' : 'M'}${px(a + k).toFixed(1)} ${py(v).toFixed(1)}`).join(' ');
const BAND = (() => {
  const up = SERIES.slice(NOW).map((v, k) => `${k ? 'L' : 'M'}${px(NOW + k).toFixed(1)} ${py(v + 0.02 + k * 0.006).toFixed(1)}`).join(' ');
  const dn = SERIES.slice(NOW).map((v, k) => [px(NOW + k), py(v - 0.02 - k * 0.006)] as const).reverse().map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return `${up} ${dn} Z`;
})();
const AREA = `${line(0, NOW)} L${px(NOW).toFixed(1)} ${CH.y + CH.h} L${px(0).toFixed(1)} ${CH.y + CH.h} Z`;

const glass: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(160,185,255,0.13) 0%, rgba(120,150,255,0.05) 100%)',
  border: '1px solid rgba(190,210,255,0.18)',
  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.16), 0 50px 120px -30px rgba(0,2,20,0.8), 0 14px 36px rgba(0,2,20,0.45)`,
};

const ForecastPanel: React.FC<{ draw: number }> = ({ draw }) => (
  <div style={{ position: 'absolute', left: 340, top: 200, width: 1240, height: 660, borderRadius: 30, overflow: 'hidden', ...glass }}>
    <div style={{ position: 'absolute', left: 64, top: 52, ...type(28, 600, { mono: true }), color: COBALT.glow, letterSpacing: '0.16em' }}>PROJECT · ANALYTICS</div>
    <div style={{ position: 'absolute', left: 64, top: 96, ...type(64, 700), color: '#f2f5ff' }}>Premiere Forecast</div>
    <div style={{ position: 'absolute', right: 64, top: 112, display: 'flex', gap: 34, ...type(32, 500), color: '#a9b8e8' }}>
      <span><span style={{ display: 'inline-block', width: 28, height: 4, borderRadius: 2, background: COBALT.mint, verticalAlign: 'middle', marginRight: 12 }} />Views</span>
      <span><span style={{ display: 'inline-block', width: 28, height: 4, borderRadius: 2, borderTop: `3px dashed ${COBALT.glow}`, verticalAlign: 'middle', marginRight: 12 }} />Next 90 days</span>
    </div>
    <svg width={1240} height={660} style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <linearGradient id="pw-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={COBALT.mint} stopOpacity={0.32} />
          <stop offset="1" stopColor={COBALT.mint} stopOpacity={0} />
        </linearGradient>
        <clipPath id="pw-draw"><rect x={0} y={0} width={CH.x + CH.w * draw + 4} height={660} /></clipPath>
      </defs>
      {[0, 1, 2, 3].map((k) => <line key={k} x1={CH.x} x2={CH.x + CH.w} y1={CH.y + (CH.h / 3) * k} y2={CH.y + (CH.h / 3) * k} stroke="rgba(190,210,255,0.1)" strokeWidth={1.5} />)}
      <g clipPath="url(#pw-draw)">
        <path d={AREA} fill="url(#pw-area)" />
        <path d={BAND} fill={alpha(COBALT.glow, 0.16)} />
        <path d={line(0, NOW)} fill="none" stroke={COBALT.mint} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
        <path d={line(NOW, 59)} fill="none" stroke={COBALT.glow} strokeWidth={4} strokeDasharray="12 10" strokeLinecap="round" />
      </g>
      {draw > 0.66 && (
        <g opacity={Math.min(1, (draw - 0.66) * 6)}>
          <line x1={px(NOW)} x2={px(NOW)} y1={CH.y - 16} y2={CH.y + CH.h} stroke="rgba(230,238,255,0.45)" strokeWidth={1.5} strokeDasharray="4 6" />
          <circle cx={px(NOW)} cy={py(SERIES[NOW])} r={10} fill={COBALT.deep} stroke={COBALT.mint} strokeWidth={4} />
          <text x={px(NOW) + 16} y={CH.y - 2} fontFamily={FONT.mono} fontSize={24} fill="#a9b8e8" letterSpacing="0.12em">TODAY</text>
        </g>
      )}
    </svg>
    <div style={{ position: 'absolute', left: 64, bottom: 46, right: 64, display: 'flex', justifyContent: 'space-between', ...type(28, 500, { mono: true }), color: '#6f7fae' }}>
      <span /><span>MAY</span><span>JUN</span><span>JUL</span><span>AUG</span><span>SEP</span>
    </div>
  </div>
);

// 近景两枚浮卡的**终点**（散开 ×1.3 之后），按 960/540 中心反推散开前的位置
const NEAR_K = 1.3;
const nearPos = (x: number, y: number) => ({ x: 960 + (x - 960) / NEAR_K, y: 540 + (y - 540) / NEAR_K });
const CHIP_A = nearPos(1380, 64); // 右上：压住面板右上角
const CHIP_B = nearPos(104, 790); // 左下：压住面板左下角

const World: React.FC<{ spread: number; draw: number }> = ({ spread, draw }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 70% at 50% 30%, ${COBALT.mid} 0%, #071244 50%, ${COBALT.deep} 100%)` }}>
    {/* 背景地貌：封面同款三道波形放大成世界的地平线 */}
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
      {[0, 1, 2].map((k) => <path key={k} d={wavePath(1920, 1080, k, 0)} transform="translate(0 210)" fill="none" stroke={k === 0 ? COBALT.mint : COBALT.glow} strokeOpacity={k === 0 ? 0.35 : 0.22} strokeWidth={k === 0 ? 3 : 2} />)}
    </svg>
    <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 40% 34% at 50% 18%, ${alpha(COBALT.hi, 0.35)} 0%, ${alpha(COBALT.hi, 0)} 100%)` }} />
    {/* 远景层（系数 0.08） */}
    <div style={{ position: 'absolute', inset: 0, transform: `scale(${(1 + spread * 0.08).toFixed(4)})`, transformOrigin: '960px 540px' }}>
      <ForecastPanel draw={draw} />
    </div>
    {/* 近景层（系数 0.3）：两枚浮卡 */}
    <div style={{ position: 'absolute', inset: 0, transform: `scale(${(1 + spread * (NEAR_K - 1)).toFixed(4)})`, transformOrigin: '960px 540px' }}>
      <div style={{ position: 'absolute', left: CHIP_A.x, top: CHIP_A.y, width: 400 / NEAR_K, height: 200 / NEAR_K, borderRadius: 22 / NEAR_K, ...glass, background: 'linear-gradient(180deg, rgba(30,55,160,0.92), rgba(14,30,110,0.92))' }}>
        <div style={{ position: 'absolute', left: 30 / NEAR_K, top: 26 / NEAR_K, ...type(84 / NEAR_K, 750), color: COBALT.mint }}>+18.4%</div>
        <div style={{ position: 'absolute', left: 32 / NEAR_K, top: 128 / NEAR_K, ...type(32 / NEAR_K, 500), color: '#c3cff5' }}>vs last launch</div>
      </div>
      <div style={{ position: 'absolute', left: CHIP_B.x, top: CHIP_B.y, width: 420 / NEAR_K, height: 180 / NEAR_K, borderRadius: 22 / NEAR_K, ...glass, background: 'linear-gradient(180deg, rgba(30,55,160,0.92), rgba(14,30,110,0.92))' }}>
        <svg width={120 / NEAR_K} height={120 / NEAR_K} viewBox="0 0 120 120" style={{ position: 'absolute', left: 28 / NEAR_K, top: 30 / NEAR_K }}>
          <circle cx={60} cy={60} r={48} fill="none" stroke="rgba(190,210,255,0.16)" strokeWidth={12} />
          <circle cx={60} cy={60} r={48} fill="none" stroke={COBALT.glow} strokeWidth={12} strokeLinecap="round" strokeDasharray={`${(2 * Math.PI * 48 * 0.94).toFixed(1)} 400`} transform="rotate(-90 60 60)" />
        </svg>
        <div style={{ position: 'absolute', left: 172 / NEAR_K, top: 34 / NEAR_K, ...type(64 / NEAR_K, 750), color: '#f2f5ff' }}>94%</div>
        <div style={{ position: 'absolute', left: 174 / NEAR_K, top: 108 / NEAR_K, ...type(32 / NEAR_K, 500), color: '#c3cff5' }}>confidence</div>
      </div>
    </div>
  </AbsoluteFill>
);

export const PortalWipeV2: React.FC = () => {
  const frame = useCurrentFrame();

  // 预备：目标卡悬浮抬起、邻卡退暗
  const hover = ramp(frame, 14, 12, EASE.snappy);
  const slot = slotOf(TARGET);
  const s0 = 1 + 0.03 * hover;
  const c0 = { x: slot.x - (TILE.w * (s0 - 1)) / 2, y: slot.y - 10 * hover - (TILE.h * (s0 - 1)) / 2, w: TILE.w * s0, h: TILE.h * s0, r: 22 };

  // 窗放大：40f 先慢后快再缓收
  const t = interpolate(frame, [26, 66], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.7, 0, 0.3, 1) });
  const x = mix(c0.x, 0, t), y = mix(c0.y, 0, t), w = mix(c0.w, 1920, t), h = mix(c0.h, 1080, t), r = mix(c0.r, 0, t);
  // 视差散开：穿窗完成（66f）后 8f 内速度归零（74f）
  const spread = interpolate(frame, [42, 74], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const innerScale = mix(0.42, 1, t);
  const draw = ramp(frame, 34, 32, EASE.swift); // 曲线与穿窗同时画完
  const elev = (4 + 18 * hover) * (1 - t) + 56 * Math.sin(Math.PI * Math.min(1, t * 1.1)) * (1 - t);
  const oldDim = 0.26 * ramp(frame, 26, 34, EASE.out);
  const neighbours = 1 - 0.18 * hover;

  return (
    <AbsoluteFill style={{ background: L.bg[1], overflow: 'hidden' }}>
      {/* 外景：Workspace 主页（穿窗完成后不再渲染） */}
      {t < 1 && (
        <>
          <Stage look={L} keyLight={{ x: 0.35, y: 0.0 }} fill={{ x: 0.9, y: 0.95 }} />
          <div style={{ position: 'absolute', left: GRID_X, top: 104, height: 52, display: 'flex', alignItems: 'center', gap: 24 }}>
            <ShotcraftWordmark size={30} tone="light" color={L.ink} markScale={1.7} gap={14} />
            <span style={{ width: 1.5, height: 30, background: L.line }} />
            <span style={{ ...type(30, 600, { mono: true }), color: L.accent, letterSpacing: '0.18em' }}>WORKSPACE</span>
          </div>
          <div style={{ position: 'absolute', left: GRID_X - 4, top: 168, ...type(96, 720), color: L.ink }}>Good morning, Mara.</div>
          <div style={{ position: 'absolute', right: GRID_X, top: 196, ...type(36, 500), color: L.ink2 }}>6 projects · 2 rendered today</div>
          {SPACES.map((s, i) => {
            if (i === TARGET) return null;
            const p = slotOf(i);
            return (
              <div key={s.name} style={{ position: 'absolute', left: p.x, top: p.y, width: TILE.w, height: TILE.h, opacity: neighbours, borderRadius: 22, boxShadow: softShadow(6, { color: L.shadow, strength: 0.9 }) }}>
                <Tile s={s} />
              </div>
            );
          })}
          {oldDim > 0.002 && <AbsoluteFill style={{ background: alpha(COBALT.deep, oldDim) }} />}
        </>
      )}

      {/* 窗（放大的卡）——内藏新世界 */}
      <div style={{
        position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r, overflow: 'hidden',
        boxShadow: t < 1 ? softShadow(elev, { color: L.shadow, strength: 1.6 }) : 'none',
      }}>
        {t > 0 && (
          <div style={{
            position: 'absolute', width: 1920, height: 1080, left: '50%', top: '50%',
            transform: `translate(-50%, -50%) scale(${innerScale.toFixed(4)})`, overflow: 'hidden',
          }}>
            <World spread={spread} draw={draw} />
          </div>
        )}
        {/* 卡正面：放大初期渐隐，露出窗内世界 */}
        {t < 0.3 && (
          <div style={{ position: 'absolute', inset: 0, opacity: Math.max(0, 1 - t * 3.6) }}>
            <div style={{ position: 'absolute', left: 0, top: 0, width: TILE.w, height: TILE.h, transform: `scale(${(w / TILE.w).toFixed(4)}, ${(h / TILE.h).toFixed(4)})`, transformOrigin: '0 0' }}>
              <Tile s={SPACES[TARGET]} />
            </div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
