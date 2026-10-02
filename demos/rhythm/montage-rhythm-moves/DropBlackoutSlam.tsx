// 落拍黑场爆开（drop-blackout-slam）——EDM 演出 blackout 惯例：drop 前一拍切全黑死寂憋一整拍，爆开才够响。
//
// 第二轮重设计（look = custom「信号红 · 暖黑」，虚构音乐软件 Quasar Studio 3 的发布镜头）：
// - 铺垫段不再是灰色假面板呼吸，而是一张为镜头设计的编曲视图：4 条音轨（Drums / Bass / Riser / Vox）、
//   小节标尺、红色「DROP」标记旗；白色播放头按真实 150BPM 匀速走（机械语义，线性），
//   **正好在切黑那一帧撞上 DROP 标记**——观众看得见"要来了"，黑场才有落差。
// - 张力：相机 1.0→1.1 ease-in 向标记点逼近（越来越快）；拍点只打元素层（节拍灯 / 电平条 / 标记旗），
//   最后 12f 变成军鼓滚奏式加密（12f → 6f → 3f → 2f 一记），Riser 轨的楔形波形就是"蓄力"的可视化。
// - 黑场：50–61 一帧直切 #0c0c0c，12f 屏上完全无物（命门：任何微光都在泄压）。
// - 爆入（62）：三件事同帧起爆——字标「QUASAR 3」1.35→1 撞入（5f snappy + 两层缩放残影）、整屏 10px 震屏
//   指数衰减（t≥14 强制归零）、细亮芯冲击环 80→1100px；外加一帧中心曝光、背后一整条红色波形从中心向两侧
//   以 ~140px/f 炸开（每根柱子各自弹簧落定），落定后成为字标背后的静态声纹。
//
// 时间表（30fps，共 136f）：
//   0–50    铺垫：播放头 1 小节匀速走到 DROP（拍点 2/14/26/38，加密 44/47/49）；推镜 ease-in
//   50–62   黑场死寂 12f
//   62–67   字标撞入；62–76 震屏收干；62–78 冲击环；62–80 波形由中心炸开、弹簧落定
//   70–96   余波：眉题、副句逐词升起、底注淡入
//   96–136  hold：极缓推镜 1.0→1.02 + 声纹极轻呼吸，干净海报
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, Vignette, mix, ramp } from '../../_fixtures/Polish';
import { TextReveal, alpha, springAt } from '../../_fixtures/Look';

export const DROP_BLACKOUT_SLAM_DURATION = 136; // 铺垫 50f + 黑场 12f + 爆入 / 落定 74f

// 帧确定伪随机（硬规矩：禁 Math.random）
const h = (n: number) => {
  const s = Math.sin(n * 127.3 + 11.7) * 43758.5453;
  return s - Math.floor(s);
};

const BLACK_IN = 50; // 切黑帧（= 播放头撞上 DROP 标记）
const SLAM = 62; // 爆入帧

// 调色：暖黑底 + 信号红 + 暖白
const C = {
  bg: '#0d090a', panel: '#151112', panel2: '#1c1718', line: 'rgba(255,225,215,0.08)',
  ink: '#fbf3ef', ink2: '#b9aaa5', ink3: '#6f6260', red: '#ff3d2e', redDeep: '#3a1210', clip: '#262021', wave: '#8f8381',
};

// ───────────── 铺垫：编曲视图几何 ─────────────
const PANEL = { x: 140, y: 196, w: 1640, h: 690 };
const HEAD_W = 250; // 音轨名列宽
const BAR_PX = 278; // 每小节像素
const BAR0 = 30; // 剪辑区左缘对应的小节号
const DROP_BAR = 33;
const LANE_Y0 = 150; // 音轨区起点（面板内）
const LANE_H = 126;
const barX = (bar: number) => HEAD_W + (bar - BAR0) * BAR_PX; // 面板内 x
const DROP_X = barX(DROP_BAR);
// 150BPM、4/4：一拍 12f、一小节 48f；播放头在 BLACK_IN 正好到 DROP_BAR
const playBar = (f: number) => DROP_BAR - (BLACK_IN - f) / 48;
// 拍点：正常四分音符 + 最后 12f 的滚奏加密（只打元素层）
const PULSES = [2, 14, 26, 38, 44, 47, 49];
const pulseAt = (f: number) => {
  let v = 0;
  for (const p of PULSES) if (f >= p) v = Math.max(v, Math.exp(-(f - p) / 2.6));
  return v;
};

