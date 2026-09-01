// lead-word-zoom-assemble — 首词推近落位组句
// 首词以 2.3 倍字号占据画面中央，hold 期间继续向观众推近 6%，随后一条曲线同时
// 完成「缩回终字号」与「整行左滑到最终排布」，后续词从右侧各自槽位外 0.5em 推入；
// 整行上移的同一时窗里副行浮出，停一拍后整幕 crash-zoom 推近失焦交棒下一镜。
//
// 手感命门是支点：transform-origin 横向钉在**首词中心**、纵向钉在**基线**——
// 这两点是全程唯一不该移动的锚，挂载时实测一次（基线用零尺寸 inline-block 的
// offsetTop 读出），否则缩放过程中字会逐帧抖基线。
// 参数以 1920×1080 标定。
import React, { Fragment, useEffect, useRef, useState } from 'react';
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  Easing,
  getRemotionEnvironment,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export const LEAD_WORD_ZOOM_ASSEMBLE_DURATION = 84; // 2.8s @30fps

// ---- 编舞常量 ----
const TEXT = 'Introducing Lumen Deck';
const HIGHLIGHT_WORD = 'Lumen'; // 精确匹配的词换强调色：品牌词落位那一下自带高亮
const FONT_SIZE = 96;
const INITIAL_SCALE = 2.3; // 首词起手放大倍数
const INTRO_DURATION = 6; // f：首词淡入
const HOLD_DURATION = 12; // f：首词在峰值停留（推近发生在这一段）
const PUSH_SCALE = 1.06; // hold 期间继续推近的倍数
const RECEDE_DURATION = 12; // f：缩回终字号
const ASSEMBLE_DURATION = 24; // f：整行左滑到位
const WORD_DELAY = 6; // f：缩回起点后第二个词开始推入
const WORD_STAGGER = 4; // f：后续词之间的错峰
const WORD_DURATION = 12; // f：单词推入行程
const WORD_PUSH = 0.5; // em：后续词起始位置在自己槽位右侧多远
const WORD_FADE = 2; // f：后续词淡入（刻意极短——是被推进来的，不是淡进来的）
const LETTER_SPACING = '-0.03em';

// ---- 场景层 ----
const LIFT: [number, number] = [34, 50]; // f：整行上移 + 副行同帧出现
const LIFT_DISTANCE = -56; // px
const SUBLINE = 'One shot card, one motion recipe — copy, paste, render.';
const CRASH_FRAMES = 12; // f：段尾 crash-zoom 占用的收尾帧数
const CRASH_SCALE = 0.2;
const CRASH_BLUR = 9;

const INK = '#1d1d1f';
const INK_DIM = '#7a7a7a';
const ACCENT = '#7A5AF8';
const SANS = '-apple-system, "PingFang SC", BlinkMacSystemFont, sans-serif';
const MESH_BG =
  'radial-gradient(52% 44% at 18% 22%, rgba(122,90,248,0.20) 0%, rgba(122,90,248,0) 70%),' +
  'radial-gradient(46% 42% at 84% 18%, rgba(255,138,178,0.20) 0%, rgba(255,138,178,0) 70%),' +
  'radial-gradient(58% 50% at 78% 84%, rgba(96,190,255,0.20) 0%, rgba(96,190,255,0) 70%),' +
  'radial-gradient(50% 46% at 24% 88%, rgba(255,196,112,0.20) 0%, rgba(255,196,112,0) 70%),' +
  'linear-gradient(180deg, #f7f6f9 0%, #f2f1f5 100%)';

/** 首词向观众漂移：先快后停，峰值处挂住 */
const PUSH_EASE = Easing.bezier(0.25, 1, 0.5, 1);
/** 缩回与左滑共用同一条曲线——两个动作必须读作一次运动，不能各走各的 */
const ZOOM_EASE = Easing.bezier(0.5, 0, 0.05, 1);
/** 后续词推入槽位：起步快，落地长而软 */
const WORD_EASE = Easing.bezier(0.22, 0.8, 0.36, 1);

const TextReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();

  // 整行宽度、首词中心占比、基线位置：只在挂载时量一次，量到之前挂起渲染
  const lineRef = useRef<HTMLSpanElement>(null);
  const leadRef = useRef<HTMLSpanElement>(null);
  const baselineRef = useRef<HTMLSpanElement>(null);
  const [handle] = useState(() => delayRender('lead-word-zoom-assemble: measure line'));
  const [metrics, setMetrics] = useState<{
    lineWidth: number;
    leadRatio: number;
    baseline: number;
  } | null>(null);

  useEffect(() => {
    const line = lineRef.current;
    const lead = leadRef.current;
    if (!line || !lead) {
      continueRender(handle);
      return;
    }
    setMetrics({
      lineWidth: line.offsetWidth,
      leadRatio: (lead.offsetLeft + lead.offsetWidth / 2) / line.offsetWidth,
      baseline: baselineRef.current?.offsetTop ?? line.offsetHeight * 0.8,
    });
  }, [handle]);

  useEffect(() => {
    if (metrics) continueRender(handle);
  }, [metrics, handle]);

  const words = TEXT.split(' ').filter(Boolean);
  const ready = metrics !== null;
  const leadRatio = metrics?.leadRatio ?? 0.14;
  const lineWidth = metrics?.lineWidth ?? width * 0.5;
  const baseline = metrics?.baseline ?? FONT_SIZE * 0.88;

  const zoomStart = HOLD_DURATION;
  // 首词从"画面正中"走到"行内自己的位置"，位移就是这段偏心距
  const slideDistance = lineWidth * (0.5 - leadRatio);

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <span
        ref={lineRef}
        style={{
          position: 'relative',
          display: 'inline-block',
          fontSize: FONT_SIZE,
          fontWeight: 600,
          color: INK,
          letterSpacing: LETTER_SPACING,
          lineHeight: 1.1,
          whiteSpace: 'nowrap',
          fontFamily: SANS,
          transformOrigin: `${leadRatio * 100}% ${baseline}px`,
          scale:
            interpolate(frame, [0, HOLD_DURATION], [INITIAL_SCALE, INITIAL_SCALE * PUSH_SCALE], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: PUSH_EASE,
            }) +
            interpolate(
              frame,
              [zoomStart, zoomStart + RECEDE_DURATION],
              [0, 1 - INITIAL_SCALE * PUSH_SCALE],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ZOOM_EASE },
            ),
          translate: `${interpolate(
            frame,
            [zoomStart, zoomStart + ASSEMBLE_DURATION],
            [slideDistance, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ZOOM_EASE },
          )}px`,
          opacity: ready ? 1 : 0,
          textRendering: 'geometricPrecision',
          ...(getRemotionEnvironment().isRendering ? null : { willChange: 'transform' as const }),
        }}
      >
        {words.map((word, i) => {
          const isLead = i === 0;
          const pushStart = zoomStart + WORD_DELAY + (i - 1) * WORD_STAGGER;
          const opacity = isLead
            ? interpolate(frame, [0, INTRO_DURATION], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })
            : interpolate(frame, [pushStart, pushStart + WORD_FADE], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
          return (
            <Fragment key={i}>
              <span
                ref={isLead ? leadRef : undefined}
                style={{
                  display: 'inline-block',
                  opacity,
                  color: word === HIGHLIGHT_WORD ? ACCENT : undefined,
                  translate: isLead
                    ? undefined
                    : `${interpolate(
                        frame,
                        [pushStart, pushStart + WORD_DURATION],
                        [WORD_PUSH * FONT_SIZE, 0],
                        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: WORD_EASE },
                      )}px`,
                }}
              >
                {word}
              </span>
              {/* 词间空格必须放在 inline-block 之外——跟在词里会被行盒裁掉，词会黏在一起 */}
              {i < words.length - 1 ? ' ' : null}
            </Fragment>
          );
        })}
        {/* 基线尺：零尺寸 inline-block，它的 offsetTop 就是基线 */}
        <span ref={baselineRef} style={{ display: 'inline-block', width: 0, height: 0 }} />
      </span>
    </AbsoluteFill>
  );
};

export const LeadWordZoomAssemble: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const lift = interpolate(frame, LIFT, [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const crash = interpolate(
    frame,
    [durationInFrames - CRASH_FRAMES, durationInFrames - 1],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad) },
  );

  return (
    <AbsoluteFill style={{ background: MESH_BG, fontFamily: SANS }}>
      <AbsoluteFill
        style={{
          transform: `scale(${1 + crash * CRASH_SCALE})`,
          filter: crash > 0.01 ? `blur(${crash * CRASH_BLUR}px)` : undefined,
          opacity: 1 - crash * 0.55,
        }}
      >
        <AbsoluteFill style={{ transform: `translateY(${lift * LIFT_DISTANCE}px)` }}>
          <TextReveal />
        </AbsoluteFill>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '50%',
            marginTop: 62,
            textAlign: 'center',
            fontSize: 32,
            color: INK_DIM,
            opacity: lift,
            transform: `translateY(${(1 - lift) * 16}px)`,
          }}
        >
          {SUBLINE}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
