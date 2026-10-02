// input-morphs-into-logo —— slack-promo 40–41s · B 式 input-morph-assemble
//
// 第二轮重设计（「字标构造图」· 瑞士网格亮场）：
// - look = custom「signal」：带一点灰绿的冷纸白底 + 12 栏淡网格（瑞士平面设计的构造感），
//   墨黑 + 钴蓝 #2446ff + 一粒信号琥珀 #ffb21f。品牌编为团队聊天产品「Parley」。
// - 主角是一只为镜头设计的大号消息输入框（1040×132，44px 文案，钴蓝焦点环 + 圆形发送键），上方是
//   频道名与两条最近消息（34px，发送即退场）。
//   点发送 → 文案加速飞出 → 输入框 x/y/w/h/r 五量同一个 spring 收缩成一根竖胶囊（横条直接挤成竖条，
//   中途不叠别的动画），发送后钴蓝从发送键处圆形漫开灌满输入框（全程实色）。
// - 三粒图元依次从画外落下，把竖胶囊拼成字母 P 的 mark：钴蓝大圆（P 的碗）→ 纸白小圆（碗心，
//   落进碗里成了 P 的字怀）→ 琥珀小圆（"消息点"）。每粒落下前 10f，目标槽位先画出一圈蓝色虚线构造圆
//   （Q9：落点是真实槽位），落地按速度拉伸 / 压扁（原点钉底部）后构造线淡出。
// - 拼好后 mark 左移让位，「Parley」逐字从基线下升起、口号逐词升起；构造网格退场，留一张干净海报。
//
// 时间表（30fps，共 168f）：
//   0–20    光标从右下滑到发送键（第 0 帧画面即有频道上下文、输入框与光标），插入符闪烁
//   20      点击：发送键压缩 + 闪白 6f
//   21–32   文案 ease-in 加速向右上飞出 + 旋转 + 拖影
//   28–40   钴蓝从发送键圆形漫开灌满输入框（文案已飞离，不压字）
//   30–60   morph：spring(damping 15, stiffness 95) 输入框 → 竖胶囊
//   58–76   落下①钴蓝大圆（构造圆 54 起画）
//   72–90   落下②纸白碗心
//   86–104  落下③琥珀消息点
//   108–128 mark 左移让位；构造网格淡出
//   112–140 Parley 逐字升起、口号逐词升起
//   140–168 海报 hold（相机极缓推近 2%）
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, bezier, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, springAt, type, type Look } from '../../_fixtures/Look';

export const INPUT_MORPHS_INTO_LOGO_DURATION = 168;

const L: Look = {
  ...LOOKS.porcelain,
  bg: ['#f5f6f2', '#eeefe9', '#e3e5de'],
  light: '#ffffff',
  surface: '#ffffff',
  ink: '#10121a',
  ink2: '#545966',
  ink3: '#9a9ea6',
  accent: '#2446ff',
  accent2: '#ffb21f',
  shadow: '#1a2030',
};
const COBALT = '#2446ff';
const AMBER = '#ffb21f';
const PAPER = '#fbfbf8';

// —— 关键帧
const CLICK = 20;
const FLY = 21;
const MORPH = 30;
const DROPS = [58, 72, 86];
const SHIFT = 108;
const WORD = 114;

// mark 局部几何（相对 mark 中心）：竖胶囊 = P 的竖笔；大圆 = 碗；小白圆 = 字怀；琥珀 = 消息点
const MY = 492;
const MX0 = 960; // 拼装时 mark 居中
const SHIFT_DX = -293; // 让位后 lockup 整组居中
const STEM = { x: -70, y: 0, w: 108, h: 330 };
const PIECES = [
  { x: 12, y: -60, d: 214, color: COBALT }, // 碗：顶部与竖笔齐平
  { x: 12, y: -60, d: 80, color: PAPER }, // 字怀
  { x: 98, y: 128, d: 66, color: AMBER }, // 消息点
];
// 频道里最近两条消息（上下文）
const THREAD = [
  { n: 'Maya', t: '8:52', m: 'Final build is green across the board.', c: '#1f7a5c' },
  { n: 'Theo', t: '8:55', m: 'Press embargo lifts at 9:00 sharp.', c: '#c2410c' },
];
// 输入框初始几何（屏幕坐标，中心）
const BOX = { x: 960, y: 690, w: 1040, h: 132, r: 34 };

