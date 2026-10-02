// lead-word-zoom-assemble — 首词推近落位组句
// 首词以 2.3 倍字号占据画面中央，hold 期间继续向观众推近 6%，随后一条曲线同时
// 完成「缩回终字号」与「整行左滑到最终排布」，后续词从右侧各自槽位外 0.5em 推入；
// 整行上移的同一时窗里副行浮出，停一拍后整幕 crash-zoom 推近失焦交棒下一镜。
//
// 手感命门是支点：transform-origin 横向钉在**首词中心**、纵向钉在**基线**——
// 这两点是全程唯一不该移动的锚，挂载时实测一次（基线用零尺寸 inline-block 的
// offsetTop 读出），否则缩放过程中字会逐帧抖基线。
//
// 第二轮重设计（发布会 keynote 开场）：
// - look = midnight（深蓝夜·电光蓝）。舞台：顶部主光 + 地平线光带 + 浮尘；首词背后一团跟随缩放的蓝色聚光
//   （字大时光大，缩回时光也收拢到句子后面），地平线上一道发丝亮线随组句从中心向两侧拉开——舞台"开灯"。
// - 字：124px / 700 / −0.04em 白字，品牌词「Lumen」电光蓝 + 泛光（画面唯一彩色）；首词起手 2.3× ≈ 285px 占满画宽。
// - 运动：缩回与左滑共用一条重 in-out 曲线（读作一次运动）；左滑段按横向速度加方向性运动模糊（SVG 只在 x 轴模糊），
//   缩回段按 scale 速度给瞬时失焦；后续词被"推进"槽位（12f、2f 淡入）。
// - 副行 44px（Q11 辅助字 ≥32px）+ 眉题 mono caps，与整行上移同窗出现，不留空当拍。
//
// 时间表（30fps，共 90f）：
//   0–6    首词由虚到实淡入（第 1 帧就有舞台光和半透明大字）
//   0–14   hold：首词独占画面并继续推近 6%（PUSH_EASE 减速挂住）
//   14–28  缩回终字号（ZOOM_EASE）；14–40 整行左滑（同曲线，比缩回长一倍＝滑行尾巴）
//   20/24  「Lumen」「Deck」依次被推入
//   36–50  整行上移 −60px + 副行 / 眉题同窗浮出；地平线亮线拉开
//   50–78  hold 28f（极缓推进 1.5%）
//   78–90  crash：整幕 scale 1→1.22 + blur 0→10px + 压暗，交棒下一镜
import React, { Fragment, useEffect, useId, useRef, useState } from 'react';
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
import { EASE, FONT, ramp } from '../../_fixtures/Polish';
import { Dust, LOOKS, Stage, alpha, glow, type } from '../../_fixtures/Look';

export const LEAD_WORD_ZOOM_ASSEMBLE_DURATION = 90; // 3.0s @30fps

const L = LOOKS.midnight;

// ---- 编舞常量 ----
const TEXT = 'Introducing Lumen Deck';
const HIGHLIGHT_WORD = 'Lumen'; // 精确匹配的词换强调色：品牌词落位那一下自带高亮
const FONT_SIZE = 124;
const INITIAL_SCALE = 2.3; // 首词起手放大倍数
const INTRO_DURATION = 6; // f：首词淡入
const HOLD_DURATION = 14; // f：首词在峰值停留（推近发生在这一段）
const PUSH_SCALE = 1.06; // hold 期间继续推近的倍数
const RECEDE_DURATION = 14; // f：缩回终字号
const ASSEMBLE_DURATION = 26; // f：整行左滑到位
const WORD_DELAY = 6; // f：缩回起点后第二个词开始推入
const WORD_STAGGER = 4; // f：后续词之间的错峰
const WORD_DURATION = 12; // f：单词推入行程
const WORD_PUSH = 0.5; // em：后续词起始位置在自己槽位右侧多远
const WORD_FADE = 2; // f：后续词淡入（刻意极短——是被推进来的，不是淡进来的）
const LETTER_SPACING = '-0.04em';

// ---- 场景层 ----
const LIFT: [number, number] = [36, 50]; // f：整行上移 + 副行同窗出现（与左滑尾巴重叠 4f，读作一口气）
const LIFT_DISTANCE = -60; // px
const SUBLINE = 'The deck that designs itself — as you talk.';
const CRASH_FRAMES = 12; // f：段尾 crash-zoom 占用的收尾帧数
const CRASH_SCALE = 0.22;
const CRASH_BLUR = 10;
const HORIZON = 0.7;
const GLINT_AT = 44; // 品牌词扫光起点（落位后、整行上移途中）

