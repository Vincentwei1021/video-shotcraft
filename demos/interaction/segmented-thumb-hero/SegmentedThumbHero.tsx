// segmented-thumb-hero —— 分段控件 thumb 位移当叙事主角拍特写
// 源：perplexity-promo 2.3–5s。二段胶囊控件浮入，超大描边箭头光标从画外滑入按下，
// thumb 8f ease-out 滑到另一段，到位瞬间新图标弹簧弹出、旧图标收起。
//
// 第二轮重设计（酸柠暗场 · 「Wren」Chat → Agent 模式切换）：
// - look = lime（石墨底 · 荧光黄绿）。主体是一只 1240×232 的石墨下凹轨道（占画宽 65%），thumb 是一颗
//   发光的荧光黄绿胶囊——全画面唯一的强调色块；段标签 84px 粗体，thumb 上的字是墨色（onAccent）。
//   控件从下方带 26° 俯仰弹簧浮入并落平，台面上有一道极淡的镜面倒影 + 台面光池，像发布会舞台上的实物。
// - 因果四拍：白芯墨边 130px 箭头光标从右下画外 ease-out 滑入（有人来了）→ 按下 0.86 + 荧光细环涟漪
//   （做了决定）→ thumb 严格 8f 滑到 Agent，前缘先走后缘跟随的橡皮筋拉伸 + 速度拖影 + 一次 1.5% 过冲
//   （世界响应）→ 到位同帧：带笑脸的 Agent 图标弹簧弹出、Chat 图标收起且宽度归零让文字回流（新身份确立）。
// - 余波：thumb 一次泛光脉冲（Q4：只给主角一次）、台面光池转亮；控件下方副句逐词升起
//   「Now it doesn't just answer. It acts.」，眉题「WREN 2 · AGENT MODE」字距收拢。
//
// 时间表（30fps，共 120f）：
//   0–22    控件浮入（spring damping 15，俯仰 26°→0、上移 220px→0）；眉题 6–24f
//   22–46   光标滑入 24f（ease-out cubic，起点整只在画外）
//   48      按下（3f 下、4f 回）+ 涟漪 12f
//   52–60   thumb 8f 滑动（全镜心跳）
//   60–74   图标弹出（spring damping 10 / stiffness 220）、旧图标 6f 塌缩；thumb 泛光脉冲
//   66–90   副句逐词升起
//   90–120  hold 30f（极缓 1.5% 推进 + 光的呼吸）
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { FONT, SpeedBlur, mix, ramp, EASE, velocity } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, springAt, type } from '../../_fixtures/Look';

const L = LOOKS.lime;

export const SEGMENTED_THUMB_HERO_DURATION = 120;

const T = { float: 0, cursorIn: 22, click: 48, slide: 52, slideEnd: 60, caption: 66 };
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// 控件几何
const CW = 1240;
const CH = 232;
const PAD = 16;
const SEGW = (CW - PAD * 2) / 2;
const TH = CH - PAD * 2;
const CX = 960 - CW / 2; // 控件左上（画布坐标）
const CY = 470 - CH / 2;

// 光标落点（尖端）：Agent 段中右
const TIP = { x: CX + PAD + SEGW * 1.62, y: CY + CH * 0.62 };

const ArrowCursor: React.FC<{ x: number; y: number; press: number }> = ({ x, y, press }) => (
  <svg
    width={130}
    height={150}
    viewBox="0 0 26 30"
    style={{
      position: 'absolute', left: x - 20, top: y - 10,
      transform: `scale(${(1 - press * 0.14).toFixed(4)})`, transformOrigin: '20px 10px',
      filter: `drop-shadow(0 ${2 - press}px ${3 - press}px rgba(0,0,0,0.5)) drop-shadow(0 ${14 - press * 6}px ${20 - press * 6}px rgba(0,0,0,0.45))`,
    }}
  >
    <path d="M4 2 L4 24 L9.5 18.5 L13 27 L16.8 25.4 L13.3 17 L21 17 Z" fill="#ffffff" stroke="#0b0d06" strokeWidth={1.5} strokeLinejoin="round" />
  </svg>
);

