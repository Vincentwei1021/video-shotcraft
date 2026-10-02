// ring-diagram-annotation-reveal — 全屏主体收束成同心环图解，再左移让出注释栏。
// 保留原 motion-blocking 的圆窗收缩、分段外环、向心箭头、旋转、错峰标签与收尾 hold。
// 设计坐标 480×270（DesignStage raster='zoom'，字形与细线按目标尺寸光栅化）。
//
// 质感升级：灰阶占位（SUBJECT / CONTENT / 1234 / EXPLANATION）换成一套能读懂的内容——
// "反馈回路"图解：全屏开场是带点阵与柔光的深色内容场 + 强调色主体核（Model），圆窗收束后
// 外环 = 24 段数据源刻度环（SVG 等分 dash 替代 7px CSS dashed 粗边），12 支向心箭头 = 实时信号，
// 箭头绕环顺时针错峰长出、箭头头随线端推进；右栏四块标题拼出 L·O·O·P，强调色注释条以裁切
// 自左揭出（不再 scaleX 压扁文字），二级说明两行落入；右栏三段左对齐到同一竖线。
// 背景换柔光亮场 + 颗粒，细线统一 0.25–0.5 设计 px（成片 1–2px）。
import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { DesignStage } from '../../_fixtures/Motion';
import { Backdrop, FONT, Grain } from '../../_fixtures/Polish';
import { G } from '../../_fixtures/Fixtures';

