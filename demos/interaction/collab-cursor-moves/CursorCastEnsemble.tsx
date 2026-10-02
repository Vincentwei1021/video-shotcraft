// cursor-cast-ensemble —— figma 0:05 (cursor-badge-cast) + miro 全片 cursor-ensemble-ambience
// 5 枚具名彩色光标从画外飞入（弹簧减速+名牌淡入），落位后在灰阶画布上持续漂移、
// 指向、聚拢；灰阶便签当环境道具；其中一枚(Rita)在便签上实时打字补全一行文本
// （pitch collaborator-cameo 的打字戏并入）。
// 改版：五人五色（颜色=身份，不再两蓝两绿）；便签换成低饱和的真实便签内容，中央卡片做成
// "Customer feedback" 引用卡；Rita 打字时手是稳的（漂移压到 15%）、光标停在句尾；
// 聚拢位改到卡片四周，任何光标都不压正在打的那行字；光标/名牌加投影，柔光画布底。
import React from 'react';
import { useCurrentFrame, spring, interpolate } from 'remotion';
import { G } from '../../_fixtures/Fixtures';
import { Backdrop, FONT, softShadow, tracking } from '../../_fixtures/Polish';

export const CURSOR_CAST_ENSEMBLE_DURATION = 140;

const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const FPS = 30;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

type Actor = {
  name: string; color: string;
  from: [number, number]; home: [number, number];
  delay: number; phase: number;
};

// 名牌颜色 = 身份编码：五人五色，全片不变
const ACTORS: Actor[] = [
  { name: 'Lisa', color: '#3D7FF2', from: [-160, 200], home: [430, 330], delay: 0, phase: 0.0 },
  { name: 'Lucas', color: '#22A866', from: [2080, 160], home: [1370, 290], delay: 5, phase: 1.7 },
  { name: 'Marta', color: '#EA8A3A', from: [-160, 900], home: [560, 760], delay: 9, phase: 3.1 },
  { name: 'Niko', color: '#8A63E8', from: [2080, 950], home: [1420, 780], delay: 13, phase: 4.4 },
  { name: 'Rita', color: '#E5508F', from: [900, -180], home: [1120, 572], delay: 17, phase: 5.6 },
];
const RITA = 4;

const TYPED = 'Our customers love it';
const TYPE_START = 58;
const TYPE_END = 118;

// 聚拢位：围在中央卡片四周（卡片 660–1260 × 420–660，打字行 y≈490–550），不压正文
const GATHER: [number, number][] = [
  [512, 296], [1268, 336], [600, 640], [952, 672], [1150, 568],
];

const NOTES = [
  { x: 250, y: 170, bg: '#f3eedb', title: 'Interview notes', body: '3 of 5 users found setup too long' },
  { x: 1490, y: 140, bg: '#e2ebee', title: 'Q3 bets', body: 'Templates · Search v2 · Sharing' },
  { x: 210, y: 700, bg: '#ebe5ee', title: 'Pricing ideas', body: 'Default to the annual toggle?' },
  { x: 1530, y: 690, bg: '#e4ece2', title: 'Launch', body: 'Mon 14 · beta list ready' },
];

const CursorActor: React.FC<{ x: number; y: number; a: Actor; badge: number; scale?: number }> = ({
  x, y, a, badge, scale = 2.1,
}) => (
  <div style={{ position: 'absolute', left: x, top: y, transform: `scale(${scale})`, transformOrigin: '0 0', zIndex: 10 }}>
    <svg width={30} height={44} viewBox="0 0 13.5 20" style={{ display: 'block', overflow: 'visible', filter: 'drop-shadow(0 1px 1.2px rgba(16,18,24,0.28))' }}>
      <path d="M0.5 0.5 L0.5 17.2 L4.7 13.4 L7.3 19.5 L10 18.3 L7.4 12.3 L13 12.3 Z"
        fill={a.color} stroke="#ffffff" strokeWidth={1.1} strokeLinejoin="round" />
    </svg>
    <div style={{
      position: 'absolute', left: 22, top: 38, whiteSpace: 'nowrap',
      background: a.color, color: '#fff', borderRadius: 7, padding: '3.5px 9px 4px',
      fontFamily: FONT.sans, fontWeight: 650, fontSize: 13.5, letterSpacing: '0.005em',
      boxShadow: `inset 0 0.5px 0 rgba(255,255,255,0.3), 0 1px 2px rgba(16,18,24,0.16), 0 3px 8px -2px ${a.color}88`,
      opacity: badge, transform: `translateY(${(1 - badge) * 10 / scale}px)`,
    }}>
      {a.name}
    </div>
  </div>
);

