// trailer-bumper｜前置速剪预告
//
// 第二轮重设计（「冷开场」· 青黑 + 琥珀的预告片调色，custom look）：
// 结构即全部，保持预告片的骨架：三连 9f 等长硬切 → 6f 纯黑静默 → 正式开场大标题。
// 三个速剪镜头是同一产品（虚构的部署平台「Cinder」）的三个最抓眼的局部，构图刻意拉开：
//   镜头 1 · 微距：一行 92px 等宽命令 `cinder deploy --everywhere` 荷兰角 −7°，上下行景深虚化，青色底光
//   镜头 2 · 全景：巨型数字「0.4s」琥珀渐变 + 透视网格地平线（全球冷启动），正视居中
//   镜头 3 · 特写：一枚 Deploy 按钮被光标按下（按下即压缩 3% + 一圈琥珀光环），反向荷兰角 +6°
// 每镜内部 scale 1→1.04 匀速微推保活（9f 内的恒速蠕动，跨切点读作同一口气），三镜统一暗角 + 颗粒。
// 黑场 27–33f 是真正的纯黑空帧（静默一拍，什么都不放）。
// 正式开场：舞台 14f 由黑亮起（青黑底 + 低位琥珀主光），标题「CINDER」逐字由虚到实从中间向两边
// 绽开、字距 0.42em → 0.16em 缓收（预告片标题的呼吸），一道琥珀色变形宽银幕光条从标题中线
// 横扫一次（Q4：只给主角一次）；眉题 / 副题 / 日期依次跟进；hold 段 3% 极缓推近让画面活着。
//
// 时间表（30fps，共 150f）：
//   0–9     镜头 1 微距命令行
//   9–18    镜头 2 全景大数字
//   18–27   镜头 3 特写按钮（21f 按下）
//   27–33   纯黑 6f
//   33–47   舞台亮起；35–60 标题逐字绽开；33–80 字距收拢；38–58 光条横扫
//   52–70   眉题 / 副题 / 日期跟进
//   80–150  hold 70f：极缓推近 1→1.03，光带呼吸，琥珀余烬浮尘上飘
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, Vignette, mix, ramp } from '../../_fixtures/Polish';
import { Dust, GridFloor, LOOKS, Stage, alpha, stagger, type, type Look } from '../../_fixtures/Look';

export const TRAILER_BUMPER_DURATION = 150;

// custom look：graphite 骨架 + 青黑底 + 琥珀强调（预告片 teal & amber 调色）
const C: Look = {
  ...LOOKS.graphite,
  bg: ['#0a1719', '#071113', '#030809'],
  light: '#1f7a7c',
  surface: '#0d1b1d',
  surface2: '#132426',
  line: 'rgba(160,230,225,0.12)',
  ink: '#f3efe6',
  ink2: '#a9b5b1',
  ink3: '#5b6a68',
  accent: '#ffb35c',
  accent2: '#3fd0c4',
  onAccent: '#1a0c00',
  shadow: '#000000',
};

const CUT_2 = 9;
const CUT_3 = 18;
const BLACK = 27;
const TITLE = 33;

// 速剪镜头内部匀速微推 1→1.04
const push = (frame: number, start: number) => 1 + 0.04 * Math.min(1, Math.max(0, (frame - start) / 9));

const Shot: React.FC<{ s: number; rot?: number; children: React.ReactNode; bg: string }> = ({ s, rot = 0, children, bg }) => (
  <AbsoluteFill style={{ background: bg, overflow: 'hidden' }}>
    <AbsoluteFill style={{ transform: `scale(${s.toFixed(4)}) rotate(${rot}deg)`, transformOrigin: '50% 50%' }}>{children}</AbsoluteFill>
    <Vignette strength={0.62} inner={0.36} color="#000000" />
    <Grain opacity={0.1} blend="soft-light" />
  </AbsoluteFill>
);

