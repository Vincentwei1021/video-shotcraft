// cycle-glass-node-morph — 单主体缩入机制图，循环标签随后被上升的玻璃节点接管。
// 运动顺序：上下文主体 → 对角擦除 → 循环箭头与标签 → 连续推近 → 节点托起 → 诊断标记。
//
// 质感升级（节拍帧号全部不变）：开场从"灰底 + CONTEXT/SUBJECT 字块"换成夜景上下文——深色天幕 + 地平光 +
// 深色玻璃 HUD 条（单元状态/路线/ETA）+ 原创产品插画主体（外轮廓沿用原多边形，石墨渐变车身、玻璃舱、
// 强调色腰线、传感器、前灯、轮毂）；对角擦除改为遮罩揭走夜景层并带一条极细亮边；机制场是浅色柔光底 +
// 表盘质感内容圆；主体最终落在弧线下方两节点之间（宽 140），不再压住 SENSE/ACT 节点；玻璃节点换成深色
// 烟熏玻璃（径向体 + 内高光/内暗 + 高光椭圆 + 随升起收紧的两层投影）并加图标；诊断标记换成强调色圆角三角。
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { DesignStage, E, lerp } from '../../_fixtures/Motion';
import { FONT, Grain } from '../../_fixtures/Polish';

export const CYCLE_GLASS_NODE_MORPH_DURATION = 257;

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const frameSeg = (frame: number, start: number, end: number, ease: (t: number) => number = E.linear) =>
  ease(Math.min(1, Math.max(0, (frame - start) / Math.max(1, end - start))));

// Monotone cubic Hermite interpolation keeps the recorded camera key states while
// sharing one non-zero velocity at each interior keyframe. This avoids the visible
// stop/restart that three separately eased interpolate() calls would introduce.
const smoothCamera = (frame: number, values: readonly number[]) => {
  const frames = [176, 180, 190, 198] as const;
  if (frame <= frames[0]) return values[0];
  if (frame >= frames[frames.length - 1]) return values[values.length - 1];

  const widths = frames.slice(1).map((value, index) => value - frames[index]);
  const secants = widths.map((width, index) => (values[index + 1] - values[index]) / width);
  const tangents = [secants[0]];
  for (let index = 1; index < values.length - 1; index++) {
    const before = secants[index - 1];
    const after = secants[index];
    if (before * after <= 0) {
      tangents.push(0);
      continue;
    }
    const beforeWidth = widths[index - 1];
    const afterWidth = widths[index];
    const w1 = 2 * afterWidth + beforeWidth;
    const w2 = afterWidth + 2 * beforeWidth;
    tangents.push((w1 + w2) / (w1 / before + w2 / after));
  }
  tangents.push(secants[secants.length - 1]);

  const segment = frame <= frames[1] ? 0 : frame <= frames[2] ? 1 : 2;
  const width = widths[segment];
  const t = (frame - frames[segment]) / width;
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return (
    h00 * values[segment] +
    h10 * width * tangents[segment] +
    h01 * values[segment + 1] +
    h11 * width * tangents[segment + 1]
  );
};

