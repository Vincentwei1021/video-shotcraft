// keycap-smash-cut｜键帽引信+猛切句号（keycap-press-trigger × smash-cut）
// 0–25f 深色石墨台面中央 3D 键帽（⌘⏎）悬浮呼吸 → 25–28f 砰按下（3f 下沉 14px +
// 底座 12→3px 压扁 + 键面变暗）+ 底部亮环（扩散 out-cubic / 消散线性解耦）
// → 按下即引爆轰鸣段 28–58f：5 张卡 + 1 面板从四面八方高速飞入冲镜
// （ease-in 全程加速 + scale 1.5→3 冲脸 + 按速度的方向性运动模糊），背景整体
// ease-in 推近 1→1.3 + 滚动 1.5°——切点前一刻动势最猛 → 58f 一帧猛切：
// FakeDashboard variant="A" 整齐静止亮色全景，键帽已缩成小元素稳稳嵌在
// 顶栏搜索框左侧（引信呼应），死寂 82f（>50f）。总 140f。
// 质感升级：引信段改为物件特写语法（Q7）——带色相的深色台面 + 顶光 + 键帽下的地面光池，
// 浅色键帽在暗场里反差最大；键帽做出真实的键面凹弧、裙边渐变与随高度变化的两层投影；
// 亮环改成强调色发光细环 + 键底一次溢光；飞入物换成出版级卡片 / 命令面板（面板里就有 ⌘⏎），
// 模糊改为沿飞行方向的速度拖影；暗→亮的猛切让"定论"更响。时间轴全部不变。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, Card, FakeDashboard } from '../../_fixtures/Fixtures';
import { Backdrop, FONT, SpeedBlur, Vignette, softShadow, velocity } from '../../_fixtures/Polish';

const T = {
  press: 25,      // 按下起始（呼吸周期 25f，此帧位移恰好归零）
  pressEnd: 28,   // 3f 压到底，同帧引爆轰鸣段
  ringGrowEnd: 46, // 亮环扩散结束（out-cubic）
  ringFadeEnd: 52, // 亮环消散结束（线性，帧时间与扩散解耦）
  cut: 58,        // 猛切帧：>=58 全静止
  total: 140,     // 死寂 82f
};
export const KEYCAP_SMASH_CUT_DURATION = T.total;

const ACCENT = '128,136,240'; // 暗场里的强调色（与 dark fixture 的 accent 同色）

