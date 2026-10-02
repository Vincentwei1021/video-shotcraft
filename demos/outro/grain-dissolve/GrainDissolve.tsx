// grain-dissolve — 整行字砂化沸腾 → 凝聚成更大号发光短字标（上线宣告的能量聚合拍）
//
// 第二轮重设计（熔炉余烬 · 从代码到品牌）：
// - look = ember（暖黑 · 橙 · 金）。整行字是等宽代码体「{ Kova 3 — now live }」（76px），砂化后
//   凝聚成 300px 粗黑体字标「KOVA」——字体从"代码"换成"品牌"，就是"一句话归结为一个名字"。
// - 砂化 = 加热：滤镜链（feTurbulence 逐帧换种子 + feDisplacementMap + 紧/宽两层暖橙 bloom）按 1920×1080
//   原生分辨率栅格化，颗粒 2–3px；同时 180 颗余烬火星从字里被"热气"吹出、向上飘（热往上走），
//   快的火星按速度拉成短线（运动模糊）。
// - 斜纹选区框：琥珀色 45° 线阵 + 像素棋盘角柄 + 等宽小标「SELECT · 21 CHARS」，从中线横向弹开；
//   凝聚前**横向挤压收拢**撤场（挤压动作预告了"压缩"）。
// - 凝聚：火星 ease-in 加速吸回字标面（越来越快），整行字与字标在最沸腾时交叉换字；字标 1.08→1 被压实，
//   位移归零、bloom 冲高回落，只在这一下给一道横向光痕（Q4：主角一次）。落定后字标是白热→橙的竖向渐变，
//   留一圈余温辉光；副标逐词升起。
//
// 时间表（30fps，共 84f）：
//   0–10    干净的整行字（失稳前的常态），舞台光已在
//   10–22   砂化爆裂（snappy）；12–24 选区框横向弹开；火星被吹出
//   22–34   沸腾（颗粒永不静止）
//   32–40   选区框横向挤压收拢撤场（exit）
//   36–46   凝聚：火星 ease-in 吸回、交叉换字（38–46）
//   44–58   凝固：位移 / 模糊归零，bloom 46f 冲高后回落；46f 一道光痕
//   54–66   副标逐词升起
//   66–84   hold 18f：余温辉光呼吸 + 极缓推镜
import React, { useId } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, ramp, mix } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';

export const GRAIN_DISSOLVE_DURATION = 84;

const L = LOOKS.ember;
const CX = 960;
const CY = 520; // 字行 / 字标的视觉中线
const LINE = '{ Kova 3 — now live }';
const MARK = 'KOVA';
const BOX = { x: 452, y: 462, w: 1016, h: 116 }; // 选区框（包住整行字）

const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// 余烬火星：起点散在整行字带上，被热气吹散（上飘为主），凝聚时吸回字标字面（确定性种子）
const EMBERS = Array.from({ length: 180 }, (_, i) => {
  const r = (k: number) => hash(i * 13.7 + k * 101.3);
  return {
    hx: 480 + r(1) * 960,
    hy: 490 + r(2) * 60,
    dx: (r(3) - 0.5) * 360,
    dy: -40 - r(4) * 230 + (r(5) - 0.7) * 80, // 热往上走
    tx: 690 + r(6) * 540, // 字标字面 x
    ty: 420 + r(7) * 200, // 字标字面 y
    size: 1.4 + r(8) * r(8) * 4.2,
    hot: r(9), // 0 橙 → 1 白热
    lag: r(10) * 4, // 吸回错峰（帧）
    ph: r(11) * Math.PI * 2,
  };
});

// 火星位置（帧的纯函数，用来算速度拉线）
const emberPos = (e: (typeof EMBERS)[number], f: number) => {
  const blow = ramp(f, 10, 26, EASE.out); // 吹散
  const pull = ramp(f, 36 + e.lag, 10, EASE.exit); // 越来越快地吸回
  const sway = Math.sin(f / 5 + e.ph) * 6 * blow * (1 - pull);
  const sx = e.hx + e.dx * blow + sway;
  const sy = e.hy + e.dy * blow + Math.cos(f / 6 + e.ph) * 4 * blow;
  return { x: mix(sx, e.tx, pull), y: mix(sy, e.ty, pull), pull };
};

