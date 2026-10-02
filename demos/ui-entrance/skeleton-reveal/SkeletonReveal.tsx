// skeleton-reveal —— slack-promo 4–15s 合并
// 三级显影：全屏手绘粗笔触涂鸦占位（圆头 blob 线稿，煮沸抖动）→ 一拍内被
// 灰条骨架 UI 窗口替换 → 骨架消息列表滚入，镜头推近时灰条逐行"显影"成
// 头像+文字内容（最后一行末词晚半拍到）。
// 质感改版：
// - 第三级"变真"覆盖整个界面：侧栏频道、频道头、输入框也从灰条显影成真内容（旧版只有消息行变真，
//   侧栏和顶栏到结尾还是灰条，读作"没加载完"）；
// - 骨架期加一次加载态 shimmer（只扫主区灰条，lighten 混合，白底不受影响）——加载语法的预期更明确；
// - 推近改为以窗口中心 1→1.22：整窗始终在画内（旧版 1.34 + 偏心原点把侧栏和窗口底边切掉）；
// - 窗口发丝线 + 两层软阴影，头像改克制的四色渐变，系统字体栈；纸面背景加柔光与颗粒。

export const SKELETON_REVEAL_DURATION = 172;
const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Inter, Arial, sans-serif';
import React from 'react';
import { Backdrop, Grain } from '../../_fixtures/Polish';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from 'remotion';

const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const INK = '#2f2f2f';
const PAPER = '#f2f0ea';

// ——— 手绘涂鸦工具：把折线/圆加种子抖动，画粗圆头 stroke ———
const wobbleLine = (
  x1: number, y1: number, x2: number, y2: number,
  seed: number, amp = 7, segs = 8,
) => {
  const rnd = mulberry32(seed);
  const pts: string[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const jx = (rnd() - 0.5) * amp * 2;
    const jy = (rnd() - 0.5) * amp * 2;
    pts.push(`${i === 0 ? 'M' : 'L'} ${x1 + (x2 - x1) * t + jx} ${y1 + (y2 - y1) * t + jy}`);
  }
  return pts.join(' ');
};

const wobbleBlobRect = (
  x: number, y: number, w: number, h: number,
  seed: number, amp = 10, r = 70,
) => {
  // 圆头 blob 矩形：四条边中段抖动，四角大圆弧
  const rnd = mulberry32(seed);
  const j = () => (rnd() - 0.5) * amp * 2;
  return [
    `M ${x + r + j()} ${y + j()}`,
    `L ${x + w / 2 + j()} ${y + j()}`, `L ${x + w - r + j()} ${y + j()}`,
    `Q ${x + w + j()} ${y + j()} ${x + w + j()} ${y + r + j()}`,
    `L ${x + w + j()} ${y + h / 2 + j()}`, `L ${x + w + j()} ${y + h - r + j()}`,
    `Q ${x + w + j()} ${y + h + j()} ${x + w - r + j()} ${y + h + j()}`,
    `L ${x + w / 2 + j()} ${y + h + j()}`, `L ${x + r + j()} ${y + h + j()}`,
    `Q ${x + j()} ${y + h + j()} ${x + j()} ${y + h - r + j()}`,
    `L ${x + j()} ${y + h / 2 + j()}`, `L ${x + j()} ${y + r + j()}`,
    `Q ${x + j()} ${y + j()} ${x + r + j()} ${y + j()}`,
  ].join(' ');
};

const wobbleCircle = (cx: number, cy: number, r: number, seed: number, amp = 6) => {
  const rnd = mulberry32(seed);
  const n = 14;
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r + (rnd() - 0.5) * amp * 2;
    pts.push(`${i === 0 ? 'M' : 'L'} ${cx + Math.cos(a) * rr} ${cy + Math.sin(a) * rr}`);
  }
  return pts.join(' ') + ' Z';
};

const Doodle: React.FC<{ boil: number }> = ({ boil }) => {
  const S = boil * 977; // 每次煮沸换一套抖动种子
  const stroke = {
    fill: 'none' as const,
    stroke: INK,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      {/* 窗口大 blob */}
      <path d={wobbleBlobRect(250, 140, 1420, 800, S + 1)} {...stroke} strokeWidth={14} />
      {/* 侧栏分隔 */}
      <path d={wobbleLine(600, 160, 600, 920, S + 2)} {...stroke} strokeWidth={12} />
      {/* 侧栏 logo blob + 短线 */}
      <path d={wobbleCircle(420, 260, 52, S + 3)} {...stroke} strokeWidth={12} />
      {Array.from({ length: 6 }).map((_, i) => (
        <path
          key={`sb${i}`}
          d={wobbleLine(330, 400 + i * 82, 470 + ((i * 53) % 70), 400 + i * 82, S + 10 + i)}
          {...stroke}
          strokeWidth={11}
        />
      ))}
      {/* 主区消息行：圆头像 blob + 波浪文字线 */}
      {Array.from({ length: 4 }).map((_, i) => {
        const y = 320 + i * 160;
        return (
          <g key={`row${i}`}>
            <path d={wobbleCircle(720, y, 44, S + 30 + i)} {...stroke} strokeWidth={12} />
            <path d={wobbleLine(810, y - 28, 1180 + ((i * 97) % 220), y - 28, S + 40 + i)} {...stroke} strokeWidth={11} />
            <path d={wobbleLine(810, y + 24, 1420 - ((i * 71) % 260), y + 24, S + 50 + i)} {...stroke} strokeWidth={11} />
          </g>
        );
      })}
    </svg>
  );
};

