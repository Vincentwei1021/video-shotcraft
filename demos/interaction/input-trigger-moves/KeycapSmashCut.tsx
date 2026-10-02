// keycap-smash-cut｜键帽引信 + 猛切句号（keycap-press-trigger × smash-cut）
//
// 第二轮重设计（石墨暗场 · 黑色阳极氧化键帽 → 骨白静帧）：
// - look = graphite（近单色，白为强调）。引信段是物件特写（Q7）：石墨台面上一颗 300px 的黑色
//   阳极氧化键帽「⌘K」，顶面碟形凹弧 + 上沿轮廓光 + 可见的裙边厚度，台面上一池顶光与随悬浮高度
//   变化的落地影；画面底部一行「Press ⌘K」提示——观众被邀请去按。
// - 按下（25–28f，3f）：裙边厚度 34→6px 压扁 + 顶面下沉 40px（底座落到台面） + 顶面变暗——命门；台面上一道白热椭圆环
//   （地面透视，扁 0.3）扩散 out-cubic / 消散线性解耦，键底一次溢光。
// - 轰鸣（28–58f）：曲速——6 块暗色玻璃面板（命令行、p95 指标、工单、评审、构建图、分支）分两轮
//   从画面中心冲出、ease-in 全程加速 + 0.45→3.2 冲脸 + 沿径向速度拖影；48 条径向速度线越拉越长；
//   中心白光 ease-in 累积；台面整体 ease-in 推近 1→1.5。切点前一帧动势最猛，绝不减速。
// - 猛切（58f，一帧）：骨白静帧——标题「Everything, one keystroke away.」+ 一整扇 Quarry 应用窗：
//   侧栏、被调出的命令面板（首行 Deploy to production ⌘⏎ 高亮），同一颗黑键帽缩成 44px
//   嵌在顶栏搜索框右端（引信呼应）。暗→亮的猛切让"定论"更响；切后零随帧属性，死寂 82f。
//
// 时间表（30fps，共 140f）：
//   0–25    引信：键帽呼吸悬浮（一个完整正弦周期 ±6px，f25 归零接按下）
//   25–28   按下 3f（压扁 + 下沉 + 变暗）；28f 同帧引爆
//   25–52   地面亮环：扩散 25–46（out-cubic）/ 消散 25–52（线性）
//   28–58   轰鸣：两轮飞出（第一轮 15f、第二轮 11f，第二轮更短 = 整体加速）+ 速度线 + 台面推近
//   58–140  猛切静帧，死寂 82f
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { FONT, SpeedBlur, Grain, Vignette, velocity } from '../../_fixtures/Polish';
import { LOOKS, alpha, type } from '../../_fixtures/Look';

const L = LOOKS.graphite;

const T = {
  press: 25,
  pressEnd: 28,
  ringGrowEnd: 46,
  ringFadeEnd: 52,
  cut: 58,
  total: 140,
};
export const KEYCAP_SMASH_CUT_DURATION = T.total;

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// 骨白静帧的中性色（graphite 的反相：墨为主、白为底）
const BONE = { bg0: '#eeede9', bg1: '#e4e3de', win: '#fafaf8', ink: '#121214', ink2: '#55565c', ink3: '#94959b', line: 'rgba(18,18,20,0.09)', fill: '#efeeea' };