// 旧身份：对话气泡
const ChatIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <path d="M8 11.5A4.5 4.5 0 0 1 12.5 7h15A4.5 4.5 0 0 1 32 11.5v10a4.5 4.5 0 0 1-4.5 4.5H18l-7 6v-6h-.5A2.5 2.5 0 0 1 8 23.5z" stroke={color} strokeWidth={3} strokeLinejoin="round" />
    <path d="M15 16.5h10M15 21h6" stroke={color} strokeWidth={3} strokeLinecap="round" />
  </svg>
);

// 新身份：带表情的小机器人（表情是奖励感的一半）
const AgentIcon: React.FC<{ size: number; color: string; blink: number }> = ({ size, color, blink }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <path d="M20 4.5v5" stroke={color} strokeWidth={3} strokeLinecap="round" />
    <circle cx={20} cy={4} r={2.4} fill={color} />
    <rect x={6.5} y={10.5} width={27} height={22} rx={7} stroke={color} strokeWidth={3} />
    <ellipse cx={15} cy={19.5} rx={2.3} ry={2.3 * (1 - blink * 0.85)} fill={color} />
    <ellipse cx={25} cy={19.5} rx={2.3} ry={2.3 * (1 - blink * 0.85)} fill={color} />
    <path d="M14.5 25 Q20 29.2 25.5 25" stroke={color} strokeWidth={2.8} strokeLinecap="round" />
    <path d="M3 19v6M37 19v6" stroke={color} strokeWidth={3} strokeLinecap="round" />
  </svg>
);

const hexRGB = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lerpHex = (a: string, b: string, t: number) => {
  const pa = hexRGB(a), pb = hexRGB(b);
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
};