type Lane = { name: string; kind: 'drums' | 'bass' | 'riser' | 'vox' };
const LANES: Lane[] = [
  { name: 'Drums', kind: 'drums' }, { name: 'Bass', kind: 'bass' }, { name: 'Riser', kind: 'riser' }, { name: 'Vox', kind: 'vox' },
];

// 一段片段的波形（SVG 路径，3px 竖条 / 6px 步进）；drop = 落拍后的满幅段
const wavePath = (lane: number, kind: Lane['kind'], x0: number, w: number, hMax: number, drop: boolean) => {
  let d = '';
  for (let x = 4; x < w - 4; x += 6) {
    const bar = BAR0 + (x0 + x - HEAD_W) / BAR_PX;
    const beatPhase = ((bar * 4) % 1 + 1) % 1;
    const n = h(lane * 977 + Math.round(x0 + x));
    let a: number;
    if (kind === 'drums') a = (drop ? 0.55 : 0.3) + (beatPhase < 0.18 ? 0.45 : 0) * (1 - beatPhase * 3) + n * 0.12;
    else if (kind === 'bass') a = (drop ? 0.75 : 0.35) + 0.15 * Math.sin(bar * 25) + n * 0.1;
    else if (kind === 'riser') a = drop ? 0.25 + n * 0.1 : Math.pow(Math.min(1, Math.max(0, (bar - 31) / 2)), 1.6) * 0.95 + n * 0.06;
    else a = (drop ? 0.6 : 0.22) * (0.5 + 0.5 * Math.abs(Math.sin(bar * 9 + n))) + n * 0.12;
    const hh = Math.max(2, Math.min(1, a) * hMax);
    d += `M${x},${(-hh / 2).toFixed(1)}h3v${hh.toFixed(1)}h-3z`;
  }
  return d;
};

// 各轨片段：[起小节, 止小节]；落拍后（≥33）是红色满幅段
const CLIPS: Record<Lane['kind'], [number, number][]> = {
  drums: [[30, 31.97], [32, 32.97], [33, 35.2]],
  bass: [[30, 32.97], [33, 35.2]],
  riser: [[31, 32.99]],
  vox: [[30.5, 31.9], [33, 35.2]],
};

