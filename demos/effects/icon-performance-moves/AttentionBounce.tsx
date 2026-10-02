// 求关注弹跳（attention-bounce）——macOS Dock 语汇：icon 原地起跳讨拍
// 半屏 app 图标（圆角方块+铃形符号）在地面上连跳 4 次且一次比一次高
// （首跳 0.5 倍 icon 高 → 末跳 1.2 倍）；每次落地帧压扁（宽 1.2x 高 0.8x）
// + 落点尘点 2–3 颗；最高那跳镜头整体向 icon 轻推 8%（"被吸引"）；
// 落定后 icon 右侧弹开一张功能面板卡收尾。
// 节拍：0–12 静置 → 12 起跳（4 跳递增，各 16/18/20/24f）→ 96 落定（角标同帧弹出）→
// 98–110 面板卡弹出 → 110 后真静止 40f。帧确定，尘点用 sin 散列。
//
// 质感升级：图标从"白底黑描边线稿"换成出版级 app icon（琥珀渐变 squircle + 顶部高光 + 白色铃铛
// 字形 + 两层软阴影）；铃铛在空中做跟随摆动（随跳高递增、落地后阻尼收敛），落地挤压改为阻尼回弹
// （压扁→轻微回拉→稳住）；8px 灰色地面条换成柔和的地台渐变 + 两层接触阴影（近地小而实、远地大而虚，
// 随离地高度缩放变淡）；尘点换成柔焦烟团；镜头推近用 smooth 缓动；面板卡换成"新功能"的出版级
// 通知面板（标题、三条通知、开关），落地同帧图标右上弹出红色角标；全程柔光底 + 颗粒。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { Backdrop, EASE, FONT, Grain, hairline, innerHighlight, softShadow } from '../../_fixtures/Polish';

export const ATTENTION_BOUNCE_DURATION = 150; // 5s：4 跳 → 落定 → 面板 → 静止 40f

const ICON = 400; // icon 边长（半屏级）
const GROUND = 940; // 地面线 y（末跳 1.2x 顶点 + 8% 推近后仍贴画面上沿不出框）
const CX = 760; // icon 中心 x（右侧留面板位）
const AMBER = ['#fcc53a', '#f59e0b', '#dd7a06']; // icon 渐变（顶亮→底深）

// 4 跳：起跳帧、时长、峰高（相对 icon 高）
const JUMPS = [
  { start: 12, dur: 16, peak: 0.5 * ICON },
  { start: 30, dur: 18, peak: 0.75 * ICON },
  { start: 50, dur: 20, peak: 0.95 * ICON },
  { start: 72, dur: 24, peak: 1.2 * ICON },
];
const LAND_FINAL = JUMPS[3].start + JUMPS[3].dur; // 96

const NOTES = [
  { t: 'Deploy finished', s: 'web-app · 2m ago', c: '#22a06b' },
  { t: 'Review requested', s: 'PR #482 · 5m ago', c: '#5b63d3' },
  { t: 'Usage at 80%', s: 'Billing · 1h ago', c: '#f59e0b' },
];

