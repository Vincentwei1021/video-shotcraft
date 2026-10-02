// basic-3d-scene — impress.js 式空间步进（第二轮重设计）
// 手法不变：卡片散布在 3D 空间（各有 x·y·z + 旋转 + 缩放），相机取每站姿态之逆依次飞行对齐，
// 末站拉远成 OVERVIEW 总览。核心配方 camera = stepTransform.inverse()。
//
// 设计决定
// - look：graphite（近单色暗场，白为强调、香槟金只做点缀）——像发布会上"三章节"的空间叙事。
//   产品是 video-shotcraft，三站 = 品牌短句拆成的三个章节：Frame / Craft / Ship，
//   总览站是品牌落版「Craft the shot.」（标志 + 字标做眉题）。
// - 卡片是为镜头设计的海报而不是小 UI：1240×700 原生 1:1 排版（对位时屏幕上就是原生像素，
//   不经 DesignStage 放大，字不糊），150px 标题 + 44px 说明 + 420px 细体大号章节数字（被卡边裁切的编辑感）。
// - 空间感：世界里散布 70 颗真 3D 浮尘（各有 z，相机飞/转时有真实视差）；非当前卡按"站距"退焦变暗；
//   飞行中段相机额外拉远 ~30%（hop）让观众看见"还有别的卡在空间里"，再推近落位。
// - 每站停留时卡底一条金色进度线走满（像幻灯片计时），停留段不是死帧；落位前 8f 标题逐词从线下升起，
//   每张卡只揭示一次，之后在总览里保持已读状态。
// - 运动模糊：飞行段做时间采样（快门 0.5f，子帧 3–8 个按相机位移自适应），停留段零开销。
//
// 时间表（30fps，225f = 7.5s）
//   0–36    站 1 Capture：相机从 1.06 倍距离缓推到位（snappy 30f）；2f 起标题逐词升起；进度线走满
//   36–64   飞行 1→2（28f）：右移 + 世界左转 38°，途中 hop 拉远 30%
//   64–96   站 2 Connect 停留 32f
//   96–128  飞行 2→3（32f）：画框侧躺 90° 被转正——最长的一段，观众要看懂"世界在转"
//   128–158 站 3 Ship 停留 30f
//   158–190 飞行 3→总览（32f）：相机 1/2.7 拉远，三卡与品牌落版同框
//   184–212 落版：眉题字距收拢 → 「Craft the shot.」逐词升起 → 副句淡入
//   206–224 hold：极缓推近 1.5%，尾帧是一张完整海报
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, bezier, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, SERIF, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';
import { BRAND, ShotcraftMark } from '../../_fixtures/Brand';

export const BASIC_3D_SCENE_DURATION = 225; // 7.5s @30fps

const L = LOOKS.graphite;
const GOLD = L.accent2;
const CW = 1240; // 卡片原生尺寸（对位时屏幕 1:1）
const CH = 700;
const PERSP = 2600;

type Pose = { x: number; y: number; z: number; rx: number; ry: number; rz: number; s: number };
// 每站：卡片自己的 pose（相机取其逆）。站 2 世界左转 38°、站 3 画框侧躺 90°、总览 s=2.7 拉远
const POSES: Pose[] = [
  { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1 },
  { x: 1690, y: -260, z: -650, rx: 0, ry: -38, rz: 0, s: 1 },
  { x: 2590, y: 830, z: -850, rx: 0, ry: 0, rz: 90, s: 1 },
  { x: 594, y: 480, z: -400, rx: 0, ry: 0, rz: 0, s: 2.7 },
];
const CHAPTERS = [
  { no: '01', kicker: 'Frame', title: 'Frame.', body: 'Real page captures, staged for the camera.' },
  { no: '02', kicker: 'Craft', title: 'Craft.', body: 'Shot recipe cards turn moves into code.' },
  { no: '03', kicker: 'Ship', title: 'Ship.', body: 'One prompt to a finished promo.' },
];

// 飞行时刻表（帧）：[起, 止]
const FLIGHTS: [number, number][] = [[36, 64], [96, 128], [158, 190]];
const ARRIVE = [0, 64, 128, 190]; // 每站落位帧（站 0 开场即在）
const HOLD_END = [36, 96, 158, 225];
const FLY_EASE = bezier(0.62, 0, 0.16, 1); // 起步稳、落位很软的不对称 in-out
const HOP = 0.3; // 站间飞行途中额外拉远比例

