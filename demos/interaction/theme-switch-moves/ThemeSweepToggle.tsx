// theme-sweep-toggle —— 深浅模式扫场
// 同一 dashboard 深浅两版叠放（FakeDashboard 同布局 light / dark 两套色板），上层深版用
// clip-path polygon 15° 斜边从左上扫到右下（先快后缓），边界带亮线；
// 扫完深版整体 scale 0.99→1 "坐实"。f=64 后全静止。
// 质感升级：两版直接用出版级 FakeDashboard（tone light / dark），不再手抄旧灰阶骨架；
// 顶栏搜索框左侧加一枚主题开关，f6–13 先拨到月亮，扫场紧接着开始（有因）；
// 边界改为"深色幕布压过来"——亮线核心 + 强调色辉光 + 投在浅色侧的柔和阴影，辉光宽度随
// 边界速度变化（快时拖长、慢时收紧）；坐实幅度 0.995→0.99。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { FakeDashboard, G } from '../../_fixtures/Fixtures';
import { velocity } from '../../_fixtures/Polish';

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// 时间轴
const TOGGLE0 = 6; // 开关拨动开始
const TOGGLE1 = 13; // 开关到位（下一帧起扫）
const SWEEP0 = 14; // 扫场开始（前 14f 初始静置 + 拨开关）
const SWEEP1 = 52; // 扫场结束
const SETTLE0 = 52;
const SETTLE1 = 64; // 坐实结束 → 之后全静止
export const THEME_SWEEP_TOGGLE_DURATION = 120; // 64f 后真静止 56f

const SLANT = 1080 * Math.tan((15 * Math.PI) / 180); // ≈ 289px，15° 斜边
const ACCENT_RGB = '128,136,240';

// 顶栏主题开关（搜索框 x1512 左侧 16px，与搜索框同中线 y36）
const SW = { x: 1440, y: 21, w: 56, h: 30 };
const ThemeSwitch: React.FC<{ on: number; tone: 'light' | 'dark' }> = ({ on, tone }) => {
  const dark = tone === 'dark';
  const knob = SW.h - 6;
  const kx = 3 + on * (SW.w - knob - 6);
  return (
    <div style={{
      position: 'absolute', left: SW.x, top: SW.y, width: SW.w, height: SW.h, borderRadius: SW.h / 2,
      background: on > 0.5
        ? `linear-gradient(180deg, rgba(${ACCENT_RGB},0.95), rgba(${ACCENT_RGB},0.8))`
        : dark ? 'rgba(255,255,255,0.08)' : G.fill2,
      boxShadow: on > 0.5
        ? 'inset 0 1px 2px rgba(0,0,0,0.25)'
        : `inset 0 1px 2px rgba(16,18,24,0.10), inset 0 0 0 1px ${dark ? 'rgba(255,255,255,0.08)' : G.hairline}`,
    }}>
      <div style={{
        position: 'absolute', left: kx, top: 3, width: knob, height: knob, borderRadius: knob / 2,
        background: 'linear-gradient(180deg, #ffffff, #f2f2f0)',
        boxShadow: '0 1px 2px rgba(16,18,24,0.25), 0 3px 8px -2px rgba(16,18,24,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* 太阳 → 月亮：两枚图标交叉淡入 */}
        <svg width={14} height={14} viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', opacity: 1 - on }}>
          <circle cx={8} cy={8} r={3} stroke="#c08a1e" strokeWidth={1.6} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <path key={a} d="M8 1.6v1.4" stroke="#c08a1e" strokeWidth={1.5} strokeLinecap="round" transform={`rotate(${a} 8 8)`} />
          ))}
        </svg>
        <svg width={13} height={13} viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', opacity: on }}>
          <path d="M13 9.6A5.5 5.5 0 1 1 6.4 3a4.4 4.4 0 0 0 6.6 6.6z" stroke={`rgb(${ACCENT_RGB})`} strokeWidth={1.7} strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
};

