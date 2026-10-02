// skeleton-reveal —— 草稿→骨架→内容三级显影（slack-promo 4–15s 的镜头设计）：
// 手绘涂鸦占位（煮沸抖动）一拍被灰条骨架窗口替换，骨架列表滚入后镜头推近、灰条逐行显影成头像+逐词文字，
// 末词晚半拍落地。
//
// 第二轮重设计（瓷白 SaaS · 钴蓝马克笔草图 · 大字号对话）：
// - look = porcelain（冷白 + 钴蓝）。第一级是钴蓝马克笔在点阵草图纸上"画出来"的线稿（开场 16f 逐笔描出，
//   不再一上来就是静态涂鸦），描完后每 4f 换种子煮沸；第二级是冷灰蓝骨架；第三级是真实产品界面——
//   三级保真度在色彩上也是一条线：蓝墨 → 灰蓝 → 全彩。
// - 构图：窗口 1480×820 居中（推近后 1.08 倍仍留 ≥96px 安全边），深海军蓝侧栏 + 白色主区；
//   为镜头设计的 UI：只有 3 条消息，名字 30px、正文 40px、频道名 40px——每个字都读得清。
//   虚构产品 Parlor，频道 #launch。
// - 节奏：画（16f）→ 停（18f，观众登记"想法"）→ 换真一拍（8f ease-in 缩退 + 同帧弹簧弹入）
//   → 骨架滚入（逐行 6f 错峰）→ shimmer 扫一次 → 推近 + 逐行显影（侧栏/顶栏先一步）→ 末词「today?」晚 14f
//   以钴蓝落地并过冲一次——全片的句号，之后 hold。
//
// 时间表（30fps，共 190f）：
//   0–16    涂鸦逐笔描出（6 组笔画错峰），点阵纸淡入
//   16–34   涂鸦煮沸 hold
//   34–42   换真：涂鸦 8f 加速缩退 + 淡出；骨架窗口 spring(damping 16) 同帧弹入
//   46–76   骨架消息行逐行滚入（6f 错峰，各 22f snappy）
//   70–94   加载态 shimmer 扫一次
//   88–150  镜头以窗口中心 1→1.08 推近（smooth）
//   90–104  侧栏 + 顶栏显影；96/110/124 三行显影，逐词 2.5f；末词 +14f（≈152 落地）
//   146–158 输入框显影
//   160–190 hold
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, springAt, type } from '../../_fixtures/Look';

export const SKELETON_REVEAL_DURATION = 190;

const L = LOOKS.porcelain;
const SIDE = '#0f1830'; // 侧栏海军蓝
const BAR = '#e2e8f2'; // 骨架灰条（冷灰蓝）
const BAR2 = '#ebf0f7';
const SBAR = 'rgba(190,205,240,0.16)'; // 侧栏骨架条
const WX = 220, WY = 130, WW = 1480, WH = 820, SW = 360; // 窗口与侧栏

const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ───────────── 第一级：手绘线稿 ─────────────
const wobbleLine = (x1: number, y1: number, x2: number, y2: number, seed: number, amp = 5, segs = 8) => {
  const rnd = mulberry32(seed);
  let d = '';
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    d += `${i === 0 ? 'M' : 'L'} ${(x1 + (x2 - x1) * t + (rnd() - 0.5) * amp * 2).toFixed(1)} ${(y1 + (y2 - y1) * t + (rnd() - 0.5) * amp * 2).toFixed(1)} `;
  }
  return d;
};
const wobbleRect = (x: number, y: number, w: number, h: number, seed: number, amp = 7, r = 48) => {
  const rnd = mulberry32(seed);
  const j = () => ((rnd() - 0.5) * amp * 2).toFixed(1);
  const p = (a: number, b: number) => `${(a + +j()).toFixed(1)} ${(b + +j()).toFixed(1)}`;
  return [
    `M ${p(x + r, y)}`, `L ${p(x + w / 2, y)}`, `L ${p(x + w - r, y)}`, `Q ${p(x + w, y)} ${p(x + w, y + r)}`,
    `L ${p(x + w, y + h / 2)}`, `L ${p(x + w, y + h - r)}`, `Q ${p(x + w, y + h)} ${p(x + w - r, y + h)}`,
    `L ${p(x + w / 2, y + h)}`, `L ${p(x + r, y + h)}`, `Q ${p(x, y + h)} ${p(x, y + h - r)}`,
    `L ${p(x, y + h / 2)}`, `L ${p(x, y + r)}`, `Q ${p(x, y)} ${p(x + r, y + 2)}`,
  ].join(' ');
};
const wobbleCircle = (cx: number, cy: number, r: number, seed: number, amp = 5) => {
  const rnd = mulberry32(seed);
  let d = '';
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI * 2 - 0.6;
    const rr = r + (rnd() - 0.5) * amp * 2;
    d += `${i === 0 ? 'M' : 'L'} ${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)} `;
  }
  return d;
};

