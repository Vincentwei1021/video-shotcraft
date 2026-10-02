// bubble-swarm-takeover —— loom-ai 9–12s
// 手法不变：珠光气泡群从画外飘入越涨越大遮满整屏，页面同步被"洗白"，遮蔽峰值藏硬切，气泡向外散开后已是
// 新场景；混入 i18n 文字胶囊变体（≤3 枚，挂在宿主气泡上随漂）。
//
// 第二轮重设计（设计决定）
// - look = porcelain（冷白 · 钴蓝）。转场被赋予语义：虚构本地化产品 Verbatim 的落地页，泡群带着
//   "Hallo! / ¡Hola! / こんにちは" 漫过页面，散开后同一张页面已经是德文版（语言胶囊 EN → DE，
//   右侧语言进度从"翻译中"全部变成 100%）——幕布本身就是功能演示。
// - 页面按镜头重做：浏览器窗 1600×900 占画宽 83%，左栏 104px 两行标题 + 40px 说明 + CTA，
//   右栏一张语言覆盖率卡（四行：代码胶囊 / 语言名 / 进度条 / 百分比，32px 级）。
// - 气泡换成真正的肥皂膜：中心几乎透明、边缘薄膜虹彩（钴蓝 / 紫 / 粉 / 青 / 金的 conic 环）、
//   左上一块窗格形镜面反光 + 右下回光、外缘一圈极淡钴蓝发丝线，在浅底上也立得住；
//   6 颗巨型泡更"厚"（珠光体色更实）按 2×3 网格兜底遮满；远 / 中 / 近三层景深（blur 6 / 0 / 10）。
// - 节奏：涨潮 ease-out 慢进（6–72f）→ 峰值 74f 藏切 → 76–82f 全体先向内收 3%（预备）→
//   82–112f 径向 ease-in 加速飞散 + 缩小 → 新页面从 1.05 软落回 1，标题逐词由虚到实。
//
// 时间表（30fps，150f）
//   0–20    英文页已在画面（第 0 帧即有内容），极缓推近；6f 起远层小泡从四边漂入
//   6–72    泡群涨潮（入场错峰 6–46f，巨型泡 22–38f），胶囊在宿主入场后 6f 弹出（overshoot）
//   42–70   洗白层 0 → 0.92（smooth）
//   74      峰值硬切：英文页 → 德文页
//   76–82   预备：全体气泡向心收 3%
//   82–112  散开：沿径向外推 1800px（ease-in）+ 缩到 0.62 + 尾段淡出；洗白 84–110 退去
//   92–124  德文页落定：页面 1.05 → 1（out 28f），标题逐词 blur 揭示，进度条已满、✓ 依次亮起
//   124–150 hold 26f：干净的德文版海报
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { EASE, FONT, mix, ramp, softShadow } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';

const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const BUBBLE_SWARM_TAKEOVER_DURATION = 150;

const L = LOOKS.porcelain;
const PEAK = 74; // 遮蔽峰值帧（藏切点）
const GATHER = 76; // 预备内收起点
const BURST = 82; // 飞散起点
const BURST_END = 112;
const W = 1920;
const H = 1080;
const CX = W / 2;
const CY = H / 2;

// 薄膜虹彩色（钴蓝 / 紫 / 粉 / 青 / 金），每颗泡起始相位不同
const FILM = ['#5f86ff', '#a98bff', '#ff8cc6', '#62dccf', '#ffd27a', '#5f86ff'];
const TINT = ['#e6edff', '#efe8ff', '#ffeaf4', '#e4f7f5']; // 体色：冷蓝 / 淡紫 / 淡粉 / 淡青

type BubbleSpec = {
  startX: number; startY: number; targetX: number; targetY: number;
  r: number; t0: number; blur: number; z: number; hue: number;
  wobblePhase: number; wobbleAmp: number; giant: boolean;
};

