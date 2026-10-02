// bubble-swarm-takeover —— loom-ai 9–12s
// 无剪切转场：珠光气泡群从画外飘入、越来越大遮满整屏，页面同时被"洗白"，
// 遮蔽峰值处藏场景切换，气泡散开后已是新场景。混入 i18n 文字胶囊变体元素。
// 质感层：气泡 = 珠光体色 + 偏 34%/28% 的镜面高光 + 右下反光 + 薄膜虹彩环（conic 色环裁成环带）；
// 运动按速度沿方向拉伸（便宜的方向性拖影），快时略增虚化；页面不再"呼吸缩放"，
// 改成穿过泡群的单向推镜：旧场景缓推近、新场景从 1.05 落回 1。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { FakeDashboard } from '../../_fixtures/Fixtures';
import { EASE, ramp, mix, FONT, tracking, softShadow, hairline, innerHighlight, Grain } from '../../_fixtures/Polish';

const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const BUBBLE_SWARM_TAKEOVER_DURATION = 130;

const PEAK = 75; // 遮蔽峰值帧（藏切点）
const DISPERSE_END = 118; // 散开完成（之后 12f 新场景落定 hold）
const W = 1920;
const H = 1080;
const CX = W / 2;
const CY = H / 2;

// 珠光色相微差（粉/紫/蓝/青）：[体色中心, 体色外圈, 边缘色]
const TINTS = [
  ['rgba(242,233,255,0.74)', 'rgba(214,190,255,0.66)', 'rgba(255,186,226,0.8)'],
  ['rgba(230,241,255,0.74)', 'rgba(182,214,255,0.66)', 'rgba(206,188,255,0.8)'],
  ['rgba(255,238,247,0.72)', 'rgba(255,198,226,0.64)', 'rgba(176,222,255,0.8)'],
  ['rgba(232,250,252,0.72)', 'rgba(184,236,246,0.64)', 'rgba(226,196,255,0.8)'],
];

type BubbleSpec = {
  startX: number; startY: number; targetX: number; targetY: number;
  r: number; t0: number; blur: number; tint: number;
  wobblePhase: number; wobbleAmp: number; z: number; hue: number;
};

const makeBubbles = (): BubbleSpec[] => {
  const specs: BubbleSpec[] = [];
  // 34 颗常规气泡（三层景深）
  for (let i = 0; i < 34; i++) {
    const rng = mulberry32(1000 + i * 97);
    const edge = Math.floor(rng() * 4);
    const along = rng();
    let startX = 0, startY = 0;
    if (edge === 0) { startX = along * W; startY = -320; }
    if (edge === 1) { startX = W + 320; startY = along * H; }
    if (edge === 2) { startX = along * W; startY = H + 320; }
    if (edge === 3) { startX = -320; startY = along * H; }
    const layer = i % 3; // 0 远 1 中 2 近
    const r = layer === 0 ? 45 + rng() * 55 : layer === 1 ? 100 + rng() * 90 : 210 + rng() * 150;
    specs.push({
      startX, startY,
      targetX: 140 + rng() * (W - 280),
      targetY: 100 + rng() * (H - 200),
      r,
      t0: 8 + rng() * 42,
      blur: layer === 0 ? 7 : layer === 1 ? 0.5 : 9,
      tint: Math.floor(rng() * TINTS.length),
      wobblePhase: rng() * Math.PI * 2,
      wobbleAmp: 10 + rng() * 22,
      z: layer,
      hue: rng() * 360,
    });
  }
  // 6 颗巨型气泡，峰值时铺满屏（网格落点保证覆盖）
  const grid = [
    [340, 300], [960, 240], [1580, 330],
    [320, 800], [980, 860], [1600, 780],
  ];
  grid.forEach(([gx, gy], i) => {
    const rng = mulberry32(7000 + i * 131);
    const edge = i % 4;
    let startX = 0, startY = 0;
    if (edge === 0) { startX = gx; startY = -600; }
    if (edge === 1) { startX = W + 600; startY = gy; }
    if (edge === 2) { startX = gx; startY = H + 600; }
    if (edge === 3) { startX = -600; startY = gy; }
    specs.push({
      startX, startY, targetX: gx, targetY: gy,
      r: 430 + rng() * 140,
      t0: 22 + rng() * 14,
      blur: 3, tint: i % TINTS.length,
      wobblePhase: rng() * Math.PI * 2, wobbleAmp: 8,
      z: 2, hue: rng() * 360,
    });
  });
  return specs;
};