// —— 键帽：键面凹弧 + 裙边厚度（多层 box-shadow）+ 落地两层投影 ——
// thick = 裙边可见厚度（压扁的灵魂），hover = 离台面高度（px，驱动投影虚实）
const Keycap: React.FC<{ size: number; thick: number; bright: number; hover?: number; tone?: 'dark' | 'light' }> = ({
  size, thick, bright, hover = 0, tone = 'dark',
}) => {
  const k = size / 240; // 以 240 号键帽为基准等比缩放细节
  const r = size * 0.15;
  const dark = tone === 'dark';
  return (
    <div style={{
      width: size, height: size, borderRadius: r, position: 'relative',
      background: 'linear-gradient(170deg, #ffffff 0%, #f4f4f1 42%, #e4e4e0 100%)',
      boxShadow: [
        'inset 0 1.5px 0 rgba(255,255,255,1)',
        `inset 0 ${-4 * k}px ${8 * k}px rgba(30,32,40,0.08)`,
        `0 0 0 ${Math.max(1, k)}px rgba(20,22,28,${dark ? 0.35 : 0.14})`,
        // 裙边：上浅下深两段，读作有厚度的塑料侧壁
        `0 ${thick * 0.5}px 0 #c9c9c4`,
        `0 ${thick}px 0 #a9a9a4`,
        `0 ${thick + 1.5 * k}px 0 rgba(20,22,28,${dark ? 0.6 : 0.25})`,
        // 落地影：近地实、远地虚，离台面越高越散越淡
        `0 ${thick + 3 * k + hover * 0.3}px ${(6 + hover * 0.6) * k}px rgba(0,0,0,${dark ? 0.55 : 0.18})`,
        `0 ${thick + (18 + hover * 1.2) * k}px ${(40 + hover * 2) * k}px ${-6 * k}px rgba(0,0,0,${dark ? 0.6 : 0.2})`,
      ].join(', '),
      filter: bright !== 1 ? `brightness(${bright})` : undefined,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* 键面凹弧：中心微暗、上缘受光，读作手指会按下去的碟形面 */}
      <div style={{
        position: 'absolute', inset: size * 0.07, borderRadius: r * 0.75,
        background: 'radial-gradient(ellipse 70% 62% at 50% 58%, rgba(40,42,50,0.06) 0%, rgba(40,42,50,0) 70%), linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 40%)',
        boxShadow: `inset 0 ${1 * k}px ${2 * k}px rgba(30,32,40,0.06)`,
      }} />
      <div style={{
        position: 'relative', display: 'flex', alignItems: 'center', gap: size * 0.05,
        fontFamily: FONT.sans, fontSize: size * 0.28, fontWeight: 500, color: '#2a2c33', lineHeight: 1,
        letterSpacing: '-0.02em',
      }}>
        <span>⌘</span>
        <span style={{ fontSize: size * 0.25 }}>⏎</span>
      </div>
    </div>
  );
};

// —— 轰鸣段飞入物：5 张卡 + 1 面板，四面八方冲镜 ——
type Fly = {
  from: [number, number];
  to: [number, number];
  rot: [number, number];
  seed: number;
  w: number;
  h: number;
  panel?: boolean;
};

const FLIES: Fly[] = [
  { from: [-1400, -140], to: [1400, 80], rot: [-6, 5], seed: 1, w: 440, h: 290 },
  { from: [1400, 200], to: [-1400, -120], rot: [7, -4], seed: 2, w: 400, h: 260 },
  { from: [-260, -900], to: [180, 900], rot: [-3, 8], seed: 3, w: 460, h: 300 },
  { from: [-1300, 820], to: [1300, -760], rot: [5, -7], seed: 4, w: 420, h: 280 },
  { from: [1350, -800], to: [-1350, 840], rot: [-8, 4], seed: 5, w: 480, h: 310 },
  // 第 6 位：面板（更大更重，斜穿）
  { from: [1500, 700], to: [-1500, -600], rot: [4, -6], seed: 6, w: 700, h: 430, panel: true },
];

// 卡 i 的第 k 轮：start = 28 + i*3 + k*16，时长 15 / 11（第二轮更快=整体加速）。
// i=3 k=1 的 53–64f 在切点 58f 被硬切截断——绝不减速迎接切点。
const passWindow = (i: number, k: number): [number, number] => {
  const start = T.pressEnd + i * 3 + k * 16;
  const dur = k === 0 ? 15 : 11;
  return [start, start + dur];
};

// 命令面板飞入物：出版级小面板，第一行就是被按下的那条命令（⌘⏎）
const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{
    fontSize: 15, fontWeight: 500, color: G.ink2, padding: '3px 8px', borderRadius: 6,
    background: G.fill, boxShadow: `inset 0 0 0 1px ${G.hairlineStrong}, 0 1px 0 rgba(20,22,28,0.06)`,
  }}>{children}</span>
);
const FlyPanel: React.FC<{ w: number; h: number }> = ({ w, h }) => (
  <div style={{
    width: w, height: h, background: G.card, borderRadius: 20, overflow: 'hidden', boxSizing: 'border-box',
    border: `1px solid ${G.hairline}`, boxShadow: G.shadowLg, fontFamily: FONT.sans,
    display: 'flex', flexDirection: 'column',
  }}>
    <div style={{
      height: 82, display: 'flex', alignItems: 'center', gap: 14, padding: '0 28px',
      borderBottom: `1px solid ${G.hairline}`, fontSize: 22, color: G.ink3,
    }}>
      <svg width={20} height={20} viewBox="0 0 16 16" fill="none"><path d="M7 11.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM10.5 10.5l3 3" stroke={G.ink3} strokeWidth={1.6} strokeLinecap="round" /></svg>
      <span style={{ color: G.ink1 }}>deploy</span>
      <span style={{ width: 2, height: 24, background: G.accent, borderRadius: 1, marginLeft: -10 }} />
    </div>
    {[
      ['Deploy to production', '⌘⏎', true],
      ['Deploy preview', '⌥⏎', false],
      ['Roll back last deploy', '⌘Z', false],
    ].map(([label, kbd, on], i) => (
      <div key={i} style={{
        flex: 1, display: 'flex', alignItems: 'center', gap: 16, margin: '6px 12px 0', padding: '0 16px', borderRadius: 12,
        background: on ? G.accentSoft : 'transparent', fontSize: 21, color: on ? G.ink1 : G.ink2, fontWeight: on ? 550 : 450,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, flex: 'none',
          background: on ? G.accent : G.fill2, opacity: on ? 1 : 0.9,
        }} />
        <span>{label as string}</span>
        <span style={{ marginLeft: 'auto' }}><Kbd>{kbd as string}</Kbd></span>
      </div>
    ))}
    <div style={{ height: 18 }} />
  </div>
);

