// carousel-3d — 8 张卡排成圆环整环自转一圈：每卡只绕 Y 公转、自身 billboard 朝外，正反两层同向贴图 +
// backface-visibility:hidden 保证任何时刻都正立不倒置；相机全程钉在浅俯角，首尾帧无缝 loop。
//
// 第二轮重设计（酸柠 · 训练计划画廊）：
// - look = lime（石墨暗场 + 荧光黄绿）。卡片放大到 340×460 原生像素、环半径 700px，整环占画宽约 70%；
//   卡面是为镜头设计的"训练计划卡"：mono 编号、生成式图形（爬升剖面 / 间歇柱 / 心率波 / 圆环…）、
//   64px 大数字、30px 名称——转到正前方的那张被点亮（荧光描边 + 图形转荧光色 + 底光），其余保持石墨灰。
// - 节奏：不再是死匀速。转角 = 50% 匀速底 + 50% 分步（每 21f 一步 = 8f 停靠 + 13f smooth 换位），
//   整环永远在走（loop 稳态）但每 45° 有一次"推一把—停靠"的呼吸，正前方的卡在停靠时被读清；
//   8 步 × 21f = 168f 正好一圈，首尾帧逐像素可接。
// - 环下方大字幕随步进滚动换字（编号 + 72px 名称），相机固定不动（画廊而不是过山车）。
// - 空气透视：按方位角给卡面叠深色（最后方 70%）+ 地面反光盘 + 渐隐倒影环，环真正"落地"。
//
// 时间表（30fps，共 168f，可无缝循环）：
//   每 21f 一拍：0–8 停靠（正前方卡点亮、字幕定格）→ 8–21 换位（smooth，字幕上滚换字）；共 8 拍 = 360°
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, mix } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, type } from '../../_fixtures/Look';

export const CAROUSEL_3D_DURATION = 168; // 5600ms @30fps

const L = LOOKS.lime;
const N = 8;
const RADIUS = 700;
const CW = 340;
const CH = 460;
const RING_Y = 470; // 环中心高度
const FLOOR = CH / 2 + 10; // 卡脚下的地面（相对环中心）
const BEAT = 21; // 每步帧数 = 停靠 + 换位
const DWELL = 8;

