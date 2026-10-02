// dolly-zoom 滑动变焦（第二轮重设计）——主体卡（card4-hires）屏幕大小锁死在画面中，
// 身后的空间按真实 dolly-zoom 光学被拉伸："世界压过来而主角纹丝不动"。伪 dolly-zoom：无需 3D，分层反向补偿。
//
// 设计决定
// - look：midnight（深蓝夜 + 电光蓝）。截图卡是暖白纸色，放进深蓝暗场里就是唯一的亮面——观众的眼睛
//   被钉在它身上，背景越拉伸越像"注意力隧道"。
// - 空间是一条走廊：8 道 16:9 圆角框线（δ = 0.3…7，等物理尺寸）+ 四条透视棱线 + 两侧墙上的 6 张真实项目卡
//   （δ=0.9，multiply 到深蓝退成环境）+ 镜头前一层散景光斑（δ=−0.35，景深虚化）。
//   机位后退 R（1→2.4）倍、焦距同步拉长保持主体等大时，相对主体再远 δ 的层屏幕缩放 = R(1+δ)/(R+δ)：
//   远处的框从主体身后"长"出来（×2），近处的框几乎不动（×1.15），前景反而缩小内收（×0.8）——
//   层间速度差就是眩晕感。景深随焦距变长变浅：越远越糊、越暗。
// - 主体：屏中 620px 宽，不参与任何变换；身后一圈电光蓝背光随推拉增强，两层落影加深——"钉住感"。
// - 收尾落版：上方等宽眉题字距收拢，下方 120px 标题「Tune out the noise.」逐词升起。
//
// 时间表（30fps，150f）
//   0–14     静立：走廊全景深，主体已在画面（第 1 帧就有完整画面）
//   14–112   推拉 98f：R 1→2.4，不对称 in-out（起步慢、中段最快、落位软）；暗角收紧、背光增强
//   96–124   落版：眉题字距收拢（96）→ 标题逐词从线下升起（102）
//   112–149  hold：R 继续极缓 2.4→2.46，空间仍在微微呼吸，尾帧是完整海报
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import layout from '../../_textures/live-layout.json';
import { EASE, Grain, Vignette, bezier, mix, ramp, softShadow } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';

export const DOLLYZOOM_DUR = 150;

const L = LOOKS.midnight;
const CARDS = layout.projects.cards;
const R_END = 2.4; // 机位后退倍数
const EASE_DOLLY = bezier(0.5, 0, 0.22, 1);
const VP = { x: 960, y: 500 }; // 灭点 = 主体中心（略高于画面中心，给下方落版留位）

// 主体：620 宽，按 card4 宽高比
const SUB_W = 620;
const SUB_H = (SUB_W * CARDS[3].h) / CARDS[3].w;

// 层的屏幕缩放：R(1+δ)/(R+δ)
const layerScale = (R: number, delta: number) => (R * (1 + delta)) / (R + delta);

// 走廊框线：等物理尺寸 → R=1 时屏幕宽 = FRAME_W/(1+δ)；之后再乘 layerScale
const FRAME_W = 2700;
const FRAMES = [0.3, 0.65, 1.1, 1.7, 2.5, 3.6, 5, 7];

// 墙上的真实卡（δ=0.9）：相对灭点偏移，R=1 时互不重叠、不压主体
const WALL: { i: number; x: number; y: number }[] = [
  { i: 0, x: -640, y: -300 },
  { i: 1, x: 640, y: -300 },
  { i: 2, x: -720, y: 60 },
  { i: 4, x: 720, y: 60 },
  { i: 5, x: -600, y: 400 },
  { i: 6, x: 600, y: 400 },
];
const WALL_W = 300;
const WALL_D = 0.9;
const FG_D = -0.35;
// 前景散景：分布在主体四周（不压主体），大而虚
const BOKEH = [
  { x: -820, y: -380, r: 60, a: 0.22 }, { x: -690, y: 330, r: 90, a: 0.16 }, { x: 760, y: -420, r: 70, a: 0.18 },
  { x: 880, y: 250, r: 110, a: 0.12 }, { x: -980, y: -40, r: 40, a: 0.28 }, { x: 600, y: 470, r: 50, a: 0.2 },
  { x: -420, y: -520, r: 34, a: 0.3 }, { x: 1010, y: -120, r: 46, a: 0.24 },
];

// 以灭点为中心整层缩放
const Layer: React.FC<{ s: number; blur?: number; opacity?: number; children: React.ReactNode }> = ({ s, blur = 0, opacity = 1, children }) => (
  <AbsoluteFill style={{
    transform: `scale(${s.toFixed(5)})`, transformOrigin: `${VP.x}px ${VP.y}px`,
    filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined, opacity,
  }}>{children}</AbsoluteFill>
);

