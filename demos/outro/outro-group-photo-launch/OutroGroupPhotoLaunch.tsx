// outro-group-photo-launch —— 全片元素四方飞来围住字标合影，crane 落机位 + 舞台光 + 光尘做成发布会收场。
// outro / 品牌收尾，多功能产品"全家福"式终镜，能量推到全片最高（Q8）。
//
// 第二轮重设计（发布会之夜 · 深蓝舞台 + 白色产品卡）：
// - look = midnight（深蓝夜 · 电光蓝）。原版是奶白纸面上铺奶白卡，元素和底糊成一片；这一版把舞台关灯：
//   深蓝舞台、顶部三道缓摆的体积光束、地平线光带、背后一面巨型 LED 墙（真实项目页截图，虚化压暗做远景），
//   9 个真实页面元素（Q1：纹理保持原截图）在舞台光下是一块块发光的白卡——"合影"一眼可读。
// - 合影构图：三层景深——后排（导航条 / 论文条）小、虚、暗；中排（搜索框 / 周报条 / 论文 / 字段卡）；
//   前排三张项目卡大而实、带浓接触影。所有元素沿"离画面中心向外"的方向从四面八方飞入（密度越来越高的
//   错峰 cue），飞行中带旋转放大与按速度的方向性模糊，过冲落定 + 落地压实，不逐个发光（Q4）。
// - crane：合影层 perspective rotateX 9°→0 + 下落 + scale 1.1→1（前 44f，swift），之后零速起步缓推 3%。
// - 字标压轴：眉题 INTRODUCING → 150px 字标 AI Foundation Lab 逐字从线下升起（对焦）→ 电光蓝 rule 长出、
//   两端延长线射出 → 副标升起。字标登场时全员"退后排"（压暗 22% + 微虚），字标背后舞台光只亮一次。
//
// 时间表（30fps，共 150f）：
//   0–4     舞台已亮：光束、地平线、LED 墙远景（第 1 帧即有画面）
//   4–25    9 元素飞入（cue 4→25，越来越密），各 14f 过冲落定
//   0–44    crane 落机位；40–150 缓推 3%
//   40–60   退后排；舞台光在字标背后亮起（一次）
//   44–64   眉题 + 字标逐字升起
//   60–74   rule 长出 + 延长线射出淡去
//   68–82   副标升起
//   82–150  hold：光尘上飘、光束缓摆、缓推（Q8 落定 hold ≥ 1s）
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { EASE, FONT, SpeedBlur, bezier, ramp, mix, velocity } from '../../_fixtures/Polish';
import { LOOKS, Stage, Dust, TextReveal, alpha, type } from '../../_fixtures/Look';
import layout from '../../_textures/live-layout.json';

export const OUTRO_GROUP_PHOTO_LAUNCH_DURATION = 150;

const L = LOOKS.midnight;
const WBR_PAGE_H = layout.wbr.pageH;
const PAGE_H = layout.projects.pageH;
const FLY = bezier(0.3, 1.32, 0.42, 1); // 真过冲（y1 > 1）：落地前冲过头一点再回
const FLY_DUR = 14;

type Depth = 'back' | 'mid' | 'front';
type FlyEl = {
  key: string; file: string; w: number; h: number; // 显示尺寸（px）
  cx: number; cy: number; rot: number; cue: number; depth: Depth; radius: number; wbrCrop?: boolean;
};

// 渲染顺序 = 后排 → 前排（景深正确），cue 越来越密
const ELS: FlyEl[] = [
  { key: 'nav', file: 'nav.png', w: 900, h: 29, cx: 960, cy: 74, rot: 0, cue: 4, depth: 'back', radius: 8 },
  { key: 'paper3', file: 'paper3.png', w: 560, h: 114, cx: 712, cy: 944, rot: 2, cue: 9, depth: 'back', radius: 12 },
  { key: 'search', file: 'float-search.png', w: 640, h: 28, cx: 690, cy: 178, rot: -1.5, cue: 7, depth: 'mid', radius: 10 },
  { key: 'wbr', file: 'wbr-full.png', w: 560, h: 44, cx: 1320, cy: 186, rot: 2, cue: 12, depth: 'mid', radius: 8, wbrCrop: true },
  { key: 'paper1', file: 'paper1.png', w: 600, h: 122, cx: 1336, cy: 884, rot: -3, cue: 15, depth: 'mid', radius: 12 },
  { key: 'stats', file: 'float-stats.png', w: 330, h: 59, cx: 1650, cy: 752, rot: -2, cue: 17, depth: 'mid', radius: 10 },
  { key: 'card4', file: 'card4-hires.png', w: 340, h: 296, cx: 236, cy: 322, rot: -6, cue: 19, depth: 'front', radius: 16 },
  { key: 'card1', file: 'card1.png', w: 330, h: 266, cx: 1690, cy: 300, rot: 5, cue: 22, depth: 'front', radius: 16 },
  { key: 'card7', file: 'card7.png', w: 320, h: 279, cx: 252, cy: 830, rot: 4, cue: 25, depth: 'front', radius: 16 },
];

