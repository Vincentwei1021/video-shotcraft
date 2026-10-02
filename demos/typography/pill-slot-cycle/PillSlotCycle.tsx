// pill-slot-cycle —— 句中词槽轮换：固定句干 + 句尾 pill 老虎机式滚一格
// 源：notion-ai 4.5–8.5s。旧 pill 上飞淡出、新 pill 从下带运动模糊滑入，
// 连换 6 次后 pill 消失、句子落成 "One AI tool to do it all." 收束。
//
// 质感升级：
// - pill 绕"滚筒"翻入翻出：入场 rotateX -38°→0 + 0.94→1，出场 0→34° + 1→0.94（perspective 1400），
//   竖向运动模糊按真实速度计算（SVG 只在 y 轴模糊），静止为 0。
// - pill 材质：白面 + 发丝线 + 顶部内高光 + 随"离槽高度"变化的两层软阴影；图标换同一套线性 SVG，
//   落在强调色浅底小方块里（替代 Unicode 字符 ▲ ☰ 等字体回退字形）。
// - 系统字体栈 + 负字距；柔光 Backdrop 替代 #ececea 平铺。
// - 收束：结论句落位后，整行用 smooth 缓缓居中（句干在列举期间仍纹丝不动），再 hold ≥45f。
import React, { useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { G } from '../../_fixtures/Fixtures';
import { Backdrop, EASE, FONT as PFONT, mix, ramp, softShadow, innerHighlight } from '../../_fixtures/Polish';

const FONT = PFONT.sans;

type IconKey = 'ask' | 'drive' | 'slack' | 'sum' | 'pen' | 'agenda';
const PILLS: { label: string; icon: IconKey }[] = [
  { label: 'Ask a question', icon: 'ask' },
  { label: 'Find in Drive', icon: 'drive' },
  { label: 'Find in Slack', icon: 'slack' },
  { label: 'Summarize', icon: 'sum' },
  { label: 'Improve writing', icon: 'pen' },
  { label: 'Draft an agenda', icon: 'agenda' },
];

const BEAT = 21; // ~0.7s @30fps
const INTRO = 12; // 句干入场
const CYCLES = PILLS.length;
const SWAP = 8; // 每拍前 8f 完成换位
const FIN = 14; // 收束句落位
const CENTER = 26; // 落位后整行缓缓居中
// 12f 入场 + 6×21f 列举 + 14f 收束 + 48f 完整句 hold
export const PILL_SLOT_CYCLE_DURATION = INTRO + CYCLES * BEAT + FIN + 48; // 200f ≈ 6.7s

const STEM_LEFT = 300; // 句干左端锚点（列举期间纹丝不动）
const STEM_GAP = 36;
const WORD_GAP = 18; // 结论句里 "to" 与 "do" 之间是普通词距，不是槽位间距

// 线性图标（24 视框，stroke 继承 currentColor）
const Icon: React.FC<{ k: IconKey }> = ({ k }) => {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width={34} height={34} viewBox="0 0 24 24" style={{ display: 'block' }}>
      {k === 'ask' && (
        <>
          <circle cx="12" cy="12" r="9" {...p} />
          <path d="M9.6 9.3a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2.2-2.4 3.7" {...p} />
          <circle cx="12" cy="17.2" r="0.6" fill="currentColor" />
        </>
      )}
      {k === 'drive' && <path d="M8.6 3.5h6.8l6.1 10.6-3.4 5.9H5.9l-3.4-5.9zM8.6 3.5l6.1 10.6h6.8M5.9 20l6.1-10.6" {...p} />}
      {k === 'slack' && <path d="M9.5 3.5 7.8 20.5M16.2 3.5l-1.7 17M4 9h16.5M3.5 15H20" {...p} />}
      {k === 'sum' && <path d="M4 6h16M4 10.5h16M4 15h10M4 19.5h6" {...p} />}
      {k === 'pen' && (
        <>
          <path d="M14.5 4.8 19.2 9.5 9 19.7l-5.2.5.5-5.2z" {...p} />
          <path d="M12.6 6.7l4.7 4.7" {...p} />
        </>
      )}
      {k === 'agenda' && (
        <>
          <rect x="3.5" y="5" width="17" height="15" rx="2.5" {...p} />
          <path d="M3.5 9.5h17M8 3v4M16 3v4M7.5 13.5h4M7.5 16.5h7" {...p} />
        </>
      )}
    </svg>
  );
};

