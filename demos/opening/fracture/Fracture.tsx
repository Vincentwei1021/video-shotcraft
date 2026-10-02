// fracture — 碎片聚合：5×5 瓦片从 3D 碎片态按中心波纹逐圈聚合成整面海报，停一拍点亮，
// 随后全部碎片背离中心加速旋转飞出画面。正放 = 开场、只取后半 = 转场。
//
// 第二轮重设计（石墨 · 日蚀金边 · 有厚度的实体瓦片）：
// - look = graphite（近单色暗场，暖金只给日蚀金边与眉题）。海报是一张 1440×810（占画宽 75%）的发布会主视觉：
//   石墨底上一枚日蚀——暗盘 + 金白色细边 + 右上一颗"钻石环"亮点与横向光带，下方 160px 字标「Mosaic」、
//   眉题 INTRODUCING、副标「Every piece, in place.」。25 块瓦片切的是这同一张海报。
// - 瓦片是有 16px 厚度的实体（正面海报切片 + 背面 + 四条侧边，同一个 3D 渲染上下文）：按旋转矩阵算每个面的
//   法线，对左上前方主光做 Lambert 明暗——翻滚时侧边被光扫亮成暖金色、背光面压暗，读作一块块真正的石板。
// - 聚合：碎片从景深里（z −300…−1800）飞回，按曼哈顿距离从中心向外波纹就位（每环 6.5f），
//   bezier(0.33,0,0.15,1)：飞得快、入槽前长减速；落位后一次 ≤2.5° 的阻尼小摆 = "咔哒"。
// - 点亮：最后一块落位时日蚀金边由暗转亮、钻石环闪一下，字标逐字从线下升起；hold 段一次扫光（Q4）。
// - 飞散：中心先走，每块背离中心 + 冲向镜头（z +400…+1000）+ 大角度翻滚，EASE.exit 加速出画（不淡出）；
//   碎片清空后露出底下的落版：金边小标 + 字标 + 上市日期——结尾帧是一张干净的海报。
//
// 时间表（30fps，共 180f）：
//   0–4     碎片态（第 1 帧即有暗处的碎片）
//   4–70    聚合：中心 → 四角波纹（末块 ~70f 落位），飞行段包 CameraMotionBlur
//   64–92   点亮：金边升亮 + 钻石环闪、字标逐字升起（74f 起）、副标（86f 起）
//   92–118  hold（96–122 扫光一次）
//   118–152 飞散：中心先走，每环 +2.2f，26f ease-in 出画
//   140–162 落版逐行升起；162–180 hold
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { CameraMotionBlur } from '@remotion/motion-blur';
import { EASE, FONT, Grain, bezier, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, SERIF, Stage, TextReveal, alpha } from '../../_fixtures/Look';

export const FRACTURE_DURATION = 180;

const L = LOOKS.graphite;
const GOLD = L.accent2; // #e4c58a
const N = 5;
const PW = 1440, PH = 810;
const TW = PW / N, TH = PH / N; // 288 × 162
const SEAM = 4; // 拼缝：拼齐后仍看得出是石板
const D = 16; // 瓦片厚度
const PERSP = 1800;
const EXIT = 118;

// 聚合曲线：飞得快、入槽前长减速
const landEase = bezier(0.33, 0, 0.15, 1);

const rand = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const TILES = Array.from({ length: N * N }, (_, i) => {
  const r = Math.floor(i / N);
  const c = i % N;
  const q = (k: number) => rand(i * 17.3 + k);
  const d = Math.abs(r - 2) + Math.abs(c - 2);
  const ang = r === 2 && c === 2 ? q(1) * Math.PI * 2 : Math.atan2(r - 2 + (q(2) - 0.5) * 0.7, c - 2 + (q(3) - 0.5) * 0.7);
  const sgn = (k: number) => (q(k) < 0.5 ? -1 : 1);
  return {
    r, c, d,
    // 碎片态
    dx: (q(4) - 0.5) * 2300, dy: (q(5) - 0.5) * 1300, dz: -300 - q(6) * 1500,
    rx: (q(7) - 0.5) * 400, ry: (q(8) - 0.5) * 400, rz: (q(9) - 0.5) * 220,
    start: 4 + d * 6.5 + q(10) * 3,
    wob: sgn(11),
    // 飞散
    ex: Math.cos(ang) * (1300 + q(12) * 500), ey: Math.sin(ang) * (900 + q(13) * 400), ez: 400 + q(14) * 600,
    erx: sgn(15) * (90 + q(16) * 150), ery: sgn(17) * (90 + q(18) * 150), erz: sgn(19) * (40 + q(20) * 120),
    exitAt: EXIT + d * 2.2 + q(21) * 2,
  };
});
const LAND = 36; // 每块聚合时长

