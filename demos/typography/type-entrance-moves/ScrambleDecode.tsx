// 乱码解码字（scramble-decode）——噪声里长出答案的标题入场。
//
// 第二轮重设计（解密档案 · 涂黑揭封）：
// - look = porcelain（冷白 · 墨蓝 · 钴蓝印泥）。不是终端：画面是一份放在冷灰桌面上的机密档案页
//   （下面还压着一张错位的底页），页眉 CASE FILE No. 0417-K、SUBJECT 栏、字段表、底部字段计数，
//   主角是 150px 衬线大标题「Project Nightjar」。
// - 手法不变：标题起初整行被墨色涂黑条盖住，涂黑条上的字形在高速乱跳（衬线乱码，纸白色）；
//   一道钴蓝"解码波前"（竖向细光 + 浅蓝光带，像扫描仪的读头）从左往右扫过，逐个揭封锁定：
//   锁定瞬间该字的涂黑块闪成钴蓝 2f，随即从中线向上下收拢成一条细线消失，露出墨色真字（1.12→1 收回）。
//   离波前越近的乱码越亮、跳得越快（1f/次 vs 2f/次）。
// - 比例字体不抖：每个槽位先放一个隐形的真字撑出自然字宽，乱码字形绝对定位居中叠在上面，
//   整行排版从第 1 帧起就是最终版式。
// - 节奏「慢起—加速—急停」：锁定间隔按曲线 8.3f → 3.4f 越来越快；标题揭完副标题（斜体衬线）0.8f/字瀑布解码；
//   急停 = 一枚钴蓝「DECLASSIFIED」橡皮章从上方砸下盖在页角（加速落下 → 触地墨色一次到位 → 轻微回弹）。
//
// 时间表（30fps，共 140f）：
//   0–14    档案页就位：涂黑条整行在场、乱码在条上跳（第 1 帧即有完整版式）
//   14–72   标题 15 个字逐个揭封（间隔 8.3→3.4f，波前随之加速扫过）
//   74–98   副标题 0.8f/字瀑布解码；字段计数随标题推进
//   98–104  橡皮章落下，103f 触地
//   104–140 hold（整幅极缓推近 1.00→1.02 贯穿全片）
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, Grain, mix, ramp, softShadow } from '../../_fixtures/Polish';
import { LOOKS, SERIF, Stage, alpha, type } from '../../_fixtures/Look';

export const SCRAMBLE_DECODE_DURATION = 140;

const L = LOOKS.porcelain;
const INK = '#141b2e'; // 涂黑条 / 正文墨色（带蓝相的近黑）

const TEXT = 'Project Nightjar';
const SUB = 'Cleared for public release, 14 October.';
// 衬线乱码字集（去掉与真字易混的 O/0、I/l/1）
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz§&#%';
const SIZE = 150;
const SUB_SIZE = 46;
const LOCK0 = 14;
const LOCK_SPAN = 58;
const FLASH = 2;
const SUB0 = 74;
const STAMP_T = 98; // 橡皮章起落
const STAMP_HIT = 103; // 触地帧

// 档案页
const SHEET = { x: 210, y: 92, w: 1500, h: 900 };
const PAD_X = 120;
const TX = SHEET.x + PAD_X; // 正文左缘
const TITLE_Y = 330;
const LINE_H = SIZE * 1.1;
const BLOCK_TOP = Math.round(LINE_H * 0.15); // 涂黑块覆盖字身（上 15% / 下 10% 留白）
const BLOCK_H = Math.round(LINE_H * 0.75);

const h = (n: number) => {
  const s = Math.sin(n * 127.3) * 43758.5453;
  return s - Math.floor(s);
};
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

const CHARS = TEXT.split('');
const REAL_IDX = CHARS.map((c, i) => (c === ' ' ? -1 : i)).filter((i) => i >= 0);
const REAL = REAL_IDX.length; // 15
const lockOfReal = (k: number) => LOCK0 + LOCK_SPAN * (1 - Math.pow(1 - k / (REAL - 1), 1.45));
const LOCK = CHARS.map((c, i) => (c === ' ' ? -1 : lockOfReal(REAL_IDX.indexOf(i))));
const LAST = LOCK[REAL_IDX[REAL - 1]];

