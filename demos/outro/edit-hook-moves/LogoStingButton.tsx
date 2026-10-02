// logo-sting-button —— 收尾按钮镜头（button ending）
// 上一镜收尾 → 黑场 → LOGO 定住（观众以为结束）→ 12f 微距彩蛋硬切 → 硬切回 LOGO 定格。
//
// 第二轮重设计（预告片片尾卡 · 黑场 + 一抹绯红）：
// - look = custom「noir」：带暖色相的近黑舞台 + 奶白字 + 唯一强调色绯红 #ff3346。整段用 2.39:1 遮幅
//   （上下黑边）——片子"在影院里结束了"；彩蛋硬切时遮幅**消失**、整屏绯红满画幅，读作"打破第四面墙"，
//   切回时遮幅原样回来。这是手法识别度的核心：前后两段是电影，中间 12f 是产品。
// - 上一镜尾巴：收尾大标题「Every frame, graded.」极缓推 + 遮幅黑边从画外合拢，再 ease-in 压暗入黑。
// - LOGO：新月 + 晚星图形标（虚构品牌 Vesper = 晚星）对焦入场（模糊 10→0、scale 0.97→1），
//   宽字距字标 VESPER 逐字"字距收拢"跟随晚 3f，绯红短线 + 日期行最后落座。
// - 彩蛋 12f：整屏绯红上一枚按 1920 目标尺寸直接布局的巨型白色胶囊按钮（字 96px 即最终像素），
//   四角是贴着镜头的失焦白色 UI 边（浅景深），光标 f3–4 按下 → f5 按钮翻黑「You're on the list」+ 绯红勾弹出。
//   12f 内相机前推 4%（急推后半段减速）。
// - 回到 LOGO：与彩蛋前同一分支渲染（像素一致，只有极缓推镜继续走），唯一的变化是图形标上的晚星
//   从"未点亮"变成绯红点亮——彩蛋按下的那一下把星点亮了，给仔细看的人一个眼神。
//
// 时间表（30fps，共 150f）：
//   0–22    上一镜尾巴：大标题极缓推；0–16 遮幅合拢（snappy）；12–22 ease-in 压暗
//   22–28   黑场 6f（遮幅在、舞台光未亮）
//   28–40   LOGO 对焦入场 12f；字标晚 3f；32–46 短线 + 日期行
//   40–74   定住 34f（极缓推 1.0→1.02 贯穿到尾、光的呼吸）——观众以为结束
//   74–86   彩蛋硬切 12f（无遮幅、整屏绯红）
//   86–150  硬切回 LOGO 定格 64f，晚星已点亮
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, ramp, mix } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, springAt, type, type Look } from '../../_fixtures/Look';

export const LOGO_STING_BUTTON_DURATION = 150;

const T = {
  tailEnd: 22, // 上一镜尾巴结束
  darkStart: 12,
  logoIn: 28, // 黑场 6f 后 LOGO 入场
  eggStart: 74, // 彩蛋硬切
  eggEnd: 86, // 切回
  total: 150,
};

// 自定义 noir：石墨的骨架 + 暖色相近黑 + 绯红强调
const L: Look = {
  ...LOOKS.graphite,
  bg: ['#17110f', '#0d0a09', '#070505'],
  light: '#e9d6c6',
  ink: '#f6efe7',
  ink2: '#b8aca1',
  ink3: '#6b625b',
  accent: '#ff3346',
  accent2: '#ff3346',
  shadow: '#030101',
};
const CRIMSON = L.accent;
const BAR = 138; // 2.39:1 遮幅：(1080 - 1920/2.39) / 2 ≈ 138
const WIDE = '"Avenir Next", "Futura", "Helvetica Neue", Arial, sans-serif';

// 极缓推镜：LOGO 段 1.0 → 1.02，贯穿彩蛋（彩蛋不渲染它，但切回时推镜照常往前走）
const pushAt = (f: number) => mix(1, 1.02, ramp(f, T.logoIn, T.total - T.logoIn, EASE.smooth));

// 遮幅黑边：上一镜尾巴里从画外合拢
const Letterbox: React.FC<{ p: number }> = ({ p }) => {
  const h = BAR * p;
  const bar: React.CSSProperties = { position: 'absolute', left: 0, right: 0, height: h, background: '#050403' };
  return (
    <>
      <div style={{ ...bar, top: 0 }} />
      <div style={{ ...bar, bottom: 0 }} />
    </>
  );
};