const Arrangement: React.FC<{ f: number }> = ({ f }) => {
  const pb = playBar(f);
  const px = HEAD_W + (pb - BAR0) * BAR_PX;
  const pulse = pulseAt(f);
  const near = ramp(f, 20, 30, EASE.exit); // 播放头逼近标记：标记旗越来越亮
  const beatInBar = Math.floor(((pb % 1) + 1) % 1 * 4); // 0–3
  const roll = f >= 44; // 滚奏段：节拍灯全亮闪
  const secs = 52 + f / 30;
  const tc = `00:${String(Math.floor(secs)).padStart(2, '0')}.${String(Math.floor((secs % 1) * 100)).padStart(2, '0')}`;
  const laneTop = (i: number) => LANE_Y0 + i * LANE_H;
  return (
    <div style={{
      position: 'absolute', left: PANEL.x, top: PANEL.y, width: PANEL.w, height: PANEL.h, borderRadius: 26, overflow: 'hidden',
      background: `linear-gradient(180deg, ${C.panel2} 0%, ${C.panel} 100%)`, fontFamily: FONT.sans,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.07), 0 0 0 1px ${C.line}, 0 40px 120px -30px rgba(0,0,0,0.9), 0 0 160px -40px ${alpha(C.red, 0.18)}`,
    }}>
      {/* 顶栏：品牌 / 走带 / 速度 */}
      <div style={{ position: 'absolute', left: 36, top: 26, display: 'flex', alignItems: 'center', gap: 16 }}>
        <svg width={38} height={38} viewBox="0 0 38 38">
          <circle cx={19} cy={19} r={16} fill="none" stroke={C.ink} strokeWidth={3} />
          <circle cx={19} cy={19} r={6} fill={C.red} />
        </svg>
        <span style={{ fontSize: 32, fontWeight: 700, color: C.ink, letterSpacing: '-0.02em' }}>Quasar Studio</span>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 22, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 26 }}>
        <svg width={34} height={34} viewBox="0 0 24 24"><path d="M6 4l14 8-14 8z" fill={C.ink} /></svg>
        <span style={{ fontFamily: FONT.mono, fontSize: 38, fontWeight: 500, color: C.ink, fontVariantNumeric: 'tabular-nums' }}>{tc}</span>
        <div style={{ display: 'flex', gap: 10, marginLeft: 6 }}>
          {[0, 1, 2, 3].map((k) => {
            const on = roll ? pulse > 0.3 : k === beatInBar;
            return <div key={k} style={{
              width: 16, height: 16, borderRadius: 8, background: on ? (k === 0 || roll ? C.red : C.ink) : 'rgba(255,255,255,0.12)',
              boxShadow: on ? `0 0 ${(6 + 14 * pulse).toFixed(1)}px ${alpha(k === 0 || roll ? C.red : '#ffffff', 0.7)}` : 'none',
            }} />;
          })}
        </div>
      </div>
      <div style={{ position: 'absolute', right: 36, top: 30, display: 'flex', gap: 28, fontSize: 32, fontWeight: 600, color: C.ink2, fontVariantNumeric: 'tabular-nums' }}>
        <span><span style={{ color: C.ink }}>150</span> BPM</span><span>4/4</span>
      </div>

      {/* 小节标尺 */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 96, height: 48, borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}>
        {[30, 31, 32, 33, 34, 35].map((b) => (
          <div key={b} style={{ position: 'absolute', left: barX(b) + 10, top: 8, fontFamily: FONT.mono, fontSize: 26, color: b === DROP_BAR ? C.ink : C.ink3 }}>{b}</div>
        ))}
      </div>

      {/* 音轨 */}
      {LANES.map((ln, i) => {
        const y = laneTop(i);
        const meter = Math.min(1, 0.25 + 0.75 * pulse * (0.7 + 0.3 * h(i * 3 + Math.floor(f / 2))) + (ln.kind === 'riser' ? near * 0.4 : 0));
        return (
          <div key={ln.name} style={{ position: 'absolute', left: 0, top: y, width: PANEL.w, height: LANE_H, borderBottom: `1px solid ${C.line}` }}>
            <div style={{ position: 'absolute', left: 36, top: 0, height: LANE_H, display: 'flex', alignItems: 'center', gap: 18 }}>
              {/* 电平条：拍点打一下（元素层） */}
              <div style={{ width: 8, height: 64, borderRadius: 4, background: 'rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${(meter * 100).toFixed(1)}%`, background: meter > 0.85 ? C.red : C.ink2, borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 34, fontWeight: 600, color: C.ink, letterSpacing: '-0.015em' }}>{ln.name}</span>
            </div>
            <svg width={PANEL.w} height={LANE_H} style={{ position: 'absolute', left: 0, top: 0 }}>
              {CLIPS[ln.kind].map(([b0, b1], k) => {
                const x0 = barX(b0) + 3;
                const w = (b1 - b0) * BAR_PX - 6;
                const drop = b0 >= DROP_BAR;
                return (
                  <g key={k} transform={`translate(${x0.toFixed(1)},14)`}>
                    <rect width={w} height={LANE_H - 28} rx={12} fill={drop ? C.redDeep : C.clip} stroke={drop ? alpha(C.red, 0.55) : 'rgba(255,255,255,0.06)'} />
                    <g transform={`translate(0,${(LANE_H - 28) / 2})`}>
                      <path d={wavePath(i, ln.kind, x0, w, LANE_H - 44, drop)} fill={drop ? C.red : C.wave} opacity={drop ? 0.9 : 0.75} />
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>
        );
      })}

      {/* 已播放区：极淡的暖白罩（播放头左侧） */}
      <div style={{ position: 'absolute', left: HEAD_W, top: LANE_Y0, width: Math.max(0, px - HEAD_W), height: LANE_H * 4, background: 'rgba(255,240,230,0.025)' }} />

      {/* DROP 标记：红线 + 标尺上的旗，越逼近越亮 */}
      <div style={{ position: 'absolute', left: DROP_X - 1.5, top: 96, width: 3, height: PANEL.h - 96, background: alpha(C.red, 0.5 + 0.4 * near), boxShadow: `0 0 ${(10 + 30 * near + 14 * pulse * near).toFixed(1)}px ${alpha(C.red, 0.5 + 0.3 * near)}` }} />
      <div style={{
        position: 'absolute', left: DROP_X - 1.5, top: 98, height: 44, padding: '0 18px', borderRadius: '0 12px 12px 0',
        display: 'flex', alignItems: 'center', background: C.red, color: '#fff', fontSize: 28, fontWeight: 800, letterSpacing: '0.1em',
        boxShadow: `0 0 ${(18 + 40 * near * (0.6 + 0.4 * pulse)).toFixed(1)}px ${alpha(C.red, 0.65)}`,
        transform: `scale(${(1 + 0.06 * pulse * near).toFixed(4)})`, transformOrigin: '0% 50%',
      }}>DROP</div>

      {/* 播放头：白线 + 顶端三角 + 拍点辉光 */}
      <div style={{ position: 'absolute', left: px - 1.5, top: 96, width: 3, height: PANEL.h - 96, background: '#fff', boxShadow: `0 0 ${(8 + 18 * pulse).toFixed(1)}px rgba(255,255,255,${(0.45 + 0.4 * pulse).toFixed(2)})` }} />
      <svg width={26} height={18} viewBox="0 0 26 18" style={{ position: 'absolute', left: px - 13, top: 96 }}><path d="M0 0h26L13 18z" fill="#fff" /></svg>
    </div>
  );
};

