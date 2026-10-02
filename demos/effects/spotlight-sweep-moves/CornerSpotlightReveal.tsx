// corner-spotlight-reveal —— 对标 clickup-30.mp4 41.5–44.6s：
// 黑场上，左上角径向聚光从小到大扩张，把白色 Inbox 界面逐步"点亮"，
// 照到的区域显影、照不到的沉黑，最终全屏亮起。光即转场。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';

const FONT = '"Avenir Next", "Helvetica Neue", Helvetica, sans-serif';

// 灰阶 Inbox 界面（自绘，替代真 UI）
const InboxPanel: React.FC = () => (
  <div
    style={{
      width: 1920,
      height: 1080,
      background: '#f6f6f5',
      fontFamily: FONT,
      padding: '90px 120px',
      boxSizing: 'border-box',
      color: '#2c2c2c',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
      <div style={{ fontSize: 118, fontWeight: 700, letterSpacing: -2 }}>Inbox</div>
      <div
        style={{
          width: 0, height: 0, marginTop: 26,
          borderLeft: '16px solid transparent',
          borderRight: '16px solid transparent',
          borderTop: '20px solid #3a3a3a',
        }}
      />
    </div>
    <div style={{ display: 'flex', gap: 64, marginTop: 90, fontSize: 44, color: '#555' }}>
      <div style={{ background: '#e9e8f6', color: '#5b55c8', padding: '10px 34px', borderRadius: 14, fontWeight: 600 }}>All</div>
      <div style={{ padding: '10px 0' }}>Tasks</div>
      <div style={{ padding: '10px 0' }}>Docs</div>
      <div style={{ padding: '10px 0' }}>People</div>
      <div style={{ padding: '10px 0' }}>Chat</div>
    </div>
    {[0, 1, 2].map((row) => (
      <div key={row} style={{ display: 'flex', alignItems: 'center', gap: 30, marginTop: row === 0 ? 96 : 64 }}>
        <div style={{ width: 42, height: 42, border: '3px solid #c9c9c7', borderRadius: 10 }} />
        <div style={{ width: 14, height: 14, borderRadius: 7, background: '#5b55c8' }} />
        <div style={{ width: 56, height: 56, borderRadius: 28, background: '#efe4e2' }} />
        <div>
          <div style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
            <div style={{ height: 22, width: 220 + ((row * 67) % 90), background: '#3f3f3f', borderRadius: 11 }} />
            <div style={{ width: 8, height: 8, borderRadius: 4, background: '#bbb' }} />
            <div style={{ height: 18, width: 260, background: '#c9c9c7', borderRadius: 9 }} />
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 16 }}>
            <div style={{ height: 18, width: 300, background: '#8f8bd8', borderRadius: 9, opacity: 0.75 }} />
            <div style={{ height: 18, width: 340 - ((row * 91) % 120), background: '#d8d8d6', borderRadius: 9 }} />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const CornerSpotlightReveal: React.FC = () => {
  const frame = useCurrentFrame();

  // 聚光半径扩张：全程匀速（用户裁决"整个过程要匀速"——严格 linear，无缓动）
  // r+feather=1.85r 是光前沿；1.85*1300≈2400 恰在片尾盖满全屏对角，
  // 保证扩张动作占满全片时长而不是前 1/3 就饱和
  const r = interpolate(frame, [0, 100], [160, 1300], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 光心沿左上角匀速游移（linear）
  const cx = interpolate(frame, [0, 96], [140, 420], { extrapolateRight: 'clamp' });
  const cy = interpolate(frame, [0, 96], [90, 260], { extrapolateRight: 'clamp' });

  // 软边宽度：扩张时边缘更羽化
  const feather = r * 0.85;

  // UI 轻微透视漂移（原片相机贴着界面缓推）
  const drift = interpolate(frame, [0, 100], [0, 1]);
  const scale = 1.75 - 0.28 * drift;
  const tx = -40 + 70 * drift;
  const ty = -30 + 50 * drift;

  const mask = `radial-gradient(circle ${r + feather}px at ${cx}px ${cy}px, rgba(255,255,255,1) ${Math.max(
    0,
    ((r - feather * 0.25) / (r + feather)) * 100,
  )}%, rgba(255,255,255,0) 100%)`;

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <AbsoluteFill
        style={{
          WebkitMaskImage: mask,
          maskImage: mask,
          transform: `scale(${scale}) translate(${tx}px, ${ty}px) rotate(${-1.2 + 1.2 * drift}deg)`,
          transformOrigin: '18% 12%',
        }}
      >
        <InboxPanel />
      </AbsoluteFill>
      {/* 聚光自身的白热光晕（叠在界面上方，光心最亮） */}
      <div
        style={{
          position: 'absolute',
          left: cx - r * 0.7,
          top: cy - r * 0.7,
          width: r * 1.4,
          height: r * 1.4,
          borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(255,255,255,0.85), rgba(255,255,255,0.25) 45%, transparent 75%)',
          filter: 'blur(26px)',
          opacity: interpolate(frame, [0, 10, 60, 90], [0, 0.9, 0.55, 0], {
            extrapolateRight: 'clamp',
          }),
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

export const CORNER_SPOTLIGHT_REVEAL_DURATION = 130;
