// bottom-push-stack-wipe —— slack-promo 22–27s
// 换章手法：新场景连底色整屏从底边向上推入，把旧场景顶出画外，
// 连推三章（三种饱和底色，每章中央钉一张窗口卡随底色走）。
// 推入用重 ease-out（快进慢停）。
// 质感层：每章底色是"受光的色板"（同色相上亮下沉 + 柔光斑 + 颗粒），窗口卡用发丝线 +
// 按章色调的两层软阴影；整摞随推入速度做纵向运动模糊（两层同速，所以一层模糊管两章）；
// 接缝 = 新章上缘受光高光线 + 压在旧章上的接触影。底边页码三格随换章点亮，做节拍器。
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Card, G } from '../../_fixtures/Fixtures';
import { bezier, ramp, velocity, FONT, tracking, softShadow, hairline, innerHighlight, Grain, Vignette, SpeedBlur, Backdrop } from '../../_fixtures/Polish';

const H = 1080;

// demo 时长：三连推（18/55/92f 起推，各 30f）+ 尾段 hold
export const BOTTOM_PUSH_STACK_WIPE_DURATION = 140;

// 章节定义：底色（上亮 / 本色 / 下沉三档同色相）+ 卡片种子 + 章内文案。第 0 章是起始中性场景。
const CHAPTERS = [
  { color: G.bg, hi: G.bg, lo: G.bg, shade: '#2a2c36', num: '00', label: 'Overview', window: 'Northwind — Home', seed: 2 },
  { color: '#2bac76', hi: '#3cc189', lo: '#1f9463', shade: '#0b4a30', num: '01', label: 'Channels', window: '# launch-plan', seed: 3 }, // 绿
  { color: '#36c5f0', hi: '#55d2f6', lo: '#1fa9d6', shade: '#0b4d66', num: '02', label: 'Huddles', window: 'Huddle — Design review', seed: 4 }, // 蓝
  { color: '#e01e5a', hi: '#ef3f73', lo: '#c0124a', shade: '#5c0624', num: '03', label: 'Workflows', window: 'Workflow — Weekly digest', seed: 5 }, // 粉红
];

// 每章推入的起始帧；30 帧完成一次推入，随后 hold ~1.2s
const PUSH_STARTS = [18, 55, 92];
const PUSH_DUR = 30;

const heavyEaseOut = bezier(0.12, 0.9, 0.2, 1); // 快进慢停（md 钉死的推入曲线）

// 第 i 章推入进度（0→1），给定任意帧（velocity() 需要在半帧处取值）
const pushP = (f: number, i: number) => ramp(f, PUSH_STARTS[i], PUSH_DUR, heavyEaseOut);
// 整摞的"当前推进量"：已完成章数 + 正在推的进度，×H 就是摞的总位移——一条式子求速度
const stackY = (f: number) => PUSH_STARTS.reduce((s, _, i) => s + pushP(f, i), 0) * H;

// 章内装饰：左上章节号 + 标题（白色半透明体系），右上光环，右下三格页码
const ChapterChrome: React.FC<{ chapter: number }> = ({ chapter }) => {
  const c = CHAPTERS[chapter];
  const onColor = chapter > 0;
  const ink = onColor ? 'rgba(255,255,255,0.96)' : G.ink1;
  const sub = onColor ? 'rgba(255,255,255,0.72)' : G.ink3;
  return (
    <>
      <div style={{ position: 'absolute', top: 92, left: 120, display: 'flex', alignItems: 'center', gap: 18, fontFamily: FONT.sans }}>
        <div style={{
          height: 44, padding: '0 16px', borderRadius: 22, display: 'flex', alignItems: 'center',
          background: onColor ? 'rgba(255,255,255,0.2)' : G.fill2,
          boxShadow: onColor ? 'inset 0 0 0 1px rgba(255,255,255,0.28)' : `inset 0 0 0 1px ${G.hairline}`,
          fontFamily: FONT.mono, fontSize: 22, fontWeight: 600, color: ink, letterSpacing: '0.04em',
          fontVariantNumeric: 'tabular-nums',
        }}>{c.num}</div>
        <div style={{ fontSize: 46, fontWeight: 650, color: ink, letterSpacing: tracking(46), lineHeight: 1 }}>{c.label}</div>
      </div>
      {onColor && (
        <div style={{
          position: 'absolute', top: 132, right: 196, width: 132, height: 132, borderRadius: '50%',
          background: 'radial-gradient(circle at 34% 30%, rgba(255,255,255,0.34), rgba(255,255,255,0.08) 70%)',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.3)',
        }} />
      )}
      {/* 页码：三格，当前章点亮（第 0 章全暗） */}
      <div style={{ position: 'absolute', bottom: 112, right: 140, display: 'flex', alignItems: 'center', gap: 12, fontFamily: FONT.sans }}>
        <div style={{ fontSize: 22, fontWeight: 500, color: sub, letterSpacing: tracking(22), marginRight: 10, fontVariantNumeric: 'tabular-nums' }}>
          {chapter > 0 ? `${chapter} / 3` : 'Start'}
        </div>
        {[1, 2, 3].map((k) => (
          <div key={k} style={{
            width: k === chapter ? 76 : 40, height: 8, borderRadius: 4,
            background: onColor ? (k === chapter ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.3)') : G.fill2,
          }} />
        ))}
      </div>
    </>
  );
};