// ───────────── 爆入：字标 + 声纹 ─────────────
const TITLE_Y = 500; // 字标中心
const N_BARS = 118;
const BAR_PITCH = 1920 / N_BARS;
// 每根声纹柱：静态轮廓（中间高、两端低 + 噪声）× 从中心向两侧传播的弹簧
const barShape = (i: number) => {
  const xn = Math.abs(i + 0.5 - N_BARS / 2) / (N_BARS / 2); // 0 中心 → 1 边缘
  return (0.3 + 0.7 * h(i * 13.1 + 4)) * (1 - 0.62 * xn * xn) * (0.75 + 0.25 * Math.sin(i * 0.9));
};

export const DropBlackoutSlam: React.FC = () => {
  const f = useCurrentFrame();

  // ===== 段 1：0–49 编曲视图在播 =====
  if (f < BLACK_IN) {
    // 推镜 ease-in：越逼近 DROP 越快（目标点 = 标记旗）
    const push = mix(1, 1.1, ramp(f, 0, BLACK_IN, EASE.exit));
    const ox = PANEL.x + DROP_X;
    const oy = PANEL.y + LANE_Y0 + LANE_H * 2;
    return (
      <div style={{ width: 1920, height: 1080, overflow: 'hidden', position: 'relative', background: C.bg }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse 60% 55% at 52% 44%, #221819 0%, #140e0f 55%, ${C.bg} 100%)`,
        }} />
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${push.toFixed(5)})`, transformOrigin: `${ox}px ${oy}px` }}>
          <Arrangement f={f} />
        </div>
        <Vignette strength={0.55} inner={0.4} color="#030101" />
        <Grain opacity={0.08} blend="soft-light" />
      </div>
    );
  }

  // ===== 段 2：50–61 纯黑死寂，屏上完全无物 =====
  if (f < SLAM) {
    return <div style={{ width: 1920, height: 1080, background: '#0c0c0c' }} />;
  }

  // ===== 段 3：62 起爆入 =====
  const t = f - SLAM;
  const slamScale = mix(1.35, 1, ramp(t, 0, 5, EASE.snappy));
  const trail = t < 4 ? 1 - t / 4 : 0; // 缩放残影

  // 震屏：10px 指数衰减，τ≈2.5f；t≥14 强制归零保证结尾真静止
  const amp = t >= 14 ? 0 : 10 * Math.exp(-t / 2.5);
  const shakeX = amp === 0 ? 0 : (h(f * 3.7 + 1) - 0.5) * 2 * amp;
  const shakeY = amp === 0 ? 0 : (h(f * 7.1 + 2) - 0.5) * 2 * amp;

  // 冲击环：80→1100px，16f 消散；越扩越细
  const ringP = ramp(t, 0, 16, EASE.out);
  const ringR = mix(80, 1100, ringP);
  const ringOp = t < 16 ? mix(0.9, 0, ramp(t, 2, 14, EASE.linear)) : 0;
  const ringW = mix(5, 1.2, ringP);

  const bloom = 1 - ramp(t, 0, 7, EASE.out); // 爆入帧中心曝光
  const halo = mix(1, 0.6, ramp(t, 0, 24, EASE.out)); // 字标背后红光：爆开满、落定常驻
  const hold = ramp(f, SLAM + 20, DROP_BLACKOUT_SLAM_DURATION - SLAM - 20, EASE.smooth);
  const cam = mix(1, 1.02, hold); // hold 段极缓推镜

  const word = (scale: number, opacity: number, key: string) => (
    <div key={key} style={{
      position: 'absolute', left: 0, right: 0, top: TITLE_Y - 170, height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity,
      transform: `scale(${scale.toFixed(4)})`,
    }}>
      <div style={{
        fontFamily: FONT.sans, fontWeight: 900, fontSize: 300, lineHeight: 1, letterSpacing: '-0.055em', whiteSpace: 'nowrap',
        display: 'flex', alignItems: 'baseline', gap: 36,
      }}>
        <span style={{
          backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #fff6f1 48%, #ffc9bd 100%)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          filter: `drop-shadow(0 0 50px ${alpha(C.red, 0.35)})`,
        }}>QUASAR</span>
        <span style={{ color: C.red, filter: `drop-shadow(0 0 30px ${alpha(C.red, 0.6)})` }}>3</span>
      </div>
    </div>
  );

  return (
    <div style={{ width: 1920, height: 1080, background: C.bg, overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: -24, transform: `translate(${shakeX.toFixed(2)}px, ${shakeY.toFixed(2)}px)` }}>
        <div style={{ position: 'absolute', left: 24, top: 24, width: 1920, height: 1080, transform: `scale(${cam.toFixed(5)})`, transformOrigin: `960px ${TITLE_Y}px` }}>
          {/* 舞台：暖黑径向 + 字标背后的信号红光 */}
          <div style={{ position: 'absolute', inset: -40, background: `radial-gradient(ellipse 75% 70% at 50% ${(TITLE_Y / 1080) * 100}%, #24100e 0%, #140b0b 50%, ${C.bg} 100%)` }} />
          <div style={{
            position: 'absolute', inset: -40, opacity: halo,
            background: `radial-gradient(ellipse 42% 30% at 50% ${(TITLE_Y / 1080) * 100}%, ${alpha(C.red, 0.42)} 0%, ${alpha(C.red, 0.1)} 55%, ${alpha(C.red, 0)} 100%)`,
          }} />

          {/* 声纹：从中心向两侧 ~140px/f 炸开，每根柱子各自弹簧落定（damping 11，一次可见回弹） */}
          <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0 }}>
            <defs>
              <linearGradient id="dbsWave" x1="0" y1={TITLE_Y - 270} x2="0" y2={TITLE_Y + 250} gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor={C.red} stopOpacity={0} />
                <stop offset="0.5" stopColor={C.red} stopOpacity={1} />
                <stop offset="1" stopColor={C.red} stopOpacity={0} />
              </linearGradient>
            </defs>
            <g fill="url(#dbsWave)">
              {Array.from({ length: N_BARS }, (_, i) => {
                const cx = (i + 0.5) * BAR_PITCH;
                const delay = Math.abs(cx - 960) / 140;
                const s = springAt(t, delay, { damping: 11, stiffness: 190 });
                const live = 1 + 0.05 * Math.sin(f / 9 + i * 0.7) * hold; // hold 段极轻呼吸
                const hh = Math.max(0, 560 * barShape(i) * s * live);
                const near = 1 - Math.min(1, Math.abs(cx - 960) / 960);
                return <rect key={i} x={cx - 3.5} y={TITLE_Y - hh / 2} width={7} height={hh} rx={3.5} opacity={0.16 + 0.32 * near} />;
              })}
            </g>
          </svg>

          {/* 冲击环：细亮芯 + 红色柔光晕 */}
          {ringOp > 0.01 && (
            <div style={{
              position: 'absolute', left: 960 - ringR, top: TITLE_Y - ringR, width: ringR * 2, height: ringR * 2, borderRadius: '50%',
              boxSizing: 'border-box', opacity: ringOp, border: `${ringW.toFixed(2)}px solid rgba(255,236,228,0.95)`,
              boxShadow: `0 0 40px 8px ${alpha(C.red, 0.5)}, inset 0 0 40px 8px ${alpha(C.red, 0.35)}`,
            }} />
          )}

          {/* 字标 + 两层缩放残影 */}
          {trail > 0 && word(slamScale * 1.14, 0.14 * trail, 'trail2')}
          {trail > 0 && word(slamScale * 1.06, 0.3 * trail, 'trail1')}
          {word(slamScale, 1, 'main')}

          {/* 眉题 + 副句 + 底注：字标落定后依次升起 */}
          <div style={{
            position: 'absolute', left: 0, right: 0, top: TITLE_Y - 250, textAlign: 'center', fontFamily: FONT.sans,
            fontSize: 26, fontWeight: 700, letterSpacing: '0.32em', color: C.red,
            opacity: ramp(t, 8, 12, EASE.out), transform: `translateY(${mix(10, 0, ramp(t, 8, 14, EASE.snappy)).toFixed(2)}px)`,
          }}>THE DROP · 03.21</div>
          <div style={{
            position: 'absolute', left: 0, right: 0, top: TITLE_Y + 196, textAlign: 'center', fontFamily: FONT.sans,
            fontSize: 56, fontWeight: 600, letterSpacing: '-0.02em', color: C.ink,
          }}>
            <TextReveal text="Make every drop hit harder." by="word" variant="rise" start={SLAM + 12} each={16} gap={3} />
          </div>
          <div style={{
            position: 'absolute', left: 0, right: 0, top: TITLE_Y + 300, textAlign: 'center', fontFamily: FONT.sans,
            fontSize: 32, fontWeight: 500, letterSpacing: '0.02em', color: C.ink2, opacity: ramp(t, 26, 16, EASE.out),
          }}>Out now for macOS and Windows</div>
        </div>
      </div>
      {/* 曝光冲击：中心泛白，四周保留暗部 */}
      {bloom > 0.01 && (
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.6 * bloom,
          background: `radial-gradient(ellipse 60% 55% at 50% ${(TITLE_Y / 1080) * 100}%, #ffffff 0%, rgba(255,220,210,0.55) 40%, rgba(255,200,190,0) 100%)`,
        }} />
      )}
      <Vignette strength={0.55} inner={0.4} color="#030101" />
      <Grain opacity={0.1} blend="soft-light" />
    </div>
  );
};
