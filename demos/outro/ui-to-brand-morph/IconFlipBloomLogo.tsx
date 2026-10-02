// icon-flip-bloom-logo —— 图标 Y 轴翻身压成竖线，从竖线绽放成花形 mark + wordmark 逐字落定
// 源：perplexity-promo 88–91.5s。
//
// 第二轮重设计（「温室」· 深绿夜 + 珊瑚花）：
// - look = custom「conservatory」：带绿色相的近黑温室（不是纯黑），顶部一束淡薄荷天光、地面一圈杏色光池；
//   全片唯一强调是花瓣的珊瑚→杏色渐变，其余都是暖象牙色与绿灰。品牌编为 AI 问答产品「Pollen」。
// - 主角是一枚 300px 的象牙白 app 图标（深绿笑脸笔记本字形），地面有跟随晃动的接触影。
// - 翻身用真 3D：perspective 下 rotateY 0→90°（ease-in 加速"甩"过去），两层滞后残影；转到 90° 的那一帧
//   图标正好侧成一条线，这里画一道发光的象牙色竖线 + 一次纵向光芒（全片唯一光效，Q4）。
// - 绽放：5 片泪滴形花瓣（SVG 贝塞尔路径，瓣根珊瑚、瓣尖杏色）从那条竖线里张开——初始角度交替指向
//   正上/正下，闭合时就是那条竖线，spring（damping 12）张到 72° 均分，瓣长、瓣宽同步生长，因果不断。
// - 让位：mark 左移 + 缩到 0.84（位置先到、缩放晚 3f 收敛），wordmark「Pollen」逐字由大变小落位
//   （scale 1.9→1 + blur 14→0，原点钉基线，错峰 2.6f），口号逐词升起。落定后花瓣极缓自转保持画面活着。
//
// 时间表（30fps，共 150f）：
//   0–12    图标登场（弹簧，起始态第 0 帧就在画面里）
//   12–36   预备：倾斜 -8° / +12° / -16° 幅度递增（原点钉底部），接触影随之偏移
//   36–46   翻身：rotateY 0→90°（ease-in cubic）+ 微放大 1→1.06，残影两层
//   46      竖线最薄帧：实体交换 + 纵向光芒（46–56 衰减）
//   46–72   绽放：spring 张开外层 5 瓣，内层 5 瓣晚 4f 跟随（错开 36°）
//   66–86   mark 左移让位 + 缩到 0.84
//   72–98   wordmark 逐字落定
//   100–124 口号逐词升起
//   84–150  相机极缓推近 2.5%；124–150 海报 hold（花瓣极缓自转 + 光池呼吸）
import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { EASE, mix, ramp } from '../../_fixtures/Polish';
import { Dust, LOOKS, Stage, TextReveal, alpha, springAt, type, type Look } from '../../_fixtures/Look';

export const ICON_FLIP_BLOOM_LOGO_DURATION = 150;

// 温室：绿色相近黑 + 暖杏主光 + 珊瑚强调
const L: Look = {
  ...LOOKS.graphite,
  bg: ['#10211a', '#09140f', '#040907'],
  light: '#bfe6cf', // 温室天光：淡薄荷白（暖光打在绿底上会发脏发橄榄）
  surface: '#f6efe3',
  ink: '#f6efe4',
  ink2: '#a9b6aa',
  ink3: '#5f6f64',
  accent: '#ff7457',
  accent2: '#5fb08a',
  shadow: '#010403',
};
const CORAL = '#ff6a4a';
const CORAL_DEEP = '#d9432e';
const APRICOT = '#ffc48a';
const GREEN = '#10261c';

const CX = 960;
const CY = 470; // lockup 视觉中线（下方留给口号）
const ICON = 300;

// —— 关键帧
const FLIP0 = 36;
const FLIP1 = 46; // 最薄帧 = 实体交换
const SHIFT0 = 66;
const WORD0 = 72;
const TAG0 = 100;

