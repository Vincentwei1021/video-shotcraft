// glow-wake-sleep-panel（A 醒睡扫过）—— 聚光灯从左向右匀速扫过斜置面板，一条带辉光的紫色光线贴着
// 面板顶边同行；光到即亮、光走即暗，尾段面板沉回黑暗，只剩右缘残光。
//
// 第二轮重设计（深夜录音室 · 光即播放头）：
// - look = aurora（紫粉夜）。面板换成音频工作站「Cadenza」的混音页：104px 曲名「Midnight Signal」、
//   满宽 120 根的波形、四轨分轨电平、一颗 accent 播放键。为镜头设计的大字 UI，斜置后仍读得清。
// - 核心巧思：聚光光心 = 播放头。光扫到哪一列，那一段波形就被"播放"——柱子点亮成紫粉渐变并泛光，
//   播放头细线与时间码跟着光走；光走过后波形保留一层暗紫"已播放"色，面板其余部分沉回黑暗（醒→睡）。
//   分轨电平随光经过跳动一下（光到即醒的小动作）。
// - 贴边光线：沿面板顶边同行的四层辉光（宽糊 + 中层 + 粉偏移 + 亮芯），经过 logo 时 logo 描一圈光，
//   接近右缘时点亮竖直残光；身后有一团随光移动的紫雾（光照到空气），后层一块重影面板给厚度。
// - 命门：光头 sx 全程严格 linear（不缓动）——探照灯的机械扫掠；相机给一口很慢的 linear 平移同向陪跑。
//
// 时间表（30fps，共 150f）：
//   0–14    醒：全局包络 0→1，第 1 帧左缘已有紫光与面板一角
//   6–128   光头 linear 从面板左外扫到右外（主动作 122f），波形逐列被"播放"
//   100–134 睡：包络 1→0，面板沉回黑暗
//   112–150 右缘竖直残光转蓝紫、播放键保留一点自发光——尾帧是一张暗场海报
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { FONT, Grain, Vignette } from '../../_fixtures/Polish';
import { Dust, LOOKS, alpha, type } from '../../_fixtures/Look';

export const GLOW_WAKE_SLEEP_PANEL_DURATION = 150; // 6–128f 匀速扫过 + 100–134f 沉回黑暗 + 右缘残光收尾

const L = LOOKS.aurora;
const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const W = 1400;
const H = 860;
const R = 34;
const VOID = '#07040f';

// 面板（亮面 UI，在黑场里被光照出来）
const P = {
  bg0: '#f8f5fe', bg1: '#ece7f8', ink: '#17122b', ink2: '#5b5476', ink3: '#9a93b6', line: 'rgba(40,20,90,0.10)',
  violet: '#7c4dff', pink: '#ec4fa6',
};

const SWEEP0 = 6;
const SWEEP1 = 128;
const sweepX = (f: number) => interpolate(f, [SWEEP0, SWEEP1], [-420, W + 420], CLAMP);

// 120 根波形柱：确定性的"一首歌"包络（前奏低 → 主歌 → 副歌最高 → 尾声）
const BARS = 120;
const WAVE_X0 = 56;
const WAVE_W = W - 112;
const barH = (i: number) => {
  const t = i / (BARS - 1);
  const env = 0.32 + 0.5 * Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 1.4 + 0.18 * Math.exp(-((t - 0.62) ** 2) / 0.01);
  const tex = 0.55 + 0.45 * Math.abs(Math.sin(i * 1.71) * Math.cos(i * 0.53 + 1.3));
  return Math.max(0.08, Math.min(1, env * tex));
};

const STEMS = [
  { name: 'Vocals', db: '−6.2', lv: 0.78, x: 0 },
  { name: 'Keys', db: '−9.8', lv: 0.56, x: 1 },
  { name: 'Bass', db: '−4.1', lv: 0.88, x: 2 },
  { name: 'Drums', db: '−3.5', lv: 0.94, x: 3 },
];