const BUBBLES = makeBubbles();

const CAPSULES = [
  { text: 'Hallo!', code: 'DE', idx: 5 },
  { text: '¡Hola!', code: 'ES', idx: 14 },
  { text: 'Ciao!', code: 'IT', idx: 23 },
];

// 入场 / 散开进度（任意帧可取，供速度差分）
const inP = (s: BubbleSpec, f: number) => ramp(f, s.t0, PEAK - s.t0, EASE.out);
const outP = (f: number) => ramp(f, PEAK + 2, DISPERSE_END - PEAK - 2, EASE.exit);

// 气泡中心位置（纯函数）：飘入 + 双频 wobble（x/y 不同频，群体不再沿同一斜线摆）+ 径向散开
const bubblePos = (s: BubbleSpec, f: number) => {
  const pIn = inP(s, f);
  const d = outP(f);
  const wx = Math.sin(f * 0.09 + s.wobblePhase) * s.wobbleAmp * pIn;
  const wy = Math.cos(f * 0.071 + s.wobblePhase * 1.3) * s.wobbleAmp * 0.7 * pIn;
  const dx = s.targetX - CX, dy = s.targetY - CY;
  const dl = Math.max(Math.hypot(dx, dy), 60);
  return {
    x: mix(s.startX, s.targetX, pIn) + wx + (dx / dl) * d * 1700,
    y: mix(s.startY, s.targetY, pIn) + wy + (dy / dl) * d * 1700,
  };
};

const Bubble: React.FC<{ spec: BubbleSpec; frame: number }> = ({ spec, frame }) => {
  const pIn = inP(spec, frame);
  const disperse = outP(frame);
  const { x, y } = bubblePos(spec, frame);
  const a = bubblePos(spec, frame - 0.5);
  const b = bubblePos(spec, frame + 0.5);
  const vx = b.x - a.x, vy = b.y - a.y;
  const speed = Math.hypot(vx, vy);
  const scale = interpolate(ramp(frame, spec.t0, PEAK - spec.t0, EASE.out), [0, 1], [0.22, 1]) * (1 - disperse * 0.35);
  const opacity =
    ramp(frame, spec.t0, 7, EASE.out) *
    interpolate(disperse, [0.55, 1], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (opacity <= 0.01 || pIn <= 0) return null;
  const [c1, c2, rim] = TINTS[spec.tint];
  const R = spec.r * scale;
  const d = R * 2;
  // 方向性拖影：沿速度方向拉长、垂直方向微收（体积守恒感），快时额外虚一点
  const stretch = Math.min(0.32, speed * 0.0042);
  const deg = (Math.atan2(vy, vx) * 180) / Math.PI;
  const blur = spec.blur + Math.min(4, speed * 0.04);
  return (
    <div style={{
      position: 'absolute', left: x - R, top: y - R, width: d, height: d, opacity,
      transform: stretch > 0.004 ? `rotate(${deg}deg) scale(${1 + stretch}, ${1 / (1 + stretch * 0.35)}) rotate(${-deg}deg)` : undefined,
      filter: blur > 0.6 ? `blur(${blur.toFixed(2)}px)` : undefined,
    }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background:
          // 镜面高光（偏 34%/28%，"3D 球"错觉来源）
          'radial-gradient(ellipse 15% 10% at 34% 26%, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0) 100%), ' +
          'radial-gradient(circle at 34% 28%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.32) 18%, rgba(255,255,255,0) 34%), ' +
          // 右下反光：同一光源打到背面的回弹
          'radial-gradient(ellipse 30% 18% at 68% 82%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%), ' +
          // 珠光体色：中心透、外圈染色、边缘亮
          `radial-gradient(circle at 42% 38%, ${c1} 0%, ${c2} 58%, ${rim} 86%, rgba(255,255,255,0.78) 99%)`,
        boxShadow: 'inset 0 0 40px rgba(255,255,255,0.5), inset -10px -16px 40px rgba(170,150,230,0.18), 0 0 30px rgba(255,255,255,0.22)',
      }} />
      {/* 薄膜虹彩环：conic 色环只留外缘环带 */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%', opacity: 0.42,
        background: `conic-gradient(from ${spec.hue + frame * 0.6}deg, #ffc4e6, #d4c2ff, #b8dcff, #bff3ec, #fff0c4, #ffc4e6)`,
        WebkitMaskImage: 'radial-gradient(circle, transparent 66%, #000 88%, transparent 100%)',
        maskImage: 'radial-gradient(circle, transparent 66%, #000 88%, transparent 100%)',
      }} />
    </div>
  );
};

