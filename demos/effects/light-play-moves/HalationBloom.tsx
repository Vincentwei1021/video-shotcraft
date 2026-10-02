// halation-bloom —— 高光晕染
// 深底大白字 "10×" crash-zoom 急停入场（2.4→0.94，7f in-quad 时间采样运动模糊 + 2f 回弹到 1）。
// 撞停帧起：底层复制文字（blur+提亮的白色晕层）猛涨一圈（scale 1→1.3，6f out-cubic 扩散），
// 再 20f 线性回落到 0.35 驻留柔晕（扩散/消散解耦判例），随后 15f 缓收到 0.22 稳态。
// 晕分三层才像胶片：贴边的紧芯（blur 6）+ 主晕（blur 22，参数表数值）+ 外圈暖色 halation 边
//（胶片红晕，blur 48），撞停同帧背景被"照亮"一下再退。副标题撞停后 6f 错峰浮入。
// 深底白字：白底上提亮不可见判例。收尾真静止 ≥40f（颗粒用静态纹理，f56 起逐帧相同）。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, Vignette, bezier, mix, ramp, tracking } from '../../_fixtures/Polish';

export const HALATION_BLOOM_DURATION = 145;

const BG_TOP = '#16171c';
const BG_BOT = '#0b0c10';
const WHITE = '#f6f5f2';
const HALATION = '255,128,84'; // 胶片 halation 的暖橙红边（rgb）

// —— 时间轴（30fps）——
const ZOOM_START = 8; // 入场起始
const IMPACT = 15; // 撞停帧（7f 急速缩入）
const REBOUND_END = 17; // 2f 回弹
const POP_END = IMPACT + 6; // 晕层猛涨 6f → f21
const FALL_END = POP_END + 20; // 20f 线性回落 → f41
const SETTLE_END = FALL_END + 15; // 15f 缓收 → f56，此后全静止
// 总时长 145f → 静止 89f ≥ 40f

const inQuad = bezier(0.55, 0.085, 0.68, 0.53);
const outQuad = bezier(0.25, 0.46, 0.45, 0.94);
const outCubic = bezier(0.215, 0.61, 0.355, 1);

const TextBlock: React.FC<{ color: string }> = ({ color }) => (
  <div
    style={{
      fontFamily: FONT.sans,
      fontSize: 300,
      fontWeight: 800,
      color,
      letterSpacing: tracking(300),
      lineHeight: 1,
      whiteSpace: 'nowrap',
      fontVariantNumeric: 'tabular-nums',
    }}
  >
    10×
  </div>
);

const Center: React.FC<{ style?: React.CSSProperties; children: React.ReactNode }> = ({ style, children }) => (
  <div
    style={{
      // 盒子底边让出 60px：字块（与缩放原点）整体略高于几何中心，给副标题留位
      position: 'absolute', left: 0, right: 0, top: 0, bottom: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
      ...style,
    }}
  >
    {children}
  </div>
);

// crash-zoom：scale 2.4 → 0.94（7f in-quad 加速撞停）→ 1（2f 回弹）
const scaleAt = (f: number) =>
  f < IMPACT ? mix(2.4, 0.94, ramp(f, ZOOM_START, IMPACT - ZOOM_START, inQuad)) : mix(0.94, 1, ramp(f, IMPACT, REBOUND_END - IMPACT, outQuad));

