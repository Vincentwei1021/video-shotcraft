// 三连咔哒特写（wright-triple-cut）——Edgar Wright 式流程三连快切：三个超近特写咔哒咔哒咔哒连打，
// 第三声甩回全景亮结果，把"操作很简单"剪成肌肉记忆。
//
// 第二轮重设计（look = ember · 虚构智能供暖 App「Hearth」）：
// - 全景是为镜头设计的家居面板：三张房间卡（Kitchen / Living room / Studio），每张卡有电源钮、
//   270° 温度表盘（120px 细体读数）与 Boost 开关；橙色只属于"正在加热"——开场全片没有一点橙。
// - 三个特写就是中间那张卡自己的三个控件，按原生尺寸重画（不是放大位图，字和描边锐利）：
//   ① 电源钮按下亮起 ② Boost 开关拨到右（圆钮滑动时拉伸）③ 表盘 19°→22°（弧线扫过 + 读数跳变）。
//   三镜同构图（主体屏心、同倍率感）、同一套暖黑微距散景底（每镜换散景排布，切点可读），
//   左下角统一的「01 POWER / 02 BOOST / 03 SET 22°」步骤号把三连读成一个流程。
// - 每个特写 10f：静 4f + 动作 3f + 静 3f；状态翻转在动作窗中点二值跳变（p≥0.5），保"咔哒"的干脆。
// - 第三声后 7f whip：上一镜整体甩出画左、全景从右甩入，首尾相接不留空，按速度横向运动模糊；
//   落点是那张卡——抬起、橙色描边泛光、其余两卡压暗，状态胶囊「Heating · ready in 12 min」弹出。
//
// 时间表（30fps，共 130f）：
//   0–25    全景 hold：开场态（全部未加热），极缓推向中间卡 1.0→1.03
//   25–34   特写一 电源（29–32 动作）
//   35–44   特写二 Boost（39–42 动作）
//   45–54   特写三 表盘（49–52 动作）
//   55–62   whip 甩回全景（poly(5) out）
//   57–76   结果：卡片抬起 + 描边泛光 + 压暗；64 状态胶囊弹出
//   76–130  hold（≥45f）：极缓推镜 1.0→1.015，干净海报
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { EASE, FONT, Grain, SpeedBlur, Vignette, mix, ramp, velocity } from '../../_fixtures/Polish';
import { LOOKS, alpha, springAt } from '../../_fixtures/Look';

export const WRIGHT_TRIPLE_CUT_DURATION = 130; // 全景 25f + 三特写 30f + 甩回与结果 75f

const L = LOOKS.ember;
const HOLD_END = 25;
const C1 = 25; // 特写一：电源
const C2 = 35; // 特写二：Boost
const C3 = 45; // 特写三：表盘
const WHIP = 55; // 甩回全景
const WHIP_DUR = 7;

// 特写动作进度：局部 4–7f（3f 动作窗）
const act = (f: number, start: number, ease: (t: number) => number) => ramp(f, start + 4, 3, ease);

const hash = (n: number) => {
  const x = Math.sin(n * 91.7 + 13.3) * 43758.5453;
  return x - Math.floor(x);
};

// ───────────── 控件（全景卡与特写共用，按尺寸参数原生绘制） ─────────────

const PowerIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round">
    <path d="M12 3.5v8" />
    <path d="M7.05 6.6a7.5 7.5 0 1 0 9.9 0" />
  </svg>
);