const FlyItem: React.FC<{ fly: Fly; i: number; frame: number }> = ({ fly, i, frame }) => {
  let active: [number, number] | null = null;
  for (let k = 0; k < 2; k++) {
    const [s, e] = passWindow(i, k);
    if (frame >= s && frame < e) { active = [s, e]; break; }
  }
  if (!active) return null;
  const [s, e] = active;
  // ease-in：全程加速，越近终点越快
  const pAt = (f: number) => interpolate(f, [s, e], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.in(Easing.quad),
  });
  const xAt = (f: number) => fly.from[0] + (fly.to[0] - fly.from[0]) * pAt(f);
  const yAt = (f: number) => fly.from[1] + (fly.to[1] - fly.from[1]) * pAt(f);
  const p = pAt(frame);
  const x = xAt(frame);
  const y = yAt(frame);
  const rot = fly.rot[0] + (fly.rot[1] - fly.rot[0]) * p;
  const scale = 1.5 + 1.5 * p; // 冲脸
  // 速度门控：沿飞行方向的拖影（ease-in 下速度 ∝ p，起步清楚、冲出时糊成一道），
  // 外加一点随冲脸增大的景深虚化
  const vx = velocity(xAt, frame);
  const vy = velocity(yAt, frame);
  return (
    <SpeedBlur vx={vx} vy={vy} amount={0.06} max={30} style={{ filter: `blur(${(0.4 + 1.6 * p).toFixed(2)}px)` }}>
      <div style={{
        position: 'absolute', left: 960 - fly.w / 2, top: 540 - fly.h / 2,
        transform: `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`,
      }}>
        {fly.panel
          ? <FlyPanel w={fly.w} h={fly.h} />
          : <Card w={fly.w} h={fly.h} seed={fly.seed}
              style={{ boxShadow: `${G.shadowSm.split(', ')[0]}, ${softShadow(48, { strength: 1.6, color: '#000000' })}` }} />}
      </div>
    </SpeedBlur>
  );
};

