// cloner-depth-echo —— 克隆纵队（第二轮重设计 · 酸柠暗场 · 边缘部署）
// 手法不变：一张主卡"复印"出 7 个克隆体沿纵深等距排开成队 → 停一拍让观众数清 → 全体同步加速吸回本体 → 合体弹一下。
//
// 设计决定
// - look = lime（石墨黑 + 荧光黄绿）。主角是一张 video-shotcraft 渲染卡「launch-film」（顶栏 video-shotcraft 标志）：
//   大号 30fps 读数 + 柠檬绿折线 + 底部 8 个镜头位。语义从"多副本"落到具体卖点：一句提示词 = 8 个镜头同时出片。
// - 纵深：真 3D 透视（perspective 1500），消失点放在左上——克隆体只做 translateZ 后退就自动排向左上，
//   再叠一点 dx/dy 让纵队张开；越远越淡、越虚、越"只剩轮廓"（填充褪掉、柠檬绿描边留下），像 C4D Cloner 的线框回声。
//   每个克隆体顶栏换成它自己的镜头号（S02 / S03 …）——同一配方、不同镜头。
// - 版式：主卡右侧中位（占画宽 ~36%），纵队伸向左上；左下是全片的计数器「×8」（260px 柠檬绿 tabular），
//   克隆每弹出一个它就滚一格；合体后左上空出的位置升起标题「One prompt. / Eight shots.」，尾帧是一张海报。
// - 合体：8 个镜头位在吸回到达的同一帧全部点亮（克隆"回到"本体里），主卡 1→1.06→1 单脉冲 + 一次柠檬绿描边光（Q4 只给主角一次）。
//
// 时间表（30fps，共 138f）
//   0–16    入场：主卡自下 40px 升起 + 由虚到实（snappy），卡内内容 2f 错峰；计数器 ×1 已在左下
//   16–24   预备：主卡按压到 0.96、描边提亮（"复印键按下"）
//   24–44   排开：7 个克隆 spring 错峰 2.2f/个弹向纵深（damping 15，一次轻过冲），每弹出一个计数 +1，顶栏镜头号同时浮现
//   44–76   停 32f：相机极缓推近 2%、纵队整体轻微视差漂移——数得清"有很多个"
//   76–86   吸回 10f：全体同步强 ease-in（越来越快），沿纵深方向按速度加拖影模糊
//   86–104  合体：镜头位全亮、主卡单脉冲 1.06、描边光一次；计数器同帧一记缩放回弹
//   92–118  标题逐词从线下升起（左上），副行淡入
//   118–138 hold 20f：光的呼吸 + 0.6% 极缓推近，干净落定
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, Dust, TextReveal, alpha, glow, springAt, type } from '../../_fixtures/Look';
import { ShotcraftMark } from '../../_fixtures/Brand';

export const CLONER_DEPTH_ECHO_DURATION = 138;

const L = LOOKS.lime;
const N = 7; // 克隆数
const GAP_Z = 250; // 相邻克隆的纵深间隔（px）
const SPREAD = 24; // 排开起始帧
const EACH = 2.2; // 克隆错峰（帧/个）
const MERGE = 76; // 吸回起始帧
const MERGE_DUR = 10;
const LAND = MERGE + MERGE_DUR; // 合体帧 86

// 主卡几何（屏幕 px，z=0 平面）
const CW = 660;
const CH = 420;
const CX = 1130; // 左上角
const CY = 352;
// 透视：消失点在左上，克隆体后退即排向左上
const PERSP = 1500;
const VP = { x: 360, y: 120 };

const TYPE_H1 = 112; // 标题字号（h1 档略收，两行放进左上空位）

const REGIONS = ['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08']; // 镜头号（沿用原变量名）
const SPARK = [0.62, 0.58, 0.66, 0.52, 0.55, 0.44, 0.48, 0.36, 0.4, 0.3, 0.33, 0.26, 0.3, 0.22];

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

// 第 idx（1..N）个克隆的排开进度：物理弹簧，错峰 EACH 帧
const spreadOf = (f: number, idx: number) => (f < SPREAD + (idx - 1) * EACH ? 0 : springAt(f, SPREAD + (idx - 1) * EACH, { damping: 15, stiffness: 150, mass: 0.9 }));
// 吸回：全体同步强 ease-in
const mergeOf = (f: number) => ramp(f, MERGE, MERGE_DUR, EASE.exit);
// 克隆的纵深位置（0 = 本体平面，1 = 排开位）
const depthOf = (f: number, idx: number) => spreadOf(f, idx) * (1 - mergeOf(f));