export const CursorCastEnsemble: React.FC = () => {
  const f = useCurrentFrame();
  const rnd = mulberry32(88);
  // 便签的固定随机旋转
  const noteRots = Array.from({ length: 4 }).map(() => (rnd() - 0.5) * 8);

  // 聚拢时刻：92 帧后所有光标向中央卡片四周聚拢
  const gatherT = easeInOut(clamp01((f - 92) / 26));

  // 打字进度（Rita 落位后开始，58–118 帧）
  const typedCount = Math.floor(interpolate(f, [TYPE_START, TYPE_END], [0, TYPED.length], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  }));
  const caretOn = Math.floor(f / 8) % 2 === 0;
  // 打字时手是稳的：Rita 的漂移在打字窗口内压到 15%
  const typing = clamp01((f - (TYPE_START - 8)) / 8) * (1 - clamp01((f - TYPE_END) / 10));

  return (
    <div style={{ width: 1920, height: 1080, background: G.bg, position: 'relative', overflow: 'hidden', fontFamily: FONT.sans }}>
      <Backdrop tone="light" light={{ x: 0.5, y: 0.42 }} grain={0.04} />
      {/* 点阵无限画布底（中心清晰、边缘隐去） */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(rgba(20,22,28,0.12) 1.7px, transparent 1.9px)',
        backgroundSize: '46px 46px',
        WebkitMaskImage: 'radial-gradient(ellipse 72% 72% at 50% 50%, #000 40%, transparent 100%)',
        maskImage: 'radial-gradient(ellipse 72% 72% at 50% 50%, #000 40%, transparent 100%)',
      }} />
      {/* 低饱和便签环境道具（读得出是便签，但不抢戏） */}
      {NOTES.map((n, i) => (
        <div key={i} style={{
          position: 'absolute', left: n.x, top: n.y, width: 230, height: 210,
          background: `linear-gradient(180deg, ${n.bg}, ${n.bg} 70%, rgba(0,0,0,0.015))`, borderRadius: 6,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.55), 0 1px 2px rgba(16,18,24,0.08), 0 10px 22px -10px rgba(16,18,24,0.22)`,
          transform: `rotate(${noteRots[i]}deg)`,
          padding: '20px 20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div style={{ fontSize: 21, fontWeight: 680, color: 'rgba(23,24,28,0.72)', letterSpacing: tracking(21) }}>{n.title}</div>
          <div style={{ fontSize: 18, lineHeight: 1.35, color: 'rgba(23,24,28,0.5)', letterSpacing: tracking(18) }}>{n.body}</div>
        </div>
      ))}
      {/* 中央引用卡：Rita 打字的舞台 */}
      <div style={{
        position: 'absolute', left: 660, top: 420, width: 600, height: 240,
        background: 'linear-gradient(180deg, #ffffff, #fcfcfb)', border: `1px solid ${G.hairline}`, borderRadius: 16,
        boxShadow: `inset 0 1px 0 #fff, ${softShadow(14)}`, padding: '26px 32px', boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
            <path d="M4 11.5c0-3 1.6-5.2 4.3-6.3l.6 1.2C7.3 7.2 6.5 8.4 6.4 9.6H8.6V15H4v-3.5zm7.4 0c0-3 1.6-5.2 4.3-6.3l.6 1.2c-1.6.8-2.4 2-2.5 3.2H16V15h-4.6v-3.5z" fill={G.ink3} />
          </svg>
          <span style={{ fontSize: 18, fontWeight: 600, color: G.ink2, letterSpacing: tracking(18) }}>Customer feedback</span>
          <span style={{ marginLeft: 'auto', fontSize: 15, color: G.ink3 }}>Interview · Mar 12</span>
        </div>
        <div style={{
          fontWeight: 680, fontSize: 46, color: G.ink1, letterSpacing: tracking(46), minHeight: 58, whiteSpace: 'nowrap',
        }}>
          {TYPED.slice(0, typedCount)}
          <span style={{
            display: 'inline-block', width: 3.5, height: 46, background: ACTORS[RITA].color, borderRadius: 2,
            marginLeft: 3, verticalAlign: 'middle',
            opacity: f > 50 && typedCount < TYPED.length ? (caretOn ? 1 : 0.15) : 0,
          }} />
        </div>
      </div>

      {/* 五枚光标 */}
      {ACTORS.map((a, i) => {
        const s = spring({ frame: f - a.delay, fps: FPS, config: { damping: 15, stiffness: 90, mass: 0.9 } });
        let x = interpolate(s, [0, 1], [a.from[0], a.home[0]]);
        let y = interpolate(s, [0, 1], [a.from[1], a.home[1]]);
        // 落位后持续漂移（双频正弦，每枚相位不同）
        const settled = clamp01((f - a.delay - 26) / 10);
        const hand = i === RITA ? 1 - 0.85 * typing : 1;
        const driftX = (Math.sin(f * 0.055 + a.phase) * 46 + Math.sin(f * 0.021 + a.phase * 2) * 30) * hand;
        const driftY = (Math.cos(f * 0.047 + a.phase * 1.3) * 38 + Math.cos(f * 0.017 + a.phase) * 24) * hand;
        x += driftX * settled * (1 - gatherT * 0.55);
        y += driftY * settled * (1 - gatherT * 0.55);
        // 聚拢（漂移保留 25%，不归零）
        x = interpolate(gatherT, [0, 1], [x, GATHER[i][0] + driftX * 0.25]);
        y = interpolate(gatherT, [0, 1], [y, GATHER[i][1] + driftY * 0.25]);
        const badge = clamp01((f - a.delay - 12) / 12);
        return <CursorActor key={a.name} x={x} y={y} a={a} badge={badge} />;
      })}
    </div>
  );
};
