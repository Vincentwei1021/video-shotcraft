// scanline-annotate-focus — 扫描分析取景标注：一条扫描线自上而下匀速掠过一张已存在的品牌官网，
// 扫过哪个区块的下缘，哪块就被一组取景角标"收拢对准"，随后贴一枚机器标签把它命名；顶部状态行实时计数。
//
// 第二轮重设计（暖沙官网 × 钴蓝机器视线）：
// - look = sand（米色 · 赤陶）。被分析的是一张虚构陶器工作室「Hollis」的官网：大号粗黑体 H1、手绘感陶瓶产品图、
//   赤陶色 CTA、四色釉色板——页面本身就是一张好看的品牌页（原版是占位文案 + 8px 小字）。
// - 两套颜色严格分工：赤陶 = 品牌（页面内容），钴蓝 = 机器（扫描线 / 角标 / 标签 / 状态行）。
//   标签照设计工具的选中标签惯例做成钴蓝底白字小签，32px 等宽字，任何底上都读得清。
// - 页面放进一扇有两层软阴影的浏览器窗（1560×840），状态行在窗外上方；全程 1.000→1.035 极缓推镜。
// - 扫描线严格匀速（机器的视线，不加缓动）：3px 钴蓝光芯 + 身后 140px 渐隐的"已读"淡蓝余晖与点阵；
//   窗框两侧各一枚随线滑动的游标，左侧读出当前 Y 坐标。
// - 取景框：四个 L 角从外扩 76px 处按弹簧（damping 15，一次可见过冲）收拢到 bbox，臂长晚 3f 收一档（跟随）；
//   对准瞬间框内钴蓝对焦闪；标签 5f 后从左擦出、文字逐字打出（机器在写）。
//
// 时间表（30fps，共 150f）：
//   0–6     页面已在场（它本来就存在），状态行亮起 READING
//   6–80    扫描线匀速 −20→860（74f）；越过 bbox 下缘即触发（≥4f 最小间隔）：
//           LOGO ~19f · NAV ~23f · H1 ~47f · CTA ~66f · HERO ~70f · PALETTE ~75f
//   ft+0–14 角标弹簧收拢；ft+5–14 标签擦出 + 打字
//   80–88   扫描线淡出；状态行切 BRAND READ · 6 SIGNALS（钴蓝）
//   88–150  hold：全部标注就位，极缓推镜让画面活着，尾帧是一张完整海报
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, ramp, softShadow } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, springAt } from '../../_fixtures/Look';

export const SCANLINE_ANNOTATE_FOCUS_DURATION = 150;

const L = LOOKS.sand;
const MACHINE = '#2b4fd8'; // 机器色（钴蓝）：扫描线 / 角标 / 标签 / 状态行专用，页面内容不用
const TERRA = L.accent; // 品牌色（赤陶）：只在页面内容里出现
const MONO = FONT.mono;

// 浏览器窗（帧坐标）
const WX = 180;
const WY = 168;
const WW = 1560;
const WH = 840;
const CHROME = 52;

// 扫描线（页面坐标，窗内 y）：严格匀速
const SCAN0 = 6;
const SCAN1 = 80;
const Y0 = -20;
const Y1 = 860;
const scanY = (f: number) => Y0 + (Y1 - Y0) * Math.min(1, Math.max(0, (f - SCAN0) / (SCAN1 - SCAN0)));
const frameAtY = (y: number) => SCAN0 + ((y - Y0) / (Y1 - Y0)) * (SCAN1 - SCAN0);

