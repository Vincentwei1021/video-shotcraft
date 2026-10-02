// confetti-crossfire —— 双侧礼炮交叉喷洒（里程碑揭晓帧双炮交叉彩屑弹幕）
//
// 第二轮重设计（暖沙 · 宾客评分海报）：
// - look = sand（米色纸感舞台 · 赤陶 · 靛蓝点缀）。不再是"白卡里一个数字"，而是一张为镜头设计的评分海报：
//   眉题「MARLOW STAYS · SUMMER 2026」→ 360px 巨型「4.97」+ 弱化的「/5」→ 五颗星依次点亮 → 一句副标题。
// - 礼炮仍是手法核心：左下 / 右下两门炮在揭晓帧（数字最后一位还在升起时，抢半拍）开火，左炮先、右炮晚 2f；
//   每门 72 颗纸屑 + 2 条蛇形彩带（serpentine）。纸屑三种形状（长条 / 方片 / 圆点），真 3D 翻转
//   （perspective rotate3d，背面压暗），出膛高速段沿速度方向拉伸，过顶点后左右飘摆；三层景深：
//   远景小而虚、在数字后面；近景放大虚焦、从镜头前掠过。蛇形彩带 = 沿弹道尾迹的波浪 SVG 路径，越往尾越卷。
// - 配色：赤陶（主）/ 奶白纸 / 墨 / 少量靛蓝——和画面同一套 look，不是彩虹。
// - 落定：数字受冲一次（弹簧 1→1.035→1）、星星逐颗 overshoot 点亮、副标题逐词升起；彩屑 ~f132 全部落出画外，
//   尾段 ≥44f 是一张干净海报（极缓 1.5% 推镜让画面不死）。
//
// 时间表（30fps，共 176f）：
//   0–12    预备：舞台光、眉题字距收拢、两侧细线从中间长出
//   4–34    主动作：4 · . · 9 · 7 逐字从线下升起（每字 18f、错峰 4f，snappy）
//   22      开火（左炮）/ 24（右炮）——数字 7 还在半空，庆祝比结果先到半拍；数字受冲弹簧
//   22–60   弹幕交叉上升、顶点 ~f42–48（画面上 1/5 处）
//   40–64   五颗星逐颗点亮（错峰 4f，overshoot）；48 起副标题逐词升起
//   60–132  余波：纸屑翻转飘落出画，彩带拖尾卷落（最慢一片 ~f132 出画）
//   132–176 hold：干净海报，只有 1.5% 的极缓推镜
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, springAt, type } from '../../_fixtures/Look';

export const CONFETTI_CROSSFIRE_DURATION = 176; // 揭晓 22f + 弹幕 ~110f + 干净 hold ≥44f

const L = LOOKS.sand;
const FIRE_L = 22; // 揭晓帧 = 左炮发射帧
const FIRE_R = 24; // 右炮晚 2f（双炮"砰砰"有层次）
const DECAY = 0.9; // 每帧速度 ×0.9（空气阻力）

const frac = (x: number) => x - Math.floor(x);
const rnd = (i: number, salt: number) => frac(Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453);

// decay 弹道闭式解：位移 = v0·(1-d^t)/(1-d)；重力按同一衰减序列累积（终端落速 = g/(1-d)）
const decaySum = (t: number) => (1 - Math.pow(DECAY, t)) / (1 - DECAY);
const gravDisp = (t: number, g: number) => (g * (t - (DECAY - Math.pow(DECAY, t + 1)) / (1 - DECAY))) / (1 - DECAY);

// 纸屑色：赤陶为主，奶白纸、墨、浅赤陶，靛蓝只占一小撮（accent2 点缀）
const PAPER = [L.accent, L.accent, '#e08a62', '#fffaf2', '#fffaf2', L.ink, L.accent2];

type Shape = 'strip' | 'square' | 'dot';
type Bit = {
  vx: number; vy: number; g: number; w: number; h: number; shape: Shape;
  spin: number; flip: number; axis: number; phase: number; color: string;
  sway: number; swayF: number; depth: 0 | 1 | 2;
};