// ───────────── 实例卡 ─────────────
const InstanceCard: React.FC<{ region: string; clone: number; lit: number; frame: number; inP: number }> = ({ region, clone, lit, frame, inP }) => {
  // clone: 0 = 本体，>0 越大越远 —— 越远填充越淡、只剩轮廓
  const c = clone / N;
  const fill = clone === 0 ? 1 : mix(0.55, 0.06, c);
  const rise = (k: number) => {
    const p = clone === 0 ? ramp(frame, 4 + k * 2, 14, EASE.snappy) : 1;
    return { opacity: p * inP + (1 - inP) * 0, transform: `translateY(${((1 - p) * 16).toFixed(2)}px)` };
  };
  const pts = SPARK.map((v, i) => `${(i / (SPARK.length - 1)) * 576},${(v * 120).toFixed(1)}`).join(' ');
  return (
    <div
      style={{
        position: 'absolute', inset: 0, borderRadius: 30, overflow: 'hidden',
        background: `linear-gradient(160deg, ${alpha('#20241a', fill)} 0%, ${alpha(L.surface, fill)} 60%, ${alpha('#0f110c', fill)} 100%)`,
        border: `1.5px solid ${clone === 0 ? alpha('#ffffff', 0.12) : alpha(L.accent, mix(0.55, 0.85, c))}`,
        boxShadow: clone === 0
          ? `inset 0 1px 0 ${alpha('#ffffff', 0.1)}, 0 40px 90px -30px ${alpha('#000000', 0.9)}, 0 12px 30px ${alpha('#000000', 0.5)}`
          : `0 0 ${(18 + 20 * c).toFixed(0)}px ${alpha(L.accent, 0.12 + 0.1 * c)}`,
        fontFamily: FONT.sans, color: L.ink,
      }}
    >
      {/* 卡面顶部受光：一道很淡的柠檬绿内光（只本体） */}
      {clone === 0 && (
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 70% 50% at 30% 0%, ${alpha(L.accent, 0.1)} 0%, transparent 70%)` }} />
      )}
      <div style={{ position: 'absolute', left: 42, right: 42, top: 36, display: 'flex', alignItems: 'center', gap: 14, ...rise(0) }}>
        {/* video-shotcraft 标志（暗底反白版）；克隆体上随卡一起变淡 */}
        <ShotcraftMark size={34} tone="dark" style={{ margin: '-4px 0' }} />
        <div style={{ ...type(32, 600, { mono: true }), color: clone === 0 ? L.ink : alpha(L.ink, 0.85) }}>launch-film</div>
        <div style={{ flex: 1 }} />
        <div
          style={{
            ...type(26, 700, { mono: true }), height: 44, padding: '0 16px', borderRadius: 22, display: 'flex', alignItems: 'center',
            background: clone === 0 ? L.accent : alpha(L.accent, 0.14), color: clone === 0 ? L.onAccent : L.accent,
            border: clone === 0 ? 'none' : `1.5px solid ${alpha(L.accent, 0.6)}`,
          }}
        >
          {region}
        </div>
      </div>
      {/* 读数：30fps 出片 —— 克隆体上降成轮廓字（纹理），只有本体是实心 */}
      <div style={{ position: 'absolute', left: 40, top: 104, display: clone === 0 ? 'flex' : 'none', alignItems: 'baseline', gap: 16, ...rise(1) }}>
        <div
          style={{
            ...type(132, 750), letterSpacing: '-0.05em',
            color: clone === 0 ? L.ink : 'transparent',
            WebkitTextStroke: clone === 0 ? undefined : `1.5px ${alpha(L.accent, 0.7)}`,
          }}
        >
          30<span style={{ fontSize: 72, letterSpacing: '-0.02em', color: clone === 0 ? L.ink2 : 'transparent' }}>fps</span>
        </div>
        <div style={{ ...type(26, 500, { caps: true }), color: L.ink3, letterSpacing: '0.12em', opacity: clone === 0 ? 1 : 0 }}>1080p</div>
      </div>
      {/* 折线 */}
      <svg width={576} height={130} style={{ position: 'absolute', left: 42, top: 246, overflow: 'visible', ...rise(2) }}>
        {clone === 0 && (
          <polygon points={`0,130 ${pts} 576,130`} fill={`url(#cdeFill)`} opacity={0.9} />
        )}
        <defs>
          <linearGradient id="cdeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={L.accent} stopOpacity={0.22} />
            <stop offset="1" stopColor={L.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <polyline points={pts} fill="none" stroke={L.accent} strokeWidth={clone === 0 ? 4 : 2.5} strokeLinejoin="round" strokeLinecap="round" opacity={clone === 0 ? 1 : 0.8} />
      </svg>
      {/* 镜头位：本体底部 8 格，合体时全部点亮 */}
      {clone === 0 && (
        <div style={{ position: 'absolute', left: 42, right: 42, bottom: 30, display: 'flex', gap: 8, ...rise(3) }}>
          {REGIONS.map((r, i) => {
            const on = i === 0 ? 1 : lit;
            return (
              <div
                key={r}
                style={{
                  flex: 1, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  ...type(18, 600, { mono: true }),
                  background: alpha(L.accent, 0.06 + 0.84 * on),
                  color: on > 0.5 ? L.onAccent : L.ink3,
                  border: `1px solid ${alpha(L.accent, 0.18 + 0.5 * on)}`,
                }}
              >
                {r}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ───────────── 计数器：每一格从下滚上来 ─────────────
const Counter: React.FC<{ value: number; tickAge: number; punch: number }> = ({ value, tickAge, punch }) => {
  // tickAge：距上一次 +1 过了几帧（滚动 5f）；punch：合体回弹 0..1..0
  const roll = ramp(tickAge, 0, 5, EASE.snappy);
  const size = 260;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', transform: `scale(${(1 + 0.06 * punch).toFixed(4)})`, transformOrigin: '0% 70%' }}>
      <span style={{ ...type(size * 0.62, 500), color: alpha(L.accent, 0.55), marginTop: size * 0.2, marginRight: 8 }}>×</span>
      {/* 不用 overflow 裁切（会把泛光裁出方框）：出场格上移淡出、入场格自下升起淡入 */}
      <div style={{ position: 'relative', height: size * 1.02, width: size * 0.62 }}>
        {[value - 1, value].map((v, k) => {
          if (v < 1) return null;
          const y = k === 0 ? -roll * 45 : (1 - roll) * 45;
          // 滚动中两格都按速度竖向虚化（静止为 0）
          const spd = roll < 1 ? 1 - roll : 0;
          return (
            <div
              key={k}
              style={{
                position: 'absolute', left: 0, top: 0, ...type(size, 800), letterSpacing: '-0.04em', color: L.accent,
                transform: `translateY(${y.toFixed(2)}%)`, textShadow: glow(L.accent, 0.35 + 0.5 * punch),
                opacity: k === 0 ? clamp01(1 - roll * 1.6) : clamp01(roll * 1.6),
                filter: spd > 0.05 ? `blur(${(spd * 6).toFixed(2)}px)` : undefined,
              }}
            >
              {v}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const ClonerDepthEcho: React.FC = () => {
  const frame = useCurrentFrame();

  // 主卡入场 / 预备按压 / 合体脉冲
  const enter = ramp(frame, 0, 16, EASE.snappy);
  const press = ramp(frame, 16, 8, EASE.swift) * (1 - ramp(frame, SPREAD, 10, EASE.overshoot));
  const popT = clamp01((frame - LAND) / 16);
  const pop = frame >= LAND ? Math.sin(popT * Math.PI) * Math.pow(1 - popT, 0.6) : 0;
  const heroScale = (1 - 0.04 * press) * (1 + 0.06 * pop) * mix(0.94, 1, enter);
  const rimFlash = frame >= LAND ? Math.max(0, 1 - (frame - LAND) / 14) : 0;
  const lit = ramp(frame, LAND - 1, 5, EASE.snappy);

  // 计数：每个克隆弹出过 30% 就 +1；记录最近一次 +1 的帧给滚动用
  let count = 1;
  let lastTick = -99;
  for (let idx = 1; idx <= N; idx++) {
    const f0 = SPREAD + (idx - 1) * EACH + 2;
    if (frame >= f0) { count++; lastTick = f0; }
  }
  const counterPunch = frame >= LAND ? Math.sin(clamp01((frame - LAND) / 12) * Math.PI) : 0;

  // 相机：停留段极缓推近；合体后再极缓推进；纵队在停留段轻微视差漂移
  const dolly = 1 + 0.02 * ramp(frame, 40, 40, EASE.smooth) + 0.006 * ramp(frame, 100, 38, EASE.smooth);
  const drift = 14 * ramp(frame, 40, 40, EASE.smooth) * (1 - mergeOf(frame));

  // 标题 & 计数器标签
  const labelIn = ramp(frame, 6, 16, EASE.out);

  return (
    <AbsoluteFill style={{ fontFamily: FONT.sans, overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.62, y: 0.42 }} fill={{ x: 0.1, y: 0.95 }} breathe={0.6} intensity={0.45}>
        <Dust look={L} count={26} seed={5} drift={0.18} opacity={0.35} color={L.accent} />
        {/* 主卡脚下的柠檬绿地光 */}
        <div
          style={{
            position: 'absolute', left: CX - 160, top: CY + CH - 40, width: CW + 320, height: 220,
            background: `radial-gradient(ellipse 50% 50% at 50% 40%, ${alpha(L.accent, 0.14 + 0.12 * rimFlash)} 0%, transparent 70%)`,
            opacity: enter,
          }}
        />
      </Stage>

      {/* 相机层：推近以主卡中心为锚 */}
      <AbsoluteFill style={{ transform: `scale(${dolly.toFixed(5)})`, transformOrigin: `${CX + CW / 2}px ${CY + CH / 2}px` }}>
        <AbsoluteFill style={{ perspective: PERSP, perspectiveOrigin: `${VP.x}px ${VP.y}px` }}>
          <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d' }}>
            {/* 克隆纵队：从远到近渲染，遮挡正确 */}
            {Array.from({ length: N }, (_, k) => N - k).map((idx) => {
              const d = depthOf(frame, idx);
              const sp = spreadOf(frame, idx);
              const op = (1 - (idx / N) * 0.72) * clamp01(sp * 2.5) * (1 - mergeOf(frame) * 0.4);
              if (op <= 0.005 || d <= 0.002) return null;
              const z = -GAP_Z * idx * d;
              const dx = (-58 * idx - drift * idx * 0.4) * d;
              const dy = -6 * idx * d;
              // 速度 → 拖影模糊（沿纵深的屏幕方向，近似用各向同性小模糊 + 方向拉伸）
              const v = Math.abs(depthOf(frame + 0.5, idx) - depthOf(frame - 0.5, idx)) * GAP_Z * idx;
              const blur = Math.min(10, v * 0.06);
              // 出生闪：弹出的前 8 帧描边更亮（一次复印的"啪"）
              const born = clamp01(1 - (frame - (SPREAD + (idx - 1) * EACH)) / 8);
              return (
                <div
                  key={idx}
                  style={{
                    position: 'absolute', left: CX, top: CY, width: CW, height: CH,
                    transform: `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, ${z.toFixed(2)}px)`,
                    opacity: op,
                    filter: `blur(${(blur + (idx / N) * 1.6).toFixed(2)}px)${born > 0 ? ` drop-shadow(0 0 ${(14 * born).toFixed(1)}px ${alpha(L.accent, 0.7 * born)})` : ''}`,
                  }}
                >
                  <InstanceCard region={REGIONS[idx]} clone={idx} lit={0} frame={frame} inP={1} />
                </div>
              );
            })}

            {/* 本体 */}
            <div
              style={{
                position: 'absolute', left: CX, top: CY, width: CW, height: CH,
                transform: `translate3d(0px, ${((1 - enter) * 40).toFixed(2)}px, 0px) scale(${heroScale.toFixed(4)})`,
                opacity: clamp01(enter * 1.4),
                filter: enter < 1 ? `blur(${((1 - enter) * 10).toFixed(2)}px)` : undefined,
              }}
            >
              <InstanceCard region={REGIONS[0]} clone={0} lit={lit} frame={frame} inP={1} />
              {/* 合体描边光（一次，裁在圆角里） */}
              <div
                style={{
                  position: 'absolute', inset: 0, borderRadius: 30, pointerEvents: 'none',
                  border: `2px solid ${alpha(L.accent, 0.25 * press + 0.9 * rimFlash)}`,
                  boxShadow: `0 0 ${(50 * rimFlash).toFixed(1)}px ${alpha(L.accent, 0.45 * rimFlash)}, inset 0 0 ${(40 * rimFlash).toFixed(1)}px ${alpha(L.accent, 0.18 * rimFlash)}`,
                }}
              />
            </div>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

      {/* 左上：合体后升起的标题 */}
      <div style={{ position: 'absolute', left: 140, top: 168, ...type(TYPE_H1, 780), color: L.ink }}>
        <TextReveal text={'One prompt.'} by="word" variant="rise" start={92} each={16} gap={4} />
        <br />
        <TextReveal text={'Eight shots.'} by="word" variant="rise" start={98} each={16} gap={4} unitStyle={(i) => (i === 1 ? { color: L.accent } : {})} />
      </div>

      {/* 左下：计数器 */}
      <div style={{ position: 'absolute', left: 128, top: 622, opacity: labelIn, transform: `translateY(${((1 - labelIn) * 20).toFixed(2)}px)` }}>
        <Counter value={count} tickAge={frame - lastTick} punch={counterPunch} />
      </div>
      <div
        style={{
          position: 'absolute', left: 140, top: 900, display: 'flex', alignItems: 'center', gap: 16,
          opacity: labelIn, ...type(32, 600, { mono: true }), color: L.ink2, letterSpacing: '0.04em',
        }}
      >
        <span style={{ width: 40, height: 2, background: L.accent }} />
        {count === 1 ? 'shot rendered' : 'shots rendered · one prompt'}
      </div>
    </AbsoluteFill>
  );
};