// 相机姿态（帧的纯函数，可取小数帧：运动模糊子帧采样用）
const camAt = (f: number) => {
  const cam: Pose = { ...POSES[0] };
  // 开场：从 1.06 倍距离缓推到位（不是死帧起手）
  cam.s = mix(1.06, 1, ramp(f, 0, 30, EASE.snappy));
  let af = 0; // 累计飞行进度（0..3，小数 = 途中）
  let hop = 0;
  FLIGHTS.forEach(([a, b], i) => {
    const u = ramp(f, a, b - a, FLY_EASE);
    af += u;
    const p = POSES[i + 1];
    (Object.keys(cam) as (keyof Pose)[]).forEach((k) => {
      cam[k] = mix(cam[k], p[k], u);
    });
    if (i < 2 && u > 0 && u < 1) hop = HOP * Math.sin(Math.PI * u);
  });
  cam.s *= 1 + hop;
  // 停留段极缓推近 1.5%：落位后慢慢吃进去，下一段飞行起步时同曲线还原（画面活着但不晃）
  let creep = 0;
  for (let i = 0; i < 3; i++) {
    creep += ramp(f, ARRIVE[i] + 4, HOLD_END[i] - ARRIVE[i], EASE.smooth) * (1 - ramp(f, FLIGHTS[i][0], 14, EASE.smooth));
  }
  cam.s *= 1 - 0.015 * creep;
  // 总览落定后极缓推近 1.5%（hold 段活着，不晃）
  cam.s *= 1 - 0.015 * ramp(f, 196, 29, EASE.smooth);
  return { cam, af };
};

const camTransform = (c: Pose) =>
  `scale(${(1 / c.s).toFixed(5)}) rotateZ(${(-c.rz).toFixed(4)}deg) rotateY(${(-c.ry).toFixed(4)}deg) rotateX(${(-c.rx).toFixed(4)}deg) translate3d(${(-c.x).toFixed(3)}px,${(-c.y).toFixed(3)}px,${(-c.z).toFixed(3)}px)`;
const poseTransform = (p: Pose) =>
  `translate3d(${p.x}px,${p.y}px,${p.z}px) rotateX(${p.rx}deg) rotateY(${p.ry}deg) rotateZ(${p.rz}deg) scale(${p.s})`;

const hash = (n: number) => {
  const x = Math.sin(n * 91.345 + 47.853) * 43758.5453;
  return x - Math.floor(x);
};
// 世界里的真 3D 浮尘：位置固定在世界坐标，视差全部来自相机
const MOTES = Array.from({ length: 70 }, (_, i) => ({
  x: -2600 + hash(i * 3.1) * 6800,
  y: -2000 + hash(i * 5.7 + 1) * 4800,
  z: -3200 + hash(i * 7.3 + 2) * 3600,
  r: 3 + hash(i * 11.9 + 3) * 7,
  a: 0.25 + hash(i * 13.1 + 4) * 0.55,
}));