const DEPTH: Record<Depth, { blur: number; dim: number; shadow: number }> = {
  back: { blur: 1.8, dim: 0.62, shadow: 0.5 },
  mid: { blur: 0, dim: 0.86, shadow: 0.8 },
  front: { blur: 0, dim: 1, shadow: 1 },
};

// 顶部体积光束：从画外顶部斜射下来的三道梯形光，缓摆
const Beams: React.FC<{ f: number; boost: number }> = ({ f, boost }) => (
  <>
    {[{ x: 420, a: 14, ph: 0 }, { x: 960, a: 0, ph: 2 }, { x: 1500, a: -14, ph: 4 }].map((b, i) => {
      const sway = Math.sin(f / 46 + b.ph) * 3.2;
      return (
        // 外层做模糊、内层做梯形裁切：filter 先于 clip-path 生效，写在同一层会留下硬边
        <div key={i} style={{
          position: 'absolute', left: b.x - 260, top: -120, width: 520, height: 1180,
          transform: `rotate(${(b.a + sway).toFixed(2)}deg)`, transformOrigin: '50% 0%', mixBlendMode: 'screen',
          filter: 'blur(22px)', opacity: i === 1 ? 0.9 : 0.7,
        }}>
          <div style={{
            position: 'absolute', inset: 0, clipPath: 'polygon(42% 0%, 58% 0%, 100% 100%, 0% 100%)',
            background: `linear-gradient(180deg, ${alpha('#9fb8ff', 0.2 + boost * 0.06)} 0%, ${alpha(L.light, 0.07)} 55%, ${alpha(L.light, 0)} 92%)`,
          }} />
        </div>
      );
    })}
  </>
);

