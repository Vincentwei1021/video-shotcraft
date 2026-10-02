// logo-shrink-wordmark-lockup — Shrink & Lockup 图标收束落位（motion-lab 定稿转原生 Remotion）
// 霓虹切口大环 easeInOut 快速缩成中央实心小白 O（抽象几何 mark，末尾轻微过冲刹车），
// 随后图标左移让位，五个字母从左到右逐个 opacity+8px 滑入完成 lockup，
// 强调色标语延迟整行淡入收尾。设计坐标 480×270（DesignStage 等比放大，zoom 栅格化保字边锐利）。
// 质感升级：背景换带色相的深场 + 随大环收束一起坍缩的紫色能量光晕；收束途中双弧边转边缩
// （减速旋转 150°），高速段拖两层缩放残影当运动模糊；落位刹车瞬间放一圈细冲击波（只一次）；
// 字母滑入带 2.5px→0 的对焦模糊；标语改成与霓虹同族的冷紫，不再是撞色的红。
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';
import { FONT, Grain, Vignette } from '../../_fixtures/Polish';

export const LOGO_SHRINK_WORDMARK_LOCKUP_DURATION = 132; // 4400ms @30fps

const ACCENT = '#9d94ff'; // 标语强调色：与霓虹晕同色相、提亮降饱和
const WORDMARK = 'BRAND';
const ICON = 30; // 图标基准尺寸(px)
const SHIFT = -62; // 图标 lockup 左位偏移（与字母行 50%-32px 耦合：整组 lockup 视觉居中）
const DT = 1 / 131; // 一帧对应的 t 增量（132f）

// 圆弧 path（角度制，顺时针 sweep）
const arcPath = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const p = (a: number) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
};

// 双弧组：a0-a1 与其对角（+180°）两段圆弧 —— 带缺口的切口环
const Arcs: React.FC<{ a0: number; a1: number; col: string; w: number; blur: number; opacity: number; stroke?: string }> = ({
  a0,
  a1,
  col,
  w,
  blur,
  opacity,
  stroke,
}) => (
  <g opacity={opacity}>
    {[
      [a0, a1],
      [a0 + 180, a1 + 180],
    ].map(([b0, b1], i) => (
      <path
        key={i}
        d={arcPath(15, 15, 10.5, b0, b1)}
        fill="none"
        stroke={stroke ?? col}
        strokeWidth={w}
        strokeLinecap="round"
        style={blur ? { filter: `blur(${blur}px)` } : undefined}
      />
    ))}
  </g>
);

// 收束主曲线：scale 5.4→1（easeInOut），末尾轻微 1.06 过冲刹车
const scaleAt = (t: number) => {
  const k = seg(t, 0.02, 0.28, E.inOutCubic);
  const brake = Math.sin(seg(t, 0.26, 0.37) * Math.PI) * 0.06;
  return lerp(k, 5.4, 1) * (1 + brake);
};
// 收束途中的自转：减速转 150°（缺口在缩小中"拧紧"），愈合后肉眼不可见
const spinAt = (t: number) => -150 * seg(t, 0.0, 0.3, E.outCubic);