// ───────────── 分析目标（页面坐标；tag = 标签相对 bbox 的放置） ─────────────
type Tag = 'right' | 'above' | 'below' | 'belowRight';
type Target = { key: string; x: number; y: number; w: number; h: number; head: string; detail: string; tag: Tag; ft: number };
const TARGETS: Target[] = (() => {
  const ts: Target[] = [
    { key: 'logo', x: 48, y: 64, w: 186, h: 66, head: 'LOGO', detail: 'Monogram mark', tag: 'right', ft: 0 },
    { key: 'nav', x: 1000, y: 64, w: 512, h: 66, head: 'NAV', detail: '4 items', tag: 'belowRight', ft: 0 },
    { key: 'h1', x: 48, y: 222, w: 700, h: 262, head: 'H1', detail: 'Grotesk 850 · −4%', tag: 'above', ft: 0 },
    { key: 'cta', x: 48, y: 632, w: 392, h: 88, head: 'CTA', detail: '#C4552D', tag: 'right', ft: 0 },
    { key: 'hero', x: 892, y: 216, w: 620, h: 532, head: 'HERO', detail: 'Product shot', tag: 'below', ft: 0 },
    { key: 'palette', x: 48, y: 756, w: 220, h: 66, head: 'PALETTE', detail: '4 glazes', tag: 'right', ft: 0 },
  ];
  // 触发 = 扫描线越过 bbox 下缘的那一帧；按下缘排序后钳制最小间隔 4f（两块同高的不会同帧弹）
  let prev = -99;
  for (const t of [...ts].sort((a, b) => a.y + a.h - (b.y + b.h))) {
    t.ft = Math.max(frameAtY(t.y + t.h), prev + 4);
    prev = t.ft;
  }
  return ts;
})();
const LAST_FIRE = Math.max(...TARGETS.map((t) => t.ft));

// ───────────── 页面内容：Hollis 陶器工作室官网 ─────────────
const Vase: React.FC = () => (
  <svg width={620} height={580} viewBox="0 0 620 580" style={{ position: 'absolute', left: 0, top: 0 }}>
    <defs>
      <linearGradient id="haf-vase" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#7d3418" />
        <stop offset="0.3" stopColor="#c45a31" />
        <stop offset="0.46" stopColor="#e9925f" />
        <stop offset="0.62" stopColor="#c2552c" />
        <stop offset="1" stopColor="#6e2c13" />
      </linearGradient>
      <linearGradient id="haf-bowl" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#a99a83" />
        <stop offset="0.4" stopColor="#f3ece1" />
        <stop offset="0.7" stopColor="#ddd1bf" />
        <stop offset="1" stopColor="#8f8069" />
      </linearGradient>
      <radialGradient id="haf-shadow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#5a3a1c" stopOpacity="0.38" />
        <stop offset="1" stopColor="#5a3a1c" stopOpacity="0" />
      </radialGradient>
      <clipPath id="haf-clip"><path d="M228 118 C226 150 214 168 196 196 C150 262 142 336 168 398 C186 444 214 466 268 468 C322 466 350 444 368 398 C394 336 386 262 340 196 C322 168 310 150 308 118 Z" /></clipPath>
      <linearGradient id="haf-glaze" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.18" />
        <stop offset="0.25" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
    </defs>
    {/* 接触影 */}
    <ellipse cx={268} cy={470} rx={150} ry={22} fill="url(#haf-shadow)" />
    <ellipse cx={452} cy={478} rx={98} ry={15} fill="url(#haf-shadow)" />
    {/* 陶瓶：窄口 · 鼓腹 · 收足 */}
    <path
      d="M228 118 C226 150 214 168 196 196 C150 262 142 336 168 398 C186 444 214 466 268 468 C322 466 350 444 368 398 C394 336 386 262 340 196 C322 168 310 150 308 118 Z"
      fill="url(#haf-vase)"
    />
    <path
      d="M228 118 C226 150 214 168 196 196 C150 262 142 336 168 398 C186 444 214 466 268 468 C322 466 350 444 368 398 C394 336 386 262 340 196 C322 168 310 150 308 118 Z"
      fill="url(#haf-glaze)"
    />
    <ellipse cx={268} cy={118} rx={40} ry={9} fill="#5e260f" />
    <ellipse cx={268} cy={116} rx={40} ry={8} fill="none" stroke="#e7a073" strokeWidth={2} opacity={0.7} />
    {/* 拉坯留下的轮纹：几道极淡的横向弧线，手作感 */}
    <g clipPath="url(#haf-clip)">
      {[176, 222, 270, 320, 370, 420].map((y, i) => (
        <path key={i} d={`M60 ${y} Q268 ${y + 14} 476 ${y}`} fill="none" stroke="#3e1608" strokeWidth={1.6} opacity={0.09} />
      ))}
    </g>
    {/* 釉面流挂的一道亮痕 */}
    <path d="M232 210 C214 262 206 330 222 400" fill="none" stroke="#ffd2b0" strokeWidth={6} strokeLinecap="round" opacity={0.28} />
    {/* 骨白小碗 */}
    <path d="M362 402 C366 452 404 478 452 478 C500 478 538 452 542 402 Z" fill="url(#haf-bowl)" />
    <ellipse cx={452} cy={402} rx={90} ry={14} fill="#efe6d8" />
    <ellipse cx={452} cy={404} rx={78} ry={9} fill="#cdbfa9" />
  </svg>
);

