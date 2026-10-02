// gradient-transition — 背景在 linear → radial → conic 三类 CSS 渐变间平滑过渡：
// 同类型内逐参数插值（角度 / 色标 / 中心 / 半径 / 起始角），跨类型用窄交叉淡化换类型不换气。
//
// 第二轮重设计（极光紫 · 发布会片头）：
// - look = aurora（紫粉暗场）。渐变就是主视觉——前景只有一组大字排版，节奏跟着渐变类型换拍：
//   「Bend light.」（linear：角度扫过）→「Focus it.」（radial：光斑对角游走并聚焦）→「Prism」字标（conic：三色环旋转）。
//   每段文案的动词正好描述该段渐变的参数运动，文案即手法。
// - 色彩：不再是七色彩虹——三段都在同一组紫 / 品红 / 冰蓝里取色，外圈压暗（radial 段光斑成立的前提，
//   也给白字留对比）；conic 改成 A→B→C→A 三色环，圆心放在字标右后方并在小画布上预模糊，抹掉尖点。
// - 性能：三层渐变画在 480×270 小画布上再 transform 放大 4×（合成期放大天然柔化，模糊在小画布上做，
//   每帧代价是全屏实时模糊的 1/16），上面叠颗粒防 h264 色带。
// - 底部一条技术注记：左侧实时读出正在插值的渐变参数（mono），右侧段号——给观众看"这是参数在动"。
//
// 时间表（30fps，共 200f）：
//   0–68    linear：角度 18°→198°（swift in-out），三档明度色标 HSL 三通道插值；6–26f「Bend light.」逐词升起
//   56–68   交叉淡化 linear → radial（12f），两层都在动
//   56–132  radial：圆心 (24%,72%) → (68%,38%) 对角游走、半径 48%→80% 扩张；52–62f 旧句虚化上飘，66–86f「Focus it.」
//   118–132 交叉淡化 radial → conic（14f）
//   118–200 conic：起始角 0→250° 旋转（ease-out 长尾，越转越慢落定）；114–124f 旧句退场，
//           128–150f 字标「Prism」字距收拢入场，140–160f 副标题；160–200f hold
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, Grain, bezier, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, TYPE, TextReveal, alpha, type } from '../../_fixtures/Look';

export const GRADIENT_TRANSITION_DURATION = 200;

const L = LOOKS.aurora;

type H3 = [number, number, number];
const hsl = ([h, s, l]: H3, a = 1) => `hsla(${h.toFixed(1)},${s.toFixed(1)}%,${l.toFixed(1)}%,${a})`;
// HSL 三通道独立插值（比 RGB 不发灰）
const mixH = (a: H3, b: H3, k: number): H3 => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];

// 小画布：渐变在 480×270 上画，放大 4× 铺满
const SW = 480, SH = 270;
const SLOW = bezier(0.45, 0, 0.2, 1);

const layer = (background: string, opacity: number, extra?: React.CSSProperties): React.CSSProperties => ({
  position: 'absolute', inset: 0, background, opacity, ...extra,
});