export const LogoShrinkWordmarkLockup: React.FC = () => {
  const t = useT();
  const s = scaleAt(t);
  const spin = spinAt(t);
  // 左移让位：落位后 t 0.34-0.47
  const shift = seg(t, 0.34, 0.47, E.inOutCubic) * SHIFT;
  // 霓虹缺口态 → 实心白 O 交叉淡化（随收束进行）
  const heal = seg(t, 0.10, 0.28, E.inOutQuad);
  // 缩放残影：按每帧缩放量给强度，静止时为 0
  const ds = Math.abs(scaleAt(t) - scaleAt(t - DT));
  const trail = Math.min(1, ds / 0.35);
  // 冲击波：刹车回弹的那一下（t≈0.28）放一圈细环，扩散并消散
  const wave = seg(t, 0.28, 0.46, E.outCubic);
  // 能量光晕：开场罩住大环，随收束一起坍缩变小、落位后回落成图标背后的微光
  const haloR = lerp(seg(t, 0.02, 0.3, E.inOutCubic), 150, 34);
  const haloA = 0.5 - 0.32 * seg(t, 0.3, 0.5, E.outCubic);

  const icon = (sc: number, rot: number, opacity: number, ghost = false) => (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: ICON,
        height: ICON,
        margin: `${-ICON / 2}px 0 0 ${-ICON / 2}px`,
        transform: `translateX(${shift}px) scale(${sc}) rotate(${rot}deg)`,
        opacity,
      }}
    >
      <svg viewBox="0 0 30 30" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
        {/* 霓虹晕（带缺口） */}
        <Arcs a0={-32} a1={122} col="rgba(118,96,255,.62)" w={6.5} blur={2.5} opacity={1 - heal} />
        {/* 霓虹芯：heal 过半后转纯白 */}
        {!ghost && (
          <Arcs a0={-32} a1={122} col="#dfe9ff" w={3.4} blur={0} opacity={1 - heal * 0.75} stroke={heal > 0.5 ? '#fff' : '#dfe9ff'} />
        )}
        {/* 愈合后的实心白 O */}
        {!ghost && <circle cx={15} cy={15} r={10.5} fill="none" stroke="#fff" strokeWidth={5.5} opacity={heal} />}
      </svg>
    </div>
  );

  // 底色标定：原样片 mp4（yuv420p，无色彩元数据）把 #05060a 解码回 rgb(3,5,9)；此处改用带色相的深场
  return (
    <AbsoluteFill>
    <DesignStage bg="#06070c" raster="zoom">
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {/* 深场：顶部略亮的冷色纵向渐变 */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #0d0f17 0%, #07080d 60%, #05060a 100%)' }} />
        {/* 能量光晕（随大环坍缩） */}
        <div
          style={{
            position: 'absolute',
            left: `calc(50% + ${shift}px - ${haloR}px)`,
            top: `calc(50% - ${haloR}px)`,
            width: haloR * 2,
            height: haloR * 2,
            borderRadius: '50%',
            opacity: haloA,
            background: 'radial-gradient(circle, rgba(110,92,255,0.42) 0%, rgba(110,92,255,0.12) 38%, rgba(110,92,255,0) 70%)',
          }}
        />
        {/* 冲击波：细亮环 + 外圈柔光，扩散时变细变淡 */}
        {wave > 0 && wave < 1 && (
          <div
            style={{
              position: 'absolute',
              left: `calc(50% - ${lerp(wave, 16, 70)}px)`,
              top: `calc(50% - ${lerp(wave, 16, 70)}px)`,
              width: lerp(wave, 32, 140),
              height: lerp(wave, 32, 140),
              borderRadius: '50%',
              boxSizing: 'border-box',
              border: `${lerp(wave, 0.9, 0.25)}px solid rgba(214,220,255,${(0.55 * (1 - wave)).toFixed(3)})`,
              boxShadow: `0 0 ${lerp(wave, 4, 10)}px rgba(130,112,255,${(0.45 * (1 - wave)).toFixed(3)})`,
            }}
          />
        )}
        {/* 缩放残影（只在高速段出现）：上 1f、上 2f 的尺度与角度 */}
        {trail > 0.02 && icon(scaleAt(t - 2 * DT), spinAt(t - 2 * DT), 0.16 * trail, true)}
        {trail > 0.02 && icon(scaleAt(t - DT), spinAt(t - DT), 0.3 * trail, true)}
        {/* 图标：SVG 双弧切口环 —— 抽象几何 mark，非任何具体品牌 logo（收束时缺口愈合、霓虹转纯白） */}
        {icon(s, spin, 1)}
        {/* 字母行（图标右侧）：从左到右 stagger，opacity 0→1 + translateX 8px→0 + 对焦模糊 */}
        <div
          style={{
            position: 'absolute',
            left: 'calc(50% - 32px)',
            top: '50%',
            height: ICON,
            marginTop: -ICON / 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          {[...WORDMARK].map((ch, i) => {
            const lk = seg(t, 0.46 + i * 0.035, 0.46 + i * 0.035 + 0.10, E.outCubic);
            return (
              <span
                key={i}
                style={{
                  color: '#f3f5fb',
                  font: `760 27px/1 ${FONT.sans}`,
                  letterSpacing: 1.6,
                  opacity: lk,
                  transform: `translateX(${lerp(lk, 8, 0)}px)`,
                  filter: lk < 0.999 ? `blur(${lerp(lk, 2.5, 0).toFixed(2)}px)` : undefined,
                  textShadow: '0 0 12px rgba(150,140,255,0.18)',
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
        {/* 强调色标语（占位文案）：延迟整行淡入，同时上移 3px 落座 */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 'calc(50% + 34px)',
            textAlign: 'center',
            color: ACCENT,
            font: `600 12.5px/1 ${FONT.sans}`,
            letterSpacing: 4.6,
            opacity: seg(t, 0.72, 0.84, E.outQuad),
            transform: `translateY(${lerp(seg(t, 0.72, 0.86, E.outCubic), 3, 0)}px)`,
          }}
        >
          BUILD. SHIP. REPEAT.
        </div>
      </div>
    </DesignStage>
    {/* 暗角与颗粒放在设计坐标外，按 1920 原生像素铺，颗粒不被 zoom 放大成色块 */}
    <Vignette strength={0.55} inner={0.4} color="#000000" />
    <Grain opacity={0.07} blend="soft-light" />
    </AbsoluteFill>
  );
};
