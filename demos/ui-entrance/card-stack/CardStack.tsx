// card-stack — Card Stack 3D 扇形展开（motion-lab 定稿转原生 Remotion）
// 8 张卡片从屏下 spring 弹入（stagger 3 帧），叠成一摞后呈扇形展开：每张
// (i-3.5)*8° 旋转 + 横移 + z 递退，形成 3D 扇面。入场动画与扇形终态偏移分层叠加。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
// 质感层（改版）：卡面换成出版级"模板卡"（图标 + 标题 + 迷你图表），同色系石墨面 + 发丝线 +
// 顶部高光 + 随飞行高度变化的两层阴影；入场带一点倾角跟随 + 竖向速度模糊；成摞时有确定性的
// 轻微错位（像一摞真牌），展开时理顺成扇面；展开同时相机缓慢拉远，扇面完整入画。
// 用 raster="zoom" 布局级放大，3D 层按目标分辨率栅格化，卡面小字不糊（Q2）。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { DesignStage, E, lerp, rand, seg } from '../../_fixtures/Motion';
import { Backdrop, EASE, FONT, Grain } from '../../_fixtures/Polish';

export const CARD_STACK_DURATION = 126; // 4200ms @30fps

const N = 8;
// 同色系（靛蓝→紫，色相只走 34°）：区分卡片但不再是彩虹色环
const HUES = [228, 233, 238, 243, 248, 253, 258, 262];

type Kind = 'bars' | 'line' | 'donut' | 'list' | 'kanban' | 'table' | 'calendar' | 'metric';
const CARDS: { title: string; sub: string; kind: Kind }[] = [
  { title: 'Weekly report', sub: '12 sections', kind: 'bars' },
  { title: 'Growth model', sub: 'Updated 2h ago', kind: 'line' },
  { title: 'Budget split', sub: '4 categories', kind: 'donut' },
  { title: 'Launch checklist', sub: '9 of 12 done', kind: 'list' },
  { title: 'Sprint board', sub: '3 columns', kind: 'kanban' },
  { title: 'Customer CRM', sub: '2,418 rows', kind: 'table' },
  { title: 'Content plan', sub: 'October', kind: 'calendar' },
  { title: 'Revenue', sub: 'This quarter', kind: 'metric' },
];

// 入场位移（设计 px）：spring 自 300 抬到 0
const yAt = (t: number, i: number) => {
  const inT = seg(t, 0.02 + i * 0.033, 0.02 + i * 0.033 + 0.3);
  return lerp(E.spring(inT, 0.3), 300, 0);
};

export const CardStack: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const tOf = (f: number) => Math.min(1, Math.max(0, f / Math.max(1, durationInFrames - 1)));
  const t = tOf(frame);
  // 扇形：全员落位后一次性展开（静态终态偏移 × 展开进度）
  const fan = seg(t, 0.55, 0.8, E.inOutCubic);
  // 相机：展开同段缓慢拉远 1 → 0.8，并略微下移，让扇面完整落在安全区
  const cam = seg(t, 0.5, 0.86, EASE.smooth);
  const camS = lerp(cam, 1, 0.8);
  const camY = lerp(cam, 0, 12);

  return (
    <AbsoluteFill>
      <Backdrop tone="dark" light={{ x: 0.5, y: 0.3 }} accent="#6a72e6" grain={0} vignette={0.6} />
      <DesignStage bg="transparent" raster="zoom">
        {/* 地面接触暗影：成摞时集中、展开后随扇面变宽 */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: lerp(fan, 150, 330) * camS,
            height: 26 * camS,
            transform: `translate(-50%, ${lerp(fan, 70, 80) + camY}px)`,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 70%)',
            opacity: seg(t, 0.08, 0.3, EASE.out),
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `translateY(${camY}px) scale(${camS})`,
            transformOrigin: '50% 50%',
          }}
        >
          {/* 3D 场景容器：perspective 900px 供卡片 translateZ 递退产生纵深 */}
          <div style={{ position: 'absolute', inset: 0, perspective: '900px' }}>
            {Array.from({ length: N }, (_, i) => {
              const hue = HUES[i];
              // 入场：屏下 spring 弹入，stagger 3 帧（0.033/张）
              const inT = seg(t, 0.02 + i * 0.033, 0.02 + i * 0.033 + 0.3);
              const y = yAt(t, i);
              // 竖向速度（设计 px/帧）→ 只在快速段生效的竖向模糊
              const vy = yAt(tOf(frame + 0.5), i) - yAt(tOf(frame - 0.5), i);
              const blurY = Math.min(5, Math.abs(vy) * 0.16);
              const k = i - (N - 1) / 2;
              // 成摞错位：确定性 ±2.4° / ±3px，像一摞随手码齐的牌；展开时理顺
              const jitR = (rand(i * 3 + 1) - 0.5) * 4.8;
              const jitX = (rand(i * 5 + 2) - 0.5) * 6;
              // 入场倾角跟随：起飞时带 ±7° 交替倾角，随 spring 落位收敛到成摞错位
              const tilt = (i % 2 ? 1 : -1) * 7 * (y / 300);
              const rot = lerp(fan, jitR + tilt, k * 8);
              const tx = lerp(fan, jitX, k * 34);
              const tz = -10 * Math.abs(k) * fan;
              // 飞行高度（用于阴影）：越接近起点越"高"
              const lift = 6 + (y / 300) * 30;
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: 110,
                    height: 150,
                    // 原采集页为 content-box：1px 边框外扩，卡片实占 112×152
                    boxSizing: 'content-box',
                    margin: '-85px 0 0 -55px',
                    borderRadius: 12,
                    overflow: 'hidden',
                    transformOrigin: '50% 130%',
                    background: `linear-gradient(170deg, hsl(${hue},16%,19%) 0%, hsl(${hue},18%,13%) 100%)`,
                    border: `1px solid hsla(${hue},40%,82%,0.11)`,
                    boxShadow:
                      `inset 0 1px 0 rgba(255,255,255,0.07), 0 ${(1 + lift * 0.05).toFixed(1)}px ${(2 + lift * 0.12).toFixed(1)}px rgba(0,0,0,0.45), ` +
                      `0 ${(lift * 0.5).toFixed(1)}px ${(lift * 1.2).toFixed(1)}px ${(-lift * 0.2).toFixed(1)}px rgba(0,0,0,0.62)`,
                    transform: `translate3d(${tx}px,${y}px,${tz}px) rotate(${rot}deg)`,
                    opacity: Math.min(1, inT * 4),
                    zIndex: 20 - Math.abs(k * 2),
                    filter: blurY > 0.3 ? `url(#cs-vblur-${i})` : undefined,
                    fontFamily: FONT.sans,
                  }}
                >
                  {blurY > 0.3 && (
                    <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
                      <filter id={`cs-vblur-${i}`} x="-10%" y="-30%" width="120%" height="160%">
                        <feGaussianBlur stdDeviation={`0 ${blurY.toFixed(2)}`} />
                      </filter>
                    </svg>
                  )}
                  <CardFace i={i} hue={hue} />
                </div>
              );
            })}
          </div>
        </div>
      </DesignStage>
      <Grain opacity={0.07} blend="soft-light" />
    </AbsoluteFill>
  );
};