const Panel: React.FC<{ sx: number; env: number }> = ({ sx, env }) => {
  const playT = Math.min(1, Math.max(0, (sx - WAVE_X0) / WAVE_W));
  const secs = Math.round(playT * 222);
  const tc = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  const stemW = (W - 112 - 3 * 24) / 4;
  return (
    <div style={{ width: W, height: H, borderRadius: R, overflow: 'hidden', position: 'relative', fontFamily: FONT.sans, color: P.ink,
      background: `linear-gradient(180deg, ${P.bg0} 0%, ${P.bg1} 100%)` }}>
      {/* 顶栏 */}
      <div style={{ position: 'absolute', left: 48, top: 30, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 52, height: 52, borderRadius: 15, background: `linear-gradient(135deg, ${P.violet} 0%, ${P.pink} 100%)`,
          boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width={30} height={30} viewBox="0 0 30 30" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round">
            <path d="M5 15v0M10 10v10M15 6v18M20 11v8M25 14v2" />
          </svg>
        </div>
        <div style={{ ...type(36, 720), letterSpacing: '-0.025em' }}>Cadenza</div>
      </div>
      <div style={{ position: 'absolute', left: 360, top: 36, display: 'flex', gap: 14, ...type(28, 550), color: P.ink2 }}>
        <div style={{ padding: '6px 22px', borderRadius: 999, background: alpha(P.violet, 0.12), color: P.violet, fontWeight: 650 }}>Studio</div>
        <div style={{ padding: '6px 14px' }}>Library</div>
        <div style={{ padding: '6px 14px' }}>Export</div>
      </div>
      <div style={{ position: 'absolute', right: 52, top: 44, fontFamily: FONT.mono, fontSize: 26, color: P.ink3, letterSpacing: '0.04em' }}>SESSION 07</div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 112, height: 1.5, background: P.line }} />

      {/* 曲名 */}
      <div style={{ position: 'absolute', left: 56, top: 150 }}>
        <div style={{ ...type(24, 700, { caps: true }), letterSpacing: '0.18em', color: P.violet }}>Now mixing · Track 07</div>
        <div style={{ ...type(104, 780), letterSpacing: '-0.05em', marginTop: 14 }}>Midnight Signal</div>
        <div style={{ ...type(34, 500), color: P.ink2, marginTop: 14 }}>124 BPM · F minor · 3:42</div>
      </div>
      {/* 播放键（accent 主角） */}
      <div style={{ position: 'absolute', right: 64, top: 170, width: 150, height: 150, borderRadius: 75,
        background: `linear-gradient(145deg, ${P.violet} 0%, #a855f7 60%, ${P.pink} 130%)`,
        boxShadow: `0 24px 50px -18px ${alpha(P.violet, 0.75)}, inset 0 2px 0 rgba(255,255,255,0.35)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={52} height={52} viewBox="0 0 52 52"><path d="M17 11 L42 26 L17 41 Z" fill="#fff" stroke="#fff" strokeWidth={4} strokeLinejoin="round" /></svg>
      </div>

      {/* 波形：光头 = 播放头 */}
      <svg width={W} height={260} style={{ position: 'absolute', left: 0, top: 410 }} viewBox={`0 0 ${W} 260`}>
        <defs>
          <linearGradient id="cdzLit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={P.pink} />
            <stop offset="0.5" stopColor="#a855f7" />
            <stop offset="1" stopColor={P.violet} />
          </linearGradient>
        </defs>
        <filter id="cdzBloom" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="9" /></filter>
        {/* 泛光只给被照到的柱子（模糊副本垫在下面），不给整片面板 */}
        <g filter="url(#cdzBloom)" opacity={0.75 * env}>
          {Array.from({ length: BARS }, (_, i) => {
            const x = WAVE_X0 + (i + 0.5) * (WAVE_W / BARS);
            const near = Math.exp(-((x - sx) ** 2) / (2 * 120 ** 2));
            if (near < 0.08) return null;
            const h = barH(i) * 230;
            return <rect key={i} x={x - 5} y={130 - h / 2 - near * 6} width={10} height={h + near * 12} rx={5} fill="#a855f7" opacity={near} />;
          })}
        </g>
        {Array.from({ length: BARS }, (_, i) => {
          const x = WAVE_X0 + (i + 0.5) * (WAVE_W / BARS);
          const h = barH(i) * 230;
          const near = Math.exp(-((x - sx) ** 2) / (2 * 120 ** 2)); // 光照到的列
          const played = x < sx;
          const lit = Math.max(near, played ? 0.38 : 0);
          return (
            <rect key={i} x={x - 3.5} y={130 - h / 2 - near * 6} width={7} height={h + near * 12} rx={3.5}
              fill={lit > 0.02 ? 'url(#cdzLit)' : P.ink3} opacity={lit > 0.02 ? 0.35 + 0.65 * lit : 0.4} />
          );
        })}
        {/* 播放头 */}
        {sx > WAVE_X0 && sx < WAVE_X0 + WAVE_W && (
          <g opacity={env}>
            <line x1={sx} y1={0} x2={sx} y2={260} stroke={P.violet} strokeWidth={3} />
            <circle cx={sx} cy={4} r={8} fill={P.violet} />
          </g>
        )}
      </svg>
      {sx > WAVE_X0 && sx < WAVE_X0 + WAVE_W && (
        <div style={{ position: 'absolute', left: sx + 14, top: 380, fontFamily: FONT.mono, fontSize: 28, fontWeight: 600, color: P.violet }}>{tc}</div>
      )}

      {/* 分轨电平：光经过时跳一下 */}
      {STEMS.map((s, i) => {
        const cx0 = 56 + i * (stemW + 24);
        const kick = Math.exp(-((cx0 + stemW / 2 - sx) ** 2) / (2 * 160 ** 2));
        const lv = Math.min(1, s.lv * (0.72 + 0.28 * kick) + 0.06 * kick);
        return (
          <div key={i} style={{ position: 'absolute', left: cx0, top: 704, width: stemW, height: 120, borderRadius: 22, background: 'rgba(255,255,255,0.7)',
            border: `1.5px solid ${P.line}`, boxShadow: 'inset 0 1px 0 #fff', padding: '18px 22px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ ...type(32, 650), letterSpacing: '-0.02em' }}>{s.name}</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 24, color: P.ink3 }}>{s.db}</div>
            </div>
            <div style={{ display: 'flex', gap: 5, marginTop: 18 }}>
              {Array.from({ length: 14 }, (_, k) => {
                const on = k / 14 < lv;
                const hot = k >= 11;
                return <div key={k} style={{ flex: 1, height: 18, borderRadius: 4, background: on ? (hot ? P.pink : P.violet) : 'rgba(40,20,90,0.08)', opacity: on ? 0.55 + 0.45 * (k / 14) : 1 }} />;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// 贴边紫色光线（四层辉光），水平段中心 cx；vertical=true 时竖直段（cx 作纵向中心）
const EdgeStreak: React.FC<{ cx: number; y: number; len: number; opacity: number; vertical?: boolean; hue?: 'violet' | 'blue' }> = ({ cx, y, len, opacity, vertical = false, hue = 'violet' }) => {
  if (opacity < 0.005) return null;
  const c1 = hue === 'violet' ? 'rgba(150,82,238,0.62)' : 'rgba(110,120,250,0.55)';
  const c2 = hue === 'violet' ? 'rgba(196,126,255,0.92)' : 'rgba(150,165,255,0.9)';
  const c3 = hue === 'violet' ? 'rgba(244,140,220,0.78)' : 'rgba(190,150,255,0.7)';
  const g = (c: string) => `linear-gradient(${vertical ? 180 : 90}deg, rgba(0,0,0,0) 0%, ${c} 42%, ${c} 58%, rgba(0,0,0,0) 100%)`;
  const lay = (thick: number, l: number, c: string, blur: number, off = 0) =>
    vertical
      ? { position: 'absolute' as const, left: y - thick / 2 + off, top: cx - l / 2, width: thick, height: l, background: g(c), filter: `blur(${blur}px)` }
      : { position: 'absolute' as const, left: cx - l / 2, top: y - thick / 2 + off, width: l, height: thick, background: g(c), filter: `blur(${blur}px)` };
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, opacity, mixBlendMode: 'screen' }}>
      <div style={lay(80, len, c1, 28)} />
      <div style={lay(26, len * 0.8, c2, 9)} />
      <div style={lay(12, len * 0.55, c3, 5, -3)} />
      <div style={lay(5, len * 0.62, '#f6e8ff', 1.4)} />
    </div>
  );
};

export const GlowWakeSleepPanel: React.FC = () => {
  const frame = useCurrentFrame();
  const sx = sweepX(frame);
  const sy = 300; // 光池纵向中心：曲名与波形之间

  // 全局包络：醒 → 展示 → 睡
  const env = interpolate(frame, [0, 14, 100, 134], [0.35, 1, 1, 0], CLAMP);
  // 右缘：光头靠近右缘时点亮，尾段转蓝紫残光
  const rightNear = Math.min(1, Math.max(0, (sx - (W - 520)) / 420)) * (1 - Math.min(1, Math.max(0, (sx - W - 300) / 200)));
  const tail = interpolate(frame, [104, 122, 150], [0, 0.85, 0.42], CLAMP);
  // logo 描光：光经过 logo（本地 x≈74）
  const logoGlow = Math.exp(-((sx - 74) ** 2) / (2 * 220 ** 2)) * env;
  // 播放键尾段自发光（暗场里唯一留下的 accent）
  const playGlow = interpolate(frame, [110, 136], [0, 0.9], CLAMP);

  // 相机：极缓 linear 同向陪跑（面板随光从左上往右下走一点）
  const camX = interpolate(frame, [0, 150], [-70, 70], CLAMP);
  const camY = interpolate(frame, [0, 150], [-18, 18], CLAMP);

  // 光池压暗罩：中心平台亮区 → S 形衰减到沉黑（暗部带一点紫调）
  // 光池罩：光是"显影"不是"过曝"——中心也压一层紫调（白面板被照成可读的淡紫，不是白盘），
  // 再按 S 形衰减到沉黑；内圈用带紫色相的深色、外圈用近黑，光色因此读作紫光
  const dark = (x: number, y: number, k: number) => {
    const a = (lit: number) => (lit * env + (1 - env) * 0.96).toFixed(3);
    return `radial-gradient(ellipse ${760 * k}px ${600 * k}px at ${x}px ${y}px, rgba(46,24,108,${a(0.3)}) 0%, rgba(44,22,104,${a(0.31)}) 16%, rgba(36,18,88,${a(0.38)}) 28%, rgba(24,12,62,${a(0.52)}) 40%, rgba(14,7,34,${a(0.68)}) 52%, rgba(10,5,24,${(1 - 0.22 * env).toFixed(3)}) 66%, rgba(8,4,18,${(1 - 0.08 * env).toFixed(3)}) 80%, rgba(7,4,15,0.985) 96%)`;
  };

  return (
    <AbsoluteFill style={{ background: VOID, overflow: 'hidden' }}>
      {/* 背景：极淡的紫色地光 */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 55% at 50% 100%, ${alpha(L.light, 0.12)} 0%, rgba(0,0,0,0) 70%)` }} />
      <div style={{ position: 'absolute', inset: 0, perspective: 2200, perspectiveOrigin: '50% 42%' }}>
        <div style={{
          position: 'absolute', left: (1920 - W) / 2, top: (1080 - H) / 2 + 10,
          transform: `translate(${camX}px, ${camY}px) translateZ(-190px) rotateX(18deg) rotateY(-12deg) rotateZ(-10deg)`,
          transformStyle: 'preserve-3d',
        }}>
          {/* 光照到空气：随光头移动的紫雾，泛在面板后 */}
          <div style={{
            position: 'absolute', left: sx - 640, top: -420, width: 1280, height: 900,
            background: `radial-gradient(ellipse at 50% 55%, ${alpha('#8a4dff', 0.4)}, ${alpha('#8a4dff', 0)} 64%)`,
            filter: 'blur(30px)', opacity: env,
          }} />
          {/* 后层重影面板：只给轮廓与一点受光，制造厚度 */}
          <div style={{
            position: 'absolute', left: -54, top: 46, width: W, height: H, borderRadius: R,
            background: `radial-gradient(ellipse 640px 480px at ${sx - 54}px ${sy + 46}px, ${alpha('#cbb8f5', 0.32 * env)} 0%, ${alpha('#5b3fa8', 0.1 * env)} 45%, rgba(12,8,24,0.9) 85%)`,
            boxShadow: `inset 0 0 0 1.5px ${alpha('#c9b2ff', 0.1 + 0.12 * env)}`,
          }} />
          {/* 面板本体 + 光池罩 */}
          <div style={{ position: 'relative', boxShadow: `0 60px 120px -40px rgba(0,0,0,0.9)`, borderRadius: R }}>
            <Panel sx={sx} env={env} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: R, background: dark(sx, sy, 1) }} />
            {/* 右缘蓝紫残光罩 */}
            <div style={{ position: 'absolute', inset: 0, borderRadius: R, background: `linear-gradient(262deg, ${alpha('#7c84ff', 0.34)} 0%, ${alpha('#7c84ff', 0)} 14%)`, opacity: tail }} />
          </div>
          {/* 贴顶边光线（本体） */}
          <EdgeStreak cx={sx} y={-1} len={1060} opacity={env} />
          {/* 右缘竖直光线 */}
          <EdgeStreak cx={H * 0.42} y={W + 1} len={700} opacity={Math.max(rightNear * env, tail)} vertical hue={tail > rightNear * env ? 'blue' : 'violet'} />
          {/* logo 描光 */}
          <div style={{
            position: 'absolute', left: 48, top: 30, width: 52, height: 52, borderRadius: 15,
            boxShadow: '0 0 0 2px rgba(240,220,255,0.95), 0 0 26px 10px rgba(196,126,255,0.8), 0 0 70px 26px rgba(150,82,238,0.45)',
            opacity: logoGlow,
          }} />
          {/* 播放键尾段自发光：按键本体画在压暗罩之上、外圈一层柔光——暗场里唯一还"醒着"的东西 */}
          {playGlow > 0.005 && (
            <div style={{ position: 'absolute', left: W - 64 - 150, top: 170, width: 150, height: 150, borderRadius: 75, opacity: playGlow,
              background: `linear-gradient(145deg, ${alpha(P.violet, 0.9)} 0%, ${alpha('#a855f7', 0.85)} 60%, ${alpha(P.pink, 0.85)} 130%)`,
              boxShadow: `0 0 40px 6px ${alpha('#a855f7', 0.5)}, 0 0 120px 30px ${alpha('#7c4dff', 0.28)}, inset 0 2px 0 rgba(255,255,255,0.3)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width={52} height={52} viewBox="0 0 52 52"><path d="M17 11 L42 26 L17 41 Z" fill="rgba(255,255,255,0.92)" stroke="rgba(255,255,255,0.92)" strokeWidth={4} strokeLinejoin="round" /></svg>
            </div>
          )}
          {/* 光头眩光：贴着顶边的亮团 */}
          <div style={{
            position: 'absolute', left: sx - 150, top: -60, width: 300, height: 120,
            background: 'radial-gradient(ellipse, rgba(214,180,255,0.7), rgba(150,90,245,0.3) 45%, rgba(0,0,0,0) 72%)',
            filter: 'blur(12px)', opacity: env * 0.95, mixBlendMode: 'screen',
          }} />
        </div>
      </div>
      {/* 光里的浮尘：只做氛围，随包络明暗 */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.25 + 0.5 * env }}>
        <Dust look={L} count={30} seed={7} drift={0.35} opacity={0.5} color="#d9c2ff" />
      </div>
      <Vignette strength={0.55} inner={0.42} color="#020106" />
      <Grain opacity={0.09} blend="soft-light" />
    </AbsoluteFill>
  );
};