// ───────────── 光照（CSS 旋转矩阵 → 面法线 → Lambert）─────────────
type V3 = [number, number, number];
const rot = (v: V3, rx: number, ry: number, rz: number): V3 => {
  // CSS: transform: rotateX rotateY rotateZ 作用于点 = Rx·Ry·Rz·p
  const a = (rx * Math.PI) / 180, b = (ry * Math.PI) / 180, g = (rz * Math.PI) / 180;
  let [x, y, z] = v;
  [x, y] = [x * Math.cos(g) - y * Math.sin(g), x * Math.sin(g) + y * Math.cos(g)];
  [x, z] = [x * Math.cos(b) + z * Math.sin(b), -x * Math.sin(b) + z * Math.cos(b)];
  [y, z] = [y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
  return [x, y, z];
};
const LIGHT: V3 = (() => {
  const v: V3 = [-0.45, -0.6, 0.66];
  const m = Math.hypot(...v);
  return [v[0] / m, v[1] / m, v[2] / m];
})();
const FRONT_REST = LIGHT[2]; // 正对镜头时正面的受光量
const lambert = (n: V3) => Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
const mixHex = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((k) => parseInt(a.slice(k, k + 2), 16));
  const pb = [1, 3, 5].map((k) => parseInt(b.slice(k, k + 2), 16));
  const k = Math.min(1, Math.max(0, t));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * k)).join(',')})`;
};

// ───────────── 海报主视觉（PW×PH，每块瓦片取自己那一格）─────────────
const EX = 720, EY = 282, ER = 160; // 日蚀圆心 / 半径（占第 0–2 行，金边跨拼缝 = 拼合时最先读出的形）
const DIA = { x: EX + ER * Math.cos(-0.72), y: EY + ER * Math.sin(-0.72) }; // 钻石环亮点

const PosterArt: React.FC<{ frame: number }> = ({ frame }) => {
  const ig = ramp(frame, 62, 26, EASE.out); // 金边点亮
  const flash = ramp(frame, 66, 6, EASE.out) * (1 - ramp(frame, 72, 22, EASE.out)); // 钻石环闪一下
  const breathe = 1 + 0.05 * Math.sin(frame / 14);
  const sheen = ramp(frame, 96, 26, EASE.smooth);
  const rim = 0.22 + 0.78 * ig;
  return (
    <div style={{
      position: 'absolute', left: 0, top: 0, width: PW, height: PH, overflow: 'hidden',
      background: 'radial-gradient(ellipse 80% 70% at 50% 30%, #222327 0%, #141517 55%, #0b0b0d 100%)',
    }}>
      {/* 日冕：金色外晕 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at ${EX}px ${EY}px, ${alpha(GOLD, 0)} ${ER - 2}px, ${alpha('#fff6e2', 0.95 * rim)} ${ER + 1}px, ${alpha(GOLD, 0.55 * rim)} ${ER + 7}px, ${alpha(GOLD, 0.16 * rim * breathe)} ${ER + 70}px, ${alpha(GOLD, 0.05 * rim)} ${ER + 220}px, ${alpha(GOLD, 0)} ${ER + 420}px)`,
      }} />
      {/* 暗盘 */}
      <div style={{
        position: 'absolute', left: EX - ER, top: EY - ER, width: ER * 2, height: ER * 2, borderRadius: '50%',
        background: 'radial-gradient(circle at 38% 34%, #17181b 0%, #0a0a0c 62%, #060607 100%)',
      }} />
      {/* 钻石环：亮点 + 横向光带 */}
      <div style={{
        position: 'absolute', left: DIA.x - 90, top: DIA.y - 90, width: 180, height: 180, borderRadius: '50%',
        background: `radial-gradient(circle, ${alpha('#ffffff', 0.95)} 0%, ${alpha('#fff1d0', 0.6)} 9%, ${alpha(GOLD, 0.18)} 32%, ${alpha(GOLD, 0)} 70%)`,
        opacity: 0.15 + 0.7 * ig + 0.5 * flash, transform: `scale(${(1 + flash * 0.6).toFixed(3)})`,
      }} />
      <div style={{
        position: 'absolute', left: DIA.x - 420, top: DIA.y - 2, width: 840, height: 4, borderRadius: 2,
        background: `linear-gradient(90deg, ${alpha(GOLD, 0)} 0%, ${alpha('#fff3da', 0.8)} 50%, ${alpha(GOLD, 0)} 100%)`,
        opacity: 0.1 + 0.5 * ig + 0.5 * flash, filter: 'blur(1px)',
      }} />

      {/* 字 */}
      {/* 版式按瓦片行排：眉题在第 0 行、字标整个落在第 3 行（486–648）内、副标在第 4 行——拼缝不切字 */}
      <div style={{ position: 'absolute', left: 0, width: PW, top: 52, textAlign: 'center', fontFamily: FONT.sans, fontSize: 24, fontWeight: 600, letterSpacing: '0.42em', color: GOLD, opacity: ramp(frame, 70, 16, EASE.out), paddingLeft: '0.42em' }}>
        INTRODUCING
      </div>
      <div style={{ position: 'absolute', left: 0, width: PW, top: 500, textAlign: 'center', fontFamily: SERIF, fontSize: 150, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1, color: '#f6f3ec' }}>
        <TextReveal text="Mosaic" by="char" variant="rise" start={74} each={22} gap={2.2} />
      </div>
      <div style={{
        position: 'absolute', left: 0, width: PW, top: 698, textAlign: 'center', fontFamily: FONT.sans, fontSize: 34, fontWeight: 450, color: L.ink2, letterSpacing: '-0.01em',
        opacity: ramp(frame, 86, 16, EASE.out), transform: `translateY(${(1 - ramp(frame, 86, 20, EASE.snappy)) * 14}px)`,
      }}>
        Piece by piece.
      </div>

      {/* 扫光：hold 段一次，海报坐标 */}
      {sheen > 0 && sheen < 1 && (
        <div style={{
          position: 'absolute', inset: 0, mixBlendMode: 'screen',
          background: `linear-gradient(105deg, transparent ${(sheen * 140 - 30).toFixed(1)}%, ${alpha('#ffffff', 0.07)} ${(sheen * 140 - 15).toFixed(1)}%, transparent ${(sheen * 140).toFixed(1)}%)`,
        }} />
      )}
    </div>
  );
};

