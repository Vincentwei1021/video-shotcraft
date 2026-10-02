// axial-stretch —— 轴向拉伸速度感
// 三张 Card 从右外依次横向飞入落位，飞行途中沿运动轴速度驱动拉伸
// （scaleX 峰值 ≈2.2 / scaleY ≈0.72，糖稀拉丝感），落点 Back.out 式回弹。
// 速度用位置差分 p(f)-p(f-1) 驱动，低于阈值不拉伸。收尾真静止 ≥35f（末卡回弹后 62f）。
// 质感层（改版）：去掉调试标题与 2px 虚线槽；三张卡落进一块真实的"Pinned reports"面板里的
// 凹槽（内阴影 + 发丝线，Q9 真实槽位）；落点那一下槽位边缘泛起一圈强调色描边并淡出、卡下接触影
// 被"压"实再松开；卡片阴影随速度拉长（飞得快 = 离面高）；柔光浅底 + 颗粒。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, Card } from '../../_fixtures/Fixtures';
import { Backdrop, EASE, FONT, ramp, softShadow } from '../../_fixtures/Polish';

export const AXIAL_STRETCH_DURATION = 141; // ≈4.7s：首卡 f10 起飞，末卡 f78 回弹完，真静止 62f

const W = 1920;
const CARD_W = 380;
const CARD_H = 230;
const GAP = 60;
const ROW_W = 3 * CARD_W + 2 * GAP; // 1260
const ROW_X0 = (W - ROW_W) / 2; // 330
const ROW_Y = (1080 - CARD_H) / 2 + 30; // 455：给面板标题让出上方空间，整组视觉居中

const START_X = 1980; // 完全在画面右外
const FLIGHT = 36; // 飞行帧数
const STAGGER = 12; // 错峰
const FIRST = 10; // 首卡起飞帧
const SQUASH = 8; // 落点回弹帧数

const VEL_MIN = 2; // px/frame，低于此不拉伸
const VEL_REF = 140; // px/frame，达到此速度即满拉伸
const STRETCH_X = 1.2; // scaleX 峰值 1 + 1.2 = 2.2
const SQUISH_Y = 0.28; // scaleY 谷值 1 - 0.28 = 0.72

// 面板几何：包住三槽 + 顶部标题栏
const PAD = 36;
const HEAD = 84;
const PANEL = { x: ROW_X0 - PAD, y: ROW_Y - HEAD, w: ROW_W + 2 * PAD, h: CARD_H + HEAD + PAD };
const TITLES = ['Active users', 'Top pages', 'Revenue']; // 与 Card seed 1–3 的卡面标题一致

// poly(4) in-out：中段速度峰值 ≈ 4× 平均速度，够冲
const flightEase = Easing.inOut(Easing.poly(4));

