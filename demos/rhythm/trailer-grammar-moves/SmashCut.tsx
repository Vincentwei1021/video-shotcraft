// smash-cut｜猛切（喧闹→死寂）
//
// 第二轮重设计（「通知风暴 → 静音」· 轰鸣段暗红余烬、死寂段 sand 暖米色）：
// - 轰鸣段 0–41f：故事是"被通知淹没"。画面中央一只 300px 的未读计数器从 212 加速冲向 1,284
//   （ease-in：越数越快），背后红色辉光随动势增强；12 张通知卡（构建失败 / @here / P1 告警 / 逾期账单…
//   全部虚构）从中心像星际穿越一样朝镜头加速冲脸飞出画外（scale 0.5→2.6，ease-in），
//   两轮、第二轮更快更密——整体仍在加速；飞卡按瞬时速度沿各自飞行方向做方向性模糊（速度门控）；
//   背景层 ease-in 推近 1→1.5 并滚动 2°，暗角随动势收紧。切点前 3f 动势仍在最猛处，绝不减速。
// - 42f 一帧硬切：暖米色静止海报——左侧「0」mega 字 + 「unread.」，一句副文案，
//   右侧一枚已打开的 Do Not Disturb 大开关。1,284 → 0 的数字反差就是"喧闹→死寂"本身。
//   死寂段是纯静态子树：无颗粒、无呼吸、无任何随帧变化（帧函数级真静止），停满 93f。
//
// 时间表（30fps，共 135f）：
//   0–42    轰鸣：计数 ease-in 加速；飞卡第一轮 0–35（每张 18f）、第二轮 16–50（每张 12f，更密，末几张被切点截断）
//   42      硬切（无过渡、无闪白——反差全靠内容与色温）
//   42–135  死寂 93f
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { FONT, Grain, Vignette } from '../../_fixtures/Polish';
import { LOOKS, alpha, type } from '../../_fixtures/Look';

export const SMASH_CUT_DURATION = 135;

const CUT = 42;
const S = LOOKS.sand; // 死寂段
const RED = '#ff4a3d';

const easeIn = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x;
};

// ───────────── 通知卡 ─────────────
type Note = { title: string; meta: string; color: string; glyph: string };
const NOTES: Note[] = [
  { title: 'Build #4821 failed', meta: 'main · 3 checks red', color: '#ff4a3d', glyph: '✕' },
  { title: '@here standup moved', meta: '#eng-core · 14 replies', color: '#9b7bff', glyph: '#' },
  { title: 'CPU 98% on api-3', meta: 'Beacon alert · P1', color: '#ff9a2e', glyph: '!' },
  { title: 'Invoice overdue', meta: 'Ledgerly · 2 days late', color: '#2fc28a', glyph: '$' },
  { title: '1:1 starts in 2 min', meta: 'Calendar · Room 4B', color: '#3d8bff', glyph: '◷' },
  { title: '37 new comments', meta: 'Spec · Q4 roadmap', color: '#f5c542', glyph: '✎' },
  { title: 'Deploy rolled back', meta: 'prod-eu · automatic', color: '#ff4a3d', glyph: '↺' },
  { title: 'Trial ends today', meta: 'Upgrade to keep access', color: '#ff6bb5', glyph: '★' },
  { title: 'Payment failed', meta: 'Card ending 4417', color: '#ff7a59', glyph: '!' },
  { title: 'Review requested', meta: 'PR #902 · 2 reviewers', color: '#56b6ff', glyph: '⇄' },
  { title: 'Disk 91% full', meta: 'db-primary · warning', color: '#ffb020', glyph: '▲' },
  { title: 'New sign-in detected', meta: 'Unknown device · Oslo', color: '#c084fc', glyph: '◎' },
];
// 飞行方向（屏幕角度，度）：散布在一圈上，避开正左正右的重复
const DIRS = [200, 335, 25, 150, 255, 290, 110, 70, 178, 10, 232, 128];

const NOTE_W = 520;
const NOTE_H = 132;

// 卡 i 第 k 轮的窗口：第一轮 18f、第二轮 12f（更快）；第二轮的末几张在 42f 被硬切截断
const windowOf = (i: number, k: number): [number, number] => {
  if (k === 0) {
    const s = i * 1.5;
    return [s, s + 18];
  }
  const s = 16 + i * 2;
  return [s, s + 12];
};