// 电源钮：深色玻璃圆钮；on = 橙芯 + 外圈光；press = 0–1 按下深度
const PowerButton: React.FC<{ size: number; on: boolean; press?: number }> = ({ size, on, press = 0 }) => (
  // 外圈机加工金属边框（固定不动），按下的只有里面的钮
  <div style={{
    width: size * 1.14, height: size * 1.14, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(160deg, #4a3a30 0%, #1c1410 45%, #0b0806 100%)',
    boxShadow: `inset 0 1px 0 rgba(255,225,205,0.18), inset 0 -1px 0 rgba(0,0,0,0.6), 0 ${(size * 0.05).toFixed(1)}px ${(size * 0.14).toFixed(1)}px rgba(0,0,0,0.6)`,
  }}>
  <div style={{
    width: size, height: size, borderRadius: '50%', position: 'relative',
    transform: `translateY(${(press * size * 0.02).toFixed(2)}px) scale(${(1 - 0.05 * press).toFixed(4)})`,
    background: on
      ? `radial-gradient(circle at 50% 38%, #ff8a4c 0%, ${L.accent} 45%, #c2410c 100%)`
      : 'radial-gradient(circle at 50% 30%, #3a2c25 0%, #241a15 60%, #1a120e 100%)',
    boxShadow: [
      `inset 0 ${(size * 0.012).toFixed(1)}px 0 rgba(255,255,255,${on ? 0.45 : 0.1})`,
      `inset 0 -${(size * 0.03).toFixed(1)}px ${(size * 0.06).toFixed(1)}px rgba(0,0,0,${on ? 0.25 : 0.4})`,
      `0 0 0 ${(size * 0.012).toFixed(1)}px rgba(255,210,180,${on ? 0.35 : 0.08})`,
      `0 ${(size * (0.08 - 0.06 * press)).toFixed(1)}px ${(size * (0.2 - 0.12 * press)).toFixed(1)}px rgba(0,0,0,0.55)`,
      on ? `0 0 ${(size * 0.5).toFixed(1)}px ${alpha(L.accent, 0.55)}` : '0 0 0 transparent',
    ].join(', '),
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <PowerIcon size={size * 0.44} color={on ? '#fff6ee' : '#8a776c'} />
  </div>
  </div>
);

// 开关：p = 0–1 圆钮行程（滑动途中横向拉伸）；on 决定轨道色
const Toggle: React.FC<{ w: number; p: number; on: boolean }> = ({ w, p, on }) => {
  const hgt = w * 0.56;
  const pad = hgt * 0.09;
  const knob = hgt - pad * 2;
  const stretch = knob * 0.28 * Math.sin(Math.PI * Math.min(1, Math.max(0, p)));
  const x = pad + p * (w - knob - pad * 2) - stretch * p;
  return (
    <div style={{
      width: w, height: hgt, borderRadius: hgt / 2, position: 'relative', flex: 'none',
      background: on ? `linear-gradient(180deg, #ff8a4c 0%, ${L.accent} 100%)` : 'linear-gradient(180deg, #2a201b 0%, #33271f 100%)',
      boxShadow: on
        ? `inset 0 ${(hgt * 0.03).toFixed(1)}px ${(hgt * 0.08).toFixed(1)}px rgba(120,30,0,0.35), 0 0 ${(hgt * 0.6).toFixed(1)}px ${alpha(L.accent, 0.45)}`
        : `inset 0 ${(hgt * 0.03).toFixed(1)}px ${(hgt * 0.08).toFixed(1)}px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,220,200,0.08)`,
    }}>
      <div style={{
        position: 'absolute', top: pad, left: x, width: knob + stretch, height: knob, borderRadius: knob / 2,
        background: 'linear-gradient(180deg, #fffaf6 0%, #efe4dc 100%)',
        boxShadow: `inset 0 1px 0 #fff, 0 ${(knob * 0.06).toFixed(1)}px ${(knob * 0.16).toFixed(1)}px rgba(0,0,0,0.45)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* 火苗：外焰 + 内焰两层，on 时亮橙 */}
        <svg width={knob * 0.5} height={knob * 0.5} viewBox="0 0 24 24">
          <path d="M12 1.8c.9 3.6 6.4 6.2 6.4 12.1A6.4 6.4 0 0 1 12 20.3a6.4 6.4 0 0 1-6.4-6.4c0-3.4 1.9-5.3 3.4-6.6.1 2.2 1 3.6 2.4 4.2C10.6 8.1 11 4.9 12 1.8z"
            fill={on ? L.accent : '#c9bbb1'} />
          <path d="M12 11.4c.6 1.8 3.1 2.9 3.1 5.2a3.1 3.1 0 0 1-6.2 0c0-1.4.8-2.3 1.5-2.8.2.9.6 1.4 1.1 1.6-.2-1.4-.1-2.7.5-4z"
            fill={on ? L.accent2 : '#e6dcd4'} />
        </svg>
      </div>
    </div>
  );
};

// 270° 温度表盘：frac = 填充比例（0–1），heat = 是否加热（橙 / 暖白）
const DIAL_SWEEP = 0.75;
const tempFrac = (t: number) => (t - 10) / 20; // 10–30°
const Dial: React.FC<{ r: number; stroke: number; frac: number; heat: boolean; ticks?: boolean; id: string }> = ({ r, stroke, frac, heat, ticks, id }) => {
  const size = r * 2 + stroke * 2 + (ticks ? stroke * 3 : 0);
  const c = size / 2;
  const C = 2 * Math.PI * r;
  const ang = (135 + 270 * frac) * (Math.PI / 180);
  const ex = c + r * Math.cos(ang);
  const ey = c + r * Math.sin(ang);
  return (
    <svg width={size} height={size} style={{ position: 'absolute', left: -size / 2, top: -size / 2, overflow: 'visible' }}>
      <defs>
        <linearGradient id={`dial${id}`} x1="0" y1={size} x2={size} y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={heat ? L.accent2 : '#d9cdc4'} />
          <stop offset="1" stopColor={heat ? L.accent : '#f6efe9'} />
        </linearGradient>
      </defs>
      {ticks && Array.from({ length: 41 }, (_, k) => {
        const a = (135 + (270 * k) / 40) * (Math.PI / 180);
        const r0 = r + stroke * 1.1;
        const r1 = r0 + stroke * (k % 5 === 0 ? 1.1 : 0.6);
        const lit = k / 40 <= frac + 1e-6;
        return <line key={k} x1={c + r0 * Math.cos(a)} y1={c + r0 * Math.sin(a)} x2={c + r1 * Math.cos(a)} y2={c + r1 * Math.sin(a)}
          stroke={lit ? (heat ? L.accent : '#f6efe9') : 'rgba(255,220,200,0.16)'} strokeWidth={Math.max(1.5, stroke * 0.12)} strokeLinecap="round" />;
      })}
      <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,220,200,0.09)" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${(C * DIAL_SWEEP).toFixed(2)} ${C.toFixed(2)}`} transform={`rotate(135 ${c} ${c})`} />
      <circle cx={c} cy={c} r={r} fill="none" stroke={`url(#dial${id})`} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${(C * DIAL_SWEEP * frac).toFixed(2)} ${C.toFixed(2)}`} transform={`rotate(135 ${c} ${c})`}
        style={{ filter: heat ? `drop-shadow(0 0 ${(stroke * 0.8).toFixed(1)}px ${alpha(L.accent, 0.7)})` : undefined }} />
      {/* 弧端旋钮点 */}
      <circle cx={ex} cy={ey} r={stroke * 0.78} fill="#fffaf6" style={{ filter: `drop-shadow(0 0 ${(stroke * 0.5).toFixed(1)}px ${alpha(heat ? L.accent : '#ffffff', 0.6)})` }} />
    </svg>
  );
};

const Deg: React.FC<{ v: number; size: number; color?: string; weight?: number }> = ({ v, size, color = L.ink, weight = 250 }) => (
  <div style={{ fontFamily: FONT.sans, fontSize: size, fontWeight: weight, color, letterSpacing: '-0.05em', lineHeight: 1, fontVariantNumeric: 'tabular-nums', display: 'flex' }}>
    {v}<span style={{ fontSize: size * 0.5, marginTop: size * 0.06, marginLeft: size * 0.02, fontWeight: 400 }}>°</span>
  </div>
);

// ───────────── 全景：房间卡 ─────────────
const CARD_W = 500;
const CARD_H = 570;
const CARD_GAP = 40;
const CARDS_LEFT = (1920 - (3 * CARD_W + 2 * CARD_GAP)) / 2; // 170
const CARD_TOP = 300;
const HERO = { left: CARDS_LEFT + CARD_W + CARD_GAP, top: CARD_TOP }; // 中间卡

type Room = { name: string; temp: number; status: string; power: boolean; boost: boolean; heat: boolean };
const ROOMS_BEFORE: Room[] = [
  { name: 'Kitchen', temp: 20, status: 'Idle', power: true, boost: false, heat: false },
  { name: 'Living room', temp: 19, status: 'Off', power: false, boost: false, heat: false },
  { name: 'Studio', temp: 18, status: 'Eco', power: true, boost: false, heat: false },
];
const HERO_AFTER: Room = { name: 'Living room', temp: 22, status: 'Heating', power: true, boost: true, heat: true };

const RoomCard: React.FC<{ room: Room; id: string; dim?: number }> = ({ room, id, dim = 0 }) => (
  <div style={{
    width: CARD_W, height: CARD_H, borderRadius: 36, position: 'relative', overflow: 'hidden', fontFamily: FONT.sans,
    background: `linear-gradient(180deg, ${L.surface2} 0%, ${L.surface} 100%)`,
    boxShadow: `inset 0 1px 0 rgba(255,235,220,0.08), 0 0 0 1px ${L.line}, 0 30px 70px -24px rgba(0,0,0,0.85)`,
  }}>
    <div style={{ position: 'absolute', left: 40, top: 46, fontSize: 40, fontWeight: 600, color: L.ink, letterSpacing: '-0.02em' }}>{room.name}</div>
    <div style={{ position: 'absolute', right: 30, top: 26 }}><PowerButton size={72} on={room.power && room.heat} /></div>
    {/* 表盘 + 读数 */}
    <div style={{ position: 'absolute', left: CARD_W / 2, top: 292 }}>
      <Dial r={140} stroke={16} frac={tempFrac(room.temp)} heat={room.heat} id={id} />
      <div style={{ position: 'absolute', left: -150, width: 300, top: -70, display: 'flex', justifyContent: 'center' }}>
        <Deg v={room.temp} size={120} />
      </div>
      <div style={{ position: 'absolute', left: -150, width: 300, top: 62, textAlign: 'center', fontSize: 32, fontWeight: 500, color: room.heat ? L.accent : L.ink2 }}>{room.status}</div>
    </div>
    {/* Boost 行 */}
    <div style={{ position: 'absolute', left: 40, right: 40, bottom: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 34, fontWeight: 500, color: L.ink2 }}>Boost</span>
      <Toggle w={108} p={room.boost ? 1 : 0} on={room.boost} />
    </div>
    {dim > 0.005 && <div style={{ position: 'absolute', inset: 0, background: `rgba(7,4,3,${(0.55 * dim).toFixed(3)})` }} />}
  </div>
);

const Dashboard: React.FC<{ after: boolean; heroLift?: number; glow?: number; dim?: number; pill?: number }> = ({ after, heroLift = 0, glow = 0, dim = 0, pill = 0 }) => (
  <div style={{ position: 'absolute', inset: 0 }}>
    <div style={{ position: 'absolute', left: CARDS_LEFT, top: 92, display: 'flex', alignItems: 'center', gap: 14, fontFamily: FONT.sans }}>
      <svg width={30} height={30} viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" fill={L.accent} /></svg>
      <span style={{ fontSize: 30, fontWeight: 700, color: L.ink, letterSpacing: '-0.01em' }}>Hearth</span>
    </div>
    <div style={{ position: 'absolute', left: CARDS_LEFT, top: 148, fontFamily: FONT.sans, fontSize: 76, fontWeight: 650, color: L.ink, letterSpacing: '-0.035em' }}>
      Good evening, Maya.
    </div>
    <div style={{ position: 'absolute', right: CARDS_LEFT, top: 176, fontFamily: FONT.sans, fontSize: 34, fontWeight: 500, color: L.ink2, fontVariantNumeric: 'tabular-nums' }}>
      Outside <span style={{ color: L.ink }}>4°</span> · Thu 19:40
    </div>
    {ROOMS_BEFORE.map((r, i) => {
      const hero = i === 1;
      const room = hero && after ? HERO_AFTER : r;
      return (
        <div key={r.name} style={{
          position: 'absolute', left: CARDS_LEFT + i * (CARD_W + CARD_GAP), top: CARD_TOP, borderRadius: 36,
          transform: hero ? `translateY(${(-14 * heroLift).toFixed(2)}px) scale(${(1 + 0.025 * heroLift).toFixed(4)})` : undefined,
          boxShadow: hero && glow > 0.005
            ? `0 0 0 2px ${alpha(L.accent, 0.9 * glow)}, 0 0 0 10px ${alpha(L.accent, 0.1 * glow)}, 0 40px 90px -20px ${alpha(L.accent, 0.45 * glow)}`
            : undefined,
          zIndex: hero ? 2 : 1,
        }}>
          <RoomCard room={room} id={`w${i}`} dim={hero ? 0 : dim} />
          {/* 状态胶囊：卡片下沿外弹出（"结果"的一句话） */}
          {hero && pill > 0.005 && (
            <div style={{
              position: 'absolute', left: '50%', top: CARD_H + 30, transform: `translateX(-50%) scale(${pill.toFixed(4)})`, transformOrigin: '50% 0%',
              opacity: Math.min(1, pill * 2.5), whiteSpace: 'nowrap', padding: '14px 30px', borderRadius: 999, fontFamily: FONT.sans,
              background: L.accent, color: L.onAccent, fontSize: 32, fontWeight: 650, letterSpacing: '-0.01em',
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.4), 0 14px 40px -10px ${alpha(L.accent, 0.7)}`,
            }}>Heating · ready in 12 min</div>
          )}
        </div>
      );
    })}
  </div>
);

