// text-column-converge —— 双词对峙合拢（手法源自 raycast-teams 28–36s：左词左缘、右词右缘钉死在等屏边距两侧，
// 右词硬切轮换、全程零收缩；换到最后一词才唯一一次 ease-in-out 合拢到居中咬合成短语，随后小字近乎硬切浮现）。
//
// 第二轮重设计（纸 · 瑞士网格发布说明页）：
// - look = paper（暖白纸 · 墨 · 朱红）。整屏是一页瑞士网格的 release notes：四角是页眉页脚信息
//   （Release notes / Vol. 4 — 2026 / 品牌字标 / 01–09 序号随每次硬切翻页），正中一行 120px/850 粗黑体大写，
//   上下各一条发丝横线把这一行框成"目录条"。左词 NEW 是朱红，右词是墨色特性名。
// - 钉死：轮换期 NEW 左缘、特性词右缘一像素不动，左右屏边距相等（144px）；上下横线也钉在两缘之间。
// - 唯一一次合拢：末词（虚构品牌 KESTREL）停稳 10f 后 36f ease-in-out cubic 相向滑动，按速度水平运动模糊；
//   上下横线与两词同步收拢到短语宽度——观众这才发现"目录条"其实框住的是一句话。合拢终点用实测字宽计算，
//   两词恰好一个词距咬合。
// - 定格 18f 后副标题 4f 近乎硬切浮现（零位移），与整行同左缘；之后极缓推近 1→1.025 保持画面活着。
// - 硬切换词那一帧新词是朱红（1f），之后回到墨色——原片的打字机换行感，只给 1f。
//
// 时间表（30fps，共 195f）：
//   0–10    预备：纸面、四角页眉页脚淡入，上下横线由中心向两缘画出
//   10–97   轮换：8 个特性词硬切，停留 18/13/10/8/7/8/10/13f（先慢后快再放慢，机器节奏带人味）
//   97–107  末词 KESTREL 停稳（观众意识到"这词不换了"）
//   107–143 唯一一次合拢（36f ease-in-out cubic）
//   161–165 副标题近乎硬切浮现
//   143–195 hold：极缓推近
import React, { useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { EASE, SpeedBlur, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, type } from '../../_fixtures/Look';

const L = LOOKS.paper;

// 词轮换表：停留帧数不均（机器节奏），全程钉在右缘，不做间距收缩
const STEPS: { word: string; dur: number }[] = [
  { word: 'SPLIT VIEW', dur: 18 },
  { word: 'FOCUS MODE', dur: 13 },
  { word: 'LIVE SYNC', dur: 10 },
  { word: 'HOTKEYS', dur: 8 },
  { word: 'AI SEARCH', dur: 7 },
  { word: 'THEMES', dur: 8 },
  { word: 'OFFLINE', dur: 10 },
  { word: 'SHARED SPACES', dur: 13 },
  { word: 'KESTREL', dur: 999 }, // 最后一词：停稳后触发唯一一次合拢
];
const BRAND = STEPS[STEPS.length - 1].word;

const START = 10; // 两词首次硬切出现
const MARGIN = 144; // 左右屏边距（相等）
const FS = 120;
const GAP_WORD = 0.26 * FS; // 合拢后两词之间的词距
const LINE_Y = 540; // 行中线
const CONVERGE_DUR = 36;
const CONVERGE_DELAY = 10;
const SUB_DELAY = 18;

const LAST_START = START + STEPS.slice(0, -1).reduce((a, s) => a + s.dur, 0); // 97
const CV0 = LAST_START + CONVERGE_DELAY; // 107
// 8f 预备 + 87f 轮换 + 10f 停稳 + 36f 合拢 + 18f 定格 + 4f 小字 + 30f 静置 ≈ 195f（6.5s）
export const TEXT_COLUMN_CONVERGE_DURATION = 195;

const cvAt = (f: number) =>
  interpolate(f - CV0, [0, CONVERGE_DUR], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });

const WORD_STYLE: React.CSSProperties = { ...type(FS, 850, { caps: true }), letterSpacing: '-0.035em', lineHeight: 1, whiteSpace: 'nowrap' };