const quadraticPoint = (
  from: readonly [number, number],
  control: readonly [number, number],
  to: readonly [number, number],
  t: number,
) => {
  const oneMinus = 1 - t;
  const x = oneMinus * oneMinus * from[0] + 2 * oneMinus * t * control[0] + t * t * to[0];
  const y = oneMinus * oneMinus * from[1] + 2 * oneMinus * t * control[1] + t * t * to[1];
  const dx = 2 * (oneMinus * (control[0] - from[0]) + t * (to[0] - control[0]));
  const dy = 2 * (oneMinus * (control[1] - from[1]) + t * (to[1] - control[1]));
  return { x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
};

const cycleLabelOpacity = (frame: number, start: number) => {
  const local = frame - start;
  if (local < 0) return 0;
  if (local === 0 || local === 3) return 1;
  if (local === 1 || local === 2) return 0;
  if (local === 4 || local === 6) return 0.42;
  return 1;
};

// —— 质感常量 ——
const INK1 = '#17181c';
const INK2 = '#5d5f66';
const ACCENT = '#5b63d3';

// 节点图标（12×12 视框，白色描边）：感知=眼 / 推理=星芒 / 执行=箭
const NodeIcon: React.FC<{ kind: 'SENSE' | 'MODEL' | 'ACT' }> = ({ kind }) => (
  <svg width={11} height={11} viewBox="0 0 12 12" style={{ display: 'block' }}>
    {kind === 'SENSE' && (
      <>
        <path d="M1 6 C2.8 2.8 9.2 2.8 11 6 C9.2 9.2 2.8 9.2 1 6 Z" fill="none" stroke="#fff" strokeWidth={1.1} strokeLinejoin="round" />
        <circle cx={6} cy={6} r={1.7} fill="#fff" />
      </>
    )}
    {kind === 'MODEL' && (
      <path
        d="M6 1 C6.4 4.2 7.8 5.6 11 6 C7.8 6.4 6.4 7.8 6 11 C5.6 7.8 4.2 6.4 1 6 C4.2 5.6 5.6 4.2 6 1 Z"
        fill="#fff"
      />
    )}
    {kind === 'ACT' && (
      <path d="M2 6 H9.5 M6.6 3 L9.6 6 L6.6 9" fill="none" stroke="#fff" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
    )}
  </svg>
);

// 玻璃节点：深色烟熏玻璃（径向渐变体 + 顶部内高光 + 底部内暗 + 边缘发丝光 + 两层投影 + 顶部高光椭圆）
const GlassNode: React.FC<{
  frame: number;
  start: number;
  end: number;
  left: number;
  top: number;
  label: 'SENSE' | 'MODEL' | 'ACT';
}> = ({ frame, start, end, left, top, label }) => {
  const k = frameSeg(frame, start, end, E.outBack);
  const opacity = frameSeg(frame, start, start + 2, E.outQuad);
  // 落定后阴影收紧：上升途中离地高、影子大而虚
  const lift = 1 - frameSeg(frame, start + 2, end + 4, E.outCubic);
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width: 64,
        height: 64,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 34% 26%, rgba(118,124,146,0.96) 0%, rgba(58,61,74,0.96) 46%, rgba(26,27,34,0.97) 100%)',
        border: '0.6px solid rgba(255,255,255,0.32)',
        boxShadow:
          'inset 0 0.8px 0.6px rgba(255,255,255,0.55), inset 0 -7px 12px rgba(0,0,0,0.28), ' +
          `0 ${(1.2 + lift * 3).toFixed(2)}px ${(2.5 + lift * 4).toFixed(2)}px rgba(16,18,26,${(0.2 - lift * 0.08).toFixed(3)}), ` +
          `0 ${(10 + lift * 10).toFixed(2)}px ${(22 + lift * 14).toFixed(2)}px -6px rgba(16,18,26,${(0.34 - lift * 0.1).toFixed(3)})`,
        backdropFilter: 'blur(10px)',
        opacity,
        transform: `translate(-50%, ${lerp(k, 86, -32)}px) scale(${lerp(k, 0.82, 1)})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        overflow: 'hidden',
        color: '#fff',
        fontFamily: FONT.sans,
        fontSize: 7.6,
        fontWeight: 650,
        letterSpacing: '0.08em',
      }}
    >
      {/* 顶部高光椭圆（静态，裁在圆内） */}
      <div
        style={{
          position: 'absolute',
          left: 12,
          right: 12,
          top: 3,
          height: 22,
          borderRadius: '50%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.26), rgba(255,255,255,0))',
        }}
      />
      <NodeIcon kind={label} />
      <div style={{ position: 'relative', lineHeight: 1 }}>{label}</div>
    </div>
  );
};

// 诊断标记：SVG 圆角三角，强调色 + 柔光底
const Marker: React.FC<{ frame: number; start: number; end: number; left: number; top: number; rotate: number }> = ({
  frame,
  start,
  end,
  left,
  top,
  rotate,
}) => {
  const k = frameSeg(frame, start, end, E.outBack);
  return (
    <svg
      width={10}
      height={9}
      viewBox="0 0 10 9"
      style={{
        position: 'absolute',
        left: left - 1,
        top: top - 1,
        overflow: 'visible',
        opacity: Math.min(1, k * 2),
        transform: `translateY(${lerp(k, -12, 0)}px) rotate(${lerp(k, rotate - 22, rotate)}deg) scale(${lerp(k, 0.72, 1)})`,
        filter: 'drop-shadow(0 1px 2px rgba(91,99,211,0.35))',
      }}
    >
      <path d="M1.2 1.2 L8.8 1.2 L5 7.8 Z" fill={ACCENT} stroke={ACCENT} strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  );
};

// 主体：通用"自主运行单元"产品插画（原创几何，不含任何车辆品牌形状）——外轮廓沿用原多边形，
// 加石墨渐变车身、玻璃舱带反光、肩线高光、强调色腰线、顶部传感器、前灯与两枚轮毂
const Subject: React.FC<{ night: number }> = ({ night }) => (
  <>
    <defs>
      <linearGradient id="cgBody" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#4b4f5c" />
        <stop offset="0.45" stopColor="#30333d" />
        <stop offset="1" stopColor="#1b1c22" />
      </linearGradient>
      <linearGradient id="cgGlass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#a9b6d6" />
        <stop offset="0.55" stopColor="#4b5570" />
        <stop offset="1" stopColor="#262b3a" />
      </linearGradient>
      <radialGradient id="cgLamp" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#fff6dc" stopOpacity={0.9} />
        <stop offset="1" stopColor="#fff6dc" stopOpacity={0} />
      </radialGradient>
    </defs>
    {/* 前灯光晕（夜景时明显，进入浅色机制场后收弱） */}
    <ellipse cx={336} cy={70} rx={46} ry={22} fill="url(#cgLamp)" opacity={0.25 + 0.55 * night} />
    {/* 车身：原多边形外轮廓，底边开两个轮拱 */}
    <path d="M0 47 L56 27 L96 0 L236 0 L276 27 L332 47 L332 122 L292 122 A34 34 0 0 0 224 122 L108 122 A34 34 0 0 0 40 122 L0 122 Z" fill="url(#cgBody)" />
    {/* 玻璃舱带 + 斜向反光 */}
    <polygon points="102,9 230,9 262,33 70,33" fill="url(#cgGlass)" />
    <polygon points="150,9 176,9 150,33 124,33" fill="#ffffff" opacity={0.16} />
    {/* 肩线高光 / 顶缘高光 */}
    <path d="M0 47.5 L56 27.5 L96 0.6 L236 0.6 L276 27.5 L332 47.5" fill="none" stroke="#ffffff" strokeOpacity={0.22} strokeWidth={1.2} />
    {/* 强调色腰线 */}
    <rect x={14} y={78} width={304} height={2.4} rx={1.2} fill={ACCENT} opacity={0.9} />
    {/* 顶部传感器 */}
    <rect x={150} y={-9} width={32} height={9} rx={3} fill="#2a2c34" />
    <rect x={156} y={-6.5} width={20} height={3} rx={1.5} fill="#8f96f0" />
    {/* 前灯条 */}
    <rect x={318} y={56} width={13} height={6} rx={3} fill="#fff3d0" />
    {/* 轮毂 */}
    {[74, 258].map((cx) => (
      <g key={cx}>
        <circle cx={cx} cy={126} r={27} fill="#101115" />
        <circle cx={cx} cy={126} r={19} fill="#1a1b20" stroke="#464a56" strokeWidth={1.5} />
        <circle cx={cx} cy={126} r={8} fill="#62667a" />
        <circle cx={cx} cy={126} r={2.6} fill="#2a2c33" />
      </g>
    ))}
  </>
);

export const CycleGlassNodeMorph: React.FC = () => {
  const frame = useCurrentFrame();
  const wipe = frameSeg(frame, 66, 90, E.inOutCubic);
  const vehicle = frameSeg(frame, 62, 94, E.inOutCubic);
  const disk = frameSeg(frame, 66, 110, E.outCubic);
  const title = frameSeg(frame, 84, 90, E.outCubic);
  const arrows = frameSeg(frame, 127, 176, E.inOutCubic);
  const camScale = smoothCamera(frame, [0.61, 0.659, 0.935, 1]);
  const camX = smoothCamera(frame, [6, 5.5, 1, 0]);
  const camY = smoothCamera(frame, [-51, -44, -9, 0]);
  const topArrow = quadraticPoint([68, 98], [185, 4], [302, 98], arrows);
  const bottomArrow = quadraticPoint([302, 100], [185, 190], [68, 100], arrows);
  const wipeStop = interpolate(wipe, [0, 1], [-40, 140], CLAMP);
  const night = 1 - frameSeg(frame, 70, 96, E.inOutCubic); // 夜景灯光随擦除熄弱

  const labelData = [
    { label: 'SENSE', left: 147, top: 92, start: 124 },
    { label: 'MODEL', left: 240, top: 63, start: 129 },
    { label: 'ACT', left: 333, top: 92, start: 134 },
  ];

  // 主体几何：宽 332→140、中心 y 169→186（落在弧线下方、两侧节点之间，不与节点相叠）
  const subjW = interpolate(vehicle, [0, 1], [332, 140], CLAMP);
  const subjH = (subjW * 134) / 332;
  const subjY = interpolate(vehicle, [0, 1], [169, 186], CLAMP);
  // 擦除层遮罩：夜景只保留擦除线右下侧
  const mask = `linear-gradient(135deg, transparent 0%, transparent ${wipeStop}%, #000 ${wipeStop + 0.2}%, #000 100%)`;

  return (
    <AbsoluteFill style={{ background: '#f3f3f0' }}>
      <DesignStage bg="#f3f3f0" raster="zoom">
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            isolation: 'isolate',
            fontFamily: FONT.sans,
          }}
        >
          {/* 机制场：浅色柔光底 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(70% 80% at 50% 38%, #fbfbf9 0%, #f1f1ee 55%, #e6e6e2 100%)',
            }}
          />

          {/* 背景内容圆：表盘质感（径向渐变 + 发丝外环 + 两圈虚线刻度环） */}
          <div
            style={{
              position: 'absolute',
              left: 240,
              top: 143,
              width: 218,
              height: 218,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 50% 38%, #f4f4f1 0%, #e3e3df 70%, #d9d9d4 100%)',
              boxShadow:
                'inset 0 0 0 0.5px rgba(20,22,28,0.10), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -10px 24px rgba(20,22,28,0.05), 0 12px 30px -14px rgba(20,22,28,0.22)',
              opacity: disk,
              transform: `translate(-50%,-50%) scale(${lerp(disk, 0.3, 1)})`,
              transformOrigin: '50% 50%',
              zIndex: 2,
            }}
          >
            <svg viewBox="0 0 218 218" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              <circle cx={109} cy={109} r={88} fill="none" stroke="rgba(20,22,28,0.08)" strokeWidth={0.5} strokeDasharray="1.5 3" />
              <circle cx={109} cy={109} r={64} fill="none" stroke="rgba(20,22,28,0.06)" strokeWidth={0.5} />
            </svg>
          </div>

          {/* 主体接触影（跟着主体缩入） */}
          <div
            style={{
              position: 'absolute',
              left: 240,
              top: subjY + subjH / 2 + subjH * 0.13, // 轮底（viewBox y≈153）
              width: subjW * 1.04,
              height: subjH * 0.22,
              transform: 'translate(-50%,-50%)',
              borderRadius: '50%',
              background: 'radial-gradient(closest-side, rgba(10,11,16,0.38), rgba(10,11,16,0))',
              zIndex: 6,
            }}
          />

          {/* 夜景上下文层：被对角擦除线揭走（同一主体在它之上，不做双主体叠化） */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 5,
              WebkitMaskImage: mask,
              maskImage: mask,
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, #1b1e27 0%, #14161d 58%, #0e0f14 100%)',
              }}
            />
            {/* 地平光 + 地面 */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 190,
                height: 90,
                background: 'radial-gradient(60% 50% at 50% 50%, rgba(120,132,190,0.20), rgba(120,132,190,0) 100%)',
              }}
            />
            <div style={{ position: 'absolute', left: 0, right: 0, top: 254.5, height: 0.6, background: 'rgba(255,255,255,0.10)' }} />
            {[0, 1, 2, 3, 4, 5, 6].map((k) => (
              <div
                key={k}
                style={{ position: 'absolute', left: 20 + k * 68, top: 262, width: 30, height: 1.2, borderRadius: 1, background: 'rgba(255,255,255,0.12)' }}
              />
            ))}
            {/* 上下文条：深色玻璃 HUD（单元状态 / 路线 / ETA） */}
            <div
              style={{
                position: 'absolute',
                left: 36,
                right: 36,
                top: 13,
                height: 47,
                borderRadius: 12,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))',
                border: '0.5px solid rgba(255,255,255,0.12)',
                boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.12), 0 8px 20px -8px rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                gap: 12,
                whiteSpace: 'nowrap',
                color: '#eef0f6',
                opacity: 1 - wipe,
              }}
            >
              <div style={{ width: 6, height: 6, flex: 'none', borderRadius: 3, background: '#34d399', boxShadow: '0 0 0 2px rgba(52,211,153,0.2)' }} />
              <div style={{ fontSize: 12, fontWeight: 650, letterSpacing: '-0.01em' }}>Unit 07</div>
              <div style={{ fontSize: 9.5, fontWeight: 500, color: '#9aa0b2' }}>Autonomous · Live run</div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, fontSize: 9.5, fontWeight: 500, color: '#9aa0b2' }}>
                <span>
                  Route <b style={{ color: '#eef0f6', fontWeight: 650 }}>14</b>
                </span>
                <span>
                  <b style={{ color: '#eef0f6', fontWeight: 650, fontVariantNumeric: 'tabular-nums' }}>2.4 km</b> to depot
                </span>
                <span>
                  ETA <b style={{ color: '#eef0f6', fontWeight: 650, fontVariantNumeric: 'tabular-nums' }}>6 min</b>
                </span>
              </div>
            </div>
          </div>
          {/* 擦除前沿：一条极细的亮边，让硬边擦除读作"翻页"而不是色块交界 */}
          {wipe > 0 && wipe < 1 && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 5,
                background: `linear-gradient(135deg, rgba(255,255,255,0) ${wipeStop - 0.5}%, rgba(255,255,255,0.85) ${wipeStop + 0.1}%, rgba(255,255,255,0) ${wipeStop + 0.7}%)`,
              }}
            />
          )}

          {/* 机制标题：发丝线胶囊 */}
          <div
            style={{
              position: 'absolute',
              left: 240,
              top: 112,
              padding: '3.5px 9px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.72)',
              border: '0.5px solid rgba(20,22,28,0.10)',
              boxShadow: 'inset 0 0.5px 0 #fff, 0 2px 6px -2px rgba(20,22,28,0.12)',
              opacity: title * (1 - frameSeg(frame, 176, 192, E.outQuad)),
              transform: `translate(-50%, ${lerp(title, 8, 0)}px)`,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              color: INK2,
              fontSize: 7.5,
              fontWeight: 650,
              letterSpacing: '0.14em',
              whiteSpace: 'nowrap',
              zIndex: 4,
            }}
          >
            <span style={{ width: 4, height: 4, borderRadius: 2, background: ACCENT }} />
            SYSTEM LOOP
          </div>

          <svg
            viewBox="0 0 332 134"
            style={{
              position: 'absolute',
              left: 240,
              top: subjY,
              width: subjW,
              height: subjH,
              transform: 'translate(-50%, -50%)',
              zIndex: 7,
              overflow: 'visible',
            }}
          >
            <Subject night={night} />
          </svg>

          <div
            style={{
              position: 'absolute',
              left: 240,
              top: 151,
              width: 370,
              height: 226,
              transform: `translate(-50%,-50%) translate(${camX}px,${camY}px) scale(${camScale})`,
              transformOrigin: '50% 50%',
              zIndex: 6,
            }}
          >
            <svg viewBox="0 0 370 226" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
              <path
                d="M68 98 Q185 4 302 98"
                fill="none"
                stroke={INK2}
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeDasharray="300"
                strokeDashoffset={300 * (1 - arrows)}
              />
              <path
                d="M302 100 Q185 190 68 100"
                fill="none"
                stroke={INK2}
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeDasharray="300"
                strokeDashoffset={300 * (1 - arrows)}
              />
              {[topArrow, bottomArrow].map((a, k) => (
                <path
                  key={k}
                  d="M-7 -4 L1 0 L-7 4 Z"
                  fill={INK2}
                  stroke={INK2}
                  strokeWidth={1}
                  strokeLinejoin="round"
                  opacity={frameSeg(arrows, 0.02, 0.08, E.outQuad)}
                  transform={`translate(${a.x} ${a.y}) rotate(${a.angle})`}
                />
              ))}
            </svg>

            {labelData.map((item, i) => {
              const opacity = cycleLabelOpacity(frame, item.start);
              const drift = frameSeg(frame, item.start, 160, E.outCubic);
              const nodeTarget = frameSeg(frame, 176, 198, E.inOutCubic);
              const nodeTakeover = frameSeg(frame, 184 + i * 8, 192 + i * 8, E.outCubic);
              return (
                <div
                  key={item.label}
                  style={{
                    position: 'absolute',
                    left: item.left - 55 + (i - 1) * lerp(drift, 8, 0),
                    top: item.top,
                    width: 110,
                    textAlign: 'center',
                    color: INK1,
                    fontSize: 10,
                    fontWeight: 650,
                    letterSpacing: '0.08em',
                    opacity: opacity * (1 - nodeTakeover),
                    transform: `translateY(${lerp(nodeTarget, 0, -4)}px)`,
                  }}
                >
                  {item.label}
                </div>
              );
            })}

            <GlassNode frame={frame} start={184} end={192} left={92} top={98} label="SENSE" />
            <GlassNode frame={frame} start={192} end={200} left={185} top={69} label="MODEL" />
            <GlassNode frame={frame} start={200} end={208} left={278} top={98} label="ACT" />

            <Marker frame={frame} start={208} end={214} left={48} top={119} rotate={-90} />
            <Marker frame={frame} start={213} end={218} left={181} top={30} rotate={0} />
            <Marker frame={frame} start={217} end={222} left={314} top={119} rotate={90} />
          </div>
        </div>
      </DesignStage>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};