// 图形标：新月（奶白，两圆相减）+ 晚星（lit=0 时是一圈暗环，lit=1 时绯红点亮带泛光）
const Mark: React.FC<{ size: number; lit: boolean }> = ({ size, lit }) => {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <mask id={`m${id}`}>
          <rect width="100" height="100" fill="#fff" />
          <circle cx="63" cy="40" r="35" fill="#000" />
        </mask>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#fffaf3" />
          <stop offset="1" stopColor="#d9cbbd" />
        </linearGradient>
        <radialGradient id={`s${id}`}>
          <stop offset="0" stopColor={CRIMSON} stopOpacity="0.75" />
          <stop offset="1" stopColor={CRIMSON} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="46" cy="54" r="40" fill={`url(#g${id})`} mask={`url(#m${id})`} />
      {lit ? (
        <>
          <circle cx="78" cy="26" r="22" fill={`url(#s${id})`} />
          <circle cx="78" cy="26" r="7.5" fill={CRIMSON} />
          <circle cx="76.4" cy="24.2" r="2.4" fill="#ffd9dc" />
        </>
      ) : (
        <circle cx="78" cy="26" r="6.6" fill="none" stroke={alpha('#f6efe7', 0.28)} strokeWidth="1.6" />
      )}
    </svg>
  );
};

const WORD = 'VESPER';

const LogoCard: React.FC<{ frame: number }> = ({ frame }) => {
  const a = ramp(frame, T.logoIn, 12, EASE.snappy); // 图形标对焦
  const rule = ramp(frame, T.logoIn + 4, 14, EASE.snappy);
  const date = ramp(frame, T.logoIn + 8, 14, EASE.out);
  const lit = frame >= T.eggEnd;
  const glow = ramp(frame, T.logoIn, 18, EASE.out);
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* 舞台光：随 LOGO 一起亮起，之后只有极缓的呼吸 */}
      <div style={{
        position: 'absolute', inset: 0, opacity: glow * (0.92 + 0.08 * Math.sin(frame / 26)),
        background: `radial-gradient(ellipse 40% 34% at 50% 46%, ${alpha(L.light, 0.13)} 0%, ${alpha(L.light, 0.04)} 50%, ${alpha(L.light, 0)} 78%)`,
      }} />
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        transform: `scale(${pushAt(frame).toFixed(5)})`, transformOrigin: '50% 47%',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 54, marginTop: -30 }}>
          <div style={{
            opacity: Math.min(1, a * 1.5), transform: `scale(${mix(0.97, 1, a).toFixed(4)})`,
            filter: a < 0.999 ? `blur(${mix(10, 0, a).toFixed(2)}px)` : undefined,
          }}>
            <Mark size={168} lit={lit} />
          </div>
          {/* 字标：逐字字距收拢 + 对焦（跟随图形标晚 3f） */}
          <div style={{ display: 'flex', fontFamily: WIDE, fontWeight: 500, fontSize: 128, lineHeight: 1, color: L.ink, paddingTop: 10 }}>
            {Array.from(WORD).map((ch, i) => {
              const p = ramp(frame, T.logoIn + 3 + i * 1.4, 14, EASE.snappy);
              return (
                <span key={i} style={{
                  display: 'inline-block', opacity: Math.min(1, p * 1.6),
                  // 字距收拢走 translateX（以字标中心为原点向内收），布局不变 → 图形标不被挤着跑
                  marginRight: i < WORD.length - 1 ? '0.3em' : 0,
                  transform: `translateX(${((i - (WORD.length - 1) / 2) * 0.34 * (1 - p)).toFixed(4)}em)`,
                  filter: p < 0.999 ? `blur(${mix(8, 0, p).toFixed(2)}px)` : undefined,
                }}>{ch}</span>
              );
            })}
          </div>
        </div>
        <div style={{ marginTop: 64, display: 'flex', alignItems: 'center', gap: 30 }}>
          <div style={{ width: 96 * rule, height: 3, background: CRIMSON, borderRadius: 2 }} />
          <div style={{
            ...type(32, 600, { caps: true }), fontFamily: WIDE, letterSpacing: '0.42em', color: L.ink2,
            opacity: date, transform: `translateY(${mix(10, 0, date).toFixed(2)}px)`,
          }}>
            Coming 11 · 14
          </div>
          <div style={{ width: 96 * rule, height: 3, background: CRIMSON, borderRadius: 2 }} />
        </div>
      </div>
    </div>
  );
};