const makeBubbles = (): BubbleSpec[] => {
  const specs: BubbleSpec[] = [];
  for (let i = 0; i < 34; i++) {
    const rng = mulberry32(1000 + i * 97);
    const edge = Math.floor(rng() * 4);
    const along = rng();
    let startX = 0, startY = 0;
    if (edge === 0) { startX = along * W; startY = -340; }
    if (edge === 1) { startX = W + 340; startY = along * H; }
    if (edge === 2) { startX = along * W; startY = H + 340; }
    if (edge === 3) { startX = -340; startY = along * H; }
    const layer = i % 3; // 0 远 1 中 2 近
    const r = layer === 0 ? 40 + rng() * 50 : layer === 1 ? 95 + rng() * 85 : 200 + rng() * 140;
    specs.push({
      startX, startY,
      targetX: 140 + rng() * (W - 280), targetY: 100 + rng() * (H - 200),
      r, t0: 6 + Math.pow(rng(), 1.4) * 40, // 先密后疏
      blur: layer === 0 ? 6 : layer === 1 ? 0 : 10,
      z: layer, hue: rng() * 360,
      wobblePhase: rng() * Math.PI * 2, wobbleAmp: 10 + rng() * 20, giant: false,
    });
  }
  // 6 颗巨型泡：2×3 网格落点，峰值全覆盖的保底
  const grid = [[330, 290], [960, 230], [1590, 320], [320, 810], [980, 860], [1610, 790]];
  grid.forEach(([gx, gy], i) => {
    const rng = mulberry32(7000 + i * 131);
    const edge = i % 4;
    let startX = 0, startY = 0;
    if (edge === 0) { startX = gx; startY = -640; }
    if (edge === 1) { startX = W + 640; startY = gy; }
    if (edge === 2) { startX = gx; startY = H + 640; }
    if (edge === 3) { startX = -640; startY = gy; }
    specs.push({
      startX, startY, targetX: gx, targetY: gy,
      r: 440 + rng() * 130, t0: 22 + rng() * 16, blur: 2.5, z: 2, hue: rng() * 360,
      wobblePhase: rng() * Math.PI * 2, wobbleAmp: 8, giant: true,
    });
  });
  return specs;
};
const BUBBLES = makeBubbles();

const CAPSULES = [
  { text: 'Hallo!', code: 'DE', idx: 5 },
  { text: '¡Hola!', code: 'ES', idx: 14 },
  { text: 'こんにちは', code: 'JA', idx: 19 },
];

const inP = (s: BubbleSpec, f: number) => ramp(f, s.t0, PEAK - s.t0, EASE.out);
const gatherP = (f: number) => ramp(f, GATHER, BURST - GATHER, EASE.smooth) * (1 - ramp(f, BURST, 8, EASE.out));
const outP = (f: number) => ramp(f, BURST, BURST_END - BURST, EASE.exit);

const bubblePos = (s: BubbleSpec, f: number) => {
  const pIn = inP(s, f);
  const d = outP(f);
  const g = gatherP(f);
  const wx = Math.sin(f * 0.085 + s.wobblePhase) * s.wobbleAmp * pIn;
  const wy = Math.cos(f * 0.067 + s.wobblePhase * 1.3) * s.wobbleAmp * 0.7 * pIn;
  const dx = s.targetX - CX, dy = s.targetY - CY;
  const dl = Math.max(Math.hypot(dx, dy), 60);
  const bx = mix(s.startX, s.targetX, pIn) + wx;
  const by = mix(s.startY, s.targetY, pIn) + wy;
  // 预备：先向心收 3%；飞散：沿径向外推
  return {
    x: CX + (bx - CX) * (1 - 0.03 * g) + (dx / dl) * d * 1800,
    y: CY + (by - CY) * (1 - 0.03 * g) + (dy / dl) * d * 1800,
  };
};

