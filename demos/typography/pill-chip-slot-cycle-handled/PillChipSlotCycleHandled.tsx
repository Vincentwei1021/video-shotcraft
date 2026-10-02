// pill-chip-slot-cycle-handled — Chip Slot Cycle 胶囊滚轮挤开（motion-lab 定稿转原生 Remotion）
// 白底句式 "Your [chip] Handled"：深色胶囊内词垂直滚轮轮换（Sales→Workflow→Admin→Reports），
// 上下露出灰色幽灵项，胶囊宽度随词长平滑变化，两侧文字被自然挤开收拢。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
//
// 质感升级：
// - DesignStage 改 raster="zoom"（字形按 1080p 目标尺寸光栅化，不再是 4× 位图放大）。
// - 滚轮缓动换成带 ~4% 过冲的 in-out 贝塞尔：两头仍缓，落定时轻轻越过一格再回位，像棘轮卡入。
// - 滚动中胶囊内词列按竖向速度加方向性模糊（静止为 0），幽灵项滚动中同步虚化。
// - 胶囊材质：竖向微渐变 + 顶部 1px 内高光 + 发丝外沿 + 两层软阴影；emoji 换成同一套单色线性图标。
// - 背景换柔光 Backdrop（低对比渐变 + 主光斑 + 颗粒），全程极缓推近 1→1.025。
import React, { useLayoutEffect, useRef, useState } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { DesignStage, lerp, seg, useT } from '../../_fixtures/Motion';
import { Backdrop, bezier, EASE, FONT as PFONT, ramp } from '../../_fixtures/Polish';

export const PILL_CHIP_SLOT_CYCLE_HANDLED_DURATION = 150; // 5000ms @30fps

// 单色线性图标（14 设计 px，stroke 继承 currentColor）：跨平台一致，替代系统 emoji
const Icon: React.FC<{ k: string }> = ({ k }) => {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width={15} height={15} viewBox="0 0 16 16" style={{ flex: 'none', display: 'block' }}>
      {k === 'bolt' && <path d="M9 1.8 3.6 9h4l-1 5.2L12.4 7h-4z" {...p} />}
      {k === 'trend' && (
        <>
          <path d="M2 11.5 6 7.5l2.6 2.6L14 4.6" {...p} />
          <path d="M10.4 4.4H14v3.6" {...p} />
        </>
      )}
      {k === 'gear' && (
        <>
          <circle cx="8" cy="8" r="2.2" {...p} />
          <path d="M8 1.8v1.8M8 12.4v1.8M1.8 8h1.8M12.4 8h1.8M3.6 3.6l1.3 1.3M11.1 11.1l1.3 1.3M3.6 12.4l1.3-1.3M11.1 4.9l1.3-1.3" {...p} />
        </>
      )}
      {k === 'doc' && (
        <>
          <path d="M4 1.9h5.2L12.4 5v9.1H4z" {...p} />
          <path d="M6.2 8.4h4M6.2 11h3" {...p} />
        </>
      )}
    </svg>
  );
};

const WORDS = [
  { w: 'Sales', e: 'bolt' },
  { w: 'Workflow', e: 'trend' },
  { w: 'Admin', e: 'gear' },
  { w: 'Reports', e: 'doc' },
];
const FONT_STACK = PFONT.sans;
const FONT = `700 22px ${FONT_STACK}`;
const ROW = 48; // 行高 = 胶囊高
// 兜底词宽（原 effect.js 未挂载时的估算：字符数×13，再加胶囊内留白 74）；
// 首帧 useLayoutEffect 实测替换
const FALLBACK_WIDTHS = WORDS.map((o) => o.w.length * 13 + 74);

// 滚轮缓动：in-out 两头缓 + 末端 ~4% 过冲回位（棘轮卡入感）
const WHEEL = bezier(0.62, 0, 0.3, 1.13);
const SWITCHES = [0.25, 0.47, 0.69];
const WIN = 0.12;

// 两侧静态文字（"Your" / "Handled"）
const SIDE: React.CSSProperties = {
  color: '#15171d',
  fontFamily: FONT_STACK,
  fontWeight: 800,
  fontSize: 30,
  letterSpacing: '-0.03em',
  flex: 'none',
};