const ChapterScene: React.FC<{ chapter: number }> = ({ chapter }) => {
  const c = CHAPTERS[chapter];
  const onColor = chapter > 0;
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      {onColor ? (
        <AbsoluteFill style={{ background: `linear-gradient(172deg, ${c.hi} 0%, ${c.color} 46%, ${c.lo} 100%)` }}>
          {/* 左上主光斑：与窗口卡的顶部高光、下方阴影同一光向 */}
          <AbsoluteFill style={{ background: 'radial-gradient(ellipse 60% 70% at 28% 12%, rgba(255,255,255,0.22), rgba(255,255,255,0) 70%)' }} />
          <Vignette strength={0.32} inner={0.42} color={c.shade} />
        </AbsoluteFill>
      ) : (
        <Backdrop tone="light" grain={0} />
      )}
      <ChapterChrome chapter={chapter} />
      {/* 中央钉住的窗口卡（章内绝对坐标，随底色整块走） */}
      <div style={{
        position: 'relative', borderRadius: 18, overflow: 'hidden', border: hairline(onColor ? 0.1 : 0.09),
        boxShadow: `${innerHighlight(0.9)}, ${softShadow(36, { color: c.shade, strength: onColor ? 1.5 : 1 })}`,
      }}>
        <div style={{
          width: 860, height: 52, background: 'linear-gradient(180deg, #fbfbfa, #f1f1ef)', display: 'flex',
          alignItems: 'center', gap: 8, padding: '0 20px', boxSizing: 'border-box', borderBottom: `1px solid ${G.hairline}`,
          fontFamily: FONT.sans, position: 'relative',
        }}>
          {['#ec6a5e', '#f4bf4f', '#61c554'].map((dot, i) => (
            <div key={i} style={{ width: 13, height: 13, borderRadius: 7, background: dot, boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.18)' }} />
          ))}
          <div style={{
            position: 'absolute', left: 0, right: 0, textAlign: 'center', fontSize: 16, fontWeight: 600,
            color: G.ink2, letterSpacing: tracking(16), pointerEvents: 'none',
          }}>{c.window}</div>
        </div>
        <Card w={860} h={430} seed={c.seed} style={{ borderRadius: 0, padding: 34, border: 'none', boxShadow: 'none' }} />
      </div>
      {onColor && <Grain opacity={0.06} blend="overlay" />}
    </AbsoluteFill>
  );
};

export const BottomPushStackWipe: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = PUSH_STARTS.map((_, i) => pushP(frame, i));
  // 整摞纵向速度（px/帧，向上为负）：两章刚性同速，所以一层 SpeedBlur 包住全部章节
  const vy = -velocity(stackY, frame);
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: G.bg }}>
      <SpeedBlur vx={0} vy={vy} amount={0.11} max={22}>
        {CHAPTERS.map((_, i) => {
          // 第 i 章的位移 = 自己被推入的进度 + 被后续章顶出的进度
          const pushedIn = i === 0 ? 1 : progress[i - 1]; // 自己进入
          const pushedOut = i < CHAPTERS.length - 1 ? progress[i] : 0; // 被下一章顶出
          const y = (1 - pushedIn) * H - pushedOut * H;
          if (y <= -H || y >= H) return null;
          const moving = pushedIn < 1;
          return (
            <AbsoluteFill key={i} style={{ transform: `translateY(${y.toFixed(2)}px)` }}>
              <ChapterScene chapter={i} />
              {i > 0 && moving && (
                <>
                  {/* 接缝：压在旧章上的接触影（近实远虚两段）——"顶出"的物理接触证据 */}
                  <div style={{
                    position: 'absolute', top: -40, left: 0, right: 0, height: 40,
                    background: 'linear-gradient(to top, rgba(10,12,18,0.30), rgba(10,12,18,0.10) 35%, rgba(10,12,18,0))',
                  }} />
                  {/* 新章上缘 1px 受光边：色块是一块有厚度的整料 */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.35)' }} />
                </>
              )}
            </AbsoluteFill>
          );
        })}
      </SpeedBlur>
    </AbsoluteFill>
  );
};