const Page: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, background: '#f8f2e9', fontFamily: FONT.sans, color: L.ink }}>
    {/* 浏览器顶栏 */}
    <div style={{ position: 'absolute', left: 0, top: 0, width: WW, height: CHROME, background: '#efe7db', borderBottom: `1px solid ${L.line}` }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ position: 'absolute', left: 24 + i * 22, top: 20, width: 12, height: 12, borderRadius: 6, background: alpha(L.ink, 0.16) }} />
      ))}
      <div style={{ position: 'absolute', left: WW / 2 - 170, top: 11, width: 340, height: 30, borderRadius: 8, background: alpha('#ffffff', 0.7), border: `1px solid ${L.line}`, font: `500 18px ${MONO}`, color: L.ink3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        hollis.studio
      </div>
    </div>
    {/* logo：圆形单字母印章 + 字标 */}
    <div style={{ position: 'absolute', left: 64, top: 76, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 46, height: 46, borderRadius: 23, background: L.ink, color: '#f8f2e9', display: 'flex', alignItems: 'center', justifyContent: 'center', font: `800 26px ${FONT.sans}`, letterSpacing: '-0.04em' }}>H</div>
      <div style={{ font: `800 40px ${FONT.sans}`, letterSpacing: '-0.045em' }}>Hollis</div>
    </div>
    {/* 导航 */}
    <div style={{ position: 'absolute', right: 64, top: 84, display: 'flex', gap: 46, font: `550 28px ${FONT.sans}`, color: L.ink2, letterSpacing: '-0.01em' }}>
      <span>Shop</span>
      <span>Studio</span>
      <span>Journal</span>
      <span style={{ color: L.ink }}>Cart (2)</span>
    </div>
    {/* H1 */}
    <div style={{ position: 'absolute', left: 60, top: 236, font: `850 120px ${FONT.sans}`, letterSpacing: '-0.045em', lineHeight: 1, whiteSpace: 'nowrap' }}>
      Made slowly.
      <br />
      <span style={{ color: TERRA }}>Used</span> daily.
    </div>
    {/* 正文 */}
    <div style={{ position: 'absolute', left: 64, top: 512, width: 700, font: `450 34px ${FONT.sans}`, lineHeight: 1.36, color: L.ink2, letterSpacing: '-0.012em' }}>
      Stoneware thrown by hand in small batches, glazed in colours pulled from the coast.
    </div>
    {/* CTA */}
    <div style={{ position: 'absolute', left: 64, top: 644, height: 64, padding: '0 34px', borderRadius: 32, background: TERRA, color: L.onAccent, display: 'flex', alignItems: 'center', gap: 14, font: `650 30px ${FONT.sans}`, letterSpacing: '-0.01em', boxShadow: `0 10px 24px -10px ${alpha('#7a2a10', 0.55)}, inset 0 1px 0 rgba(255,255,255,0.25)` }}>
      Shop the collection <span style={{ fontWeight: 500 }}>→</span>
    </div>
    {/* 釉色板 */}
    <div style={{ position: 'absolute', left: 64, top: 768, display: 'flex', alignItems: 'center', gap: 12 }}>
      {['#ebe5da', '#5d6c4f', TERRA, '#d6c3a5'].map((c, i) => (
        <div key={i} style={{ width: 42, height: 42, borderRadius: 21, background: `radial-gradient(circle at 35% 30%, ${alpha('#ffffff', 0.45)}, ${alpha('#ffffff', 0)} 55%), ${c}`, boxShadow: `inset 0 0 0 1px ${alpha(L.ink, 0.12)}` }} />
      ))}
    </div>
    {/* 产品图卡 */}
    <div style={{ position: 'absolute', left: 900, top: 224, width: 604, height: 516, borderRadius: 22, overflow: 'hidden', background: 'linear-gradient(180deg, #ecdcc7 0%, #e2cbae 62%, #d4b896 62.2%, #cdb08c 100%)' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 55% at 70% 18%, rgba(255,248,236,0.75) 0%, rgba(255,248,236,0) 70%)' }} />
      <div style={{ position: 'absolute', left: -8, top: -24 }}>
        <Vase />
      </div>
      <div style={{ position: 'absolute', left: 28, bottom: 26, padding: '10px 18px', borderRadius: 14, background: alpha('#fbf6ef', 0.86), font: `600 24px ${FONT.sans}`, color: L.ink, letterSpacing: '-0.01em' }}>
        Tide Vase <span style={{ color: L.ink3, fontWeight: 500 }}>· $68</span>
      </div>
    </div>
  </div>
);

// ───────────── 取景框 + 标签 ─────────────
const Bracket: React.FC<{ t: Target; frame: number }> = ({ t, frame }) => {
  const f = frame - t.ft;
  if (f < 0) return null;
  const s = springAt(frame, t.ft, { damping: 15, stiffness: 210 }); // 0→1（过冲 ~1.06）
  const pad = 76 * (1 - s); // 外扩 76px → 0（过冲时略收进 bbox）
  const op = Math.min(1, f / 3);
  const arm = 40 - 14 * ramp(frame, t.ft + 3, 12, EASE.out); // 臂长晚一拍收一档
  const flash = ramp(frame, t.ft + 3, 3, EASE.out) * (1 - ramp(frame, t.ft + 6, 12, EASE.out));
  const x = t.x - pad;
  const y = t.y - pad;
  const w = t.w + pad * 2;
  const h = t.h + pad * 2;
  const d = [
    `M${x} ${y + arm}V${y}H${x + arm}`,
    `M${x + w - arm} ${y}H${x + w}V${y + arm}`,
    `M${x + w} ${y + h - arm}V${y + h}H${x + w - arm}`,
    `M${x + arm} ${y + h}H${x}V${y + h - arm}`,
  ].join('');
  return (
    <>
      <div style={{ position: 'absolute', left: t.x, top: t.y, width: t.w, height: t.h, borderRadius: 6, background: alpha(MACHINE, 0.075 * flash), boxShadow: `inset 0 0 0 2px ${alpha(MACHINE, 0.4 * flash)}` }} />
      <svg width={WW} height={WH} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: op }}>
        <path d={d} fill="none" stroke={MACHINE} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </>
  );
};

