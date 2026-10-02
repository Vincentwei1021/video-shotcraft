// 三连咔哒特写（wright-triple-cut）——Edgar Wright《僵尸肖恩》流程三连快切:
// 帧 0–24 全景 hold(FakeDashboard A);随后三个 10f 特写硬切连打,每个特写
// 前 4f 静止、中 3f 动作、后 3f 静止:①25–34 光标按下 Deploy 按钮(按钮压下变深)
// ②35–44 Auto-deploy 开关左拨右(圆钮 3f 滑动 + 轨道变强调色) ③45–54 计数翻牌 0→1;
// 帧 55 甩回全景:6f whip translateX 滑入,高速段按速度挂方向性运动模糊,
// Deploys 卡片抬起 + 强调色描边泛光 + "+1" 角标标记结果;帧 ~84 起全静止到 130(真静止 ≥45f)。
// 质感：特写不再是"灰底大白卡里一根灰条"——背景是同一页面的超近虚焦（微距景深），
// 前景是成品级控件：渐变按钮 + 真箭头光标 + 按压阴影收缩、iOS 式开关（圆钮滑动时拉伸）、
// 分体翻牌（上下两片 + 铰线 + 翻页暗面）；结果卡外一圈极淡压暗把视线收向答案。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { Card, FakeDashboard, G } from '../../_fixtures/Fixtures';
import { EASE, FONT, Grain, SpeedBlur, Vignette, mix, ramp, softShadow, tracking, velocity } from '../../_fixtures/Polish';

export const WRIGHT_TRIPLE_CUT_DURATION = 130; // 全景 25f + 三特写 30f + 甩回与结果 75f

const HOLD_END = 25; // 全景 hold 结束
const C1 = 25; // 特写一:光标按下
const C2 = 35; // 特写二:开关
const C3 = 45; // 特写三:翻牌
const WHIP = 55; // 甩回全景

// 结果卡片(3×2 网格下中格 Deploys)的几何:sidebar 220 + padding 36,列宽 524,行高 454
const RESULT = { left: 808, top: 590, w: 524, h: 454 };

// 特写动作进度:局部 4–7f(3f 动作窗)
const act = (f: number, start: number, ease: (t: number) => number) => ramp(f, start + 4, 3, ease);

// 特写统一舞台:同一页面的超近虚焦作底(微距景深)+ 柔光压亮,主体屏心、同倍率感
const CloseupStage: React.FC<{ fx: number; children: React.ReactNode }> = ({ fx, children }) => (
  <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', background: G.canvas }}>
    <div style={{
      position: 'absolute', inset: 0, transformOrigin: `${fx}px 800px`,
      transform: `translate(${960 - fx}px, -260px) scale(2.6)`, filter: 'blur(14px) saturate(0.85)',
    }}>
      <FakeDashboard variant="A" />
    </div>
    <div style={{
      position: 'absolute', inset: 0,
      background: 'radial-gradient(ellipse 60% 62% at 50% 48%, rgba(246,246,244,0.72) 0%, rgba(240,240,238,0.5) 60%, rgba(228,228,224,0.4) 100%)',
    }} />
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </div>
  </div>
);

// macOS 式箭头光标(黑芯白边),tip 在 (0,0)
const Cursor: React.FC<{ x: number; y: number; scale: number }> = ({ x, y, scale }) => (
  <svg width={96} height={140} viewBox="-1 -1 18 26" style={{
    position: 'absolute', left: x, top: y, overflow: 'visible', transformOrigin: '0 0',
    transform: `scale(${scale})`, filter: 'drop-shadow(0 6px 10px rgba(16,18,26,0.28))',
  }}>
    <path d="M0 0 L0 20.5 L4.9 15.9 L8.1 23.4 L11.4 22 L8.3 14.7 L14.8 14.7 Z" fill="#111216" stroke="#ffffff" strokeWidth={1.3} strokeLinejoin="round" />
  </svg>
);

