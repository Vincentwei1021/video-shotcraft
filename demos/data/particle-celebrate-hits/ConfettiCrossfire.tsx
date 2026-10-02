// confetti-crossfire —— 双侧礼炮交叉喷洒
// 中央大 KPI 卡 scale 落定（f0–16），揭晓帧 f16 左下+右下两门炮各射 50 颗矩形彩屑：
// 闭式弹道（初速 70–95px/f + spread 55° + 重力 + decay 0.9 的位移闭式解），每帧翻转 8–15°，
// 灰阶为主 + 1/3 琥珀。全部彩屑 ~f100 前落出画外（越界即条件卸载），结尾真静止 ≥50f。
// 帧确定性：sin 散列伪随机派生每颗初速/角度/翻转率，弹道 = 纯 age 的函数。
//
// 质感升级：去掉调试标题与骨架条，KPI 卡换成出版级（发丝线 + 内高光 + 随抬升变化的两层阴影 +
// 真实指标文案），平灰底换柔光亮场 + 颗粒；彩屑升级为"真纸片"：绕自身轴翻转（scaleY=|cos|，背面压暗）、
// 过顶点后左右飘摆、出膛高速段沿速度方向拉伸成短拖影（速度降下来自动复原）；三层景深——约 30% 远景
// 小而暗、在卡片后方，约 18% 近景放大虚焦、从卡片前方掠过；炮口一记柔光 puff，揭晓帧卡片轻微受冲。
import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { G } from '../../_fixtures/Fixtures';
import { Backdrop, EASE, FONT, Grain, mix, ramp, softShadow, innerHighlight, tracking } from '../../_fixtures/Polish';

export const CONFETTI_CROSSFIRE_DURATION = 150; // 卡片落定 16f + 弹幕 ~85f + 真静止 ≥50f

const AMBER = '#b45309';
const AMBER_HI = '#d97706';
const FIRE = 16; // 揭晓帧 = 发射帧
const DECAY = 0.9;
const GRAV = 1.5; // px/f² （等效重力；decay 下终端落速 = GRAV/(1-d) = 15px/f）

const frac = (x: number) => x - Math.floor(x);
const rnd = (i: number, salt: number) => frac(Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453);

// decay 弹道闭式解：v 每帧 ×0.9 → 位移 = v0·(1-d^age)/(1-d)；重力项同样按衰减序列累积
const decaySum = (age: number) => (1 - Math.pow(DECAY, age)) / (1 - DECAY);
const gravDisp = (age: number) => (GRAV * (age - (DECAY - Math.pow(DECAY, age + 1)) / (1 - DECAY))) / (1 - DECAY);

type Confetto = {
  vx: number; vy: number; w: number; h: number;
  spin: number; flip: number; phase: number; color: string;
  sway: number; swayF: number; depth: 0 | 1 | 2;
};

// 灰阶纸色（带一点冷调，不是死灰）+ 琥珀双色
const GRAYS = ['#3a3c43', '#6b6e76', '#9a9da4', '#c4c6cb'];

const makeGun = (originDeg: number, saltBase: number): Confetto[] =>
  Array.from({ length: 50 }).map((_, i) => {
    const ang = ((originDeg + (rnd(i, saltBase) - 0.5) * 55) * Math.PI) / 180;
    // decay 0.9 下初速总位移只有 10×v0（velocity 6.6f 减半），18px/f 只够 180px 完全不可感
    // → 加码到 70–95px/f：最陡颗峰值升到 y≈390（画面上 1/3），弹幕跨越中央卡，~f96 全部落出
    const speed = 70 + rnd(i, saltBase + 1) * 25;
    const amber = rnd(i, saltBase + 6) < 1 / 3;
    const dr = rnd(i, saltBase + 8);
    return {
      vx: Math.cos(ang) * speed,
      vy: -Math.sin(ang) * speed, // 屏幕坐标向下为正，射向斜上
      w: 14 + rnd(i, saltBase + 2) * 12,
      h: 8 + rnd(i, saltBase + 3) * 8,
      spin: 8 + rnd(i, saltBase + 4) * 7, // 8–15°/f
      flip: 0.18 + rnd(i, saltBase + 9) * 0.22, // 绕自身轴翻转（rad/f）
      phase: rnd(i, saltBase + 5) * 360,
      color: amber ? (rnd(i, saltBase + 10) < 0.5 ? AMBER : AMBER_HI) : GRAYS[Math.floor(rnd(i, saltBase + 7) * 4)],
      sway: 10 + rnd(i, saltBase + 11) * 22, // 下落飘摆幅度（px）
      swayF: 0.16 + rnd(i, saltBase + 12) * 0.12,
      depth: dr < 0.3 ? 0 : dr > 0.82 ? 2 : 1, // 0 远景 / 1 焦平面 / 2 近景
    };
  });