// 落体：spring 从画外上方落到槽位；按速度纵向拉伸、回弹时压扁
const DROP_H = 760;
const dropAt = (f: number, i: number) => (f < DROPS[i] ? 0 : springAt(f, DROPS[i], { damping: 13, stiffness: 120, mass: 0.9 }));

// 构造虚线圆：画出（stroke-dashoffset）→ 落定后淡出
const Guide: React.FC<{ f: number; i: number; cx: number; cy: number; d: number }> = ({ f, i, cx, cy, d }) => {
  const draw = ramp(f, DROPS[i] - 10, 12, EASE.out);
  const fade = 1 - ramp(f, DROPS[i] + 14, 10, EASE.out);
  const a = draw > 0 ? Math.min(draw * 2, 1) * fade : 0;
  if (a <= 0.001) return null;
  const r = d / 2 + 10;
  const c = 2 * Math.PI * r;
  return (
    <svg width={r * 2 + 8} height={r * 2 + 8} style={{ position: 'absolute', left: cx - r - 4, top: cy - r - 4, overflow: 'visible', opacity: a }}>
      <circle cx={r + 4} cy={r + 4} r={r} fill="none" stroke={COBALT} strokeWidth={2} strokeDasharray="10 8"
        strokeDashoffset={c * (1 - draw)} transform={`rotate(-90 ${r + 4} ${r + 4})`} opacity={0.75} />
      <line x1={r + 4 - 12} y1={r + 4} x2={r + 4 + 12} y2={r + 4} stroke={COBALT} strokeWidth={1.5} opacity={0.7} />
      <line x1={r + 4} y1={r + 4 - 12} x2={r + 4} y2={r + 4 + 12} stroke={COBALT} strokeWidth={1.5} opacity={0.7} />
    </svg>
  );
};

