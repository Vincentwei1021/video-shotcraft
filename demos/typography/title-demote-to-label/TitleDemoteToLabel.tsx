// title-demote-to-label —— 大标题降格为节标签
// 源：perplexity-promo 16–18.5s。大标题居中显影站稳一拍，随后缩小 ~0.3x
// 平移到左上角变小节标签，内容区（灰阶骨架块）在其下方生长。
// 附加变体（framer text-selection-title）：标题登场带文本选中蓝高亮块、随后撤掉。
//
// 质感升级：
// - 内容区从灰条骨架换成出版级假内容：节标题下一条发丝分隔线 + 4 行真实正文 + 一张列表卡
//   （状态 chip / 进度条 / 元信息），生长仍是"宽度 0.35→1 + 上移 28px + 淡入"，宽度改为裁切揭开（字不被压扁）。
// - 降格飞行按真实速度加方向性运动模糊（静止为 0）；标题系统 SF 栈 700、-0.04em 字距。
// - B 式选中高亮换成系统选区蓝 + 扫入时跟随的 2px 插入光标。
// - 柔光 Backdrop 替代 #ececea 平铺；两式串播的 4f 白闪改成暖白。补导出时长 196f（A 92f + B 104f）。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { G } from '../../_fixtures/Fixtures';
import { Backdrop, FONT as PFONT, SpeedBlur, surface } from '../../_fixtures/Polish';

const FONT = PFONT.sans;
const SEL = 'rgba(0, 110, 245, 0.24)'; // 系统选区蓝
const CARET = '#1a6cf0';

const SPLIT = 92; // 变体 A 时长
export const TITLE_DEMOTE_TO_LABEL_DURATION = SPLIT + 104; // A 92f + B 104f = 196f

type Row = { name: string; meta: string; chip: string; chipTone: 'accent' | 'muted' | 'soft'; progress?: number };
type Content = { lines: string[]; cardTitle: string; cardMeta: string; rows: Row[] };

const CONTENT_A: Content = {
  lines: [
    'Each subagent runs in its own context window with a focused brief.',
    'The lead agent fans work out in parallel, then merges what comes back.',
    'Results stream into this thread as soon as each task completes,',
    'so you can review early findings before the run finishes.',
  ],
  cardTitle: 'Active runs',
  cardMeta: '3 agents · 1m 42s',
  rows: [
    { name: 'Search codebase for auth flows', meta: '18 files', chip: 'Running', chipTone: 'accent', progress: 0.64 },
    { name: 'Summarize open pull requests', meta: '7 PRs', chip: 'Done', chipTone: 'soft', progress: 1 },
    { name: 'Draft migration plan', meta: 'waiting on 1', chip: 'Queued', chipTone: 'muted', progress: 0 },
  ],
};
const CONTENT_B: Content = {
  lines: [
    'Highlight any sentence in the response to ask a follow-up about it.',
    'Selections keep their source, so every answer stays traceable.',
    'Drag across a passage, then refine, cite, or rewrite it in place.',
    'Nothing leaves the page until you choose to share it.',
  ],
  cardTitle: 'Sources',
  cardMeta: '3 cited',
  rows: [
    { name: 'Design notes — v3.pdf', meta: 'p. 12', chip: 'Cited', chipTone: 'accent' },
    { name: 'Research log, March 14', meta: '§ 4', chip: 'Cited', chipTone: 'accent' },
    { name: 'Interview transcript', meta: '02:41', chip: 'Linked', chipTone: 'soft' },
  ],
};

const Chip: React.FC<{ label: string; tone: Row['chipTone'] }> = ({ label, tone }) => {
  const c =
    tone === 'accent'
      ? { bg: G.accentSoft, fg: G.accent, dot: G.accent }
      : tone === 'soft'
        ? { bg: G.fill, fg: G.ink2, dot: '#3f9d6b' }
        : { bg: G.fill, fg: G.ink3, dot: G.ink3 };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 13px 5px 11px',
        borderRadius: 999,
        background: c.bg,
        color: c.fg,
        fontSize: 21,
        fontWeight: 600,
        letterSpacing: '0.005em',
        boxShadow: `inset 0 0 0 1px ${G.hairline}`,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 4, background: c.dot }} />
      {label}
    </span>
  );
};

