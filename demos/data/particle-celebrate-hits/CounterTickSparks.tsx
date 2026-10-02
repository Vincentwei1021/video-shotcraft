// counter-tick-sparks —— 数字跳动溅火（计数器每破整千，数字顶部迸一撮火星）
//
// 第二轮重设计（石墨 · 金属数字 · 砂轮火花）：
// - look = graphite（近单色暗场，白为强调、暖金火星为唯一色）。主角是一行 300px 的拉丝金属数字，
//   立在一面镜面黑地台上（地平线一道冷光、数字与火星都有倒影）——像产品发布会舞台上的实时计数大屏。
// - 内容：公测候补名单实时计数 42,380 → 60,000（一直是 5 位，不需要幽灵零）。
//   层级：千位与万位是"读数"（亮金属），百十个位是"在跑的尾数"（压暗 45%），观众的眼睛只盯会跳的那一位。
// - 手法核心不变，但火星有了来源：每破整千，**刚跳过的那一位数字**被"敲红"——字面一瞬白热再冷却回金属
//   （热度 7f 衰减），火星从这一位的顶上像砂轮火花一样喷出：斜向上扇形、重力下坠、落到镜面地台上
//   弹一次（恢复系数 0.38）再熄灭；色温随寿命 白热 → 金 → 暗橙。18 次 tick 随计数减速由密到疏（叮叮叮…叮……叮）。
// - 终值 60,000：所有尾数一起亮起、数字物理弹簧弹一下（damping 13，一次可见过冲）、
//   沿整行数字顶缘迸 64 颗大火星 + 地台一圈冲击光环扩散；副标题第二句升起。
//
// 时间表（30fps，共 160f）：
//   0–16    预备：舞台光、地平线从中间拉开、数字由虚到实（已是 42,380）、眉题与副标题升起
//   14–102  计数（88f，power-out 减速）；每破整千一次 tick：该位敲红 + 8–12 颗火星
//            前段 tick 间隔 ~3f（密集），最后一千用了 ~26f（悬念）
//   102     终值 60,000：弹簧 pop + 64 颗大火星 + 冲击光环
//   102–136 余波：火星落地弹跳熄灭（全部 ≤34f 寿命）；第二句副标题升起
//   136–160 hold：干净海报（只有地平线光的极缓呼吸）
import React from 'react';
import { AbsoluteFill, interpolateColors, useCurrentFrame } from 'remotion';
import { EASE, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, springAt, type } from '../../_fixtures/Look';

export const COUNTER_TICK_SPARKS_DURATION = 160;

const L = LOOKS.graphite;
const FROM = 42380;
const TARGET = 60000;
const C0 = 14; // 起数帧
const C1 = 102; // 终值帧（揭晓）
const SIZE = 300; // 数字字号
const DIGIT_W = 0.6; // 每位步进（em，tabular）
const COMMA_W = 0.26;
const FLOOR_Y = 720; // 镜面地台
const LIFT = 62; // 数字基线离地台的高度：逗号尾巴刚好落在台面上，数字与倒影之间留一道缝
const BASE_Y = FLOOR_Y - LIFT; // 数字基线
const GRAV = 0.95; // px/f²
const BOUNCE = 0.38; // 落地恢复系数

const frac = (x: number) => x - Math.floor(x);
const rnd = (i: number, salt: number) => frac(Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453);

// 计数：power-out（指数 2.3）——前段飞快、末段很慢，tick 间隔由密到疏
const countK = (f: number) => {
  const t = Math.min(1, Math.max(0, (f - C0) / (C1 - C0)));
  return 1 - Math.pow(1 - t, 2.3);
};
const valueAt = (f: number) => Math.round(FROM + (TARGET - FROM) * countK(f));
const digitsOf = (v: number) => String(v).padStart(5, '0').split('').map(Number); // [万, 千, 百, 十, 个]

// 预解析 tick：跳过整千的帧 + 哪一位（最高的那个变化位：千位，或进位到万位）
type Tick = { f: number; slot: number; big: boolean };
const TICKS: Tick[] = (() => {
  const out: Tick[] = [];
  let prev = FROM;
  for (let f = C0 + 1; f <= C1; f++) {
    const v = valueAt(f);
    if (Math.floor(v / 1000) > Math.floor(prev / 1000) && f < C1) {
      const a = digitsOf(prev), b = digitsOf(v);
      out.push({ f, slot: a[0] !== b[0] ? 0 : 1, big: false });
    }
    prev = v;
  }
  out.push({ f: C1, slot: 2, big: true }); // 终值揭晓（整行）
  return out;
})();

