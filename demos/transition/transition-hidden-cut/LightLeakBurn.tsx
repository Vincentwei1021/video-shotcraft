// light-leak-burn〔转场〕：一团暖色胶片漏光从右上角斜扫入画，亮度顶峰时吞掉旧画面七成以上（高光溢出、
// 对比度被冲淡），光峰帧硬切新画面，光沿对角线退散时新画面已在光下就位——比白闪柔、有方向、有温度。
//
// 第二轮重设计（暖黑电影感 · 相机 App「Ondo」的模式切换："从夜到黄昏"）：
// - look = ember（暖黑 · 余烬橙 · 琥珀金）。A / B 是同一个取景器里的两张全出血"照片"——同一道山脊剪影：
//   A 夜景（冷蓝黑天、星点、新月、山间一盏暖窗灯）配「Made for the dark.」；
//   B 黄昏（赤橙天空、半落的太阳、暖色雾带）配「Made for the light.」。漏光本身就是"天亮了"——光效即语义。
// - 取景器 UI 让它是产品而不是壁纸：四角取景框、顶部等宽曝光参数、底部模式拨轮（NIGHT / GOLDEN HOUR / PORTRAIT），
//   光峰后高亮滑块从 NIGHT 滑到 GOLDEN HOUR（swift 曲线 14f）。
// - 漏光三段色温：白热核 #fff3dc → 琥珀 #ffb347 → 余烬橙 #ff5a1f → 外缘赭红；全部是沿扫掠对角线拉长、转 −34° 的
//   径向渐变椭圆（screen 叠加，不用 blur 滤镜——渐变本身就软，且便宜）；右缘另有一道"片门溢光"线性光带
//   随光强长出（真漏光是从画框边缘漏进来的）。峰值时页面 brightness ↑ / contrast ↓ / saturate ↓ = 被烧穿。
// - 光强包络：爬升 ease-in 27f（蓄力）→ 52f 峰值藏切 → ease-out 43f 收敛（余温）；热核 = intensity³，只在峰值附近烧起来。
//
// 时间表（30fps，共 130f）：
//   0–24    A 夜景：标题逐词从线下升起（4–24），星点闪烁，镜头极缓推进 1 → 1.02
//   24–52   漏光从右上角爬入，强度 ease-in 爬升，夜景被逐渐冲淡
//   52      光峰帧：画面七成以上烧白，硬切 A → B
//   52–95   光沿对角线退向左下并衰减；B 镜头 1.04 → 1 落定（out）；54–68 模式滑块滑到 GOLDEN HOUR；
//           62–86 B 标题逐词升起（在余温里）
//   95–130  hold 35f：太阳泛光极缓呼吸、取景器曝光数字静止
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, Vignette, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, TextReveal, alpha, type } from '../../_fixtures/Look';

export const LIGHT_LEAK_BURN_DURATION = 130;

const L = LOOKS.ember;
const W = 1920;
const H = 1080;
const PAD = 120;
const LEAK_IN = 24;
const PEAK = 52; // 光峰帧 = 藏切点
const LEAK_OUT = 95;

const h = (n: number) => {
  const s = Math.sin(n * 127.3) * 43758.5453;
  return s - Math.floor(s);
};

// 同一道山脊（两张照片共用，换景时构图不跳）
const RIDGE_FAR = 'M0 640 C 180 600 300 560 420 580 C 560 604 640 520 780 500 C 900 484 1000 560 1120 570 C 1260 582 1380 500 1520 490 C 1680 480 1800 560 1920 548 L1920 1080 L0 1080 Z';
const RIDGE_MID = 'M0 760 C 160 700 300 690 440 720 C 600 756 720 650 880 640 C 1040 630 1140 720 1300 730 C 1460 740 1600 660 1760 670 C 1840 676 1890 700 1920 706 L1920 1080 L0 1080 Z';
const RIDGE_NEAR = 'M0 880 C 220 820 420 830 600 860 C 800 892 980 800 1180 812 C 1380 824 1560 900 1760 880 C 1840 872 1890 864 1920 862 L1920 1080 L0 1080 Z';

