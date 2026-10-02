// brand-frame-snap —— figma-devmode 0:28–0:32 (brand-frame-snap) + 0:43–0:47 (frame-color-flip)
// 一圈粗品牌色画框先于内容出现包住全屏 → "录屏窗口"在框内落位 →
// 停一拍 → 画框整圈蓝→绿同帧硬翻色，窗口内容同帧换布局。
// 一个 borderColor 完成章节导航/状态提示/品牌露出。
//
// 质感升级：画框做成"装裱卡纸"——色带顶部受光微渐变、与内容区交界一圈内凹阴影；
// 框内底换成柔光背景；窗口是出版级的失焦态 macOS 窗口（中性灰红绿灯，避免绿色混进蓝段，
// 地址栏/标题/模式徽标带图标），FakeDashboard 用 CSS zoom 完整入镜不再被裁；窗口下落
// 带按速度计算的纵向运动模糊 + 随高度收紧的两层阴影；翻色白闪改成从画框向内的径向闪光。
import React from 'react';
import { useCurrentFrame, spring, interpolate } from 'remotion';
import { FakeDashboard } from '../../_fixtures/Fixtures';
import { Backdrop, EASE, FONT, Grain, SpeedBlur, hairline, innerHighlight, softShadow } from '../../_fixtures/Polish';

export const BRAND_FRAME_SNAP_DURATION = 130; // 单次翻色 ~4.3s

const FPS = 30;
const FIGMA_BLUE = '#3E7BFA';
const DEV_GREEN = '#1BC47D';
const FLIP_FRAME = 78; // 同帧硬翻色时刻
const BAND = 44; // 画框厚度
const ZOOM = 0.76; // 窗口内 dashboard 的布局级缩放（1920×1080 → 1459×821，完整入镜）
const TITLE_H = 48; // 窗口标题栏高
const WIN_W = Math.round(1920 * ZOOM);
const WIN_H = Math.round(1080 * ZOOM) + TITLE_H;

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

// 模式图标（16×16 线性）：设计 = 钢笔尖，开发 = 尖括号
const ModeIcon: React.FC<{ mode: 'design' | 'dev'; size: number; color: string }> = ({ mode, size, color }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    {mode === 'design' ? (
      <>
        <path d="M8 1.8 12.6 7 8 14.2 3.4 7z" />
        <path d="M8 14.2V8.6" />
        <circle cx="8" cy="7.6" r="1" />
      </>
    ) : (
      <>
        <path d="M5.4 4.2 1.8 8l3.6 3.8" />
        <path d="M10.6 4.2 14.2 8l-3.6 3.8" />
        <path d="M9.2 2.8 6.8 13.2" />
      </>
    )}
  </svg>
);

