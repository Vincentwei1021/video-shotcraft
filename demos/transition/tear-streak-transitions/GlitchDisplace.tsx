// glitch-displace｜噪声置换撕裂
// FakeDashboard A 播到 45f，45–62f 撕裂转场：页面切 16 条水平条带
// （外层 overflow hidden + 内层整页反向 translateY 对位），每条 translateX
// 由 h(条号*31+f*7) 驱动 ±70px 抖动，幅度包络 0→峰值→0（起势 out-cubic、
// 消散线性，冲击判例）。58f 抖动衰减中硬切 variant="B"，再抖 4f 至 62f 归位。
// 62f 起摘罩直出 B（条带/重影/颗粒全部条件卸载），62–135f 真静止 73f ≥ 40f。
//
// 质感升级（专业 glitch 的几处讲究）：
// - 条带高度不等（确定性权重，最窄约 1/3 最宽）——等高横条读作百叶窗，不读作信号撕裂；
// - 抖幅按条分「能量」：少数条重撕（满幅 ±70）、多数条轻颤、约两成条不动，
//   错位有主次才像故障，全员同幅乱抖像水波；值再过一道指数把它推向两端（要么大撕要么回中，少中间态）；
// - 明暗双重影挂在条带里面、随条一起错位（旧版重影压在条带底下被整页盖住，看不见）：
//   +12px 原页 multiply（字与线向右拖出暗边）、−12px 原页 lighten（向左吃出亮边），白底不发灰，
//   只给错位明显的条，灰阶版 RGB 分离；
// - 错位条的上沿一根 1px 亮线、下沿一根暗线——撕口的切边；撕裂期叠信号颗粒；
// - 38–39f 先来 2 帧细微前兆（两条 ±10px 轻颤）做预备，58f 切点叠 2 帧轻曝光抬升掩护硬切。
// 帧确定：h() 伪随机，无 Math.random。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { FakeDashboard, G } from '../../_fixtures/Fixtures';
import { Grain } from '../../_fixtures/Polish';

export const GLITCH_DISPLACE_DURATION = 135; // 前态 45 + 撕裂 17 + 真静止 73

const STRIPS = 16;
const W = 1920;
const H = 1080;
const AMP = 70; // 峰值条带错位（spec 加码档，QA 要一眼看到撕裂）
const GHOST = 12; // 明暗重影错位 px
const TEAR_IN = 45;
const CUT = 58; // 硬切点：藏在抖动衰减中
const TEAR_OUT = 62; // 摘罩

// 库内标准伪随机
const h = (n: number) => {
  const s = Math.sin(n * 127.3) * 43758.5453;
  return s - Math.floor(s);
};

// 16 条不等高条带：权重 0.45–1.35 归一化到 1080，取整后最后一条吃掉余数
const BANDS = (() => {
  const w = Array.from({ length: STRIPS }, (_, i) => 0.45 + h(i * 13 + 5) * 0.9);
  const sum = w.reduce((a, b) => a + b, 0);
  let top = 0;
  return w.map((wi, i) => {
    const hh = i === STRIPS - 1 ? H - top : Math.round((wi / sum) * H);
    const band = { top, h: hh };
    top += hh;
    return band;
  });
})();

// 每条的「能量」：约 2 成条静止、3 成重撕、其余轻颤（固定，不随帧变）
const ENERGY = BANDS.map((_, i) => {
  const r = h(i * 7 + 101);
  return r < 0.2 ? 0 : r > 0.68 ? 1 : 0.18 + r * 0.35;
});

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// 条带内容：整页对位 + （重撕条）明暗双重影
const StripPage: React.FC<{ top: number; variant: 'A' | 'B'; ghost: number }> = ({ top, variant, ghost }) => (
  <div style={{ position: 'absolute', left: 0, top: -top, width: W, height: H }}>
    <FakeDashboard variant={variant} />
    {ghost > 0.02 && (
      <>
        <div style={{
          position: 'absolute', inset: 0, transform: `translateX(${GHOST}px)`,
          opacity: 0.55 * ghost, mixBlendMode: 'multiply',
        }}>
          <FakeDashboard variant={variant} />
        </div>
        <div style={{
          position: 'absolute', inset: 0, transform: `translateX(${-GHOST}px)`,
          opacity: 0.7 * ghost, mixBlendMode: 'lighten',
        }}>
          <FakeDashboard variant={variant} />
        </div>
      </>
    )}
  </div>
);