const STARS = Array.from({ length: 70 }, (_, i) => ({
  x: h(i * 3.1 + 1) * W, y: h(i * 5.7 + 2) * 520, r: 0.8 + h(i * 7.3) * 1.8, p: h(i * 11.1) * 6.28,
}));

const Night: React.FC<{ f: number }> = ({ f }) => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0 }}>
    <defs>
      <linearGradient id="nsky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#080a12" />
        <stop offset="0.45" stopColor="#111523" />
        <stop offset="0.62" stopColor="#1f1d2a" />
      </linearGradient>
      <radialGradient id="nmoon" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#e9e2d2" stopOpacity={0.35} />
        <stop offset="1" stopColor="#e9e2d2" stopOpacity={0} />
      </radialGradient>
      <mask id="ncres">
        <rect width={W} height={H} fill="#000" />
        <circle cx={1450} cy={250} r={46} fill="#fff" />
        <circle cx={1470} cy={238} r={42} fill="#000" />
      </mask>
    </defs>
    <rect width={W} height={H} fill="url(#nsky)" />
    {STARS.map((s, i) => (
      <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#f2ecff" opacity={0.25 + 0.55 * (0.5 + 0.5 * Math.sin(f / 7 + s.p))} />
    ))}
    <circle cx={1450} cy={250} r={170} fill="url(#nmoon)" />
    <rect width={W} height={H} fill="#efe8d8" mask="url(#ncres)" />
    <path d={RIDGE_FAR} fill="#1a1c28" />
    <path d={RIDGE_MID} fill="#11121b" />
    <path d={RIDGE_NEAR} fill="#07070b" />
    {/* 山间一盏暖窗灯：夜景里唯一的暖色，预告漏光 */}
    <circle cx={1606} cy={898} r={28} fill={alpha(L.accent2, 0.2)} />
    <rect x={1600} y={890} width={12} height={10} rx={2} fill={L.accent2} />
  </svg>
);

const Golden: React.FC<{ f: number }> = ({ f }) => {
  const b = 1 + 0.03 * Math.sin(f / 18);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <linearGradient id="gsky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a110b" />
          <stop offset="0.3" stopColor="#8a3218" />
          <stop offset="0.5" stopColor="#e0702e" />
          <stop offset="0.62" stopColor="#ffb661" />
        </linearGradient>
        <radialGradient id="gsun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff4d8" stopOpacity={0.95} />
          <stop offset="0.25" stopColor="#ffd590" stopOpacity={0.55} />
          <stop offset="1" stopColor="#ff9a4a" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="ghaze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb661" stopOpacity={0} />
          <stop offset="0.5" stopColor="#ffb661" stopOpacity={0.35} />
          <stop offset="1" stopColor="#ffb661" stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#gsky)" />
      <circle cx={1300} cy={600} r={420 * b} fill="url(#gsun)" />
      <circle cx={1300} cy={600} r={96} fill="#fff6e2" />
      <path d={RIDGE_FAR} fill="#b04a24" />
      <rect x={0} y={520} width={W} height={160} fill="url(#ghaze)" />
      <path d={RIDGE_MID} fill="#6a2412" />
      <path d={RIDGE_NEAR} fill="#2a0d06" />
    </svg>
  );
};

const MODES = ['NIGHT', 'GOLDEN HOUR', 'PORTRAIT'];
const MODE_X = [0, 220, 532]; // 每项左缘（相对拨轮）
const MODE_W = [172, 272, 228];

