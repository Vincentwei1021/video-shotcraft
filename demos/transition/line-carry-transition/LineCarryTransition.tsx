// line-carry-transition｜线条接力横移转场（Catch Me If You Can 图形接力）
// 世界宽 3840（A 左半 / B 右半）。0–22f 卡 A 底部 6px ink 进度条走满（2f 满格停顿）；
// 24–34f 进度条末端延伸成横线冲出卡右缘；34–94f 镜头整体左移 1920px
// （Easing.inOut(cubic)，60f），线与镜头同速延伸，笔头始终在画面偏右；
// 94–112f 线拐直角围出 560×330 卡框（一条 path 全程 evolve，dashoffset 生长）；
// 112–124f 框闭合后 B 卡内容淡入 12f。124–160f 真静止 36f ≥ 35f。
// 帧确定，无随机；笔头墨点 118f 起条件卸载（摘罩判例）。
// 质感层：A = "导出影片"进度卡（百分比随线计数，走满 = 线的出发理由），B = 导出完成后的
// 分享卡（线围成的框就是它的边）；冲出段改为两端零速的 swift 曲线，与进度条 ease-out 收尾、
// 镜头 inOut 起步速度连续，不再"冲一下顿一下"；横移时世界内容按镜头速度做水平运动模糊
// （线与笔头在模糊层外，始终锐利）；底色是随世界走的冷暖过渡 + 屏幕空间柔光，不再有硬接缝。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { G } from '../../_fixtures/Fixtures';
import { EASE, ramp, mix, velocity, FONT, tracking, softShadow, hairline, innerHighlight, Grain, Vignette, SpeedBlur } from '../../_fixtures/Polish';

export const LINE_CARRY_TRANSITION_DURATION = 160;

// ---- 世界几何（一条折线：进度条 + 横线 + 直角 + 矩形框）----
// M 400,705 → 2600,705（进度 560 + 冲出 1640）→ 上 2600,375 → 右 3160,375
// → 下 3160,705 → 左回 2600,705 闭合。总长 2200+330+560+330+560 = 3980。
const PATH = 'M 400 705 L 2600 705 L 2600 375 L 3160 375 L 3160 705 L 2600 705';
const SEGS: Array<[number, number, number, number, number]> = [
  [400, 705, 2600, 705, 2200],
  [2600, 705, 2600, 375, 330],
  [2600, 375, 3160, 375, 560],
  [3160, 375, 3160, 705, 330],
  [3160, 705, 2600, 705, 560],
];
const TOTAL = 3980;
const INK = '#1b1c21';

// 笔头坐标：按已画长度沿折线取点
const tipAt = (drawn: number): [number, number] => {
  let d = Math.max(0, Math.min(drawn, TOTAL));
  for (const [x1, y1, x2, y2, len] of SEGS) {
    if (d <= len) {
      const t = d / len;
      return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
    }
    d -= len;
  }
  return [2600, 705];
};