/** 首词向观众漂移：先快后停，峰值处挂住 */
const PUSH_EASE = Easing.bezier(0.25, 1, 0.5, 1);
/** 缩回与左滑共用同一条曲线——两个动作必须读作一次运动，不能各走各的 */
const ZOOM_EASE = Easing.bezier(0.5, 0, 0.05, 1);
/** 后续词推入槽位：起步快，落地长而软 */
const WORD_EASE = Easing.bezier(0.22, 0.8, 0.36, 1);

const clampOpt = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// 整行 scale：hold 推近 + 缩回两段相加（两段之间没有速度断点）
const lineScale = (f: number) =>
  interpolate(f, [0, HOLD_DURATION], [INITIAL_SCALE, INITIAL_SCALE * PUSH_SCALE], { ...clampOpt, easing: PUSH_EASE }) +
  interpolate(f, [HOLD_DURATION, HOLD_DURATION + RECEDE_DURATION], [0, 1 - INITIAL_SCALE * PUSH_SCALE], { ...clampOpt, easing: ZOOM_EASE });

// 左滑进度 0→1（与缩回同曲线）
const slideT = (f: number) => interpolate(f, [HOLD_DURATION, HOLD_DURATION + ASSEMBLE_DURATION], [0, 1], { ...clampOpt, easing: ZOOM_EASE });

