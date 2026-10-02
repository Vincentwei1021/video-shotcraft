// counter-tick-sparks —— 数字跳动溅火
// 中央大计数器 0 → 12,847（easeOut 逐位跳动），每逢跳过整千的 tick 帧，
// 数字顶部溅 6–10 颗大火星（初速向上 9–13px/f、重力下坠 18f 内坠灭）；
// 终值揭晓那跳翻倍 20 颗 + 数字弹 1.1x 回落。
// 结尾所有火星寿命耗尽条件卸载，真静止 ≥40f。
// 帧确定性：tick 帧从同一 easeOut 曲线预解析（模块级求出），火星 = 纯 age 闭式弹道。
//
// 质感升级：补导出时长（原推断 78f 正好截在终值帧，终跳火星与 1.1x 弹跳从未出镜）；去掉调试标题与
// 骨架条，场景换暗场（火星在暗底上才"亮"）——深色计数卡（发丝线 + 顶部内高光 + 深阴影）+ 真实指标文案；
// 火星从琥珀圆点升级为"热"粒子：沿速度方向拉成短流星、色温随寿命 白热→琥珀→暗红 冷却、screen 叠加辉光；
// 每个 tick 数字被"敲"一下（上跳 3px 阻尼回落），快计数段按斜率给轻微纵向虚化；终跳数字后一次暖色柔光。
import React from 'react';
import { useCurrentFrame, interpolate, interpolateColors, Easing } from 'remotion';
import { Backdrop, EASE, FONT, Grain, mix, ramp, tracking } from '../../_fixtures/Polish';

const AMBER = '#f59e0b';
const TARGET = 12847;
const COUNT_END = 78; // 计数结束帧（终值揭晓）
const SPARK_LIFE = 18;
const GRAV = 0.9;
// 计数 78f + 终跳火星 18f + 终值静止 ≥40f
export const COUNTER_TICK_SPARKS_DURATION = 140;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const countK = (f: number) => easeOutCubic(Math.min(Math.max(f / COUNT_END, 0), 1));
const valueAt = (f: number) => Math.round(TARGET * countK(f));

const frac = (x: number) => x - Math.floor(x);
const rnd = (i: number, salt: number) => frac(Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453);

// 预解析 tick 帧：跳过整千的那一帧 + 终值揭晓帧
const TICKS: { f: number; big: boolean }[] = (() => {
  const out: { f: number; big: boolean }[] = [];
  let prev = 0;
  for (let f = 1; f <= COUNT_END; f++) {
    const v = valueAt(f);
    if (Math.floor(v / 1000) > Math.floor(prev / 1000)) out.push({ f, big: false });
    prev = v;
  }
  out.push({ f: COUNT_END, big: true }); // 终值揭晓
  return out;
})();

// 火星色温：出生白热 → 琥珀 → 暗红熄灭
const sparkColor = (life: number) =>
  interpolateColors(life, [0, 0.45, 0.8, 1], ['#7a2a0c', '#d9640b', '#ffb547', '#fff6d8']);