// ——— 骨架/内容消息行 ———
const NAMES = ['Ana', 'Ben', 'Kai', 'Mia'];
const AVA = [
  'linear-gradient(145deg, #e8836b, #c95c4a)',
  'linear-gradient(145deg, #6f8fe0, #4b67c2)',
  'linear-gradient(145deg, #4fb38e, #2f8d6c)',
  'linear-gradient(145deg, #c58ad8, #9a5fb6)',
];
const MSGS = [
  'Morning! Kicking off the rebrand today',
  'Logo drafts are ready for review',
  'Nice — shipping the deck this afternoon',
  'Love it. Can we make it pink?',
];
const BAR = '#dcdcd9';
const BAR2 = '#e7e7e4';
const TEXT = '#1d1c1d';

const Row: React.FC<{ i: number; dev: number; wordAt: (w: number, n: number) => number }> = ({
  i, dev, wordAt,
}) => {
  const words = MSGS[i].split(' ');
  return (
    <div style={{ position: 'relative', height: 96 }}>
      {/* 骨架层 */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: 22, opacity: 1 - dev }}>
        <div style={{ width: 72, height: 72, borderRadius: 16, background: BAR }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 6 }}>
          <div style={{ height: 18, width: 180 + ((i * 67) % 90), background: BAR, borderRadius: 9 }} />
          <div style={{ height: 16, width: `${58 + ((i * 31) % 30)}%`, background: BAR2, borderRadius: 8 }} />
        </div>
      </div>
      {/* 内容层（逐词显影） */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: 22, opacity: dev > 0.02 ? 1 : 0 }}>
        <div
          style={{
            width: 72, height: 72, borderRadius: 16, background: AVA[i], flex: 'none',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, fontWeight: 650, opacity: dev, letterSpacing: '-0.01em',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), inset 0 0 0 1px rgba(0,0,0,0.06)',
            transform: `scale(${0.7 + 0.3 * dev})`,
          }}
        >
          {NAMES[i][0]}
        </div>
        <div style={{ flex: 1, paddingTop: 2 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: TEXT, opacity: dev, letterSpacing: '-0.012em' }}>
            {NAMES[i]}
            <span style={{ fontWeight: 400, fontSize: 19, color: '#8c8c90', marginLeft: 12, fontVariantNumeric: 'tabular-nums', letterSpacing: 0 }}>9:0{i + 1} AM</span>
          </div>
          <div style={{ fontSize: 27, color: '#2e2d30', marginTop: 8, letterSpacing: '-0.006em' }}>
            {words.map((w, wi) => {
              const p = wordAt(wi, words.length);
              return (
                <span
                  key={wi}
                  style={{
                    display: 'inline-block',
                    marginRight: 8,
                    opacity: p,
                    transform: `translateY(${(1 - p) * 14}px)`,
                  }}
                >
                  {w}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// 骨架 / 内容两层叠放的小件：dev 0→1 交叉显影（与消息行同一套语法）
const Dual: React.FC<{ dev: number; skel: React.ReactNode; real: React.ReactNode; style?: React.CSSProperties }> = ({
  dev, skel, real, style,
}) => (
  <div style={{ position: 'relative', ...style }}>
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - dev, display: 'flex', alignItems: 'center' }}>{skel}</div>
    <div style={{ position: 'absolute', inset: 0, opacity: dev, display: 'flex', alignItems: 'center', transform: `translateY(${(1 - dev) * 6}px)` }}>{real}</div>
  </div>
);

const CHANNELS = ['general', 'rebrand', 'design-crit', 'launch-q4', 'random'];
const DMS = ['Ana Ruiz', 'Ben Ito', 'Kai Moreno'];

export const SkeletonReveal: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

  const SWAP = 32; // 涂鸦 → 骨架的那一拍

  // 涂鸦：煮沸抖动 + 一拍内被拉回替换（快速缩退 + 淡出，加速离场）
  const boil = Math.floor(f / 5);
  const doodleOut = interpolate(f, [SWAP, SWAP + 8], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const doodleVisible = f < SWAP + 9;

  // 骨架窗口：swap 时弹入
  const winIn = spring({ frame: f - SWAP, fps, config: { damping: 16, stiffness: 160, mass: 0.7 } });

  // 骨架列表滚入（第二拍）
  const rowSlide = (i: number) =>
    interpolate(f, [SWAP + 12 + i * 6, SWAP + 34 + i * 6], [520, 0], {
      ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1),
    });

  // 镜头推近：以窗口中心推 1→1.22，整窗始终入画
  const zoom = interpolate(f, [66, 142], [1, 1.22], { ...clamp, easing: Easing.inOut(Easing.cubic) });

  // 逐行显影
  const devAt = (i: number) =>
    interpolate(f, [80 + i * 13, 92 + i * 13], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  // 外围显影：顶栏/侧栏先于消息行一步变真，输入框最后
  const devHead = interpolate(f, [74, 88], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  const devSide = (k: number) => interpolate(f, [76 + k * 2, 90 + k * 2], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  const devComposer = interpolate(f, [128, 142], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });

  // 加载态 shimmer：骨架期扫一次（f 52→80），只作用主区
  const shimmer = interpolate(f, [52, 80], [-0.35, 1.25], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const shimmerOn = f > 52 && f < 80;

  // 逐词进场；最后一行最后一个词晚半拍（+14 帧）
  const wordAt = (row: number) => (w: number, n: number) => {
    const isLastWordOfLastRow = row === 3 && w === n - 1;
    const start = 82 + row * 13 + w * 2.5 + (isLastWordOfLastRow ? 14 : 0);
    return interpolate(f, [start, start + 9], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  };

  const sideInk = 'rgba(255,255,255,0.62)';
  return (
    <AbsoluteFill style={{ background: PAPER, fontFamily: FONT, overflow: 'hidden' }}>
      <Backdrop tone="light" light={{ x: 0.4, y: 0.16 }} grain={0} vignette={0.16} style={{ background: 'linear-gradient(180deg, #f5f3ee 0%, #efede7 100%)' }} />
      {/* 第三/二拍：骨架 UI 窗口 */}
      {f >= SWAP && (
        <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: '50% 50%' }}>
          {/* 窗口落地影（随弹入收紧） */}
          <div
            style={{
              position: 'absolute', left: 300, top: 900, width: 1320, height: 70, borderRadius: '50%',
              background: 'radial-gradient(closest-side, rgba(40,34,24,0.16), rgba(40,34,24,0))',
              opacity: Math.min(1, winIn * 1.5),
            }}
          />
          <div
            style={{
              position: 'absolute', left: 250, top: 140, width: 1420, height: 800,
              background: '#ffffff', border: '1px solid rgba(28,26,22,0.10)', borderRadius: 22,
              overflow: 'hidden', display: 'flex', boxSizing: 'border-box',
              boxShadow: '0 1px 2px rgba(28,24,18,0.06), 0 8px 18px -6px rgba(28,24,18,0.10), 0 40px 90px -30px rgba(28,24,18,0.28)',
              opacity: Math.min(1, winIn * 2),
              transform: `scale(${interpolate(winIn, [0, 1], [1.08, 1])})`,
            }}
          >
            {/* 侧栏 */}
            <div style={{
              width: 300, background: 'linear-gradient(180deg, #2b2c33 0%, #222329 100%)', padding: '28px 22px', boxSizing: 'border-box',
              display: 'flex', flexDirection: 'column', gap: 6, boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.05)',
            }}>
              <Dual
                dev={devSide(0)} style={{ height: 50, marginBottom: 18 }}
                skel={<div style={{ width: 46, height: 46, borderRadius: 12, background: '#55565c' }} />}
                real={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 46, height: 46, borderRadius: 12, background: 'linear-gradient(145deg, #e8836b, #c95c4a)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)', color: '#fff', fontWeight: 700, fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>N</div>
                    <div style={{ color: '#fff', fontSize: 21, fontWeight: 650, letterSpacing: '-0.01em' }}>Northwind</div>
                  </div>
                }
              />
              <div style={{ fontSize: 13, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.36)', fontWeight: 650, padding: '4px 10px', opacity: devSide(1) }}>CHANNELS</div>
              {CHANNELS.map((c, k) => (
                <Dual
                  key={c} dev={devSide(1 + k)} style={{ height: 38 }}
                  skel={<div style={{ height: 13, width: `${55 + ((k * 37) % 40)}%`, background: '#4c4d53', borderRadius: 7, marginLeft: 10 }} />}
                  real={
                    <div style={{
                      width: '100%', height: 38, borderRadius: 9, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 9, boxSizing: 'border-box',
                      background: c === 'rebrand' ? 'rgba(255,255,255,0.12)' : 'transparent', color: c === 'rebrand' ? '#fff' : sideInk,
                      fontSize: 19, fontWeight: c === 'rebrand' ? 650 : 450,
                    }}>
                      <span style={{ opacity: 0.6 }}>#</span>{c}
                    </div>
                  }
                />
              ))}
              <div style={{ fontSize: 13, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.36)', fontWeight: 650, padding: '18px 10px 4px', opacity: devSide(6) }}>DIRECT MESSAGES</div>
              {DMS.map((d, k) => (
                <Dual
                  key={d} dev={devSide(7 + k)} style={{ height: 38 }}
                  skel={<div style={{ height: 13, width: `${48 + ((k * 29) % 30)}%`, background: '#4c4d53', borderRadius: 7, marginLeft: 10 }} />}
                  real={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px', color: sideInk, fontSize: 19 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 6, background: AVA[k] }} />
                      {d}
                      {k === 0 && <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: 4, background: '#3fbf7f' }} />}
                    </div>
                  }
                />
              ))}
            </div>
            {/* 主区 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <div style={{ height: 72, borderBottom: '1px solid rgba(28,26,22,0.08)', display: 'flex', alignItems: 'center', padding: '0 34px', flex: 'none' }}>
                <Dual
                  dev={devHead} style={{ height: 40, flex: 1 }}
                  skel={<div style={{ height: 18, width: 230, background: BAR, borderRadius: 9 }} />}
                  real={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: TEXT, letterSpacing: '-0.015em' }}># rebrand</div>
                      <div style={{ fontSize: 18, color: '#8c8c90' }}>Logo, palette and launch deck</div>
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                        {AVA.map((a, k) => (
                          <div key={k} style={{ width: 28, height: 28, borderRadius: 8, background: a, marginLeft: k ? -6 : 0, boxShadow: '0 0 0 2px #fff' }} />
                        ))}
                        <span style={{ marginLeft: 10, fontSize: 17, color: '#6d6c70', fontVariantNumeric: 'tabular-nums' }}>12</span>
                      </div>
                    </div>
                  }
                />
              </div>
              <div style={{ flex: 1, padding: '30px 40px', display: 'flex', flexDirection: 'column', gap: 32, overflow: 'hidden', position: 'relative' }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ transform: `translateY(${rowSlide(i)}px)`, opacity: rowSlide(i) > 500 ? 0 : 1 }}>
                    <Row i={i} dev={devAt(i)} wordAt={wordAt(i)} />
                  </div>
                ))}
                {/* 加载态 shimmer：lighten 混合只提亮灰条，白底不变 */}
                {shimmerOn && (
                  <div style={{
                    position: 'absolute', inset: 0, mixBlendMode: 'lighten', pointerEvents: 'none',
                    background: `linear-gradient(100deg, rgba(246,246,244,0) ${(shimmer - 0.18) * 100}%, rgba(246,246,244,1) ${shimmer * 100}%, rgba(246,246,244,0) ${(shimmer + 0.18) * 100}%)`,
                  }} />
                )}
              </div>
              {/* 输入框 */}
              <div style={{ padding: '0 40px 32px', flex: 'none' }}>
                <div style={{
                  height: 70, borderRadius: 14, border: '1px solid rgba(28,26,22,0.14)', boxSizing: 'border-box', padding: '0 22px',
                  display: 'flex', alignItems: 'center', boxShadow: '0 1px 2px rgba(28,24,18,0.04)',
                }}>
                  <Dual
                    dev={devComposer} style={{ height: 40, flex: 1 }}
                    skel={<div style={{ height: 15, width: 260, background: BAR2, borderRadius: 8 }} />}
                    real={
                      <div style={{ display: 'flex', alignItems: 'center', width: '100%', fontSize: 21, color: '#9a999d' }}>
                        Message #rebrand
                        <div style={{ marginLeft: 'auto', width: 40, height: 40, borderRadius: 10, background: '#2f8d6c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width={18} height={18} viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2.5 8h10" /><path d="M8.5 3.5 13 8l-4.5 4.5" />
                          </svg>
                        </div>
                      </div>
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* 第一拍：手绘涂鸦占位（在骨架之上，一拍内缩退让位） */}
      {doodleVisible && (
        <AbsoluteFill
          style={{
            background: PAPER,
            opacity: 1 - doodleOut,
            transform: `scale(${1 - doodleOut * 0.14})`,
            transformOrigin: '50% 50%',
          }}
        >
          <Backdrop tone="light" light={{ x: 0.4, y: 0.16 }} grain={0} vignette={0.16} style={{ background: 'linear-gradient(180deg, #f5f3ee 0%, #efede7 100%)' }} />
          <Doodle boil={boil} />
        </AbsoluteFill>
      )}
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};
