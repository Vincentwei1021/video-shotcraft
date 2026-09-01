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
const SANS = '-apple-system, "PingFang SC", BlinkMacSystemFont, sans-serif';
const MONO = 'Menlo, "SF Mono", monospace';
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

const Bar: React.FC<{ w: number; h?: number; color?: string; radius?: number }> = ({
  w,
  h = 16,
  color = '#e3e3e8',
  radius = 8,
}) => <div style={{ width: w, height: h, borderRadius: radius, background: color }} />;

/** 1 马克笔扫读：一行字被黄块自左盖过 */
const TileSweep: React.FC = () => {
  const f = useCurrentFrame();
  const s = F(f, 14, 34);
  return (
    <Pad>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        <Bar w={300} h={14} />
        <div style={{ position: 'relative', width: 640, height: 40 }}>
          <div
            style={{
              position: 'absolute',
              left: -8,
              top: 2,
              width: 636 * s,
              height: 36,
              background: MARKER_COLOR,
              borderRadius: 6,
            }}
          />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
            <Bar w={620} h={22} color="#2a2a30" radius={4} />
          </div>
        </div>
        <Bar w={480} h={14} />
      </div>
    </Pad>
  );
};

/** 2 指标 + sparkline 描线 */
const SPARK = 'M8 118 L118 92 L228 104 L338 56 L448 68 L558 20 L632 34';
const TileMetric: React.FC = () => {
  const f = useCurrentFrame();
  const draw = F(f, 10, 46);
  const val = 128 + Math.round(F(f, 8, 40, Easing.out(Easing.quad)) * 84);
  return (
    <Pad>
      <div style={{ fontSize: 30, color: INK_DIM, letterSpacing: '0.06em' }}>SESSIONS</div>
      <div
        style={{
          fontSize: 132,
          fontWeight: 700,
          color: INK,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.1,
        }}
      >
        {val}
      </div>
      <svg width={640} height={140} viewBox="0 0 640 140" style={{ marginTop: 12 }}>
        {/* 灰底轨迹：首帧就有内容，描线只是把它点亮 */}
        <path d={SPARK} fill="none" stroke="#e3e3e8" strokeWidth={8} strokeLinecap="round" />
        <path
          d={SPARK}
          fill="none"
          stroke="#7A5AF8"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={900}
          strokeDashoffset={900 * (1 - draw)}
        />
      </svg>
    </Pad>
  );
};

/** 3 竖向步骤清单逐条勾选 */
const TileSteps: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Pad>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>
        {[0, 1, 2, 3].map((i) => {
          const on = F(f, 8 + i * 9, 22 + i * 9);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 26, opacity: 0.35 + on * 0.65 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  background: on > 0.6 ? '#7A5AF8' : '#e3e3e8',
                }}
              />
              <Bar w={200 + i * 110} h={22} color="#2a2a30" radius={6} />
            </div>
          );
        })}
      </div>
    </Pad>
  );
};

/** 4 路线描线 + 落点钉针 */
const TileRoute: React.FC = () => {
  const f = useCurrentFrame();
  const draw = F(f, 6, 42);
  const pin = spring({ frame: f - 36, fps: 30, config: { damping: 12 } });
  return (
    <Pad bg="#f4f4f7">
      <svg width={848} height={428} viewBox="0 0 848 428">
        <path
          d="M40 380 C 200 380 190 210 340 200 C 500 190 500 90 700 70"
          fill="none"
          stroke="#c9c9d2"
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
        <g transform={`translate(700 70) scale(${pin})`}>
          <circle r={26} fill="#7A5AF8" />
          <circle r={10} fill="#ffffff" />
        </g>
      </svg>
    </Pad>
  );
};

/** 5 深底终端打字 */
const TileTerminal: React.FC = () => {
  const f = useCurrentFrame();
  const rows = [520, 400, 610, 300];
  return (
    <Pad bg="#1d1d1f">
      <div style={{ display: 'flex', gap: 14, marginBottom: 34 }}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
          <div key={c} style={{ width: 20, height: 20, borderRadius: 10, background: c }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* 提示符常驻：首帧的终端里已经有东西，打字才是动效本身 */}
        <Bar w={120} h={18} color="#7A5AF8" radius={4} />
        {rows.map((w, i) => {
          const p = F(f, 8 + i * 11, 20 + i * 11, Easing.linear);
          return <Bar key={i} w={w * p} h={18} color="#4a4a52" radius={4} />;
        })}
      </div>
    </Pad>
  );
};

/** 6 线稿描画（铅笔速写） */
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
      <svg width={848} height={428} viewBox="0 0 848 428">
        {/* 淡稿：首帧是一张有底稿的纸，描线把它落成实线 */}
        {strokes.map((d, i) => (
          <path key={`g${i}`} d={d} fill="none" stroke="#e7e7ec" strokeWidth={7} strokeLinecap="round" />
        ))}
        {strokes.map((d, i) => {
          const p = F(f, 6 + i * 10, 24 + i * 10);
          return (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={INK}
              strokeWidth={7}
              strokeLinecap="round"
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
  const p = F(f, 16, 44);
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
          boxShadow: '0 0 0 1px rgba(29,29,31,0.08)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 220,
          top: 130,
          display: 'flex',
          flexDirection: 'column',
          gap: 22,
          opacity: p,
        }}
      >
        <Bar w={420} h={20} color="#2a2a30" radius={6} />
        <Bar w={330} h={20} />
        <Bar w={380} h={20} />
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
        <div style={{ fontSize: 30, color: INK_DIM, letterSpacing: '0.4em' }}>2026 · Q3</div>
        <div
          style={{
            fontSize: 128,
            fontWeight: 800,
            letterSpacing: '-0.04em',
            color: INK,
            transform: `scale(${0.72 + p * 0.28})`,
            opacity: p,
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
  { Comp: TileTerminal, bg: '#1d1d1f' },
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
  });
  const exitQ = interpolate(t, [EXIT_AT, EXIT_AT + EXIT_DUR], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
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
        });
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - (CW * s) / 2,
              top: y - (CH * s) / 2,
              width: CW * s,
              height: CH * s,
              borderRadius: 10,
              overflow: 'hidden',
              background: tile.bg,
              opacity: op,
              zIndex: 10 + Math.round(depth * 5),
              boxShadow: '0 0 0 1px rgba(29,29,31,0.08), 0 14px 34px rgba(16,24,40,0.12)',
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
          filter: exitQ > 0.01 ? `blur(${exitQ * EXIT_BLUR}px)` : undefined,
          zIndex: 30,
        }}
      >
        {KICKER}
      </div>
    </AbsoluteFill>
  );
};