// 舞台：暖黑渐变 + 顶部暖光（全景与特写共用色温）
const Backplate: React.FC<{ keyX?: number; keyY?: number }> = ({ keyX = 50, keyY = 0 }) => (
  <div style={{
    position: 'absolute', inset: 0,
    background: `radial-gradient(ellipse 70% 60% at ${keyX}% ${keyY}%, ${alpha(L.light, 0.16)} 0%, ${alpha(L.light, 0)} 70%), linear-gradient(180deg, ${L.bg[0]} 0%, ${L.bg[1]} 55%, ${L.bg[2]} 100%)`,
  }} />
);

// ───────────── 特写 ─────────────
// 微距散景底：几颗预模糊的大光斑（径向渐变，无实时滤镜），每镜不同排布
const Bokeh: React.FC<{ seed: number }> = ({ seed }) => (
  <>
    {Array.from({ length: 7 }, (_, k) => {
      const x = hash(seed * 7 + k) * 1920;
      const y = hash(seed * 11 + k * 3) * 1080;
      const s = 220 + hash(seed * 5 + k * 9) * 420;
      const warm = hash(seed + k * 17) > 0.45;
      return <div key={k} style={{
        position: 'absolute', left: x - s / 2, top: y - s / 2, width: s, height: s, borderRadius: '50%',
        background: `radial-gradient(circle, ${alpha(warm ? L.accent : '#ffe2cc', warm ? 0.13 : 0.06)} 0%, ${alpha(L.accent, 0)} 70%)`,
      }} />;
    })}
  </>
);