// 镜头 1：微距命令行
const CODE_LINES = [
  { t: '  build   ✓ 214 modules   1.2s', dim: true },
  { t: '  route   ✓ edge config   0.1s', dim: true },
  { t: '$ cinder deploy --everywhere', dim: false },
  { t: '  → 38 regions · warming', dim: true },
  { t: '  → health checks passing', dim: true },
];
const ShotCode: React.FC<{ frame: number }> = ({ frame }) => (
  <Shot s={push(frame, 0)} rot={-7} bg="#041011">
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(ellipse 60% 40% at 50% 58%, ${alpha(C.accent2, 0.3)} 0%, ${alpha(C.accent2, 0)} 70%)`,
      }}
    />
    <div style={{ position: 'absolute', left: 40, top: 170, width: 2200 }}>
      {CODE_LINES.map((l, i) => {
        const d = Math.abs(i - 2);
        return (
          <div
            key={i}
            style={{
              ...type(l.dim ? 68 : 92, l.dim ? 500 : 650, { mono: true }),
              lineHeight: l.dim ? '150px' : '190px',
              whiteSpace: 'pre',
              color: l.dim ? alpha(C.ink, 0.5) : C.ink,
              filter: d > 0 ? `blur(${(d * 4.5).toFixed(1)}px)` : undefined,
              textShadow: l.dim ? undefined : `0 0 30px ${alpha(C.accent2, 0.45)}`,
            }}
          >
            {l.dim ? (
              l.t
            ) : (
              <>
                <span style={{ color: C.accent2 }}>$ </span>cinder deploy <span style={{ color: C.accent }}>--everywhere</span>
                <span
                  style={{
                    display: 'inline-block',
                    width: 50,
                    height: 86,
                    marginLeft: 16,
                    verticalAlign: '-14px',
                    background: C.accent,
                    boxShadow: `0 0 24px ${alpha(C.accent, 0.8)}`,
                  }}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  </Shot>
);

// 镜头 2：全景大数字 + 透视网格地平线
const ShotStat: React.FC<{ frame: number }> = ({ frame }) => (
  <Shot s={push(frame, CUT_2)} bg="#050505">
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(ellipse 70% 40% at 50% 64%, ${alpha(C.accent, 0.32)} 0%, ${alpha(C.accent, 0)} 70%), linear-gradient(180deg, #07090a 0%, #0b0806 100%)`,
      }}
    />
    <GridFloor look={C} horizon={0.64} cell={1} scroll={(frame - CUT_2) * 0.12} opacity={0.55} color={C.accent} />
    <div style={{ position: 'absolute', left: 0, right: 0, top: 150, textAlign: 'center' }}>
      <div style={{ ...type(26, 700, { mono: true }), letterSpacing: '0.42em', color: alpha(C.accent, 0.85) }}>GLOBAL COLD START</div>
      <div
        style={{
          ...type(420, 820),
          letterSpacing: '-0.06em',
          lineHeight: 1,
          marginTop: 10,
          background: `linear-gradient(180deg, #fff6e6 10%, ${C.accent} 70%, #b85d1a 100%)`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          filter: `drop-shadow(0 0 40px ${alpha(C.accent, 0.35)})`,
        }}
      >
        0.4s
      </div>
    </div>
  </Shot>
);