const NoteCard: React.FC<{ n: Note }> = ({ n }) => (
  <div
    style={{
      width: NOTE_W,
      height: NOTE_H,
      borderRadius: 30,
      background: 'linear-gradient(180deg, rgba(48,30,28,0.96) 0%, rgba(30,18,17,0.96) 100%)',
      border: '1px solid rgba(255,200,190,0.14)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 30px 60px -20px rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      gap: 24,
      padding: '0 30px',
      boxSizing: 'border-box',
    }}
  >
    <div
      style={{
        width: 72,
        height: 72,
        borderRadius: 20,
        flexShrink: 0,
        background: n.color,
        color: '#140806',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...type(38, 800),
      }}
    >
      {n.glyph}
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{ ...type(34, 700), color: '#fff3ef', whiteSpace: 'nowrap' }}>{n.title}</div>
      <div style={{ ...type(26, 500), color: 'rgba(255,220,210,0.6)', whiteSpace: 'nowrap', marginTop: 4 }}>{n.meta}</div>
    </div>
    <div style={{ position: 'absolute', right: 22, top: 18, width: 16, height: 16, borderRadius: 8, background: RED, boxShadow: `0 0 12px ${RED}` }} />
  </div>
);

const Flyer: React.FC<{ i: number; frame: number }> = ({ i, frame }) => {
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  let win: [number, number] | null = null;
  for (let k = 0; k < 2; k++) {
    const [s, e] = windowOf(i, k);
    if (frame >= s && frame < e) win = [s, e];
  }
  if (!win) return null;
  const [s, e] = win;
  const a = (DIRS[i] * Math.PI) / 180;
  const R0 = 250, R1 = 1700;
  const pAt = (f: number) => easeIn((f - s) / (e - s));
  const p = pAt(frame);
  const r = R0 + (R1 - R0) * p;
  const x = Math.cos(a) * r;
  const y = Math.sin(a) * r * 0.62; // 纵向压扁：横屏里飞行轨迹更"平"
  const scale = 0.5 + 2.1 * p;
  const tilt = Math.cos(a) * 8 * p;
  // 瞬时速度（屏幕 px/帧）→ 沿飞行方向的模糊；门控 20px/f 起，封顶 18（按倍率折回本地坐标）
  const dp = pAt(frame + 0.5) - pAt(frame - 0.5);
  const vx = Math.cos(a) * (R1 - R0) * dp;
  const vy = Math.sin(a) * (R1 - R0) * 0.62 * dp;
  const speed = Math.hypot(vx, vy);
  const sd = Math.min(18, Math.max(0, speed - 20) * 0.11) / scale;
  const dir = (Math.atan2(vy, vx) * 180) / Math.PI;
  const fid = `nb-${i}-${uid}`;
  const fadeIn = Math.min(1, (frame - s) / 3);
  return (
    <div
      style={{
        position: 'absolute',
        left: 960 - NOTE_W / 2,
        top: 540 - NOTE_H / 2,
        width: NOTE_W,
        height: NOTE_H,
        transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${scale.toFixed(4)})`,
        opacity: fadeIn,
        zIndex: Math.round(scale * 10),
      }}
    >
      {sd > 0.3 && (
        <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
          <filter id={fid} x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`${sd.toFixed(2)} 0`} edgeMode="none" />
          </filter>
        </svg>
      )}
      <div style={{ position: 'absolute', inset: 0, transform: `rotate(${dir}deg)`, filter: sd > 0.3 ? `url(#${fid})` : undefined }}>
        <div style={{ position: 'absolute', inset: 0, transform: `rotate(${(-dir + tilt).toFixed(2)}deg)` }}>
          <NoteCard n={NOTES[i]} />
        </div>
      </div>
    </div>
  );
};

// ───────────── 死寂段：纯静态海报 ─────────────
const Quiet: React.FC = () => (
  <AbsoluteFill style={{ background: `linear-gradient(180deg, ${S.bg[0]} 0%, ${S.bg[1]} 55%, ${S.bg[2]} 100%)`, fontFamily: FONT.sans }}>
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 55% 60% at 30% 30%, ${alpha(S.light, 0.9)} 0%, ${alpha(S.light, 0)} 70%)` }} />
    <div style={{ position: 'absolute', left: 160, top: 210 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, ...type(26, 700, { mono: true }), letterSpacing: '0.28em', color: S.accent }}>
        <span style={{ width: 14, height: 14, borderRadius: 7, background: S.accent }} />
        HUSH · FOCUS MODE
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 36, marginTop: 10 }}>
        <span style={{ ...type(420, 760), letterSpacing: '-0.06em', color: S.ink, lineHeight: 1 }}>0</span>
        <span style={{ ...type(120, 600), color: S.ink2 }}>unread.</span>
      </div>
      <div style={{ ...type(44, 450), color: S.ink2, marginTop: 34 }}>Everything else can wait until 4 pm.</div>
    </div>
    {/* 右侧：已打开的勿扰开关 */}
    <div
      style={{
        position: 'absolute',
        right: 150,
        top: 380,
        width: 480,
        padding: '40px 44px',
        borderRadius: 40,
        background: S.surface,
        border: `1px solid ${S.line}`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 6px ${alpha(S.shadow, 0.08)}, 0 40px 80px -30px ${alpha(S.shadow, 0.28)}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ ...type(38, 700), color: S.ink }}>Do not disturb</div>
          <div style={{ ...type(30, 500), color: S.ink3, marginTop: 8 }}>On until 4:00 pm</div>
        </div>
      </div>
      <div style={{ marginTop: 34, width: 236, height: 128, borderRadius: 64, background: S.accent, position: 'relative', boxShadow: `inset 0 2px 6px ${alpha('#5a1d08', 0.35)}` }}>
        <div style={{ position: 'absolute', right: 10, top: 10, width: 108, height: 108, borderRadius: 54, background: '#fffaf3', boxShadow: `0 6px 14px ${alpha('#5a1d08', 0.35)}` }} />
      </div>
    </div>
    <Vignette strength={0.14} inner={0.55} color={S.shadow} />
  </AbsoluteFill>
);

export const SmashCut: React.FC = () => {
  const frame = useCurrentFrame();

  // —— 死寂段：42f 起纯静态子树 ——
  if (frame >= CUT) return <Quiet />;

  // —— 轰鸣段：全部 ease-in，切点前仍在加速 ——
  const k = easeIn(frame / CUT) * 0.6 + (frame / CUT) * 0.4; // 起步就有动势，后段猛加速
  const bgScale = 1 + 0.5 * easeIn(frame / CUT);
  const bgRot = 2 * easeIn(frame / CUT);
  const count = Math.round(212 + (1284 - 212) * easeIn(frame / CUT));
  // 计数跳变速度 → 数字的竖向抖糊（数字在"滚"）
  const cps = (1284 - 212) * (easeIn((frame + 0.5) / CUT) - easeIn((frame - 0.5) / CUT));
  const numBlur = Math.min(6, cps * 0.05);

  return (
    <AbsoluteFill style={{ background: '#090303', overflow: 'hidden', fontFamily: FONT.sans }}>
      {/* 背景：推近 + 滚动的红色辉光与同心环（动势越猛越亮） */}
      <AbsoluteFill style={{ transform: `scale(${bgScale.toFixed(4)}) rotate(${bgRot.toFixed(3)}deg)`, transformOrigin: '50% 50%' }}>
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 46% 52% at 50% 50%, ${alpha(RED, 0.18 + 0.32 * k)} 0%, ${alpha('#5a0d08', 0.25 + 0.2 * k)} 45%, rgba(9,3,3,0) 75%)`,
          }}
        />
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
          {Array.from({ length: 7 }, (_, i) => {
            // 同心环向外扩（一圈圈"通知涟漪"，扩散速度也在加速）
            const ph = (((frame * (0.018 + 0.03 * k) + i / 7) % 1) + 1) % 1;
            return (
              <ellipse
                key={i}
                cx={960}
                cy={540}
                rx={120 + ph * 1100}
                ry={(120 + ph * 1100) * 0.62}
                fill="none"
                stroke={alpha(RED, (1 - ph) * (0.12 + 0.2 * k))}
                strokeWidth={2}
              />
            );
          })}
        </svg>
      </AbsoluteFill>

      {/* 计数器 */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 316, textAlign: 'center', transform: `scale(${(1 + 0.18 * k).toFixed(4)})` }}>
        <div style={{ ...type(30, 700, { mono: true }), letterSpacing: '0.4em', color: alpha('#ffd9d2', 0.75) }}>UNREAD</div>
        <div
          style={{
            ...type(300, 820),
            letterSpacing: '-0.05em',
            lineHeight: 1,
            marginTop: 16,
            color: '#fff1ec',
            textShadow: `0 0 ${(30 + 50 * k).toFixed(0)}px ${alpha(RED, 0.5 + 0.3 * k)}`,
            filter: numBlur > 0.3 ? `blur(${(numBlur * 0.3).toFixed(2)}px)` : undefined,
          }}
        >
          {count.toLocaleString('en-US')}
        </div>
      </div>

      <Vignette strength={0.3 + 0.35 * k} inner={0.48 - 0.16 * k} color="#000000" />

      {DIRS.map((_, i) => (
        <Flyer key={i} i={i} frame={frame} />
      ))}
      <Grain opacity={0.09} blend="soft-light" />
    </AbsoluteFill>
  );
};