// 分体翻牌的一半:整块牌面放进半高窗口,top=0 取上半、top=-H/2 取下半
const TILE_W = 440;
const TILE_H = 560;
const Half: React.FC<{ digit: string; part: 'top' | 'bottom'; shade?: number }> = ({ digit, part, shade = 0 }) => (
  <div style={{
    position: 'absolute', left: 0, top: part === 'top' ? 0 : TILE_H / 2, width: TILE_W, height: TILE_H / 2, overflow: 'hidden',
    borderRadius: part === 'top' ? '32px 32px 0 0' : '0 0 32px 32px',
  }}>
    <div style={{
      position: 'absolute', left: 0, top: part === 'top' ? 0 : -TILE_H / 2, width: TILE_W, height: TILE_H,
      background: 'linear-gradient(180deg, #2a2c34 0%, #1c1d23 50%, #17181d 50.2%, #121317 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        fontFamily: FONT.sans, fontWeight: 700, fontSize: 420, lineHeight: 1, color: '#f4f4f6',
        letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums',
      }}>{digit}</div>
    </div>
    {shade > 0.005 && <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${shade})` }} />}
  </div>
);

// 特写三的画面(翻牌进度 p),甩回时也用它的终态做出画的上一镜
const FlipCloseup: React.FC<{ p: number }> = ({ p }) => {
  // 前半:上片带旧数字绕铰线向后翻倒 0→-90°;后半:下片带新数字从 90°落回 0
  const topAngle = p < 0.5 ? -180 * p : -90;
  const botAngle = p < 0.5 ? 90 : 180 * (1 - p);
  return (
    <CloseupStage fx={1070}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}>
        <div style={{ position: 'relative', width: TILE_W, height: TILE_H, perspective: 1600, borderRadius: 32, boxShadow: softShadow(28, { strength: 1.4 }) }}>
          {/* 静止层:上半已是新数字,下半仍是旧数字 */}
          <Half digit="1" part="top" />
          <Half digit="0" part="bottom" />
          {/* 翻动层 */}
          {p < 0.5 && (
            <div style={{ position: 'absolute', inset: 0, transformOrigin: `50% ${TILE_H / 2}px`, transform: `rotateX(${topAngle}deg)`, backfaceVisibility: 'hidden' }}>
              <Half digit="0" part="top" shade={0.5 * p * 2} />
            </div>
          )}
          {p >= 0.5 && (
            <div style={{ position: 'absolute', inset: 0, transformOrigin: `50% ${TILE_H / 2}px`, transform: `rotateX(${botAngle}deg)`, backfaceVisibility: 'hidden' }}>
              <Half digit="1" part="bottom" shade={0.45 * (1 - p) * 2} />
            </div>
          )}
          {/* 铰线 + 顶面高光 */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: TILE_H / 2 - 2, height: 4, background: '#0b0c0f', boxShadow: '0 1px 0 rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'absolute', inset: 0, borderRadius: 32, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), inset 0 0 0 1px rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        </div>
        <div style={{ fontFamily: FONT.sans, fontSize: 44, fontWeight: 500, color: G.ink2, letterSpacing: tracking(44) }}>
          deploy queued
        </div>
      </div>
    </CloseupStage>
  );
};

export const WrightTripleCut: React.FC = () => {
  const f = useCurrentFrame();

  // ===== 帧 0–24:全景 hold(极缓推近保活,起止平滑) =====
  if (f < HOLD_END) {
    const s = mix(1, 1.012, ramp(f, 0, HOLD_END, EASE.smooth));
    return (
      <div style={{ width: 1920, height: 1080, overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${s})`, transformOrigin: '1070px 760px' }}>
          <FakeDashboard variant="A" />
        </div>
        <Grain opacity={0.04} />
      </div>
    );
  }

  // ===== 特写一(25–34):光标从悬停到按下,按钮变深 =====
  if (f < C2) {
    const p = act(f, C1, EASE.snappy);
    const down = p >= 0.5; // 按下瞬间二值跳变保干脆
    const btnY = 8 * p; // 按钮被压下 8px
    return (
      <CloseupStage fx={1010}>
        <div style={{ position: 'relative' }}>
          <div style={{
            width: 640, height: 200, borderRadius: 44, boxSizing: 'border-box',
            background: down
              ? 'linear-gradient(180deg, #4d54c2 0%, #434ab4 100%)'
              : 'linear-gradient(180deg, #6d75e6 0%, #5860d2 100%)',
            border: '1px solid rgba(30,34,110,0.35)',
            boxShadow: `inset 0 1.5px 0 rgba(255,255,255,${down ? 0.12 : 0.32}), ${softShadow(mix(26, 5, p), { color: '#272c8c', strength: 1.6 })}`,
            transform: `translateY(${btnY}px) scale(${1 - 0.025 * p})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 26,
          }}>
            <svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
            <span style={{ fontFamily: FONT.sans, fontSize: 84, fontWeight: 600, color: '#ffffff', letterSpacing: tracking(84) }}>Deploy</span>
          </div>
          {/* 光标:tip 落在按钮右下区,按下时随按钮下沉并缩一圈 */}
          <Cursor x={505} y={112 + btnY} scale={1 - 0.14 * p} />
        </div>
      </CloseupStage>
    );
  }

  // ===== 特写二(35–44):开关从左拨到右 =====
  if (f < C3) {
    const p = act(f, C2, EASE.snappy);
    const on = p >= 0.5;
    const trackW = 560; const trackH = 240; const knob = 192; const pad = 24;
    const stretch = 46 * Math.sin(Math.PI * p); // 滑动途中圆钮横向拉伸,到位收回
    const knobX = pad + p * (trackW - knob - pad * 2) - stretch * p;
    return (
      <CloseupStage fx={1130}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 44 }}>
          <div style={{ fontFamily: FONT.sans, fontSize: 56, fontWeight: 600, color: G.ink1, letterSpacing: tracking(56) }}>
            Auto-deploy
          </div>
          <div style={{
            position: 'relative', width: trackW, height: trackH, borderRadius: trackH / 2, boxSizing: 'border-box',
            background: on ? 'linear-gradient(180deg, #5f67da 0%, #535bcf 100%)' : 'linear-gradient(180deg, #d6d6db 0%, #e2e2e6 100%)',
            boxShadow: on
              ? 'inset 0 2px 6px rgba(20,24,90,0.30), 0 18px 40px -16px rgba(91,99,211,0.55)'
              : 'inset 0 2px 6px rgba(16,18,26,0.14), 0 1px 0 rgba(255,255,255,0.8)',
          }}>
            <div style={{
              position: 'absolute', top: pad, left: knobX, width: knob + stretch, height: knob, borderRadius: knob / 2,
              background: 'linear-gradient(180deg, #ffffff 0%, #f3f3f5 100%)',
              boxShadow: `inset 0 1px 0 #ffffff, ${softShadow(10, { strength: 1.6 })}`,
            }} />
          </div>
        </div>
      </CloseupStage>
    );
  }

  // ===== 特写三(45–54):计数翻牌 0 → 1(分体翻牌) =====
  if (f < WHIP) {
    return <FlipCloseup p={act(f, C3, EASE.smooth)} />;
  }

  // ===== 帧 55 起:甩回全景 + 结果卡片亮起 =====
  const whipAt = (fr: number) => {
    const t = fr - WHIP;
    // whip:6f 从右侧 900px 高速滑入,poly(5) out 急减速;t≥6 恒为 0(真静止)
    return t >= 6 ? 0 : interpolate(t, [0, 6], [900, 0], {
      easing: Easing.out(Easing.poly(5)), extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });
  };
  const whipX = whipAt(f);
  const vx = f < WHIP + 6 ? velocity((fr) => whipAt(Math.max(WHIP, fr)), f) : 0;

  // 结果卡片:描边泛光 57–72 升起后恒定;抬起弹一下 57–68 后恒为 1;"+1" 角标 62 起弹出
  const glow = ramp(f, 57, 15, EASE.out);
  const lift = ramp(f, 57, 11, EASE.overshoot);
  const badge = ramp(f, 62, 10, EASE.overshoot);
  const scrim = ramp(f, 58, 22, EASE.smooth);

  return (
    <div style={{ width: 1920, height: 1080, background: G.canvas, overflow: 'hidden', position: 'relative' }}>
      <SpeedBlur vx={vx} amount={0.05} max={30}>
        {/* 甩镜:上一镜(翻牌特写终态)与全景首尾相接一起向左甩,画面不留空 */}
        {whipX > 0.5 && (
          <div style={{ position: 'absolute', left: 0, top: 0, transform: `translateX(${whipX - 1920}px)` }}>
            <FlipCloseup p={1} />
          </div>
        )}
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translateX(${whipX}px)` }}>
          <FakeDashboard variant="A" />
        </div>
      </SpeedBlur>
      {/* 结果卡片外一圈极淡压暗(圆角挖空),视线收向答案 */}
      {scrim > 0.005 && (
        <div style={{
          position: 'absolute', left: RESULT.left, top: RESULT.top, width: RESULT.w, height: RESULT.h, borderRadius: 14,
          transform: `translateX(${whipX}px)`, boxShadow: `0 0 0 2400px rgba(18,20,30,${(0.1 * scrim).toFixed(3)})`, pointerEvents: 'none',
        }} />
      )}
      {/* 结果卡片:同 seed 的卡片副本抬起 + 强调色描边 + 同色柔光(描边贴着圆角走) */}
      {glow > 0.005 && (
        <div style={{
          position: 'absolute', left: RESULT.left, top: RESULT.top, width: RESULT.w, height: RESULT.h,
          transform: `translateX(${whipX}px) translateY(${-8 * lift}px) scale(${mix(1, 1.02, lift)})`,
          borderRadius: 14,
          boxShadow: [
            `0 0 0 2px rgba(91,99,211,${(0.9 * glow).toFixed(3)})`,
            `0 0 0 8px rgba(91,99,211,${(0.12 * glow).toFixed(3)})`,
            `0 30px 64px -18px rgba(60,66,170,${(0.45 * glow).toFixed(3)})`,
          ].join(', '),
        }}>
          {/* FakeDashboard 网格第 5 格 = Card seed 5、524×454,副本与底下原卡逐像素重合 */}
          <Card w={RESULT.w} h={RESULT.h} seed={5} />
          {/* "+1" 角标:卡片右上角弹出 */}
          <div style={{
            position: 'absolute', right: -26, top: -26, width: 76, height: 76, borderRadius: 38,
            background: 'linear-gradient(180deg, #6a72e3 0%, #535bcf 100%)', color: '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FONT.sans, fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em',
            boxShadow: `0 0 0 4px ${G.canvas}, inset 0 1px 0 rgba(255,255,255,0.35), 0 10px 24px -6px rgba(60,66,170,0.55)`,
            transform: `scale(${badge})`, opacity: Math.min(1, badge * 3),
          }}>+1</div>
        </div>
      )}
      <Vignette strength={0.12} inner={0.55} color="#1a1c24" />
      <Grain opacity={0.04} />
    </div>
  );
};