export const HalationBloom: React.FC = () => {
  const frame = useCurrentFrame();

  const textOpacity = ramp(frame, ZOOM_START, 3, EASE.linear);

  // —— 晕层：撞停帧起条件挂载 ——
  // 扩散（scale）：out-cubic，6f 猛涨 1 → 1.3
  const bloomScale = mix(1, 1.3, ramp(frame, IMPACT, POP_END - IMPACT, outCubic));
  // 消散（opacity）：与扩散解耦——猛涨段保持全亮，随后 20f 线性回落到 0.35，再 15f 缓收到 0.22 稳态
  const bloomOpacity =
    frame < FALL_END
      ? mix(1, 0.35, ramp(frame, POP_END, FALL_END - POP_END, EASE.linear))
      : mix(0.35, 0.22, ramp(frame, FALL_END, SETTLE_END - FALL_END, outQuad));
  // 紧芯与暖边跟随主晕的能量，但比例不同：芯贴字（不扩），暖边扩得更开、退得更干净
  const core = frame >= IMPACT ? mix(0.9, 0.5, ramp(frame, IMPACT, SETTLE_END - IMPACT, EASE.out)) : 0;
  const warm = frame >= IMPACT ? bloomOpacity * 0.55 : 0;
  // 背景受光：撞停同帧整片暗场被照亮一下（中心径向抬亮），10f 起退到驻留的 0.3
  const spill = frame >= IMPACT ? mix(1, 0.3, ramp(frame, IMPACT + 2, SETTLE_END - IMPACT - 2, EASE.out)) : 0;

  // 入场运动模糊：急缩段快门 0.5f，按字边位移（≈ Δscale × 半字宽 420px）取 1–14 个子帧
  //（第 k 层 opacity 1/(k+1) = 等权平均），子帧间距再用一点高斯抹平阶梯
  const flying = frame > ZOOM_START && frame < IMPACT;
  const edge = flying ? Math.abs(scaleAt(frame) - scaleAt(frame - 0.5)) * 420 : 0;
  const n = flying ? Math.max(1, Math.min(14, Math.ceil(edge / 5))) : 1;
  const sd = n > 1 ? Math.min(4, (edge / (n - 1)) * 0.5) : 0;

  // 副标题：撞停后 6f 起 14f 错峰浮入（out），与"砸停"拉开一拍
  const sub = ramp(frame, IMPACT + 6, 14, EASE.out);

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        background: `linear-gradient(180deg, ${BG_TOP} 0%, ${BG_BOT} 100%)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 字后的暗场受光：常驻极弱的冷光斑 + 撞停时的暖白泛光 */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 46% 52% at 50% 46%, rgba(140,150,190,0.10) 0%, rgba(140,150,190,0) 70%)',
        }}
      />
      {spill > 0 && (
        <div
          style={{
            position: 'absolute', inset: 0, opacity: spill,
            background: `radial-gradient(ellipse 40% 44% at 50% 45%, rgba(255,236,220,0.16) 0%, rgba(${HALATION},0.05) 45%, rgba(${HALATION},0) 75%)`,
          }}
        />
      )}

      {/* 晕层 1：暖色 halation 外边（最宽、最暗、暖橙红） */}
      {frame >= IMPACT && (
        <Center style={{ transform: `scale(${bloomScale * 1.04})`, opacity: warm, filter: 'blur(48px)' }}>
          <TextBlock color={`rgb(${HALATION})`} />
        </Center>
      )}
      {/* 晕层 2：主晕（参数表：blur 22 + brightness 1.8，scale 1→1.3） */}
      {frame >= IMPACT && (
        <Center style={{ transform: `scale(${bloomScale})`, opacity: bloomOpacity, filter: 'blur(22px) brightness(1.8)' }}>
          <TextBlock color={WHITE} />
        </Center>
      )}
      {/* 晕层 3：紧芯，贴字边的高亮溢出（不随主晕扩散） */}
      {frame >= IMPACT && (
        <Center style={{ transform: `scale(${scaleAt(frame)})`, opacity: core, filter: 'blur(6px)' }}>
          <TextBlock color="#ffffff" />
        </Center>
      )}

      {/* 本体文字：crash-zoom 急停（飞行段时间采样运动模糊） */}
      {Array.from({ length: n }, (_, k) => (
        <Center
          key={k}
          style={{
            transform: `scale(${scaleAt(frame - (0.5 * k) / Math.max(1, n - 1)).toFixed(4)})`,
            opacity: textOpacity * (k === 0 ? 1 : 1 / (k + 1)),
            filter: sd > 0.3 ? `blur(${sd.toFixed(2)}px)` : undefined,
          }}
        >
          <TextBlock color={WHITE} />
        </Center>
      ))}

      {/* 副标题：说明 10× 是什么（要读的辅助文字 ≥32px） */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: 742, textAlign: 'center',
          fontFamily: FONT.sans, fontSize: 40, fontWeight: 500, letterSpacing: tracking(40),
          color: 'rgba(246,245,242,0.62)', opacity: sub, transform: `translateY(${mix(18, 0, sub).toFixed(2)}px)`,
        }}
      >
        faster builds on every commit
      </div>

      <Vignette strength={0.55} inner={0.42} color="#000000" />
      {/* 静态颗粒（step 极大 = 纹理不换）：防暗场渐变色带，同时保证收尾逐帧相同 */}
      <Grain opacity={0.07} step={100000} blend="soft-light" />
    </div>
  );
};