export const DollyZoomReal: React.FC = () => {
  const frame = useCurrentFrame();
  const t = ramp(frame, 14, 98, EASE_DOLLY);
  const R = mix(1, R_END, t) + 0.06 * ramp(frame, 112, 37, EASE.smooth);
  const p = (R - 1) / (R_END - 1); // 0..~1.04 推拉进度（光与景深用）

  const kick = ramp(frame, 96, 22, EASE.snappy);

  return (
    <AbsoluteFill style={{ background: L.bg[2], overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: VP.x / 1920, y: VP.y / 1080 }} fill={{ x: 0.5, y: 1.1 }} intensity={0.55 + 0.25 * p} vignette={0.2}>
        {/* 走廊棱线：从灭点射向四角（方向不随 R 变，靠框线的膨胀读出纵深）；灭点附近淡出 */}
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <radialGradient id="dz-edge" cx={VP.x} cy={VP.y} r={1150} gradientUnits="userSpaceOnUse">
              <stop offset="0.18" stopColor={L.accent} stopOpacity={0} />
              <stop offset="1" stopColor={L.accent} stopOpacity={0.35} />
            </radialGradient>
          </defs>
          {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy], k) => (
            <line key={k} x1={VP.x} y1={VP.y} x2={VP.x + sx * 2400} y2={VP.y + sy * 1350} stroke="url(#dz-edge)" strokeWidth={1.5} />
          ))}
        </svg>
        {/* 走廊框线：远处的从主体身后长出来，越远越暗越虚 */}
        {FRAMES.map((d, k) => {
          const w = (FRAME_W / (1 + d)) * layerScale(R, d);
          const h = w * 0.5625;
          const fog = 1 - k / (FRAMES.length + 1);
          return (
            <div key={k} style={{
              position: 'absolute', left: VP.x - w / 2, top: VP.y - h / 2, width: w, height: h, borderRadius: w * 0.03, boxSizing: 'border-box',
              border: `${(2.2 * fog + 0.6).toFixed(2)}px solid ${alpha(L.accent, (0.16 + 0.34 * fog) * (0.8 + 0.2 * p))}`,
              boxShadow: `0 0 ${(18 * fog).toFixed(1)}px ${alpha(L.light, 0.18 * fog)}`,
              filter: d > 2 ? `blur(${(0.4 + p * (d - 2) * 0.5).toFixed(2)}px)` : undefined,
            }} />
          );
        })}
      </Stage>

      {/* 墙上的真实卡（δ=0.9）：压暗染蓝退成环境，随推拉外扩、渐虚 */}
      <Layer s={layerScale(R, WALL_D)}>
        {WALL.map(({ i, x, y }) => {
          const c = CARDS[i];
          const h = (WALL_W * c.h) / c.w;
          return (
            <div key={c.file} style={{
              position: 'absolute', left: VP.x + x - WALL_W / 2, top: VP.y + y - h / 2, width: WALL_W, height: h, borderRadius: 8, overflow: 'hidden',
              background: '#22377a', isolation: 'isolate', opacity: 0.55,
              boxShadow: `0 20px 50px rgba(0,2,8,0.7), 0 0 0 1px ${alpha(L.accent, 0.3)}`,
              filter: `blur(${(0.8 + p * 3).toFixed(2)}px)`, // 模糊挂在单卡上（小元素），不做整层全屏实时模糊
            }}>
              {/* multiply 到深蓝底：白纸 → 钴蓝、墨字 → 近黑——墙上的卡是环境，不是要读的内容 */}
              <Img src={staticFile(`textures/live/${c.file}`)} style={{ width: '100%', height: '100%', mixBlendMode: 'multiply' }} />
            </div>
          );
        })}
      </Layer>

      {/* 主体身后的电光蓝背光：随推拉增强（主角唯一的光） */}
      <div style={{
        position: 'absolute', left: VP.x - SUB_W * 1.1, top: VP.y - SUB_H * 1.1, width: SUB_W * 2.2, height: SUB_H * 2.2,
        background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha(L.light, 0.3 + 0.3 * p)} 0%, ${alpha(L.light, 0.08)} 45%, ${alpha(L.light, 0)} 70%)`,
      }} />
      <Vignette strength={0.3 + 0.35 * p} inner={0.32} color={L.shadow} cy={VP.y / 1080} />

      {/* 主体：视觉大小恒定钉在灭点（不参与任何变换），两层落影随进程加深 */}
      <div style={{
        position: 'absolute', left: VP.x - SUB_W / 2, top: VP.y - SUB_H / 2, width: SUB_W, height: SUB_H, borderRadius: 14, overflow: 'hidden',
        boxShadow: `0 0 0 1px ${alpha('#ffffff', 0.5)}, 0 0 ${(30 + 30 * p).toFixed(1)}px ${alpha(L.light, 0.35 + 0.25 * p)}, ${softShadow(18 + p * 30, { color: L.shadow, strength: 2.4 })}`,
      }}>
        <Img src={staticFile('textures/live/card4-hires.png')} style={{ width: '100%', height: '100%' }} />
        {/* 顶沿冷色受光 */}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${alpha('#dfe8ff', 0.18)}, transparent 30%)` }} />
      </div>

      {/* 前景散景（δ=−0.35）：比主体更近的浮尘光斑，推拉时反而缩小内收；景深虚化 */}
      <Layer s={layerScale(R, FG_D)}>
        {BOKEH.map((b, k) => (
          <div key={k} style={{
            position: 'absolute', left: VP.x + b.x - b.r, top: VP.y + b.y - b.r, width: b.r * 2, height: b.r * 2, borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha('#cfe0ff', b.a)} 0%, ${alpha(L.accent, b.a * 0.5)} 45%, ${alpha(L.accent, 0)} 70%)`,
          }} />
        ))}
      </Layer>

      {/* 落版 */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 112, textAlign: 'center', ...type(24, 600, { mono: true }), letterSpacing: `${mix(0.7, 0.3, kick).toFixed(3)}em`, color: L.accent, opacity: kick, textTransform: 'uppercase' }}>
        Focus mode · Project 04
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 868, textAlign: 'center', ...type(120, 720), color: L.ink, textShadow: `0 4px 40px ${alpha(L.shadow, 0.9)}` }}>
        <TextReveal text="Tune out the noise." by="word" variant="rise" start={102} each={20} gap={4} />
      </div>
      <Grain opacity={0.06} blend="soft-light" />
    </AbsoluteFill>
  );
};