export const GradientTransition: React.FC = () => {
  const f = useCurrentFrame();

  // ── linear：角度扫过 + 色标漂移 ──
  const p1 = ramp(f, 0, 68, EASE.swift);
  const ang = mix(18, 198, p1);
  const l1a = mixH([300, 86, 64], [330, 88, 66], p1);
  const l1b = mixH([268, 76, 40], [250, 78, 44], p1);
  const l1c: H3 = [250, 62, 7];
  // 色标拉开明度（64 → 40 → 7），角度扫过时亮带的走向一眼可见
  const bg1 =
    `radial-gradient(ellipse 60% 70% at ${mix(18, 70, p1).toFixed(1)}% ${mix(10, 22, p1).toFixed(1)}%, ${hsl(l1a, 0.3)}, ${hsl(l1a, 0)} 70%), ` +
    `linear-gradient(${ang.toFixed(2)}deg, ${hsl(l1a)} 0%, ${hsl(l1b)} 34%, ${hsl(l1c)} 78%, ${hsl(l1c)} 100%)`;

  // ── radial：圆心对角游走 + 半径扩张（px 半径，CSS circle 半径只接受长度） ──
  const p2 = ramp(f, 56, 76, EASE.swift);
  const rcx = mix(24, 68, p2), rcy = mix(72, 38, p2), rr = mix(48, 80, p2);
  const core = mixH([326, 92, 72], [282, 88, 70], p2);
  const mid = mixH([292, 72, 38], [256, 74, 36], p2);
  const rpx = (rr / 100) * SW;
  const bg2 =
    `radial-gradient(circle ${rpx.toFixed(1)}px at ${rcx.toFixed(2)}% ${rcy.toFixed(2)}%, ${hsl(core)} 0%, ${hsl(mid)} 36%, ${hsl([250, 62, 8])} 100%)`;

  // ── conic：三色环 A→B→C→A 旋转，圆心在字标右后方 ──
  const p3 = ramp(f, 118, 82, SLOW);
  const from = mix(0, 250, p3);
  const bg3 =
    `conic-gradient(from ${from.toFixed(2)}deg at 64% 54%, hsl(262,84%,60%), hsl(322,86%,64%), hsl(205,90%,68%), hsl(262,84%,60%))`;

  // 交叉淡化权重（窄窗）
  const x12 = ramp(f, 56, 12, EASE.smooth);
  const x23 = ramp(f, 118, 14, EASE.smooth);
  const w1 = 1 - x12;
  const w2 = x12 - x23;
  const w3 = x23;

  // 参数读数（底部注记）
  const phase = f < 62 ? 0 : f < 125 ? 1 : 2;
  const readout = [
    `linear-gradient(${Math.round(ang)}deg, …)`,
    `radial-gradient(circle ${Math.round(rr)}% at ${Math.round(rcx)}% ${Math.round(rcy)}%)`,
    `conic-gradient(from ${Math.round(from)}deg at 64% 54%)`,
  ][phase];

  // 字标「Prism」字距收拢
  const markP = ramp(f, 128, 26, EASE.snappy);
  const subP = ramp(f, 142, 20, EASE.snappy);

  return (
    <AbsoluteFill style={{ background: L.bg[2], overflow: 'hidden' }}>
      {/* 背景三层：小画布作画、放大 4× */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: SW, height: SH, transform: `scale(${1920 / SW})`, transformOrigin: '0 0' }}>
        <div style={layer(bg1, w1)} />
        <div style={layer(bg2, w2)} />
        {w3 > 0.001 && (
          <div style={{ position: 'absolute', inset: 0, opacity: w3 }}>
            {/* 外扩再模糊：抹掉环心尖点与色标硬带，边缘不露黑 */}
            <div style={layer(bg3, 1, { inset: -14, filter: 'blur(9px)' })} />
            {/* 外圈压暗 + 左侧压暗，给白字留对比 */}
            <div style={layer(`radial-gradient(ellipse 62% 78% at 64% 54%, rgba(8,5,18,0) 18%, rgba(8,5,18,0.55) 64%, rgba(8,5,18,0.92) 100%)`, 1)} />
            <div style={layer(`linear-gradient(90deg, rgba(8,5,18,0.55) 0%, rgba(8,5,18,0) 46%)`, 1)} />
          </div>
        )}
      </div>
      {/* 前两段同样给左侧文字区一层压暗 */}
      <div style={layer(`linear-gradient(90deg, rgba(8,5,18,0.42) 0%, rgba(8,5,18,0) 55%)`, 1 - w3)} />
      <div style={layer(`radial-gradient(ellipse 80% 80% at 50% 50%, rgba(6,4,14,0) 55%, rgba(6,4,14,0.55) 100%)`, 1)} />
      <Grain opacity={0.1} blend="soft-light" />

      {/* 前景：每段一句，动词描述该段渐变的参数运动 */}
      <div style={{ position: 'absolute', left: 160, top: 404, ...type(TYPE.display, 760), color: L.ink, textShadow: `0 10px 50px ${alpha('#05020c', 0.35)}` }}>
        {f < 66 && <TextReveal text="Bend light." by="word" variant="blur" start={6} each={20} gap={5} out={{ start: 52, dur: 12 }} />}
      </div>
      <div style={{ position: 'absolute', left: 160, top: 404, ...type(TYPE.display, 760), color: L.ink, textShadow: `0 10px 50px ${alpha('#05020c', 0.35)}` }}>
        {f >= 62 && f < 128 && <TextReveal text="Focus it." by="word" variant="blur" start={66} each={20} gap={5} out={{ start: 114, dur: 12 }} />}
      </div>
      {f >= 124 && (
        <div style={{ position: 'absolute', left: 160, top: 300 }}>
          <div style={{ ...type(TYPE.label, 700, { caps: true }), letterSpacing: '0.3em', color: alpha(L.ink, 0.75), opacity: ramp(f, 124, 16, EASE.out) }}>
            Introducing
          </div>
          <div style={{
            ...type(TYPE.mega, 760), color: L.ink, marginTop: 18,
            letterSpacing: `${mix(0.12, -0.045, markP).toFixed(4)}em`, opacity: ramp(f, 128, 12, EASE.out),
            filter: markP < 0.98 ? `blur(${((1 - markP) * 14).toFixed(2)}px)` : undefined,
            textShadow: `0 12px 60px ${alpha('#05020c', 0.4)}`,
          }}>
            Prism
          </div>
          <div style={{
            ...type(TYPE.h3, 500), color: alpha(L.ink, 0.82), marginTop: 26,
            opacity: subP, transform: `translateY(${((1 - subP) * 18).toFixed(2)}px)`,
          }}>
            The color engine for motion.
          </div>
        </div>
      )}

      {/* 底部技术注记：实时参数 + 段号 */}
      <div style={{ position: 'absolute', left: 160, right: 160, bottom: 96, opacity: ramp(f, 0, 16, EASE.out) }}>
        <div style={{ height: 1.5, background: alpha(L.ink, 0.18) }} />
        <div style={{ display: 'flex', marginTop: 22, alignItems: 'baseline' }}>
          <div style={{ ...type(30, 500, { mono: true }), color: alpha(L.ink, 0.7) }}>{readout}</div>
          <div style={{ marginLeft: 'auto', ...type(30, 600, { mono: true }), color: alpha(L.ink, 0.7) }}>
            <span style={{ color: L.ink }}>{String(phase + 1).padStart(2, '0')}</span> / 03
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
