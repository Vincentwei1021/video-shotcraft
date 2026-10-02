// orbit-ring-title-open — 环形卡阵标题开场
// 八张 16:9 内容卡按 45° 均布在 700×375 椭圆上匀速公转（卡身永不倾斜，纵深只由
// sin(θ) 给出 ±9% 缩放与 z 序），入场期卡内容冻结首帧、环撑开落定后统一开播；
// 居中标题逐字解糊下沉落定，关键词全部到位那一刻黄色马克块自左横扫铺满，
// mono 副行随后浮出；末段整幕失焦淡出，环继续转着交棒下一镜。
//
// 参数以 1920×1080 标定（不走 DesignStage：环半径/卡尺寸/字号都是成片实测值）。
import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Freeze,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { Grain, softShadow } from '../../_fixtures/Polish';

export const ORBIT_RING_TITLE_OPEN_DURATION = 130; // 4.33s @30fps

// ---- 环 ----
const RX = 700; // 椭圆长半轴
const RY = 375; // 椭圆短半轴（RY/RX≈0.54 → 读作俯视的环，不是正圆转盘）
const CW = 380; // 卡宽（16:9）
const CH = 214;
const N = 8;
const ROT_SPEED = 0.3; // rad/s，正值 = 顺时针
const RING_IN = 0.7; // s：从中心撑开到满径
const RING_SCALE_FROM = 0.62;
const PLAY_START = 24; // f：环撑开 + 逐卡淡入收尾，之后卡内容才开播
const DEPTH_SCALE = 0.09; // 近大远小幅度（底部近、顶部远）

// ---- 标题（blur-slide 逐字：位移先停、解糊后停）----
const HEADLINE = '让镜头卡替你想好每一个动效';
const H_SIZE = 64;
const H_LEAD = 0.35; // s：首字起手
const H_DUR = 0.9; // s：单字解糊行程
const H_TRAVEL = 0.3; // s：单字下沉行程（只占解糊的前 1/3）
const H_STAGGER = 0.0333; // s：字间错峰 = 1 帧
const H_EASE = Easing.bezier(0.22, 1, 0.36, 1);

// ---- 马克块（marker-highlight）----
const HL_START = 8; // 「每一个动效」起始字序
const MARKER_AT_F = 40; // 末字视觉到位那一刻起扫
const MARKER_COLOR = '#facc15';

// ---- 副行与退场 ----
const KICKER = 'VIDEO-SHOTCRAFT';
const KICKER_IN: [number, number] = [1.0, 1.5];
const EXIT_AT = 3.6;
const EXIT_DUR = 0.34;
const EXIT_BLUR = 6.5;

const INK = '#1d1d1f';
const INK_DIM = '#7a7a7a';
const SANS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Helvetica Neue", sans-serif';
const MONO = '"SF Mono", "JetBrains Mono", Menlo, monospace';
// 彩色 pastel mesh：四个大半径径向渐变叠在米白底上，纯 CSS，无素材依赖
const MESH_BG =
  'radial-gradient(52% 44% at 18% 22%, rgba(122,90,248,0.20) 0%, rgba(122,90,248,0) 70%),' +
  'radial-gradient(46% 42% at 84% 18%, rgba(255,138,178,0.20) 0%, rgba(255,138,178,0) 70%),' +
  'radial-gradient(58% 50% at 78% 84%, rgba(96,190,255,0.20) 0%, rgba(96,190,255,0) 70%),' +
  'radial-gradient(50% 46% at 24% 88%, rgba(255,196,112,0.20) 0%, rgba(255,196,112,0) 70%),' +
  'linear-gradient(180deg, #f7f6f9 0%, #f2f1f5 100%)';

// ── 卡内占位内容 ───────────────────────────────────────────────────────────
// 每张卡是一段 960×540 的独立小动效（各自从 frame 0 起播，被 <Freeze> 统一压住）。
// 落地时把这 8 个组件换成你自己的镜头卡/真实截图组件即可，环的语法不变。
const F = (frame: number, a: number, b: number, ease = Easing.out(Easing.cubic)) =>
  interpolate(frame, [a, b], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });

const Pad: React.FC<{ children: React.ReactNode; bg?: string }> = ({ children, bg = '#ffffff' }) => (
  <div style={{ position: 'absolute', inset: 0, background: bg, padding: 56, fontFamily: SANS }}>
    {children}
  </div>
);