// 取景器 UI（两页共用，只有数值与模式不同）
const Viewfinder: React.FC<{ golden: boolean; slide: number }> = ({ golden, slide }) => {
  const corner = (x: number, y: number, sx: number, sy: number) => (
    <div style={{
      position: 'absolute', left: x, top: y, width: 56, height: 56,
      borderTop: sy > 0 ? `3px solid ${alpha(L.ink, 0.8)}` : undefined, borderBottom: sy < 0 ? `3px solid ${alpha(L.ink, 0.8)}` : undefined,
      borderLeft: sx > 0 ? `3px solid ${alpha(L.ink, 0.8)}` : undefined, borderRight: sx < 0 ? `3px solid ${alpha(L.ink, 0.8)}` : undefined,
    }} />
  );
  const hx = mix(MODE_X[0], MODE_X[1], slide);
  const hw = mix(MODE_W[0], MODE_W[1], slide);
  return (
    <>
      {corner(72, 72, 1, 1)}
      {corner(W - 128, 72, -1, 1)}
      {corner(72, H - 128, 1, -1)}
      {corner(W - 128, H - 128, -1, -1)}
      <div style={{
        position: 'absolute', left: PAD + 36, right: PAD + 36, top: 96, display: 'flex', justifyContent: 'space-between',
        fontFamily: FONT.mono, fontSize: 28, fontWeight: 600, letterSpacing: '0.08em', color: alpha(L.ink, 0.82),
      }}>
        <span><span style={{ color: L.accent }}>●</span>&nbsp; ONDO</span>
        <span>{golden ? 'ISO 100 · 1/500 · ƒ2.8' : 'ISO 3200 · 1/8 · ƒ1.6'}</span>
        <span>{golden ? '4K · 24' : 'RAW · 24'}</span>
      </div>
      {/* 模式拨轮 */}
      <div style={{ position: 'absolute', left: (W - 760) / 2, top: H - 156, width: 760, height: 64 }}>
        <div style={{
          position: 'absolute', left: hx, top: 0, width: hw, height: 64, borderRadius: 32,
          background: alpha('#140805', 0.55), border: `1.5px solid ${alpha(L.accent2, 0.55)}`,
          boxShadow: `0 0 24px ${alpha(L.accent2, 0.25)}`,
        }} />
        {MODES.map((m, i) => {
          const on = i === 0 ? 1 - slide : i === 1 ? slide : 0;
          return (
            <div key={m} style={{
              position: 'absolute', left: MODE_X[i], width: MODE_W[i], top: 0, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FONT.sans, fontSize: 28, fontWeight: 700, letterSpacing: '0.14em',
              color: on > 0.5 ? L.accent2 : alpha(L.ink, 0.62),
            }}>{m}</div>
          );
        })}
      </div>
    </>
  );
};