const STEP_LABEL = ['01  POWER', '02  BOOST', '03  SET 22°'];

const Closeup: React.FC<{ step: number; local: number; children: React.ReactNode }> = ({ step, local, children }) => {
  const push = mix(1, 1.025, Math.min(1, local / 10)); // 镜内极缓推近，读作微距
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <Backplate keyX={40 + step * 10} keyY={-10} />
      <Bokeh seed={step + 3} />
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${push.toFixed(4)})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
      <div style={{
        position: 'absolute', left: 120, bottom: 104, fontFamily: FONT.mono, fontSize: 32, fontWeight: 500, letterSpacing: '0.12em',
        color: alpha(L.ink, 0.75), display: 'flex', gap: 18, alignItems: 'center',
      }}>
        <span style={{ width: 12, height: 12, borderRadius: 6, background: L.accent, boxShadow: `0 0 14px ${alpha(L.accent, 0.8)}` }} />
        {STEP_LABEL[step]}
      </div>
    </div>
  );
};

const DialCloseup: React.FC<{ p: number; local: number }> = ({ p, local }) => {
  const frac = mix(tempFrac(19), tempFrac(22), p);
  return (
    <Closeup step={2} local={local}>
      <div style={{ position: 'relative', width: 0, height: 0, top: 30 }}>
        <Dial r={360} stroke={38} frac={frac} heat ticks id="cu3" />
        <div style={{ position: 'absolute', left: -400, width: 800, top: -170, display: 'flex', justifyContent: 'center' }}>
          <Deg v={p >= 0.5 ? 22 : 19} size={300} weight={200} />
        </div>
        <div style={{ position: 'absolute', left: -300, width: 600, top: 150, textAlign: 'center', fontFamily: FONT.sans, fontSize: 44, fontWeight: 500, color: L.accent }}>
          Heating to 22°
        </div>
      </div>
    </Closeup>
  );
};