// 每一位"最近一次被敲"的帧 → 热度
const heatOf = (frame: number, slot: number) => {
  let h = 0;
  for (const tk of TICKS) {
    if (tk.f > frame) break;
    const hit = tk.big || tk.slot === slot || (slot === 1 && tk.slot === 0); // 进位时千位也一起跳
    if (hit) h = Math.max(h, Math.exp(-(frame - tk.f) / (tk.big ? 9 : 7)));
  }
  return h;
};

// 数字槽位 x（字体中心线）：5 位 + 逗号，整行居中
const ROW_W = (5 * DIGIT_W + COMMA_W) * SIZE;
const ROW_X0 = 960 - ROW_W / 2;
const slotCX = (slot: number) => ROW_X0 + (slot * DIGIT_W + (slot >= 2 ? COMMA_W : 0) + DIGIT_W / 2) * SIZE;
const DIGIT_TOP = BASE_Y - SIZE * 0.72; // 字面顶缘（火星发射线）

// 火星色温：寿命 1（出生）白热 → 金 → 暗橙 0（熄灭）
const sparkColor = (life: number) => interpolateColors(life, [0, 0.35, 0.7, 1], ['#7a3510', '#e0892c', '#ffd27a', '#fffaf0']);

// 单颗火星：闭式弹道 + 地台一次弹跳；返回 null = 已熄灭
type Spark = { x: number; y: number; vx: number; vy: number; life: number; size: number };
const sparkAt = (tk: Tick, t: number, i: number, age: number): Spark | null => {
  const salt = t * 53 + i * 7;
  const lifeMax = (tk.big ? 26 : 18) + rnd(salt, 1) * 10;
  if (age <= 0 || age >= lifeMax) return null;
  // 发射点：普通 tick = 该位顶缘中段；终值 = 沿整行顶缘
  const x0 = tk.big ? ROW_X0 + 40 + rnd(salt, 2) * (ROW_W - 80) : slotCX(tk.slot) + (rnd(salt, 2) - 0.5) * SIZE * 0.34;
  const y0 = DIGIT_TOP + (tk.big ? rnd(salt, 9) * 30 : 0);
  // 扇形：以竖直为轴 ±52°（终值 ±70°），初速 8–17px/f（终值更猛）
  const spread = tk.big ? 70 : 52;
  const ang = ((-90 + (rnd(salt, 3) - 0.5) * 2 * spread) * Math.PI) / 180;
  const sp = (tk.big ? 13 : 8) + rnd(salt, 4) * (tk.big ? 15 : 9);
  const vx0 = Math.cos(ang) * sp;
  const vy0 = Math.sin(ang) * sp;
  // 落地时刻：y0 + vy0·t + ½g·t² = FLOOR_Y
  const dy = FLOOR_Y - y0;
  const tHit = (-vy0 + Math.sqrt(vy0 * vy0 + 2 * GRAV * dy)) / GRAV;
  let x: number, y: number, vx: number, vy: number;
  if (age < tHit) {
    x = x0 + vx0 * age; y = y0 + vy0 * age + 0.5 * GRAV * age * age; vx = vx0; vy = vy0 + GRAV * age;
  } else {
    const a2 = age - tHit;
    const vyHit = vy0 + GRAV * tHit;
    const vy1 = -vyHit * BOUNCE;
    const vx1 = vx0 * 0.62;
    const xHit = x0 + vx0 * tHit;
    x = xHit + vx1 * a2; y = Math.min(FLOOR_Y, FLOOR_Y + vy1 * a2 + 0.5 * GRAV * a2 * a2); vx = vx1; vy = vy1 + GRAV * a2;
  }
  const life = 1 - age / lifeMax;
  return { x, y, vx, vy, life, size: (tk.big ? 5.5 : 4.4) * (0.5 + 0.5 * life) };
};