const makeGun = (dir: 1 | -1, salt: number): Bit[] =>
  Array.from({ length: 72 }).map((_, i) => {
    const r = (k: number) => rnd(i, salt + k);
    // 仰角 40–74°、初速 120–170px/f：decay 下水平总程 ≈ 10·vx（400–1400px），一半以上能越过中线形成交叉
    const ang = ((40 + r(1) * 34) * Math.PI) / 180;
    const speed = 120 + r(2) * 50;
    const sh = r(3);
    const shape: Shape = sh < 0.5 ? 'strip' : sh < 0.82 ? 'square' : 'dot';
    const base = 14 + r(4) * 10;
    const dr = r(5);
    return {
      vx: dir * Math.cos(ang) * speed,
      vy: -Math.sin(ang) * speed,
      g: 1.6 + r(6) * 0.4, // 终端落速 16–20px/f（各片不同，下落自然拉开）；最慢一片 ~f132 落出画外
      w: shape === 'strip' ? base * 0.55 : base,
      h: shape === 'strip' ? base * 1.9 : shape === 'dot' ? base : base * (0.75 + r(7) * 0.3),
      shape,
      spin: (r(8) - 0.5) * 22, // 平面自转 ±11°/f
      flip: 0.16 + r(9) * 0.24, // 3D 翻转角速度（rad/f）
      axis: r(10) * Math.PI, // 翻转轴方向
      phase: r(11) * Math.PI * 2,
      color: PAPER[Math.floor(r(12) * PAPER.length)],
      sway: 14 + r(13) * 30,
      swayF: 0.13 + r(14) * 0.1,
      depth: dr < 0.3 ? 0 : dr > 0.85 ? 2 : 1, // 0 远景（数字后）/ 1 焦平面 / 2 近景（虚焦）
    };
  });

const LEFT = { x: 40, y: 1130, fire: FIRE_L, bits: makeGun(1, 3) };
const RIGHT = { x: 1880, y: 1130, fire: FIRE_R, bits: makeGun(-1, 41) };
const GUNS = [LEFT, RIGHT];

// 单颗纸屑 t 帧后的位置（含过顶点后的飘摆，飘摆在 t=12–28 间渐入）
const posOf = (b: Bit, o: { x: number; y: number }, t: number) => {
  const s = decaySum(t);
  const fallK = Math.min(1, Math.max(0, (t - 12) / 16));
  return {
    x: o.x + b.vx * s + Math.sin(t * b.swayF + b.phase) * b.sway * fallK,
    y: o.y + b.vy * s + gravDisp(t, b.g),
  };
};

// 蛇形彩带：每门炮 2 条，头部是一颗较重的"纸卷"，身体是沿尾迹的波浪路径
const STREAMERS = [
  { gun: 0, vx: 104, vy: -128, g: 1.75, color: L.accent, depth: 1 as const, wav: 0.0 },
  { gun: 0, vx: 64, vy: -148, g: 1.8, color: '#fffaf2', depth: 2 as const, wav: 1.7 },
  { gun: 1, vx: -98, vy: -136, g: 1.7, color: L.accent2, depth: 1 as const, wav: 0.9 },
  { gun: 1, vx: -72, vy: -120, g: 1.85, color: L.accent, depth: 0 as const, wav: 2.4 },
];
const streamerPos = (s: (typeof STREAMERS)[number], t: number) => {
  const o = GUNS[s.gun];
  const fallK = Math.min(1, Math.max(0, (t - 14) / 20));
  return {
    x: o.x + s.vx * decaySum(t) + Math.sin(t * 0.11 + s.wav) * 40 * fallK,
    y: o.y + s.vy * decaySum(t) + gravDisp(t, s.g),
  };
};

const STAR_PATH = 'M50 4 L61.8 36.6 L96.4 37.6 L69.1 58.8 L78.8 92 L50 72.4 L21.2 92 L30.9 58.8 L3.6 37.6 L38.2 36.6 Z';

