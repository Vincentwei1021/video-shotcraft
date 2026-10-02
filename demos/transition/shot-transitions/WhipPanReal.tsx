// E 式基本款 whip-pan——机位一拍横甩到下一场景，中段运动模糊糊到不可辨，借糊帧换景，甩完即停。
// 快节奏功能段连打（高能量→高能量的轻快款）。
//
// 第二轮重设计（酸柠夜 · 三连甩功能段）：
// - look = lime（石墨暗场 · 荧光黄绿）。不再是同一张页面甩来甩去：一条横向长舞台上并排三个功能段，
//   每段 = 左栏 112px 两行大标题（关键词用酸柠色）+ 等宽序号「01 / 03」+ 右侧一扇产品窗口
//   （真实截图纹理：projects-full 项目板 / wbr-full 周报正文 / papers-full 论文雷达），
//   两次 8f 甩镜连打 A→B→C，"连打"的节奏本身就是这个式的用法示范。
// - 三层视差让甩镜有纵深：标题背后的巨型描边序号（0.55× 相机速度，最远最慢）、窗口层（1×）、
//   标题层（1.14×，最近最快，落定时与窗口同时归位）；每层按自己的瞬时速度挂方向性拖影
//   （SpeedBlur，sd ≈ 0.085×速度、封顶 64px），静止段零滤镜，颜色与静帧完全一致。
// - 两景同一水平线（同 y），甩完即停，不回摆；底部三段进度条随落点点亮当前段。
//
// 时间表（30fps，共 126f）：
//   0–28    A hold：「Track every project.」+ 项目板（第 0 帧即完整画面）
//   28–36   甩 1（8f 跨 2880px，bezier(0.6,0,0.4,1)，峰值 ~680px/f）
//   36–72   B hold 36f：「Brief the whole lab.」+ 周报
//   72–80   甩 2（同曲线）
//   80–126  C hold 46f：「Read what matters.」+ 论文雷达，干净落定
import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { EASE, ramp, velocity, softShadow, SpeedBlur } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, type } from '../../_fixtures/Look';

export const WHIPPAN_DUR = 126;

const L = LOOKS.lime;
const SWING = 2880; // 每甩 1.5 屏
const WHIPS = [28, 72];
const WHIP_DUR = 8;
const SWING_EASE = Easing.bezier(0.6, 0, 0.4, 1);
const camAt = (f: number) =>
  WHIPS.reduce((acc, t0) => acc + interpolate(f, [t0, t0 + WHIP_DUR], [0, SWING], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: SWING_EASE }), 0);

const SCENES = [
  { no: '01', l1: 'Track every', l2: 'project.', hot: 'project.', meta: 'Projects · 10 active', src: 'textures/live/projects-full.png', pageW: 1920 * 0.84, pageX: -408 * 0.84 + 36, pageY: -186 * 0.84 },
  { no: '02', l1: 'Brief the', l2: 'whole lab.', hot: 'whole lab.', meta: 'Weekly · W28', src: 'textures/live/wbr-full.png', pageW: 1920, pageX: -420, pageY: -165 },
  { no: '03', l1: 'Read what', l2: 'matters.', hot: 'matters.', meta: 'Papers · 5 today', src: 'textures/live/papers-full.png', pageW: 1920 * 0.84, pageX: -408 * 0.84 + 36, pageY: -56 * 0.84 },
];
const WIN = { x: 880, y: 200, w: 1000, h: 680 };
const TEXT_X = 140;
const PAR_TEXT = 1.14;
const PAR_BG = 0.55;
// 描边序号用静态字体（可变字体 SF 的字形有重叠轮廓，描边会露出内部交叉线）
const NUM_FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';

