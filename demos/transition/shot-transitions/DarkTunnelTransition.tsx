// B 式 穿暗场直航（dark-tunnel）——相机顺运动方向推出前景 → 暗场里滑行几帧 →
// 后景从景深迎面放大而来，一条 take 不切。高能量→高能量的场景跳转主力转场。
//
// 第二轮重设计（午夜蓝 · 纵深隧道）：
// - look = midnight（深蓝夜 · 电光蓝 · 青）。运动方向从"横移"改成**沿镜头光轴的纵深直航**：
//   A 窗口（projects-full 项目板）迎面扑过镜头、B 窗口（wbr-full 周报页）从隧道尽头一个小亮窗
//   一路放大到满幅——方向天然连续，"前进感"比横移强一个量级。
// - 只有一台相机：世界里 A 在 z=0、B 在 z=L、中间 5 道与窗口同形的发丝线"闸门"，外圈一圈光尘；
//   全部按同一条相机行程 c(f) 做透视投影 s = F / (z − c)，速度曲线天然连续（加速推出 → 暗场峰值 →
//   长尾减速迎入），中途不回摆。闸门逐道旋转 6°，穿过时像拧进一条隧道；光尘按相机速度拉成径向光丝。
// - 速度感：A 扑过镜头时叠 3 层递减缩放的残影（径向变焦拖影），并随放大淡出；B 在远处带景深虚化，
//   边放大边收焦；隧道尽头一团冷光 = B 的"光源"。B 落定后保留极缓前推（同一相机的 0.3/f 爬行）。
// - 每个窗口左下角骑缝挂一枚场景标签胶囊（Projects · 10 active / Weekly report · W28），跟着窗口一起在透视里走。
//
// 时间表（30fps，共 120f）：
//   0–22    A hold：窗口受冷光，相机极缓爬行（0.3/f）
//   22–33   推出 11f：A 由 1× 加速放大到 ~8×（2.2× 起淡出 + 变焦残影），暗场与光丝亮起
//   33–38   暗场滑行 5f：速度峰值，闸门连续掠过，尽头小亮窗 = B（~0.2×）
//   38–62   B 迎入 24f：长尾减速放大、收焦、去暗；最后一道闸门在 45f 前后掠过
//   62–120  B hold：极缓前推 1.9%→3.7%，真静止的内容可读
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { EASE, FONT, bezier, ramp, softShadow } from '../../_fixtures/Polish';
import { LOOKS, Stage, Dust, alpha } from '../../_fixtures/Look';

export const DARKTUNNEL_DUR = 120;

const L = LOOKS.midnight;
const F = 1000; // 焦距：距离 F 处的物体按 1× 显示
const ZB = 5200; // B 的世界深度
const C0 = -F; // 相机起点（A 在 1×）
const C1 = ZB - F; // 相机终点（B 在 1×）
const T0 = 22;
const T = 40;
const TRAVEL = bezier(0.62, 0, 0.18, 1); // 加速推出 → 峰值 → 长尾减速
const CREEP = 0.3; // 全程爬行（hold 段的极缓推进，同一台相机）
const camAt = (f: number) => C0 + CREEP * f + (C1 - C0) * TRAVEL((f - T0) / T);
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

const WIN_W = 1480;
const WIN_H = 832;

// 闸门：与窗口同形的圆角发丝框，逐道同向多转 5°（穿过时像拧进隧道）
const GATES = [700, 1500, 2300, 3100, 3800].map((z, k) => ({ z, rot: (k + 1) * 5 }));

// 光尘：确定性伪随机，分布在窗口外圈的圆环里（不挡主角）
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const MOTES = Array.from({ length: 84 }, (_, i) => {
  const a = hash(i * 3 + 1) * Math.PI * 2;
  const r = 980 + hash(i * 3 + 2) * 1700;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.62, z: -300 + hash(i * 3 + 3) * (ZB + 200), w: 0.6 + hash(i * 7 + 5) * 1.4, cool: hash(i * 11) > 0.72 };
});

// 世界里一块 W×H 的平面，在深度 d 处投影到屏幕中心
const Plane: React.FC<{ s: number; w: number; h: number; rot?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ s, w, h, rot = 0, children, style }) => (
  <div style={{
    position: 'absolute', left: 960 - w / 2, top: 540 - h / 2, width: w, height: h,
    transform: `scale(${s.toFixed(5)})${rot ? ` rotate(${rot}deg)` : ''}`, transformOrigin: '50% 50%', ...style,
  }}>
    {children}
  </div>
);