// ───────── 章节卡 ─────────
const ChapterCard: React.FC<{ i: number; frame: number; focus: number }> = ({ i, frame, focus }) => {
  const c = CHAPTERS[i];
  const arrive = ARRIVE[i];
  const reveal = arrive - (i === 0 ? -2 : 8); // 标题在落位前一拍开始升起
  const hold = ramp(frame, arrive, HOLD_END[i] - arrive, EASE.smooth); // 进度线
  const numIn = ramp(frame, reveal - 4, 26, EASE.out);
  const bodyIn = ramp(frame, reveal + 8, 18, EASE.out);
  return (
    <div style={{ position: 'absolute', inset: 0, padding: '74px 84px', boxSizing: 'border-box', fontFamily: FONT.sans }}>
      {/* 细体大号章节数字：被卡右缘裁掉一截（编辑感），只做纹理层 */}
      <div style={{
        position: 'absolute', right: -36, bottom: -118, ...type(560, 200), letterSpacing: '-0.06em',
        color: 'transparent', backgroundImage: `linear-gradient(170deg, ${alpha('#ffffff', 0.16)} 10%, ${alpha('#ffffff', 0.02)} 70%)`,
        WebkitBackgroundClip: 'text', backgroundClip: 'text',
        transform: `translateY(${((1 - numIn) * 60).toFixed(1)}px)`, opacity: numIn,
      }}>{c.no}</div>
      {/* 眉题 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, ...type(26, 600, { mono: true }), letterSpacing: '0.14em', color: L.ink3, textTransform: 'uppercase' }}>
        <span style={{ color: GOLD }}>{c.no}</span>
        <span style={{ width: 44, height: 1, background: alpha(GOLD, 0.6) }} />
        <span>Chapter · {c.kicker}</span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, textTransform: 'none', fontFamily: BRAND.font, fontSize: 28, fontWeight: 700, letterSpacing: '0.03em', color: L.ink2 }}>
          <ShotcraftMark size={32} tone="dark" />{BRAND.name}
        </span>
      </div>
      {/* 标题：逐词从线下升起 */}
      <div style={{ marginTop: 150, ...type(156, 760), color: L.ink }}>
        <TextReveal text={c.title} by="char" variant="rise" start={reveal} each={20} gap={1.8} />
      </div>
      <div style={{
        marginTop: 34, maxWidth: 820, ...type(44, 420), lineHeight: 1.3, color: L.ink2, textWrap: 'balance',
        opacity: bodyIn, transform: `translateY(${((1 - bodyIn) * 18).toFixed(1)}px)`,
      }}>{c.body}</div>
      {/* 底部：三段章节进度，当前段金色走满 */}
      <div style={{ position: 'absolute', left: 84, right: 84, bottom: 70, display: 'flex', gap: 14 }}>
        {[0, 1, 2].map((k) => (
          <div key={k} style={{ flex: 1, height: 3, borderRadius: 2, background: alpha('#ffffff', 0.1), overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${(k < i ? 1 : k === i ? hold : 0) * 100}%`,
              background: k === i ? `linear-gradient(90deg, ${alpha(GOLD, 0.7)}, ${GOLD})` : alpha('#ffffff', 0.45),
              boxShadow: k === i ? `0 0 ${10 * focus}px ${alpha(GOLD, 0.6)}` : undefined,
            }} />
          </div>
        ))}
      </div>
    </div>
  );
};

// ───────── 总览落版（世界里挂在总览站：放大 s 倍排版，相机 1/s 看回来 = 屏幕 1:1） ─────────
const OverviewPlate: React.FC<{ frame: number }> = ({ frame }) => {
  const st = 184;
  const kick = ramp(frame, st, 22, EASE.snappy);
  const sub = ramp(frame, st + 20, 18, EASE.out);
  return (
    <div style={{ position: 'absolute', left: -960, top: -540, width: 1920, height: 1080, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: 120, bottom: 128 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, ...type(24, 600, { mono: true }), letterSpacing: `${mix(0.6, 0.16, kick).toFixed(3)}em`, color: GOLD, opacity: kick, textTransform: 'uppercase' }}>
          <ShotcraftMark size={40} tone="dark" />
          <span style={{ textTransform: 'none', fontFamily: BRAND.font, fontSize: 30, fontWeight: 700, letterSpacing: '0.03em', color: L.ink }}>{BRAND.name}</span>
          <span>· Three chapters, one film</span>
        </div>
        <div style={{ marginTop: 26, ...type(150, 400, { serif: true }), letterSpacing: '-0.035em', color: L.ink }}>
          <TextReveal text="Craft the shot." by="word" variant="rise" start={st + 6} each={22} gap={5} />
        </div>
        <div style={{ marginTop: 22, ...type(38, 420), color: L.ink2, opacity: sub, transform: `translateY(${((1 - sub) * 14).toFixed(1)}px)` }}>
          Shot recipes for cinematic product films.
        </div>
      </div>
    </div>
  );
};

// 一个完整的世界（给定帧，可为小数帧）
const World: React.FC<{ f: number; frame: number }> = ({ f, frame }) => {
  const { cam, af } = camAt(f);
  const over = ramp(f, FLIGHTS[2][0], FLIGHTS[2][1] - FLIGHTS[2][0], EASE.smooth);
  const plateOn = ramp(frame, 176, 16, EASE.out);
  return (
    <div style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, transformStyle: 'preserve-3d', transform: camTransform(cam) }}>
      {MOTES.map((m, k) => (
        <div key={k} style={{
          position: 'absolute', left: -m.r, top: -m.r, width: m.r * 2, height: m.r * 2, borderRadius: '50%',
          transform: `translate3d(${m.x}px,${m.y}px,${m.z}px)`,
          background: `radial-gradient(circle, ${alpha('#f4efe4', m.a)} 0%, ${alpha('#f4efe4', 0)} 70%)`,
        }} />
      ))}
      {CHAPTERS.map((_, i) => {
        const p = POSES[i];
        // enter/exit：按"站距"退焦变暗；总览时全部回到可读（但略压暗，给落版让主次）
        const d = Math.min(1, Math.abs(af - i));
        const focus = Math.max(1 - d, over * 0.85);
        const lift = (1 - d) * 18;
        return (
          <div key={i} style={{
            position: 'absolute', left: -CW / 2, top: -CH / 2, width: CW, height: CH, borderRadius: 34, overflow: 'hidden',
            transform: `${poseTransform(p)} translateZ(${lift.toFixed(2)}px)`,
            background: `radial-gradient(ellipse 80% 90% at 18% 0%, ${alpha('#ffffff', 0.07)} 0%, ${alpha('#ffffff', 0)} 60%), linear-gradient(165deg, #202226 0%, #16171a 55%, #111214 100%)`,
            border: `1.5px solid ${alpha('#ffffff', 0.08 + 0.08 * focus)}`,
            boxShadow: `inset 0 1.5px 0 ${alpha('#ffffff', 0.12)}, 0 30px 80px -10px rgba(0,0,0,0.7), 0 6px 18px rgba(0,0,0,0.5)`,
            opacity: 0.22 + 0.78 * focus,
            filter: focus < 0.985 ? `blur(${((1 - focus) * 7).toFixed(2)}px)` : undefined,
          }}>
            {/* 顶沿受光线：中间亮两端隐 */}
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 2, background: `linear-gradient(90deg, transparent, ${alpha('#ffffff', 0.35 * (0.4 + 0.6 * focus))}, transparent)` }} />
            <ChapterCard i={i} frame={frame} focus={focus} />
          </div>
        );
      })}
      {/* 总览落版：在总览站姿态上（放大 2.7 倍排版），只在最后一段飞行开始显影 */}
      <div style={{ position: 'absolute', left: 0, top: 0, transform: poseTransform(POSES[3]), opacity: plateOn }}>
        <OverviewPlate frame={frame} />
      </div>
    </div>
  );
};