const TAG_H = 50;
const CHAR_W = 0.6 * 32; // 32px 等宽字步进
const tagWidth = (t: Target) => Math.round((t.head.length + 3 + t.detail.length) * CHAR_W + 34);

const Label: React.FC<{ t: Target; frame: number }> = ({ t, frame }) => {
  const s0 = t.ft + 5;
  if (frame < s0) return null;
  const rise = ramp(frame, s0, 12, EASE.out);
  const pop = ramp(frame, s0, 4, EASE.out);
  const full = `${t.head} · ${t.detail}`;
  const typedF = Math.min(full.length, (frame - s0) * 2.2 + 1); // 机器在写：~2 字/帧
  const typed = Math.floor(typedF);
  const w = tagWidth(t); // 定位用的最终宽度
  const wNow = Math.min(w, typedF * CHAR_W + 34); // 签条随字长出来（右缘略领先于字）
  const typing = typed < full.length;
  let x = t.x;
  let y = t.y;
  if (t.tag === 'right') { x = t.x + t.w + 16; y = t.y + (t.h - TAG_H) / 2; }
  if (t.tag === 'above') { x = t.x; y = t.y - TAG_H - 10; }
  if (t.tag === 'below') { x = t.x; y = t.y + t.h + 12; }
  if (t.tag === 'belowRight') { x = t.x + t.w - w; y = t.y + t.h + 10; }
  const head = full.slice(0, Math.min(typed, t.head.length));
  const rest = typed > t.head.length ? full.slice(t.head.length, typed) : '';
  return (
    <div style={{
      position: 'absolute', left: t.tag === 'belowRight' ? x + w - wNow : x, top: y, width: wNow, height: TAG_H, borderRadius: 10, background: MACHINE,
      boxShadow: `0 10px 22px -10px ${alpha('#0c1a5a', 0.55)}, inset 0 1px 0 rgba(255,255,255,0.22)`,
      opacity: pop, overflow: 'hidden',
      transform: `translateY(${((1 - rise) * 8).toFixed(2)}px)`,
      display: 'flex', alignItems: 'center', paddingLeft: 17, boxSizing: 'border-box',
      font: `600 32px ${MONO}`, letterSpacing: 0, whiteSpace: 'pre', color: '#ffffff',
    }}>
      <span style={{ fontWeight: 750 }}>{head}</span>
      <span style={{ color: 'rgba(255,255,255,0.78)', fontWeight: 500 }}>{rest}</span>
      {typing && <span style={{ display: 'inline-block', width: 14, height: 30, marginLeft: 2, background: 'rgba(255,255,255,0.85)' }} />}
    </div>
  );
};

