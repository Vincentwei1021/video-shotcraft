// 落点冲击套件（impact-burst-kit）——shockwave-ring + particle-burst 组合变异。
// 主卡砸落的落点帧同时触发：冲击波环扩散 + 14 粒子放射迸发 + 震屏，
// 且冲击波前沿扫到左右邻卡的那一帧（按半径-距离算准=落点后 3f）邻卡被
// 向外推开再阻尼弹回——"波及邻居"即两条词汇焊接成立的证据。
// 关键帧：0–14 两侧卡驻场、主卡 scale≈1.8/y≈-120 悬停蓄力 → 14–20 主卡 6f 加速砸落 →
// 20 落点帧：环 80→900px(14f out-cubic, op .75→0) + 14 粒子飞散 160–340px(22f)
//   + 4f 震屏 6px 衰减 + 主卡 6f 压扁回弹 → 23 环前沿过邻卡(中心距 460px)：
//   邻卡外推 30px + rotate ±3° 阻尼振荡弹回(40f 内钳到 0) → 63–140 全静止(77f)。
//
// 质感升级：去掉调试标题，换成页面里真实的区块标题（Overview / This week）；柔光底 + 颗粒；
// 悬停段不再死停——主卡缓缓上提 18px、放大到 1.84 蓄力（预备动作），离镜头近时带景深虚化，
// 地面上有随下落变实的接触影；冲击环从 3px 实黑线改成强调色细亮环 + 柔辉，越扩越细；
// 粒子从纯黑方/圆点改成强调色碎片 + 浅色碎屑，按速度沿飞行方向拉长；邻卡被推开那一下给
// 水平 SpeedBlur，并随推力抬高阴影。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, Card } from '../../_fixtures/Fixtures';
import { Backdrop, FONT, Grain, SpeedBlur, innerHighlight, softShadow } from '../../_fixtures/Polish';

export const IMPACT_BURST_KIT_DURATION = 140; // 63f 动作与余波 + 77f 静止 hold

// 伪随机（帧确定）
const h = (n: number): number => {
  const s = Math.sin(n * 127.3) * 43758.5453;
  return s - Math.floor(s);
};

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const CW = 400;
const CH = 280;
const GAP = 60;
const X_L = (1920 - (CW * 3 + GAP * 2)) / 2; // 300
const Y = (1080 - CH) / 2 + 30; // 430（整组略下移，给区块标题留位）
const CX = 960; // 主卡中心
const CY = Y + CH / 2; // 570

const IMPACT = 20; // 落点帧
// 冲击波：80→900px 14f out-cubic。前沿到达邻卡中心距 460px 的帧：
// (460-80)/820=0.463 → 1-(1-p)^3 → p≈0.19 → t≈2.6f → 取落点后 3f = 帧 23
const HIT_NEIGHBOR = IMPACT + 3;

// 14 个粒子：一半强调色碎片、一半浅色碎屑；角度带向上偏置，飞散 160–340px 减速缩小消失
const PARTICLES = Array.from({ length: 14 }).map((_, i) => ({
  angle: -Math.PI / 2 + (h(i + 1) - 0.5) * Math.PI * 1.7, // 上半球为主
  dist: 160 + h(i + 40) * 180,
  size: 8 + h(i + 80) * 10,
  accent: i % 2 === 0,
  spin: (h(i + 120) - 0.5) * 400,
}));

// 邻卡被推开的阻尼振荡包络：t=0 瞬时到 1，之后余弦衰减弹回，40f 后钳 0 保真静止
const pushEnv = (f: number): number => {
  const t = f - HIT_NEIGHBOR;
  if (t < 0 || t >= 40) return 0;
  return Math.cos(t * 0.5) * Math.exp(-t / 8);
};