export const CounterTickSparks: React.FC = () => {
  const frame = useCurrentFrame();
  const value = valueAt(frame);
  const digits = digitsOf(value);
  const locked = frame >= C1;

  // 入场：数字由虚到实 + 上浮；地平线从中间拉开
  const inK = ramp(frame, 0, 16, EASE.snappy);
  const horizonK = ramp(frame, 0, 22, EASE.snappy);
  // 终值弹簧 pop：1 → ~1.06 → 1（一次可见过冲）
  const pop = locked ? springAt(frame, C1, { damping: 13, stiffness: 210 }) : 0;
  const popScale = locked ? 1 + 0.06 * Math.sin(Math.min(1, pop) * Math.PI) * Math.exp(-(frame - C1) / 10) : 1;
  // 尾数亮起：终值帧起 8f 从 45% → 100%
  const tailOn = ramp(frame, C1, 8, EASE.out);
  // 地台冲击光环
  const ring = ramp(frame, C1, 30, EASE.out);
  const ringOp = locked ? (1 - ring) * 0.9 : 0;

  // 计数快段：尾数按斜率竖向虚化（跑起来的数字），到终值清晰
  const slope = (countK(frame + 0.5) - countK(frame - 0.5)) * (TARGET - FROM);
  const tailBlur = locked ? 0 : Math.min(5, slope / 120);

  const digitEl = (d: number, slot: number) => {
    const heat = heatOf(frame, slot);
    const isTail = slot >= 2;
    const dim = isTail ? mix(0.45, 1, tailOn) : 1;
    return (
      <span key={slot} style={{ position: 'relative', display: 'inline-block', width: `${DIGIT_W}em`, textAlign: 'center' }}>
        {/* 拉丝金属：顶亮、中段一道暗带、底部回光 */}
        <span style={{
          display: 'inline-block', opacity: dim,
          backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #e9eaec 30%, #9fa3ab 52%, #d5d7db 70%, #7d8189 100%)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          filter: isTail && tailBlur > 0.3 ? `blur(${(tailBlur * 0.35).toFixed(2)}px)` : undefined,
        }}>{d}</span>
        {/* 敲红：同一字形叠一层白热 → 金，热度衰减 */}
        {heat > 0.02 && (
          <span style={{
            position: 'absolute', inset: 0, opacity: heat,
            backgroundImage: 'linear-gradient(180deg, #fffdf6 0%, #ffe3a6 45%, #ff9a3d 100%)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            filter: `drop-shadow(0 0 ${(18 * heat).toFixed(1)}px ${alpha('#ffb04a', 0.55 * heat)})`,
          }}>{d}</span>
        )}
      </span>
    );
  };

  const row = (
    <div style={{ ...type(SIZE, 760), letterSpacing: 0, lineHeight: 1, display: 'flex', whiteSpace: 'nowrap' }}>
      {digitEl(digits[0], 0)}
      {digitEl(digits[1], 1)}
      <span style={{ display: 'inline-block', width: `${COMMA_W}em`, textAlign: 'center', color: interpolateColors(heatOf(frame, 2), [0, 1], ['#8d9198', '#ffcf86']) }}>,</span>
      {digitEl(digits[2], 2)}
      {digitEl(digits[3], 3)}
      {digitEl(digits[4], 4)}
    </div>
  );

  // 火星（含倒影）
  const sparks: React.ReactNode[] = [];
  const reflections: React.ReactNode[] = [];
  TICKS.forEach((tk, t) => {
    const age = frame - tk.f;
    if (age <= 0 || age > 40) return;
    const n = tk.big ? 64 : 8 + Math.floor(rnd(t, 21) * 5);
    for (let i = 0; i < n; i++) {
      const s = sparkAt(tk, t, i, age);
      if (!s) continue;
      const speed = Math.hypot(s.vx, s.vy);
      const len = s.size + speed * 2.1; // 沿速度方向拉成短流星
      const ang = (Math.atan2(s.vy, s.vx) * 180) / Math.PI;
      const col = sparkColor(s.life);
      const op = Math.min(1, s.life * 3);
      const style = (y: number, flip: boolean): React.CSSProperties => ({
        position: 'absolute', left: s.x - len, top: y - s.size / 2, width: len, height: s.size, borderRadius: s.size,
        transformOrigin: `${len}px ${s.size / 2}px`, transform: `rotate(${(flip ? -ang : ang).toFixed(1)}deg)`,
        background: `linear-gradient(90deg, ${alpha('#ff8a2a', 0)} 0%, ${col} 80%, #fffaf0 100%)`,
        boxShadow: `0 0 ${(12 * s.life).toFixed(1)}px ${(2 * s.life).toFixed(1)}px ${alpha('#ff9a3d', 0.5 * s.life)}`,
        opacity: op,
      });
      sparks.push(<div key={`s${t}-${i}`} style={style(s.y, false)} />);
      if (s.y > FLOOR_Y - 240) reflections.push(<div key={`r${t}-${i}`} style={style(2 * FLOOR_Y - s.y, true)} />); // 只倒映离台面近的
    }
  });

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.2 }} fill={null} horizon={FLOOR_Y / 1080} breathe={0.5} intensity={0.85} vignette={0.62}>
        {/* 镜面地台：地平线以下略亮的冷灰 + 向下渐暗 */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: FLOOR_Y, bottom: 0,
          background: `linear-gradient(180deg, ${alpha('#c8ccd6', 0.07)} 0%, ${alpha('#c8ccd6', 0.02)} 40%, rgba(0,0,0,0) 100%)`,
        }} />
      </Stage>

      {/* 地平线：一道冷光细线从中间拉开 */}
      <div style={{
        position: 'absolute', top: FLOOR_Y, left: 960 - 820 * horizonK, width: 1640 * horizonK, height: 2,
        background: `linear-gradient(90deg, ${alpha('#ffffff', 0)} 0%, ${alpha('#ffffff', 0.38)} 50%, ${alpha('#ffffff', 0)} 100%)`,
      }} />

      {/* 终值暖光池：台面被火星照亮一下，随光环衰减 */}
      {ringOp > 0.01 && (
        <div style={{
          position: 'absolute', left: 960 - 760, top: FLOOR_Y - 110, width: 1520, height: 220, borderRadius: '50%',
          background: `radial-gradient(closest-side, ${alpha('#ffb04a', 0.32)}, ${alpha('#ffb04a', 0.08)} 55%, ${alpha('#ffb04a', 0)} 100%)`,
          opacity: ringOp * 0.9, mixBlendMode: 'screen',
        }} />
      )}
      {/* 冲击光环：终值帧在地台上扩散（透视压扁的椭圆） */}
      {ringOp > 0.01 && (
        <div style={{
          position: 'absolute', left: 960 - 900 * ring - 120, top: FLOOR_Y - (90 * ring + 14), width: (900 * ring + 120) * 2, height: (90 * ring + 14) * 2,
          borderRadius: '50%', border: `2px solid ${alpha('#ffd27a', 0.8)}`, opacity: ringOp,
          boxShadow: `0 0 30px ${alpha('#ffb04a', 0.35)}, inset 0 0 30px ${alpha('#ffb04a', 0.25)}`,
        }} />
      )}

      {/* 倒影：数字 + 火星（镜面地台，向下渐隐） */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: FLOOR_Y, height: 300, overflow: 'hidden',
        WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 52%)',
      }}>
        <div style={{
          // 镜像：主数字行顶 = BASE_Y - 0.93·SIZE；以台面为镜，倒影行顶落在台面下 (LIFT + 0.93·SIZE) 处，再 scaleY(-1)
          position: 'absolute', left: ROW_X0, top: 0, transformOrigin: `${ROW_W / 2}px 0px`,
          transform: `translateY(${(LIFT + SIZE * 0.93).toFixed(1)}px) scale(${popScale.toFixed(4)}, ${(-popScale).toFixed(4)})`,
          opacity: 0.22 * inK, filter: 'blur(2px)',
        }}>
          {row}
        </div>
        <div style={{ position: 'absolute', left: 0, top: -FLOOR_Y, width: 1920, height: 1080, mixBlendMode: 'screen', opacity: 0.4, filter: 'blur(1.5px)' }}>
          {reflections}
        </div>
      </div>

      {/* 眉题 */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 262, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18 }}>
        <div style={{
          width: 14, height: 14, borderRadius: 7, background: '#ff5a4a', opacity: ramp(frame, 2, 10, EASE.out) * (0.65 + 0.35 * Math.cos(frame / 6)),
          boxShadow: `0 0 14px ${alpha('#ff5a4a', 0.6)}`,
        }} />
        <TextReveal text="LIVE  ·  TESSEL PUBLIC BETA" by="char" variant="track" start={2} each={18} gap={0.4}
          style={{ ...type(30, 650, { caps: true }), letterSpacing: '0.24em', color: L.ink2 }} />
      </div>

      {/* 主角数字（基线贴地台） */}
      <div style={{
        position: 'absolute', left: ROW_X0, top: BASE_Y - SIZE * 0.93, transformOrigin: `${ROW_W / 2}px ${SIZE * 0.93}px`,
        transform: `translateY(${mix(26, 0, inK).toFixed(1)}px) scale(${popScale.toFixed(4)})`,
        opacity: inK, filter: inK < 1 ? `blur(${((1 - inK) * 14).toFixed(2)}px)` : undefined,
      }}>
        {row}
      </div>

      {/* 火星：screen 叠加 = 发光 */}
      <div style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen' }}>{sparks}</div>

      {/* 副标题：第一句开场即在（说明在数什么），第二句终值后升起 */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 868, textAlign: 'center' }}>
        <TextReveal text="developers on the waitlist" by="word" variant="rise" start={8} each={16} gap={3}
          style={{ ...type(48, 500), color: L.ink2 }} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 936, textAlign: 'center' }}>
        <TextReveal text="Doors open Monday." by="word" variant="rise" start={C1 + 10} each={16} gap={3}
          style={{ ...type(40, 600), color: L.accent2 }} />
      </div>
    </AbsoluteFill>
  );
};