const Tag: React.FC<{ label: string; meta: string }> = ({ label, meta }) => (
  <div style={{
    position: 'absolute', left: 40, top: WIN_H - 34, height: 68, padding: '0 30px 0 24px', borderRadius: 34,
    display: 'flex', alignItems: 'center', gap: 16, whiteSpace: 'nowrap',
    background: `linear-gradient(180deg, ${L.surface2}, ${L.surface})`, border: `1px solid ${alpha('#a8c0ff', 0.22)}`,
    boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.1)}, ${softShadow(24, { color: L.shadow, strength: 2.4 })}`,
  }}>
    <div style={{ width: 12, height: 12, borderRadius: 6, background: L.accent, boxShadow: `0 0 14px ${alpha(L.accent, 0.9)}` }} />
    <span style={{ fontFamily: FONT.sans, fontSize: 34, fontWeight: 650, color: L.ink, letterSpacing: '-0.02em' }}>{label}</span>
    <span style={{ fontFamily: FONT.mono, fontSize: 28, color: L.ink2 }}>{meta}</span>
  </div>
);

const Win: React.FC<{ src: string; pageW: number; pageX: number; pageY: number; dim: number; glow: number; tag: [string, string] }> = ({ src, pageW, pageX, pageY, dim, glow, tag }) => (
  <>
    <div style={{
      position: 'absolute', inset: 0, borderRadius: 24, overflow: 'hidden', background: '#f9f6f1',
      boxShadow: `0 0 0 1px ${alpha('#c8d6ff', 0.25)}, 0 0 ${80 * glow}px ${alpha(L.accent, 0.35 * glow)}, ${softShadow(60, { color: L.shadow, strength: 3 })}`,
    }}>
      <Img src={staticFile(src)} style={{ position: 'absolute', left: pageX, top: pageY, width: pageW }} />
      {/* 冷调受光：顶部高光 + 底部压暗，让暖白页面坐进蓝夜 */}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${alpha('#e8f0ff', 0.12)} 0%, ${alpha('#e8f0ff', 0)} 26%, ${alpha('#0a1430', 0.16)} 100%)` }} />
      {dim > 0.002 && <div style={{ position: 'absolute', inset: 0, background: L.bg[1], opacity: dim }} />}
    </div>
    <Tag label={tag[0]} meta={tag[1]} />
  </>
);