// 波前位置（槽序号，连续）
const headAt = (f: number) => {
  if (f <= LOCK[REAL_IDX[0]]) return -0.5 + 0.5 * clamp01((f - LOCK0 + 8) / 8);
  for (let k = 0; k < REAL - 1; k++) {
    const a = LOCK[REAL_IDX[k]], b = LOCK[REAL_IDX[k + 1]];
    if (f < b) return mix(REAL_IDX[k], REAL_IDX[k + 1], EASE.swift((f - a) / (b - a)));
  }
  return REAL_IDX[REAL - 1] + ramp(f, LAST, 10, EASE.exit) * 2.5;
};
const scrambleChar = (seed: number, tick: number) => CHARSET[Math.floor(h(seed * 101 + tick * 7 + 13) * CHARSET.length)];

// 波前 x：槽位宽按衬线字宽近似（只用来放光带 / 读头，真字排版走 inline 自然字宽）
const ADV: Record<string, number> = {
  P: 0.6, r: 0.42, o: 0.53, j: 0.27, e: 0.48, c: 0.45, t: 0.33, ' ': 0.25, N: 0.74, i: 0.28, g: 0.5, h: 0.55, a: 0.48,
};
const SLOT_X = (() => {
  const xs: number[] = [];
  let x = 0;
  for (const c of CHARS) { xs.push(x); x += (ADV[c] ?? 0.5) * SIZE; }
  xs.push(x);
  return xs;
})();
const headX = (pos: number) => {
  const i = Math.max(0, Math.min(CHARS.length - 1, Math.floor(pos)));
  const fr = pos - Math.floor(pos);
  const x0 = SLOT_X[i] + (SLOT_X[i + 1] - SLOT_X[i]) * 0.5;
  const nx = SLOT_X[Math.min(CHARS.length, i + 1)] + ((SLOT_X[Math.min(CHARS.length, i + 2)] ?? SLOT_X[CHARS.length]) - SLOT_X[Math.min(CHARS.length, i + 1)]) * 0.5;
  return TX + (pos < 0 ? SLOT_X[0] + pos * 60 : mix(x0, nx, fr));
};