export const BubbleSwarmTakeover: React.FC = () => {
  const frame = useCurrentFrame();
  // 页面"洗白"：靠近峰值时整体亮度提升
  const whiteout = interpolate(frame, [42, 68, 82, 104], [0, 0.92, 0.92, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: EASE.smooth,
  });
  // 单向推镜：旧场景缓推近（ease-in，越涨越快）→ 藏切 → 新场景从 1.05 软落回 1
  const pageScale = frame < PEAK
    ? mix(1, 1.035, ramp(frame, 0, PEAK, EASE.swift))
    : mix(1.05, 1, ramp(frame, PEAK, 50, EASE.out));
  return (
    <AbsoluteFill style={{ background: '#ececea', overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${pageScale.toFixed(4)})` }}>
        {frame < PEAK ? <FakeDashboard variant="A" /> : <FakeDashboard variant="B" />}
      </AbsoluteFill>
      {/* 洗白层压在页面之上、气泡之下：带一点珠光冷暖的白纱，不是平白 */}
      <AbsoluteFill style={{
        opacity: whiteout,
        background: 'radial-gradient(ellipse 80% 70% at 45% 40%, #ffffff 0%, #fbf9ff 60%, #f4f1fb 100%)',
      }} />
      {/* 远/中层气泡 */}
      {BUBBLES.filter((b) => b.z < 2).map((b, i) => (
        <Bubble key={i} spec={b} frame={frame} />
      ))}
      {/* i18n 文字胶囊混在中层气泡里漂 */}
      {CAPSULES.map((c, i) => {
        const host = BUBBLES[c.idx];
        const pIn = ramp(frame, host.t0 + 4, PEAK - host.t0 - 4, EASE.snappy);
        const disperse = ramp(frame, PEAK + 2, 116 - PEAK - 2, EASE.exit);
        const wob = Math.sin(frame * 0.08 + host.wobblePhase + 1.3) * 18;
        let x = mix(host.startX, host.targetX, pIn) + 60 + wob;
        let y = mix(host.startY, host.targetY, pIn) - host.r * 0.9;
        const dx = host.targetX - CX, dy = host.targetY - CY;
        const dl = Math.max(Math.hypot(dx, dy), 60);
        x += (dx / dl) * disperse * 1700;
        y += (dy / dl) * disperse * 1700;
        const op = Math.min(1, pIn * 1.6) * interpolate(disperse, [0.5, 1], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        // 胶囊弹出带一次轻过冲，挂在宿主上随漂 + 微转
        const sc = mix(0.5, 1, ramp(frame, host.t0 + 4, 26, EASE.overshoot));
        if (op <= 0.01) return null;
        return (
          <div key={i} style={{
            position: 'absolute', left: x, top: y, opacity: op,
            transform: `scale(${sc.toFixed(4)}) rotate(${(wob * 0.25).toFixed(2)}deg)`,
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '16px 34px 16px 18px', borderRadius: 60,
            background: 'linear-gradient(160deg, rgba(255,255,255,0.97), rgba(240,234,255,0.93))',
            border: hairline(0.07),
            boxShadow: `${innerHighlight(1)}, ${softShadow(22, { color: '#4a3a8c', strength: 0.9 })}`,
            fontFamily: FONT.sans, whiteSpace: 'nowrap',
          }}>
            <div style={{
              height: 40, padding: '0 12px', borderRadius: 20, display: 'flex', alignItems: 'center',
              background: 'rgba(91,79,170,0.1)', color: '#5b4fa8', fontFamily: FONT.mono, fontSize: 20, fontWeight: 600,
              letterSpacing: '0.04em',
            }}>{c.code}</div>
            <div style={{ fontSize: 46, fontWeight: 650, color: '#3d3470', letterSpacing: tracking(46), lineHeight: 1 }}>{c.text}</div>
          </div>
        );
      })}
      {/* 前景大气泡（焦外） */}
      {BUBBLES.filter((b) => b.z === 2).map((b, i) => (
        <Bubble key={i} spec={b} frame={frame} />
      ))}
      {/* 大面积珠光渐变防色带 */}
      <Grain opacity={0.045} />
    </AbsoluteFill>
  );
};