export const DarkTunnelTransition: React.FC = () => {
  const frame = useCurrentFrame();
  const c = camAt(frame);
  const v = camAt(frame + 0.5) - camAt(frame - 0.5); // 相机 z 速度（世界单位 / 帧）
  const speed = clamp01(v / 420); // 0–1 归一化速度（峰值 ~420/f）

  // ── A：z = 0 ──
  const dA = -c;
  const sA = dA > 60 ? F / dA : 99;
  const aFade = 1 - clamp01((sA - 2.2) / 3.4);
  const aDim = 0.35 * clamp01((sA - 1.05) / 1.2);
  const dsA = sA > 0 && dA > 60 ? F / Math.max(60, dA - v * 0.5) - F / Math.max(60, dA + v * 0.5) : 0; // 每帧放大量

  // ── B：z = ZB ──
  const dB = ZB - c;
  const sB = F / dB;
  const kB = clamp01((sB - 0.2) / 0.8); // 迎入进度
  const bBlur = sB < 0.97 ? Math.min(40, (10 * (1 - sB)) / Math.max(sB, 0.2)) : 0; // 元素空间 px（远处 ≈ 8px 屏幕虚化）
  const bDim = 0.18 * (1 - EASE.out(kB));

  // 暗场：推出段亮起尽头冷光 + 光丝，B 迎入后由 B 覆盖、渐收
  const tunnel = ramp(frame, 24, 10, EASE.out) * (1 - ramp(frame, 50, 20, EASE.smooth) * 0.7);

  return (
    <AbsoluteFill style={{ background: L.bg[2], overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.02 + 0.48 * tunnel }} fill={{ x: 0.5, y: 1 - 0.5 * tunnel }} intensity={0.8 + 0.4 * tunnel} vignette={0.7}>
        <Dust look={L} count={30} seed={4} drift={0.15} opacity={0.5 * (1 - tunnel)} />
        {/* 隧道尽头的冷光核：B 的光源 */}
        <div style={{
          position: 'absolute', inset: 0, opacity: tunnel,
          background: `radial-gradient(ellipse 22% 24% at 50% 50%, ${alpha('#bcd0ff', 0.32)} 0%, ${alpha(L.accent, 0.18)} 40%, ${alpha(L.accent, 0)} 100%)`,
        }} />
        {/* 光丝：外圈光尘按相机速度拉成径向线（拖尾 = 3 帧前的投影位置） */}
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: 0.25 + 0.75 * tunnel }}>
          {MOTES.map((m, i) => {
            const d = m.z - c;
            if (d < 50 || d > 5600) return null;
            const s = F / d;
            const d0 = d + Math.max(4, v * 2.6);
            const s0 = F / d0;
            const x = 960 + m.x * s, y = 540 + m.y * s;
            const x0 = 960 + m.x * s0, y0 = 540 + m.y * s0;
            if ((x < -200 && x0 < -200) || (x > 2120 && x0 > 2120) || (y < -200 && y0 < -200) || (y > 1280 && y0 > 1280)) return null;
            const near = clamp01(s / 1.2);
            const o = clamp01((5600 - d) / 2400) * (0.25 + 0.75 * near) * (0.35 + 0.65 * speed);
            return (
              <line key={i} x1={x0} y1={y0} x2={x} y2={y} strokeLinecap="round"
                stroke={m.cool ? L.accent2 : '#b9c9ff'} strokeOpacity={o.toFixed(3)} strokeWidth={Math.min(5, m.w * (0.8 + s * 1.6)).toFixed(2)} />
            );
          })}
        </svg>
      </Stage>

      {/* 闸门：与窗口同形的发丝框，逐道旋转；远处淡、穿过前放大淡出 */}
      {GATES.map((g, i) => {
        const d = g.z - c;
        if (d < 120) return null;
        const s = F / d;
        const o = clamp01((s - 0.12) / 0.25) * (1 - clamp01((s - 1.6) / 1.4)) * (0.35 + 0.65 * tunnel);
        if (o < 0.01) return null;
        return (
          <Plane key={i} s={s} w={WIN_W + 220} h={WIN_H + 160} rot={g.rot}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 48, opacity: o,
              border: `${(2 / Math.max(0.4, s)).toFixed(2)}px solid ${alpha('#9fb8ff', 0.7)}`,
              boxShadow: `0 0 ${(24 / Math.max(0.4, s)).toFixed(1)}px ${alpha(L.accent, 0.5)}, inset 0 0 ${(24 / Math.max(0.4, s)).toFixed(1)}px ${alpha(L.accent, 0.3)}`,
            }} />
          </Plane>
        );
      })}

      {/* B：隧道尽头的小亮窗 → 满幅（先画，A 在其上扑过镜头） */}
      {frame >= 26 && (
        <Plane s={sB} w={WIN_W} h={WIN_H} style={{ filter: bBlur > 0.3 ? `blur(${bBlur.toFixed(2)}px)` : undefined }}>
          <Win src="textures/live/wbr-full.png" pageW={WIN_W} pageX={0} pageY={0} dim={bDim} glow={0.25 + 0.75 * (1 - kB)} tag={['Weekly report', 'W28']} />
        </Plane>
      )}

      {/* A：变焦残影（只在快速段）+ 本体 */}
      {aFade > 0.01 && (
        <>
          {dsA > 0.02 && [3, 2, 1].map((k) => (
            <Plane key={k} s={sA * (1 - Math.min(0.12, dsA / sA * 0.5) * k)} w={WIN_W} h={WIN_H} style={{ opacity: 0.2 * aFade }}>
              <Win src="textures/live/projects-full.png" pageW={1920} pageX={-220} pageY={-110} dim={aDim} glow={0} tag={['Projects', '10 active']} />
            </Plane>
          ))}
          <Plane s={sA} w={WIN_W} h={WIN_H} style={{ opacity: aFade }}>
            <Win src="textures/live/projects-full.png" pageW={1920} pageX={-220} pageY={-110} dim={aDim} glow={0} tag={['Projects', '10 active']} />
          </Plane>
        </>
      )}
    </AbsoluteFill>
  );
};