export const OutroGroupPhotoLaunch: React.FC = () => {
  const f = useCurrentFrame();

  // crane：前 44f 落机位；缓推零速起步接上
  const crane = ramp(f, 0, 44, EASE.swift);
  const pushT = ramp(f, 40, 110, EASE.smooth);
  const camScale = mix(1.1, 1, crane) * (1 + 0.03 * pushT);
  const camTilt = mix(9, 0, crane);
  const camY = mix(-46, 0, crane);

  const recede = ramp(f, 40, 20, EASE.smooth); // 退后排
  const stage = ramp(f, 42, 10, EASE.out) * (1 - 0.45 * ramp(f, 54, 26, EASE.out)); // 字标背后舞台光：只亮一次
  const rule = ramp(f, 60, 12, EASE.snappy);
  const ext = ramp(f, 62, 8, EASE.snappy);
  const extFade = 1 - ramp(f, 70, 8, EASE.out);

  return (
    <AbsoluteFill style={{ background: L.bg[2] }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.02 }} fill={null} horizon={0.66} intensity={0.9} breathe={0.4}>
        {/* 远景 LED 墙：真实项目页截图，虚化压暗 + 冷色调，随 crane 以更小幅度视差移动 */}
        <div style={{
          position: 'absolute', left: 260, top: 150 + camY * 0.4, width: 1400, height: 640, overflow: 'hidden', borderRadius: 18,
          opacity: 0.2, filter: 'blur(7px) saturate(0.5)', transform: `scale(${(1 + (camScale - 1) * 0.5).toFixed(4)})`,
          // 四边羽化：远景是一片"屏幕的光"，不是一块灰板
          WebkitMaskImage: 'radial-gradient(ellipse 50% 50% at 50% 45%, #000 20%, rgba(0,0,0,0.35) 60%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 50% 50% at 50% 45%, #000 20%, rgba(0,0,0,0.35) 60%, transparent 100%)',
        }}>
          <Img src={staticFile('textures/live/projects-full.png')} style={{ width: 1400, height: (1400 / 1920) * PAGE_H, display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: alpha(L.accent, 0.35), mixBlendMode: 'multiply' }} />
        </div>
        <Beams f={f} boost={stage} />
      </Stage>

      {/* 合影层：crane 运镜 */}
      <AbsoluteFill style={{
        transform: `perspective(1600px) translateY(${camY.toFixed(2)}px) rotateX(${camTilt.toFixed(3)}deg) scale(${camScale.toFixed(5)})`,
        transformOrigin: '50% 46%',
      }}>
        {ELS.map((el) => {
          if (f < el.cue) return null;
          const d = DEPTH[el.depth];
          // 飞入方向：从画面中心指向落点，向外延长 ~900px（四面八方）
          const vx = el.cx - 960, vy = el.cy - 540;
          const n = Math.hypot(vx, vy) || 1;
          const far = el.depth === 'front' ? 980 : 760;
          const posAt = (fr: number) => {
            const t = ramp(fr, el.cue, FLY_DUR, FLY);
            return [(vx / n) * far * (1 - t), (vy / n) * far * (1 - t)];
          };
          const t = ramp(f, el.cue, FLY_DUR, FLY);
          const [x, y] = posAt(f);
          const sx = velocity((fr) => posAt(fr)[0], f);
          const sy = velocity((fr) => posAt(fr)[1], f);
          const air = Math.max(0, 1 - t);
          const rot = el.rot * (1 + 2.2 * air);
          const land = ramp(f, el.cue + FLY_DUR - 4, 3, EASE.out) * (1 - ramp(f, el.cue + FLY_DUR - 1, 5, EASE.out)); // 落地压实
          const scale = (1 + 0.16 * air) * (1 - 0.018 * land);
          const op = ramp(f, el.cue, 3, EASE.linear);
          const dim = d.dim * (1 - 0.22 * recede);
          const blur = d.blur + recede * (el.depth === 'front' ? 0.6 : 1.2);
          const sh = d.shadow;
          const shadow = `0 ${(4 + 30 * air).toFixed(1)}px ${(10 + 50 * air).toFixed(1)}px rgba(0,3,12,${(0.5 * sh).toFixed(2)}), ` +
            `0 ${(28 + 40 * air - 10 * land).toFixed(1)}px ${(70 + 60 * air).toFixed(1)}px -20px rgba(0,3,12,${(0.75 * sh).toFixed(2)})`;
          const texture: React.CSSProperties | null = el.wbrCrop
            ? { background: `#fff url(${staticFile(`textures/live/${el.file}`)}) ${-576 * (el.w / 688)}px ${-173 * (el.w / 688)}px / ${1920 * (el.w / 688)}px ${WBR_PAGE_H * (el.w / 688)}px no-repeat` }
            : null;
          return (
            <SpeedBlur key={el.key} vx={sx} vy={sy} amount={0.32} max={24}>
              <div style={{
                position: 'absolute', left: el.cx - el.w / 2, top: el.cy - el.h / 2, width: el.w, height: el.h,
                transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${rot.toFixed(3)}deg) scale(${scale.toFixed(4)})`,
                borderRadius: el.radius, overflow: 'hidden', opacity: op,
                boxShadow: `${shadow}, 0 0 0 1px rgba(255,255,255,0.14)`,
                filter: `brightness(${dim.toFixed(3)})${blur > 0.05 ? ` blur(${blur.toFixed(2)}px)` : ''}`,
                ...texture,
              }}>
                {!el.wbrCrop && <Img src={staticFile(`textures/live/${el.file}`)} style={{ position: 'absolute', inset: 0, width: el.w, height: el.h, display: 'block' }} />}
                {/* 舞台顶光在卡面上的一层冷色反光（上亮下暗） */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(170deg, rgba(255,255,255,0.08) 0%, rgba(40,60,140,0.10) 100%)' }} />
              </div>
            </SpeedBlur>
          );
        })}
      </AbsoluteFill>

      {/* 字标背后的舞台光（只亮一次，之后回落成余光） */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: stage, mixBlendMode: 'screen',
        background: `radial-gradient(ellipse 34% 26% at 50% 50%, ${alpha('#8fb0ff', 0.4)} 0%, ${alpha(L.accent, 0.12)} 50%, ${alpha(L.accent, 0)} 80%)`,
      }} />

      {/* 光尘：前景上飘的冷白光点（确定性） */}
      <Dust look={L} count={34} seed={11} drift={0.55} opacity={0.75} color="#cfe0ff" />

      {/* 字标签名 */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
        <div style={{ textAlign: 'center', transform: `scale(${(1 + 0.025 * pushT).toFixed(4)})` }}>
          <div style={{ ...type(28, 650, { caps: true }), letterSpacing: '0.46em', color: L.accent, marginBottom: 30, paddingLeft: '0.46em' }}>
            <TextReveal text="Introducing" by="char" variant="blur" start={44} each={12} gap={1} />
          </div>
          {/* 投影走父级 drop-shadow：逐字揭示的遮罩框会把 text-shadow 裁成方块 */}
          <div style={{ ...type(150, 720), color: L.ink, letterSpacing: '-0.045em', filter: `drop-shadow(0 12px 40px ${alpha('#000614', 0.85)})` }}>
            <TextReveal text="AI Foundation Lab" by="char" variant="rise" start={46} each={16} gap={1.1} />
          </div>
          <div style={{ position: 'relative', height: 4, width: 220, margin: '40px auto 0' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: 2, background: L.accent, transform: `scaleX(${rule.toFixed(4)})`, boxShadow: `0 0 18px ${alpha(L.accent, 0.7)}` }} />
            {ext > 0 && extFade > 0 && (
              <>
                <div style={{ position: 'absolute', top: 1.5, height: 1, right: '100%', width: 260 * ext, background: `linear-gradient(270deg, ${L.accent}, ${alpha(L.accent, 0)})`, opacity: extFade }} />
                <div style={{ position: 'absolute', top: 1.5, height: 1, left: '100%', width: 260 * ext, background: `linear-gradient(90deg, ${L.accent}, ${alpha(L.accent, 0)})`, opacity: extFade }} />
              </>
            )}
          </div>
          <div style={{ marginTop: 34 }}>
            <TextReveal text="One console for every experiment." by="word" variant="rise" start={68} each={14} gap={2.5}
              style={{ ...type(44, 500), fontFamily: FONT.sans, color: L.ink2, letterSpacing: '-0.01em' }} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