export const ScanlineAnnotateFocus: React.FC = () => {
  const frame = useCurrentFrame();
  const ly = scanY(frame);
  const lineOn = ramp(frame, SCAN0 - 4, 5, EASE.out) * (1 - ramp(frame, SCAN1, 8, EASE.exit));
  const fired = TARGETS.filter((t) => frame >= t.ft).length;
  const done = ramp(frame, LAST_FIRE + 8, 8, EASE.out);
  const push = 1 + 0.035 * ramp(frame, 0, SCANLINE_ANNOTATE_FOCUS_DURATION, EASE.swift); // 极缓推镜
  const statusIn = ramp(frame, 0, 10, EASE.out);
  const scanProg = Math.min(1, Math.max(0, (frame - SCAN0) / (SCAN1 - SCAN0)));

  return (
    <AbsoluteFill>
      <Stage look={L} keyLight={{ x: 0.3, y: 0.05 }} fill={{ x: 0.9, y: 0.95 }} vignette={0.2} />
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${push.toFixed(5)})`, transformOrigin: '50% 54%' }}>
        {/* ── 状态行（窗外上方）── */}
        <div style={{ position: 'absolute', left: WX, top: 84, width: WW, height: 48, opacity: statusIn, font: `600 30px ${MONO}`, color: L.ink, display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, marginRight: 16, background: done > 0.5 ? MACHINE : alpha(MACHINE, 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(frame / 3))), boxShadow: `0 0 0 6px ${alpha(MACHINE, 0.12)}` }} />
          <span style={{ color: done > 0.5 ? MACHINE : L.ink, letterSpacing: '0.06em' }}>{done > 0.5 ? 'BRAND READ' : 'READING'}</span>
          <span style={{ color: L.ink3, marginLeft: 18, fontWeight: 500 }}>hollis.studio</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 220, height: 6, borderRadius: 3, background: alpha(L.ink, 0.1), overflow: 'hidden' }}>
              <div style={{ width: `${(scanProg * 100).toFixed(2)}%`, height: '100%', background: MACHINE, borderRadius: 3 }} />
            </div>
            <span style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}>
              <span style={{ color: L.ink3, fontWeight: 500 }}>SIGNALS </span>
              <span style={{ color: fired === TARGETS.length ? MACHINE : L.ink }}>{String(fired).padStart(2, '0')}</span>
              <span style={{ color: L.ink3 }}> / {String(TARGETS.length).padStart(2, '0')}</span>
            </span>
          </div>
        </div>

        {/* ── 浏览器窗：页面 + 扫描余晖（裁进窗内）── */}
        <div style={{ position: 'absolute', left: WX, top: WY, width: WW, height: WH, borderRadius: 20, overflow: 'hidden', boxShadow: `${softShadow(30, { color: L.shadow, strength: 1.1 })}, 0 0 0 1px ${alpha(L.ink, 0.08)}` }}>
          <Page />
          {/* 已读余晖：扫描线身后 140px 的淡蓝洗色 + 点阵（机器"读过"的痕迹） */}
          {lineOn > 0.01 && (
            <>
              <div style={{
                position: 'absolute', left: 0, width: WW, top: ly - 140, height: 140, opacity: lineOn,
                background: `linear-gradient(180deg, ${alpha(MACHINE, 0)} 0%, ${alpha(MACHINE, 0.05)} 60%, ${alpha(MACHINE, 0.13)} 100%)`,
              }} />
              <div style={{
                position: 'absolute', left: 0, width: WW, top: ly - 90, height: 90, opacity: lineOn * 0.8,
                backgroundImage: `radial-gradient(circle, ${alpha(MACHINE, 0.55)} 1.3px, transparent 1.9px)`, backgroundSize: '18px 18px', backgroundPosition: '0 0',
                WebkitMaskImage: 'linear-gradient(180deg, transparent, #000)', maskImage: 'linear-gradient(180deg, transparent, #000)',
              }} />
              <div style={{
                position: 'absolute', left: 0, width: WW, top: ly - 1.5, height: 3, opacity: lineOn, background: MACHINE,
                boxShadow: `0 0 10px ${alpha(MACHINE, 0.55)}, 0 0 28px ${alpha(MACHINE, 0.3)}`,
              }} />
            </>
          )}
        </div>

        {/* ── 窗框两侧游标：随线滑动，左侧读出 Y ── */}
        {lineOn > 0.01 && (
          <div style={{ opacity: lineOn }}>
            <svg width={22} height={26} viewBox="0 0 22 26" style={{ position: 'absolute', left: WX - 30, top: WY + ly - 13 }}>
              <path d="M2 2 L20 13 L2 24 Z" fill={MACHINE} />
            </svg>
            <svg width={22} height={26} viewBox="0 0 22 26" style={{ position: 'absolute', left: WX + WW + 8, top: WY + ly - 13 }}>
              <path d="M20 2 L2 13 L20 24 Z" fill={MACHINE} />
            </svg>
            <div style={{ position: 'absolute', left: WX - 150, top: WY + ly - 14, width: 112, textAlign: 'right', font: `600 22px ${MONO}`, color: MACHINE, fontVariantNumeric: 'tabular-nums' }}>
              Y {String(Math.max(0, Math.round(ly))).padStart(4, '0')}
            </div>
          </div>
        )}

        {/* ── 取景框与标签（页面坐标，叠在窗上；不裁切，标签可略出框）── */}
        <div style={{ position: 'absolute', left: WX, top: WY, width: WW, height: WH }}>
          {TARGETS.map((t) => <Bracket key={t.key} t={t} frame={frame} />)}
          {TARGETS.map((t) => <Label key={t.key} t={t} frame={frame} />)}
        </div>
      </div>
    </AbsoluteFill>
  );
};