// 笑脸笔记本字形（深绿，线性）
const Glyph: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 40 40">
    <rect x={8} y={7} width={24} height={18} rx={3.6} fill="none" stroke={GREEN} strokeWidth={2.8} />
    <circle cx={16} cy={14} r={1.9} fill={GREEN} />
    <circle cx={24} cy={14} r={1.9} fill={GREEN} />
    <path d="M15 18.4 Q20 22.6 25 18.4" stroke={GREEN} strokeWidth={2.6} fill="none" strokeLinecap="round" />
    <path d="M4.5 30.5 L35.5 30.5" stroke={GREEN} strokeWidth={3.2} strokeLinecap="round" />
  </svg>
);

// app 图标：象牙白圆角方块 + 顶部内高光 + 底部微暗
const AppIcon: React.FC = () => (
  <div style={{
    width: ICON, height: ICON, borderRadius: 74, position: 'relative', overflow: 'hidden',
    background: 'linear-gradient(165deg, #fffaf1 0%, #f3ebdd 55%, #e3d8c5 100%)',
    boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.9), inset 0 -6px 14px rgba(90,70,40,0.12), 0 30px 60px -24px rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 30% 10%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 60%)' }} />
    <div style={{ position: 'relative' }}><Glyph size={ICON * 0.72} /></div>
  </div>
);

// 泪滴花瓣（指向 -y），长 l、半宽 w
const petalPath = (l: number, w: number) =>
  `M0 0 C ${w * 1.15} ${-l * 0.22} ${w * 1.05} ${-l * 0.82} 0 ${-l} C ${-w * 1.05} ${-l * 0.82} ${-w * 1.15} ${-l * 0.22} 0 0 Z`;

// 5 瓣花形 mark：bloom 0 = 闭合竖线（瓣交替指向上/下）→ 1 = 72° 均分；spin = 落定后的极缓自转
const FlowerMark: React.FC<{ bloom: number; inner: number; spin: number; glowK: number }> = ({ bloom, inner, spin, glowK }) => {
  const R = 160; // viewBox 半径
  const b = Math.max(0, bloom);
  return (
    <svg width={R * 2} height={R * 2} viewBox={`${-R} ${-R} ${R * 2} ${R * 2}`} style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id="ifb-petal" cx="0" cy="0" r="150" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={CORAL_DEEP} />
          <stop offset="0.45" stopColor={CORAL} />
          <stop offset="1" stopColor={APRICOT} />
        </radialGradient>
        <radialGradient id="ifb-inner" cx="0" cy="0" r="100" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#b52e1f" />
          <stop offset="1" stopColor={CORAL_DEEP} />
        </radialGradient>
        <radialGradient id="ifb-core" cx="0" cy="0" r="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset="1" stopColor="#ffe2bd" />
        </radialGradient>
      </defs>
      {/* 背后柔光（落定时亮起，只此一处泛光） */}
      <circle r={150} fill={alpha(CORAL, 0.18 * glowK)} style={{ filter: 'blur(40px)' }} />
      {Array.from({ length: 5 }, (_, i) => {
        const final = -90 + i * 72 + spin;
        const start = i % 2 === 0 ? -90 : 90; // 闭合：上下交替，合起来就是一条竖线
        const ang = mix(start, final, b);
        const l = mix(150, 148, b);
        const w = mix(4, 46, Math.min(1.15, b));
        const rad = (ang * Math.PI) / 180;
        return (
          <g key={i} transform={`rotate(${(ang + 90).toFixed(3)})`} opacity={0.94}>
            <path d={petalPath(l, w)} fill="url(#ifb-petal)" />
            {/* 瓣脊高光：一条细亮线，给花瓣厚度 */}
            <path d={`M0 ${-l * 0.12} L0 ${-l * 0.86}`} stroke="rgba(255,240,220,0.35)" strokeWidth={1.6} strokeLinecap="round" />
            {/* 让花瓣边缘有受光差：上半边略亮 */}
            <path d={petalPath(l, w)} fill="none" stroke={`rgba(255,235,210,${(0.25 + 0.2 * Math.cos(rad + Math.PI / 2)).toFixed(3)})`} strokeWidth={1} />
          </g>
        );
      })}
      {/* 内层 5 瓣：错开 36°、晚 4f 张开（跟随），颜色更深，给花形层次 */}
      {Array.from({ length: 5 }, (_, i) => {
        const bi = Math.max(0, inner);
        const final = -54 + i * 72 + spin * 1.6;
        const start = i % 2 === 0 ? 90 : -90;
        const ang = mix(start, final, bi);
        return (
          <path key={`in${i}`} d={petalPath(mix(110, 92, bi), mix(3, 26, Math.min(1.15, bi)))} transform={`rotate(${(ang + 90).toFixed(3)})`}
            fill="url(#ifb-inner)" opacity={0.96} />
        );
      })}
      <circle r={mix(6, 24, Math.min(1, b))} fill="url(#ifb-core)" />
      <circle r={mix(6, 24, Math.min(1, b))} fill="none" stroke="rgba(120,40,20,0.25)" strokeWidth={1.2} />
    </svg>
  );
};