// 控件本体（倒影里再画一次，所以抽成纯函数组件）
const Control: React.FC<{ frame: number }> = ({ frame }) => {
  const slide = (f: number, ease: (x: number) => number) => interpolate(f, [T.slide, T.slideEnd], [0, 1], { ...clamp, easing: ease });
  const thumbT = slide(frame, Easing.out(Easing.cubic));
  const settle = (f: number) =>
    f < T.slideEnd ? 0 : 0.015 * Math.sin(Math.min(1, (f - T.slideEnd) / 6) * Math.PI) * (1 - Math.min(1, (f - T.slideEnd) / 6));
  const leadAt = (f: number) => slide(f, Easing.out(Easing.poly(4))) + settle(f);
  const trailAt = (f: number) => slide(f, Easing.out(Easing.quad)) + settle(f);
  const thumbL = PAD + trailAt(frame) * SEGW;
  const thumbR = PAD + SEGW + leadAt(frame) * SEGW;
  const thumbV = velocity((f) => PAD + slide(f, Easing.out(Easing.cubic)) * SEGW, frame);

  // 图标：到位同帧新图标弹簧弹出，旧图标 6f ease-in 塌缩（宽度同步归零让文字回流）
  const agentScale = frame >= T.slideEnd ? springAt(frame, T.slideEnd, { damping: 10, stiffness: 220, mass: 0.6 }) : 0;
  const chatScale = interpolate(frame, [T.slide, T.slide + 6], [1, 0], { ...clamp, easing: Easing.in(Easing.cubic) });
  const blink = interpolate(frame, [96, 98, 101], [0, 1, 0], clamp); // 落定后眨一次眼
  const compAmt = Math.min(1, Math.max(0, (thumbT - 0.2) / 0.6));
  // 到位泛光脉冲（只此一次）
  const pulse = interpolate(frame, [T.slideEnd - 1, T.slideEnd + 3, T.slideEnd + 26], [0, 1, 0], clamp);

  // 点击涟漪：圆心锁点击点，压在 thumb 之上
  const rippleT = interpolate(frame, [T.click, T.click + 12], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  const tipLocal = { x: TIP.x - CX, y: TIP.y - CY };

  const label = (active: number, children: React.ReactNode) => (
    <div style={{
      width: SEGW, height: TH, position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 26,
      ...type(84, 720), letterSpacing: '-0.035em', color: lerpHex(L.ink2, L.onAccent, active),
    }}>{children}</div>
  );

  return (
    <div style={{
      position: 'relative', width: CW, height: CH, borderRadius: CH / 2, boxSizing: 'border-box', padding: PAD, display: 'flex', alignItems: 'center',
      background: `linear-gradient(180deg, #0f110d 0%, ${L.surface2} 100%)`,
      border: `1px solid ${L.line}`,
      boxShadow: `inset 0 3px 8px rgba(0,0,0,0.6), inset 0 -1px 0 rgba(255,255,255,0.06), 0 1px 0 rgba(255,255,255,0.05)`,
      fontFamily: FONT.sans,
    }}>
      {/* thumb：发光的荧光黄绿胶囊，滑动中前后缘错开形成拉伸 + 速度拖影 */}
      <SpeedBlur vx={thumbV} amount={0.06} max={7} style={{ zIndex: 1 }}>
        <div style={{
          position: 'absolute', left: thumbL, top: PAD, width: thumbR - thumbL, height: TH, borderRadius: TH / 2, overflow: 'hidden',
          background: `linear-gradient(180deg, #dcff6a 0%, ${L.accent} 55%, #a9d81c 100%)`,
          boxShadow: `inset 0 2px 0 rgba(255,255,255,0.55), inset 0 -6px 14px rgba(60,90,0,0.35), 0 0 0 1px rgba(20,30,0,0.4), ` +
            `0 0 ${(30 + 50 * pulse).toFixed(1)}px ${alpha(L.accent, 0.28 + 0.4 * pulse)}, 0 18px 40px -12px rgba(0,0,0,0.7)`,
        }}>
          {/* 顶部一道受光高光带 */}
          <div style={{ position: 'absolute', left: '6%', right: '6%', top: 6, height: '38%', borderRadius: 999, background: 'linear-gradient(180deg, rgba(255,255,255,0.4), rgba(255,255,255,0))' }} />
        </div>
      </SpeedBlur>
      {rippleT > 0 && rippleT < 1 && (
        <div style={{
          position: 'absolute', left: tipLocal.x - 150 * rippleT, top: tipLocal.y - 150 * rippleT, width: 300 * rippleT, height: 300 * rippleT,
          borderRadius: '50%', boxSizing: 'border-box', border: `3px solid ${L.accent}`, zIndex: 3,
          background: `radial-gradient(circle, ${alpha(L.accent, 0)} 50%, ${alpha(L.accent, 0.16)} 100%)`, opacity: (1 - rippleT) * 0.95,
          boxShadow: `0 0 18px ${alpha(L.accent, 0.5)}`,
        }} />
      )}
      {label(1 - compAmt, <>
        <span style={{ display: 'inline-flex', transform: `scale(${chatScale.toFixed(4)})`, width: chatScale < 0.05 ? 0 : 84 * Math.max(0.3, chatScale), overflow: 'visible', justifyContent: 'center' }}>
          <ChatIcon size={84} color={lerpHex(L.ink2, L.onAccent, 1 - compAmt)} />
        </span>
        Chat
      </>)}
      {label(compAmt, <>
        <span style={{ display: 'inline-flex', transform: `scale(${agentScale.toFixed(4)})`, width: agentScale < 0.05 ? 0 : 88, overflow: 'visible', justifyContent: 'center' }}>
          <AgentIcon size={88} color={L.onAccent} blink={blink} />
        </span>
        Agent
      </>)}
    </div>
  );
};

export const SegmentedThumbHero: React.FC = () => {
  const frame = useCurrentFrame();

  // 浮入：弹簧驱动上移 + 俯仰落平 + 阴影收紧
  const floatT = springAt(frame, T.float, { damping: 15, stiffness: 110, mass: 0.9 });
  const ctrlY = mix(220, 0, floatT);
  const tilt = mix(26, 0, floatT);
  const ctrlOp = Math.min(1, floatT * 1.6);

  // 光标：24f ease-out 从右下画外滑入
  const curT = interpolate(frame, [T.cursorIn, T.cursorIn + 24], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const curX = mix(2080, TIP.x, curT);
  const curY = mix(1260, TIP.y, curT);
  const press = interpolate(frame, [T.click, T.click + 3, T.click + 7], [0, 1, 0], clamp);
  // 点完手挪开一点：thumb 到位后光标向右下让 46/38px
  const away = ramp(frame, T.slideEnd + 8, 24, EASE.swift);

  const switched = ramp(frame, T.slideEnd, 20, EASE.out);
  const cam = 1 + 0.015 * ramp(frame, 60, 60, EASE.smooth);

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', background: L.bg[1] }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.02 }} fill={null} breathe={0.6} intensity={0.72 + 0.2 * switched} />

      <div style={{ position: 'absolute', inset: 0, transform: `scale(${cam.toFixed(4)})`, transformOrigin: '50% 45%' }}>
        {/* 台面光池：切换后转亮（世界响应的余波） */}
        <div style={{
          position: 'absolute', left: 960 - 900, top: CY + CH - 10, width: 1800, height: 300, opacity: floatT,
          background: `radial-gradient(ellipse 50% 50% at ${mix(38, 62, switched)}% 22%, ${alpha(L.accent, 0.07 + 0.11 * switched)} 0%, ${alpha(L.accent, 0)} 70%)`,
        }} />

        {/* 眉题 */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: CY - 132, textAlign: 'center', ...type(28, 700, { caps: true }),
          color: L.ink2, opacity: ramp(frame, 6, 16, EASE.out), letterSpacing: `${mix(0.5, 0.22, ramp(frame, 6, 22, EASE.snappy)).toFixed(3)}em`,
        }}>
          Wren 2 <span style={{ color: L.ink3 }}>·</span> <span style={{ color: switched > 0.5 ? L.accent : L.ink2 }}>Agent mode</span>
        </div>

        {/* 控件 + 镜面倒影（同一层做俯仰） */}
        <div style={{
          position: 'absolute', left: CX, top: CY, width: CW, height: CH, opacity: ctrlOp,
          transform: `translateY(${ctrlY.toFixed(2)}px) perspective(1800px) rotateX(${tilt.toFixed(2)}deg)`, transformOrigin: '50% 100%',
        }}>
          {/* 落地影：浮入时大而虚，落平后收紧 */}
          <div style={{
            position: 'absolute', left: 60, right: 60, top: CH - 20, height: 70, borderRadius: '50%',
            background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 70%)',
            filter: `blur(${mix(30, 14, floatT).toFixed(1)}px)`, transform: `translateY(${mix(40, 0, floatT).toFixed(1)}px)`,
          }} />
          {/* 倒影：翻转 + 渐隐，极淡 */}
          <div style={{
            position: 'absolute', left: 0, top: CH + 10, width: CW, height: CH, transform: 'scaleY(-1)', opacity: 0.16,
            WebkitMaskImage: 'linear-gradient(0deg, #000 0%, transparent 55%)', maskImage: 'linear-gradient(0deg, #000 0%, transparent 55%)',
          }}>
            <Control frame={frame} />
          </div>
          <div style={{ position: 'absolute', inset: 0 }}>
            <Control frame={frame} />
          </div>
        </div>

        {/* 副句：切换后逐词升起 */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: CY + CH + 150, textAlign: 'center', ...type(60, 600), letterSpacing: '-0.03em', color: L.ink }}>
          <TextReveal text="Now it doesn’t just answer." by="word" variant="rise" start={T.caption} each={16} gap={3} />
          <span> </span>
          <TextReveal text="It acts." by="word" variant="rise" start={T.caption + 14} each={16} gap={3} unitStyle={() => ({ color: L.accent })} />
        </div>
      </div>

      {frame >= T.cursorIn && (
        <ArrowCursor x={curX + 46 * away} y={curY + 38 * away} press={press} />
      )}
    </div>
  );
};