export const BrandFrameSnap: React.FC = () => {
  const f = useCurrentFrame();
  const mode: 'design' | 'dev' = f < FLIP_FRAME ? 'design' : 'dev';
  const frameColor = mode === 'design' ? FIGMA_BLUE : DEV_GREEN;

  // 1) 画框先登场：厚度从 0 长到 44px（snappy ease-out，前 18 帧）
  const frameGrow = EASE.snappy(clamp01(f / 18));
  const frameW = BAND * frameGrow;

  // 2) 窗口在框内落位：从下方 + 略缩，弹簧弹入（帧 14 起）
  const dropAt = (fr: number) => spring({ frame: fr - 14, fps: FPS, config: { damping: 16, stiffness: 110, mass: 1 } });
  const drop = dropAt(f);
  const winYAt = (fr: number) => interpolate(dropAt(fr), [0, 1], [560, 0]);
  const winY = winYAt(f);
  const vy = f >= 14 ? winYAt(f + 0.5) - winYAt(f - 0.5) : 0;
  const winS = interpolate(drop, [0, 1], [0.82, 1]);
  const winO = interpolate(drop, [0, 0.25], [0, 1], { extrapolateRight: 'clamp' });
  // 抬升高度：飞行中 48 → 落定 14（阴影随之收紧变实）
  const elev = interpolate(drop, [0, 1], [48, 14], { extrapolateRight: 'clamp' });

  // 3) 翻色瞬间给 2–3 帧白闪脉冲（0.55 起阶梯衰减）+ 画框轻微厚度弹跳，强化"换挡"
  const sinceFlip = f - FLIP_FRAME;
  const flash = sinceFlip >= 0 && sinceFlip < 3 ? 0.55 - sinceFlip * 0.18 : 0;
  const snapPulse = sinceFlip >= 0 ? Math.exp(-sinceFlip * 0.22) * Math.cos(sinceFlip * 0.9) * 10 : 0;
  const band = frameW + snapPulse;

  const label = mode === 'design' ? 'DESIGN' : 'DEV MODE';
  const file = mode === 'design' ? 'Onboarding — Overview' : 'Onboarding — Inspect';

  return (
    <div style={{ width: 1920, height: 1080, background: '#121316', position: 'relative', overflow: 'hidden' }}>
      {/* 框内内容区：柔光底 + 与画框交界的内凹阴影（卡纸装裱感） */}
      <div style={{ position: 'absolute', inset: band, overflow: 'hidden', borderRadius: 10 }}>
        <Backdrop tone="light" light={{ x: 0.5, y: 0.1 }} grain={0} vignette={0.1} />
        {/* 录屏窗口（带标题栏的窗口卡）落位；下落快速段沿 y 方向运动模糊 */}
        <SpeedBlur vx={0} vy={vy} amount={0.3} max={12}>
          <div style={{
            position: 'absolute', left: '50%', top: '50%', width: WIN_W, height: WIN_H,
            transform: `translate(-50%, -50%) translateY(${winY}px) scale(${winS})`,
            opacity: winO, borderRadius: 14, overflow: 'hidden', background: '#f7f7f6',
            border: hairline(0.12),
            boxShadow: `${innerHighlight(0.9)}, ${softShadow(elev, { strength: 1.25 })}`,
          }}>
            {/* 窗口标题栏：失焦态灰色红绿灯 + 居中文件名 + 地址 + 模式徽标 */}
            <div style={{
              height: TITLE_H, background: 'linear-gradient(180deg, #f3f3f1 0%, #ebebe8 100%)',
              borderBottom: hairline(0.1), display: 'flex', alignItems: 'center', gap: 8,
              padding: '0 18px', boxSizing: 'border-box', position: 'relative', fontFamily: FONT.sans,
            }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: 12, height: 12, borderRadius: 6, background: '#d4d4d1',
                  boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.12)',
                }} />
              ))}
              <div style={{
                marginLeft: 14, height: 28, width: 300, borderRadius: 8, background: 'rgba(255,255,255,0.7)',
                boxShadow: 'inset 0 0 0 1px rgba(20,22,28,0.07)', display: 'flex', alignItems: 'center', gap: 7,
                padding: '0 11px', boxSizing: 'border-box', fontSize: 13, color: '#8b8d93',
              }}>
                <svg width={11} height={11} viewBox="0 0 12 12" fill="none" stroke="#9b9da3" strokeWidth={1.4}>
                  <rect x="2.5" y="5.2" width="7" height="5.3" rx="1.2" />
                  <path d="M4 5.2V3.9a2 2 0 0 1 4 0v1.3" />
                </svg>
                acme.app/file/onboarding
              </div>
              <div style={{
                position: 'absolute', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none',
                fontSize: 14, fontWeight: 600, color: '#3d3f45', letterSpacing: '-0.01em',
              }}>
                {file}
              </div>
              {/* 模式徽标：随画框同帧换色换字 */}
              <div style={{
                marginLeft: 'auto', background: frameColor, color: '#fff', display: 'flex', alignItems: 'center', gap: 7,
                fontWeight: 650, fontSize: 14, letterSpacing: '0.08em', padding: '6px 12px 6px 10px', borderRadius: 8,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.28), 0 1px 2px rgba(16,18,24,0.18)`,
              }}>
                <ModeIcon mode={mode} size={14} color="#ffffff" />
                {label}
              </div>
            </div>
            {/* 窗口内容：翻色同帧换布局 A→B；CSS zoom 布局级缩放，字形按目标尺寸栅格化 */}
            <div style={{ width: 1920, height: 1080, zoom: ZOOM }}>
              <FakeDashboard variant={mode === 'design' ? 'A' : 'B'} />
            </div>
          </div>
        </SpeedBlur>
        {/* 画框内缘的内凹阴影（卡纸厚度），压在内容之上 */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 10, pointerEvents: 'none',
          boxShadow: 'inset 0 0 0 1px rgba(10,12,20,0.10), inset 0 3px 10px rgba(10,12,20,0.16), inset 0 0 40px rgba(10,12,20,0.05)',
        }} />
      </div>

      {/* 品牌色画框：用 4 条实体边而非 border，翻色是纯 background 同帧硬切 */}
      {([
        { left: 0, top: 0, right: 0, height: band },
        { left: 0, bottom: 0, right: 0, height: band },
        { left: 0, top: 0, bottom: 0, width: band },
        { right: 0, top: 0, bottom: 0, width: band },
      ] as React.CSSProperties[]).map((pos, i) => (
        <div key={i} style={{ position: 'absolute', background: frameColor, ...pos }} />
      ))}
      {/* 色带受光：全幅顶部亮、底部略暗（同一主光方向），只是纯色上的一层薄釉 */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 40%, rgba(0,0,0,0.08) 100%)',
        clipPath: `polygon(0 0,100% 0,100% 100%,0 100%,0 0,${band}px ${band}px,${band}px calc(100% - ${band}px),calc(100% - ${band}px) calc(100% - ${band}px),calc(100% - ${band}px) ${band}px,${band}px ${band}px)`,
      }} />

      {/* 画框上的模式角标（左上，嵌在框带里，垂直居中） */}
      <div style={{
        position: 'absolute', left: 64, top: 0, height: band, display: 'flex', alignItems: 'center', gap: 10,
        fontFamily: FONT.sans, fontWeight: 700, fontSize: 24, letterSpacing: '0.12em', color: '#ffffff',
        opacity: clamp01((f - 6) / 8), transform: `translateY(${(1 - EASE.out(clamp01((f - 6) / 12))) * 8}px)`,
        textShadow: '0 1px 1px rgba(0,0,0,0.12)', whiteSpace: 'nowrap',
      }}>
        <ModeIcon mode={mode} size={22} color="#ffffff" />
        {label}
      </div>

      {/* 翻色白闪脉冲：从画框向内的径向闪（边缘 0.55，中心收到 ≈1/3） */}
      {flash > 0 && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: flash,
          background: 'radial-gradient(ellipse 75% 75% at 50% 50%, rgba(255,255,255,0.35) 40%, rgba(255,255,255,1) 100%)',
        }} />
      )}
      <Grain opacity={0.035} />
    </div>
  );
};