export const PillChipSlotCycleHandled: React.FC = () => {
  const t = useT();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const span = Math.max(1, durationInFrames - 1);

  // 量宽：隐藏 span 实测词宽，再除以同容器内 100px 参照块的实测宽（与缩放管线无关），+74 胶囊留白
  const measRef = useRef<HTMLDivElement>(null);
  const [widths, setWidths] = useState<number[]>(FALLBACK_WIDTHS);
  useLayoutEffect(() => {
    const kids = measRef.current?.children;
    if (!kids) return;
    const unit = (kids[WORDS.length] as HTMLElement).offsetWidth / 100 || 1;
    setWidths(WORDS.map((o, i) => ((kids[i] as HTMLElement).offsetWidth / unit || o.w.length * 13) + 74));
  }, []);

  // 三次切换：0.25 / 0.47 / 0.69，每次 0.12 窗推进一格
  const posAt = (tt: number) => {
    let p = 0;
    for (const s0 of SWITCHES) p += seg(tt, s0, s0 + WIN, WHEEL);
    return p;
  };
  const pos = posAt(t);
  const vel = (posAt(t + 0.5 / span) - posAt(t - 0.5 / span)) * ROW; // 设计 px/帧
  const ci = Math.max(0, Math.min(WORDS.length - 1, Math.floor(pos)));
  const frac = Math.max(0, pos - ci);
  // 胶囊宽度随当前词→下一词插值，平滑挤开两侧文字
  const chipW = lerp(Math.min(1, frac), widths[ci], widths[Math.min(ci + 1, WORDS.length - 1)]);

  // 竖向运动模糊：按滚速（设计 px/帧），静止为 0
  const blurY = Math.min(2.6, Math.abs(vel) * 0.3);

  // 幽灵项：当前词的前/后邻居，半速微移，滚动中更淡并同步虚化
  const near = Math.round(pos);
  const roll = (pos - near) * ROW * 0.5;
  const settle = 1 - Math.min(1, Math.abs(pos - near) * 3);
  const ghost = (top: number): React.CSSProperties => ({
    position: 'absolute',
    left: '50%',
    top,
    font: `600 22px ${FONT_STACK}`,
    letterSpacing: '-0.01em',
    color: '#2a2e3a',
    whiteSpace: 'nowrap',
    transform: `translateX(-50%) translateY(${-roll}px)`,
    opacity: 0.13 * (0.4 + settle * 0.6),
    filter: blurY > 0.2 ? `blur(${(blurY * 0.35).toFixed(2)}px)` : undefined,
  });

  // 全程极缓推近（smooth：起止速度为 0）
  const push = 1 + 0.025 * ramp(frame, 0, durationInFrames, EASE.smooth);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <Backdrop tone="light" light={{ x: 0.5, y: 0.34 }} accent="#5b63d3" grain={0.045} vignette={0.12} />
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${push.toFixed(5)})` }}>
        <DesignStage bg="transparent" raster="zoom">
          <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
            <filter id="pcsch-vblur" x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation={`0 ${blurY.toFixed(2)}`} />
            </filter>
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: FONT_STACK,
            }}
          >
            {/* 隐藏量宽 span + 100px 参照块（不参与布局显示） */}
            <div ref={measRef} style={{ position: 'absolute', visibility: 'hidden' }}>
              {WORDS.map((o) => (
                <span key={o.w} style={{ whiteSpace: 'nowrap', font: FONT, letterSpacing: '-0.01em' }}>
                  {o.w}
                </span>
              ))}
              <div style={{ width: 100, height: 1 }} />
            </div>
            <div style={SIDE}>Your</div>
            <div style={{ position: 'relative', flex: 'none' }}>
              {/* 深色胶囊：overflow hidden 里放 4 行词的滚轮列 */}
              <div
                style={{
                  position: 'relative',
                  height: ROW,
                  width: chipW,
                  margin: '0 14px',
                  flex: 'none',
                  borderRadius: 99,
                  background: 'linear-gradient(180deg, #2a2d38 0%, #1a1c24 52%, #14161d 100%)',
                  boxShadow:
                    'inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.35), ' +
                    '0 0 0 0.5px rgba(16,18,28,0.6), 0 1px 2px rgba(16,18,28,0.18), 0 10px 22px -8px rgba(20,22,40,0.38)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 0,
                    transform: `translateY(${(-pos * ROW).toFixed(3)}px)`,
                    filter: blurY > 0.2 ? 'url(#pcsch-vblur)' : undefined,
                  }}
                >
                  {WORDS.map(({ w, e }) => (
                    <div
                      key={w}
                      style={{
                        height: ROW,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 9,
                        paddingLeft: 20,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ color: '#aab0ff', display: 'flex', width: 16, justifyContent: 'center' }}>
                        <Icon k={e} />
                      </span>
                      <span style={{ font: FONT, letterSpacing: '-0.01em', color: '#f4f5f8' }}>{w}</span>
                    </div>
                  ))}
                </div>
                {/* 上下 6px 内阴影：滚轮"柱面"的边缘收光，词滚进滚出不再硬切 */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 99,
                    pointerEvents: 'none',
                    background:
                      'linear-gradient(180deg, rgba(14,15,20,0.55) 0%, rgba(14,15,20,0) 22%, rgba(14,15,20,0) 78%, rgba(14,15,20,0.55) 100%)',
                  }}
                />
              </div>
              {/* 胶囊外上下的灰色幽灵项 */}
              <div style={ghost(-38)}>{near > 0 ? WORDS[near - 1].w : ''}</div>
              <div style={ghost(58)}>{near < WORDS.length - 1 ? WORDS[near + 1].w : ''}</div>
            </div>
            <div style={SIDE}>Handled</div>
          </div>
        </DesignStage>
      </div>
    </div>
  );
};
