// E 式急刹款 whip-brake——真实卡片切片横向长廊，甩过 9 张卡后
// 在目标卡（card4-hires，高清纹理）前急刹长尾滑入。
// 速率：一条速度曲线 v(u) = V0·e^(−6u/60)·smoothstep(0,3,u) 积分而来——3f 起步加速、
// 之后单调衰减（前 70% 路程 ≈12f 糊段，后 30% 路程 48f 长尾），全程速度连续、不回摆；
// 运动模糊按瞬时速度做方向性拖影（SpeedBlur，静止为 0）。
// 落定后目标卡抬起（+4%、阴影变大变虚），两侧卡退暗，视线落到主角上再 hold。
// 节拍：0–30 起点 hold → 30–42 全速甩 → 42–90 急刹滑入 → 82–98 目标卡抬起、邻卡退暗 →
// 98–130 真静止。
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import layout from '../../_textures/live-layout.json';
import { EASE, ramp, mix, velocity, softShadow, SpeedBlur, Vignette } from '../../_fixtures/Polish';

export const WHIPBRAKE_DUR = 130;

// 9 张真实卡依次排开（剔除与目标卡重复的 card4）
const RAIL = layout.projects.cards.filter((_, i) => i !== 3);
const GAP = 60;
const CARD_W = 460;
const TARGET_I = 9; // 第 10 位：card4-hires 目标卡
const LEFT0 = 120; // 导轨起始偏移
// 终点：目标卡居中
const END = LEFT0 + TARGET_I * (CARD_W + GAP) + CARD_W / 2 - 960;

// 速度曲线积分表（确定性预计算，步长 0.05f）：起步 3f smoothstep、之后 e^(−6u/60) 衰减
const STEP = 0.05;
const TABLE = (() => {
  const n = Math.round(60 / STEP);
  const vel = (u: number) => {
    const r = Math.min(1, u / 3);
    return Math.exp((-6 * u) / 60) * r * r * (3 - 2 * r);
  };
  const out = new Float64Array(n + 1);
  for (let i = 1; i <= n; i++) out[i] = out[i - 1] + ((vel((i - 1) * STEP) + vel(i * STEP)) / 2) * STEP;
  const total = out[n];
  for (let i = 0; i <= n; i++) out[i] /= total;
  return out;
})();
const progress = (u: number) => {
  if (u <= 0) return 0;
  if (u >= 60) return 1;
  const x = u / STEP;
  const i = Math.floor(x);
  return TABLE[i] + (TABLE[i + 1] - TABLE[i]) * (x - i);
};
const dxAt = (f: number) => END * progress(f - 30);

export const WhipBrakeReal: React.FC = () => {
  const frame = useCurrentFrame();
  const dx = dxAt(frame);
  const v = velocity(dxAt, frame);

  // 落定聚焦：目标卡抬起、邻卡退暗
  const lift = ramp(frame, 82, 16, EASE.out);
  const dim = ramp(frame, 84, 14, EASE.out);
  const targetScale = mix(1, 1.04, lift);

  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: 'radial-gradient(ellipse 80% 70% at 50% 34%, #fdfbf7 0%, #f6f2ea 55%, #ece6db 100%)' }}>
      <Vignette strength={0.14} inner={0.5} color="#3a3328" />
      <SpeedBlur vx={-v} amount={0.085} max={64}>
        <div style={{ position: 'absolute', left: 0, top: 340, transform: `translateX(${-dx}px)` }}>
          {RAIL.map((c, k) => (
            <Img
              key={c.file}
              src={staticFile(`textures/live/${c.file}`)}
              style={{
                position: 'absolute', left: LEFT0 + k * (CARD_W + GAP), top: 0,
                width: CARD_W, borderRadius: 12,
                opacity: k >= TARGET_I - 2 ? 1 - 0.45 * dim : 1,
                boxShadow: softShadow(6, { color: '#2a2218', strength: 0.8 }),
              }}
            />
          ))}
          {/* 目标卡右侧补一张邻卡（长廊继续），落定构图左右均衡，不留半屏空场 */}
          <Img
            src={staticFile(`textures/live/${RAIL[0].file}`)}
            style={{
              position: 'absolute', left: LEFT0 + (TARGET_I + 1) * (CARD_W + GAP), top: 0,
              width: CARD_W, borderRadius: 12, opacity: 1 - 0.45 * dim,
              boxShadow: softShadow(6, { color: '#2a2218', strength: 0.8 }),
            }}
          />
          {/* 目标卡：高清纹理，急刹落点；落定后抬起 */}
          <Img
            src={staticFile('textures/live/card4-hires.png')}
            style={{
              position: 'absolute', left: LEFT0 + TARGET_I * (CARD_W + GAP), top: -20 - 10 * lift,
              width: CARD_W, borderRadius: 12,
              transform: lift > 0 ? `scale(${targetScale.toFixed(4)})` : undefined,
              boxShadow: softShadow(mix(12, 30, lift), { color: '#2a2218', strength: 1.1 }),
            }}
          />
        </div>
      </SpeedBlur>
    </AbsoluteFill>
  );
};