// 行几何：涂鸦 / 骨架 / 内容三级同构
const ROW_Y = [WY + 150, WY + 330, WY + 510]; // 每行顶
const MAIN_X = WX + SW + 64;

const Doodle: React.FC<{ f: number }> = ({ f }) => {
  const S = Math.floor(f / 4) * 977; // 每 4f 煮沸一次
  const draw = (k: number) => ramp(f, 1 + k * 2.4, 9, EASE.out); // 第 k 组笔画的描出进度
  const st = (k: number, w: number): React.SVGProps<SVGPathElement> => ({
    fill: 'none', stroke: L.accent, strokeWidth: w, strokeLinecap: 'round', strokeLinejoin: 'round',
    pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - draw(k),
  });
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      <path d={wobbleRect(WX, WY, WW, WH, S + 1)} {...st(0, 12)} />
      <path d={wobbleLine(WX + SW, WY + 18, WX + SW, WY + WH - 18, S + 2)} {...st(1, 10)} />
      <path d={wobbleCircle(WX + 92, WY + 86, 34, S + 3)} {...st(1, 10)} />
      {Array.from({ length: 5 }, (_, i) => (
        <path key={i} d={wobbleLine(WX + 58, WY + 200 + i * 78, WX + 230 + ((i * 47) % 60), WY + 200 + i * 78, S + 10 + i)} {...st(2, 9)} />
      ))}
      <path d={wobbleLine(MAIN_X, WY + 62, MAIN_X + 300, WY + 62, S + 20)} {...st(2, 11)} />
      {ROW_Y.map((y, i) => (
        <g key={i}>
          <path d={wobbleCircle(MAIN_X + 40, y + 44, 38, S + 30 + i)} {...st(3 + i, 10)} />
          <path d={wobbleLine(MAIN_X + 112, y + 22, MAIN_X + 300 + ((i * 61) % 80), y + 22, S + 40 + i)} {...st(3 + i, 10)} />
          <path d={wobbleLine(MAIN_X + 112, y + 86, MAIN_X + 820 - ((i * 97) % 220), y + 86, S + 50 + i)} {...st(3 + i, 10)} />
        </g>
      ))}
      <path d={wobbleRect(MAIN_X, WY + WH - 128, WW - SW - 128, 76, S + 60, 4, 30)} {...st(5, 9)} />
    </svg>
  );
};

// ───────────── 第二/三级：骨架 ⇄ 内容 ─────────────
type Msg = { name: string; time: string; words: string[]; ava: string };
const MSGS: Msg[] = [
  { name: 'Ines Marlow', time: '9:41', words: ['Final', 'build', 'is', 'green', 'in', 'every', 'region.'], ava: `linear-gradient(145deg, #5b7cff, ${L.accent})` },
  { name: 'Theo Brandt', time: '9:42', words: ['Docs', 'and', 'changelog', 'are', 'merged.'], ava: 'linear-gradient(145deg, #2fd1b8, #00a08a)' },
  { name: 'Maya Okoro', time: '9:44', words: ['Then', "let's", 'ship', 'it', '—', 'today?'], ava: 'linear-gradient(145deg, #ff9a7a, #f0614a)' },
];
const ROW_DEV = [96, 110, 124];
const LATE = 14; // 末词晚半拍