const LEFT_GUN = makeGun(60, 3); // 左下炮朝 60°（偏右上）
const RIGHT_GUN = makeGun(120, 9); // 右下炮朝 120°（偏左上）
const LEFT_POS = { x: 140, y: 1040 };
const RIGHT_POS = { x: 1780, y: 1040 };

// 单颗彩屑在 age 时的位置（含过顶点后的飘摆）
const posOf = (c: Confetto, o: { x: number; y: number }, age: number) => {
  const s = decaySum(age);
  const fallK = interpolate(age, [10, 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return {
    x: o.x + c.vx * s + Math.sin(age * c.swayF + c.phase) * c.sway * fallK,
    y: o.y + c.vy * s + gravDisp(age),
  };
};

export const ConfettiCrossfire: React.FC = () => {
  const frame = useCurrentFrame();
  const age = frame - FIRE;

  // KPI 卡入场：0.86→1 过冲落座 + 上浮 28px，阴影随"落地"收紧
  const land = ramp(frame, 0, 16, EASE.overshoot);
  const rise = ramp(frame, 0, 16, EASE.snappy);
  const cardOp = ramp(frame, 0, 8, EASE.out);
  // 揭晓帧受冲：1 → 1.018 → 1（10f 阻尼回落）
  const kick = frame >= FIRE ? Math.sin(Math.min(1, (frame - FIRE) / 10) * Math.PI) * Math.exp(-(frame - FIRE) / 8) : 0;
  const cardScale = mix(0.86, 1, land) * (1 + 0.018 * kick);
  const elev = mix(28, 8, rise) + 6 * kick;
  const numIn = ramp(frame, 4, 16, EASE.out);
  const metaIn = ramp(frame, 9, 16, EASE.out);

  const renderGun = (gun: Confetto[], origin: { x: number; y: number }, keyBase: string, layer: 0 | 1 | 2) =>
    gun.map((c, i) => {
      if (age <= 0 || c.depth !== layer) return null;
      const p = posOf(c, origin, age);
      // 落出画外即卸载（左右也裁）
      if (p.y > 1140 || p.x < -80 || p.x > 2000) return null;
      const q = posOf(c, origin, age - 1);
      const vx = p.x - q.x;
      const vy = p.y - q.y;
      const speed = Math.hypot(vx, vy);
      const va = (Math.atan2(vy, vx) * 180) / Math.PI;
      // 出膛高速段沿速度方向拉伸（拖影），速度 <20px/f 后复原
      const stretch = 1 + Math.min(1.4, Math.max(0, speed - 20) / 45);
      const rot = c.phase + c.spin * age;
      const cosF = Math.cos(c.flip * age + c.phase);
      const back = cosF < 0;
      const dScale = c.depth === 0 ? 0.6 : c.depth === 2 ? 1.5 : 1;
      const dBlur = c.depth === 0 ? 0.6 : c.depth === 2 ? 1.8 : 0;
      const bright = (back ? 0.72 : 1) * (0.82 + 0.18 * Math.abs(cosF)) * (c.depth === 0 ? 0.9 : 1);
      return (
        <div
          key={`${keyBase}${i}`}
          style={{
            position: 'absolute',
            left: p.x,
            top: p.y,
            width: c.w * dScale,
            height: c.h * dScale,
            background: c.color,
            borderRadius: 2,
            opacity: c.depth === 0 ? 0.8 : 1,
            filter: `brightness(${bright.toFixed(3)})${dBlur ? ` blur(${dBlur}px)` : ''}`,
            // 先翻转 + 自转（纸片本体），再沿速度方向拉伸（屏幕空间拖影）
            transform:
              `rotate(${va.toFixed(1)}deg) scaleX(${stretch.toFixed(3)}) rotate(${(-va).toFixed(1)}deg) ` +
              `rotate(${rot.toFixed(1)}deg) scaleY(${Math.max(0.08, Math.abs(cosF)).toFixed(3)})`,
          }}
        />
      );
    });

  // 炮口柔光 puff：发射帧起 12f 扩散淡出
  const puff = ramp(frame, FIRE, 12, EASE.out);
  const puffOp = frame >= FIRE ? (1 - puff) * 0.75 : 0;
  const puffAt = (x: number, y: number) => (
    <div
      style={{
        position: 'absolute',
        left: x - 160,
        top: y - 160,
        width: 320,
        height: 320,
        borderRadius: '50%',
        background: 'radial-gradient(closest-side, rgba(255,246,228,0.95), rgba(255,236,200,0.35) 45%, rgba(255,236,200,0) 100%)',
        opacity: puffOp,
        transform: `scale(${mix(0.35, 1.25, puff).toFixed(3)})`,
      }}
    />
  );

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', fontFamily: FONT.sans }}>
      <Backdrop tone="light" light={{ x: 0.5, y: 0.26 }} accent={AMBER_HI} vignette={0.18} grain={0} />

      {/* 远景彩屑：在卡片后方 */}
      {renderGun(LEFT_GUN, LEFT_POS, 'L', 0)}
      {renderGun(RIGHT_GUN, RIGHT_POS, 'R', 0)}

      {/* 中央 KPI 卡 */}
      <div
        style={{
          position: 'absolute',
          left: 640,
          top: 372,
          width: 640,
          height: 336,
          boxSizing: 'border-box',
          borderRadius: 24,
          background: 'linear-gradient(180deg, #ffffff 0%, #fbfbfa 100%)',
          border: `1px solid ${G.hairline}`,
          boxShadow: `${innerHighlight(0.9)}, ${softShadow(elev, { strength: 1.1 })}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: cardOp,
          transform: `translateY(${mix(28, 0, rise).toFixed(2)}px) scale(${cardScale.toFixed(4)})`,
        }}
      >
        <div
          style={{
            fontSize: 32,
            fontWeight: 600,
            color: G.ink2,
            letterSpacing: tracking(32),
            opacity: numIn,
          }}
        >
          Customer satisfaction
        </div>
        <div
          style={{
            fontWeight: 780,
            fontSize: 168,
            lineHeight: 1.08,
            letterSpacing: tracking(168),
            fontVariantNumeric: 'tabular-nums',
            color: G.ink1,
            opacity: numIn,
            transform: `translateY(${mix(10, 0, numIn).toFixed(2)}px)`,
          }}
        >
          98.5<span style={{ color: AMBER }}>%</span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontSize: 32,
            fontWeight: 500,
            color: G.ink3,
            fontVariantNumeric: 'tabular-nums',
            opacity: metaIn,
            transform: `translateY(${mix(8, 0, metaIn).toFixed(2)}px)`,
          }}
        >
          <span
            style={{
              padding: '4px 14px',
              borderRadius: 999,
              background: 'rgba(217,119,6,0.12)',
              color: AMBER,
              fontWeight: 650,
            }}
          >
            ▲ 2.1 pts
          </span>
          4,812 responses
        </div>
      </div>

      {/* 焦平面彩屑：与卡片同层，在卡片前方掠过 */}
      {renderGun(LEFT_GUN, LEFT_POS, 'L', 1)}
      {renderGun(RIGHT_GUN, RIGHT_POS, 'R', 1)}

      {puffAt(LEFT_POS.x, LEFT_POS.y)}
      {puffAt(RIGHT_POS.x, RIGHT_POS.y)}

      {/* 近景彩屑：放大虚焦，最上层 */}
      {renderGun(LEFT_GUN, LEFT_POS, 'L', 2)}
      {renderGun(RIGHT_GUN, RIGHT_POS, 'R', 2)}

      <Grain opacity={0.05} />
    </div>
  );
};