const Handle: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x - 9},${y - 9})`} fill={L.accent2}>
    <rect width={9} height={9} />
    <rect x={9} y={9} width={9} height={9} />
  </g>
);

const Corner: React.FC<{ x: number; y: number; sx: number; sy: number }> = ({ x, y, sx, sy }) => (
  <path d={`M${x + 44 * sx} ${y}H${x}V${y + 44 * sy}`} fill="none" stroke={alpha(L.ink, 0.22)} strokeWidth={2} />
);

export const GrainDissolve: React.FC = () => {
  const f = useCurrentFrame();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const fid = `gd${uid}`;
  const cid = `gd${uid}c`;
  const gid = `gd${uid}g`;
  const sid = `gd${uid}s`;

  const burst = ramp(f, 10, 12, EASE.snappy); // 干净字 → 砂化
  const cond = ramp(f, 38, 8, EASE.smooth); // 交叉换字
  const lock = ramp(f, 44, 14, EASE.snappy); // 位移衰减凝固
  const settle = ramp(f, 48, 16, EASE.out); // bloom 回落
  const glow = Math.max(0, burst * 0.35 + cond * 0.85 - settle * 0.55);
  const disp = 96 * burst * (1 - lock); // 高频噪声 + 大位移 = 像素被打散成砂粒（不是糊成雾）
  const boil = Math.floor(f * 1.5); // 每帧至少换一次噪声种子

  // 选区框：横向弹开（overshoot）→ 横向挤压收拢撤场
  const boxIn = ramp(f, 12, 12, EASE.overshoot);
  const boxOut = ramp(f, 32, 8, EASE.exit);
  const boxSX = Math.max(0, boxIn * (1 - boxOut * 0.92));
  const boxOp = Math.min(1, boxIn * 2) * (1 - ramp(f, 36, 4, EASE.linear));

  const markScale = 1 + 0.08 * (1 - lock);
  const streak = ramp(f, 44, 3, EASE.out) * (1 - ramp(f, 47, 14, EASE.out));
  const push = mix(1, 1.035, ramp(f, 0, 84, EASE.smooth));

  return (
    <AbsoluteFill style={{ background: L.bg[2] }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.5 }} fill={null} horizon={0.74} intensity={0.75 + glow * 0.35} breathe={0.4} />
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${push.toFixed(4)})`, transformOrigin: `${CX}px ${CY}px` }}>
        <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          <defs>
            <filter id={fid} x="-30%" y="-120%" width="160%" height="340%" colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency={0.95 + burst * 0.35} numOctaves={2} seed={boil} result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale={disp} xChannelSelector="R" yChannelSelector="G" result="d" />
              <feGaussianBlur in="d" stdDeviation={0.55 * burst * (1 - lock)} result="core" />
              {/* 两层 bloom：紧光（白热字边）+ 宽光（橙色空气散射），强度跟 glow 包络 */}
              <feGaussianBlur in="core" stdDeviation={4 + glow * 6} result="g1" />
              <feColorMatrix in="g1" type="matrix" result="g1c"
                values={`0 0 0 0 1  0 0 0 0 0.78  0 0 0 0 0.52  0 0 0 ${(0.2 + glow * 0.9).toFixed(3)} 0`} />
              <feGaussianBlur in="core" stdDeviation={18 + glow * 26} result="g2" />
              <feColorMatrix in="g2" type="matrix" result="g2c"
                values={`0 0 0 0 1  0 0 0 0 0.42  0 0 0 0 0.16  0 0 0 ${(0.15 + glow * 0.85).toFixed(3)} 0`} />
              <feMerge>
                <feMergeNode in="g2c" />
                <feMergeNode in="g1c" />
                <feMergeNode in="core" />
              </feMerge>
            </filter>
            <linearGradient id={gid} x1="0" x2="0" y1="380" y2="640" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#fffaf0" />
              <stop offset="0.55" stopColor="#ffd9a8" />
              <stop offset="1" stopColor="#ff9a4f" />
            </linearGradient>
            <linearGradient id={sid} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor={L.accent} stopOpacity="0" />
              <stop offset="0.5" stopColor="#fff1dc" stopOpacity="1" />
              <stop offset="1" stopColor={L.accent} stopOpacity="0" />
            </linearGradient>
            <clipPath id={cid}>
              <rect x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} />
            </clipPath>
          </defs>

          {/* 取景括角：全程常驻的 HUD 框，给画面一个"取景器"边界 */}
          <Corner x={300} y={300} sx={1} sy={1} />
          <Corner x={1620} y={300} sx={-1} sy={1} />
          <Corner x={300} y={760} sx={1} sy={-1} />
          <Corner x={1620} y={760} sx={-1} sy={-1} />

          {/* 斜纹选区框 */}
          {boxOp > 0.002 && boxSX > 0.002 && (
            <g opacity={boxOp} transform={`translate(${CX} 0) scale(${boxSX.toFixed(4)} 1) translate(${-CX} 0)`}>
              <rect x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} fill={alpha(L.accent, 0.06)} />
              <g clipPath={`url(#${cid})`}>
                {Array.from({ length: 40 }, (_, i) => BOX.x - BOX.h + i * 30).map((x) => (
                  <line key={x} x1={x} y1={BOX.y + BOX.h} x2={x + BOX.h} y2={BOX.y} stroke={alpha(L.accent, 0.22)} strokeWidth={2} />
                ))}
              </g>
              <rect x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} fill="none" stroke={alpha(L.accent2, 0.85)} strokeWidth={2} vectorEffect="non-scaling-stroke" />
              <Handle x={BOX.x} y={BOX.y} />
              <Handle x={BOX.x + BOX.w} y={BOX.y} />
              <Handle x={BOX.x} y={BOX.y + BOX.h} />
              <Handle x={BOX.x + BOX.w} y={BOX.y + BOX.h} />
            </g>
          )}

          {/* 横向光痕：凝聚冲高时只一次 */}
          {streak > 0.002 && (
            <g opacity={streak}>
              <ellipse cx={CX} cy={CY + 6} rx={820} ry={22} fill={`url(#${sid})`} opacity={0.18} />
              <ellipse cx={CX} cy={CY + 6} rx={760} ry={2.2} fill={`url(#${sid})`} opacity={0.9} />
            </g>
          )}

          {/* 余烬火星：吹散上飘 → 加速吸回；快的拉成短线（按速度的运动模糊） */}
          <g>
            {EMBERS.map((e, i) => {
              const p = emberPos(e, f);
              const q = emberPos(e, f - 1);
              const fade = 1 - ramp(f, 44, 8, EASE.out);
              const tw = 0.55 + 0.45 * Math.abs(Math.sin(f * 0.7 + e.ph));
              const a = Math.min(1, burst * 1.4) * fade * tw * (0.35 + e.hot * 0.65);
              if (a < 0.02) return null;
              const col = e.hot > 0.7 ? '#fff1dc' : e.hot > 0.35 ? L.accent2 : L.accent;
              const vx = p.x - q.x, vy = p.y - q.y;
              const sp = Math.hypot(vx, vy);
              const len = Math.min(60, sp * 0.9);
              const k = sp > 0.01 ? len / sp : 0;
              return (
                <line key={i} x1={p.x} y1={p.y} x2={p.x - vx * k} y2={p.y - vy * k + 0.01}
                  stroke={col} strokeWidth={e.size * (1 - 0.4 * p.pull)} strokeLinecap="round" opacity={a} />
              );
            })}
          </g>

          {/* 文字组：整行字（等宽代码体）与字标（粗黑体）同走滤镜链 */}
          <g filter={`url(#${fid})`}>
            {cond < 0.999 && (
              <text x={CX} y={CY + 26} textAnchor="middle" opacity={1 - cond}
                style={{ fill: L.ink, font: `500 76px ${FONT.mono}`, letterSpacing: '-1px' }}>
                {LINE}
              </text>
            )}
            {cond > 0.001 && (
              <text x={CX} y={CY + 104} textAnchor="middle" opacity={cond}
                transform={`translate(${CX} ${CY}) scale(${markScale.toFixed(4)}) translate(${-CX} ${-CY})`}
                style={{ fill: `url(#${gid})`, font: `850 300px ${FONT.sans}`, letterSpacing: '-6px' }}>
                {MARK}
              </text>
            )}
          </g>
        </svg>

        {/* 选区小标：随框出现（等宽 26px，纹理级角标） */}
        <div style={{
          position: 'absolute', left: BOX.x, top: BOX.y - 52, opacity: boxOp * Math.min(1, boxSX),
          ...type(26, 600, { mono: true }), letterSpacing: '0.14em', color: L.accent2,
          transform: `translateX(${((1 - boxSX) * (CX - BOX.x)).toFixed(1)}px)`,
        }}>
          SELECT · 21 CHARS
        </div>

        {/* 副标：凝固后逐词升起 */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 712, textAlign: 'center' }}>
          <TextReveal text="Now live, everywhere." by="word" variant="rise" start={54} each={14} gap={3}
            style={{ ...type(48, 500), color: L.ink2, letterSpacing: '-0.01em' }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