const AssembleLine: React.FC = () => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const fid = useId().replace(/[^a-zA-Z0-9]/g, '');

  // 整行宽度、首词中心占比、基线位置：只在挂载时量一次，量到之前挂起渲染
  const lineRef = useRef<HTMLSpanElement>(null);
  const leadRef = useRef<HTMLSpanElement>(null);
  const baselineRef = useRef<HTMLSpanElement>(null);
  const [handle] = useState(() => delayRender('lead-word-zoom-assemble: measure line'));
  const [metrics, setMetrics] = useState<{ lineWidth: number; leadRatio: number; baseline: number } | null>(null);

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
  const leadRatio = metrics?.leadRatio ?? 0.25;
  const lineWidth = metrics?.lineWidth ?? width * 0.7;
  const baseline = metrics?.baseline ?? FONT_SIZE * 0.88;

  const zoomStart = HOLD_DURATION;
  // 首词从"画面正中"走到"行内自己的位置"，位移就是这段偏心距
  const slideDistance = lineWidth * (0.5 - leadRatio);
  const tx = (f: number) => slideDistance * (1 - slideT(f));
  // 首词入场失焦：与 6f 淡入同步 10px→0（scale 前单位，随 2.3× 放大）
  const introBlur = interpolate(frame, [0, INTRO_DURATION], [10 / INITIAL_SCALE, 0], { ...clampOpt, easing: Easing.out(Easing.cubic) });
  // 缩回段的瞬时失焦（按 scale 速度）+ 左滑段的横向运动模糊（按 x 速度，屏幕 px/帧）
  const sv = Math.abs(lineScale(frame + 0.5) - lineScale(frame - 0.5));
  const iso = Math.min(1.4, sv * 4.5) + introBlur;
  const vx = Math.abs(tx(frame + 0.5) - tx(frame - 0.5));
  const dir = Math.min(7, vx * 0.16);
  const s = lineScale(frame);

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      {dir > 0.3 && (
        <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
          <filter id={`mb${fid}`} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`${(dir / s).toFixed(2)} 0`} />
          </filter>
        </svg>
      )}
      <span
        ref={lineRef}
        style={{
          position: 'relative',
          display: 'inline-block',
          ...type(FONT_SIZE, 700),
          color: L.ink,
          letterSpacing: LETTER_SPACING,
          lineHeight: 1.1,
          whiteSpace: 'nowrap',
          transformOrigin: `${leadRatio * 100}% ${baseline}px`,
          scale: s,
          filter: [dir > 0.3 ? `url(#mb${fid})` : '', iso > 0.05 ? `blur(${iso.toFixed(2)}px)` : ''].filter(Boolean).join(' ') || undefined,
          translate: `${tx(frame)}px`,
          opacity: ready ? 1 : 0,
          textRendering: 'geometricPrecision',
          ...(getRemotionEnvironment().isRendering ? null : { willChange: 'transform' as const }),
        }}
      >
        {words.map((word, i) => {
          const isLead = i === 0;
          const pushStart = zoomStart + WORD_DELAY + (i - 1) * WORD_STAGGER;
          const opacity = isLead
            ? interpolate(frame, [0, INTRO_DURATION], [0, 1], clampOpt)
            : interpolate(frame, [pushStart, pushStart + WORD_FADE], [0, 1], clampOpt);
          const hi = word === HIGHLIGHT_WORD;
          // 品牌词落位后泛光渐起 + 一道裁进字形的扫光（Q4：全镜头只给它一次）
          const g = hi ? ramp(frame, pushStart + 6, 16, EASE.out) : 0;
          const gl = hi ? ramp(frame, GLINT_AT, 16, EASE.swift) : 0;
          const band = -30 + 160 * gl;
          return (
            <Fragment key={i}>
              <span
                ref={isLead ? leadRef : undefined}
                style={{
                  display: 'inline-block',
                  opacity,
                  color: hi ? (gl > 0 && gl < 1 ? 'transparent' : L.accent) : undefined,
                  ...(hi && gl > 0 && gl < 1
                    ? {
                        backgroundImage: `linear-gradient(105deg, ${L.accent} ${band - 22}%, #e6efff ${band}%, ${L.accent} ${band + 22}%)`,
                        WebkitBackgroundClip: 'text', backgroundClip: 'text',
                      }
                    : null),
                  textShadow: hi && g > 0.01 ? glow(L.accent, 0.7 * g) : undefined,
                  translate: isLead
                    ? undefined
                    : `${interpolate(frame, [pushStart, pushStart + WORD_DURATION], [WORD_PUSH * FONT_SIZE, 0], { ...clampOpt, easing: WORD_EASE })}px`,
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

  const lift = interpolate(frame, LIFT, [0, 1], { ...clampOpt, easing: Easing.out(Easing.cubic) });
  const crash = interpolate(frame, [durationInFrames - CRASH_FRAMES, durationInFrames - 1], [0, 1], { ...clampOpt, easing: Easing.in(Easing.quad) });
  const hold = 1 + 0.015 * ramp(frame, LIFT[1], durationInFrames - CRASH_FRAMES - LIFT[1], EASE.swift);
  // 首词背后的聚光：跟随整行 scale 收放（字大光大），缩回后稳定在句子后方
  const s = lineScale(frame);
  const spot = (s - 1) / (INITIAL_SCALE * PUSH_SCALE - 1); // 1=首词峰值 0=终字号
  const intro = ramp(frame, 0, 8, EASE.out);
  // 地平线发丝亮线：随组句从中心向两侧拉开
  const rule = ramp(frame, 18, 30, EASE.snappy);
  const sub = (d: number) => ramp(frame, LIFT[0] + d, 14, EASE.out);

  return (
    <AbsoluteFill style={{ background: L.bg[1], fontFamily: FONT.sans }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.0 }} fill={{ x: 0.5, y: 1.05 }} horizon={HORIZON} breathe={0.5} grain={0.08}>
        <Dust look={L} count={30} seed={11} drift={0.2} opacity={0.5} />
        {/* 地平线：中心亮、向两侧淡出的发丝线 */}
        <div style={{
          position: 'absolute', left: 960 - 900 * rule, width: 1800 * rule, top: HORIZON * 1080, height: 1.5,
          background: `linear-gradient(90deg, transparent, ${alpha(L.accent, 0.7)} 35%, ${alpha('#ffffff', 0.9)} 50%, ${alpha(L.accent, 0.7)} 65%, transparent)`,
        }} />
      </Stage>

      <AbsoluteFill
        style={{
          transform: `scale(${(hold * (1 + crash * CRASH_SCALE)).toFixed(5)})`,
          filter: crash > 0.01 ? `blur(${(crash * CRASH_BLUR).toFixed(2)}px) brightness(${(1 - crash * 0.5).toFixed(3)})` : undefined,
          opacity: 1 - crash * 0.4,
        }}
      >
        {/* 首词背后的蓝色聚光（预模糊径向渐变，不做实时 blur） */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%', width: 1500 + 700 * spot, height: 520 + 380 * spot,
          transform: `translate(-50%, -54%) translateY(${lift * LIFT_DISTANCE}px)`, borderRadius: '50%',
          background: `radial-gradient(closest-side, ${alpha(L.light, 0.34)}, ${alpha(L.light, 0.1)} 55%, transparent 100%)`,
          opacity: intro,
        }} />

        <AbsoluteFill style={{ transform: `translateY(${lift * LIFT_DISTANCE}px)` }}>
          <AssembleLine />
        </AbsoluteFill>

        {/* 眉题：与上移同窗，从上方落下 */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 540 + LIFT_DISTANCE - 150, textAlign: 'center',
          ...type(28, 600, { mono: true }), letterSpacing: '0.32em', color: L.ink2,
          opacity: sub(0), transform: `translateY(${(1 - sub(0)) * -14}px)`,
        }}>
          KEYNOTE <span style={{ color: L.accent }}>·</span> 2026
        </div>

        {/* 副行：与整行上移同窗浮出，上移让出的空间当帧被填掉 */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 540 + 52, textAlign: 'center',
          ...type(44, 450), letterSpacing: '-0.015em', color: L.ink2,
          opacity: sub(2), transform: `translateY(${(1 - sub(2)) * 18}px)`,
        }}>
          {SUBLINE}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