// 卡内文字：按 960×540 作画、整体缩到 0.4 倍，正文用 26–44px 才在成片里读得出纹理
const T: React.FC<{ size: number; color?: string; weight?: number; mono?: boolean; style?: React.CSSProperties; children: React.ReactNode }> = ({
  size,
  color = INK,
  weight = 500,
  mono,
  style,
  children,
}) => (
  <div
    style={{
      fontSize: size,
      color,
      fontWeight: weight,
      fontFamily: mono ? MONO : SANS,
      letterSpacing: mono ? 0 : size >= 40 ? '-0.03em' : '-0.01em',
      lineHeight: 1.25,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </div>
);
const Caps: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '0.14em', color: INK_DIM }}>{children}</div>
);

/** 1 马克笔扫读：一句话被黄块自左盖过 */
const TileSweep: React.FC = () => {
  const f = useCurrentFrame();
  const s = F(f, 14, 34, Easing.bezier(0.16, 1, 0.3, 1));
  return (
    <Pad>
      <Caps>RELEASE NOTES</Caps>
      <div style={{ position: 'relative', display: 'inline-block', marginTop: 34 }}>
        <div
          style={{
            position: 'absolute',
            left: -10,
            right: -10,
            top: 6,
            bottom: 2,
            background: MARKER_COLOR,
            borderRadius: 6,
            transformOrigin: 'left center',
            transform: `scaleX(${s})`,
          }}
        />
        <T size={50} weight={700} style={{ position: 'relative' }}>Motion that feels considered.</T>
      </div>
      <T size={30} color={INK_DIM} weight={450} style={{ marginTop: 30 }}>Every card ships with timing, easing</T>
      <T size={30} color={INK_DIM} weight={450} style={{ marginTop: 6 }}>and a validated reference build.</T>
    </Pad>
  );
};

/** 2 指标 + sparkline 描线（灰底轨迹首帧即在，描线点亮 + 面积渐显） */
const SPARK = 'M8 118 L118 92 L228 104 L338 56 L448 68 L558 20 L632 34';
const TileMetric: React.FC = () => {
  const f = useCurrentFrame();
  const draw = F(f, 10, 46, Easing.bezier(0.65, 0, 0.35, 1));
  const val = 128 + Math.round(F(f, 8, 40, Easing.out(Easing.quad)) * 84);
  const chip = F(f, 34, 46);
  return (
    <Pad>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <Caps>SESSIONS</Caps>
        <div
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: '#1f8a5b',
            background: 'rgba(31,138,91,0.1)',
            padding: '4px 12px',
            borderRadius: 999,
            opacity: chip,
            transform: `translateY(${(1 - chip) * 8}px)`,
          }}
        >
          +18.4%
        </div>
      </div>
      <div
        style={{
          fontSize: 132,
          fontWeight: 700,
          color: INK,
          letterSpacing: '-0.04em',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.1,
        }}
      >
        {val}
      </div>
      <svg width={640} height={140} viewBox="0 0 640 140" style={{ marginTop: 12, overflow: 'visible' }}>
        <defs>
          <linearGradient id="orto-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7A5AF8" stopOpacity={0.22} />
            <stop offset="1" stopColor="#7A5AF8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={`${SPARK} L632 140 L8 140 Z`} fill="url(#orto-area)" opacity={draw} />
        <path d={SPARK} fill="none" stroke="#ececf1" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
        <path
          d={SPARK}
          fill="none"
          stroke="#7A5AF8"
          strokeWidth={8}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={900}
          strokeDashoffset={900 * (1 - draw)}
        />
      </svg>
    </Pad>
  );
};

/** 3 竖向步骤清单逐条勾选 */
const STEPS = ['Draft the storyboard', 'Pick shot cards', 'Tune easing curves', 'Render & review'];
const TileSteps: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Pad>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
        {STEPS.map((label, i) => {
          const on = F(f, 8 + i * 9, 22 + i * 9);
          const tick = F(f, 12 + i * 9, 22 + i * 9, Easing.bezier(0.34, 1.45, 0.64, 1));
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  flex: 'none',
                  boxSizing: 'border-box',
                  background: on > 0.6 ? '#7A5AF8' : '#ffffff',
                  border: on > 0.6 ? 'none' : '3px solid #dcdce3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width={26} height={26} viewBox="0 0 24 24" style={{ transform: `scale(${tick})` }}>
                  <path d="M5 12.5 L10 17 L19 7.5" fill="none" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <T size={36} weight={on > 0.6 ? 600 : 500} color={on > 0.6 ? INK : '#9a9aa2'}>
                {label}
              </T>
            </div>
          );
        })}
      </div>
    </Pad>
  );
};