type Kind = 'climb' | 'intervals' | 'pulse' | 'rings' | 'splits' | 'bars' | 'mobility' | 'race';
const CARDS: { name: string; stat: string; unit: string; meta: string; kind: Kind }[] = [
  { name: 'Tempo Run', stat: '8.0', unit: 'km', meta: '42 MIN · ZONE 3', kind: 'splits' },
  { name: 'Hill Repeats', stat: '6×', unit: '400 m', meta: '+320 M CLIMB', kind: 'climb' },
  { name: 'Recovery', stat: '30', unit: 'min', meta: 'ZONE 1 · EASY', kind: 'pulse' },
  { name: 'Long Run', stat: '21.1', unit: 'km', meta: 'SUNDAY · 1:52', kind: 'rings' },
  { name: 'Intervals', stat: '10×', unit: '1 min', meta: 'VO2 MAX · HARD', kind: 'intervals' },
  { name: 'Strength', stat: '45', unit: 'min', meta: 'LEGS · CORE', kind: 'bars' },
  { name: 'Mobility', stat: '15', unit: 'min', meta: 'HIPS · ANKLES', kind: 'mobility' },
  { name: 'Race Day', stat: '42.2', unit: 'km', meta: 'TARGET 3:15', kind: 'race' },
];

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const rand = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixHex = (a: string, b: string, t: number) => {
  const A = hex(a), B = hex(b), q = clamp01(t);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * q)).join(',')})`;
};

// 转角（0→1 圈）：50% 匀速 + 50% 分步（停靠 DWELL 帧 + smooth 换位）；f=168 恰为 1 圈
const stepPart = (f: number) => {
  const k = Math.floor(f / BEAT);
  const local = f - k * BEAT;
  return (k + EASE.smooth(clamp01((local - DWELL) / (BEAT - DWELL)))) / N;
};
const turnAt = (f: number) => 0.5 * (f / (N * BEAT)) + 0.5 * stepPart(f);

export const Carousel3D: React.FC = () => {
  const f = useCurrentFrame();
  const spin = turnAt(f) * 360;
  // 每张卡的世界方位角（0 = 正前方）
  const azimuth = (i: number) => ((((i * 360) / N - spin) % 360) + 540) % 360 - 180;
  const depthOf = (i: number) => (1 - Math.cos((azimuth(i) * Math.PI) / 180)) / 2;
  const hlOf = (i: number) => EASE.smooth(clamp01(1 - Math.abs(azimuth(i)) / 26));

  // 字幕：停靠时定格当前卡，换位时上滚到下一张
  const k = Math.floor(f / BEAT);
  const roll = EASE.smooth(clamp01((f - k * BEAT - DWELL) / (BEAT - DWELL)));

  const renderCard = (i: number, reflect: boolean) => {
    const d = depthOf(i);
    const hl = reflect ? 0 : hlOf(i);
    const face: React.CSSProperties = {
      position: 'absolute', inset: 0, borderRadius: 26, overflow: 'hidden', boxSizing: 'border-box',
      backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
      background: `linear-gradient(165deg, ${L.surface2} 0%, ${L.surface} 60%, #0f110d 100%)`,
      border: `1.5px solid ${hl > 0.01 ? alpha(L.accent, 0.25 + 0.6 * hl) : alpha('#ffffff', 0.1)}`,
      boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.1)}`,
      ...(reflect
        ? {
            // 透明度只能挂在叶子层：挂在 preserve-3d 容器上会把整环拍平
            opacity: 0.08,
            WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 62%, rgba(0,0,0,0.85) 100%)',
            maskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 62%, rgba(0,0,0,0.85) 100%)',
          }
        : {}),
    };
    const body = (
      <>
        <Face i={i} hl={hl} />
        {/* 空气透视：越靠后越暗（只叠一层带色相的深色，不改几何） */}
        <div style={{ position: 'absolute', inset: 0, background: L.bg[2], opacity: (0.7 * d).toFixed(3) }} />
      </>
    );
    return (
      <div key={i} style={{
        position: 'absolute', left: -CW / 2, top: -CH / 2, width: CW, height: CH, transformStyle: 'preserve-3d',
        // 卡只做环上定位（绕 Y 公转 + 沿法向推出半径），永不绕 X/Z——永远正立
        // 转到正前方的卡沿法向多推出 44px（只平移不旋转），停靠时读作"被选中"
        transform: `rotateY(${(i * 360) / N}deg) translateZ(${(RADIUS + 44 * hlOf(i)).toFixed(2)}px)`,
      }}>
        <div style={face}>{body}</div>
        <div style={{ ...face, transform: 'rotateY(180deg)' }}>{body}</div>
      </div>
    );
  };

  return (
    <AbsoluteFill style={{ background: L.bg[2] }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.16 }} fill={{ x: 0.5, y: 1.0 }} intensity={0.5} />

      {/* 正前方卡脚下的荧光底光（固定在画面上，不随环转） */}
      <div style={{
        position: 'absolute', left: 960 - 520, top: RING_Y + 120, width: 1040, height: 420, borderRadius: '50%',
        background: `radial-gradient(ellipse at 50% 40%, ${alpha(L.accent, 0.16)} 0%, ${alpha(L.accent, 0)} 65%)`,
      }} />

      {/* 3D 场景：perspective 2200px；相机固定浅俯角 */}
      <div style={{ position: 'absolute', inset: 0, perspective: '2200px', perspectiveOrigin: `50% ${RING_Y - 60}px` }}>
        <div style={{
          position: 'absolute', left: 960, top: RING_Y, width: 0, height: 0, transformStyle: 'preserve-3d',
          transform: `translateZ(${-RADIUS}px) rotateX(-9deg)`,
        }}>
          {/* 地面反光盘 + 刻度环 */}
          <div style={{
            position: 'absolute', left: -RADIUS * 1.35, top: FLOOR - RADIUS * 1.35, width: RADIUS * 2.7, height: RADIUS * 2.7, borderRadius: '50%',
            transform: 'rotateX(90deg)',
            background: `radial-gradient(circle, ${alpha(L.accent, 0.1)} 0%, ${alpha(L.accent, 0.03)} 45%, transparent 66%)`,
          }} />
          <svg width={RADIUS * 2.4} height={RADIUS * 2.4} viewBox={`${-RADIUS * 1.2} ${-RADIUS * 1.2} ${RADIUS * 2.4} ${RADIUS * 2.4}`}
            style={{ position: 'absolute', left: -RADIUS * 1.2, top: FLOOR - RADIUS * 1.2, transform: `rotateX(90deg) rotateZ(${spin}deg)`, overflow: 'visible' }}>
            <circle r={RADIUS * 1.08} fill="none" stroke={alpha('#ffffff', 0.08)} strokeWidth={2} />
            {Array.from({ length: 96 }, (_, t) => {
              const a = (t / 96) * Math.PI * 2;
              const r0 = RADIUS * (t % 12 === 0 ? 1.02 : 1.05);
              return <line key={t} x1={r0 * Math.cos(a)} y1={r0 * Math.sin(a)} x2={RADIUS * 1.08 * Math.cos(a)} y2={RADIUS * 1.08 * Math.sin(a)}
                stroke={t % 12 === 0 ? alpha(L.accent, 0.5) : alpha('#ffffff', 0.12)} strokeWidth={t % 12 === 0 ? 3 : 2} />;
            })}
          </svg>
          {/* 倒影环：以地面为镜面翻转 */}
          <div style={{ position: 'absolute', transformStyle: 'preserve-3d', transform: `translateY(${FLOOR * 2}px) scaleY(-1) rotateY(${-spin}deg)` }}>
            {Array.from({ length: N }, (_, i) => renderCard(i, true))}
          </div>
          {/* 圆环载体：唯一的逐帧变量 */}
          <div style={{ position: 'absolute', transformStyle: 'preserve-3d', transform: `rotateY(${-spin}deg)` }}>
            {Array.from({ length: N }, (_, i) => renderCard(i, false))}
          </div>
        </div>
      </div>

      {/* 字幕：编号 + 名称，随步进上滚换字（裁切窗） */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 862, height: 120, overflow: 'hidden' }}>
        {[0, 1].map((j) => {
          const c = (k + j) % N;
          const y = (j - roll) * 120;
          return (
            <div key={j} style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 34,
              transform: `translateY(${y.toFixed(2)}px)`, opacity: 1 - Math.abs(j - roll) * 0.9,
            }}>
              <span style={{ fontFamily: FONT.mono, fontSize: 26, letterSpacing: '0.14em', color: L.accent }}>{`0${c + 1} / 08`}</span>
              <span style={{ ...type(72, 750), color: L.ink }}>{CARDS[c].name}</span>
            </div>
          );
        })}
      </div>

      {/* 画框装饰 */}
      <div style={{ position: 'absolute', left: 120, top: 96, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 12, height: 12, borderRadius: 6, background: L.accent }} />
        <div style={{ fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.16em', color: L.ink2 }}>STRIDE · TRAINING PLANS</div>
      </div>
      <div style={{ position: 'absolute', right: 120, top: 96, fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.16em', color: L.ink3 }}>
        WEEK 12 OF 16
      </div>
    </AbsoluteFill>
  );
};

// ───────────── 卡面（340×460） ─────────────
const Face: React.FC<{ i: number; hl: number }> = ({ i, hl }) => {
  const c = CARDS[i];
  const g = mixHex('#6b7262', L.accent, hl); // 图形主色：石墨灰 → 荧光
  return (
    <div style={{ position: 'absolute', inset: 0, padding: 30 }}>
      {/* 卡顶受光 */}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(120% 55% at 30% 0%, ${alpha('#ffffff', 0.07)} 0%, transparent 60%)` }} />
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', fontFamily: FONT.mono, fontSize: 17, letterSpacing: '0.14em', color: L.ink3 }}>
        <span>{`PLAN ${String(i + 1).padStart(2, '0')}`}</span>
        <span style={{ color: hl > 0.5 ? L.accent : L.ink3 }}>●</span>
      </div>
      <div style={{ position: 'relative', marginTop: 22, height: 150 }}>
        <Graphic kind={c.kind} color={g} seed={i} />
      </div>
      <div style={{ position: 'relative', marginTop: 26, display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ ...type(72, 800), color: L.ink, letterSpacing: '-0.04em' }}>{c.stat}</span>
        <span style={{ ...type(28, 600), color: L.ink2 }}>{c.unit}</span>
      </div>
      <div style={{ position: 'relative', ...type(32, 650), color: L.ink, marginTop: 10 }}>{c.name}</div>
      <div style={{ position: 'absolute', left: 30, bottom: 28, fontFamily: FONT.mono, fontSize: 17, letterSpacing: '0.12em', color: L.ink3 }}>{c.meta}</div>
    </div>
  );
};