export const CounterTickSparks: React.FC = () => {
  const frame = useCurrentFrame();
  const value = valueAt(frame);

  // 终值揭晓弹 1.1x：4f 快速顶起，12f 阻尼回落（带一次 1.5% 以内的回弹）
  const popUp = ramp(frame, COUNT_END, 4, EASE.snappy);
  const popDown = ramp(frame, COUNT_END + 4, 14, EASE.overshoot);
  const popScale = 1 + 0.1 * popUp * (1 - popDown);

  // 每个整千 tick 数字被"敲"一下：上跳 3px，6f 阻尼回落
  let knock = 0;
  for (const tk of TICKS) {
    if (tk.big) continue;
    const a = frame - tk.f;
    if (a >= 0 && a < 8) knock = Math.max(knock, Math.exp(-a / 2.2) * Math.cos(a * 0.9));
  }
  // 计数快段的纵向虚化（按曲线斜率），到位清晰
  const slope = (countK(frame + 0.5) - countK(frame - 0.5)) * COUNT_END; // 起点 ≈3，末端 0
  const rollBlur = Math.min(1.4, Math.max(0, slope - 0.6) * 0.6);

  // 卡片 0–12f 上浮淡入；终跳暖光
  const cardIn = ramp(frame, 0, 12, EASE.out);
  const bloom = frame >= COUNT_END ? Math.exp(-(frame - COUNT_END) / 10) * ramp(frame, COUNT_END, 3, EASE.out) : 0;

  const TOP_Y = 452; // 数字顶缘（火星发射线）
  const CX = 960;

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', fontFamily: FONT.sans }}>
      <Backdrop tone="dark" light={{ x: 0.5, y: 0.34 }} vignette={0.6} grain={0} />

      {/* 计数卡 */}
      <div
        style={{
          position: 'absolute',
          left: 560,
          top: 400,
          width: 800,
          height: 312,
          boxSizing: 'border-box',
          borderRadius: 24,
          background: 'linear-gradient(180deg, #1c1e25 0%, #15171c 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.07), 0 2px 6px rgba(0,0,0,0.35), 0 40px 90px -24px rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: 36, // 数字字面顶缘 ≈ TOP_Y：火星从数字顶上迸出
          gap: 30,
          opacity: cardIn,
          transform: `translateY(${mix(18, 0, cardIn).toFixed(2)}px)`,
        }}
      >
        {/* 终跳暖光：只在数字后方，一次 */}
        <div
          style={{
            position: 'absolute',
            left: 150,
            top: 20,
            width: 500,
            height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(closest-side, rgba(255,170,60,0.28), rgba(255,170,60,0))',
            opacity: bloom,
          }}
        />
        <div
          style={{
            fontWeight: 780,
            fontSize: 168,
            lineHeight: 1,
            letterSpacing: tracking(168),
            fontVariantNumeric: 'tabular-nums',
            background: 'linear-gradient(180deg, #ffffff 30%, #d9dce4 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            transform: `translateY(${(-3 * knock).toFixed(2)}px) scale(${popScale.toFixed(4)})`,
            filter: rollBlur > 0.05 ? `blur(${rollBlur.toFixed(2)}px)` : undefined,
          }}
        >
          {value.toLocaleString('en-US')}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, fontSize: 34, letterSpacing: tracking(34) }}>
          <span style={{ fontWeight: 600, color: '#c3c7d1' }}>Teams onboarded</span>
          <span style={{ fontWeight: 500, color: '#6c7280' }}>since launch</span>
        </div>
      </div>

      {/* 火星：每个 tick 一簇，寿命耗尽条件卸载；screen 叠加 = 发光 */}
      <div style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen' }}>
        {TICKS.map((tick, t) => {
          const age = frame - tick.f;
          if (age <= 0 || age >= SPARK_LIFE) return null;
          const n = tick.big ? 20 : 6 + Math.floor(rnd(t, 21) * 5); // 6–10，终跳 20
          return Array.from({ length: n }).map((_, i) => {
            const salt = t * 31 + i;
            // 初速：向上 9–13px/f，水平 ±4.5px/f 扇形铺开（终跳更宽）
            const vy0 = -(9 + rnd(salt, 2) * 4);
            const vx = (rnd(salt, 3) - 0.5) * (tick.big ? 13 : 9);
            const x0 = CX + (rnd(salt, 4) - 0.5) * (tick.big ? 560 : 380); // 沿数字顶缘散布
            const x = x0 + vx * age;
            const y = TOP_Y + vy0 * age + 0.5 * GRAV * age * age;
            const vy = vy0 + GRAV * age;
            const life = 1 - age / SPARK_LIFE;
            const size = (tick.big ? 8.5 : 6.5) * (0.45 + 0.55 * life);
            // 沿速度方向拉成短流星：长度 = 尺寸 + 速度 × 1.7
            const speed = Math.hypot(vx, vy);
            const len = size + speed * 1.7;
            const ang = (Math.atan2(vy, vx) * 180) / Math.PI;
            const col = sparkColor(life);
            return (
              <div
                key={`${t}-${i}`}
                style={{
                  position: 'absolute',
                  left: x - len,
                  top: y - size / 2,
                  width: len,
                  height: size,
                  borderRadius: size / 2,
                  transformOrigin: `${len}px ${size / 2}px`,
                  transform: `rotate(${ang.toFixed(1)}deg)`,
                  // 头亮尾虚：火星头在运动前端
                  background: `linear-gradient(90deg, rgba(0,0,0,0) 0%, ${col} 85%)`,
                  opacity: interpolate(life, [0, 0.25, 1], [0, 0.85, 1], { easing: Easing.out(Easing.quad), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
                  boxShadow: `0 0 ${(10 * life).toFixed(1)}px ${(1.5 * life).toFixed(1)}px rgba(255,150,40,${(0.55 * life).toFixed(2)})`,
                }}
              />
            );
          });
        })}
      </div>
      <Grain opacity={0.08} blend="soft-light" />
    </div>
  );
};