/** 4 路线描线 + 落点钉针（浅网格地图底） */
const TileRoute: React.FC = () => {
  const f = useCurrentFrame();
  const draw = F(f, 6, 42, Easing.bezier(0.65, 0, 0.35, 1));
  const pin = spring({ frame: f - 36, fps: 30, config: { damping: 12 } });
  const tag = F(f, 42, 54);
  return (
    <Pad bg="#f4f4f7">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(29,29,31,0.05) 2px, transparent 2px), linear-gradient(90deg, rgba(29,29,31,0.05) 2px, transparent 2px)',
          backgroundSize: '80px 80px',
        }}
      />
      <svg width={848} height={428} viewBox="0 0 848 428" style={{ position: 'relative', overflow: 'visible' }}>
        <path
          d="M40 380 C 200 380 190 210 340 200 C 500 190 500 90 700 70"
          fill="none"
          stroke="#d6d6de"
          strokeWidth={10}
          strokeLinecap="round"
        />
        <path
          d="M40 380 C 200 380 190 210 340 200 C 500 190 500 90 700 70"
          fill="none"
          stroke="#7A5AF8"
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={1100}
          strokeDashoffset={1100 * (1 - draw)}
        />
        <circle cx={40} cy={380} r={14} fill="#ffffff" stroke="#7A5AF8" strokeWidth={6} />
        <g transform={`translate(700 70) scale(${pin})`}>
          <circle r={34} fill="rgba(122,90,248,0.18)" />
          <circle r={24} fill="#7A5AF8" />
          <circle r={9} fill="#ffffff" />
        </g>
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 470,
          top: 64, // 钉针左侧、路线上方，不压线
          padding: '10px 18px',
          borderRadius: 12,
          background: '#ffffff',
          boxShadow: '0 0 0 2px rgba(29,29,31,0.06), 0 10px 24px rgba(16,24,40,0.12)',
          opacity: tag,
          transform: `translateY(${(1 - tag) * 10}px)`,
        }}
      >
        <T size={28} weight={600}>ETA 12 min</T>
      </div>
    </Pad>
  );
};

/** 5 深底终端打字（打字是机械匀速语义，逐字线性揭示） */
const TERM = [
  { t: '$ npx remotion render Open', c: '#e8e8ee' },
  { t: '✓ Bundled in 2.1s', c: '#5ad19a' },
  { t: '  Rendering frames 0–129', c: '#a0a0aa' },
  { t: '✓ Done → out/open.mp4', c: '#5ad19a' },
];
const TileTerminal: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Pad bg="#17171a">
      <div style={{ display: 'flex', gap: 14, marginBottom: 34 }}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
          <div key={c} style={{ width: 20, height: 20, borderRadius: 10, background: c }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* 提示符常驻：首帧的终端里已经有东西，打字才是动效本身 */}
        <T size={28} mono color="#a28bff">~/shotcraft</T>
        {TERM.map((row, i) => {
          const p = F(f, 8 + i * 11, 20 + i * 11, Easing.linear);
          const n = Math.round(row.t.length * p);
          return (
            <T key={i} size={28} mono color={row.c} style={{ height: 35 }}>
              {row.t.slice(0, n)}
            </T>
          );
        })}
      </div>
    </Pad>
  );
};

/** 6 线稿描画（铅笔速写，点阵纸底） */
const TileSketch: React.FC = () => {
  const f = useCurrentFrame();
  const strokes = [
    'M80 380 L768 380',
    'M140 380 L200 90 L648 90 L708 380',
    'M280 90 L280 380',
    'M500 90 L500 380',
  ];
  return (
    <Pad>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(29,29,31,0.12) 2px, transparent 2.5px)',
          backgroundSize: '40px 40px',
        }}
      />
      <svg width={848} height={428} viewBox="0 0 848 428" style={{ position: 'relative' }}>
        {/* 淡稿：首帧是一张有底稿的纸，描线把它落成实线 */}
        {strokes.map((d, i) => (
          <path key={`g${i}`} d={d} fill="none" stroke="#e4e4ea" strokeWidth={7} strokeLinecap="round" />
        ))}
        {strokes.map((d, i) => {
          const p = F(f, 6 + i * 10, 24 + i * 10, Easing.bezier(0.65, 0, 0.35, 1));
          return (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={INK}
              strokeWidth={7}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={900}
              strokeDashoffset={900 * (1 - p)}
            />
          );
        })}
      </svg>
    </Pad>
  );
};

