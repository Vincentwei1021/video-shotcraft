// 金田透视急停（kanada-perspective-snap）——金田伊功式夸张透视入场：卡片以鱼眼级透视姿态贴着镜头
// 从左侧甩进画面中心，透视随减速从短焦收敛到长焦，落定瞬间"啪"地弹平（rotateY 过冲再回零）。
//
// 第二轮重设计（极光夜 · 发布片首映卡）：
// - look = aurora（紫黑 · 紫 · 粉）。主角是一支用 video-shotcraft 拍的发布片首映卡（1000×580）：左半是程序化插画
//   （霓虹黄昏天空 + 条纹落日 + 城市剪影 + 水面倒影），右半是 92px 片名「Launch Film」、片子信息与 Watch now 按钮。
//   顶部一条 168px 低透明大字带「FRAME MOTION ✦ CRAFT THE SHOT」（品牌短句）做海报底，缓慢反向漂移（视差）。
// - 甩入 18f（2→20f）：translateX −1350→0 + 轻微下弧、rotate3d(0.5,1,0.1) 62°→0、scale 1.8→1、
//   perspective 260→1800px，全部 EASE.snappy（先猛后缓的急停）；按 x 速度给水平 SpeedBlur + 身后 7 条粉白速度线。
// - "啪"在过冲：16–20f rotateY 冲到 +6°，20f 起弹簧（damping 16）回零；同帧 2f 震屏 8px、
//   一圈动漫集中线（48 道细楔形从画框边缘指向卡心）8f 内向外退散——金田流的"定格一拍"。
// - 跟随：卡内文字比卡片晚 3f 落定（片名带 −10° skew 收正的"拖影"），落定后字幕逐词升起。
//
// 时间表（30fps，共 120f）：
//   0–2     预备：舞台光、背景大字已在，卡片近角在左缘外
//   2–20    透视甩入（主动作 18f）
//   16–26   rotateY 过冲 +6° → 弹簧回零；20f 震屏 2f + 集中线 8f
//   23–36   跟随：卡内文字晚一拍滑入落定、片名 skew 收正
//   34–56   字幕「Premieres Friday · shot with video-shotcraft」逐词升起
//   56–120  hold：极缓推镜 1→1.025、背景大字慢漂
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, SpeedBlur, bezier, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, springAt } from '../../_fixtures/Look';
import { BRAND, ShotcraftMark } from '../../_fixtures/Brand';

export const KANADA_PERSPECTIVE_SNAP_DURATION = 120;

const L = LOOKS.aurora;
const PINK = L.accent2;
const T0 = 2; // 甩入起点
const SNAP = 20; // 落定帧
const CW = 1000;
const CH = 580;
const CX = (1920 - CW) / 2; // 460
const CY = 236;

// 确定性伪随机
const rnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const progAt = (f: number) => ramp(f, T0, SNAP - T0, EASE.snappy);
// 姿态（透视 / 扭转 / 缩放）比位移晚收：卡片"扭着"冲到位，最后几帧才被拍平——金田流的关键
const TWIST = bezier(0.62, 0, 0.3, 1);
const twistAt = (f: number) => ramp(f, T0, SNAP - T0 - 2, TWIST);
const txAt = (f: number) => mix(-1350, 0, progAt(f));
const tyAt = (f: number) => 120 * Math.sin((1 - progAt(f)) * Math.PI * 0.5) * (1 - progAt(f)); // 轻微下弧

// 速度线（相对卡片中心 y、长度系数、粗细）
const STREAKS = [-250, -170, -90, -20, 60, 140, 230].map((y, i) => ({ y, len: 0.7 + rnd(i + 3) * 0.6, w: 2 + rnd(i + 11) * 3 }));
// 集中线：48 道细楔形
const FOCUS = Array.from({ length: 48 }, (_, i) => ({
  a: (i / 48) * Math.PI * 2 + (rnd(i * 3.3) - 0.5) * 0.09,
  w: 0.006 + rnd(i * 5.1) * 0.014, // 楔形角宽（弧度）
  r0: 560 + rnd(i * 7.7) * 220, // 内端半径
}));
// 城市剪影：确定性楼宇
const TOWERS = Array.from({ length: 16 }, (_, i) => ({ x: i * 36 - 6, w: 30 + rnd(i * 2.1) * 18, h: 50 + rnd(i * 4.7) ** 1.4 * 150 }));