export const RING_DIAGRAM_ANNOTATION_REVEAL_DURATION = 190;

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const p = (frame: number, start: number, end: number) =>
  interpolate(frame, [start, Math.max(start + 1, end)], [0, 1], {
    ...CLAMP,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

const ACCENT = G.accent; // #5b63d3 安静的靛蓝
const FIELD = '#161822'; // 内容场深色（带冷色相）
const INK = '#2a2c35';
const COL_X = 304; // 右栏统一左对齐线

const TILE_LETTERS = ['L', 'O', 'O', 'P'];
const TILE_SHADES = ['#262833', '#33364a', '#454a70', ACCENT];

const TitleBlock: React.FC<{ frame: number; start: number; shade: string; ch: string }> = ({ frame, start, shade, ch }) => {
  const k = p(frame, start, start + 8);
  // 揭出瞬间的一层浅色残影：比本体先到位、随后上漂淡出
  const echo = interpolate(frame, [start - 1, start, start + 2, start + 8], [0, 0.28, 0.28, 0], CLAMP);
  return (
    <div style={{ position: 'relative', width: 26, height: 34 }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 3,
          background: '#c9ccd6',
          opacity: echo,
          transform: `translateY(${interpolate(k, [0, 1], [8, -4])}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 3,
          background: `linear-gradient(180deg, ${shade} 0%, ${shade} 60%, rgba(0,0,0,0.12) 100%), ${shade}`,
          boxShadow: 'inset 0 0.25px 0 rgba(255,255,255,0.22), 0 1.5px 4px -1px rgba(16,18,26,0.28)',
          opacity: k,
          clipPath: `inset(${interpolate(k, [0, 1], [100, 0])}% 0 0 0 round 3px)`,
          transform: `translateY(${interpolate(k, [0, 1], [9, 0])}px)`,
          display: 'grid',
          placeItems: 'center',
          color: '#f7f7fb',
          fontSize: 17,
          fontWeight: 760,
          letterSpacing: '-0.02em',
        }}
      >
        {ch}
      </div>
    </div>
  );
};

export const RingDiagramAnnotationReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const aperture = p(frame, 11, 50);
  const ringIn = p(frame, 18, 60);
  const coilsIn = p(frame, 30, 50);
  const layout = p(frame, 90, 134);
  const label = p(frame, 114, 160);
  const definition = p(frame, 137, 143);
  const centerX = interpolate(layout, [0, 1], [240, 154]);
  const scale = interpolate(layout, [0, 1], [1, 0.84]);
  const rotate = interpolate(frame, [29, 187], [0, 44.2], CLAMP); // 外环匀速机械转（仅外环）
  const apertureRadius = interpolate(aperture, [0, 1], [540, 61]);
  // 内容场柔光：开场亮、收束后降一档
  const fieldGlow = interpolate(aperture, [0, 1], [1, 0.55]);

  // 12 支向心箭头：f35–50 内绕环顺时针错峰（每支 9f，间隔 0.55f），头随线端推进
  const arrows = Array.from({ length: 12 }, (_, i) => {
    const a = ((-90 + i * 30) * Math.PI) / 180;
    const k = p(frame, 35 + i * 0.55, 44 + i * 0.55);
    const outer = 97;
    const inner = 72;
    const r2 = interpolate(k, [0, 1], [outer, inner]);
    return {
      k,
      x1: 110 + Math.cos(a) * outer,
      y1: 110 + Math.sin(a) * outer,
      x2: 110 + Math.cos(a) * r2,
      y2: 110 + Math.sin(a) * r2,
    };
  });

  // 分段外环：r=98.5、24 段等分，dash 占 58%
  const SEG_R = 98.5;
  const SEG_C = 2 * Math.PI * SEG_R;
  const seg = SEG_C / 24;

  return (
    <AbsoluteFill style={{ background: '#f2f2f0' }}>
      <Backdrop tone="light" light={{ x: 0.42, y: 0.2 }} accent={ACCENT} vignette={0.15} grain={0} />
      <DesignStage bg="transparent" raster="zoom">
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', fontFamily: FONT.sans }}>
          {/* 内容场：深色 + 点阵 + 主体柔光，被圆窗收束 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                `radial-gradient(circle at ${centerX}px 123px, rgba(91,99,211,${(0.42 * fieldGlow).toFixed(3)}) 0px, rgba(91,99,211,0) 120px), ` +
                `radial-gradient(rgba(255,255,255,0.16) 0.35px, transparent 0.6px) 0 0 / 6px 6px, ${FIELD}`,
              clipPath: `circle(${apertureRadius * scale}px at ${centerX}px 123px)`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: centerX,
              top: 123,
              width: 220,
              height: 220,
              transform: `translate(-50%,-50%) scale(${scale})`,
              transformOrigin: '50% 50%',
            }}
          >
            {/* 细环：比圆窗晚起晚收，第二层深度 */}
            <div
              style={{
                position: 'absolute',
                left: 36,
                top: 36,
                width: 148,
                height: 148,
                borderRadius: '50%',
                border: '0.5px solid #8b8e99',
                boxSizing: 'border-box',
                opacity: ringIn,
                transform: `scale(${interpolate(ringIn, [0, 1], [3.8, 1])})`,
              }}
            />
            {/* 分段外环（仅此层旋转） */}
            <svg
              viewBox="0 0 220 220"
              style={{
                position: 'absolute',
                inset: 0,
                width: 220,
                height: 220,
                overflow: 'visible',
                opacity: coilsIn,
                transform: `rotate(${rotate}deg) scale(${interpolate(coilsIn, [0, 1], [1.08, 1])})`,
              }}
            >
              <circle cx={110} cy={110} r={SEG_R + 4.5} fill="none" stroke="rgba(20,22,28,0.12)" strokeWidth={0.25} />
              <circle cx={110} cy={110} r={SEG_R - 4.5} fill="none" stroke="rgba(20,22,28,0.12)" strokeWidth={0.25} />
              <circle
                cx={110}
                cy={110}
                r={SEG_R}
                fill="none"
                stroke="#b9bcc7"
                strokeWidth={6}
                strokeDasharray={`${(seg * 0.58).toFixed(3)} ${(seg * 0.42).toFixed(3)}`}
              />
              {/* 每 6 段一枚强调色段：数据源分区的读数锚点 */}
              <circle
                cx={110}
                cy={110}
                r={SEG_R}
                fill="none"
                stroke={ACCENT}
                strokeWidth={6}
                strokeDasharray={`${(seg * 0.58).toFixed(3)} ${(seg * 5.42).toFixed(3)}`}
              />
            </svg>
            {/* 向心箭头（不随外环转） */}
            <svg viewBox="0 0 220 220" style={{ position: 'absolute', inset: 0, width: 220, height: 220, overflow: 'visible' }}>
              {arrows.map(({ k, x1, y1, x2, y2 }, i) => {
                if (k <= 0.001) return null;
                const ang = Math.atan2(y2 - y1, x2 - x1);
                const hx = (s: number, o: number) => x2 + Math.cos(ang) * s - Math.sin(ang) * o;
                const hy = (s: number, o: number) => y2 + Math.sin(ang) * s + Math.cos(ang) * o;
                return (
                  <g key={i} opacity={Math.min(1, k * 3)}>
                    <line x1={x1} y1={y1} x2={hx(-2.6, 0)} y2={hy(-2.6, 0)} stroke={INK} strokeWidth={0.6} strokeLinecap="round" />
                    <path
                      d={`M${hx(0.6, 0)},${hy(0.6, 0)} L${hx(-3.4, -1.9)},${hy(-3.4, -1.9)} L${hx(-2.6, 0)},${hy(-2.6, 0)} L${hx(-3.4, 1.9)},${hy(-3.4, 1.9)} Z`}
                      fill={INK}
                    />
                    <circle cx={x1} cy={y1} r={0.9} fill={INK} />
                  </g>
                );
              })}
            </svg>
            {/* 内盘：上下文层 */}
            <div
              style={{
                position: 'absolute',
                left: 57,
                top: 57,
                width: 106,
                height: 106,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 50% 38%, #2a2d3d 0%, #1d1f2b 70%)',
                border: '0.25px solid rgba(255,255,255,0.12)',
                boxSizing: 'border-box',
                boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.08)',
                display: 'grid',
                placeItems: 'start center',
                paddingTop: 12,
                color: '#9ea3b8',
                fontSize: 7.5,
                fontWeight: 650,
                letterSpacing: '0.12em',
              }}
            >
              CONTEXT
            </div>
            {/* 主体核 */}
            <div
              style={{
                position: 'absolute',
                left: 79,
                top: 79,
                width: 62,
                height: 62,
                borderRadius: '50%',
                background: `radial-gradient(circle at 50% 30%, #8b92f0 0%, ${ACCENT} 55%, #4148b0 100%)`,
                boxShadow: `inset 0 0.5px 0 rgba(255,255,255,0.35), 0 0 18px rgba(91,99,211,0.55)`,
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '-0.01em',
              }}
            >
              Model
            </div>
          </div>

          {/* 右栏：四块标题 */}
          <div style={{ position: 'absolute', left: COL_X, top: 80, display: 'flex', gap: 2 }}>
            {TILE_SHADES.map((shade, i) => (
              <TitleBlock key={i} frame={frame} start={112 + i * 3} shade={shade} ch={TILE_LETTERS[i]} />
            ))}
          </div>
          {/* 宽注释条：自左裁切揭出 */}
          <div
            style={{
              position: 'absolute',
              left: COL_X,
              top: 122,
              height: 17,
              padding: '0 8px',
              borderRadius: 3,
              background: ACCENT,
              boxShadow: 'inset 0 0.25px 0 rgba(255,255,255,0.3)',
              clipPath: `inset(0 ${((1 - label) * 100).toFixed(2)}% 0 0 round 3px)`,
              display: 'flex',
              alignItems: 'center',
              color: '#ffffff',
              fontSize: 9,
              fontWeight: 650,
              letterSpacing: '-0.005em',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ opacity: interpolate(label, [0.35, 0.8], [0, 1], CLAMP) }}>Continuous feedback loop</span>
          </div>
          {/* 二级说明 */}
          <div
            style={{
              position: 'absolute',
              left: COL_X,
              top: 147,
              width: 140,
              opacity: definition,
              transform: `translateY(${interpolate(definition, [0, 1], [5, 0])}px)`,
              color: G.ink2,
              fontSize: 8,
              lineHeight: '11px',
              fontWeight: 500,
            }}
          >
            12 live signals retrain
            <br />
            the core model every hour.
          </div>
        </div>
      </DesignStage>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};