// 飞行段时间采样：快门 0.5 帧内 N 个子帧逐层 opacity 1/(i+1) 叠加 = 等权平均；N 按相机位移自适应
const SHUTTER = 0.5;
const samplesAt = (f: number) => {
  const a = camAt(f).cam, b = camAt(f - SHUTTER).cam;
  const disp = Math.hypot(a.x - b.x, a.y - b.y) / a.s + Math.abs(a.z - b.z) * 0.4
    + (Math.abs(a.ry - b.ry) + Math.abs(a.rz - b.rz)) * 14 + Math.abs(Math.log(a.s / b.s)) * 1400;
  return Math.max(1, Math.min(8, Math.ceil(disp / 5)));
};

export const Basic3DScene: React.FC = () => {
  const frame = useCurrentFrame();
  const flying = FLIGHTS.some(([a, b]) => frame > a && frame < b);
  const n = flying ? samplesAt(frame) : 1;
  return (
    <AbsoluteFill style={{ background: L.bg[2] }}>
      <Stage look={L} keyLight={{ x: 0.5, y: -0.08 }} fill={{ x: 0.85, y: 1.05 }} breathe={0.6} intensity={0.55} />
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        {Array.from({ length: n }, (_, i) => (
          <AbsoluteFill key={i} style={{ perspective: `${PERSP}px`, opacity: 1 / (i + 1) }}>
            <World f={n > 1 ? frame - (SHUTTER * i) / (n - 1) : frame} frame={frame} />
          </AbsoluteFill>
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