export const AttentionBounce: React.FC = () => {
  const f = useCurrentFrame();

  // 弹跳高度 + 落地挤压
  let y = 0; // 离地高度
  let squash = 0; // 落地压扁强度（可为负 = 回拉）
  let stretch = 0; // 空中拉伸强度（速度感）
  let swing = 0; // 铃铛摆角（度）
  JUMPS.forEach((j, ji) => {
    const t = (f - j.start) / j.dur;
    if (t > 0 && t < 1) {
      y = j.peak * 4 * t * (1 - t); // 抛物线
      stretch = Math.abs(1 - 2 * t) * 0.14; // 起跳/下落速度快时拉长
      // 铃铛跟随摆动：空中一个来回，幅度随跳高递增（8°→16°）
      swing = Math.sin(t * Math.PI * 2) * (8 + ji * 2.7);
    }
    // 落地帧后 8f：压扁 → 轻回拉 → 稳住（阻尼余弦），替代线性回弹
    const land = j.start + j.dur;
    const k = f - land;
    if (k >= 0 && k < 8) {
      squash = Math.exp(-k * 0.45) * Math.cos(k * 0.75);
    }
  });
  // 起跳前的预压（第一跳前 3f 蹲一下）
  if (f >= 9 && f < 12) squash = Math.max(squash, ((f - 9) / 3) * 0.7);
  // 落定后铃铛余摆：阻尼收敛
  if (f >= LAND_FINAL) {
    const k = f - LAND_FINAL;
    swing = Math.exp(-k * 0.16) * Math.sin(k * 0.62) * 12;
  }

  const sx = 1 + squash * 0.2 - stretch * 0.5;
  const sy = 1 - squash * 0.2 + stretch;

  // 镜头推近：第 4 跳（最高）期间整体 scale 1→1.08，落定后保持（smooth，起止无速度突变）
  const zoom = 1 + 0.08 * EASE.smooth(interpolate(f, [72, 90], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));

  // 尘点：每次落地帧生成 3 团，向两侧飞散、膨胀、淡出（14f 生命）
  const dusts: Array<{ x: number; y: number; r: number; op: number }> = [];
  JUMPS.forEach((j, ji) => {
    const land = j.start + j.dur;
    const life = (f - land) / 14;
    if (life <= 0 || life >= 1) return;
    for (let k = 0; k < 3; k++) {
      const seed = ji * 3 + k;
      const dir = k === 1 ? 0 : k === 0 ? -1 : 1;
      const spread = (60 + 40 * Math.abs(Math.sin(seed * 5.7))) * (ji + 2) * 0.45;
      const e = Easing.out(Easing.cubic)(life);
      dusts.push({
        x: CX + dir * (ICON * 0.42 + spread * e) + (dir === 0 ? 30 * Math.sin(seed * 3.1) * e : 0),
        y: GROUND - 10 - 40 * e * (0.6 + 0.5 * Math.abs(Math.sin(seed * 2.3))),
        r: (14 + 6 * Math.abs(Math.sin(seed * 4.9))) * (0.8 + 1.1 * e) * (dir === 0 ? 0.7 : 1),
        op: (1 - life) * (1 - life) * (0.5 + ji * 0.08),
      });
    }
  });

  // 角标：最后一跳落地同帧弹出（back 过冲）
  const badgeT = interpolate(f, [LAND_FINAL, LAND_FINAL + 8], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(2.4)),
  });
  // 功能面板卡：落定后（f=98）从 icon 右侧弹出；内部行错峰 2f 跟随
  const panelT = interpolate(f, [98, 110], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.8)),
  });
  const rowT = (i: number) => interpolate(f, [102 + i * 3, 114 + i * 3], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const iconTop = GROUND - ICON - y;
  const lift = y / (ICON * 1.2); // 0 贴地 → 1 最高点

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', background: '#ecece9' }}>
      <Backdrop tone="light" light={{ x: 0.4, y: 0.12 }} grain={0} vignette={0.12} />
      {/* 镜头层：整体向 icon 轻推 */}
      <div style={{
        position: 'absolute', inset: 0, transform: `scale(${zoom})`, transformOrigin: `${CX}px ${GROUND - ICON / 2}px`,
      }}>
        {/* 地台：地面线以下一层极淡的冷灰渐变 + 一道柔和的地平线高光 */}
        <div style={{
          position: 'absolute', left: -200, right: -200, top: GROUND, height: 400,
          background: 'linear-gradient(180deg, rgba(20,22,28,0.028) 0%, rgba(20,22,28,0.012) 45%, rgba(20,22,28,0) 100%)',
        }} />
        <div style={{
          position: 'absolute', left: 120, width: 1680, top: GROUND - 0.5, height: 1,
          background: 'linear-gradient(90deg, rgba(20,22,28,0) 0%, rgba(20,22,28,0.10) 25%, rgba(20,22,28,0.10) 75%, rgba(20,22,28,0) 100%)',
        }} />

        {/* 落地烟团：柔焦圆，膨胀淡出 */}
        {dusts.map((d, i) => (
          <div key={i} style={{
            position: 'absolute', left: d.x - d.r, top: d.y - d.r, width: d.r * 2, height: d.r * 2, borderRadius: d.r,
            background: 'radial-gradient(circle, rgba(150,145,135,0.55) 0%, rgba(150,145,135,0.25) 45%, rgba(150,145,135,0) 72%)',
            opacity: d.op,
          }} />
        ))}

        {/* 接触阴影两层：近地小而实（随高度迅速变淡）+ 远地大而虚（随高度变大变淡） */}
        <div style={{
          position: 'absolute', left: CX - ICON * 0.4 * (1 - lift * 0.45) * sx, width: ICON * 0.8 * (1 - lift * 0.45) * sx,
          top: GROUND - 8, height: 22, borderRadius: '50%', background: 'rgba(30,24,10,0.30)', filter: 'blur(7px)',
          opacity: Math.max(0, 1 - lift * 1.6),
        }} />
        <div style={{
          position: 'absolute', left: CX - ICON * 0.5 * (1 - lift * 0.2), width: ICON * (1 - lift * 0.2),
          top: GROUND - 14, height: 44, borderRadius: '50%', background: 'rgba(30,24,10,0.16)', filter: 'blur(18px)',
          opacity: 1 - lift * 0.65,
        }} />

        {/* app icon：琥珀渐变 squircle + 白色铃铛字形 */}
        <div style={{
          position: 'absolute', left: CX - ICON / 2, top: iconTop, width: ICON, height: ICON,
          transform: `scale(${sx}, ${sy})`, transformOrigin: '50% 100%',
        }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 92, overflow: 'hidden',
            background: `linear-gradient(170deg, ${AMBER[0]} 0%, ${AMBER[1]} 52%, ${AMBER[2]} 100%)`,
            boxShadow: `${innerHighlight(0.55)}, inset 0 -6px 14px rgba(150,60,0,0.22), ${softShadow(10 + lift * 30, { color: '#3a2200', strength: 1.3 })}`,
          }}>
            {/* 顶部玻璃高光（主光左上） */}
            <div style={{
              position: 'absolute', left: -40, top: -120, width: ICON + 80, height: 300, borderRadius: '50%',
              background: 'radial-gradient(ellipse at 40% 60%, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0) 65%)',
            }} />
          </div>
          <svg width={ICON} height={ICON} viewBox="0 0 420 420" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
            <defs>
              <filter id="ab-glyph" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#8a3d00" floodOpacity="0.35" />
              </filter>
            </defs>
            {/* 铃铛绕顶部挂点摆动（跟随动作） */}
            <g transform={`rotate(${swing.toFixed(2)} 210 104)`} filter="url(#ab-glyph)">
              <path
                d="M 210 104 C 158 104 140 150 138 196 C 136 242 120 266 102 284 L 318 284 C 300 266 284 242 282 196 C 280 150 262 104 210 104 Z"
                fill="#ffffff"
              />
              <rect x={198} y={86} width={24} height={26} rx={12} fill="#ffffff" />
              <circle cx={210 + swing * 0.9} cy={316} r={24} fill="#ffffff" />
            </g>
          </svg>
          {/* 角标：落地同帧弹出 */}
          {badgeT > 0 && (
            <div style={{
              position: 'absolute', right: -26, top: -26, width: 92, height: 92, borderRadius: 46,
              background: 'linear-gradient(180deg, #ff5a4f 0%, #e5352b 100%)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.sans,
              fontSize: 48, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
              boxShadow: '0 0 0 6px #f3f2ef, 0 6px 14px rgba(150,20,10,0.3)',
              transform: `scale(${badgeT})`,
            }}>3</div>
          )}
        </div>

        {/* 功能面板卡：落定后弹出 */}
        {panelT > 0 && (
          <div style={{
            position: 'absolute', left: CX + ICON / 2 + 70, top: GROUND - ICON - 40, width: 560, height: 326,
            transform: `scale(${panelT})`, transformOrigin: 'left bottom', opacity: Math.min(1, panelT * 1.5),
            background: '#ffffff', border: hairline(0.08), borderRadius: 20, boxSizing: 'border-box',
            boxShadow: `${innerHighlight(0.9)}, ${softShadow(22, { strength: 1.2 })}`,
            padding: '28px 30px', fontFamily: FONT.sans, color: '#17181c',
          }}>
            {/* New 标签 */}
            <div style={{
              position: 'absolute', top: -22, left: 26, padding: '9px 18px', borderRadius: 22,
              background: `linear-gradient(180deg, ${AMBER[1]} 0%, ${AMBER[2]} 100%)`, color: '#fff',
              fontSize: 22, fontWeight: 650, letterSpacing: '0.01em',
              boxShadow: `${innerHighlight(0.35)}, 0 4px 10px rgba(180,90,0,0.25)`,
            }}>New</div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
              <div>
                <div style={{ fontSize: 30, fontWeight: 650, letterSpacing: '-0.02em' }}>Smart notifications</div>
                <div style={{ fontSize: 17, color: '#5d5f66', marginTop: 6 }}>Only what needs you, grouped by project</div>
              </div>
              {/* 开关：已打开 */}
              <div style={{ marginLeft: 'auto', width: 58, height: 34, borderRadius: 17, background: '#f59e0b', position: 'relative', boxShadow: 'inset 0 1px 2px rgba(120,60,0,0.25)' }}>
                <div style={{ position: 'absolute', right: 3, top: 3, width: 28, height: 28, borderRadius: 14, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
              </div>
            </div>
            <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {NOTES.map((n, i) => {
                const r = rowT(i);
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 12,
                    background: '#f6f6f4', boxShadow: 'inset 0 0 0 1px rgba(20,22,28,0.05)',
                    opacity: r, transform: `translateY(${(1 - r) * 14}px)`,
                  }}>
                    <div style={{ width: 10, height: 10, borderRadius: 5, background: n.c, boxShadow: `0 0 0 4px ${n.c}22` }} />
                    <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.01em' }}>{n.t}</div>
                    <div style={{ marginLeft: 'auto', fontSize: 15, color: '#9b9da3' }}>{n.s}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <Grain opacity={0.045} />
    </div>
  );
};