export const WrightTripleCut: React.FC = () => {
  const f = useCurrentFrame();

  // ===== 0–24：全景 hold（开场态，极缓推向中间卡） =====
  if (f < HOLD_END) {
    const s = mix(1, 1.03, ramp(f, 0, HOLD_END + 6, EASE.smooth));
    return (
      <div style={{ width: 1920, height: 1080, overflow: 'hidden', position: 'relative' }}>
        <Backplate />
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${s.toFixed(5)})`, transformOrigin: `${HERO.left + CARD_W / 2}px ${HERO.top + CARD_H / 2}px` }}>
          <Dashboard after={false} />
        </div>
        <Vignette strength={0.5} inner={0.42} color={L.shadow} />
        <Grain opacity={0.08} blend="soft-light" />
      </div>
    );
  }

  // ===== 特写一（25–34）：电源钮按下亮起 =====
  if (f < C2) {
    const p = act(f, C1, EASE.snappy);
    const press = Math.sin(Math.PI * p); // 按下再回弹（3f 内）
    return (
      <div style={{ width: 1920, height: 1080, overflow: 'hidden', position: 'relative' }}>
        <Closeup step={0} local={f - C1}>
          <PowerButton size={460} on={p >= 0.5} press={press} />
        </Closeup>
        <Vignette strength={0.55} inner={0.38} color={L.shadow} />
        <Grain opacity={0.09} blend="soft-light" />
      </div>
    );
  }

  // ===== 特写二（35–44）：Boost 开关从左拨到右 =====
  if (f < C3) {
    const p = act(f, C2, EASE.snappy);
    return (
      <div style={{ width: 1920, height: 1080, overflow: 'hidden', position: 'relative' }}>
        <Closeup step={1} local={f - C2}>
          <Toggle w={760} p={p} on={p >= 0.5} />
        </Closeup>
        <Vignette strength={0.55} inner={0.38} color={L.shadow} />
        <Grain opacity={0.09} blend="soft-light" />
      </div>
    );
  }

  // ===== 特写三（45–54）：表盘 19° → 22° =====
  if (f < WHIP) {
    return (
      <div style={{ width: 1920, height: 1080, overflow: 'hidden', position: 'relative' }}>
        <DialCloseup p={act(f, C3, EASE.snappy)} local={f - C3} />
        <Vignette strength={0.55} inner={0.38} color={L.shadow} />
        <Grain opacity={0.09} blend="soft-light" />
      </div>
    );
  }

  // ===== 55 起：甩回全景 + 结果亮起 =====
  const whipAt = (fr: number) => {
    const t = fr - WHIP;
    // whip：7f 从右侧 1920px 高速甩入，poly(5) out 急减速；t≥7 恒为 0（真静止）
    return t >= WHIP_DUR ? 0 : interpolate(t, [0, WHIP_DUR], [1920, 0], {
      easing: Easing.out(Easing.poly(5)), extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });
  };
  const whipX = whipAt(f);
  const vx = f < WHIP + WHIP_DUR ? velocity((fr) => whipAt(Math.max(WHIP, fr)), f) : 0;

  const glow = ramp(f, 58, 16, EASE.out);
  const lift = springAt(f, 58, { damping: 16, stiffness: 160 });
  const dim = ramp(f, 58, 20, EASE.smooth);
  const pill = springAt(f, 64, { damping: 13, stiffness: 200 });
  const cam = mix(1, 1.015, ramp(f, 76, WRIGHT_TRIPLE_CUT_DURATION - 76, EASE.smooth));

  return (
    <div style={{ width: 1920, height: 1080, overflow: 'hidden', position: 'relative' }}>
      <Backplate />
      <SpeedBlur vx={vx} amount={0.06} max={40}>
        {/* 甩镜：上一镜（表盘特写终态）与全景首尾相接一起向左甩，画面不留空 */}
        {whipX > 0.5 && (
          <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transform: `translateX(${(whipX - 1920).toFixed(2)}px)` }}>
            <DialCloseup p={1} local={10} />
          </div>
        )}
        <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transform: `translateX(${whipX.toFixed(2)}px)` }}>
          <div style={{ position: 'absolute', inset: 0, transform: `scale(${cam.toFixed(5)})`, transformOrigin: `${HERO.left + CARD_W / 2}px ${HERO.top + CARD_H / 2}px` }}>
            <Dashboard after heroLift={lift} glow={glow} dim={dim} pill={pill} />
          </div>
        </div>
      </SpeedBlur>
      <Vignette strength={0.5} inner={0.42} color={L.shadow} />
      <Grain opacity={0.08} blend="soft-light" />
    </div>
  );
};