export const LightLeakBurn: React.FC = () => {
  const frame = useCurrentFrame();
  const golden = frame > PEAK;

  // 光强包络：ease-in 爬升 → 峰值 → ease-out 收敛
  const intensity = frame <= PEAK
    ? ramp(frame, LEAK_IN, PEAK - LEAK_IN, (t) => t * t)
    : 1 - ramp(frame, PEAK, LEAK_OUT - PEAK, EASE.out);
  // 光团沿对角线：右上外 → 左下外（全程 swift，峰值时在画面中上偏右）
  const sweep = ramp(frame, LEAK_IN, LEAK_OUT - LEAK_IN, (t) => 1 - Math.pow(1 - t, 1.2));
  const cx = mix(2250, -500, sweep);
  const cy = mix(-380, 1400, sweep);

  // 镜头：A 极缓推进，B 从 1.04 落定
  const zoom = golden ? 1 + 0.04 * (1 - ramp(frame, PEAK, 44, EASE.out)) : 1 + 0.02 * ramp(frame, 0, PEAK, EASE.smooth);
  const burn = `brightness(${(1 + intensity * 0.85).toFixed(3)}) contrast(${(1 - intensity * 0.5).toFixed(3)}) saturate(${(1 - intensity * 0.25).toFixed(3)})`;
  // 高光溢出把 A 的字也烧淡（峰值处只剩 ~25%），切点那一下不会看到标题突然换字
  const aWash = golden ? 1 : 1 - 0.75 * Math.pow(intensity, 1.6);
  const slide = ramp(frame, PEAK + 2, 14, EASE.swift);

  // 三段色温光团（长径 / 颜色 / 透明度 / 沿扫掠方向的偏移）
  const blobs = [
    { d: 3000, c: '#c2311a', a: 0.6, o: 360 },
    { d: 2300, c: '#ff5a1f', a: 0.8, o: 160 },
    { d: 1700, c: '#ffb347', a: 0.95, o: 0 },
  ];
  const core = Math.pow(intensity, 3);
  const cutFlash = frame === PEAK || frame === PEAK + 1 ? 0.25 : 0;

  return (
    <AbsoluteFill style={{ background: L.bg[2], overflow: 'hidden' }}>
      {/* 画面层（受漏光烧穿） */}
      <div style={{ position: 'absolute', inset: 0, filter: intensity > 0.01 ? burn : undefined }}>
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${zoom.toFixed(5)})` }}>
          {golden ? <Golden f={frame} /> : <Night f={frame} />}
        </div>
        {/* 底部压暗，托住标题与拨轮 */}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${alpha('#000000', 0.25)} 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 52%, ${alpha('#0a0402', 0.72)} 100%)` }} />
        {/* 标题 */}
        <div style={{ position: 'absolute', left: PAD + 36, top: 596, opacity: aWash }}>
          <div style={{ ...type(28, 700, { caps: true }), letterSpacing: '0.2em', color: golden ? L.accent2 : alpha(L.ink, 0.7), marginBottom: 22 }}>
            {golden ? '02 — Golden hour' : '01 — Night'}
          </div>
          <div style={{ ...type(140, 760), color: L.ink }}>
            {golden ? (
              <TextReveal key="b" text="Made for the light." by="word" variant="rise" start={PEAK + 10} each={20} gap={4} />
            ) : (
              <TextReveal key="a" text="Made for the dark." by="word" variant="rise" start={2} each={20} gap={4} />
            )}
          </div>
        </div>
        <Viewfinder golden={golden} slide={slide} />
      </div>

      {/* 漏光层 */}
      {intensity > 0.003 && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {/* 片门溢光：从右缘与上缘漏进来的线性光带 */}
          <div style={{
            position: 'absolute', inset: 0, mixBlendMode: 'screen', opacity: intensity,
            background: `linear-gradient(250deg, ${alpha('#ffb347', 0.9)} 0%, ${alpha('#ff5a1f', 0.55)} 14%, ${alpha('#c2311a', 0.2)} 30%, rgba(0,0,0,0) 46%)`,
          }} />
          {blobs.map((b, i) => (
            <div key={i} style={{
              position: 'absolute', left: cx - b.d / 2 + b.o * 0.8, top: cy - b.d / 2.7 - b.o * 0.6, width: b.d, height: b.d / 1.35,
              borderRadius: '50%', transform: 'rotate(-34deg)', mixBlendMode: 'screen', opacity: b.a * intensity,
              background: `radial-gradient(closest-side, ${alpha(b.c, 1)} 0%, ${alpha(b.c, 0.65)} 35%, ${alpha(b.c, 0)} 100%)`,
            }} />
          ))}
          {/* 白热核：只在峰值附近烧起来 */}
          <div style={{
            position: 'absolute', left: cx - 1100, top: cy - 700, width: 2200, height: 1400, borderRadius: '50%', transform: 'rotate(-34deg)',
            mixBlendMode: 'screen', opacity: core,
            background: 'radial-gradient(closest-side, #fff6e6 0%, rgba(255,236,200,0.9) 40%, rgba(255,200,130,0) 100%)',
          }} />
          {/* 全屏暖罩：高光溢出带温度 */}
          <div style={{ position: 'absolute', inset: 0, background: '#ff9a4a', mixBlendMode: 'screen', opacity: 0.4 * intensity * intensity + cutFlash }} />
        </div>
      )}

      <Vignette strength={0.5 * (1 - 0.6 * intensity)} color={L.shadow} inner={0.48} />
      <Grain opacity={0.08 + 0.08 * intensity} step={2} blend="soft-light" />
    </AbsoluteFill>
  );
};