// 镜头 3：Deploy 按钮被按下
const ShotPress: React.FC<{ frame: number }> = ({ frame }) => {
  const press = ramp(frame, 20, 2, EASE.out) * (1 - ramp(frame, 23, 4, EASE.out) * 0.6);
  const ring = ramp(frame, 21, 6, EASE.snappy);
  return (
    <Shot s={push(frame, CUT_3)} rot={6} bg="#071214">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 50% 50% at 56% 50%, ${alpha(C.light, 0.55)} 0%, ${alpha(C.light, 0)} 70%)`,
        }}
      />
      {/* 背后面板：景深虚化的行 */}
      <div style={{ position: 'absolute', left: -60, top: 120, width: 900, height: 860, borderRadius: 40, background: alpha('#0f2224', 0.9), border: `1px solid ${C.line}`, filter: 'blur(5px)' }}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} style={{ position: 'absolute', left: 120, top: 120 + i * 118, width: 520 - (i % 3) * 90, height: 26, borderRadius: 13, background: alpha(C.ink, 0.18) }} />
        ))}
      </div>
      {/* 按钮 */}
      <div
        style={{
          position: 'absolute',
          left: 760,
          top: 380,
          width: 820,
          height: 260,
          borderRadius: 130,
          background: `linear-gradient(180deg, #ffc98a 0%, ${C.accent} 55%, #e08a2c 100%)`,
          boxShadow: `inset 0 3px 0 rgba(255,255,255,0.55), inset 0 -6px 18px rgba(120,50,0,0.35), 0 ${(40 - 26 * press).toFixed(0)}px ${(90 - 40 * press).toFixed(0)}px -20px rgba(0,0,0,0.85), 0 0 ${(80 * ring).toFixed(0)}px ${alpha(C.accent, 0.5 * ring)}`,
          transform: `scale(${(1 - 0.03 * press).toFixed(4)})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 34,
          color: C.onAccent,
          ...type(120, 760),
        }}
      >
        <span style={{ fontSize: 96 }}>↑</span>Deploy
      </div>
      {/* 光环：按下瞬间向外扩一圈 */}
      {ring > 0 && ring < 1 && (
        <div
          style={{
            position: 'absolute',
            left: 760 - 40 * ring,
            top: 380 - 40 * ring,
            width: 820 + 80 * ring,
            height: 260 + 80 * ring,
            borderRadius: 200,
            border: `4px solid ${alpha(C.accent, 0.8 * (1 - ring))}`,
          }}
        />
      )}
      {/* 光标 */}
      <svg width={120} height={140} viewBox="0 0 24 28" style={{ position: 'absolute', left: 1420 - 18 * press, top: 548 - 10 * press, filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.6))' }}>
        <path d="M2 2 L2 22 L7.5 17 L11 25 L14.5 23.5 L11 15.8 L18.5 15.8 Z" fill="#ffffff" stroke="#111" strokeWidth={1.2} strokeLinejoin="round" />
      </svg>
    </Shot>
  );
};

const TITLE_TEXT = 'CINDER';

export const TrailerBumper: React.FC = () => {
  const frame = useCurrentFrame();

  // —— 段落 1–3：三连 9f 速剪（条件挂载 = 天然零过渡）——
  if (frame < CUT_2) return <ShotCode frame={frame} />;
  if (frame < CUT_3) return <ShotStat frame={frame} />;
  if (frame < BLACK) return <ShotPress frame={frame} />;

  // —— 段落 4：纯黑静默 6f，必须纯黑无物 ——
  if (frame < TITLE) return <AbsoluteFill style={{ background: '#000000' }} />;

  // —— 段落 5：正式开场 ——
  const lightUp = ramp(frame, TITLE, 14, EASE.out);
  const track = mix(0.42, 0.16, ramp(frame, TITLE, 47, EASE.out));
  const cam = 1 + 0.03 * ramp(frame, TITLE, TRAILER_BUMPER_DURATION - TITLE, EASE.smooth);
  const flareT = ramp(frame, 38, 22, EASE.swift);
  const flareA = Math.sin(Math.PI * Math.min(1, Math.max(0, (frame - 38) / 22)));
  const eyebrow = ramp(frame, 52, 16, EASE.out);
  const sub = ramp(frame, 58, 16, EASE.out);
  const date = ramp(frame, 64, 16, EASE.out);
  const n = TITLE_TEXT.length;

  return (
    <AbsoluteFill style={{ background: '#000000', overflow: 'hidden', fontFamily: FONT.sans }}>
      <AbsoluteFill style={{ opacity: lightUp }}>
        <Stage look={C} keyLight={{ x: 0.5, y: 0.62 }} fill={{ x: 0.5, y: 1.05 }} horizon={0.6} breathe={0.6} vignette={0.7} grain={0.1}>
          {/* 余烬：琥珀色浮尘缓缓上飘，hold 段的"活气"（品牌名 Cinder 的视觉双关） */}
          <Dust look={C} count={34} seed={7} drift={0.9} opacity={0.75} color={C.accent} />
        </Stage>
      </AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${cam.toFixed(4)})`, transformOrigin: '50% 52%' }}>
        {/* 变形宽银幕光条：沿标题中线横扫一次 */}
        {flareA > 0.01 && (
          <div
            style={{
              position: 'absolute',
              left: mix(-900, 1500, flareT),
              top: 538,
              width: 1300,
              height: 3,
              borderRadius: 2,
              opacity: flareA,
              background: `linear-gradient(90deg, ${alpha(C.accent, 0)} 0%, ${alpha('#ffe2b8', 0.95)} 50%, ${alpha(C.accent, 0)} 100%)`,
              boxShadow: `0 0 24px 6px ${alpha(C.accent, 0.45)}`,
            }}
          />
        )}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 300, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ opacity: eyebrow, transform: `translateY(${mix(12, 0, eyebrow).toFixed(2)}px)`, ...type(28, 700, { mono: true }), letterSpacing: '0.5em', color: C.accent, marginBottom: 44 }}>
            A NEW WAY TO SHIP
          </div>
          <div style={{ display: 'flex', ...type(230, 800), letterSpacing: `${track.toFixed(4)}em`, marginRight: `-${track.toFixed(4)}em`, color: C.ink, lineHeight: 1 }}>
            {Array.from(TITLE_TEXT).map((ch, i) => {
              // 从中间向两边绽开：中间两字先到
              const order = Math.abs(i - (n - 1) / 2);
              const st = 35 + stagger(order, (n + 1) / 2, 14, EASE.out);
              const p = ramp(frame, st, 18, EASE.out);
              return (
                <span
                  key={i}
                  style={{
                    display: 'inline-block',
                    opacity: p,
                    filter: p < 1 ? `blur(${((1 - p) * 18).toFixed(1)}px)` : undefined,
                    transform: `scale(${mix(1.12, 1, p).toFixed(4)})`,
                    textShadow: `0 0 50px ${alpha(C.accent, 0.22)}`,
                  }}
                >
                  {ch}
                </span>
              );
            })}
          </div>
          <div style={{ marginTop: 46, opacity: sub, transform: `translateY(${mix(12, 0, sub).toFixed(2)}px)`, ...type(42, 450), color: C.ink2 }}>
            Ship to every region in under a second.
          </div>
          <div
            style={{
              marginTop: 60,
              opacity: date,
              display: 'flex',
              alignItems: 'center',
              gap: 22,
              ...type(30, 650, { mono: true }),
              letterSpacing: '0.32em',
              color: alpha(C.ink, 0.8),
            }}
          >
            <span style={{ width: 80 * date, height: 1.5, background: alpha(C.accent, 0.7) }} />
            10 · 14
            <span style={{ width: 80 * date, height: 1.5, background: alpha(C.accent, 0.7) }} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