export const InputMorphsIntoLogo: React.FC = () => {
  const f = useCurrentFrame();

  // —— 光标
  const curT = ramp(f, 0, CLICK - 2, EASE.swift);
  const sendX = BOX.x + BOX.w / 2 - 24 - 42;
  const cursorX = mix(1560, sendX + 6, curT);
  const cursorY = mix(940, BOX.y + 8, ramp(f, 0, CLICK - 2, bezier(0.25, 0.6, 0.3, 1)));
  const press = f >= CLICK && f <= CLICK + 4 ? 0.84 : 1;
  const cursorOp = 1 - ramp(f, FLY + 2, 8, EASE.out);
  const flash = f >= CLICK && f <= CLICK + 5 ? 1 - (f - CLICK) / 6 : 0;

  // —— 文案飞出（加速）
  const flyT = ramp(f, FLY, 11, bezier(0.5, 0, 0.9, 0.55));

  // —— morph：五量同一个 spring
  const m = f < MORPH ? 0 : springAt(f, MORPH, { damping: 15, stiffness: 95, mass: 1 });
  const flood = ramp(f, 28, 12, EASE.snappy); // 蓝色从发送键漫开
  const fill = flood;
  const shift = ramp(f, SHIFT, 20, EASE.swift);
  const MX = MX0 + SHIFT_DX * shift;
  const bx = mix(BOX.x, MX + STEM.x, m);
  const by = mix(BOX.y, MY + STEM.y, m);
  const bw = mix(BOX.w, STEM.w, m);
  const bh = mix(BOX.h, STEM.h, m);
  const br = mix(BOX.r, STEM.w / 2, Math.min(1, m));
  // morph 速度 → 收缩方向的轻微拖影（只在快段）
  const mPrev = f - 1 < MORPH ? 0 : springAt(f - 1, MORPH, { damping: 15, stiffness: 95, mass: 1 });
  const mBlur = Math.min(3, Math.abs(m - mPrev) * 30);

  // 输入框 UI 元素（随 morph 尽早退场，不在中途叠动画）
  const uiOut = Math.min(1, m * 3);

  // 构造网格 & 十字线：拼装期出现，让位时退场
  const gridA = 0.55 * ramp(f, MORPH + 10, 20, EASE.out) * (1 - ramp(f, SHIFT, 18, EASE.out)) + 0.25;
  const constrA = ramp(f, DROPS[0] - 14, 16, EASE.out) * (1 - ramp(f, SHIFT - 4, 16, EASE.out));

  // 落定后整组极缓推近
  const push = 1 + 0.02 * ramp(f, 124, 44, EASE.smooth);

  return (
    <AbsoluteFill style={{ overflow: 'hidden', fontFamily: FONT.sans }}>
      <Stage look={L} keyLight={{ x: 0.42, y: 0.2 }} fill={{ x: 0.9, y: 0.95 }} grain={0.05} vignette={0.2}>
        {/* 12 栏淡网格 + 基线：瑞士式构造底 */}
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: gridA }}>
          {Array.from({ length: 13 }, (_, i) => (
            <line key={i} x1={96 + i * 144} y1={0} x2={96 + i * 144} y2={1080} stroke={alpha(L.ink, 0.06)} strokeWidth={1} />
          ))}
          {[180, 492, 804].map((y) => <line key={y} x1={0} y1={y} x2={1920} y2={y} stroke={alpha(L.ink, 0.05)} strokeWidth={1} />)}
        </svg>
      </Stage>

      <div style={{ position: 'absolute', inset: 0, transform: `scale(${push.toFixed(5)})`, transformOrigin: '960px 540px' }}>
        {/* 构造十字线：穿过 mark 中心与碗心 */}
        {constrA > 0.001 && (
          <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: constrA }}>
            <line x1={0} y1={MY + PIECES[0].y} x2={1920} y2={MY + PIECES[0].y} stroke={alpha(COBALT, 0.28)} strokeWidth={1.2} />
            <line x1={MX + PIECES[0].x} y1={0} x2={MX + PIECES[0].x} y2={1080} stroke={alpha(COBALT, 0.28)} strokeWidth={1.2} />
            <line x1={MX + STEM.x} y1={0} x2={MX + STEM.x} y2={1080} stroke={alpha(COBALT, 0.18)} strokeWidth={1.2} strokeDasharray="6 8" />
            <line x1={0} y1={MY + STEM.h / 2} x2={1920} y2={MY + STEM.h / 2} stroke={alpha(COBALT, 0.18)} strokeWidth={1.2} strokeDasharray="6 8" />
          </svg>
        )}

        {/* 频道上下文：频道名 + 两条最近消息（发送即退场，给"你每天用的那个输入框"一个真实语境） */}
        <div style={{
          position: 'absolute', left: BOX.x - BOX.w / 2 + 8, top: BOX.y - BOX.h / 2 - 410, width: BOX.w - 16,
          opacity: 1 - ramp(f, FLY + 1, 10, EASE.out), transform: `translateY(${(-24 * ramp(f, FLY + 1, 10, EASE.exit)).toFixed(2)}px)`,
          filter: f > FLY + 1 ? `blur(${(6 * ramp(f, FLY + 1, 10, EASE.linear)).toFixed(2)}px)` : undefined,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, ...type(34, 650), color: L.ink, paddingBottom: 22, borderBottom: `1px solid ${alpha(L.ink, 0.08)}` }}>
            <span style={{ color: COBALT, fontWeight: 800 }}>#</span>launch-day
            <span style={{ ...type(26, 500), color: L.ink3, marginLeft: 'auto' }}>12 members</span>
          </div>
          {THREAD.map((msg, i) => (
            <div key={i} style={{ display: 'flex', gap: 22, marginTop: 30, opacity: i === 0 ? 0.55 : 1 }}>
              <div style={{ width: 60, height: 60, borderRadius: 18, background: msg.c, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', ...type(24, 700), color: '#fff' }}>{msg.n[0]}</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                  <span style={{ ...type(30, 700), color: L.ink }}>{msg.n}</span>
                  <span style={{ ...type(24, 500), color: L.ink3 }}>{msg.t}</span>
                </div>
                <div style={{ ...type(34, 450), color: L.ink2, marginTop: 6 }}>{msg.m}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 主体：输入框 → 竖胶囊 */}
        <div style={{
          position: 'absolute', left: bx - bw / 2, top: by - bh / 2, width: bw, height: bh, borderRadius: br,
          boxSizing: 'border-box', overflow: 'hidden',
          background: '#ffffff',
          boxShadow: `0 0 0 ${(3 * (1 - fill)).toFixed(2)}px ${alpha(COBALT, 0.9 * (1 - fill))}, 0 0 0 ${(9 * (1 - fill)).toFixed(2)}px ${alpha(COBALT, 0.12 * (1 - fill))}, ` +
            `0 2px 4px ${alpha(L.shadow, 0.06)}, 0 ${mix(24, 18, m).toFixed(1)}px ${mix(50, 36, m).toFixed(1)}px -18px ${alpha(L.shadow, 0.3)}`,
          filter: mBlur > 0.3 ? `blur(${mBlur.toFixed(2)}px)` : undefined,
        }}>
          {/* 钴蓝实心：从发送键处圆形漫开（发送 = 把蓝色灌满输入框），全程实色，不经过半透明中间态 */}
          <div style={{
            position: 'absolute', inset: 0,
            clipPath: flood >= 1 ? undefined : `circle(${(flood * Math.hypot(bw, bh)).toFixed(1)}px at ${(bw - 66 * (1 - m)).toFixed(1)}px ${(bh / 2).toFixed(1)}px)`,
            background: 'linear-gradient(160deg, #4562ff 0%, #2446ff 50%, #1b36e0 100%)',
            boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.28)',
          }} />
          {/* 工具图标（纹理级，morph 即退） */}
          <div style={{ position: 'absolute', right: 132, top: 0, height: BOX.h, display: 'flex', alignItems: 'center', gap: 22, opacity: 1 - uiOut }}>
            {['M12 5v14M5 12h14', 'M8 9h.01M16 9h.01M8 15q4 3 8 0'].map((d, i) => (
              <svg key={i} width={34} height={34} viewBox="0 0 24 24" fill="none" stroke={L.ink3} strokeWidth={2} strokeLinecap="round">
                {i === 1 && <circle cx={12} cy={12} r={9} />}
                <path d={d} />
              </svg>
            ))}
          </div>
          {/* 发送键 */}
          <div style={{
            position: 'absolute', right: 24, top: (BOX.h - 84) / 2, width: 84, height: 84, borderRadius: 42,
            background: flash > 0 ? `rgb(${Math.round(mix(36, 140, flash))},${Math.round(mix(70, 160, flash))},255)` : COBALT,
            boxShadow: `0 6px 16px -6px ${alpha(COBALT, 0.7)}, inset 0 1.5px 0 rgba(255,255,255,0.3)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: `scale(${press})`, opacity: 1 - uiOut,
          }}>
            <svg width={38} height={38} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5.5 11.5L12 5l6.5 6.5" />
            </svg>
          </div>
        </div>

        {/* 文案（在输入框外层渲染：飞出时不被输入框圆角裁掉） */}
        <div style={{
          position: 'absolute', left: BOX.x - BOX.w / 2 + 44, top: BOX.y - BOX.h / 2, height: BOX.h, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap',
          ...type(44, 450), color: L.ink, opacity: (1 - flyT) * (1 - uiOut),
          transform: `translate(${(flyT * 760).toFixed(1)}px, ${(-flyT * 420).toFixed(1)}px) rotate(${(-flyT * 9).toFixed(2)}deg)`,
          filter: flyT > 0.15 ? `blur(${(flyT * 6).toFixed(2)}px)` : undefined,
        }}>
          Launch is a go. Ship it at nine.
          <span style={{ display: 'inline-block', width: 3, height: 50, marginLeft: 6, background: COBALT, opacity: f < FLY && Math.floor(f / 8) % 2 === 0 ? 1 : 0 }} />
        </div>

        {/* 构造虚线圆（目标槽位） */}
        {PIECES.map((p, i) => <Guide key={i} f={f} i={i} cx={MX + p.x} cy={MY + p.y} d={p.d} />)}

        {/* 三粒图元落下 */}
        {PIECES.map((p, i) => {
          if (f < DROPS[i]) return null;
          const s = dropAt(f, i);
          const v = (s - dropAt(f - 1, i)) * DROP_H; // 每帧下落像素（回弹时为负）
          const k = Math.max(-1, Math.min(1, v / 70));
          const sy = 1 + 0.14 * k;
          const sx = 1 - 0.09 * k;
          const top = MY + p.y - p.d / 2 - (1 - s) * DROP_H;
          const shade = p.color === PAPER
            ? `inset 0 -3px 6px rgba(20,30,60,0.10), 0 4px 10px -2px rgba(10,20,90,0.45)`
            : p.color === AMBER
              ? `inset 0 2px 0 rgba(255,245,210,0.7), inset 0 -4px 8px rgba(160,90,0,0.18), 0 10px 20px -8px ${alpha('#a06000', 0.45)}`
              : `inset 0 2px 0 rgba(255,255,255,0.28), 0 18px 40px -18px ${alpha('#0a1a80', 0.55)}`;
          return (
            <div key={i} style={{
              position: 'absolute', left: MX + p.x - p.d / 2, top, width: p.d, height: p.d, borderRadius: '50%',
              background: p.color === COBALT ? 'linear-gradient(160deg, #4562ff 0%, #2446ff 50%, #1b36e0 100%)' : p.color === AMBER ? 'linear-gradient(170deg, #ffc74a 0%, #ffb21f 55%, #f39c00 100%)' : PAPER,
              boxShadow: shade,
              transform: `scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`, transformOrigin: '50% 100%',
              filter: Math.abs(v) > 14 ? `blur(${Math.min(3, Math.abs(v) * 0.03).toFixed(2)}px)` : undefined,
            }} />
          );
        })}

        {/* 字标 + 口号 */}
        <div style={{ position: 'absolute', left: MX + 128 + 64, top: MY - 4, transform: 'translateY(-50%)', ...type(196, 760), letterSpacing: '-0.05em', color: L.ink, whiteSpace: 'nowrap' }}>
          <TextReveal text="Parley" by="char" variant="rise" start={WORD} each={16} gap={2.6} ease={EASE.snappy} />
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: MY + 236, textAlign: 'center', ...type(46, 450), color: L.ink2 }}>
          <TextReveal text="Where the team says go." by="word" variant="rise" start={WORD + 16} each={16} gap={3} ease={EASE.out} />
        </div>
      </div>

      {/* 光标 */}
      {cursorOp > 0.001 && (
        <svg width={40} height={46} viewBox="0 0 40 44" style={{
          position: 'absolute', left: cursorX, top: cursorY, opacity: cursorOp, transform: `scale(${press})`, transformOrigin: '4px 2px',
          filter: `drop-shadow(0 4px 8px ${alpha(L.shadow, 0.3)})`,
        }}>
          <path d="M4 2 L4 34 L13 26 L19 40 L26 37 L20 23 L32 22 Z" fill={L.ink} stroke="#ffffff" strokeWidth={2.2} strokeLinejoin="round" />
        </svg>
      )}
    </AbsoluteFill>
  );
};