export const TextColumnConverge: React.FC = () => {
  const f = useCurrentFrame();
  const t = f - START;

  // 实测 NEW 与品牌词宽度（合拢终点按实测宽度算，保证恰好一个词距咬合）
  const measRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState<[number, number]>([FS * 2.2, FS * 4.6]);
  useLayoutEffect(() => {
    const k = measRef.current?.children;
    if (!k) return;
    setW([(k[0] as HTMLElement).offsetWidth || FS * 2.2, (k[1] as HTMLElement).offsetWidth || FS * 4.6]);
  }, []);
  const lineW = w[0] + GAP_WORD + w[1];
  const mergedLeft = 960 - lineW / 2;
  const mergedRight = 960 + lineW / 2;

  // 当前步
  let acc = 0;
  let idx = 0;
  let stepStart = 0;
  for (let i = 0; i < STEPS.length; i++) {
    if (t >= acc) { idx = i; stepStart = acc; }
    acc += STEPS[i].dur;
  }
  const local = t - stepStart;
  const visible = t >= 0;

  const cv = cvAt(f);
  const newLeft = mix(MARGIN, mergedLeft, cv);
  const wordRight = mix(1920 - MARGIN, mergedRight, cv);
  const span = mergedLeft - MARGIN;
  const v = (cvAt(f + 0.5) - cvAt(f - 0.5)) * span; // px/帧（两词相向）

  // 词换瞬间 1 帧朱红（首词不闪）
  const cutFlash = visible && local === 0 && idx > 0;

  // 上下横线：开场由中心向两缘画出；合拢时与两词同步收拢
  const draw = ramp(f, 0, 12, EASE.snappy);
  const ruleL = mix(960, newLeft, draw);
  const ruleR = mix(960, wordRight, draw);

  // 副标题：合拢定格后 SUB_DELAY 帧，4f 快淡、零位移
  const subOp = ramp(f, CV0 + CONVERGE_DUR + SUB_DELAY, 4, EASE.linear);
  // 定格后极缓推近
  const push = mix(1, 1.025, ramp(f, CV0 + CONVERGE_DUR - 4, TEXT_COLUMN_CONVERGE_DURATION - (CV0 + CONVERGE_DUR - 4), EASE.smooth));

  const meta: React.CSSProperties = { ...type(28, 600), letterSpacing: '-0.005em', color: L.ink2 };
  const metaIn = ramp(f, 0, 10, EASE.out);
  const counter = Math.min(STEPS.length, idx + 1);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.3, y: 0.1 }} fill={null} vignette={0.14} />

      {/* 隐藏量宽 */}
      <div ref={measRef} style={{ position: 'absolute', visibility: 'hidden', left: 0, top: 0 }}>
        <span style={{ ...WORD_STYLE, display: 'inline-block' }}>NEW</span>
        <span style={{ ...WORD_STYLE, display: 'inline-block' }}>{BRAND}</span>
      </div>

      <AbsoluteFill style={{ transform: `scale(${push.toFixed(5)})` }}>
        {/* 四角页眉页脚（瑞士网格） */}
        <div style={{ position: 'absolute', left: MARGIN, top: 96, right: MARGIN, display: 'flex', justifyContent: 'space-between', opacity: metaIn }}>
          <span style={{ ...meta, color: L.ink, fontWeight: 750 }}>Release notes</span>
          <span style={meta}>Vol. 4 — 2026</span>
        </div>
        <div style={{ position: 'absolute', left: MARGIN, right: MARGIN, top: 146, height: 2, background: L.ink, opacity: metaIn, transformOrigin: 'left', transform: `scaleX(${draw.toFixed(4)})` }} />
        <div style={{ position: 'absolute', left: MARGIN, bottom: 96, right: MARGIN, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', opacity: metaIn }}>
          <span style={{ ...type(34, 850), letterSpacing: '-0.03em', color: L.ink }}>
            Kestrel<span style={{ color: L.accent }}>.</span>
          </span>
          <span style={{ ...type(30, 600, { mono: true }), color: L.ink3 }}>
            <span style={{ color: L.ink }}>{String(counter).padStart(2, '0')}</span> / {String(STEPS.length).padStart(2, '0')}
          </span>
        </div>

        {/* 目录条上下发丝横线：钉在两词外缘之间，合拢时同步收拢 */}
        {[LINE_Y - FS * 0.78, LINE_Y + FS * 0.78].map((y) => (
          <div key={y} style={{ position: 'absolute', left: ruleL, width: Math.max(0, ruleR - ruleL), top: y, height: 1.5, background: L.line.replace('0.12', '0.5') }} />
        ))}

        {visible && (
          <>
            {/* NEW：左缘定位，轮换期钉死在左屏边距 */}
            <SpeedBlur vx={v} amount={0.4} max={8}>
              <div style={{ ...WORD_STYLE, position: 'absolute', left: newLeft, top: LINE_Y - FS * 0.5, color: L.accent }}>NEW</div>
            </SpeedBlur>
            {/* 特性词：右缘定位（换长换短右缘不动） */}
            <SpeedBlur vx={-v} amount={0.4} max={8}>
              <div style={{ ...WORD_STYLE, position: 'absolute', right: 1920 - wordRight, top: LINE_Y - FS * 0.5, color: cutFlash ? L.accent : L.ink }}>
                {STEPS[idx].word}
              </div>
            </SpeedBlur>
          </>
        )}

        {/* 副标题：与整行同左缘，近乎硬切 */}
        <div style={{ position: 'absolute', left: mergedLeft, top: LINE_Y + FS * 0.78 + 34, opacity: subOp, ...type(44, 500), letterSpacing: '-0.015em', color: L.ink2 }}>
          Every feature, one app. <span style={{ color: L.ink, fontWeight: 700 }}>Spring 2026</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
