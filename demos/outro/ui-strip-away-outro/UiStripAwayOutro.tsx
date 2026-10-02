// ui-strip-away-outro —— framer-ai 33–36.5s
// 满屏"编辑器"里光标点击高亮 Publish 按钮 → UI 层层错峰蒸发退场
// （每层 fade + 方向性位移 + 蒸发模糊，从外围到中心）→ 黑场只剩按钮 → 按钮淡出交棒字标。
// 质感：编辑器是出版级假 UI（深色图层栏、属性面板真实字段、点阵画布、浏览器预览框里放
// fixture 卡片），发丝线 + 双层软阴影；Publish 用强调色，升格到黑场后带同色光晕；
// 黑场是带色相的深场（中心微光 + 暗角 + 颗粒）；字标是图形标 + 字标的 lockup，对焦式入场。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Easing } from 'remotion';
import { G, Card } from '../../_fixtures/Fixtures';
import { EASE, FONT, Grain, Vignette, mix, ramp, hairline, softShadow, innerHighlight } from '../../_fixtures/Polish';

export const UI_STRIP_AWAY_OUTRO_DURATION = 144; // 字标定版后 hold ≥1s（R1）

const CLICK = 34; // 点击时刻
// 蒸发层级（点击后延迟，外围先走）
const STRIP = {
  sidebar: CLICK + 4,
  leftPanel: CLICK + 8,
  canvasCards: CLICK + 12,
  topbarEnds: CLICK + 16,
  canvasBg: CLICK + 20,
  toolbarShell: CLICK + 24,
};
const STRIP_DUR = 14;
const BTN_FADE = CLICK + 52;
const LOGO_IN = CLICK + 62;

const ACCENT = G.accent; // Publish 的品牌高亮色
const INK = '#0b0c10'; // 黑场：带冷色相的近黑
// Publish 按钮几何：工具条右端 → 屏心
const BTN_W = 150;
const BTN_H = 40;
const BTN_FROM = { x: 1920 - 24 - BTN_W / 2, y: 30 };
const BTN_TO = { x: 960, y: 540 };

// 某层的蒸发进度 → {opacity, transform, filter}：ease-in 加速离场 + 位移 + 渐增模糊（蒸发感）
const strip = (frame: number, start: number, dx: number, dy: number): React.CSSProperties => {
  const p = interpolate(frame, [start, start + STRIP_DUR], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.quad), // 离场加速
  });
  return {
    opacity: 1 - p,
    transform: `translate(${dx * p}px, ${dy * p}px)`,
    filter: p > 0.001 ? `blur(${(p * 7).toFixed(2)}px)` : undefined,
  };
};