// pill 本体；lift = 离槽高度（0 落槽 → 1 飞行中），驱动阴影大小与虚实
const Pill: React.FC<{ label: string; icon: IconKey; lift?: number; style?: React.CSSProperties }> = ({
  label,
  icon,
  lift = 0,
  style,
}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 18,
      padding: '14px 38px 14px 18px',
      borderRadius: 999,
      background: 'linear-gradient(180deg, #ffffff 0%, #fafafb 100%)',
      border: '1px solid rgba(20,22,28,0.10)',
      boxShadow: `${innerHighlight(0.95)}, ${softShadow(6 + lift * 30)}`,
      fontFamily: FONT,
      fontWeight: 700,
      fontSize: 64,
      letterSpacing: '-0.025em',
      color: G.ink1,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    <span
      style={{
        width: 62,
        height: 62,
        borderRadius: 18,
        background: G.accentSoft,
        boxShadow: 'inset 0 0 0 1px rgba(91,99,211,0.14)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: G.accent,
        flexShrink: 0,
      }}
    >
      <Icon k={icon} />
    </span>
    {label}
  </div>
);

// 竖向运动模糊滤镜（只在 y 轴模糊；std<0.3 时不挂滤镜）
const VBlur: React.FC<{ id: string; std: number }> = ({ id, std }) => (
  <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
    <filter id={id} x="-10%" y="-60%" width="120%" height="220%">
      <feGaussianBlur stdDeviation={`0 ${std.toFixed(2)}`} />
    </filter>
  </svg>
);

// 入场位移曲线（像素）：从下 +120 强 ease-out 落槽
const inYAt = (bf: number) => mix(120, 0, ramp(bf, 0, SWAP, EASE.snappy));
// 出场位移曲线：向上 -130 ease-in 加速飞出
const outYAt = (bf: number) => mix(0, -130, ramp(bf, 0, SWAP - 1, EASE.exit));