export const ConfettiCrossfire: React.FC = () => {
  const frame = useCurrentFrame();

  // 相机：全程 1.000→1.015 极缓推（hold 段画面仍活着，无抖动）
  const cam = 1 + 0.015 * ramp(frame, 0, 176, EASE.smooth);
  // 数字受冲：开火帧起一记阻尼脉冲（1 → ~1.03 → 1，14f 内收敛，无二次回弹）
  const kick = frame < FIRE_L ? 0 : Math.sin(Math.min(1, (frame - FIRE_L) / 14) * Math.PI) * Math.exp(-(frame - FIRE_L) / 9);
  const numScale = 1 + 0.035 * kick;

  // 眉题两侧细线从中间长出
  const ruleIn = ramp(frame, 0, 22, EASE.snappy);

  // ───── 纸屑渲染 ─────
  const renderBits = (layer: 0 | 1 | 2) =>
    GUNS.map((gun, gi) =>
      gun.bits.map((b, i) => {
        const t = frame - gun.fire;
        if (t <= 0 || b.depth !== layer) return null;
        const p = posOf(b, gun, t);
        if (p.y > 1180 || p.x < -120 || p.x > 2040) return null; // 落出画外即卸载
        const q = posOf(b, gun, t - 1);
        const vx = p.x - q.x;
        const vy = p.y - q.y;
        const speed = Math.hypot(vx, vy);
        const va = (Math.atan2(vy, vx) * 180) / Math.PI;
        const stretch = 1 + Math.min(1.6, Math.max(0, speed - 22) / 40); // 出膛高速段拖影
        const flipA = b.flip * t + b.phase;
        const cosF = Math.cos(flipA);
        const dScale = layer === 0 ? 0.55 : layer === 2 ? 1.85 : 1;
        const blur = layer === 0 ? 1.1 : layer === 2 ? 3.2 : 0;
        // 纸面受光：正面亮、侧立暗、背面再压一档（墨色纸屑别压成死黑）
        const shade = (cosF < 0 ? 0.78 : 1) * (0.74 + 0.3 * Math.abs(cosF));
        const w = b.w * dScale;
        const h = b.h * dScale;
        return (
          <div
            key={`${gi}-${i}`}
            style={{
              position: 'absolute', left: p.x - w / 2, top: p.y - h / 2, width: w, height: h,
              background: b.color,
              borderRadius: b.shape === 'dot' ? '50%' : 1.5,
              opacity: layer === 0 ? 0.7 : 1,
              filter: `brightness(${shade.toFixed(3)})${blur ? ` blur(${blur}px)` : ''}`,
              transform:
                `rotate(${va.toFixed(1)}deg) scaleX(${stretch.toFixed(3)}) rotate(${(-va).toFixed(1)}deg) ` +
                `perspective(500px) rotate(${(b.spin * t + b.phase * 57).toFixed(1)}deg) ` +
                `rotate3d(${Math.cos(b.axis).toFixed(3)}, ${Math.sin(b.axis).toFixed(3)}, 0, ${((flipA * 180) / Math.PI).toFixed(1)}deg)`,
            }}
          />
        );
      }),
    );

  // ───── 蛇形彩带（SVG 波浪尾迹） ─────
  const renderStreamers = (layer: 0 | 1 | 2) => (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible', filter: layer === 2 ? 'blur(3px)' : layer === 0 ? 'blur(1.2px)' : undefined, opacity: layer === 0 ? 0.7 : 1 }}>
      {STREAMERS.map((s, si) => {
        if (s.depth !== layer) return null;
        const t = frame - GUNS[s.gun].fire;
        if (t <= 0) return null;
        // 按弧长截断：从头部沿时间往回走（每步 0.2f），累计到 RIBBON 像素长就停——彩带是有限长的纸带，
        // 不能一直拖回炮口。卷曲相位按弧长算（每 ~46px 一个弯），越往尾越卷，随时间推进
        const RIBBON = 560;
        const pts: string[] = [];
        let visible = false;
        let acc = 0;
        let prev = streamerPos(s, t);
        for (let k = 0; k < 400 && acc < RIBBON; k++) {
          const tk = t - k * 0.2;
          if (tk < 0) break;
          const a = streamerPos(s, tk);
          if (k > 0) acc += Math.hypot(a.x - prev.x, a.y - prev.y);
          const b2 = streamerPos(s, Math.max(0, tk - 0.2));
          const dx = a.x - b2.x, dy = a.y - b2.y;
          const len = Math.hypot(dx, dy) || 1;
          const amp = (5 + acc * 0.045) * Math.min(1, t / 8);
          const off = Math.sin(acc / 46 - t * 0.3 + s.wav) * amp;
          const x = a.x + (-dy / len) * off;
          const y = a.y + (dx / len) * off;
          if (y < 1150 && y > -60 && x > -60 && x < 1980) visible = true;
          if (k % 2 === 0) pts.push(`${pts.length === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
          prev = a;
        }
        if (!visible) return null;
        const sw = layer === 2 ? 16 : layer === 0 ? 6 : 10;
        return (
          <path key={si} d={pts.join(' ')} fill="none" stroke={s.color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
            style={{ filter: s.color === '#fffaf2' ? `drop-shadow(0 2px 3px ${alpha(L.shadow, 0.18)})` : undefined }} />
        );
      })}
    </svg>
  );

  // 炮口柔光：开火帧起 14f 扩散淡出
  const puff = (x: number, fire: number) => {
    const p = ramp(frame, fire, 14, EASE.out);
    const op = frame >= fire ? (1 - p) * 0.9 : 0;
    if (op <= 0.01) return null;
    return (
      <div style={{
        position: 'absolute', left: x - 260, top: 1080 - 260, width: 520, height: 520, borderRadius: '50%',
        background: `radial-gradient(closest-side, ${alpha('#fff6e8', 0.95)}, ${alpha(L.accent, 0.22)} 50%, ${alpha(L.accent, 0)} 100%)`,
        opacity: op, transform: `scale(${mix(0.3, 1.2, p).toFixed(3)})`,
      }} />
    );
  };

  const subIn = ramp(frame, 46, 20, EASE.out);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.36 }} fill={{ x: 0.5, y: 1.05 }} breathe={0.4} vignette={0.2} />

      <AbsoluteFill style={{ transform: `scale(${cam.toFixed(4)})` }}>
        {/* 远景纸屑与彩带：在数字后面 */}
        {renderBits(0)}
        {renderStreamers(0)}

        {/* ── 眉题 ── */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 196, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 28 }}>
          <div style={{ width: 120 * ruleIn, height: 2, background: alpha(L.ink, 0.25) }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 12, height: 12, borderRadius: 6, background: L.accent, opacity: ruleIn }} />
            <TextReveal text="MARLOW STAYS · SUMMER 2026" by="char" variant="track" start={0} each={20} gap={0.5}
              style={{ ...type(30, 650, { caps: true }), letterSpacing: '0.22em', color: L.ink2 }} />
          </div>
          <div style={{ width: 120 * ruleIn, height: 2, background: alpha(L.ink, 0.25) }} />
        </div>

        {/* ── 巨型评分 ── */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 262, display: 'flex', justifyContent: 'center', alignItems: 'baseline',
          transform: `scale(${numScale.toFixed(4)})`, transformOrigin: '50% 60%',
          filter: `drop-shadow(0 26px 34px ${alpha(L.shadow, 0.14)})`, // 整组投影（逐字 rise 遮罩会把 text-shadow 裁成方块）
        }}>
          <TextReveal text="4.97" by="char" variant="rise" start={4} each={18} gap={4} ease={EASE.snappy}
            style={{ ...type(380, 800), letterSpacing: '-0.055em', color: L.ink, lineHeight: 1 }} />
          <span style={{ marginLeft: 22, opacity: ramp(frame, 24, 14, EASE.out), transform: `translateY(${mix(20, 0, ramp(frame, 24, 16, EASE.snappy)).toFixed(1)}px)`, display: 'inline-block' }}>
            <span style={{ ...type(110, 500), color: L.ink3, letterSpacing: '-0.03em' }}>/5</span>
          </span>
        </div>

        {/* ── 五颗星：逐颗点亮 ── */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 692, display: 'flex', justifyContent: 'center', gap: 22 }}>
          {Array.from({ length: 5 }).map((_, i) => {
            const st = 38 + i * 4;
            const on = frame < st ? 0 : springAt(frame, st, { damping: 12, stiffness: 240 });
            const fillK = ramp(frame, st, 6, EASE.out);
            const partial = i === 4 ? 0.97 : 1; // 4.97：最后一颗差一丝没满
            return (
              <svg key={i} width={62} height={62} viewBox="0 0 100 100" style={{ transform: `scale(${(0.82 + 0.18 * on).toFixed(3)})`, overflow: 'visible' }}>
                <defs>
                  <clipPath id={`cc-star-${i}`}><rect x={0} y={0} width={100 * partial * fillK} height={100} /></clipPath>
                </defs>
                <path d={STAR_PATH} fill={alpha(L.ink, 0.07 * ramp(frame, 26, 12, EASE.out))} />
                <path d={STAR_PATH} fill={L.accent} clipPath={`url(#cc-star-${i})`} />
              </svg>
            );
          })}
        </div>

        {/* ── 副标题 ── */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 800, textAlign: 'center', opacity: subIn }}>
          <TextReveal text="Average guest rating across" by="word" variant="rise" start={48} each={16} gap={3}
            style={{ ...type(46, 500), color: L.ink2 }} />
          <span style={{ display: 'inline-block', width: 14 }} />
          <TextReveal text="21,408 stays." by="word" variant="rise" start={60} each={16} gap={3}
            style={{ ...type(46, 700), color: L.ink }} />
        </div>

        {/* 焦平面纸屑与彩带：从数字前方掠过 */}
        {renderStreamers(1)}
        {renderBits(1)}

        {puff(LEFT.x, FIRE_L)}
        {puff(RIGHT.x, FIRE_R)}

        {/* 近景：放大虚焦，最上层 */}
        {renderBits(2)}
        {renderStreamers(2)}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