export const GlitchDisplace: React.FC = () => {
  const frame = useCurrentFrame();
  const variant: 'A' | 'B' = frame >= CUT ? 'B' : 'A';
  const precursor = frame === 38 || frame === 39;
  const tearing = frame >= TEAR_IN && frame < TEAR_OUT;

  if (!tearing && !precursor) {
    // 45f 前 A 静置；62f 起 B 摘罩真静止（无 transform / filter / 重影）
    return (
      <AbsoluteFill style={{ background: G.bg }}>
        <FakeDashboard variant={variant} />
      </AbsoluteFill>
    );
  }

  // 幅度包络：45–48f out-cubic 冲起 → 平台 → 56–62f 线性消散（帧驱动，确定性）
  const rise = interpolate(frame, [TEAR_IN, TEAR_IN + 3], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const decay = interpolate(frame, [56, TEAR_OUT], [1, 0], clamp);
  const env = precursor ? 0 : Math.min(rise, decay);
  // 切点掩护：58f/59f 轻曝光抬升
  const exposure = frame === CUT ? 1.1 : frame === CUT + 1 ? 1.05 : 1;

  const strips = BANDS.map((b, i) => {
    let dx = 0;
    if (precursor) {
      // 前兆：只有两条重撕条轻颤 ±10px
      dx = (i === 4 || i === 11) ? (h(i * 31 + frame * 7) > 0.5 ? 10 : -10) : 0;
    } else {
      const r = h(i * 31 + frame * 7) * 2 - 1;
      // 指数 0.6 把值推向两端：重撕条多数帧接近满幅，少数帧回中
      dx = Math.sign(r) * Math.pow(Math.abs(r), 0.6) * AMP * ENERGY[i] * env;
    }
    return { ...b, dx, ghost: precursor ? 0 : Math.min(1, Math.abs(dx) / 40) * env };
  });

  return (
    <AbsoluteFill style={{ background: G.bg, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, filter: exposure > 1 ? `brightness(${exposure})` : undefined }}>
        {/* 底垫一份完整页，防条带横移露底色缝 */}
        <AbsoluteFill>
          <FakeDashboard variant={variant} />
        </AbsoluteFill>

        {/* 16 条不等高条带：外层裁切，内层整页反向对位 + 逐帧横向错位（静止条不挂载） */}
        {strips.map((s, i) =>
          Math.abs(s.dx) < 0.5 ? null : (
            <div key={i} style={{ position: 'absolute', top: s.top, left: 0, width: W, height: s.h, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, transform: `translateX(${s.dx.toFixed(1)}px)` }}>
                <StripPage top={s.top} variant={variant} ghost={s.ghost} />
              </div>
              {/* 撕口切边：上沿亮线、下沿暗线，随错位量显隐 */}
              <div style={{
                position: 'absolute', left: 0, right: 0, top: 0, height: 1,
                background: 'rgba(255,255,255,0.9)', opacity: Math.min(1, Math.abs(s.dx) / 30),
              }} />
              <div style={{
                position: 'absolute', left: 0, right: 0, bottom: 0, height: 1,
                background: 'rgba(16,18,24,0.35)', opacity: Math.min(1, Math.abs(s.dx) / 30),
              }} />
            </div>
          ),
        )}
      </div>
      {/* 撕裂期信号颗粒：随包络起落，摘罩后不挂载 */}
      {env > 0.02 && <Grain opacity={0.14 * env} step={1} blend="overlay" />}
    </AbsoluteFill>
  );
};