const Artwork: React.FC = () => (
  <svg width={560} height={CH} viewBox={`0 0 560 ${CH}`} style={{ position: 'absolute', left: 0, top: 0 }}>
    <defs>
      <linearGradient id="kps-sky" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#1d0b3d" />
        <stop offset="0.38" stopColor="#5b1f78" />
        <stop offset="0.6" stopColor="#ff5fa2" />
        <stop offset="0.7" stopColor="#ffb36b" />
      </linearGradient>
      <linearGradient id="kps-sun" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#fff1a8" />
        <stop offset="0.55" stopColor="#ffb15e" />
        <stop offset="1" stopColor="#ff4f9a" />
      </linearGradient>
      <linearGradient id="kps-water" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#ff7aa8" stopOpacity="0.55" />
        <stop offset="1" stopColor="#14082a" stopOpacity="1" />
      </linearGradient>
      <mask id="kps-stripes">
        <rect x={0} y={0} width={560} height={CH} fill="#fff" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={0} y={300 + i * 18 + i * i * 1.2} width={560} height={3 + i * 2.2} fill="#000" />
        ))}
      </mask>
    </defs>
    <rect x={0} y={0} width={560} height={CH} fill="url(#kps-sky)" />
    {/* 高空星点 */}
    {Array.from({ length: 30 }, (_, i) => (
      <circle key={i} cx={rnd(i * 9.1) * 560} cy={rnd(i * 3.7 + 1) * 180} r={0.8 + rnd(i * 1.3) * 1.6} fill="#fff" opacity={0.4 + rnd(i * 6.2) * 0.5} />
    ))}
    {/* 条纹落日 */}
    <circle cx={280} cy={330} r={150} fill="url(#kps-sun)" mask="url(#kps-stripes)" />
    <circle cx={280} cy={330} r={190} fill="none" stroke="#ffd3a1" strokeOpacity={0.18} strokeWidth={30} />
    {/* 城市剪影 + 零星亮窗 */}
    {TOWERS.map((t, i) => (
      <g key={i}>
        <rect x={t.x} y={410 - t.h} width={t.w} height={t.h} fill={i % 3 === 0 ? '#2a0f45' : '#1b0a30'} />
        {Array.from({ length: Math.floor(t.h / 26) }, (_, k) =>
          rnd(i * 13 + k * 3.1) > 0.62 ? (
            <rect key={k} x={t.x + 6 + (k % 2) * 10} y={410 - t.h + 10 + k * 24} width={5} height={8} fill={rnd(i + k) > 0.5 ? '#ff8fc0' : '#ffd27a'} opacity={0.85} />
          ) : null,
        )}
      </g>
    ))}
    {/* 水面倒影 */}
    <rect x={0} y={410} width={560} height={CH - 410} fill="url(#kps-water)" />
    {Array.from({ length: 9 }, (_, i) => (
      <rect key={i} x={170 + rnd(i * 2.7) * 40 - i * 4} y={424 + i * 15} width={220 - i * 18 + rnd(i) * 30} height={3} rx={1.5} fill="#ffd7a0" opacity={0.55 - i * 0.05} />
    ))}
  </svg>
);