/** 7 卡片缩成胶囊（主体让位） */
const TileShrink: React.FC = () => {
  const f = useCurrentFrame();
  const p = F(f, 16, 44, Easing.bezier(0.65, 0, 0.35, 1));
  const cont = F(f, 28, 50);
  return (
    <Pad bg="#f4f4f7">
      <div
        style={{
          position: 'absolute',
          left: 56,
          top: 56,
          width: 848 - 700 * p,
          height: 428 - 350 * p,
          borderRadius: 16 + 30 * p,
          background: '#ffffff',
          boxShadow: '0 0 0 2px rgba(29,29,31,0.06), 0 12px 28px rgba(16,24,40,0.08)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: p > 0.6 ? 'center' : 'flex-start',
          justifyContent: p > 0.6 ? 'center' : 'flex-start',
          padding: p > 0.6 ? 0 : 40,
          boxSizing: 'border-box',
        }}
      >
        {p <= 0.6 ? (
          <div style={{ opacity: 1 - p / 0.6 }}>
            <Caps>WEEKLY SUMMARY</Caps>
            <T size={44} weight={700} style={{ marginTop: 18 }}>12 shots approved</T>
            <T size={28} color={INK_DIM} weight={450} style={{ marginTop: 10 }}>3 pending review · 1 re-render</T>
          </div>
        ) : (
          <T size={30} weight={600} style={{ opacity: (p - 0.6) / 0.4 }}>Summary</T>
        )}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 260,
          top: 150,
          opacity: cont,
          transform: `translateX(${(1 - cont) * 24}px)`,
        }}
      >
        <T size={46} weight={700}>Q3 launch plan</T>
        <T size={28} color={INK_DIM} weight={450} style={{ marginTop: 14 }}>Owner · Studio team</T>
        <T size={28} color={INK_DIM} weight={450} style={{ marginTop: 6 }}>Due Oct 18</T>
      </div>
    </Pad>
  );
};

/** 8 冲击字卡 */
const TileImpact: React.FC = () => {
  const f = useCurrentFrame();
  const p = spring({ frame: f - 8, fps: 30, config: { damping: 13, mass: 0.7 } });
  return (
    <Pad>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 26,
        }}
      >
        {/* 常驻小行 = 首帧的锚，大字砸下来才有对比 */}
        <div style={{ fontSize: 30, fontWeight: 600, color: '#7A5AF8', letterSpacing: '0.4em' }}>2026 · Q3</div>
        <div
          style={{
            fontSize: 128,
            fontWeight: 800,
            letterSpacing: '-0.045em',
            color: INK,
            transform: `scale(${0.72 + p * 0.28})`,
            opacity: Math.min(1, p),
          }}
        >
          GO LIVE
        </div>
      </div>
    </Pad>
  );
};

const TILES: { Comp: React.FC; bg: string }[] = [
  { Comp: TileSweep, bg: '#ffffff' },
  { Comp: TileShrink, bg: '#f4f4f7' },
  { Comp: TileMetric, bg: '#ffffff' },
  { Comp: TileRoute, bg: '#f4f4f7' },
  { Comp: TileSteps, bg: '#ffffff' },
  { Comp: TileTerminal, bg: '#17171a' },
  { Comp: TileSketch, bg: '#ffffff' },
  { Comp: TileImpact, bg: '#ffffff' },
];