const Bubble: React.FC<{ spec: BubbleSpec; frame: number }> = ({ spec, frame }) => {
  const pIn = inP(spec, frame);
  if (pIn <= 0) return null;
  const d = outP(frame);
  const { x, y } = bubblePos(spec, frame);
  const a = bubblePos(spec, frame - 0.5), b = bubblePos(spec, frame + 0.5);
  const vx = b.x - a.x, vy = b.y - a.y;
  const speed = Math.hypot(vx, vy);
  const scale = mix(0.22, 1, pIn) * (1 - d * 0.38) * (1 - 0.02 * gatherP(frame));
  const opacity = ramp(frame, spec.t0, 7, EASE.out) * interpolate(d, [0.55, 1], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (opacity <= 0.01) return null;
  const R = spec.r * scale;
  const D = R * 2;
  // 方向性拖影：沿速度方向拉长、垂直微收
  const stretch = Math.min(0.3, speed * 0.004);
  const deg = (Math.atan2(vy, vx) * 180) / Math.PI;
  const blur = spec.blur + Math.min(4, speed * 0.035);
  const body = spec.giant ? 0.74 : 0.14; // 巨型泡更"厚"，峰值靠它遮满
  const rot = spec.hue + frame * 0.8;
  const tint = TINT[Math.floor(spec.hue / 90) % TINT.length]; // 体色冷暖微差
  return (
    <div style={{
      position: 'absolute', left: x - R, top: y - R, width: D, height: D, opacity,
      transform: stretch > 0.004 ? `rotate(${deg}deg) scale(${1 + stretch}, ${1 / (1 + stretch * 0.35)}) rotate(${-deg}deg)` : undefined,
      filter: blur > 0.6 ? `blur(${blur.toFixed(2)}px)` : undefined,
    }}>
      {/* 体色：中心近透明的珠光 → 外缘染一层冷蓝 → 亮边 */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background:
          `radial-gradient(circle closest-side at 46% 42%, rgba(250,252,255,${body}) 0%, ${alpha(tint, body * 0.85 + 0.06)} 58%, ` +
          `${alpha(tint, 0.3 + body * 0.45)} 84%, rgba(255,255,255,0.9) 97%, rgba(255,255,255,0) 100%)`,
        boxShadow: `inset 0 0 ${(R * 0.12).toFixed(1)}px rgba(255,255,255,0.7), 0 0 0 1px ${alpha(L.accent, 0.1)}, 0 ${(R * 0.08).toFixed(1)}px ${(R * 0.3).toFixed(1)}px ${alpha('#2a3f8f', 0.07)}`,
      }} />
      {/* 薄膜虹彩：conic 色环只留外缘环带，随时间缓转 */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%', opacity: 0.85,
        background: `conic-gradient(from ${rot.toFixed(1)}deg, ${FILM.join(', ')})`,
        WebkitMaskImage: 'radial-gradient(circle closest-side, transparent 62%, rgba(0,0,0,0.35) 80%, rgba(0,0,0,0.95) 94%, transparent 100%)',
        maskImage: 'radial-gradient(circle closest-side, transparent 62%, rgba(0,0,0,0.35) 80%, rgba(0,0,0,0.95) 94%, transparent 100%)',
      }} />
      {/* 镜面反光：左上一块窗格形高光 + 右下一弯回光 */}
      <div style={{
        position: 'absolute', left: '20%', top: '15%', width: '24%', height: '16%', borderRadius: '45% 45% 40% 40%',
        transform: 'rotate(-32deg)',
        background: 'radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.6) 45%, rgba(255,255,255,0) 75%)',
      }} />
      <div style={{
        position: 'absolute', inset: '6%', borderRadius: '50%',
        background: 'radial-gradient(ellipse 34% 20% at 70% 84%, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0) 100%)',
      }} />
    </div>
  );
};

// ───────────── 落地页（EN / DE 两版同版式） ─────────────
const LANGS = [
  { code: 'DE', name: 'German', a: 0.38 },
  { code: 'FR', name: 'French', a: 0.62 },
  { code: 'JA', name: 'Japanese', a: 0.21 },
  { code: 'ES', name: 'Spanish', a: 0.47 },
];
const COPY = {
  en: { locale: 'EN', title: 'Launch in every\nlanguage.', sub: 'Translate, review and ship your product to 42 markets at once.', cta: 'Start translating', nav: ['Product', 'Pricing', 'Docs'] },
  de: { locale: 'DE', title: 'In jeder Sprache\nlaunchen.', sub: 'Übersetzen, prüfen und in 42 Märkte gleichzeitig ausliefern.', cta: 'Jetzt übersetzen', nav: ['Produkt', 'Preise', 'Doku'] },
};