// 骨架 / 内容两层叠放：dev 0→1 交叉显影
const Dual: React.FC<{ dev: number; skel: React.ReactNode; real: React.ReactNode; style?: React.CSSProperties }> = ({ dev, skel, real, style }) => (
  <div style={{ position: 'relative', ...style }}>
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - dev, display: 'flex', alignItems: 'center' }}>{skel}</div>
    <div style={{ position: 'absolute', inset: 0, opacity: dev, display: 'flex', alignItems: 'center', transform: `translateY(${((1 - dev) * 8).toFixed(2)}px)` }}>{real}</div>
  </div>
);

const Row: React.FC<{ i: number; f: number }> = ({ i, f }) => {
  const m = MSGS[i];
  const d0 = ROW_DEV[i];
  const dev = ramp(f, d0, 12, EASE.out);
  const avaS = springAt(f, d0, { damping: 15, stiffness: 190 });
  return (
    <div style={{ position: 'relative', height: 140 }}>
      {/* 骨架层 */}
      <div style={{ position: 'absolute', inset: 0, opacity: 1 - dev }}>
        <div style={{ position: 'absolute', left: 0, top: 4, width: 80, height: 80, borderRadius: 40, background: BAR }} />
        <div style={{ position: 'absolute', left: 112, top: 10, width: 220 + i * 40, height: 26, borderRadius: 13, background: BAR }} />
        <div style={{ position: 'absolute', left: 112, top: 70, width: [640, 470, 560][i], height: 34, borderRadius: 17, background: BAR2 }} />
      </div>
      {/* 内容层 */}
      {dev > 0.01 && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <div style={{
            position: 'absolute', left: 0, top: 4, width: 80, height: 80, borderRadius: 40, background: m.ava,
            transform: `scale(${(0.6 + 0.4 * avaS).toFixed(4)})`, opacity: Math.min(1, dev * 1.4),
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', ...type(32, 700),
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.35), 0 6px 16px -6px ${alpha(L.shadow, 0.35)}`,
          }}>{m.name[0]}</div>
          <div style={{ position: 'absolute', left: 112, top: 2, display: 'flex', alignItems: 'baseline', gap: 16, opacity: dev, transform: `translateY(${((1 - dev) * 10).toFixed(2)}px)` }}>
            <span style={{ ...type(30, 700), color: L.ink }}>{m.name}</span>
            <span style={{ ...type(24, 500), color: L.ink3 }}>{m.time}</span>
          </div>
          <div style={{ position: 'absolute', left: 112, top: 56, ...type(40, 480), lineHeight: 1.25, color: L.ink, whiteSpace: 'nowrap' }}>
            {m.words.map((w, wi) => {
              const last = i === MSGS.length - 1 && wi === m.words.length - 1;
              const s = d0 + 2 + wi * 2.5 + (last ? LATE : 0);
              const p = ramp(f, s, 10, EASE.snappy);
              const pop = last ? EASE.overshoot(Math.min(1, Math.max(0, (f - s) / 12))) : p;
              return (
                <span key={wi} style={{
                  display: 'inline-block', marginRight: '0.26em', opacity: p,
                  transform: last ? `translateY(${((1 - pop) * 22).toFixed(2)}px) scale(${(0.8 + 0.2 * pop).toFixed(4)})` : `translateY(${((1 - p) * 16).toFixed(2)}px)`,
                  transformOrigin: '0% 80%',
                  color: last ? L.accent : undefined, fontWeight: last ? 700 : undefined,
                }}>{w}</span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const CHANNELS = ['general', 'launch', 'design', 'growth'];

export const SkeletonReveal: React.FC = () => {
  const f = useCurrentFrame();
  const SWAP = 34;
  const doodleOut = ramp(f, SWAP, 8, EASE.exit);
  const win = springAt(f, SWAP, { damping: 16, stiffness: 170, mass: 0.8 });
  const rowSlide = (i: number) => (1 - ramp(f, SWAP + 12 + i * 6, 22, EASE.snappy)) * 420;
  const zoom = mix(1, 1.08, ramp(f, 88, 62, EASE.smooth)) * (1 + 0.006 * ramp(f, 150, 40, EASE.linear));
  const shimmer = mix(-0.3, 1.3, ramp(f, 70, 24, EASE.swift));
  const shimmerOn = f > 70 && f < 94;
  const devHead = ramp(f, 90, 14, EASE.out);
  const devSide = (k: number) => ramp(f, 90 + k * 2, 12, EASE.out);
  const devComposer = ramp(f, 146, 12, EASE.out);
  const dots = ramp(f, 0, 12, EASE.out) * (1 - ramp(f, SWAP, 10, EASE.linear));

  return (
    <AbsoluteFill style={{ background: L.bg[1], fontFamily: FONT.sans }}>
      <Stage look={L} keyLight={{ x: 0.32, y: 0.06 }} fill={{ x: 0.88, y: 0.92 }}>
        {/* 草图纸点阵：只在涂鸦期出现 */}
        <div style={{
          position: 'absolute', inset: 0, opacity: dots,
          backgroundImage: `radial-gradient(circle, ${alpha(L.accent, 0.22)} 1.6px, transparent 2px)`, backgroundSize: '36px 36px', backgroundPosition: '12px 12px',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 62% at 50% 50%, #000 40%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 60% 62% at 50% 50%, #000 40%, transparent 100%)',
        }} />
      </Stage>

      {/* 第二/三级：窗口 */}
      {f >= SWAP && (
        <AbsoluteFill style={{ transform: `scale(${zoom.toFixed(4)})`, transformOrigin: `${WX + WW / 2}px ${WY + WH / 2}px` }}>
          <div style={{
            position: 'absolute', left: WX, top: WY, width: WW, height: WH, borderRadius: 30, overflow: 'hidden', background: '#ffffff',
            opacity: Math.min(1, win * 2), transform: `scale(${mix(1.06, 1, win).toFixed(4)})`,
            boxShadow: `inset 0 0 0 1px ${L.line}, 0 2px 4px ${alpha(L.shadow, 0.06)}, 0 24px 50px -18px ${alpha(L.shadow, 0.22)}, 0 70px 140px -50px ${alpha(L.shadow, 0.35)}`,
          }}>
            {/* 侧栏 */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: SW, background: `linear-gradient(180deg, #131d39 0%, ${SIDE} 100%)` }}>
              <Dual dev={devSide(0)} style={{ position: 'absolute', left: 40, top: 40, width: 280, height: 64 }}
                skel={<div style={{ width: 60, height: 60, borderRadius: 18, background: SBAR }} />}
                real={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                    <div style={{ width: 60, height: 60, borderRadius: 18, background: `linear-gradient(145deg, #6d8bff, ${L.accent})`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', ...type(30, 800) }}>P</div>
                    <div style={{ ...type(34, 700), color: '#fff' }}>Parlor</div>
                  </div>
                } />
              {CHANNELS.map((c, k) => (
                <Dual key={c} dev={devSide(1 + k)} style={{ position: 'absolute', left: 28, top: 170 + k * 80, width: 304, height: 64 }}
                  skel={<div style={{ marginLeft: 16, height: 22, width: [150, 120, 170, 130][k], borderRadius: 11, background: SBAR }} />}
                  real={
                    <div style={{
                      width: '100%', height: 64, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px', boxSizing: 'border-box',
                      background: c === 'launch' ? L.accent : 'transparent', color: c === 'launch' ? '#fff' : 'rgba(220,228,255,0.62)',
                      ...type(32, c === 'launch' ? 650 : 480),
                      boxShadow: c === 'launch' ? `0 8px 22px -8px ${alpha(L.accent, 0.8)}` : undefined,
                    }}><span style={{ opacity: 0.6 }}>#</span>{c}</div>
                  } />
              ))}
              <div style={{ position: 'absolute', left: 46, top: 520, ...type(22, 650, { caps: true }), letterSpacing: '0.16em', color: 'rgba(220,228,255,0.38)', opacity: devSide(5) }}>Direct</div>
              {MSGS.slice(0, 2).map((m, k) => (
                <Dual key={m.name} dev={devSide(6 + k)} style={{ position: 'absolute', left: 28, top: 566 + k * 74, width: 304, height: 60 }}
                  skel={<div style={{ marginLeft: 16, height: 22, width: [170, 150][k], borderRadius: 11, background: SBAR }} />}
                  real={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 18px', color: 'rgba(220,228,255,0.62)', ...type(30, 480) }}>
                      <div style={{ position: 'relative', width: 36, height: 36, borderRadius: 18, background: m.ava }}>
                        {k === 0 && <div style={{ position: 'absolute', right: -3, bottom: -3, width: 14, height: 14, borderRadius: 7, background: L.accent2, boxShadow: `0 0 0 3px ${SIDE}` }} />}
                      </div>
                      {m.name.split(' ')[0]}
                    </div>
                  } />
              ))}
            </div>
            {/* 顶栏 */}
            <div style={{ position: 'absolute', left: SW, right: 0, top: 0, height: 120, borderBottom: `1px solid ${L.line}` }}>
              <Dual dev={devHead} style={{ position: 'absolute', left: 64, right: 48, top: 30, height: 60 }}
                skel={<div style={{ height: 30, width: 300, borderRadius: 15, background: BAR }} />}
                real={
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 22, width: '100%' }}>
                    <div style={{ ...type(40, 760), color: L.ink }}># launch</div>
                    <div style={{ ...type(28, 450), color: L.ink3 }}>v4.0 goes out this week</div>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignSelf: 'center' }}>
                      {MSGS.map((m, k) => (
                        <div key={k} style={{ width: 44, height: 44, borderRadius: 22, background: m.ava, marginLeft: k ? -12 : 0, boxShadow: '0 0 0 4px #fff' }} />
                      ))}
                    </div>
                  </div>
                } />
            </div>
            {/* 消息行 */}
            {MSGS.map((_, i) => (
              <div key={i} style={{
                position: 'absolute', left: MAIN_X - WX, top: ROW_Y[i] - WY + 6, width: WW - SW - 128,
                transform: `translateY(${rowSlide(i).toFixed(2)}px)`, opacity: rowSlide(i) > 400 ? 0 : 1,
              }}>
                <Row i={i} f={f} />
              </div>
            ))}
            {/* 加载态 shimmer：只扫骨架期主区，darken 不影响白底 */}
            {shimmerOn && (
              <div style={{
                position: 'absolute', left: SW, right: 0, top: 120, bottom: 0, pointerEvents: 'none', mixBlendMode: 'lighten',
                background: `linear-gradient(100deg, rgba(250,252,255,0) ${((shimmer - 0.16) * 100).toFixed(2)}%, rgba(250,252,255,1) ${(shimmer * 100).toFixed(2)}%, rgba(250,252,255,0) ${((shimmer + 0.16) * 100).toFixed(2)}%)`,
              }} />
            )}
            {/* 输入框 */}
            <div style={{
              position: 'absolute', left: MAIN_X - WX, right: 64, top: WH - 128, height: 76, borderRadius: 22, boxSizing: 'border-box',
              border: `1.5px solid ${alpha(L.ink, 0.12)}`, background: L.surface2, padding: '0 14px 0 28px', display: 'flex', alignItems: 'center',
            }}>
              <Dual dev={devComposer} style={{ height: 56, flex: 1 }}
                skel={<div style={{ height: 22, width: 280, borderRadius: 11, background: BAR }} />}
                real={
                  <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <span style={{ ...type(32, 450), color: L.ink3 }}>Message #launch</span>
                    <div style={{ marginLeft: 'auto', width: 52, height: 52, borderRadius: 16, background: L.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width={24} height={24} viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2.5 8h10" /><path d="M8.5 3.5 13 8l-4.5 4.5" />
                      </svg>
                    </div>
                  </div>
                } />
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* 第一级：手绘线稿（在窗口之上，一拍内加速缩退让位） */}
      {f < SWAP + 9 && (
        <AbsoluteFill style={{ opacity: 1 - doodleOut, transform: `scale(${(1 - doodleOut * 0.12).toFixed(4)})`, transformOrigin: '50% 50%' }}>
          <Doodle f={f} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