export const ImpactBurstKit: React.FC = () => {
  const frame = useCurrentFrame();

  // ── 主卡：0–14 悬停蓄力（上提 18px、放大到 1.84，in-out 缓动）→ 14–20 加速砸落
  const wind = interpolate(frame, [0, 14], [0, 1], { ...CLAMP, easing: Easing.inOut(Easing.sin) });
  const hoverScale = 1.8 + 0.04 * wind;
  const hoverDy = -120 - 18 * wind;
  const dropP = interpolate(frame, [14, IMPACT], [0, 1], { ...CLAMP, easing: Easing.in(Easing.cubic) });
  const mainScale = interpolate(dropP, [0, 1], [hoverScale, 1]);
  const mainDy = interpolate(dropP, [0, 1], [hoverDy, 0]);
  const lift = interpolate(mainScale, [1, 1.84], [0, 1], CLAMP); // 离地高度 0–1
  const dof = lift * 3.2; // 离镜头近 → 景深虚化
  // 落点后 6f 压扁回弹（squash & stretch）
  const sq = interpolate(frame, [IMPACT, IMPACT + 3, IMPACT + 6], [0, 1, 0], { ...CLAMP, easing: Easing.out(Easing.quad) });
  const mainSx = mainScale * (1 + 0.07 * sq);
  const mainSy = mainScale * (1 - 0.1 * sq);
  const mainOp = interpolate(frame, [0, 4], [0, 1], CLAMP);

  // ── ① 冲击波环：半径 80→900，14f，opacity 0.75→0，描边越扩越细
  const ringP = interpolate(frame, [IMPACT, IMPACT + 14], [0, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) });
  const ringR = interpolate(ringP, [0, 1], [80, 900]);
  const ringOp = frame >= IMPACT && frame < IMPACT + 14 ? 0.75 * (1 - ringP) : 0;
  const ringW = interpolate(ringP, [0, 1], [4.5, 1]);

  // ── ② 粒子：落点起 22f，减速飞散 + 缩小 + 淡出；速度大时沿飞行方向拉长
  const pT = interpolate(frame, [IMPACT, IMPACT + 22], [0, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) });
  const pSpeed = frame >= IMPACT ? 3 * Math.pow(1 - pT, 2 / 3) : 0; // out-cubic 导数 ∝ (1-p)^(2/3)
  const particlesAlive = frame >= IMPACT && frame < IMPACT + 22;

  // ── ③ 邻卡外推 30px + rotate ±3°，阻尼弹回；推开那一下按速度给水平拖影
  const env = pushEnv(frame);
  const pushX = 30 * env;
  const pushRot = 3 * env;
  const pushV = 30 * (pushEnv(frame + 0.5) - pushEnv(frame - 0.5));
  const pushLift = Math.abs(env);

  // ── ④ 震屏：落点起 4f，6px 衰减（h 伪随机方向，帧确定）
  let shakeX = 0;
  let shakeY = 0;
  if (frame >= IMPACT && frame < IMPACT + 4) {
    const amp = 6 * (1 - (frame - IMPACT) / 4);
    shakeX = (h(frame * 3.7) - 0.5) * 2 * amp;
    shakeY = (h(frame * 7.1 + 13) - 0.5) * 2 * amp;
  }

  const neighborShadow = `${innerHighlight(0.85)}, ${softShadow(4 + pushLift * 22)}`;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Backdrop tone="light" light={{ x: 0.5, y: 0.22 }} accent="#5b63d3" grain={0} />
      <div style={{ position: 'absolute', inset: 0, transform: `translate(${shakeX.toFixed(2)}px, ${shakeY.toFixed(2)}px)` }}>
        {/* 区块标题：让三张卡读作"页面上本来就在的一排组件" */}
        <div style={{ position: 'absolute', left: X_L + 4, top: Y - 92, fontFamily: FONT.sans, color: G.ink1 }}>
          <div style={{ fontSize: 34, fontWeight: 650, letterSpacing: '-0.025em', lineHeight: 1 }}>Overview</div>
          <div style={{ marginTop: 10, fontSize: 17, color: G.ink3, letterSpacing: '-0.005em' }}>This week · 3 widgets</div>
        </div>

        {/* 主卡落点的地面接触影：下落越近越实，落地后交给卡片自身阴影 */}
        <div
          style={{
            position: 'absolute',
            left: CX - CW * 0.5,
            top: Y + CH - 40,
            width: CW,
            height: 80,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(16,18,26,0.22) 0%, rgba(16,18,26,0) 70%)',
            opacity: interpolate(frame, [0, IMPACT - 1, IMPACT + 2], [0.25, 0.9, 0], CLAMP),
            transform: `scale(${(1.4 - 0.4 * dropP).toFixed(3)})`,
            filter: 'blur(6px)',
          }}
        />

        {/* 左邻卡：被冲击波推开再弹回 */}
        <SpeedBlur vx={-pushV} amount={0.14} max={6}>
          <div style={{ position: 'absolute', left: X_L, top: Y, transform: `translateX(${(-pushX).toFixed(2)}px) rotate(${(-pushRot).toFixed(3)}deg)` }}>
            <Card w={CW} h={CH} seed={2} style={{ boxShadow: neighborShadow }} />
          </div>
        </SpeedBlur>

        {/* 右邻卡 */}
        <SpeedBlur vx={pushV} amount={0.14} max={6}>
          <div style={{ position: 'absolute', left: X_L + (CW + GAP) * 2, top: Y, transform: `translateX(${pushX.toFixed(2)}px) rotate(${pushRot.toFixed(3)}deg)` }}>
            <Card w={CW} h={CH} seed={4} style={{ boxShadow: neighborShadow }} />
          </div>
        </SpeedBlur>

        {/* 主卡：悬停蓄力 + 砸落 + 落点压扁回弹 */}
        <div
          style={{
            position: 'absolute',
            left: X_L + CW + GAP,
            top: Y + mainDy,
            transform: `scale(${mainSx.toFixed(4)}, ${mainSy.toFixed(4)})`,
            transformOrigin: '50% 100%',
            opacity: mainOp,
            filter: dof > 0.3 ? `blur(${dof.toFixed(2)}px)` : undefined,
          }}
        >
          <Card w={CW} h={CH} seed={7} style={{ boxShadow: `${innerHighlight(0.85)}, ${softShadow(6 + lift * 50, { strength: 1.1 })}` }} />
        </div>

        {/* ② 粒子迸发（画在卡之上） */}
        {particlesAlive &&
          PARTICLES.map((p, i) => {
            const px = CX + Math.cos(p.angle) * p.dist * pT;
            const py = CY + Math.sin(p.angle) * p.dist * pT;
            const s = p.size * (1 - pT);
            if (s < 0.5) return null;
            const stretch = 1 + Math.min(1.4, pSpeed * 0.45); // 快时拉长成短线
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: px - s / 2,
                  top: py - s / 2,
                  width: s,
                  height: s,
                  transform: `rotate(${((p.angle * 180) / Math.PI).toFixed(2)}deg) scaleX(${stretch.toFixed(3)})`,
                  opacity: 1 - pT * pT,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: p.accent ? 2 : '50%',
                    background: p.accent ? G.accent : '#ffffff',
                    boxShadow: p.accent ? '0 0 6px rgba(91,99,211,0.45)' : '0 0 0 1px rgba(20,22,28,0.12), 0 2px 5px rgba(16,18,26,0.25)',
                    transform: `rotate(${(p.spin * pT).toFixed(2)}deg)`,
                  }}
                />
              </div>
            );
          })}

        {/* ① 冲击波环（最上层扫过邻卡）：柔辉 + 细亮环 */}
        {ringOp > 0 && (
          <>
            <div
              style={{
                position: 'absolute',
                left: CX - ringR,
                top: CY - ringR,
                width: ringR * 2,
                height: ringR * 2,
                borderRadius: '50%',
                boxShadow: `0 0 ${(14 + ringP * 24).toFixed(1)}px ${(2 + ringP * 4).toFixed(1)}px rgba(91,99,211,0.28), inset 0 0 ${(14 + ringP * 24).toFixed(1)}px rgba(91,99,211,0.18)`,
                opacity: ringOp,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: CX - ringR,
                top: CY - ringR,
                width: ringR * 2,
                height: ringR * 2,
                border: `${ringW.toFixed(2)}px solid rgba(91,99,211,0.9)`,
                borderRadius: '50%',
                opacity: ringOp,
                boxSizing: 'border-box',
              }}
            />
          </>
        )}
      </div>
      <Grain opacity={0.045} />
    </AbsoluteFill>
  );
};