const Page: React.FC<{ lang: 'en' | 'de'; frame: number }> = ({ lang, frame }) => {
  const c = COPY[lang];
  const de = lang === 'de';
  const t = frame - PEAK;
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT.sans, color: L.ink }}>
      {/* 导航 */}
      <div style={{ position: 'absolute', left: 80, right: 80, top: 44, height: 64, display: 'flex', alignItems: 'center', gap: 44 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: L.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 22 }}>V</div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em' }}>Verbatim</div>
        </div>
        {c.nav.map((n) => <div key={n} style={{ fontSize: 26, fontWeight: 500, color: L.ink2 }}>{n}</div>)}
        <div style={{
          marginLeft: 'auto', height: 52, padding: '0 20px', borderRadius: 26, display: 'flex', alignItems: 'center', gap: 12,
          background: de ? L.accent : L.surface2, color: de ? '#fff' : L.ink, boxShadow: de ? 'none' : `inset 0 0 0 1.5px ${L.line}`,
          fontFamily: FONT.mono, fontSize: 24, fontWeight: 700,
        }}>
          <svg width={22} height={22} viewBox="0 0 22 22"><circle cx={11} cy={11} r={9} fill="none" stroke="currentColor" strokeWidth={2} /><path d="M2 11h18M11 2c3 3 3 15 0 18M11 2c-3 3-3 15 0 18" fill="none" stroke="currentColor" strokeWidth={1.6} /></svg>
          {c.locale}
        </div>
      </div>
      {/* 左栏标题 */}
      <div style={{ position: 'absolute', left: 80, top: 210, width: 860 }}>
        <div style={{ ...type(26, 700, { caps: true }), color: L.accent, letterSpacing: '0.14em' }}>{de ? 'Lokalisierung' : 'Localization'}</div>
        <div style={{ ...type(de ? 96 : 104, 800), marginTop: 22, letterSpacing: '-0.042em', lineHeight: 1.0 }}>
          {de ? <TextReveal text={c.title} by="word" variant="blur" start={PEAK + 22} each={16} gap={3} /> : c.title.split('\n').map((l) => <div key={l}>{l}</div>)}
        </div>
        <div style={{ ...type(36, 450), color: L.ink2, marginTop: 34, width: 700, lineHeight: 1.32, opacity: de ? ramp(frame, PEAK + 34, 14, EASE.out) : 1 }}>{c.sub}</div>
        <div style={{ display: 'flex', gap: 18, marginTop: 48, opacity: de ? ramp(frame, PEAK + 40, 14, EASE.out) : 1 }}>
          <div style={{ height: 76, padding: '0 36px', borderRadius: 38, background: L.ink, color: '#fff', display: 'flex', alignItems: 'center', fontSize: 30, fontWeight: 650 }}>{c.cta}</div>
          <div style={{ height: 76, padding: '0 32px', borderRadius: 38, boxShadow: `inset 0 0 0 2px ${L.line}`, display: 'flex', alignItems: 'center', fontSize: 30, fontWeight: 600, color: L.ink2 }}>Demo</div>
        </div>
      </div>
      {/* 右栏：语言覆盖率卡 */}
      <div style={{
        position: 'absolute', right: 80, top: 196, width: 560, borderRadius: 28, padding: '34px 36px 30px',
        background: L.surface, boxShadow: `inset 0 0 0 1.5px ${L.line}, ${softShadow(22, { color: L.shadow, strength: 0.7 })}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <div style={{ fontSize: 30, fontWeight: 750, letterSpacing: '-0.02em' }}>{de ? 'Übersetzungen' : 'Translations'}</div>
          <div style={{ marginLeft: 'auto', fontSize: 24, color: L.ink3, fontFamily: FONT.mono }}>12,480 strings</div>
        </div>
        {LANGS.map((l, k) => {
          const done = de ? ramp(frame, PEAK + 30 + k * 4, 12, EASE.overshoot) : 0;
          const v = de ? 1 : l.a + 0.04 * Math.sin(frame / 14 + k);
          return (
            <div key={l.code} style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 30 }}>
              <div style={{ width: 62, height: 40, borderRadius: 10, background: L.surface2, boxShadow: `inset 0 0 0 1.5px ${L.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.mono, fontSize: 20, fontWeight: 700, color: L.ink2 }}>{l.code}</div>
              <div style={{ width: 150, fontSize: 28, fontWeight: 600 }}>{l.name}</div>
              <div style={{ flex: 1, height: 10, borderRadius: 5, background: L.surface2, overflow: 'hidden' }}>
                <div style={{ width: `${(v * 100).toFixed(1)}%`, height: '100%', borderRadius: 5, background: de ? L.accent2 : L.accent }} />
              </div>
              <div style={{ width: 56, textAlign: 'right', fontSize: 24, fontWeight: 650, fontFamily: FONT.mono, color: de ? L.accent2 : L.ink3 }}>
                {de ? (
                  <span style={{ display: 'inline-block', transform: `scale(${done.toFixed(3)})` }}>✓</span>
                ) : `${Math.round(v * 100)}%`}
              </div>
            </div>
          );
        })}
      </div>
      {/* t 用于让德文页底部状态条在落定后出现 */}
      {de && t > 0 && (
        <div style={{
          position: 'absolute', left: 80, bottom: 56, display: 'flex', alignItems: 'center', gap: 14, fontSize: 26, color: L.ink2,
          opacity: ramp(frame, PEAK + 46, 14, EASE.out),
        }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: L.accent2 }} />
          Published to 42 locales · 1.2s
        </div>
      )}
    </div>
  );
};

// 浏览器窗口（两版共用一个窗体，只换内容）
const WIN = { w: 1600, h: 900 };