export const ThemeSweepToggle: React.FC = () => {
  const frame = useCurrentFrame();

  // 开关：7f 拨到右侧（强 ease-out 带一点过冲）
  const on = interpolate(frame, [TOGGLE0, TOGGLE1], [0, 1], { easing: Easing.out(Easing.back(1.4)), ...CL });

  // 边界顶端 x：先快后缓（poly(3) out）；从左外扫到右外+SLANT 保证底边也扫尽
  const pAt = (f: number) =>
    interpolate(f, [SWEEP0, SWEEP1], [-20, 1920 + SLANT + 40], {
      easing: Easing.out(Easing.poly(3)),
      ...CL,
    });
  const p = pAt(frame);
  const v = Math.abs(velocity(pAt, frame)); // 边界速度 px/帧（起扫最快约 220，收尾→0）
  const streak = Math.min(1, v / 160);

  // 坐实：0.99 → 1
  const settle = interpolate(frame, [SETTLE0, SETTLE0 + 1, SETTLE1], [1, 0.99, 1], {
    easing: Easing.out(Easing.cubic),
    ...CL,
  });

  // 亮线透明度：扫场期间可见，扫完 6f 内淡出
  const lineOp = interpolate(frame, [SWEEP0, SWEEP0 + 4, SWEEP1 - 4, SWEEP1 + 2], [0, 1, 1, 0], CL);
  const sweeping = frame >= SWEEP0 && frame < SWEEP1 + 2;
  const glowW = 22 + 70 * streak; // 辉光随速度拉宽

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', background: G.bg }}>
      {/* 底层浅色版 */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <FakeDashboard variant="A" />
        <ThemeSwitch on={on} tone="light" />
      </div>
      {/* 深色幕布压过来时投在浅色侧的柔和阴影（贴着斜边、在深版之下） */}
      {sweeping && (
        <div
          style={{
            position: 'absolute',
            left: p - SLANT / 2 - 10,
            top: 540 - 640,
            width: 160,
            height: 1280,
            transform: 'rotate(15deg)',
            transformOrigin: '10px 50%',
            background: 'linear-gradient(90deg, rgba(10,11,16,0.26) 0%, rgba(10,11,16,0.08) 35%, rgba(10,11,16,0) 100%)',
            opacity: lineOp,
          }}
        />
      )}
      {/* 上层深色版，clip-path 斜切揭出 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          clipPath: frame >= SWEEP1 ? 'none' : `polygon(0 0, ${p}px 0, ${p - SLANT}px 1080px, 0 1080px)`,
          transform: settle !== 1 ? `scale(${settle})` : undefined,
          transformOrigin: '50% 50%',
          visibility: frame >= SWEEP0 ? 'visible' : 'hidden',
        }}
      >
        <FakeDashboard variant="A" tone="dark" />
        <ThemeSwitch on={1} tone="dark" />
      </div>
      {/* 边界：强调色辉光（随速度拉宽，偏向深色侧拖尾）+ 2px 亮线核心（条件卸载） */}
      {sweeping && (
        <div
          style={{
            position: 'absolute',
            left: p - SLANT / 2 - glowW,
            top: 540 - 640,
            width: glowW + 6,
            height: 1280,
            transform: 'rotate(15deg)',
            transformOrigin: `${glowW}px 50%`,
            opacity: lineOp,
            pointerEvents: 'none',
          }}
        >
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(90deg, rgba(${ACCENT_RGB},0) 0%, rgba(${ACCENT_RGB},${(0.18 + 0.2 * streak).toFixed(3)}) 75%, rgba(220,224,255,0.65) 100%)`,
          }} />
          <div style={{
            position: 'absolute', right: 4, top: 0, bottom: 0, width: 2,
            background: '#ffffff', boxShadow: `0 0 10px 2px rgba(255,255,255,0.75), 0 0 26px 6px rgba(${ACCENT_RGB},0.45)`,
          }} />
        </div>
      )}
    </div>
  );
};