// —— 小图标（1.5px 线性图标，与 fixture 同语言）——
const Icon: React.FC<{ d: string; size?: number; color?: string }> = ({ d, size = 18, color = G.ink2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const IC = {
  cursor: 'M5 3l13 8-6 1.5L9 19z',
  frame: 'M7 3v18M17 3v18M3 7h18M3 17h18',
  text: 'M5 6V4h14v2M12 4v16M9 20h6',
  pen: 'M12 19l7-7-3-3-7 7-1 4zM14 7l3 3',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4',
  comp: 'M12 3l4 4-4 4-4-4zM12 13l4 4-4 4-4-4z',
  layer: 'M4 7h16v10H4z',
  textL: 'M6 7V5h12v2M12 5v14',
  group: 'M4 6h7v5H4zM13 6h7v5h-7zM4 13h16v5H4z',
};

// 图形标：深钢色圆角方块 + 白方块与强调色圆片错叠（本批 outro 共用的品牌语言）
const Mark: React.FC<{ size: number }> = ({ size }) => {
  const k = size / 132;
  return (
    <div style={{
      width: size, height: size, borderRadius: 34 * k, position: 'relative', overflow: 'hidden', flex: 'none',
      background: 'linear-gradient(150deg, #353843 0%, #1c1d23 62%, #16171c 100%)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16), inset 0 0 0 1px rgba(255,255,255,0.06), 0 2px 6px rgba(0,0,0,0.5), 0 24px 60px -18px rgba(0,0,0,0.8)',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 45%)' }} />
      <div style={{ position: 'absolute', left: 34 * k, top: 34 * k, width: 40 * k, height: 40 * k, borderRadius: 12 * k, background: 'rgba(255,255,255,0.95)' }} />
      <div style={{ position: 'absolute', left: 56 * k, top: 56 * k, width: 42 * k, height: 42 * k, borderRadius: 21 * k, background: '#8088f0' }} />
    </div>
  );
};

const LAYERS: [string, string, number, boolean?][] = [
  ['frame', 'Landing page', 0],
  ['layer', 'Nav', 1],
  ['group', 'Hero', 1],
  ['textL', 'Headline', 2],
  ['textL', 'Subhead', 2],
  ['group', 'Feature grid', 1, true],
  ['layer', 'Card — Analytics', 2],
  ['layer', 'Card — Deploys', 2],
  ['layer', 'Card — Team', 2],
  ['layer', 'Card — Billing', 2],
  ['layer', 'Footer', 1],
];

const Field: React.FC<{ label: string; value: string; w?: number }> = ({ label, value, w }) => (
  <div style={{
    height: 34, flex: w ? 'none' : 1, width: w, borderRadius: 8, background: G.fill, border: hairline(0.07),
    display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', boxSizing: 'border-box',
    fontFamily: FONT.sans, fontSize: 13, fontVariantNumeric: 'tabular-nums',
  }}>
    <span style={{ color: G.ink3 }}>{label}</span>
    <span style={{ color: G.ink1, fontWeight: 500 }}>{value}</span>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 18, borderBottom: hairline(0.07) }}>
    <div style={{ fontFamily: FONT.sans, fontSize: 12, fontWeight: 600, color: G.ink1, letterSpacing: '0.01em' }}>{title}</div>
    {children}
  </div>
);

export const UiStripAwayOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 背景：编辑器底 → 黑场（随 canvasBg 层蒸发压黑）
  const bgDark = interpolate(frame, [STRIP.canvasBg, STRIP.canvasBg + STRIP_DUR + 6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.quad),
  });

  const sidebar = strip(frame, STRIP.sidebar, -140, 0);
  const leftPanel = strip(frame, STRIP.leftPanel, -90, 20);
  const topLeft = strip(frame, STRIP.topbarEnds, -80, -60);
  const topRight = strip(frame, STRIP.topbarEnds, 80, -60);
  const toolbarShell = strip(frame, STRIP.toolbarShell, 0, -50);
  const canvasFrame = strip(frame, STRIP.canvasBg, 0, 40);

  // 画布卡片错峰蒸发（各错 3f，左右交替散开）
  const cardStrip = (i: number) => strip(frame, STRIP.canvasCards + i * 3, i % 2 ? 70 : -70, 50 + i * 10);

  // 按钮：点击脉冲 + 最后淡出
  const press = spring({ frame: frame - CLICK, fps, config: { damping: 12, stiffness: 220 } });
  const pressScale = frame < CLICK ? 1 : 1 - 0.12 * Math.sin(Math.min(1, press) * Math.PI);
  const btnOp = 1 - ramp(frame, BTN_FADE, 12, EASE.exit);
  // 蒸发期间按钮从工具条位置滑向屏幕中心，独占黑场
  const btnCenter = interpolate(frame, [STRIP.toolbarShell, STRIP.toolbarShell + 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
  const btnX = mix(BTN_FROM.x, BTN_TO.x, btnCenter);
  const btnY = mix(BTN_FROM.y, BTN_TO.y, btnCenter);
  const btnScale = 1 + 0.5 * btnCenter;
  // 迁移最快段的方向性拖影（按每帧位移给模糊，静止为 0）
  const dPrev = interpolate(frame - 1, [STRIP.toolbarShell, STRIP.toolbarShell + 18], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic),
  });
  const btnSpeed = Math.hypot(BTN_TO.x - BTN_FROM.x, BTN_TO.y - BTN_FROM.y) * Math.abs(btnCenter - dPrev);
  const btnBlur = Math.min(3, btnSpeed * 0.04);
  // 按钮淡出时略微放大"化开"，把黑场交给字标
  const btnRelease = ramp(frame, BTN_FADE, 12, EASE.out);

  // 字标接棒：spring 定版 + 对焦模糊；字标比图形晚 3f（跟随）
  const logoP = spring({ frame: frame - LOGO_IN, fps, config: { damping: 14, stiffness: 90 } });
  const wordP = spring({ frame: frame - LOGO_IN - 3, fps, config: { damping: 14, stiffness: 90 } });

  // 光标移向按钮：x、y 用不同缓动，走一条手腕带出的弧线；点击时笔尖压下
  const curX = interpolate(frame, [4, CLICK - 2], [820, BTN_FROM.x + 18], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad),
  });
  const curY = interpolate(frame, [4, CLICK - 2], [640, BTN_FROM.y + 4], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.15, 1),
  });
  const curOp = 1 - ramp(frame, CLICK + 6, 10, EASE.out);
  const curPress = frame >= CLICK - 1 && frame < CLICK + 3 ? 0.88 : 1;

  const toolbarBase: React.CSSProperties = {
    position: 'absolute', top: 0, height: 60, background: '#fbfbfa', borderBottom: hairline(0.08),
    boxSizing: 'border-box', display: 'flex', alignItems: 'center', fontFamily: FONT.sans,
  };

  return (
    <AbsoluteFill style={{ background: INK, overflow: 'hidden' }}>
      {/* 黑场：中心极弱冷光（随压黑亮起） */}
      <AbsoluteFill style={{
        opacity: bgDark,
        background: 'radial-gradient(ellipse 50% 45% at 50% 50%, rgba(120,128,220,0.10) 0%, rgba(120,128,220,0.03) 50%, rgba(0,0,0,0) 75%)',
      }} />

      {/* 编辑器底（点阵画布，作为一层可蒸发的背景） */}
      <AbsoluteFill style={{
        opacity: 1 - bgDark,
        backgroundColor: '#ececea',
        backgroundImage: 'radial-gradient(rgba(20,22,28,0.10) 1px, transparent 1.2px)',
        backgroundSize: '24px 24px',
      }} />

      {/* 左侧栏（图层面板） */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 240, boxSizing: 'border-box', paddingTop: 76,
        background: 'linear-gradient(180deg, #1c1d22 0%, #16171b 100%)', boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.06)',
        fontFamily: FONT.sans, ...sidebar,
      }}>
        <div style={{ padding: '0 18px 12px', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.36)' }}>LAYERS</div>
        {LAYERS.map(([ic, name, depth, sel]) => (
          <div key={name} style={{
            height: 32, margin: '0 10px', borderRadius: 7, display: 'flex', alignItems: 'center', gap: 9,
            paddingLeft: 10 + depth * 16, fontSize: 13, color: sel ? '#fff' : 'rgba(255,255,255,0.62)',
            background: sel ? 'rgba(128,136,240,0.22)' : 'transparent',
            boxShadow: sel ? 'inset 0 0 0 1px rgba(128,136,240,0.35)' : 'none',
          }}>
            <Icon d={IC[ic as keyof typeof IC]} size={14} color={sel ? '#c9cdff' : 'rgba(255,255,255,0.42)'} />
            {name}
          </div>
        ))}
      </div>

      {/* 右侧属性面板 */}
      <div style={{
        position: 'absolute', right: 0, top: 60, bottom: 0, width: 300, background: '#fbfbfa', borderLeft: hairline(0.08),
        padding: 22, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 18, ...leftPanel,
      }}>
        <Section title="Frame">
          <div style={{ display: 'flex', gap: 8 }}><Field label="X" value="320" /><Field label="Y" value="130" /></div>
          <div style={{ display: 'flex', gap: 8 }}><Field label="W" value="1180" /><Field label="H" value="850" /></div>
        </Section>
        <Section title="Layout">
          <div style={{ display: 'flex', gap: 8 }}><Field label="Gap" value="40" /><Field label="Pad" value="70" /></div>
        </Section>
        <Section title="Fill">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#ffffff', border: hairline(0.12), boxSizing: 'border-box' }} />
            <Field label="Hex" value="FFFFFF" />
            <Field label="" value="100%" w={64} />
          </div>
        </Section>
        <Section title="Effects">
          <div style={{ display: 'flex', gap: 8 }}><Field label="Shadow" value="Soft · 16" /></div>
        </Section>
      </div>

      {/* 顶部工具条左半（logo + 工具） */}
      <div style={{ ...toolbarBase, left: 0, width: 760, gap: 6, padding: '0 16px', ...topLeft }}>
        <div style={{ marginRight: 14 }}><Mark size={32} /></div>
        {[IC.cursor, IC.frame, IC.text, IC.pen, IC.image, IC.comp].map((d, i) => (
          <div key={i} style={{
            width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: i === 0 ? G.accentSoft : 'transparent',
          }}>
            <Icon d={d} size={18} color={i === 0 ? ACCENT : G.ink2} />
          </div>
        ))}
      </div>
      {/* 顶部工具条中段（标题） */}
      <div style={{ ...toolbarBase, left: 760, right: 400, justifyContent: 'center', gap: 10, ...toolbarShell }}>
        <span style={{ fontSize: 14, color: G.ink3 }}>Acme</span>
        <span style={{ fontSize: 14, color: G.ink3 }}>/</span>
        <span style={{ fontSize: 14, color: G.ink1, fontWeight: 600, letterSpacing: '-0.01em' }}>Landing page</span>
        <span style={{ fontSize: 11.5, fontWeight: 500, color: G.ink2, padding: '3px 8px', borderRadius: 6, background: G.fill2 }}>Draft</span>
      </div>
      {/* 顶部工具条右段底板（头像 + Invite；Publish 单独渲染在最上层） */}
      <div style={{ ...toolbarBase, right: 0, width: 400, justifyContent: 'flex-end', gap: 12, padding: `0 ${24 + BTN_W + 12}px 0 24px`, ...topRight }}>
        <div style={{ display: 'flex' }}>
          {['JL', 'MR'].map((n, i) => (
            <div key={n} style={{
              width: 30, height: 30, borderRadius: 15, marginLeft: i ? -8 : 0, background: i ? '#dfe1e8' : '#e9e6df',
              border: '2px solid #fbfbfa', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600, color: '#4a4c53',
            }}>{n}</div>
          ))}
        </div>
        <div style={{
          height: 34, padding: '0 14px', borderRadius: 9, border: hairline(0.13), boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', fontSize: 13.5, fontWeight: 500, color: G.ink1, background: '#fff',
          boxShadow: softShadow(1),
        }}>Invite</div>
      </div>

      {/* 画布区：一张浏览器式大卡 + 四张内容卡 */}
      <div style={{ position: 'absolute', left: 320, top: 130, width: 1180, height: 850, ...canvasFrame }}>
        <div style={{
          position: 'absolute', inset: 0, background: G.card, border: hairline(0.09), borderRadius: 18, overflow: 'hidden',
          boxShadow: `${innerHighlight(0.9)}, ${softShadow(22)}`,
        }}>
          <div style={{
            height: 46, borderBottom: hairline(0.07), display: 'flex', alignItems: 'center', gap: 8, padding: '0 18px',
            background: 'linear-gradient(180deg, #fbfbfa 0%, #f5f5f3 100%)',
          }}>
            {['#ec6a5e', '#f4bf4f', '#61c554'].map((c) => (
              <div key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c, opacity: 0.85 }} />
            ))}
            <div style={{
              marginLeft: 16, height: 26, width: 380, background: G.fill, borderRadius: 8, display: 'flex', alignItems: 'center',
              padding: '0 12px', fontFamily: FONT.sans, fontSize: 12.5, color: G.ink2, gap: 6,
            }}>
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={G.ink3} strokeWidth={2.4}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
              acme.com
            </div>
          </div>
        </div>
        {[0, 1, 2, 3].map((i) => {
          const s = cardStrip(i);
          return (
            <div key={i} style={{ position: 'absolute', left: 70 + (i % 2) * 560, top: 120 + Math.floor(i / 2) * 340, ...s }}>
              <Card w={480} h={280} seed={i + 2} />
            </div>
          );
        })}
      </div>

      {/* Publish 按钮（高亮层，最后退场）：按中心定位，尺寸按布局放大（字边清晰） */}
      <div
        style={{
          position: 'absolute', left: btnX, top: btnY, width: 0, height: 0, zIndex: 30,
          opacity: btnOp, transform: `scale(${pressScale * (1 + 0.06 * btnRelease)})`,
          filter: btnBlur > 0.2 ? `blur(${btnBlur.toFixed(2)}px)` : undefined,
        }}
      >
        {/* 黑场上的主角光环：同色柔光盘，随压黑增强 */}
        <div style={{
          position: 'absolute', left: -260, top: -160, width: 520, height: 320, borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(91,99,211,0.38) 0%, rgba(91,99,211,0.10) 40%, rgba(91,99,211,0) 70%)',
          opacity: btnCenter * bgDark,
        }} />
        <div
          style={{
            position: 'absolute',
            width: BTN_W * btnScale, height: BTN_H * btnScale,
            left: -(BTN_W * btnScale) / 2, top: -(BTN_H * btnScale) / 2,
            borderRadius: 10 * btnScale,
            background: 'linear-gradient(180deg, #6a72e0 0%, #545cd0 100%)',
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.28), inset 0 0 0 1px rgba(255,255,255,0.06), 0 1px 2px rgba(30,34,120,0.35), 0 0 ${30 + 40 * btnCenter}px rgba(110,118,240,${(0.18 + 0.4 * btnCenter * bgDark).toFixed(3)})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 * btnScale,
            fontFamily: FONT.sans, fontWeight: 600, fontSize: 15 * btnScale, letterSpacing: '-0.01em', color: '#ffffff',
          }}
        >
          <svg width={14 * btnScale} height={14 * btnScale} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
          Publish
        </div>
      </div>

      {/* 字标接棒 */}
      {frame >= LOGO_IN && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 34, transform: `scale(${0.86 + 0.14 * logoP})` }}>
            <div style={{ opacity: Math.min(1, logoP * 1.4), filter: logoP < 0.995 ? `blur(${((1 - logoP) * 9).toFixed(2)}px)` : undefined }}>
              <Mark size={112} />
            </div>
            <div style={{
              opacity: Math.min(1, wordP * 1.4), transform: `translateX(${((1 - wordP) * -16).toFixed(2)}px)`,
              filter: wordP < 0.995 ? `blur(${((1 - wordP) * 9).toFixed(2)}px)` : undefined,
              fontFamily: FONT.sans, fontWeight: 650, fontSize: 104, lineHeight: 1, letterSpacing: '-0.04em', color: '#f3f3f6', paddingBottom: 6,
            }}>
              Acme
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* 光标 */}
      <svg width={30} height={38} viewBox="0 0 14 18" style={{
        position: 'absolute', left: curX, top: curY, opacity: curOp, zIndex: 40,
        transform: `scale(${curPress})`, transformOrigin: '2px 2px', filter: 'drop-shadow(0 3px 5px rgba(16,18,24,0.3))',
      }}>
        <path d="M1 1 L1 15 L4.6 11.6 L7.2 17 L9.4 16 L6.9 10.7 L12 10.7 Z" fill="#111216" stroke="#ffffff" strokeWidth={1.1} strokeLinejoin="round" />
      </svg>

      {/* 暗角 + 颗粒：随压黑加深（亮场时几乎不压） */}
      <Vignette strength={0.12 + 0.45 * bgDark} inner={0.42} color="#000000" />
      <Grain opacity={0.05 + 0.03 * bgDark} blend="soft-light" />
    </AbsoluteFill>
  );
};