export const BubbleSwarmTakeover: React.FC = () => {
  const frame = useCurrentFrame();
  const whiteout = interpolate(frame, [42, 70, 84, 110], [0, 0.95, 0.95, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.smooth,
  });
  // 页面推镜：英文页缓推近 → 藏切 → 德文页从 1.05 软落回 1
  const pageScale = frame < PEAK
    ? mix(1, 1.035, ramp(frame, 0, PEAK, EASE.swift))
    : mix(1.05, 1, ramp(frame, PEAK, 46, EASE.out));
  const lang = frame < PEAK ? 'en' : 'de';
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.3, y: 0.0 }} fill={{ x: 0.9, y: 0.95 }} />
      {/* 浏览器窗 */}
      <div style={{
        position: 'absolute', left: (W - WIN.w) / 2, top: (H - WIN.h) / 2 + 10, width: WIN.w, height: WIN.h,
        transform: `scale(${pageScale.toFixed(4)})`, borderRadius: 26, overflow: 'hidden',
        background: 'linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%)',
        boxShadow: `inset 0 0 0 1.5px ${L.line}, ${softShadow(40, { color: L.shadow, strength: 0.9 })}`,
      }}>
        <div style={{ height: 54, display: 'flex', alignItems: 'center', gap: 10, padding: '0 22px', borderBottom: `1.5px solid ${L.line}`, background: L.surface2 }}>
          {[0, 1, 2].map((k) => <div key={k} style={{ width: 14, height: 14, borderRadius: 7, background: alpha(L.ink, 0.14) }} />)}
          <div style={{
            margin: '0 auto', height: 34, width: 520, borderRadius: 17, background: '#fff', boxShadow: `inset 0 0 0 1.5px ${L.line}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.mono, fontSize: 19, color: L.ink3,
          }}>verbatim.app/{lang === 'en' ? 'en' : 'de'}</div>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 54, bottom: 0 }}>
          <Page lang={lang} frame={frame} />
        </div>
      </div>
      {/* 洗白层：压在页面之上、气泡之下的冷调珠光白纱 */}
      <AbsoluteFill style={{
        opacity: whiteout,
        background: 'radial-gradient(ellipse 70% 60% at 30% 30%, #ffffff 0%, rgba(255,255,255,0) 70%), radial-gradient(ellipse 60% 60% at 80% 85%, #fbeef8 0%, rgba(251,238,248,0) 70%), linear-gradient(160deg, #f4f7ff 0%, #eef1ff 55%, #f3eefb 100%)',
      }} />
      {BUBBLES.filter((b) => b.z < 2).map((b, i) => <Bubble key={`m${i}`} spec={b} frame={frame} />)}
      {BUBBLES.filter((b) => b.z === 2).map((b, i) => <Bubble key={`n${i}`} spec={b} frame={frame} />)}
      {/* i18n 胶囊：挂在中层宿主气泡上随漂 + 微转；画在最上层，峰值时也读得清 */}
      {CAPSULES.map((c, i) => {
        const host = BUBBLES[c.idx];
        const pIn = inP(host, frame);
        if (pIn <= 0) return null;
        const pos = bubblePos(host, frame);
        const pop = ramp(frame, host.t0 + 6, 18, EASE.overshoot);
        const d = outP(frame);
        const op = Math.min(1, ramp(frame, host.t0 + 6, 8, EASE.out)) * interpolate(d, [0.45, 0.9], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        if (op <= 0.01) return null;
        const wob = Math.sin(frame * 0.08 + host.wobblePhase + 1.3);
        return (
          <div key={i} style={{
            position: 'absolute', left: pos.x + 40, top: pos.y - host.r * 0.75 * mix(0.22, 1, pIn), opacity: op,
            transform: `translate(-50%, -50%) scale(${mix(0.5, 1, pop).toFixed(4)}) rotate(${(wob * 3).toFixed(2)}deg)`,
            display: 'flex', alignItems: 'center', gap: 16, padding: '14px 32px 14px 16px', borderRadius: 60,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(244,247,255,0.95))',
            boxShadow: `inset 0 0 0 1.5px ${alpha(L.accent, 0.14)}, inset 0 1px 0 #fff, ${softShadow(26, { color: L.shadow, strength: 0.8 })}`,
            fontFamily: FONT.sans, whiteSpace: 'nowrap',
          }}>
            <div style={{ height: 44, padding: '0 14px', borderRadius: 22, display: 'flex', alignItems: 'center', background: L.accent, color: '#fff', fontFamily: FONT.mono, fontSize: 22, fontWeight: 700 }}>{c.code}</div>
            <div style={{ fontSize: 50, fontWeight: 750, color: L.ink, letterSpacing: '-0.025em', lineHeight: 1 }}>{c.text}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