// ───────────── 一块瓦片 ─────────────
const face = (w: number, h: number, transform: string, extra: React.CSSProperties): React.CSSProperties => ({
  position: 'absolute', width: w, height: h, left: (TW - SEAM - w) / 2, top: (TH - SEAM - h) / 2,
  transform, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', ...extra,
});

const Tile: React.FC<{ t: (typeof TILES)[number]; frame: number }> = ({ t, frame }) => {
  const tin = landEase(Math.min(1, Math.max(0, (frame - t.start) / LAND)));
  const tout = ramp(frame, t.exitAt, 26, EASE.exit);
  if (tout >= 1) return null;
  const inv = 1 - tin;
  const since = frame - (t.start + LAND);
  const settle = since > 0 && since < 16 ? Math.exp(-since / 3.4) * Math.sin(since * 0.8) : 0;
  const rx = t.rx * inv + t.wob * 2.5 * settle + t.erx * tout;
  const ry = t.ry * inv + t.ery * tout;
  const rz = t.rz * inv + t.erz * tout;
  const x = t.dx * inv + t.ex * tout;
  const y = t.dy * inv + t.ey * tout;
  const z = t.dz * inv + t.ez * tout - 5 * Math.abs(settle);
  // 景深里的碎片更暗（离主光远），飞回来逐渐受光
  const depthLit = mix(0.5, 1, Math.min(1, Math.max(0, (z + 1800) / 1800)));
  const shade = (n: V3) => Math.min(1.15, lambert(rot(n, rx, ry, rz)) / FRONT_REST) * depthLit;
  const front = shade([0, 0, 1]);
  const edge = (n: V3) => {
    const k = shade(n);
    return mixHex('#1a1b1e', '#b59a68', k * k);
  };
  const w = TW - SEAM, h = TH - SEAM;
  return (
    <div style={{
      position: 'absolute', left: t.c * TW + SEAM / 2, top: t.r * TH + SEAM / 2, width: w, height: h, transformStyle: 'preserve-3d',
      transform: `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,${z.toFixed(2)}px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) rotateZ(${rz.toFixed(3)}deg)`,
    }}>
      {/* 正面：海报切片 */}
      <div style={face(w, h, `translateZ(${D / 2}px)`, { overflow: 'hidden', borderRadius: 3 })}>
        <div style={{ position: 'absolute', left: -t.c * TW - SEAM / 2, top: -t.r * TH - SEAM / 2 }}>
          <PosterArt frame={frame} />
        </div>
        {front < 0.995 && <div style={{ position: 'absolute', inset: 0, background: `rgba(6,6,8,${(Math.min(1, 1 - front) * 0.85).toFixed(3)})` }} />}
        {front > 1.005 && <div style={{ position: 'absolute', inset: 0, background: alpha(GOLD, (front - 1) * 0.5), mixBlendMode: 'screen' }} />}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 3, boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.1)}, inset 0 0 0 1px ${alpha('#ffffff', 0.04)}` }} />
      </div>
      {/* 背面 */}
      <div style={face(w, h, `rotateY(180deg) translateZ(${D / 2}px)`, { background: mixHex('#0c0c0e', '#3a3328', shade([0, 0, -1])), borderRadius: 3 })} />
      {/* 侧边：上 / 下 / 右 / 左 */}
      <div style={face(w, D, `rotateX(90deg) translateZ(${h / 2}px)`, { background: edge([0, -1, 0]) })} />
      <div style={face(w, D, `rotateX(-90deg) translateZ(${h / 2}px)`, { background: edge([0, 1, 0]) })} />
      <div style={face(D, h, `rotateY(90deg) translateZ(${w / 2}px)`, { background: edge([1, 0, 0]) })} />
      <div style={face(D, h, `rotateY(-90deg) translateZ(${w / 2}px)`, { background: edge([-1, 0, 0]) })} />
    </div>
  );
};

// 场景：自己读帧（CameraMotionBlur 靠子树内的 useCurrentFrame 做多重采样）
const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ perspective: PERSP, perspectiveOrigin: '50% 50%', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: (1920 - PW) / 2, top: (1080 - PH) / 2, width: PW, height: PH, transformStyle: 'preserve-3d' }}>
        {TILES.map((t, i) => <Tile key={i} t={t} frame={frame} />)}
      </div>
    </AbsoluteFill>
  );
};

// 落版：碎片清空后露出的那一张
const EndCard: React.FC<{ frame: number }> = ({ frame }) => {
  const on = (s: number) => ({
    opacity: ramp(frame, s, 14, EASE.out),
    transform: `translateY(${((1 - ramp(frame, s, 20, EASE.snappy)) * 16).toFixed(2)}px)`,
  });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      <div style={{ ...on(140), width: 84, height: 84, borderRadius: 42, position: 'relative', boxShadow: `0 0 0 2.5px ${alpha(GOLD, 0.9)}, 0 0 36px ${alpha(GOLD, 0.35)}` }}>
        <div style={{ position: 'absolute', left: 63, top: 8, width: 12, height: 12, borderRadius: 6, background: '#fff6e0', boxShadow: `0 0 14px 4px ${alpha(GOLD, 0.7)}` }} />
      </div>
      <div style={{ ...on(146), marginTop: 44, fontFamily: SERIF, fontSize: 140, fontWeight: 500, letterSpacing: '-0.02em', color: L.ink, lineHeight: 1 }}>Mosaic</div>
      <div style={{ ...on(152), marginTop: 30, fontFamily: FONT.sans, fontSize: 32, fontWeight: 500, letterSpacing: '0.3em', color: L.ink2, paddingLeft: '0.3em' }}>
        AVAILABLE OCTOBER 14
      </div>
    </AbsoluteFill>
  );
};

export const Fracture: React.FC = () => {
  const frame = useCurrentFrame();
  const flying = frame < 72 || (frame > EXIT && frame < 154);
  // 海报身后的环境光：拼齐时亮起，飞散时熄
  const whole = ramp(frame, 30, 44, EASE.out) * (1 - ramp(frame, EXIT, 26, EASE.exit));
  return (
    <AbsoluteFill style={{ background: L.bg[2] }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.0 }} fill={{ x: 0.5, y: 1.05 }} intensity={0.75} grain={0} vignette={0.65}>
        <div style={{
          position: 'absolute', inset: 0, opacity: whole,
          background: `radial-gradient(ellipse 50% 52% at 50% 46%, ${alpha(GOLD, 0.16)} 0%, ${alpha(GOLD, 0.04)} 45%, ${alpha(GOLD, 0)} 72%)`,
        }} />
      </Stage>
      <EndCard frame={frame} />
      {flying ? (
        // 飞散段转速与位移都更大：6 采样会露出一层层分离的残影，加到 10
        <CameraMotionBlur shutterAngle={frame > EXIT ? 150 : 170} samples={frame > EXIT ? 10 : 6}>
          <Scene />
        </CameraMotionBlur>
      ) : (
        <Scene />
      )}
      {/* 颗粒在模糊之外（多重采样会把颗粒抹平） */}
      <Grain opacity={0.09} blend="soft-light" />
    </AbsoluteFill>
  );
};