// 镜头：34–94f 左移 1920px，inOut cubic
const camAt = (f: number) =>
  interpolate(f, [34, 94], [0, 1920], { easing: Easing.inOut(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

// 已画长度：三段接力（进度条 → 冲出 → 与镜头同速 → 收框）
const drawnAt = (f: number) => {
  if (f < 24) return mix(0, 560, ramp(f, 0, 22, EASE.out)); // 走满后 22–24f 停一拍
  if (f < 34) return mix(560, 1100, ramp(f, 24, 10, EASE.swift)); // 两端零速：接满格停顿、交给镜头起步
  if (f < 94) return 1100 + camAt(f); // 与镜头同速延伸，笔头稳在画面偏右
  return interpolate(f, [94, 112], [3020, TOTAL], { easing: Easing.out(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
};

// 场景 A：导出进度卡（560×330 @ 400,350），百分比跟进度条
const ExportCard: React.FC<{ pct: number }> = ({ pct }) => {
  const done = pct >= 100;
  return (
    <div style={{
      position: 'absolute', left: 400, top: 350, width: 560, height: 330, boxSizing: 'border-box', padding: '30px 32px',
      background: 'linear-gradient(180deg, #ffffff, #fbfbfa)', borderRadius: 16, border: hairline(0.08),
      boxShadow: `${innerHighlight(0.9)}, ${softShadow(18)}`, fontFamily: FONT.sans, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 14, background: 'linear-gradient(150deg, #2b2d36, #15161b)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px -4px rgba(16,18,26,0.4)',
        }}>
          <svg width={26} height={26} viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="#fff" /></svg>
        </div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 650, color: G.ink1, letterSpacing: tracking(24) }}>launch-film.mp4</div>
          <div style={{ marginTop: 5, fontSize: 18, color: G.ink3 }}>1080p · H.264 · 00:42</div>
        </div>
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 500, color: done ? G.accent : G.ink3, letterSpacing: tracking(18) }}>
            {done ? 'Export complete' : 'Exporting…'}
          </div>
          <div style={{ marginTop: 6, fontSize: 84, fontWeight: 700, color: G.ink1, letterSpacing: tracking(84), lineHeight: 0.95, fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(pct)}<span style={{ fontSize: 44, color: G.ink3, fontWeight: 600 }}>%</span>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 18, color: G.ink3, fontVariantNumeric: 'tabular-nums', paddingBottom: 6 }}>
          {done ? '214 MB' : `${Math.round(pct * 2.14)} / 214 MB`}
        </div>
      </div>
    </div>
  );
};

// 场景 B：分享卡内容（填进线围成的 560×330 框）
const ShareCard: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, padding: '30px 32px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', fontFamily: FONT.sans }}>
    <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
      <div style={{
        width: 150, height: 86, borderRadius: 10, overflow: 'hidden', position: 'relative',
        background: 'linear-gradient(135deg, #3b3f8f 0%, #5b63d3 45%, #c3a4f0 100%)',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 70% at 30% 20%, rgba(255,255,255,0.35), rgba(255,255,255,0) 70%)' }} />
        <div style={{
          position: 'absolute', left: 57, top: 25, width: 36, height: 36, borderRadius: 18, background: 'rgba(255,255,255,0.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width={16} height={16} viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="#3b3f8f" /></svg>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 650, color: G.ink1, letterSpacing: tracking(24) }}>launch-film.mp4</div>
        <div style={{ marginTop: 5, fontSize: 18, color: G.ink3 }}>Ready · 214 MB</div>
      </div>
    </div>
    <div style={{
      marginTop: 26, height: 52, borderRadius: 12, background: G.fill, border: hairline(0.08), display: 'flex', alignItems: 'center',
      padding: '0 8px 0 18px', gap: 12,
    }}>
      <div style={{ flex: 1, fontFamily: FONT.mono, fontSize: 17, color: G.ink2 }}>northwind.app/s/launch-42</div>
      <div style={{ height: 38, padding: '0 18px', borderRadius: 9, background: INK, color: '#fff', fontSize: 17, fontWeight: 600, display: 'flex', alignItems: 'center' }}>Copy link</div>
    </div>
    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ display: 'flex' }}>
        {['JL', 'AK', 'MR'].map((t, i) => (
          <div key={t} style={{
            marginLeft: i ? -8 : 0, width: 34, height: 34, borderRadius: 17, background: ['#e4e4e1', '#d9dade', '#e9e6df'][i],
            boxShadow: '0 0 0 2px #fff', fontSize: 13, fontWeight: 650, color: '#4a4c53', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{t}</div>
        ))}
      </div>
      <div style={{ fontSize: 18, color: G.ink3 }}>Shared with 3 people</div>
    </div>
  </div>
);

export const LineCarryTransition: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = camAt(frame);
  const drawn = drawnAt(frame);
  // 镜头水平速度（px/帧），给世界内容的运动模糊
  const vx = -velocity(camAt, frame);

  // B 卡内容：框闭合(112f)后淡入 12f
  const contentOpacity = ramp(frame, 112, 12, EASE.out);
  const pct = Math.min(100, (Math.min(drawn, 560) / 560) * 100);

  // 笔头墨点：全程随笔走，112–118f 线性消散，118f 起条件卸载
  const tipMounted = frame < 118;
  const tipOpacity = interpolate(frame, [112, 118], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const [tx, ty] = tipAt(drawn);
  const world: React.CSSProperties = { position: 'absolute', left: 0, top: 0, width: 3840, height: 1080, transform: `translateX(${(-cam).toFixed(2)}px)` };

  return (
    <AbsoluteFill style={{ background: G.bg, overflow: 'hidden' }}>
      {/* 世界底色：A 暖灰 → B 冷白，900px 柔过渡（替代 x=1920 处的硬接缝）；本身平滑，不进模糊层 */}
      <div style={world}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #ecebe8 0%, #ecebe8 38%, #f4f5f7 62%, #f6f7f9 100%)' }} />
      </div>
      {/* 世界内容（制图点阵 + 两张卡 + 标题）：随镜头横移，快段水平模糊。
          外包一层屏幕尺寸的裁切，滤镜只处理 1920×1080，避免 3840 宽层的分块条纹 */}
      <SpeedBlur vx={vx} amount={0.3} max={14}>
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div style={world}>
          {/* 制图点阵：横移时给眼睛一个速度参照（否则只有一条线，读不出镜头在动），边缘渐隐 */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(20,22,28,0.11) 1.6px, rgba(20,22,28,0) 2.2px)',
            backgroundSize: '48px 48px', backgroundPosition: '0 9px',
            WebkitMaskImage: 'linear-gradient(180deg, transparent 4%, #000 26%, #000 74%, transparent 96%)',
            maskImage: 'linear-gradient(180deg, transparent 4%, #000 26%, #000 74%, transparent 96%)',
          }} />
          {/* 场景 A */}
          <div style={{ position: 'absolute', left: 400, top: 240, fontFamily: FONT.sans }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: G.ink3, letterSpacing: tracking(22, true), textTransform: 'uppercase' }}>Step 1</div>
            <div style={{ marginTop: 8, fontSize: 52, fontWeight: 700, color: G.ink1, letterSpacing: tracking(52), lineHeight: 1 }}>Render</div>
          </div>
          <ExportCard pct={pct} />
          {/* 进度条轨道（ink 填充即 path 本体） */}
          <div style={{ position: 'absolute', left: 400, top: 702, width: 560, height: 6, borderRadius: 3, background: G.fill2 }} />
          {/* 场景 B：框(2600,375–3160,705)由线画成，底面与内容淡入 */}
          <div style={{
            position: 'absolute', left: 2600, top: 375, width: 560, height: 330, opacity: contentOpacity,
            background: '#ffffff', boxShadow: softShadow(18 * contentOpacity),
          }}>
            <ShareCard />
          </div>
          <div style={{ position: 'absolute', left: 2600, top: 240, opacity: contentOpacity, fontFamily: FONT.sans }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: G.ink3, letterSpacing: tracking(22, true), textTransform: 'uppercase' }}>Step 2</div>
            <div style={{ marginTop: 8, fontSize: 52, fontWeight: 700, color: G.ink1, letterSpacing: tracking(52), lineHeight: 1 }}>Share</div>
          </div>
        </div>
        </div>
      </SpeedBlur>

      {/* 一条线全程 evolve：dasharray/dashoffset 生长（模糊层外，始终锐利） */}
      <div style={world}>
        <svg width={3840} height={1080} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <path
            d={PATH}
            fill="none"
            stroke={INK}
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="miter"
            strokeDasharray={TOTAL}
            strokeDashoffset={TOTAL - drawn}
          />
          {tipMounted && (
            <g opacity={tipOpacity}>
              <circle cx={tx} cy={ty} r={22} fill={INK} opacity={0.08} />
              <circle cx={tx} cy={ty} r={11} fill={INK} />
            </g>
          )}
        </svg>
      </div>

      {/* 屏幕空间光：左上主光 + 暗角 + 颗粒（不随世界走，像摄影棚里的固定灯） */}
      <AbsoluteFill style={{ pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 70% at 30% 12%, rgba(255,255,255,0.5), rgba(255,255,255,0) 70%)', mixBlendMode: 'soft-light' }} />
      <Vignette strength={0.16} inner={0.45} color="#2a2c36" />
      <Grain opacity={0.045} />
    </AbsoluteFill>
  );
};
