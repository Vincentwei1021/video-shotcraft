// lead-word-zoom-assemble — 首词推近落位组句
// 首词以 2.3 倍字号占据画面中央，hold 期间继续向观众推近 6%，随后一条曲线同时
// 完成「缩回终字号」与「整行左滑到最终排布」，后续词从右侧各自槽位外 0.5em 推入；
// 整行上移的同一时窗里副行浮出，停一拍后整幕 crash-zoom 推近失焦交棒下一镜。
//
// 手感命门是支点：transform-origin 横向钉在**首词中心**、纵向钉在**基线**——
// 这两点是全程唯一不该移动的锚，挂载时实测一次（基线用零尺寸 inline-block 的
// offsetTop 读出），否则缩放过程中字会逐帧抖基线。
// 参数以 1920×1080 标定。
// 质感层（改版）：四色 mesh 收成"靛蓝主光 + 一抹暖色余光"的低对比底 + 颗粒 + 暗角；
// 首词入场带 8px→0 失焦（与淡入同 6f）；缩回段按 scale 速度给瞬时失焦（≤3.5px，停稳归零），
// 大幅缩放不再"硬缩"；整行上移提前到 f32–46，品牌行静止 26f 再 crash；强调色统一为批次靛蓝。
import React, { Fragment, useEffect, useRef, useState } from 'react';
import { Grain, Vignette } from '../../_fixtures/Polish';
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
const LIFT: [number, number] = [32, 46]; // f：整行上移 + 副行同帧出现（与左滑尾巴重叠 4f，读作一口气）
const LIFT_DISTANCE = -56; // px
const SUBLINE = 'One shot card, one motion recipe — copy, paste, render.';
const CRASH_FRAMES = 12; // f：段尾 crash-zoom 占用的收尾帧数
const CRASH_SCALE = 0.2;
const CRASH_BLUR = 9;

const INK = '#1d1d1f';
const INK_DIM = '#6e6f76';
const ACCENT = '#5b63d3';
// 系统 Display 字栈在前（-apple-system 在无头 Chrome 里常解析不到，会落到 PingFang），中文回退 PingFang
const SANS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", "PingFang SC", Inter, Arial, sans-serif';
const MESH_BG =
  'radial-gradient(56% 50% at 26% 24%, rgba(91,99,211,0.16) 0%, rgba(91,99,211,0) 72%),' +
  'radial-gradient(50% 46% at 80% 82%, rgba(255,180,120,0.10) 0%, rgba(255,180,120,0) 72%),' +
  'radial-gradient(70% 60% at 50% 46%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 70%),' +
  'linear-gradient(180deg, #f6f6f8 0%, #efeff2 100%)';

/** 首词向观众漂移：先快后停，峰值处挂住 */
const PUSH_EASE = Easing.bezier(0.25, 1, 0.5, 1);
/** 缩回与左滑共用同一条曲线——两个动作必须读作一次运动，不能各走各的 */
const ZOOM_EASE = Easing.bezier(0.5, 0, 0.05, 1);
/** 后续词推入槽位：起步快，落地长而软 */
const WORD_EASE = Easing.bezier(0.22, 0.8, 0.36, 1);

// 整行 scale：hold 推近 + 缩回两段相加（两段之间没有速度断点）
const lineScale = (f: number) =>
  interpolate(f, [0, HOLD_DURATION], [INITIAL_SCALE, INITIAL_SCALE * PUSH_SCALE], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: PUSH_EASE,
  }) +
  interpolate(f, [HOLD_DURATION, HOLD_DURATION + RECEDE_DURATION], [0, 1 - INITIAL_SCALE * PUSH_SCALE], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ZOOM_EASE,
  });

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
  // 首词入场失焦：与 6f 淡入同步 8px→0（scale 前单位，随 2.3× 放大）
  const introBlur = interpolate(frame, [0, INTRO_DURATION], [8 / INITIAL_SCALE, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

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
          scale: lineScale(frame),
          // 缩回段的瞬时失焦：按 scale 速度给（峰值约 0.3/帧 → ≈3px），停稳为 0
          filter: (() => {
            const v = Math.abs(lineScale(frame + 0.5) - lineScale(frame - 0.5));
            const b = Math.min(3.5, v * 10) + introBlur;
            return b > 0.05 ? `blur(${b.toFixed(2)}px)` : undefined;
          })(),
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
            fontSize: 34,
            fontWeight: 400,
            letterSpacing: '-0.005em',
            color: INK_DIM,
            opacity: lift,
            transform: `translateY(${(1 - lift) * 16}px)`,
          }}
        >
          {SUBLINE}
        </div>
      </AbsoluteFill>
      <Vignette strength={0.12} inner={0.5} color="#2a2c36" />
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};