export const KanadaPerspectiveSnap: React.FC = () => {
  const frame = useCurrentFrame();

  const p = progAt(frame);
  const tw = twistAt(frame);
  const persp = mix(260, 1800, tw); // 短焦鱼眼 → 长焦收平
  const angle3d = mix(62, 0, tw); // rotate3d(0.5,1,0.1)
  const scale = mix(1.8, 1, mix(p, tw, 0.5));
  const tx = txAt(frame);
  const ty = tyAt(frame);
  const vx = frame < SNAP + 2 ? txAt(frame + 0.5) - txAt(frame - 0.5) : 0;

  // rotateY 过冲：16–20f 冲到 +6°，20f 起弹簧回零（一次可见回弹）
  const rotY = frame < SNAP ? 6 * ramp(frame, 15, 5, EASE.swift) : 6 * (1 - springAt(frame, SNAP, { damping: 16, stiffness: 260 }));

  // 落定震屏：20f 起 8px，2f 衰减（之后恒为 0）
  const shakeAmp = frame >= SNAP && frame < SNAP + 3 ? 8 * (1 - (frame - SNAP) / 3) : 0;
  const shakeX = shakeAmp * (rnd(frame * 7 + 1) * 2 - 1);
  const shakeY = shakeAmp * (rnd(frame * 13 + 2) * 2 - 1);

  // 阴影：飞行期拉长斜影 → 落定收为静置投影
  const air = 1 - ramp(frame, T0, SNAP - T0 + 4, EASE.out);
  const cardShadow =
    `0 ${(2 + air * 8).toFixed(1)}px ${(6 + air * 14).toFixed(1)}px ${alpha('#05010d', 0.5 - air * 0.2)}, ` +
    `${(air * 90).toFixed(1)}px ${(40 + air * 50).toFixed(1)}px ${(90 + air * 40).toFixed(1)}px -20px ${alpha('#05010d', 0.75)}, ` +
    `0 0 0 1px ${alpha('#d9c6ff', 0.14)}`;

  // 速度线：长度 ∝ 速度，减速到 ~5px/帧时淡没
  const streakA = ramp(Math.abs(vx), 5, 40, EASE.linear);

  // 集中线：落定帧起 8f，内端半径向外退、整体淡出
  const fT = (frame - SNAP) / 9;
  const focusOn = fT >= 0 && fT < 1;

  // 跟随：卡内文字晚 3f 落定
  const follow = ramp(frame, SNAP + 3, 13, EASE.snappy);
  const skew = mix(-10, 0, follow);

  // 背景大字：视差慢漂 + 甩入时被"带"一下
  const bgX = -40 * ramp(frame, 0, 120, EASE.linear) - 60 * (1 - ramp(frame, 0, SNAP + 6, EASE.out));
  const push = 1 + 0.025 * ramp(frame, SNAP, 100, EASE.swift);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.18 }} fill={{ x: 0.14, y: 0.92 }} horizon={0.83} />
      <div style={{ position: 'absolute', inset: 0, transform: `translate(${shakeX.toFixed(2)}px, ${shakeY.toFixed(2)}px) scale(${push.toFixed(5)})` }}>
        {/* 顶部低透明实心大字带（描边会露出可变字体的重叠轮廓，故用实心）：海报主视觉式的品牌短句跑马，画框两端裁切 */}
        <div style={{
          position: 'absolute', left: -400, top: 28, transform: `translateX(${bgX.toFixed(1)}px)`,
          font: `900 168px ${FONT.sans}`, letterSpacing: '-0.035em', lineHeight: 1, color: alpha('#c9b6ff', 0.085), whiteSpace: 'nowrap',
          opacity: ramp(frame, 0, 10, EASE.out),
        }}>
          FRAME MOTION <span style={{ color: alpha(PINK, 0.22) }}>✦</span> CRAFT THE SHOT <span style={{ color: alpha(PINK, 0.22) }}>✦</span> FRAME MOTION
        </div>

        {/* 集中线 */}
        {focusOn && (
          <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, opacity: (1 - fT) * 0.9 }}>
            {FOCUS.map((l, i) => {
              const r0 = l.r0 + EASE.out(fT) * 420;
              const r1 = 1500;
              const cx = 960;
              const cy = CY + CH / 2;
              const pts = [
                [cx + Math.cos(l.a - l.w) * r1, cy + Math.sin(l.a - l.w) * r1],
                [cx + Math.cos(l.a) * r0, cy + Math.sin(l.a) * r0],
                [cx + Math.cos(l.a + l.w) * r1, cy + Math.sin(l.a + l.w) * r1],
              ];
              return <polygon key={i} points={pts.map((q) => q.map((v) => v.toFixed(1)).join(',')).join(' ')} fill={i % 4 === 0 ? PINK : '#f3ecff'} opacity={i % 4 === 0 ? 0.75 : 0.5} />;
            })}
          </svg>
        )}

        {/* 速度线（卡片身后，水平拖尾） */}
        {streakA > 0.001 &&
          STREAKS.map((s, i) => {
            const len = Math.min(1400, Math.abs(vx) * 9 * s.len);
            const x1 = CX + tx + 120;
            return (
              <div key={i} style={{
                position: 'absolute', left: x1 - len, top: CY + CH / 2 + ty + s.y * mix(1.5, 1, p) - s.w / 2, width: len, height: s.w, borderRadius: s.w,
                background: `linear-gradient(90deg, ${alpha(i % 3 === 0 ? PINK : '#f3ecff', 0)} 0%, ${alpha(i % 3 === 0 ? PINK : '#f3ecff', 0.7)} 100%)`,
                opacity: streakA,
              }} />
            );
          })}

        {/* 透视容器 + 卡片 */}
        <SpeedBlur vx={vx} amount={0.2} max={26}>
          <div style={{ position: 'absolute', left: CX, top: CY, width: CW, height: CH, perspective: `${persp.toFixed(1)}px`, perspectiveOrigin: '30% 50%' }}>
            <div style={{
              position: 'absolute', inset: 0,
              transform: `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${scale.toFixed(4)}) rotate3d(0.5, 1, 0.1, ${angle3d.toFixed(3)}deg) rotateY(${rotY.toFixed(3)}deg)`,
              transformOrigin: '20% 50%',
            }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: 30, overflow: 'hidden', background: '#170f2a', boxShadow: cardShadow }}>
                <Artwork />
                {/* 插画与信息区的过渡 */}
                <div style={{ position: 'absolute', left: 470, top: 0, width: 98, height: CH, background: `linear-gradient(90deg, ${alpha('#170f2a', 0)} 0%, #170f2a 100%)` }} />
                {/* 信息区：晚一拍落定 */}
                <div style={{
                  position: 'absolute', left: 600, top: 0, width: 360, height: CH, fontFamily: FONT.sans, color: L.ink,
                  transform: `translateX(${mix(-36, 0, follow).toFixed(2)}px)`, opacity: mix(0.4, 1, follow),
                }}>
                  <div style={{ position: 'absolute', top: 76, left: 0, height: 44, padding: '0 16px', borderRadius: 10, background: PINK, color: '#1a0614', display: 'flex', alignItems: 'center', font: `800 22px ${FONT.mono}`, letterSpacing: '0.1em' }}>
                    PREMIERE
                  </div>
                  {/* 出品方标志：与 PREMIERE 签同排右对齐 */}
                  <ShotcraftMark size={44} tone="dark" style={{ position: 'absolute', top: 76, right: 0 }} />
                  <div style={{ position: 'absolute', top: 150, left: -4, font: `880 92px ${FONT.sans}`, letterSpacing: '-0.05em', lineHeight: 0.92, transform: `skewX(${skew.toFixed(2)}deg)`, transformOrigin: '0 100%' }}>
                    Launch
                    <br />
                    Film
                  </div>
                  <div style={{ position: 'absolute', top: 338, left: 0, font: `600 30px ${FONT.sans}`, color: L.ink2, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                    Your product, in motion.
                  </div>
                  <div style={{ position: 'absolute', top: 382, left: 0, font: `500 26px ${FONT.mono}`, color: L.ink3, letterSpacing: '0.04em' }}>60 SEC · 16:9 · 1080P</div>
                  <div style={{ position: 'absolute', top: 452, left: 0, display: 'flex', gap: 14 }}>
                    <div style={{ height: 64, padding: '0 28px', borderRadius: 32, background: '#f7f2ff', color: '#140a24', display: 'flex', alignItems: 'center', gap: 12, font: `750 28px ${FONT.sans}`, letterSpacing: '-0.01em', boxShadow: `0 10px 30px -10px ${alpha(PINK, 0.7)}` }}>
                      <svg width={20} height={22} viewBox="0 0 20 22"><path d="M2 2 L18 11 L2 20 Z" fill="#140a24" /></svg>
                      Watch now
                    </div>
                    <div style={{ width: 64, height: 64, borderRadius: 32, border: `2px solid ${alpha('#f7f2ff', 0.3)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `400 36px ${FONT.sans}`, color: L.ink }}>+</div>
                  </div>
                </div>
                {/* 顶缘内高光 */}
                <div style={{ position: 'absolute', inset: 0, borderRadius: 30, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>
        </SpeedBlur>

        {/* 字幕：落定后逐词升起 */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: CY + CH + 64, textAlign: 'center', font: `600 44px ${FONT.sans}`, letterSpacing: '-0.02em', color: L.ink }}>
          <TextReveal text="Premieres Friday" by="word" variant="rise" start={34} each={16} gap={4} />
          <span style={{ color: L.ink3 }}>
            <TextReveal text="  ·  shot with " by="word" variant="rise" start={40} each={16} gap={4} />
          </span>
          <span style={{ color: PINK }}>
            <TextReveal text={BRAND.name} by="word" variant="rise" start={46} each={16} gap={4} />
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