// —— 黑色阳极氧化键帽：底座裙边 + 收窄的顶面（真实键帽上窄下宽）——
// size = 底座宽；thick = 顶面下方可见的裙边厚度（压扁的灵魂）；整体轻微俯视（rotateX）读出体积
const Keycap: React.FC<{ size: number; thick: number; dim?: number; tilt?: number }> = ({ size, thick, dim = 0, tilt = 0 }) => {
  const k = size / 300;
  const r = size * 0.16;
  const faceW = size * 0.84;
  const faceH = size * 0.8;
  const inset = (size - faceW) / 2;
  const H = faceH + inset * 0.6 + thick; // 底座总高：顶面 + 后沿 + 前裙边
  return (
    <div style={{ position: 'relative', width: size, height: H, transform: tilt ? `perspective(${1400 * k}px) rotateX(${tilt}deg)` : undefined, transformOrigin: '50% 100%' }}>
      {/* 底座裙边：上亮下暗的侧壁 + 底沿一线环境反光 */}
      <div style={{
        position: 'absolute', left: 0, top: 0, width: size, height: H, borderRadius: r,
        background: 'linear-gradient(180deg, #34353a 0%, #1c1d20 35%, #0e0e10 80%, #08080a 100%)',
        boxShadow: `inset 0 ${1.2 * k}px 0 rgba(255,255,255,0.16), inset 0 -${1.5 * k}px 0 rgba(255,255,255,0.10), inset ${1.5 * k}px 0 0 rgba(255,255,255,0.05), inset -${1.5 * k}px 0 0 rgba(255,255,255,0.05), 0 0 0 ${Math.max(1, k)}px rgba(0,0,0,0.7)`,
      }} />
      {/* 顶面：碟形凹弧（中心微暗）+ 上沿轮廓光 */}
      <div style={{
        position: 'absolute', left: inset, top: inset * 0.6, width: faceW, height: faceH, borderRadius: r * 0.8,
        background: 'radial-gradient(ellipse 70% 60% at 50% 60%, #17181b 0%, #202125 65%, #2a2b30 100%)',
        boxShadow: `inset 0 ${1.5 * k}px 0 rgba(255,255,255,0.3), inset 0 ${12 * k}px ${20 * k}px rgba(255,255,255,0.05), inset 0 -${5 * k}px ${10 * k}px rgba(0,0,0,0.55), 0 ${2 * k}px ${4 * k}px rgba(0,0,0,0.5)`,
        filter: dim > 0 ? `brightness(${(1 - dim * 0.28).toFixed(3)})` : undefined,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: size * 0.05,
        fontFamily: FONT.sans, color: '#f2f2f0', lineHeight: 1,
      }}>
        <span style={{ fontSize: size * 0.27, fontWeight: 400 }}>⌘</span>
        <span style={{ fontSize: size * 0.27, fontWeight: 560, letterSpacing: '-0.02em' }}>K</span>
      </div>
    </div>
  );
};

// —— 轰鸣段飞出物：暗色玻璃面板 ——
const Glass: React.FC<{ w: number; h: number; children: React.ReactNode }> = ({ w, h, children }) => (
  <div style={{
    width: w, height: h, borderRadius: 22, boxSizing: 'border-box', padding: '0 30px',
    background: 'linear-gradient(180deg, rgba(44,45,50,0.96) 0%, rgba(24,25,28,0.96) 100%)',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 30px 60px -20px rgba(0,0,0,0.8)',
    display: 'flex', alignItems: 'center', gap: 22, fontFamily: FONT.sans, color: L.ink,
  }}>{children}</div>
);
const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{
    ...type(26, 560), color: L.ink2, padding: '6px 12px', borderRadius: 9, marginLeft: 'auto',
    background: 'rgba(255,255,255,0.06)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)',
  }}>{children}</span>
);
const Dot: React.FC<{ c: string }> = ({ c }) => <span style={{ width: 16, height: 16, borderRadius: 8, background: c, flex: 'none' }} />;

const PANELS: { w: number; h: number; node: React.ReactNode }[] = [
  { w: 560, h: 116, node: <><Dot c={L.accent} /><span style={type(36, 620)}>Deploy to production</span><Kbd>⌘⏎</Kbd></> },
  { w: 380, h: 150, node: <><span style={{ ...type(26, 600, { caps: true }), color: L.ink3 }}>p95</span><span style={type(76, 720)}>41<span style={{ ...type(34, 500), color: L.ink2 }}> ms</span></span></> },
  { w: 520, h: 116, node: <><span style={{ ...type(28, 600, { mono: true }), color: L.accent2 }}>QRY-412</span><span style={type(34, 560)}>Fix login redirect</span></> },
  { w: 470, h: 116, node: <><span style={{ display: 'flex' }}>{['#d8d4cc', '#a9aab0', '#6d6f76'].map((c, i) => <span key={i} style={{ width: 46, height: 46, borderRadius: 23, background: c, marginLeft: i ? -14 : 0, boxShadow: '0 0 0 3px #222327' }} />)}</span><span style={type(34, 560)}>3 approvals</span></> },
  { w: 500, h: 170, node: (
    <svg width={440} height={110} viewBox="0 0 440 110">
      <text x={0} y={30} fill={L.ink3} style={{ ...type(24, 600, { caps: true }) }}>Build time</text>
      <text x={300} y={34} fill={L.ink} style={{ ...type(40, 720) }}>−38%</text>
      <path d="M0 64 L60 70 L120 62 L180 80 L240 84 L300 92 L360 96 L440 100" stroke={L.ink} strokeWidth={3} fill="none" strokeLinecap="round" />
    </svg>
  ) },
  { w: 520, h: 116, node: <><span style={{ ...type(30, 560, { mono: true }), color: L.ink2, whiteSpace: 'nowrap' }}>main ← feat/palette</span><span style={{ ...type(26, 640), color: '#0a0a0b', background: L.ink, padding: '6px 14px', borderRadius: 999, marginLeft: 'auto' }}>Merged</span></> },
];