export const PillSlotCycle: React.FC = () => {
  const frame = useCurrentFrame();

  // 量最终句宽（"One AI tool to" + gap + "do it all."），用于收束后居中
  const finalRef = useRef<HTMLDivElement>(null);
  const [finalW, setFinalW] = useState(1240);
  useLayoutEffect(() => {
    if (finalRef.current) setFinalW(finalRef.current.offsetWidth || 1240);
  }, []);

  // 句干入场：ease-out 上浮淡入 + 轻虚化收拢
  const stemT = ramp(frame, 0, INTRO, EASE.out);

  const cycleStart = INTRO;
  const cycleEnd = cycleStart + CYCLES * BEAT;

  // 当前处于第几个 pill 拍
  const rel = frame - cycleStart;
  const idx = Math.max(0, Math.min(Math.floor(rel / BEAT), CYCLES - 1));
  const beatFrame = rel - idx * BEAT;

  // 收束段：pill 上飞消失，"do it all." 从下滑入落位（全片唯一一次过冲）
  const isFinale = frame >= cycleEnd;
  const finT = interpolate(frame, [cycleEnd, cycleEnd + FIN], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.4)),
  });
  // 落位后整行缓缓居中
  const centerT = ramp(frame, cycleEnd + FIN - 2, CENTER, EASE.smooth);
  const shiftX = centerT * ((1920 - finalW) / 2 - STEM_LEFT);

  const stemStyle: React.CSSProperties = {
    fontFamily: FONT,
    fontWeight: 800,
    fontSize: 96,
    color: G.ink1,
    letterSpacing: '-0.035em',
    whiteSpace: 'nowrap',
  };

  // 槽内容渲染
  let slot: React.ReactNode = null;
  if (!isFinale && rel >= 0) {
    const incoming = PILLS[idx];
    const outgoing = idx > 0 ? PILLS[idx - 1] : null;

    // 新 pill：从下 +120px 绕滚筒翻入，blur 按速度
    const inT = ramp(beatFrame, 0, SWAP, EASE.snappy);
    const inY = inYAt(beatFrame);
    const inV = Math.abs(inYAt(beatFrame + 0.5) - inYAt(beatFrame - 0.5));
    const inBlur = Math.min(14, inV * 0.55);

    // 旧 pill：向上 -130px 加速翻出淡掉
    const outT = ramp(beatFrame, 0, SWAP - 1, EASE.exit);
    const outY = outYAt(beatFrame);
    const outV = Math.abs(outYAt(beatFrame + 0.5) - outYAt(beatFrame - 0.5));
    const outBlur = Math.min(12, outV * 0.45);

    slot = (
      <div style={{ position: 'relative', display: 'inline-block', perspective: 1400 }}>
        <VBlur id="psc-in" std={inBlur} />
        <VBlur id="psc-out" std={outBlur} />
        {/* 撑起槽宽度的隐形占位（当前 pill） */}
        <Pill label={incoming.label} icon={incoming.icon} style={{ visibility: 'hidden' }} />
        {outgoing && outT < 1 && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              transformOrigin: '50% 100%',
              transform: `translateY(${outY.toFixed(2)}px) rotateX(${(34 * outT).toFixed(2)}deg) scale(${mix(1, 0.94, outT).toFixed(4)})`,
              opacity: 1 - outT,
              filter: outBlur > 0.3 ? 'url(#psc-out)' : undefined,
            }}
          >
            <Pill label={outgoing.label} icon={outgoing.icon} lift={outT} />
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transformOrigin: '50% 0%',
            transform: `translateY(${inY.toFixed(2)}px) rotateX(${(-38 * (1 - inT)).toFixed(2)}deg) scale(${mix(0.94, 1, inT).toFixed(4)})`,
            opacity: idx === 0 ? inT : Math.min(1, inT * 1.6),
            filter: inBlur > 0.3 ? 'url(#psc-in)' : undefined,
          }}
        >
          <Pill label={incoming.label} icon={incoming.icon} lift={1 - inT} />
        </div>
      </div>
    );
  } else if (isFinale) {
    // 最后一个 pill 上飞离场（前 7f），然后 "do it all." 落位
    const lastOutT = ramp(frame, cycleEnd, 7, EASE.exit);
    const fv = Math.abs(
      interpolate(frame + 0.5, [cycleEnd, cycleEnd + FIN], [90, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.4)) }) -
        interpolate(frame - 0.5, [cycleEnd, cycleEnd + FIN], [90, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.4)) }),
    );
    const finBlur = Math.min(10, fv * 0.5);
    slot = (
      <div style={{ position: 'relative', display: 'inline-block', perspective: 1400 }}>
        <VBlur id="psc-fin" std={finBlur} />
        <VBlur id="psc-last" std={Math.min(12, lastOutT * 12)} />
        <span
          style={{
            ...stemStyle,
            display: 'inline-block',
            marginLeft: WORD_GAP - STEM_GAP,
            opacity: Math.min(1, finT * 1.4),
            transform: `translateY(${((1 - finT) * 90).toFixed(2)}px)`,
            filter: finBlur > 0.3 ? 'url(#psc-fin)' : undefined,
          }}
        >
          do it all.
        </span>
        {lastOutT < 1 && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: -8,
              transformOrigin: '50% 100%',
              transform: `translateY(${(-130 * lastOutT).toFixed(2)}px) rotateX(${(34 * lastOutT).toFixed(2)}deg) scale(${mix(1, 0.94, lastOutT).toFixed(4)})`,
              opacity: 1 - lastOutT,
              filter: lastOutT > 0.03 ? 'url(#psc-last)' : undefined,
            }}
          >
            <Pill label={PILLS[CYCLES - 1].label} icon={PILLS[CYCLES - 1].icon} lift={lastOutT} />
          </div>
        )}
      </div>
    );
  }

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Backdrop tone="light" light={{ x: 0.4, y: 0.3 }} accent="#5b63d3" grain={0.045} vignette={0.14} />
      {/* 隐藏量宽：完整结论句 */}
      <div ref={finalRef} style={{ position: 'absolute', visibility: 'hidden', display: 'flex', gap: WORD_GAP }}>
        <span style={stemStyle}>One AI tool to</span>
        <span style={stemStyle}>do it all.</span>
      </div>
      {/* 句干固定不动：整行左端锚死，不随 pill 宽度居中重排（收束落位后才整体居中） */}
      <div
        style={{
          position: 'absolute',
          left: STEM_LEFT,
          top: 540,
          transform: `translate(${shiftX.toFixed(2)}px, calc(-50% + ${((1 - stemT) * 50).toFixed(2)}px))`,
          display: 'flex',
          alignItems: 'center',
          gap: STEM_GAP,
          opacity: stemT,
          filter: stemT < 0.98 ? `blur(${((1 - stemT) * 6).toFixed(2)}px)` : undefined,
        }}
      >
        <span style={stemStyle}>One AI tool to</span>
        {slot}
      </div>
    </AbsoluteFill>
  );
};