const posAt = (f: number, start: number, targetX: number): number =>
  interpolate(f, [start, start + FLIGHT], [START_X, targetX], {
    easing: flightEase,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const FlyCard: React.FC<{ i: number; frame: number }> = ({ i, frame }) => {
  const start = FIRST + i * STAGGER;
  const targetX = ROW_X0 + i * (CARD_W + GAP);
  const land = start + FLIGHT;

  const x = posAt(frame, start, targetX);
  // 速度 = 位置差分（帧时间解耦，纯由位置函数决定）
  const v = Math.abs(posAt(frame, start, targetX) - posAt(frame - 1, start, targetX));
  const s = Math.min(Math.max((v - VEL_MIN) / (VEL_REF - VEL_MIN), 0), 1);

  const stretchX = 1 + STRETCH_X * s;
  const stretchY = 1 - SQUISH_Y * s;

  // 落点回弹：scaleX 过冲到 0.85 再回 1（横向被"撞停"压扁），8f
  const sqX = interpolate(frame, [land, land + SQUASH / 2, land + SQUASH], [1, 0.85, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const sqY = interpolate(frame, [land, land + SQUASH / 2, land + SQUASH], [1, 1.1, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 阴影高度：静置 4，飞行时随速度抬到 22（飞得快 = 离面高），落定收回
  const elev = 4 + 18 * s;

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: ROW_Y,
        // 顺序：先 translate 再 scale；transformOrigin 设运动后缘（向左飞 → 右缘）
        transform: `translateX(${x}px) scaleX(${stretchX * sqX}) scaleY(${stretchY * sqY})`,
        transformOrigin: '100% 50%',
        opacity: x > W + 4 ? 0 : 1,
      }}
    >
      <Card w={CARD_W} h={CARD_H} seed={i + 1} style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.9), ${softShadow(elev)}` }} />
    </div>
  );
};

export const AxialStretch: React.FC = () => {
  const frame = useCurrentFrame();
  const panelIn = ramp(frame, 0, 14, EASE.out);

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', fontFamily: FONT.sans }}>
      <Backdrop tone="light" light={{ x: 0.42, y: 0.22 }} accent={G.accent} grain={0.05} vignette={0.14} />

      {/* 面板：受光白面 + 发丝线 + 两层软阴影，开场 14f 浮起 */}
      <div
        style={{
          position: 'absolute',
          left: PANEL.x,
          top: PANEL.y,
          width: PANEL.w,
          height: PANEL.h,
          borderRadius: 22,
          background: 'linear-gradient(180deg, #fbfbfa 0%, #f5f5f3 100%)',
          border: `1px solid ${G.hairline}`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.95), ${softShadow(10, { strength: 0.8 })}`,
          opacity: panelIn,
          transform: `translateY(${((1 - panelIn) * 14).toFixed(2)}px)`,
        }}
      >
        <div style={{ position: 'absolute', left: PAD, top: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={G.accent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3.5 20.5 9l-3.2 1.2-4 4 .5 4.3-1.3 1.3-3.7-3.7L4.5 20.5 3.5 19.5l4.4-4.3-3.7-3.7 1.3-1.3 4.3.5 4-4Z" />
          </svg>
          <div style={{ fontSize: 26, fontWeight: 650, color: G.ink1, letterSpacing: '-0.015em' }}>Pinned reports</div>
          <div
            style={{
              marginLeft: 6, fontSize: 18, fontWeight: 600, color: G.accent, background: G.accentSoft,
              padding: '3px 10px', borderRadius: 11, fontVariantNumeric: 'tabular-nums',
            }}
          >
            {Math.min(3, [0, 1, 2].filter((i) => frame >= FIRST + i * STAGGER + FLIGHT).length)} / 3
          </div>
        </div>
        <div style={{ position: 'absolute', right: PAD, top: 32, fontSize: 18, color: G.ink3 }}>Updated just now</div>
      </div>

      {/* 凹槽：真实落位槽（浅填充 + 内阴影 + 发丝线），落点时边缘泛起一圈强调色并淡出 */}
      {[0, 1, 2].map((i) => {
        const land = FIRST + i * STAGGER + FLIGHT;
        const ping = ramp(frame, land, 16, EASE.out);
        const pingOp = frame >= land ? (1 - ping) * 0.9 : 0;
        return (
          <div
            key={`slot-${i}`}
            style={{
              position: 'absolute',
              left: ROW_X0 + i * (CARD_W + GAP),
              top: ROW_Y,
              width: CARD_W,
              height: CARD_H,
              borderRadius: 14,
              background: G.fill,
              border: `1px solid ${G.hairline}`,
              boxSizing: 'border-box',
              boxShadow: `inset 0 2px 6px rgba(16,18,26,0.07), inset 0 1px 1px rgba(16,18,26,0.05)${
                pingOp > 0 ? `, 0 0 0 ${(2 + ping * 10).toFixed(2)}px rgba(91,99,211,${(pingOp * 0.35).toFixed(3)})` : ''
              }`,
              opacity: panelIn,
            }}
          >
            {/* 空槽提示：卡落定前可见 */}
            <div
              style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, color: G.ink3, letterSpacing: '0.01em', opacity: frame < land - 6 ? 1 : 0,
              }}
            >
              {TITLES[i]}
            </div>
          </div>
        );
      })}

      {[0, 1, 2].map((i) => (
        <FlyCard key={i} i={i} frame={frame} />
      ))}
    </div>
  );
};