// 飞出角度（弧度）：六个方向错开，避免对称死板；第二轮整体旋转 30° 填空档
const ANGLES = [-2.55, -0.62, 0.35, 2.75, 1.62, -1.6];

// 第 i 块第 k 轮的时间窗：start = 28 + i*3 + k*16，时长 15 / 11（第二轮更短 = 整体加速）
const passWindow = (i: number, k: number): [number, number] => {
  const start = T.pressEnd + i * 3 + k * 16;
  return [start, start + (k === 0 ? 15 : 11)];
};

const FlyOut: React.FC<{ i: number; frame: number }> = ({ i, frame }) => {
  let win: [number, number] | null = null;
  let pass = 0;
  for (let k = 0; k < 2; k++) {
    const [s, e] = passWindow(i, k);
    if (frame >= s && frame < e) { win = [s, e]; pass = k; break; }
  }
  if (!win) return null;
  const [s, e] = win;
  const panel = PANELS[(i + pass * 3) % PANELS.length];
  const ang = ANGLES[i] + pass * 0.52;
  // ease-in：全程加速，越接近冲出画外越快
  const pAt = (f: number) => interpolate(f, [s, e], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const rAt = (f: number) => 300 + 1400 * pAt(f);
  const xAt = (f: number) => Math.cos(ang) * rAt(f);
  const yAt = (f: number) => Math.sin(ang) * rAt(f) * 0.78;
  const p = pAt(frame);
  const scale = 0.7 + 2.5 * p;
  const vx = velocity(xAt, frame);
  const vy = velocity(yAt, frame);
  const appear = Math.min(1, (frame - s + 1) / 3);
  return (
    <SpeedBlur vx={vx} vy={vy} amount={0.05} max={28} style={{ opacity: appear, filter: p > 0.4 ? `blur(${((p - 0.4) * 3).toFixed(2)}px)` : undefined }}>
      <div style={{
        position: 'absolute', left: 960 - panel.w / 2, top: 520 - panel.h / 2,
        transform: `translate(${xAt(frame).toFixed(1)}px, ${yAt(frame).toFixed(1)}px) scale(${scale.toFixed(3)}) rotate(${(Math.cos(ang) * 4 * p).toFixed(2)}deg)`,
      }}>
        <Glass w={panel.w} h={panel.h}>{panel.node}</Glass>
      </div>
    </SpeedBlur>
  );
};

// 确定性哈希
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// 径向速度线：48 条，从中心外侧向画外加速，长度 ∝ 速度；整体强度随轰鸣 ease-in 增强
const WarpLines: React.FC<{ frame: number }> = ({ frame }) => {
  const g = interpolate(frame, [T.pressEnd, T.cut], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const lines = Array.from({ length: 48 }, (_, i) => {
    const ang = hash(i * 3.1) * Math.PI * 2;
    const period = 10 + hash(i * 7.7) * 8;
    const ph = hash(i * 1.3) * period;
    const local = ((frame - T.pressEnd + ph) % period) / period; // 0→1 循环
    const e = local * local;
    const r0 = 160 + 1300 * e;
    const len = 30 + 520 * e * (0.4 + g);
    const x1 = 960 + Math.cos(ang) * r0;
    const y1 = 520 + Math.sin(ang) * r0 * 0.78;
    const x2 = 960 + Math.cos(ang) * (r0 + len);
    const y2 = 520 + Math.sin(ang) * (r0 + len) * 0.78;
    const a = (0.14 + 0.8 * g) * Math.min(1, local * 4) * (0.5 + hash(i * 9.1) * 0.5);
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff" strokeOpacity={a} strokeWidth={1.4 + 3.2 * e * (0.5 + g)} strokeLinecap="round" />;
  });
  return <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>{lines}</svg>;
};

// —— 猛切静帧：骨白 + Quarry 应用窗 + 命令面板 + 嵌在顶栏的键帽 ——
const STILL_WIN = { x: 160, y: 250, w: 1600, h: 750 };
const CMDS: [string, string, string][] = [
  ['Deploy to production', '⌘⏎', 'M12 19V5M6 11l6-6 6 6'],
  ['Open issue QRY-412', '⌘O', 'M12 12m-7.5 0a7.5 7.5 0 1 0 15 0a7.5 7.5 0 1 0 -15 0M12 12h.01'],
  ['Invite a teammate', '⌘I', 'M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3.5 20c.8-3.4 3.4-5 6.5-5s5.7 1.6 6.5 5M19 8v6M16 11h6'],
  ['Switch to dark theme', '⌘T', 'M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z'],
];
const Still: React.FC = () => (
  <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', background: `linear-gradient(180deg, ${BONE.bg0} 0%, ${BONE.bg1} 100%)`, fontFamily: FONT.sans }}>
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 55% at 50% 10%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 70%)' }} />
    {/* 标题 */}
    <div style={{ position: 'absolute', left: 0, right: 0, top: 92, textAlign: 'center', ...type(96, 760), letterSpacing: '-0.045em', color: BONE.ink }}>
      Everything, one keystroke away.
    </div>
    {/* 应用窗 */}
    <div style={{
      position: 'absolute', left: STILL_WIN.x, top: STILL_WIN.y, width: STILL_WIN.w, height: STILL_WIN.h, borderRadius: 30, overflow: 'hidden',
      background: BONE.win, border: `1px solid ${BONE.line}`,
      boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 2px 4px rgba(18,18,20,0.05), 0 40px 90px -30px rgba(18,18,20,0.35)',
    }}>
      {/* 顶栏 */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 92, borderBottom: `1px solid ${BONE.line}`, display: 'flex', alignItems: 'center', padding: '0 34px' }}>
        {[0, 1, 2].map((i) => <span key={i} style={{ width: 18, height: 18, borderRadius: 9, background: '#d6d5d0', marginRight: 12 }} />)}
        <span style={{ ...type(32, 760), letterSpacing: '-0.03em', color: BONE.ink, marginLeft: 26 }}>Quarry</span>
        {/* 搜索框：右端嵌入同一颗黑键帽 */}
        <div style={{
          position: 'absolute', left: 520, top: 18, width: 760, height: 56, borderRadius: 16, background: BONE.fill,
          boxShadow: `inset 0 0 0 1px ${BONE.line}`, display: 'flex', alignItems: 'center', padding: '0 12px 0 24px', boxSizing: 'border-box',
        }}>
          <svg width={26} height={26} viewBox="0 0 24 24" fill="none"><circle cx={10.5} cy={10.5} r={6.5} stroke={BONE.ink3} strokeWidth={2} /><path d="M15.5 15.5 20 20" stroke={BONE.ink3} strokeWidth={2} strokeLinecap="round" /></svg>
          <span style={{ ...type(28, 450), color: BONE.ink3, marginLeft: 16 }}>Search or run a command</span>
          <div style={{ marginLeft: 'auto', marginTop: -2 }}><Keycap size={48} thick={5} /></div>
        </div>
        <span style={{ marginLeft: 'auto', width: 46, height: 46, borderRadius: 23, background: 'linear-gradient(160deg, #b9b6ae, #7c7a74)' }} />
      </div>
      {/* 侧栏 */}
      <div style={{ position: 'absolute', left: 0, top: 92, bottom: 0, width: 330, borderRight: `1px solid ${BONE.line}`, padding: '34px 22px', boxSizing: 'border-box' }}>
        {['Inbox', 'Projects', 'Deploys', 'Issues', 'Docs'].map((n, i) => (
          <div key={n} style={{
            height: 70, borderRadius: 16, display: 'flex', alignItems: 'center', padding: '0 22px', marginBottom: 6,
            background: i === 2 ? BONE.fill : 'transparent', ...type(32, i === 2 ? 650 : 500), color: i === 2 ? BONE.ink : BONE.ink2,
          }}>
            {n}
            {i === 0 && <span style={{ marginLeft: 'auto', ...type(24, 650), color: BONE.ink3 }}>12</span>}
          </div>
        ))}
      </div>
      {/* 主区底层内容（被命令面板压暗的纹理） */}
      <div style={{ position: 'absolute', left: 330, right: 0, top: 92, bottom: 0, padding: '44px 56px', boxSizing: 'border-box' }}>
        <div style={{ ...type(44, 720), color: BONE.ink, opacity: 0.35 }}>Deploys</div>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 20, height: 86, borderBottom: `1px solid ${BONE.line}`, opacity: 0.3 }}>
            <span style={{ width: 14, height: 14, borderRadius: 7, background: BONE.ink2 }} />
            <span style={{ width: 300 + ((i * 97) % 220), height: 16, borderRadius: 8, background: '#d5d4cf' }} />
            <span style={{ marginLeft: 'auto', width: 110, height: 16, borderRadius: 8, background: '#e0dfda' }} />
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', left: 330, right: 0, top: 92, bottom: 0, background: 'rgba(238,237,233,0.45)' }} />
      {/* 命令面板 */}
      <div style={{
        position: 'absolute', left: 330 + (1270 - 900) / 2, top: 92 + 70, width: 900, borderRadius: 26, background: '#ffffff',
        border: `1px solid ${BONE.line}`, boxShadow: '0 2px 6px rgba(18,18,20,0.06), 0 40px 80px -24px rgba(18,18,20,0.4)', overflow: 'hidden',
      }}>
        <div style={{ height: 96, display: 'flex', alignItems: 'center', padding: '0 34px', borderBottom: `1px solid ${BONE.line}`, ...type(40, 500), color: BONE.ink }}>
          deploy<span style={{ width: 3, height: 44, background: BONE.ink, marginLeft: 4, borderRadius: 2 }} />
        </div>
        <div style={{ padding: 14 }}>
          {CMDS.map(([label, kbd, icon], i) => (
            <div key={label} style={{
              height: 88, borderRadius: 18, display: 'flex', alignItems: 'center', gap: 22, padding: '0 22px',
              background: i === 0 ? BONE.ink : 'transparent', color: i === 0 ? '#f6f6f3' : BONE.ink2, ...type(36, i === 0 ? 620 : 500),
            }}>
              <span style={{ width: 48, height: 48, borderRadius: 13, background: i === 0 ? 'rgba(255,255,255,0.14)' : BONE.fill, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width={28} height={28} viewBox="0 0 24 24" fill="none"><path d={icon} stroke={i === 0 ? '#f6f6f3' : BONE.ink2} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              {label}
              <span style={{
                marginLeft: 'auto', ...type(26, 560), padding: '6px 12px', borderRadius: 9,
                color: i === 0 ? '#f6f6f3' : BONE.ink3, boxShadow: `inset 0 0 0 1px ${i === 0 ? 'rgba(255,255,255,0.25)' : BONE.line}`,
              }}>{kbd}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
    <Grain opacity={0.04} step={9999} />
  </div>
);

export const KeycapSmashCut: React.FC = () => {
  const frame = useCurrentFrame();

  // —— 死寂段：58f 起一帧猛切到静帧，无任何随帧属性 ——
  if (frame >= T.cut) return <Still />;

  // —— 引信 ——
  const breathY = frame < T.press ? -6 * Math.sin((2 * Math.PI * frame) / T.press) : 0;
  // 下沉 40px = 裙边压扁 28px + 悬浮余量 12px：底座落到台面上、顶面整体沉下去
  const pressY = interpolate(frame, [T.press, T.pressEnd], [0, 40], clamp);
  const thick = interpolate(frame, [T.press, T.pressEnd], [34, 6], clamp);
  const dim = interpolate(frame, [T.press, T.pressEnd], [0, 1], clamp);
  const hover = Math.max(0, 12 - Math.max(0, pressY - 28) - breathY * 1.4); // 离台面高度

  // 地面亮环（椭圆 = 台面透视）：扩散 out-cubic / 消散线性解耦
  const ringOn = frame >= T.press && frame < T.ringFadeEnd;
  const ringD = interpolate(frame, [T.press, T.ringGrowEnd], [260, 1500], { ...clamp, easing: Easing.out(Easing.cubic) });
  const ringA = interpolate(frame, [T.press, T.ringFadeEnd], [1, 0], clamp);
  const ringBw = interpolate(frame, [T.press, T.ringGrowEnd], [9, 2], { ...clamp, easing: Easing.out(Easing.cubic) });
  const spill = interpolate(frame, [T.press, T.pressEnd, T.pressEnd + 18], [0, 1, 0], clamp);

  // 轰鸣段台面推近（ease-in，切点前仍在加速）
  const push = interpolate(frame, [T.pressEnd, T.cut], [1, 1.5], { ...clamp, easing: Easing.in(Easing.quad) });
  const hint = 1 - interpolate(frame, [T.press - 2, T.press + 4], [0, 1], clamp);
  const hintIn = interpolate(frame, [2, 14], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });

  const SIZE = 300;
  const KX = 960 - SIZE / 2;
  const KY = 520 - SIZE / 2 - 10;
  const baseY = KY + 300; // 台面接触线（固定；悬浮时键帽底缘离它 12px，按到底贴死）

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', background: L.bg[2] }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${push.toFixed(4)})`, transformOrigin: '50% 50%' }}>
        {/* 背景墙 → 台面：上半暗墙、下半台面，接缝是一条极淡的地平线光 */}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${L.bg[0]} 0%, ${L.bg[1]} 58%, #121316 62%, #0b0b0d 100%)` }} />
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 42% 60% at 50% 18%, ${alpha(L.light, 0.16)} 0%, ${alpha(L.light, 0)} 70%)` }} />
        {/* 顶光打在台面上的光池 */}
        <div style={{ position: 'absolute', left: 960 - 700, top: baseY - 170, width: 1400, height: 340, background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha(L.light, 0.14)} 0%, ${alpha(L.light, 0)} 70%)` }} />
        {/* 键底溢光 */}
        <div style={{ position: 'absolute', left: 960 - 420, top: baseY - 120, width: 840, height: 240, opacity: spill, background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 70%)' }} />
        {/* 落地影：近实远虚，随悬浮高度变化 */}
        <div style={{
          position: 'absolute', left: 960 - (SIZE * 0.62 + hover * 3), top: baseY - 26 - hover * 0.4, width: (SIZE * 0.62 + hover * 3) * 2, height: 52 + hover,
          borderRadius: '50%', background: `radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0,0,0,${(0.85 - hover * 0.015).toFixed(3)}) 0%, rgba(0,0,0,0) 70%)`,
          filter: `blur(${(6 + hover * 0.5).toFixed(1)}px)`,
        }} />
        {ringOn && (
          <div style={{
            position: 'absolute', left: 960 - ringD / 2, top: baseY - (ringD * 0.3) / 2, width: ringD, height: ringD * 0.3,
            borderRadius: '50%', boxSizing: 'border-box', border: `${ringBw}px solid rgba(255,255,255,0.95)`, opacity: ringA,
            boxShadow: `0 0 ${20 + ringBw * 3}px rgba(255,255,255,0.55), inset 0 0 ${16 + ringBw * 2}px rgba(255,255,255,0.35)`,
          }} />
        )}
        <div style={{ position: 'absolute', left: KX, top: KY, transform: `translateY(${(breathY + pressY).toFixed(2)}px)` }}>
          <Keycap size={SIZE} thick={thick} dim={dim} tilt={22} />
        </div>
        {/* 提示行 */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 880, textAlign: 'center', ...type(34, 500), letterSpacing: '0.02em', color: L.ink3,
          opacity: hintIn * hint,
        }}>
          Press <span style={{ color: L.ink, fontWeight: 650 }}>⌘K</span> to begin
        </div>
      </div>

      {/* 能量累积：中心一团白光 ease-in 增亮，切点前一帧最亮（猛切从最满的一帧断开） */}
      <div style={{
        position: 'absolute', inset: 0, opacity: interpolate(frame, [T.pressEnd, T.cut - 1], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) }),
        background: 'radial-gradient(ellipse 46% 42% at 50% 48%, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0) 72%)',
        mixBlendMode: 'screen',
      }} />
      {frame >= T.pressEnd && <WarpLines frame={frame} />}
      {frame >= T.pressEnd && PANELS.map((_, i) => <FlyOut key={i} i={i} frame={frame} />)}
      <Vignette strength={interpolate(frame, [T.pressEnd, T.cut], [0.5, 0.75], { ...clamp, easing: Easing.in(Easing.quad) })} inner={0.38} color="#000000" />
      <Grain opacity={0.09} blend="soft-light" />
    </div>
  );
};