// ——— 卡面：模板卡（头部图标 + 标题 + 副标题 + 迷你可视化） ———
const CardFace: React.FC<{ i: number; hue: number }> = ({ i, hue }) => {
  const c = CARDS[i];
  const acc = `hsl(${hue},72%,72%)`;
  const accSoft = `hsla(${hue},70%,70%,0.16)`;
  const ink1 = 'rgba(240,242,250,0.94)';
  const ink3 = 'rgba(200,204,220,0.48)';
  const line = 'rgba(255,255,255,0.07)';
  return (
    <div style={{ position: 'absolute', inset: 0, padding: 10, display: 'flex', flexDirection: 'column' }}>
      {/* 卡顶受光：极淡的径向高光 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(120% 60% at 30% 0%, hsla(${hue},60%,75%,0.10) 0%, rgba(0,0,0,0) 60%)`,
        }}
      />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: 4.5,
            background: accSoft,
            border: `0.5px solid hsla(${hue},70%,75%,0.25)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: i % 2 ? 1.5 : 3, background: acc }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0 }}>
          <div style={{ fontSize: 8.2, fontWeight: 650, color: ink1, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{c.title}</div>
          <div style={{ fontSize: 5.6, fontWeight: 500, color: ink3, letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>{c.sub}</div>
        </div>
      </div>
      <div style={{ position: 'relative', height: 0.5, background: line, margin: '9px -10px 0' }} />
      <div style={{ position: 'relative', flex: 1, marginTop: 9 }}>
        <Viz kind={c.kind} acc={acc} accSoft={accSoft} ink1={ink1} ink3={ink3} line={line} seed={i} />
      </div>
    </div>
  );
};

const Viz: React.FC<{ kind: Kind; acc: string; accSoft: string; ink1: string; ink3: string; line: string; seed: number }> = ({
  kind, acc, accSoft, ink1, ink3, line, seed,
}) => {
  const W = 90, H = 98;
  const bar = (w: number, o = 0.16) => ({ height: 3.2, width: w, borderRadius: 2, background: `rgba(220,224,240,${o})` });
  switch (kind) {
    case 'bars':
      return (
        <svg width={W} height={H}>
          {[0, 1, 2, 3].map((r) => (
            <line key={r} x1={0} x2={W} y1={12 + r * 22} y2={12 + r * 22} stroke={line} strokeWidth={0.5} />
          ))}
          {Array.from({ length: 7 }, (_, k) => {
            const h = 18 + rand(seed * 11 + k) * 50;
            return <rect key={k} x={4 + k * 12.4} y={78 - h} width={7} height={h} rx={1.6} fill={k === 5 ? acc : 'rgba(220,224,240,0.18)'} />;
          })}
          <text x={0} y={94} fontSize={5.4} fill={ink3} fontFamily={FONT.sans}>Mon — Sun</text>
        </svg>
      );
    case 'line': {
      const pts = Array.from({ length: 9 }, (_, k) => [k * 11.25, 64 - k * 4.5 - rand(seed * 7 + k) * 14]);
      const d = pts.map((p, k) => `${k ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
      return (
        <svg width={W} height={H}>
          <text x={0} y={10} fontSize={13} fontWeight={700} fill={ink1} fontFamily={FONT.sans} letterSpacing="-0.02em">+38.2%</text>
          <path d={`${d} L90,80 L0,80 Z`} fill={accSoft} />
          <path d={d} fill="none" stroke={acc} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" />
          <line x1={0} x2={W} y1={80.5} y2={80.5} stroke={line} strokeWidth={0.5} />
          <text x={0} y={94} fontSize={5.4} fill={ink3} fontFamily={FONT.sans}>Trailing 12 weeks</text>
        </svg>
      );
    }
    case 'donut': {
      const segs = [0.42, 0.26, 0.2, 0.12];
      let a0 = -Math.PI / 2;
      const R = 24, cx = 30, cy = 40;
      return (
        <svg width={W} height={H}>
          {segs.map((p, k) => {
            const a1 = a0 + p * Math.PI * 2 - 0.06;
            const path = `M${cx + R * Math.cos(a0)},${cy + R * Math.sin(a0)} A${R},${R} 0 ${p > 0.5 ? 1 : 0} 1 ${cx + R * Math.cos(a1)},${cy + R * Math.sin(a1)}`;
            a0 += p * Math.PI * 2;
            return <path key={k} d={path} fill="none" stroke={k === 0 ? acc : `rgba(220,224,240,${0.32 - k * 0.07})`} strokeWidth={7} />;
          })}
          {['Ops', 'R&D', 'GTM', 'G&A'].map((l, k) => (
            <g key={l}>
              <rect x={64} y={24 + k * 10} width={4} height={4} rx={1} fill={k === 0 ? acc : `rgba(220,224,240,${0.32 - k * 0.07})`} />
              <text x={71} y={28 + k * 10} fontSize={5.4} fill={ink3} fontFamily={FONT.sans}>{l}</text>
            </g>
          ))}
          <text x={0} y={94} fontSize={5.4} fill={ink3} fontFamily={FONT.sans}>FY24 allocation</text>
        </svg>
      );
    }
    case 'list':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8.5 }}>
          {[1, 1, 1, 0, 0].map((done, k) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2.5,
                  flex: 'none',
                  background: done ? acc : 'transparent',
                  border: done ? 'none' : '0.75px solid rgba(220,224,240,0.3)',
                }}
              />
              <div style={bar(30 + rand(seed + k * 3) * 40, done ? 0.13 : 0.22)} />
            </div>
          ))}
        </div>
      );
    case 'kanban':
      return (
        <div style={{ display: 'flex', gap: 5 }}>
          {[4, 3, 3].map((n, col) => (
            <div key={col} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ ...bar(14, 0.3), height: 2.6 }} />
              {Array.from({ length: n }, (_, r) => (
                <div
                  key={r}
                  style={{
                    height: 17,
                    borderRadius: 3,
                    background: col === 1 && r === 0 ? accSoft : 'rgba(255,255,255,0.04)',
                    border: `0.5px solid ${col === 1 && r === 0 ? 'transparent' : line}`,
                    padding: 3.5,
                  }}
                >
                  <div style={{ ...bar(12 + rand(seed + col * 5 + r) * 10, 0.22), height: 2.4 }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    case 'table':
      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {Array.from({ length: 6 }, (_, r) => (
            <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 5, height: 13, borderBottom: `0.5px solid ${line}` }}>
              <div style={{ width: 7, height: 7, borderRadius: 4, background: r === 1 ? acc : 'rgba(220,224,240,0.18)' }} />
              <div style={bar(26 + rand(seed * 3 + r) * 18, r === 0 ? 0.3 : 0.16)} />
              <div style={{ flex: 1 }} />
              <div style={bar(12, 0.12)} />
            </div>
          ))}
        </div>
      );
    case 'calendar':
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
          {Array.from({ length: 28 }, (_, k) => {
            const on = rand(seed * 13 + k) > 0.62;
            return (
              <div
                key={k}
                style={{
                  aspectRatio: '1',
                  borderRadius: 2.5,
                  background: k === 17 ? acc : on ? accSoft : 'rgba(255,255,255,0.04)',
                }}
              />
            );
          })}
        </div>
      );
    case 'metric':
    default:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: ink1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>$1.28M</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 5.6, fontWeight: 600, color: acc, padding: '1.5px 4px', borderRadius: 6, background: accSoft }}>+12.4%</div>
            <div style={{ fontSize: 5.6, color: ink3 }}>vs last quarter</div>
          </div>
          <svg width={W} height={40} style={{ marginTop: 10 }}>
            <path
              d={Array.from({ length: 12 }, (_, k) => `${k ? 'L' : 'M'}${(k * 8.2).toFixed(1)},${(32 - k * 1.8 - rand(k + 40) * 9).toFixed(1)}`).join(' ')}
              fill="none"
              stroke={acc}
              strokeWidth={1.3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      );
  }
};