// 生长块：宽度 0.35→1（裁切揭开，内容不变形）+ 上移 28px + 淡入
const Grow: React.FC<{ t: number; i: number; children: React.ReactNode }> = ({ t, i, children }) => {
  const bt = interpolate(t, [i * 0.16, i * 0.16 + 0.3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const w = 0.35 + 0.65 * bt;
  return (
    <div
      style={{
        opacity: bt,
        transform: `translateY(${((1 - bt) * 28).toFixed(2)}px)`,
        clipPath: bt < 1 ? `inset(-40px ${((1 - w) * 100).toFixed(2)}% -40px 0)` : undefined,
      }}
    >
      {children}
    </div>
  );
};

// 内容区：分隔线 + 4 行正文 + 列表卡，随 t 依次生长
const ContentArea: React.FC<{ t: number; c: Content }> = ({ t, c }) => (
  <div style={{ width: 1560, fontFamily: FONT }}>
    <Grow t={t} i={0}>
      <div style={{ height: 1, background: G.hairlineStrong, marginBottom: 34 }} />
    </Grow>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {c.lines.map((line, i) => (
        <Grow key={i} t={t} i={i * 0.75 + 0.3}>
          <div style={{ fontSize: 34, lineHeight: '46px', color: i === 0 ? G.ink1 : G.ink2, letterSpacing: '-0.012em', whiteSpace: 'nowrap' }}>
            {line}
          </div>
        </Grow>
      ))}
    </div>
    <div style={{ height: 40 }} />
    <Grow t={t} i={3.6}>
      <div style={{ ...surface({ elevation: 6, radius: 18 }), width: 1560, padding: '22px 30px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: 16, borderBottom: `1px solid ${G.hairline}` }}>
          <span style={{ fontSize: 26, fontWeight: 650, color: G.ink1, letterSpacing: '-0.01em' }}>{c.cardTitle}</span>
          <span style={{ fontSize: 21, color: G.ink3, fontVariantNumeric: 'tabular-nums' }}>{c.cardMeta}</span>
        </div>
        {c.rows.map((r, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 22,
              height: 70,
              borderBottom: i < c.rows.length - 1 ? `1px solid ${G.hairline}` : 'none',
            }}
          >
            <span style={{ width: 34, height: 34, borderRadius: 9, background: G.fill, boxShadow: `inset 0 0 0 1px ${G.hairline}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: G.ink2 }}>
              {i + 1}
            </span>
            <span style={{ flex: 1, fontSize: 26, color: G.ink1, fontWeight: 500, letterSpacing: '-0.008em' }}>{r.name}</span>
            {r.progress !== undefined && (
              <span style={{ width: 200, height: 6, borderRadius: 3, background: G.fill2, overflow: 'hidden' }}>
                <span style={{ display: 'block', width: `${r.progress * 100}%`, height: '100%', borderRadius: 3, background: r.progress >= 1 ? '#9fc9b0' : G.accent }} />
              </span>
            )}
            <span style={{ width: 130, textAlign: 'right', fontSize: 21, color: G.ink3, fontVariantNumeric: 'tabular-nums' }}>{r.meta}</span>
            <span style={{ width: 128, display: 'flex', justifyContent: 'flex-end' }}>
              <Chip label={r.chip} tone={r.chipTone} />
            </span>
          </div>
        ))}
      </div>
    </Grow>
  </div>
);

// 一个完整的"显影→(可选高亮)→降格→内容生长"小节
const DemoteScene: React.FC<{
  frame: number;
  title: string;
  withSelection: boolean;
  content: Content;
}> = ({ frame, title, withSelection, content }) => {
  // 时间轴（局部帧）
  const REVEAL = 0; // 0–12 显影
  const SEL_ON = 14; // 高亮扫入 14–24
  const SEL_OFF = 32; // 高亮撤掉 32–40
  const DEMOTE = withSelection ? 44 : 32; // 降格开始
  const DEMOTE_END = DEMOTE + 20;
  const GROW = DEMOTE + 12;

  // 显影：blur + 淡入（附 1.03→1 轻收）
  const rev = interpolate(frame, [REVEAL, REVEAL + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // 降格补间：scale 1 -> 0.3，中心 -> 左上（同一条 inOut(cubic) 曲线）
  const demAt = (fr: number) =>
    interpolate(fr, [DEMOTE, DEMOTE_END], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.inOut(Easing.cubic),
    });
  const dem = demAt(frame);
  const scale = interpolate(dem, [0, 1], [1, 0.3]) * (1.03 - 0.03 * rev);
  const x = interpolate(dem, [0, 1], [960, 150]);
  const y = interpolate(dem, [0, 1], [480, 110]);
  // 飞行速度（px/帧）：位置差分，喂方向性运动模糊（模糊量按缩放后视觉尺寸再打折）
  const vx = (demAt(frame + 0.5) - demAt(frame - 0.5)) * (150 - 960);
  const vy = (demAt(frame + 0.5) - demAt(frame - 0.5)) * (110 - 480);

  // 高亮块：从左扫入盖住文字，再从左撤掉
  let selLeft = 0;
  let selWidth = 0;
  let caret = 0;
  if (withSelection) {
    const on = interpolate(frame, [SEL_ON, SEL_ON + 10], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.quad),
    });
    const off = interpolate(frame, [SEL_OFF, SEL_OFF + 8], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.in(Easing.quad),
    });
    selLeft = off * 100;
    selWidth = Math.max(0, on * 100 - selLeft);
    // 插入光标：扫入时跟着选区右缘走，hold 期常亮，撤选区时随之淡出
    caret = frame >= SEL_ON && frame < SEL_OFF + 4 ? 1 - off : 0;
  }

  const growT = interpolate(frame, [GROW, GROW + 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Backdrop tone="light" light={{ x: 0.3, y: 0.16 }} accent="#5b63d3" grain={0.045} vignette={0.12} />
      {/* 内容区 */}
      <div style={{ position: 'absolute', left: 150, top: 168 }}>
        <ContentArea t={growT} c={content} />
      </div>
      {/* 标题：transform-origin 左中，位置补间；飞行段按速度加运动模糊 */}
      <SpeedBlur vx={vx} vy={vy} amount={0.22} max={10}>
        <div
          style={{
            position: 'absolute',
            left: x,
            top: y,
            transform: `translate(${-(1 - dem) * 50}%, -50%) scale(${scale.toFixed(4)})`,
            transformOrigin: 'left center',
            opacity: rev,
            filter: rev < 1 ? `blur(${((1 - rev) * 12).toFixed(2)}px)` : undefined,
          }}
        >
          <div
            style={{
              position: 'relative',
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 128,
              color: G.ink1,
              letterSpacing: '-0.04em',
              whiteSpace: 'nowrap',
              padding: '10px 18px',
            }}
          >
            {withSelection && selWidth > 0 && (
              <div
                style={{
                  position: 'absolute',
                  left: `${selLeft}%`,
                  top: 10,
                  width: `${selWidth}%`,
                  height: 'calc(100% - 20px)',
                  background: SEL,
                  borderRadius: 4,
                }}
              />
            )}
            {caret > 0 && (
              <div
                style={{
                  position: 'absolute',
                  left: `calc(${selLeft + selWidth}% - 1px)`,
                  top: 6,
                  width: 3,
                  height: 'calc(100% - 12px)',
                  borderRadius: 2,
                  background: CARET,
                  opacity: caret,
                }}
              />
            )}
            <span style={{ position: 'relative' }}>{title}</span>
          </div>
        </div>
      </SpeedBlur>
    </AbsoluteFill>
  );
};

export const TitleDemoteToLabel: React.FC = () => {
  const frame = useCurrentFrame();

  if (frame < SPLIT) {
    return <DemoteScene frame={frame} title="Running Subagents" withSelection={false} content={CONTENT_A} />;
  }
  // 变体 B：文本选中态高亮登场
  const f = frame - SPLIT;
  // 暖白闪转场 4f
  const flash = interpolate(f, [0, 4], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill>
      <DemoteScene frame={f} title="Select the Answer" withSelection={true} content={CONTENT_B} />
      <AbsoluteFill style={{ background: '#fbfaf7', opacity: flash, pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};