// ── 主体 ───────────────────────────────────────────────────────────────────
export const OrbitRingTitleOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // 环入场：从中心撑开 + 逐卡淡入
  const ringIn = interpolate(t, [0, RING_IN], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const ringScale = RING_SCALE_FROM + (1 - RING_SCALE_FROM) * ringIn;
  const rot = t * ROT_SPEED;

  const markerScale = spring({ frame: frame - MARKER_AT_F, fps, config: { damping: 14 } });
  const kickerIn = interpolate(t, KICKER_IN, [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: H_EASE,
  });
  const exitQ = interpolate(t, [EXIT_AT, EXIT_AT + EXIT_DUR], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.7, 0, 0.84, 0),
  });

  const chars = Array.from(HEADLINE);
  // 逐字通道：位移只占前 H_TRAVEL，解糊走满 H_DUR（同起不同终 = blur-slide 的手感）
  const charStyle = (i: number): React.CSSProperties => {
    const at = H_LEAD + i * H_STAGGER;
    const pMain = interpolate(t, [at, at + H_DUR], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: H_EASE,
    });
    const pTravel = interpolate(t, [at, at + H_TRAVEL], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: H_EASE,
    });
    return {
      display: 'inline-block',
      whiteSpace: 'pre',
      position: 'relative',
      zIndex: 1,
      transformOrigin: '50% 55%',
      opacity: pMain,
      filter: `blur(${(1 - pMain) * (H_SIZE / 6)}px)`,
      transform: `translateY(${(1 - pTravel) * H_SIZE * 0.22}px)`,
    };
  };

  return (
    <AbsoluteFill style={{ background: MESH_BG, fontFamily: SANS }}>
      {TILES.map((tile, i) => {
        const theta = -Math.PI / 2 + (i * Math.PI * 2) / N + rot;
        const x = 960 + Math.cos(theta) * RX * ringScale;
        const y = 540 + Math.sin(theta) * RY * ringScale;
        const depth = Math.sin(theta); // +1 = 画面下方（近），−1 = 上方（远）
        const s = 1 + DEPTH_SCALE * depth;
        const op = interpolate(t, [0.06 + i * 0.05, 0.42 + i * 0.05], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(0.22, 1, 0.36, 1),
        });
        // 逐卡淡入时同步从 0.9 长到 1（与环撑开同向，读作"环长出来"）
        const grow = 0.9 + 0.1 * op;
        // 分层阴影随纵深变化：近处（下方）离地高、影大而虚，远处贴地、影小而实
        const elev = 10 + 8 * depth;
        const dark = tile.bg === '#17171a';
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - (CW * s) / 2,
              top: y - (CH * s) / 2,
              width: CW * s,
              height: CH * s,
              borderRadius: 12,
              overflow: 'hidden',
              background: tile.bg,
              opacity: op,
              transform: `scale(${grow})`,
              zIndex: 10 + Math.round(depth * 5),
              boxShadow: `${dark ? 'inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(0,0,0,0.2)' : 'inset 0 1px 0 rgba(255,255,255,0.9), 0 0 0 1px rgba(29,29,31,0.07)'}, ${softShadow(elev, { color: '#1a1830', strength: 1.15 })}`,
            }}
          >
            {/* 卡内按 960×540 作画再整体缩到卡宽——内容组件不需要知道自己被缩小了 */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 960,
                height: 540,
                transform: `scale(${(CW * s) / 960})`,
                transformOrigin: 'top left',
              }}
            >
              <Freeze frame={Math.max(0, frame - PLAY_START)}>
                <tile.Comp />
              </Freeze>
            </div>
          </div>
        );
      })}

      {/* 标题：整行退场时统一失焦淡出（逐字退场会读作第二次入场） */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', zIndex: 30 }}>
        <div
          style={{
            fontSize: H_SIZE,
            fontWeight: 600,
            letterSpacing: '-0.05em',
            color: INK,
            whiteSpace: 'nowrap',
            opacity: 1 - exitQ,
            filter: exitQ > 0.01 ? `blur(${exitQ * EXIT_BLUR}px)` : undefined,
          }}
        >
          {chars.slice(0, HL_START).map((ch, i) => (
            <span key={i} style={charStyle(i)}>
              {ch}
            </span>
          ))}
          {/* 高亮组：马克色块垫在这一段字底下，随字全部到位横扫铺开 */}
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <span
              aria-hidden
              style={{
                position: 'absolute',
                inset: '0.06em -0.08em',
                background: MARKER_COLOR,
                transformOrigin: 'left center',
                transform: `scaleX(${markerScale})`,
                borderRadius: 6,
                zIndex: 0,
              }}
            />
            {chars.slice(HL_START).map((ch, j) => (
              <span key={j} style={charStyle(HL_START + j)}>
                {ch}
              </span>
            ))}
          </span>
        </div>
      </AbsoluteFill>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          marginTop: 88,
          textAlign: 'center',
          fontFamily: MONO,
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: '0.35em',
          color: INK_DIM,
          opacity: kickerIn * (1 - exitQ),
          transform: `translateY(${(1 - kickerIn) * 12}px)`,
          filter: exitQ > 0.01 ? `blur(${exitQ * EXIT_BLUR}px)` : undefined,
          zIndex: 30,
        }}
      >
        {KICKER}
      </div>
      {/* 极淡颗粒：pastel mesh 大面积渐变防色带 */}
      <Grain opacity={0.045} style={{ zIndex: 40 }} />
    </AbsoluteFill>
  );
};