export const WhipPanReal: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = camAt(frame);
  const v = velocity(camAt, frame); // px/f（相机向右 → 画面向左）

  // 当前段（落点后点亮）
  const active = frame < 32 ? 0 : frame < 76 ? 1 : 2;

  return (
    <AbsoluteFill style={{ background: L.bg[2], overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.66, y: 0.0 }} fill={{ x: 0.1, y: 1 }} intensity={0.8} />

      {/* 背景层：巨型描边序号（0.55× 视差） */}
      <SpeedBlur vx={-v * PAR_BG} amount={0.085} max={64}>
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translateX(${(-cam * PAR_BG).toFixed(2)}px)` }}>
          {SCENES.map((s, i) => (
            <div key={s.no} style={{
              position: 'absolute', left: i * SWING * PAR_BG + 20, top: 150, fontFamily: NUM_FONT, fontSize: 760,
              opacity: Math.max(0, 1 - Math.abs(cam - i * SWING) / 1500), // 只显示当前段的序号（邻段的不从窗口边露出来） fontWeight: 800,
              letterSpacing: '-0.06em', lineHeight: 1, color: 'transparent', WebkitTextStroke: `2px ${alpha(L.accent, 0.13)}`, whiteSpace: 'nowrap',
            }}>
              {s.no}
            </div>
          ))}
        </div>
      </SpeedBlur>

      {/* 窗口层（1×） */}
      <SpeedBlur vx={-v} amount={0.085} max={64}>
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translateX(${(-cam).toFixed(2)}px)` }}>
          {SCENES.map((s, i) => (
            <div key={s.no} style={{
              position: 'absolute', left: i * SWING + WIN.x, top: WIN.y, width: WIN.w, height: WIN.h, borderRadius: 22, overflow: 'hidden',
              background: '#f9f6f1', boxShadow: `0 0 0 1px ${alpha('#eaffc0', 0.14)}, ${softShadow(56, { color: L.shadow, strength: 3 })}`,
            }}>
              <Img src={staticFile(s.src)} style={{ position: 'absolute', left: s.pageX, top: s.pageY, width: s.pageW }} />
              <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${alpha('#ffffff', 0.06)} 0%, ${alpha('#ffffff', 0)} 30%, ${alpha('#0b0d06', 0.14)} 100%)` }} />
            </div>
          ))}
        </div>
      </SpeedBlur>

      {/* 标题层（1.14× 视差，最近最快） */}
      <SpeedBlur vx={-v * PAR_TEXT} amount={0.085} max={64}>
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translateX(${(-cam * PAR_TEXT).toFixed(2)}px)` }}>
          {SCENES.map((s, i) => (
            <div key={s.no} style={{ position: 'absolute', left: i * SWING * PAR_TEXT + TEXT_X, top: 300, whiteSpace: 'nowrap' }}>
              <div style={{ ...type(32, 600, { mono: true }), color: L.accent, letterSpacing: '0.12em', marginBottom: 34 }}>
                {s.no} <span style={{ color: L.ink3 }}>/ 03</span>
              </div>
              <div style={{ ...type(112, 760), color: L.ink, lineHeight: 1.0, letterSpacing: '-0.045em' }}>{s.l1}</div>
              <div style={{ ...type(112, 760), color: L.accent, lineHeight: 1.0, letterSpacing: '-0.045em' }}>{s.l2}</div>
              <div style={{ ...type(34, 500), color: L.ink2, marginTop: 40 }}>{s.meta}</div>
            </div>
          ))}
        </div>
      </SpeedBlur>

      {/* 底部三段进度条（屏幕固定）：落点后当前段点亮 */}
      <div style={{ position: 'absolute', left: TEXT_X, top: 968, display: 'flex', gap: 14 }}>
        {SCENES.map((s, i) => {
          const on = i === active ? ramp(frame, i === 0 ? -10 : WHIPS[i - 1] + 6, 10, EASE.snappy) : i < active ? 1 : 0;
          return (
            <div key={s.no} style={{ width: 96, height: 6, borderRadius: 3, background: alpha(L.ink, 0.14), overflow: 'hidden' }}>
              <div style={{ width: '100%', height: '100%', background: i === active ? L.accent : alpha(L.ink, 0.4), transform: `scaleX(${on.toFixed(4)})`, transformOrigin: '0 50%' }} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