export const IconFlipBloomLogo: React.FC = () => {
  const f = useCurrentFrame();

  // 登场：第 0 帧就有起始态（0.86 倍、半透明、微虚）
  const inP = springAt(f, 0, { damping: 15, stiffness: 150 });
  const inS = mix(0.86, 1, inP);

  // 预备：三次倾斜幅度递增，原点钉底部
  const wobble = interpolate(f, [12, 18, 25, 32, FLIP0], [0, -8, 12, -16, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin),
  });

  // 翻身：rotateY 0→90（加速入）+ 微放大
  const flipAt = (fr: number) => ramp(fr, FLIP0, FLIP1 - FLIP0, (t) => t * t * t);
  const flip = flipAt(f);
  const rotY = 90 * flip;
  const flipS = 1 + 0.06 * ramp(f, FLIP0 - 4, 14, EASE.smooth);
  const showIcon = f < FLIP1;

  // 绽放
  const bloom = f < FLIP1 ? 0 : springAt(f, FLIP1, { damping: 12, stiffness: 120 });
  const inner = f < FLIP1 + 4 ? 0 : springAt(f, FLIP1 + 4, { damping: 13, stiffness: 130 });
  const spin = 6 * ramp(f, 80, 70, EASE.smooth); // 落定后极缓自转
  const glowK = ramp(f, FLIP1 + 8, 24, EASE.out);

  // 竖线与纵向光芒：翻身后半段亮起、最薄帧最亮、绽放开头 10f 衰减
  const lineA = f < FLIP1 ? Math.min(1, Math.max(0, (rotY - 66) / 22)) : 1 - ramp(f, FLIP1, 8, EASE.out); // 只在图标侧到 ~66° 以后出现，盖不到正面
  const flare = f < FLIP1 ? ramp(f, FLIP1 - 1.5, 1.5, EASE.linear) : 1 - ramp(f, FLIP1, 11, EASE.out);

  // 让位：位置先到，缩放晚 3f
  const shift = ramp(f, SHIFT0, 20, EASE.swift);
  const markS = mix(1, 0.84, ramp(f, SHIFT0 + 3, 20, EASE.swift));
  const MARK_DX = -282; // lockup（mark 0.84× + Pollen）整组视觉居中
  const mx = CX + MARK_DX * shift;

  // 接触影 / 光池：图标阶段随晃动偏移，翻身时收窄
  const shadowW = showIcon ? ICON * Math.cos((rotY * Math.PI) / 180) : 0;
  const shadowA = inP * (1 - ramp(f, FLIP1 - 4, 10, EASE.out));

  // 字标（每字由大变小落位，原点钉基线）
  const WORD = 'Pollen';

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.04 }} fill={{ x: 0.12, y: 0.95 }} intensity={0.55} breathe={0.5}>
        <Dust look={L} count={30} seed={11} drift={0.18} opacity={0.4} />
      </Stage>

      {/* 主体容器：落定段极缓推近 2.5%（hold 段画面仍在呼吸，不加抖动） */}
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${(1 + 0.025 * ramp(f, 84, 66, EASE.smooth)).toFixed(5)})`, transformOrigin: `${CX}px ${CY + 60}px` }}>
      {/* 地面光池（随 mark 让位一起左移，落定后变成 lockup 底下的暖光） */}
      <div style={{
        position: 'absolute', left: mix(CX, CX - 20, shift) - 520, top: CY + 175, width: 1040, height: 150, borderRadius: '50%',
        background: `radial-gradient(ellipse at center, ${alpha(APRICOT, 0.07 + 0.07 * glowK)} 0%, ${alpha(APRICOT, 0)} 70%)`,
      }} />
      {/* 图标接触影 */}
      <div style={{
        position: 'absolute', left: CX - shadowW * 0.55 + wobble * 2.4, top: CY + ICON / 2 + 14, width: shadowW * 1.1, height: 34, borderRadius: '50%',
        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 70%)', opacity: shadowA,
      }} />

      {/* 图标（3D 翻身） */}
      {showIcon && (
        <div style={{ position: 'absolute', left: CX - ICON / 2, top: CY - ICON / 2, width: ICON, height: ICON, perspective: 1300 }}>
          {flip > 0.05 && [14, 28].map((lag, i) => (
            <div key={lag} style={{
              position: 'absolute', inset: 0, opacity: (0.22 - i * 0.09) * Math.min(1, flip * 3),
              transform: `scale(${flipS}) rotateY(${Math.max(0, rotY - lag)}deg)`, filter: 'blur(5px)',
            }}>
              <AppIcon />
            </div>
          ))}
          <div style={{
            position: 'absolute', inset: 0,
            opacity: Math.min(1, 0.35 + inP), filter: inP < 0.9 ? `blur(${((0.9 - inP) * 10).toFixed(2)}px)` : undefined,
            transformOrigin: '50% 92%',
            transform: `scale(${(inS * flipS).toFixed(4)}) rotate(${wobble.toFixed(3)}deg) rotateY(${rotY.toFixed(3)}deg)`,
          }}>
            <AppIcon />
          </div>
        </div>
      )}

      {/* 最薄帧的竖线 + 纵向光芒 */}
      {lineA > 0.01 && (
        <div style={{ position: 'absolute', left: CX, top: CY, width: 0, height: 0 }}>
          <div style={{
            position: 'absolute', left: -3, top: -150, width: 6, height: 300, borderRadius: 3,
            background: `linear-gradient(180deg, ${APRICOT} 0%, #fff5e8 50%, ${CORAL} 100%)`,
            opacity: lineA, boxShadow: `0 0 18px ${alpha(APRICOT, 0.8)}, 0 0 50px ${alpha(CORAL, 0.5)}`,
          }} />
          <div style={{
            position: 'absolute', left: -60, top: -460, width: 120, height: 920, opacity: flare,
            background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha('#fff3e2', 0.55)} 0%, ${alpha(APRICOT, 0.18)} 35%, ${alpha(APRICOT, 0)} 70%)`,
          }} />
          <div style={{
            position: 'absolute', left: -260, top: -10, width: 520, height: 20, opacity: flare * 0.6,
            background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha('#fff3e2', 0.6)} 0%, ${alpha(APRICOT, 0)} 70%)`,
          }} />
        </div>
      )}

      {/* 花形 mark */}
      {!showIcon && (
        <div style={{
          position: 'absolute', left: mx - 160, top: CY - 160, width: 320, height: 320,
          transform: `scale(${markS.toFixed(4)})`,
        }}>
          <FlowerMark bloom={bloom} inner={inner} spin={spin} glowK={glowK} />
        </div>
      )}

      {/* wordmark：逐字由大变小落位（大时虚、落位实） */}
      <div style={{
        position: 'absolute', left: mx + 150, top: CY, transform: 'translateY(-56%)',
        display: 'flex', ...type(200, 680), letterSpacing: '-0.045em', color: L.ink,
      }}>
        {Array.from(WORD).map((ch, i) => {
          const st = WORD0 + i * 2.6;
          const t = ramp(f, st, 13, EASE.snappy);
          const op = ramp(f, st, 5, EASE.out);
          return (
            <span key={i} style={{
              display: 'inline-block', opacity: op, transformOrigin: '50% 80%',
              transform: `scale(${(1.9 - 0.9 * t).toFixed(4)})`,
              filter: t < 0.995 ? `blur(${((1 - t) * 14).toFixed(2)}px)` : undefined,
            }}>{ch}</span>
          );
        })}
      </div>

      {/* 口号 */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: CY + 190, textAlign: 'center', ...type(46, 450), color: L.ink2 }}>
        <TextReveal text="Ask anything. Watch it bloom." by="word" variant="rise" start={TAG0} each={16} gap={3} ease={EASE.out} />
      </div>
      </div>
    </AbsoluteFill>
  );
};