export const KeycapSmashCut: React.FC = () => {
  const frame = useCurrentFrame();

  // —— 死寂段：58f 起 variant A 整齐静止全景 + 键帽小元素嵌顶栏（搜索框左侧槽位），
  //    无任何随帧变化的属性 ——
  if (frame >= T.cut) {
    return (
      <div style={{ width: 1920, height: 1080, position: 'relative' }}>
        <FakeDashboard variant="A" />
        {/* 键帽句号：稳稳嵌在顶栏搜索框（x1512 起）左侧 16px，与搜索框同一中线，呼应引信 */}
        <div style={{ position: 'absolute', left: 1452, top: 13 }}>
          <Keycap size={44} thick={4} bright={1} tone="light" />
        </div>
      </div>
    );
  }

  // —— 引信段键帽运动 ——
  // 呼吸：0–25f 一个完整正弦周期（±5px），f25 位移归零接按下
  const breathY = frame < T.press ? -5 * Math.sin((2 * Math.PI * frame) / T.press) : 0;
  // 按下：3f 下沉 14px，之后保持压死
  const pressY = interpolate(frame, [T.press, T.pressEnd], [0, 14], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  // 底座厚度 12→3px 压扁（灵魂），轰鸣段保持压扁
  const thick = interpolate(frame, [T.press, T.pressEnd], [12, 3], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const bright = interpolate(frame, [T.press, T.pressEnd], [1, 0.9], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  // 离台面高度：呼吸上浮时投影散开，按下后贴死
  const hover = Math.max(0, 14 - pressY - breathY * 1.2);

  // —— 亮环：扩散 out-cubic 90→640px，消散线性，帧时间解耦，摘罩=条件挂载 ——
  const ringOn = frame >= T.press && frame < T.ringFadeEnd;
  const ringD = interpolate(frame, [T.press, T.ringGrowEnd], [90, 640], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const ringA = interpolate(frame, [T.press, T.ringFadeEnd], [0.9, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const ringBorder = interpolate(frame, [T.press, T.ringGrowEnd], [10, 2], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  // 键底溢光：压到底那一刻从键帽底缘溢出一团强调色光，随轰鸣衰减（只此一次）
  const spill = interpolate(frame, [T.press, T.pressEnd, T.pressEnd + 16], [0, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // —— 轰鸣段背景动势：整体 ease-in 推近 + 滚动，切点前仍在加速 ——
  const bgScale = interpolate(frame, [T.pressEnd, T.cut], [1, 1.3], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.in(Easing.quad),
  });
  const bgRot = interpolate(frame, [T.pressEnd, T.cut], [0, 1.5], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.in(Easing.quad),
  });
  // 轰鸣中暗角收紧，把视线往中心挤
  const vig = interpolate(frame, [T.pressEnd, T.cut], [0.35, 0.6], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.in(Easing.quad),
  });

  const keyBottom = 540 + 120 + pressY; // 键帽底缘（亮环圆心）

  return (
    <div style={{
      width: 1920, height: 1080, background: G.dark,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* 背景层（石墨台面 + 光池 + 键帽 + 亮环），轰鸣段整体加速推近 */}
      <div style={{
        width: 1920, height: 1080, position: 'absolute',
        transform: `scale(${bgScale}) rotate(${bgRot}deg)`,
        transformOrigin: '50% 50%',
      }}>
        <Backdrop tone="dark" light={{ x: 0.5, y: 0.22 }} accent="#8088f0" vignette={0} grain={0.07} style={{ inset: -80 }} />
        {/* 键帽下方的地面光池：顶光打在台面上的亮斑，让键帽"站"在一个面上 */}
        <div style={{
          position: 'absolute', left: 960 - 520, top: 540 + 40, width: 1040, height: 300,
          background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(200,204,225,0.10) 0%, rgba(200,204,225,0) 70%)',
        }} />
        {/* 键底溢光 */}
        <div style={{
          position: 'absolute', left: 960 - 260, top: keyBottom - 110, width: 520, height: 220,
          opacity: spill,
          background: `radial-gradient(ellipse 50% 50% at 50% 50%, rgba(${ACCENT},0.55) 0%, rgba(${ACCENT},0) 70%)`,
        }} />
        {ringOn && (
          <div style={{
            position: 'absolute', left: 960 - ringD / 2, top: keyBottom - ringD / 2,
            width: ringD, height: ringD, borderRadius: '50%',
            border: `${ringBorder}px solid rgba(190,196,255,0.95)`, opacity: ringA,
            boxShadow: `0 0 ${18 + ringBorder * 2}px rgba(${ACCENT},0.7), inset 0 0 ${14 + ringBorder * 2}px rgba(${ACCENT},0.55)`,
            boxSizing: 'border-box',
          }} />
        )}
        <div style={{
          position: 'absolute', left: 960 - 120, top: 540 - 120,
          transform: `translateY(${breathY + pressY}px)`,
        }}>
          <Keycap size={240} thick={thick} bright={bright} hover={hover} />
        </div>
      </div>

      {/* 轰鸣段飞入物 */}
      {frame >= T.pressEnd && FLIES.map((fly, i) => (
        <FlyItem key={i} fly={fly} i={i} frame={frame} />
      ))}
      <Vignette strength={vig} inner={0.42} color="#000000" />
    </div>
  );
};