// 橡皮章的做旧纹理：feTurbulence 阈值成斑驳透明点（data-URI 做 mask）
const STAMP_MASK = (() => {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='560' height='200'>` +
    `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='7'/>` +
    `<feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -2.6 2.1'/></filter>` +
    `<rect width='100%' height='100%' filter='url(#n)'/></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
})();

const FIELDS: [string, string, boolean][] = [
  ['Origin', 'Applied Research, Lab 4', false],
  ['Status', 'Ships to every customer on launch day', false],
  ['Handler', '██████████████', true],
];

export const ScrambleDecode: React.FC = () => {
  const frame = useCurrentFrame();
  const tick = Math.floor(frame / 2);
  const head = headAt(frame);
  const hx = headX(head);
  const beamOn = clamp01((frame - 6) / 8) * (1 - ramp(frame, LAST + 2, 10, EASE.out));
  let locked = 0;
  REAL_IDX.forEach((i) => { if (frame >= LOCK[i]) locked++; });
  const push = 1 + 0.02 * ramp(frame, 0, SCRAMBLE_DECODE_DURATION, EASE.swift);
  const intro = ramp(frame, 0, 10, EASE.out);

  // 橡皮章：98→103 加速落下（scale 1.5→1、空中只是一抹淡影），触地墨色一次到位，再 6f 轻微回弹
  const fall = ramp(frame, STAMP_T, STAMP_HIT - STAMP_T, EASE.exit);
  const hit = frame >= STAMP_HIT;
  const settle = ramp(frame, STAMP_HIT, 8, EASE.out);
  const stampScale = hit ? mix(0.96, 1, settle) : mix(1.5, 1, fall);
  const stampOp = frame < STAMP_T ? 0 : hit ? mix(0.95, 0.86, settle) : 0.18 * fall;

  const label: React.CSSProperties = { ...type(26, 650, { caps: true }), letterSpacing: '0.18em' };

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.36, y: 0.1 }} fill={{ x: 0.9, y: 0.9 }} />

      <AbsoluteFill style={{ transform: `scale(${push.toFixed(4)})`, transformOrigin: '50% 50%' }}>
        {/* 底页：错位压在下面 */}
        <div style={{
          position: 'absolute', left: SHEET.x + 26, top: SHEET.y + 22, width: SHEET.w, height: SHEET.h, borderRadius: 6,
          background: '#eef2f8', transform: 'rotate(1.4deg)', boxShadow: softShadow(6, { color: L.shadow }),
          border: `1px solid ${L.line}`,
        }} />
        {/* 档案页 */}
        <div style={{
          position: 'absolute', left: SHEET.x, top: SHEET.y, width: SHEET.w, height: SHEET.h, borderRadius: 6, overflow: 'hidden',
          background: 'linear-gradient(180deg, #ffffff 0%, #fbfcfe 60%, #f5f7fb 100%)',
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.9), ${softShadow(18, { color: L.shadow, strength: 1.2 })}`,
          border: `1px solid ${L.line}`,
        }}>
          <Grain opacity={0.05} />
          {/* 左缘装订孔 */}
          {[0.22, 0.5, 0.78].map((p) => (
            <div key={p} style={{ position: 'absolute', left: 40, top: SHEET.h * p - 11, width: 22, height: 22, borderRadius: 11, background: L.bg[2], boxShadow: `inset 0 2px 3px ${alpha(L.shadow, 0.25)}` }} />
          ))}
        </div>

        {/* 页眉 */}
        <div style={{ position: 'absolute', left: TX, top: SHEET.y + 66, right: 1920 - SHEET.x - SHEET.w + PAD_X, display: 'flex', justifyContent: 'space-between', opacity: intro }}>
          <span style={{ ...label, color: L.ink }}>Case file <span style={{ color: L.ink3, marginLeft: 14 }}>No. 0417-K</span></span>
          <span style={{ ...label, color: L.ink3 }}>Page 1 of 3</span>
        </div>
        <div style={{ position: 'absolute', left: TX, top: SHEET.y + 118, width: SHEET.w - PAD_X * 2, height: 2, background: INK, opacity: 0.85 * intro }} />
        <div style={{ position: 'absolute', left: TX, top: TITLE_Y - 64, ...label, color: L.ink3 }}>Subject</div>

        {/* 波前：浅钴蓝光带 + 读头细线（只在标题行高度） */}
        <div style={{
          position: 'absolute', left: hx - 90, top: TITLE_Y - 20, width: 180, height: SIZE * 1.25, opacity: beamOn * 0.9,
          background: `linear-gradient(90deg, ${alpha(L.accent, 0)} 0%, ${alpha(L.accent, 0.13)} 50%, ${alpha(L.accent, 0)} 100%)`,
        }} />
        <div style={{
          position: 'absolute', left: hx - 1.5, top: TITLE_Y - 34, width: 3, height: SIZE * 1.25 + 28, opacity: beamOn,
          background: L.accent, boxShadow: `0 0 14px ${alpha(L.accent, 0.55)}`, borderRadius: 2,
        }} />

        {/* 标题：每槽隐形真字撑宽，涂黑条 + 乱码叠在上面 */}
        <div style={{ position: 'absolute', left: TX, top: TITLE_Y, whiteSpace: 'pre', fontFamily: SERIF, fontSize: SIZE, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1, color: INK }}>
          {CHARS.map((ch, i) => {
            if (ch === ' ') return <span key={i}>{' '}</span>;
            const lf = LOCK[i];
            const isLocked = frame >= lf;
            const flashing = isLocked && frame < lf + FLASH;
            const collapse = ramp(frame, lf + FLASH, 6, EASE.snappy); // 涂黑块从中线收拢
            const pop = ramp(frame, lf + FLASH, 8, EASE.snappy);
            const near = Math.max(0, 1 - Math.abs(i - head) / 3);
            const sc = scrambleChar(i, near > 0.5 ? frame : tick);
            const blockH = isLocked ? 1 - collapse : 1;
            return (
              <span key={i} style={{ position: 'relative', display: 'inline-block' }}>
                {/* 真字：锁定后显出 */}
                <span style={{
                  display: 'inline-block', opacity: isLocked && !flashing ? 1 : 0,
                  transform: `scale(${mix(1.12, 1, pop).toFixed(4)})`, transformOrigin: '50% 70%',
                }}>{ch}</span>
                {/* 涂黑块：相邻块互相搭 1px，同一个词读作一整条；乱码字形画在块内并被块裁切（不溢出到邻槽） */}
                {blockH > 0.01 && (
                  <span style={{
                    position: 'absolute', left: -1, right: -1, top: BLOCK_TOP, height: BLOCK_H, overflow: 'hidden',
                    transform: `scaleY(${blockH.toFixed(4)})`, transformOrigin: '50% 55%',
                    background: flashing ? L.accent : INK, borderRadius: 2,
                    boxShadow: flashing ? `0 0 26px ${alpha(L.accent, 0.5)}` : 'none',
                  }}>
                    {!isLocked && (
                      <span style={{
                        position: 'absolute', left: '50%', top: -BLOCK_TOP, transform: 'translateX(-50%)',
                        color: alpha('#ffffff', 0.2 + 0.72 * near * clamp01((frame - 2) / 8)),
                        textShadow: near > 0.4 ? `0 0 18px ${alpha(L.accent, 0.7 * near)}` : 'none',
                      }}>{sc}</span>
                    )}
                  </span>
                )}
                {flashing && (
                  <span style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)', color: '#ffffff' }}>{ch}</span>
                )}
              </span>
            );
          })}
        </div>

        {/* 副标题：斜体衬线 0.8f/字瀑布解码 */}
        <div style={{ position: 'absolute', left: TX + 4, top: TITLE_Y + SIZE * 1.1 + 34, whiteSpace: 'pre', fontFamily: SERIF, fontStyle: 'italic', fontSize: SUB_SIZE, fontWeight: 400, color: L.ink2 }}>
          {SUB.split('').map((ch, i) => {
            const lf = SUB0 + i * 0.6;
            const on = frame >= SUB0 - 12 + i * 0.25;
            const isLocked = frame >= lf;
            const flashing = isLocked && frame < lf + 1.5;
            if (ch === ' ') return <span key={i}>{' '}</span>;
            return (
              <span key={i} style={{ position: 'relative', display: 'inline-block' }}>
                <span style={{ opacity: isLocked ? 1 : 0, color: flashing ? L.accent : undefined }}>{ch}</span>
                {on && !isLocked && (
                  <span style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)', color: alpha(L.ink3, 0.75) }}>
                    {scrambleChar(i + 40, frame)}
                  </span>
                )}
              </span>
            );
          })}
        </div>

        {/* 字段表：静态档案内容（Handler 一栏永久涂黑） */}
        <div style={{ position: 'absolute', left: TX, top: 690, width: SHEET.w - PAD_X * 2, opacity: intro }}>
          <div style={{ height: 1, background: L.line, marginBottom: 6 }} />
          {FIELDS.map(([k, v, red]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', height: 58, borderBottom: `1px solid ${L.line}` }}>
              <span style={{ ...label, color: L.ink3, width: 220 }}>{k}</span>
              {red ? (
                <span style={{ display: 'inline-block', width: 360, height: 26, background: INK, borderRadius: 2 }} />
              ) : (
                <span style={{ ...type(32, 500), color: L.ink }}>{v}</span>
              )}
            </div>
          ))}
        </div>

        {/* 页脚：字段计数（随标题揭封推进） */}
        <div style={{ position: 'absolute', left: TX, top: SHEET.y + SHEET.h - 92, display: 'flex', alignItems: 'center', gap: 26, opacity: intro }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {REAL_IDX.map((ci, k) => {
              const on = ramp(frame, LOCK[ci], 5, EASE.snappy);
              return (
                <div key={k} style={{ width: 14, height: 26, borderRadius: 2, border: `1.5px solid ${alpha(INK, 0.3)}`, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${(on * 100).toFixed(1)}%`, background: k === REAL - 1 && on > 0 ? L.accent : INK }} />
                </div>
              );
            })}
          </div>
          <span style={{ ...label, color: L.ink2, fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ color: locked === REAL ? L.accent : L.ink }}>{String(locked).padStart(2, '0')}</span> / {REAL} redactions lifted
          </span>
        </div>

        {/* 橡皮章：急停 */}
        {stampOp > 0 && (
          <div style={{
            position: 'absolute', left: 1080, top: 528, width: 560, height: 150,
            transform: `rotate(-7deg) scale(${stampScale.toFixed(4)})`, transformOrigin: '50% 50%',
            opacity: stampOp, mixBlendMode: 'multiply',
            filter: hit ? undefined : `blur(${(6 * (1 - fall)).toFixed(1)}px)`,
            WebkitMaskImage: hit ? STAMP_MASK : undefined, maskImage: hit ? STAMP_MASK : undefined,
          }}>
            <div style={{
              position: 'absolute', inset: 0, border: `7px solid ${L.accent}`, borderRadius: 14,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              boxShadow: `inset 0 0 0 5px #ffffff, inset 0 0 0 8px ${L.accent}`,
            }}>
              <span style={{ ...type(56, 900, { caps: true }), letterSpacing: '0.08em', color: L.accent, lineHeight: 1, whiteSpace: 'nowrap' }}>Declassified</span>
              <span style={{ ...type(22, 700, { caps: true }), letterSpacing: '0.3em', color: L.accent, marginTop: 10 }}>14 · 10 · Level 0</span>
            </div>
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