const Graphic: React.FC<{ kind: Kind; color: string; seed: number }> = ({ kind, color, seed }) => {
  const W = 280, H = 150;
  const dim = alpha('#ffffff', 0.1);
  switch (kind) {
    case 'climb': {
      const pts = Array.from({ length: 14 }, (_, k) => [k * (W / 13), 130 - (k % 4 < 2 ? k % 4 : 4 - (k % 4)) * 46 - rand(seed + k) * 10]);
      const d = pts.map((p, k) => `${k ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
      return (
        <svg width={W} height={H}>
          <path d={`${d} L${W},${H} L0,${H} Z`} fill={color} fillOpacity={0.16} />
          <path d={d} fill="none" stroke={color} strokeWidth={4} strokeLinejoin="round" />
        </svg>
      );
    }
    case 'intervals':
      return (
        <svg width={W} height={H}>
          {Array.from({ length: 10 }, (_, k) => (
            <g key={k}>
              <rect x={k * 28} y={20} width={14} height={130} rx={4} fill={color} />
              <rect x={k * 28 + 16} y={100} width={8} height={50} rx={3} fill={dim} />
            </g>
          ))}
        </svg>
      );
    case 'pulse': {
      const d = Array.from({ length: 57 }, (_, k) => {
        const x = k * 5;
        const beat = k % 14;
        const y = beat === 6 ? 20 : beat === 7 ? 130 : beat === 8 ? 60 : 84 + Math.sin(k * 0.7) * 4;
        return `${k ? 'L' : 'M'}${x},${y}`;
      }).join(' ');
      return <svg width={W} height={H}><path d={d} fill="none" stroke={color} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" /></svg>;
    }
    case 'rings':
      return (
        <svg width={W} height={H}>
          {[0.86, 0.62, 0.4].map((v, k) => {
            const r = 66 - k * 19;
            const C = 2 * Math.PI * r;
            return (
              <g key={k} transform="rotate(-90 75 75)">
                <circle cx={75} cy={75} r={r} fill="none" stroke={dim} strokeWidth={12} />
                <circle cx={75} cy={75} r={r} fill="none" stroke={color} strokeOpacity={1 - k * 0.3} strokeWidth={12} strokeLinecap="round" strokeDasharray={`${C * v} ${C}`} />
              </g>
            );
          })}
          <text x={168} y={70} fontFamily={FONT.mono} fontSize={18} fill={L.ink3} letterSpacing="0.1em">PACE</text>
          <text x={168} y={104} fontFamily={FONT.sans} fontSize={34} fontWeight={700} fill={L.ink}>5:18</text>
        </svg>
      );
    case 'splits':
      return (
        <svg width={W} height={H}>
          {Array.from({ length: 8 }, (_, k) => {
            const w = 150 + rand(seed * 7 + k) * 110;
            return <rect key={k} x={0} y={k * 19} width={w} height={11} rx={5.5} fill={k === 5 ? color : dim} />;
          })}
          <line x1={210} x2={210} y1={0} y2={150} stroke={color} strokeWidth={2} strokeDasharray="4 5" />
        </svg>
      );
    case 'bars':
      return (
        <svg width={W} height={H}>
          {Array.from({ length: 7 }, (_, k) => {
            const h = 40 + rand(seed * 11 + k) * 105;
            return <rect key={k} x={k * 40} y={150 - h} width={26} height={h} rx={6} fill={k === 4 ? color : dim} />;
          })}
        </svg>
      );
    case 'mobility':
      return (
        <svg width={W} height={H}>
          {[0, 1, 2].map((k) => (
            <path key={k} d={`M 0 ${40 + k * 36} C 70 ${10 + k * 36}, 140 ${80 + k * 36}, 280 ${30 + k * 36}`} fill="none" stroke={k === 1 ? color : dim} strokeWidth={k === 1 ? 5 : 4} strokeLinecap="round" />
          ))}
        </svg>
      );
    case 'race':
    default:
      return (
        <svg width={W} height={H}>
          <path d="M 10 120 C 60 20, 120 140, 170 60 S 250 30, 270 40" fill="none" stroke={dim} strokeWidth={10} strokeLinecap="round" />
          <path d="M 10 120 C 60 20, 120 140, 170 60" fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" />
          <circle cx={170} cy={60} r={12} fill={L.bg[2]} stroke={color} strokeWidth={5} />
          <circle cx={270} cy={40} r={8} fill={L.ink} />
        </svg>
      );
  }
};