// 上一镜尾巴：收尾大标题，极缓推 + 压暗
const Tail: React.FC<{ frame: number }> = ({ frame }) => {
  const push = mix(1.0, 1.035, ramp(frame, -30, 52, EASE.smooth)); // 推镜在这里继续减速
  const dark = ramp(frame, T.darkStart, T.tailEnd - 1 - T.darkStart, EASE.exit);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - dark }}>
      <div style={{
        position: 'absolute', inset: 0, transform: `scale(${push.toFixed(4)})`, transformOrigin: '50% 50%',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: 210,
      }}>
        <div style={{ ...type(30, 600, { caps: true }), fontFamily: WIDE, letterSpacing: '0.36em', color: CRIMSON, marginBottom: 34 }}>
          Vesper · Colour for teams
        </div>
        <div style={{ ...type(150, 600), color: L.ink, letterSpacing: '-0.045em' }}>Every frame,</div>
        <div style={{ ...type(150, 600), color: L.ink2, letterSpacing: '-0.045em' }}>graded.</div>
        <GradedStill />
      </div>
    </div>
  );
};

// 上一镜的"产品画面"：一帧调过色的电影画面（程序化：青橙调的黄昏天、落日、远山剪影），
// 左半是原始灰片、右半是调色后，中间一条对比分割线——这支片子的产品在这一帧里讲完了
const GradedStill: React.FC = () => {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const W = 700, H = 400; // 设计坐标 820×470，整体按 700/820 缩放
  const hills = 'M0 330 C120 300 200 318 300 290 C420 255 520 300 620 280 C700 265 760 286 820 276 L820 470 L0 470 Z';
  const near = 'M0 392 C140 362 260 388 380 366 C520 340 640 380 820 352 L820 470 L0 470 Z';
  return (
    <div style={{
      position: 'absolute', right: 140, top: 340, width: W, height: H, borderRadius: 18, overflow: 'hidden',
      boxShadow: `0 0 0 1px ${alpha('#ffffff', 0.08)}, 0 40px 90px -30px rgba(0,0,0,0.9)`,
    }}>
      <svg width={W} height={H} viewBox="0 0 820 470" preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <linearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#123b4a" /><stop offset="0.55" stopColor="#d9784a" /><stop offset="1" stopColor="#f6c27a" />
          </linearGradient>
          <radialGradient id={`sun${id}`}>
            <stop offset="0" stopColor="#fff1d6" /><stop offset="0.35" stopColor="#ffd08a" stopOpacity="0.9" /><stop offset="1" stopColor="#ff9a5a" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`raw${id}`}><rect width={344} height={470} /></clipPath>
        </defs>
        <rect width={820} height={470} fill={`url(#sky${id})`} />
        <circle cx={560} cy={300} r={170} fill={`url(#sun${id})`} />
        <path d={hills} fill="#3a2a3a" />
        <path d={near} fill="#140f18" />
        {/* 左 42%：未调色的灰片（去饱和压对比），分割线把"前/后"讲清楚 */}
        <g clipPath={`url(#raw${id})`}>
          <rect width={820} height={470} fill="#6f6a66" />
          <circle cx={560} cy={300} r={120} fill="#a39d97" />
          <path d={hills} fill="#5d5853" />
          <path d={near} fill="#46423f" />
        </g>
        <line x1={344} y1={0} x2={344} y2={470} stroke="#fff" strokeWidth={3} />
        <circle cx={344} cy={235} r={20} fill="#fff" />
        <path d="M337 228 l-6 7 l6 7 M351 228 l6 7 l-6 7" stroke="#1a1414" strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

// 彩蛋：整屏绯红上的微距按钮。按 1920×1080 目标尺寸布局，12f 内前推 4%
const Egg: React.FC<{ egg: number }> = ({ egg }) => {
  const push = mix(1, 1.04, EASE.out(egg / 11));
  const pressed = egg >= 3 && egg < 5;
  const done = egg >= 5;
  const tick = done ? springAt(egg, 5, { damping: 14, stiffness: 320 }) : 0;
  const cursorIn = mix(26, 0, EASE.snappy(Math.min(1, egg / 3)));
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#e8202f' }}>
      {/* 绯红满画幅的光：左上一盏柔光 + 右下压暗，按钮站在光里 */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 80% at 38% 36%, #ff5560 0%, #e8202f 52%, #a40d1b 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${push.toFixed(4)})`, transformOrigin: '54% 52%' }}>
        {/* 贴镜头的失焦前景（浅景深）：右侧被画框裁掉一半的次按钮「Not now」+ 两颗前景光斑 */}
        <div style={{
          position: 'absolute', left: 1560, top: 380, height: 228, padding: '0 90px', borderRadius: 114,
          display: 'flex', alignItems: 'center', background: 'rgba(255,235,236,0.16)', border: '3px solid rgba(255,235,236,0.35)',
          fontFamily: FONT.sans, fontSize: 92, fontWeight: 600, letterSpacing: '-0.03em', color: 'rgba(255,240,240,0.7)',
          filter: 'blur(9px)', whiteSpace: 'nowrap',
        }}>Not now</div>
        <div style={{ position: 'absolute', left: -140, top: 760, width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,214,218,0.42) 0%, rgba(255,214,218,0.16) 55%, rgba(255,214,218,0) 72%)', filter: 'blur(6px)' }} />
        <div style={{ position: 'absolute', left: 1320, top: -200, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,226,228,0.3) 0%, rgba(255,226,228,0.1) 55%, rgba(255,226,228,0) 72%)', filter: 'blur(5px)' }} />
        {/* 焦外小字：一行眉题，略虚 */}
        <div style={{
          position: 'absolute', left: 300, top: 252, ...type(40, 600, { caps: true }), letterSpacing: '0.3em',
          color: 'rgba(255,240,240,0.82)', filter: 'blur(1.2px)',
        }}>
          Vesper 2 · Private beta
        </div>
        {/* 焦平面：巨型胶囊按钮 */}
        <div style={{
          position: 'absolute', left: 300, top: 360, height: 268, padding: '0 64px 0 104px', borderRadius: 134,
          display: 'flex', alignItems: 'center', gap: 64,
          background: done ? '#140c0c' : '#fff8f5',
          transform: `scale(${pressed ? 0.965 : 1})`, transformOrigin: '50% 50%',
          boxShadow: pressed
            ? 'inset 0 3px 0 rgba(255,255,255,0.5), 0 4px 10px rgba(80,0,10,0.35)'
            : 'inset 0 3px 0 rgba(255,255,255,0.9), 0 10px 24px rgba(80,0,10,0.28), 0 60px 120px -30px rgba(70,0,8,0.65)',
        }}>
          <div style={{ fontFamily: FONT.sans, fontSize: 104, fontWeight: 680, letterSpacing: '-0.035em', color: done ? '#fff4f2' : '#190b0c', whiteSpace: 'nowrap' }}>
            {done ? "You're on the list" : 'Get early access'}
          </div>
          <div style={{
            width: 168, height: 168, borderRadius: 84, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: done ? CRIMSON : '#190b0c', transform: done ? `scale(${(0.6 + 0.4 * tick).toFixed(4)})` : undefined,
          }}>
            <svg width={84} height={84} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
              {done ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M5 12h14M13 6l6 6-6 6" />}
            </svg>
          </div>
        </div>
        {/* 光标：微距下的大号指针，按下时略缩 */}
        <div style={{
          position: 'absolute', left: 1180 + cursorIn, top: 520 + cursorIn * 0.6,
          transform: `scale(${pressed ? 0.9 : 1})`, transformOrigin: '8px 6px', filter: 'drop-shadow(0 14px 18px rgba(60,0,8,0.45))',
        }}>
          <svg width={128} height={164} viewBox="0 0 14 18">
            <path d="M1 1 L1 15 L4.6 11.6 L7.2 17 L9.4 16 L6.9 10.7 L12 10.7 Z" fill="#140c0c" stroke="#ffffff" strokeWidth={1} strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <Grain opacity={0.06} />
    </div>
  );
};

export const LogoStingButton: React.FC = () => {
  const frame = useCurrentFrame();
  const W: React.CSSProperties = { width: 1920, height: 1080, position: 'relative', overflow: 'hidden' };

  // —— 彩蛋硬切 12f：无遮幅、整屏绯红 ——
  if (frame >= T.eggStart && frame < T.eggEnd) {
    return (
      <div style={W}>
        <Egg egg={frame - T.eggStart} />
      </div>
    );
  }

  // —— 其余：同一个舞台分支（上一镜尾巴 / 黑场 / LOGO / 切回定格），硬切回来像素一致 ——
  const bars = ramp(frame, 0, 16, EASE.snappy);
  return (
    <div style={W}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.42 }} fill={null} intensity={frame < T.tailEnd ? 0.55 : 0.35} vignette={0.6} grain={0.08} />
      {frame < T.tailEnd && <Tail frame={frame} />}
      {frame >= T.logoIn && <LogoCard frame={frame} />}
      <Letterbox p={bars} />
    </div>
  );
};
