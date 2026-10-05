// spotlight-hero-card —— 聚光灯扫过页面锁定一张卡 → 斜侧推进 → 卡片弹起悬浮 →
// 轮廓光束两圈 → 贴回原位。单一主角式产品开场，把核心对象立成全片主角。
//
// 第二轮重设计（石墨剧场 · 钨丝聚光）：
// - look = graphite。真实页面截图（Q1，纹理不动）被放进一间关了灯的剧场：整页先压到 ~14% 亮度，
//   只有聚光灯的光池里是页面本色；灯是暖钨丝白，带一道从画面上方打下来的体积光柱（光柱里有浮尘）。
//   开灯是"啪"的一下：2f 亮起 → 1f 回闪 → 稳住，像舞台灯被推上闸。
// - 光池游走 3 个中间站（操作员在找人）→ 锁定卡心：光池收拢 + 锁定脉冲 + 光池外再压暗一档。
// - 相机：全页正视 → 18f 推进到左侧机位斜特写（rotY 34° 主导 + rotX 8°），推进后彻底锁死（R1 真静止）。
// - 卡：rise（过冲）→ 悬停 sin bob → reseat（落地微压 + 一圈香槟色落地光）。悬浮时卡投在页面上的影子
//   偏离光源方向、随高度变大变虚（主光方向统一：光从上方偏右来）。
// - 轮廓光束改为香槟金 + 白芯（graphite 的 accent2），只给主角两圈（Q4）：lap1 快而亮、lap2 慢而弱。
// - 3D 注记（C3：同一 3D 空间、同一台相机）：暗页上的白色粗黑体「Your product, / in motion.」（video-shotcraft 宣传语），
//   关键词后长出香槟色马克条（字变墨色）；卡 reseat 时注记也一起"落"回页面平面（translateZ 92→4），
//   不再提前退场——结尾是一张完整的海报：聚光里的卡 + 页面上的一句话。
//
// 时间表（30fps，共 172f）：
//   0–6     暗场：页面 ~14% 亮度；f2–6 开灯（亮-回闪-稳）
//   6–34    光池游走 3 站（smooth in-out，站间有 2–3f 停顿）
//   34–44   锁定：光池收拢到卡 + 6% 脉冲，光池外压暗 0.80→0.90
//   40–58   相机推进到斜侧特写（18f），高清卡纹理 40–46 交叉淡入
//   56–66   卡弹起（10f 过冲）；66–124 悬停 bob（周期 40f）
//   68–82   光束 lap1（快、亮）；88–108 lap2（慢、弱）
//   70–84   注记入场（升起 + 解糊），84–96 马克条长出
//   124–142 reseat（18f）；注记同步落回页面；142 触地：落地光一圈 + 微压
//   142–172 hold：相机锁死，只剩光柱里浮尘与光池极缓呼吸
import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import { PageCam2D, CamKey2D } from '../../_fixtures/PageCam2D';
import { EASE, FONT, Grain, ramp } from '../../_fixtures/Polish';
import { Dust, LOOKS, alpha } from '../../_fixtures/Look';
import layout from '../../_textures/live-layout.json';

export const SPOTLIGHT_HERO_CARD_DURATION = 172;

const L = LOOKS.graphite;
const GOLD = L.accent2; // 香槟金：光束 / 马克条 / 落地光
const BEAM_CORE = 'rgba(255,250,238,0.98)';
const LAMP = '255,238,212'; // 钨丝暖白
const PATCH = 'oklch(97.5% 0.008 82)';

const PAGE_H = layout.projects.pageH;
const MAIN = 3;
const CARD = layout.projects.cards[MAIN];
const MCX = CARD.x + CARD.w / 2; // ≈ 960
const MCY = CARD.y + CARD.h / 2; // 772
const RADIUS = 16;

// —— 节拍 ——
const LOCK = 34;
const PUSH0 = 40;
const PUSH1 = 58;
const RISE0 = 56;
const RISE1 = 66;
const RESEAT0 = 124;
const LAND = 142;

const CAM_KEYS: CamKey2D[] = [
  { frame: 0, cx: 960, cy: 600, zoom: 0.8, rotX: 0, rotY: 0, rotZ: 0, persp: 1200 },
  { frame: PUSH0, cx: 960, cy: 600, zoom: 0.8, rotX: 0, rotY: 0, rotZ: 0, persp: 1200 },
  { frame: PUSH1, cx: MCX - 105, cy: MCY - 10, zoom: 2.6, rotX: 8, rotY: 34, rotZ: 2, persp: 1200 },
  { frame: SPOTLIGHT_HERO_CARD_DURATION, cx: MCX - 105, cy: MCY - 10, zoom: 2.6, rotX: 8, rotY: 34, rotZ: 2, persp: 1200 },
];
const PUSH_EASE = Easing.bezier(0.35, 0, 0.2, 1);
const POP_EASE = Easing.bezier(0.2, 1.25, 0.3, 1);
const RESEAT_EASE = Easing.bezier(0.4, 0, 0.3, 1.05);

const clampOpt = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// 页面相机的纯函数版（与 PageCam2D 同一套插值与 3D 坐标数学），供注记层复用同一台相机
const camAt = (frame: number) => {
  let a = CAM_KEYS[0];
  let b = CAM_KEYS[CAM_KEYS.length - 1];
  for (let i = 0; i < CAM_KEYS.length - 1; i++) {
    if (frame >= CAM_KEYS[i].frame && frame <= CAM_KEYS[i + 1].frame) { a = CAM_KEYS[i]; b = CAM_KEYS[i + 1]; break; }
  }
  const t = a.frame === b.frame ? 1 : interpolate(frame, [a.frame, b.frame], [0, 1], { ...clampOpt, easing: PUSH_EASE });
  const m = (x?: number, y?: number) => (x ?? 0) + ((y ?? 0) - (x ?? 0)) * t;
  return { cx: m(a.cx, b.cx), cy: m(a.cy, b.cy), zoom: m(a.zoom, b.zoom), rotX: m(a.rotX, b.rotX), rotY: m(a.rotY, b.rotY), rotZ: m(a.rotZ, b.rotZ), persp: m(a.persp, b.persp) };
};
const NoteCam: React.FC<{ frame: number; children: React.ReactNode }> = ({ frame, children }) => {
  const c = camAt(frame);
  return (
    <AbsoluteFill style={{ overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, perspective: `${c.persp * c.zoom}px`, perspectiveOrigin: '960px 540px' }}>
        <div style={{
          position: 'absolute', width: 1920, height: PAGE_H, zoom: c.zoom, transformOrigin: `${c.cx}px ${c.cy}px`, transformStyle: 'preserve-3d',
          transform: `translate(${960 / c.zoom - c.cx}px, ${540 / c.zoom - c.cy}px) rotateY(${c.rotY}deg) rotateX(${c.rotX}deg) rotateZ(${c.rotZ}deg)`,
        }}>
          {children}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const SpotlightHeroCard: React.FC = () => {
  const frame = useCurrentFrame();

  // --- 开灯：亮 → 回闪 → 稳（舞台灯推闸） ---
  const lamp = interpolate(frame, [1, 3, 4, 6], [0, 1, 0.62, 1], clampOpt);

  // --- 光池游走（屏幕空间 %）：3 个中间站，站间短停 → 锁定卡心 → 随推进移到画面中 ---
  const ST = [4, 10, 13, 19, 22, 28, LOCK, PUSH1];
  const spotX = interpolate(frame, ST, [24, 24, 72, 72, 38, 38, 50, 60], { ...clampOpt, easing: EASE.smooth });
  const spotY = interpolate(frame, ST, [30, 30, 40, 40, 62, 62, 64, 55], { ...clampOpt, easing: EASE.smooth });
  const poolBase = interpolate(frame, [22, LOCK, PUSH1], [400, 300, 470], { ...clampOpt, easing: EASE.swift });
  const pulse = interpolate(frame, [LOCK, LOCK + 4, LOCK + 10], [0, 0.06, 0], clampOpt);
  const breathe = 1 + 0.015 * Math.sin((frame - LAND) / 14) * ramp(frame, LAND, 20, EASE.out);
  const poolRx = poolBase * (1 + pulse) * breathe;
  const poolRy = poolBase * interpolate(frame, [PUSH0, PUSH1], [0.8, 0.92], clampOpt) * (1 + pulse) * breathe;
  const dark = interpolate(frame, [0, LOCK, PUSH1], [0.9, 0.92, 0.94], clampOpt); // 光池外压暗
  // 锁定后：屏幕空间的圆光池 → 页面空间的"卡形光"（同一台相机、卡形软孔）。卡在 z 上高于这层暗场，
  // 所以卡面从边到边全亮、原色对比；衰减只发生在卡外。推进期间两套灯交叉过渡。
  const cardLight = ramp(frame, LOCK + 4, PUSH1 - LOCK - 4, EASE.smooth);
  const holdBreath = 1 + 0.012 * Math.sin((frame - LAND) / 14) * ramp(frame, LAND, 20, EASE.out);

  // --- 卡：rise → hover → reseat ---
  const rise = interpolate(frame, [RISE0, RISE1], [0, 1], { ...clampOpt, easing: POP_EASE });
  const reseat = interpolate(frame, [RESEAT0, LAND], [0, 1], { ...clampOpt, easing: RESEAT_EASE });
  const lift = rise * (1 - reseat);
  const bob = Math.sin(((frame - RISE1) / 40) * Math.PI * 2) * 4 * lift;
  const z = 110 * lift + bob;
  const landed = frame >= LAND;
  const press = interpolate(frame, [LAND - 4, LAND - 1, LAND], [1, 0.997, 1], clampOpt);
  // 投影：光从上方偏右来 → 影子落向左下，随高度变大变虚
  const shadow = `${-10 * lift}px ${10 * lift}px ${12 + 12 * lift}px rgba(10,8,6,${0.35 * lift}), ${-36 * lift}px ${48 * lift}px ${90 * lift}px rgba(10,8,6,${0.42 * lift})`;

  const slotVis = Math.min(1, rise * 2) * (1 - reseat);
  const landPulse = interpolate(frame, [LAND - 4, LAND, LAND + 14], [0, 1, 0], clampOpt);
  const slotEdge = Math.min(1, 0.45 * (1 - reseat)) + landPulse * 0.5;

  // --- 轮廓光束两圈 ---
  const beam1Prog = interpolate(frame, [68, 82], [0, 1], { ...clampOpt, easing: EASE.linear });
  const beam1On = frame >= 67 && frame <= 83;
  const beam2Prog = interpolate(frame, [88, 108], [0, 1], { ...clampOpt, easing: EASE.swift });
  const beam2On = frame >= 87 && frame <= 109;
  const beamTrail = interpolate(frame, [108, 122], [0.4, 0], clampOpt);
  const bw = CARD.w + 6;
  const bh = CARD.h + 6;

  const hiresIn = interpolate(frame, [PUSH0, PUSH0 + 6], [0, 1], clampOpt);
  const rimOn = 0.5 * Math.min(1, lift + ramp(frame, PUSH0, 16, EASE.linear));

  // --- 注记 ---
  const noteIn = ramp(frame, 70, 14, EASE.out);
  const noteSettle = interpolate(frame, [RESEAT0 - 4, LAND], [0, 1], { ...clampOpt, easing: RESEAT_EASE });
  const noteZ = 4 + (88 + Math.sin(((frame - 70) / 44) * Math.PI * 2) * 3) * (1 - noteSettle);
  const hl = ramp(frame, 84, 12, EASE.swift);

  // --- 体积光柱：光源在画面上方偏右，打到光池 ---
  const px = (spotX / 100) * 1920;
  const py = (spotY / 100) * 1080;
  const sx = px + 420;
  const sy = -720;
  const coneW = poolRx * 0.6;
  const cone = `${sx - 26}px ${sy}px, ${sx + 26}px ${sy}px, ${px + coneW}px ${py}px, ${px - coneW}px ${py}px`;

  return (
    <AbsoluteFill style={{ backgroundColor: L.bg[2] }}>
      <PageCam2D src="textures/live/projects-full.png" pageH={PAGE_H} keys={CAM_KEYS} ease={PUSH_EASE} bg={L.bg[1]}>
        {/* 倾斜平面近端（下缘）的一线轮廓光 */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 8, background: 'rgba(255,240,220,0.8)', filter: 'blur(6px)', opacity: rimOn, pointerEvents: 'none' }} />

        {/* 页面空间暗场：整页压暗，只在卡位挖一个卡形软孔（紧孔 σ22 + 一圈 15% 的宽溢光 σ60）；translateZ(1) 垫在卡之下 */}
        {cardLight > 0.001 ? (
          <svg width={1920} height={PAGE_H} style={{ position: 'absolute', left: 0, top: 0, transform: 'translateZ(1px)', opacity: cardLight, pointerEvents: 'none' }}>
            <defs>
              <filter id="shc-tight" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="22" /></filter>
              <filter id="shc-wide" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="60" /></filter>
              <mask id="shc-hole" maskUnits="userSpaceOnUse" x={0} y={0} width={1920} height={PAGE_H}>
                <rect x={0} y={0} width={1920} height={PAGE_H} fill="white" />
                <rect x={CARD.x - 60} y={CARD.y - 50} width={CARD.w + 120} height={CARD.h + 100} rx={70} fill="#262626" filter="url(#shc-wide)" />
                <rect x={CARD.x - 14} y={CARD.y - 14} width={CARD.w + 28} height={CARD.h + 28} rx={RADIUS + 14} fill="black" filter="url(#shc-tight)" />
              </mask>
            </defs>
            <rect x={0} y={0} width={1920} height={PAGE_H} fill="rgb(14,12,10)" fillOpacity={Math.min(0.97, 0.94 * holdBreath)} mask="url(#shc-hole)" />
          </svg>
        ) : null}

        <div style={{ transformStyle: 'preserve-3d' }}>
          {/* 卡起飞后的原位补丁 + 香槟色呼吸描边 */}
          {slotVis > 0.02 || landPulse > 0.02 ? (
            <div style={{
              position: 'absolute', left: CARD.x - 2, top: CARD.y - 2, width: CARD.w + 4, height: CARD.h + 4, transform: 'translateZ(1.5px)',
              background: slotVis > 0.02 ? PATCH : 'transparent', borderRadius: RADIUS,
              boxShadow: `inset 0 0 26px rgba(150,110,40,${(0.14 * slotEdge).toFixed(3)})`, opacity: Math.max(slotVis, landPulse),
            }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: RADIUS, border: `1.5px solid ${GOLD}`, opacity: slotEdge, boxShadow: landPulse > 0.02 ? `0 0 ${(24 * landPulse).toFixed(1)}px ${alpha(GOLD, 0.8)}` : undefined }} />
            </div>
          ) : null}

          {/* 悬浮的卡 */}
          <div style={{
            position: 'absolute', left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h,
            transform: `translateZ(${(z + 2).toFixed(2)}px) scale(${press})`, transformOrigin: 'center center', transformStyle: 'preserve-3d',
          }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: RADIUS, overflow: 'hidden', boxShadow: landed ? 'none' : shadow }}>
              <Img src={staticFile(`textures/live/${CARD.file}`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
              <Img src={staticFile('textures/live/card4-hires.png')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', opacity: hiresIn }} />
              {/* 悬浮时卡面受光：右上角暖光 → 左下渐暗 */}
              <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(200deg, rgba(${LAMP},0.35), rgba(${LAMP},0) 45%, rgba(20,16,10,0.08) 100%)`, opacity: lift, pointerEvents: 'none' }} />
            </div>
            <div style={{ position: 'absolute', inset: 0, borderRadius: RADIUS, // 轮廓光：一圈暖白发丝边 + 极淡外溢，让卡的轮廓在暗页上读得清（锁定后亮起）
              boxShadow: `inset 0 0 0 1px rgba(255,255,255,${(0.7 * lift).toFixed(3)}), 0 0 0 1.5px rgba(255,236,205,${(0.7 * cardLight).toFixed(3)}), 0 0 44px rgba(255,214,160,${(0.18 * cardLight).toFixed(3)})`, pointerEvents: 'none' }} />

            {/* 轮廓光束：SVG 圆角矩形，pathLength=1 的行进弧段 */}
            {(beam1On || beam2On) && lift > 0.4 ? (
              <svg width={bw} height={bh} viewBox={`0 0 ${bw} ${bh}`} style={{
                position: 'absolute', left: -3, top: -3, overflow: 'visible', pointerEvents: 'none', opacity: beam1On ? 1 : 0.62,
                filter: `drop-shadow(0 0 6px ${alpha(GOLD, 0.9)}) drop-shadow(0 0 18px rgba(255,236,200,0.55))`,
              }}>
                <rect x={2} y={2} width={bw - 4} height={bh - 4} rx={RADIUS} fill="none" stroke={GOLD} strokeWidth={beam1On ? 5 : 3.5} strokeLinecap="round"
                  pathLength={1} strokeDasharray="0.16 1" strokeDashoffset={-(beam1On ? beam1Prog : beam2Prog)} />
                <rect x={2} y={2} width={bw - 4} height={bh - 4} rx={RADIUS} fill="none" stroke={BEAM_CORE} strokeWidth={beam1On ? 2.5 : 1.75} strokeLinecap="round"
                  pathLength={1} strokeDasharray="0.16 1" strokeDashoffset={-(beam1On ? beam1Prog : beam2Prog)} />
              </svg>
            ) : null}
            {beamTrail > 0.01 ? (
              <div style={{ position: 'absolute', inset: -3, borderRadius: RADIUS + 3, border: `1.5px solid ${GOLD}`, opacity: beamTrail, pointerEvents: 'none' }} />
            ) : null}
          </div>
        </div>

      </PageCam2D>

      {/* —— 灯光（屏幕空间）——
          ① 关灯：光池外 multiply 压暗到 ~14%（暖黑而非纯黑，保色相）；
          ② 光池：钨丝暖白 soft-light 提亮中间调 + 极弱 screen 抬亮；
          ③ 体积光柱 + 柱内浮尘（screen）。 */}
      <AbsoluteFill style={{
        // 近高斯的衰减：中心完全透明 → 边缘压到 ~10% 亮度；多段 stop 让光池边缘软而不是一圈硬边
        background: `radial-gradient(${(poolRx * 1.35).toFixed(1)}px ${(poolRy * 1.35).toFixed(1)}px at ${spotX}% ${spotY}%, rgba(14,12,10,0) 0%, rgba(14,12,10,0) 26%, rgba(14,12,10,${(dark * 0.25).toFixed(3)}) 44%, rgba(14,12,10,${(dark * 0.62).toFixed(3)}) 62%, rgba(14,12,10,${(dark * 0.9).toFixed(3)}) 80%, rgba(14,12,10,${dark.toFixed(3)}) 100%)`,
        mixBlendMode: 'multiply', pointerEvents: 'none', opacity: lamp * (1 - cardLight),
      }} />
      {/* 开灯前：整页压暗（灯推闸时由它和上一层交接） */}
      <AbsoluteFill style={{ background: 'rgba(14,12,10,1)', mixBlendMode: 'multiply', opacity: 0.84 * (1 - lamp), pointerEvents: 'none' }} />
      {/* 光池里的钨丝暖色（soft-light，低强度——白卡不被打爆） */}
      <AbsoluteFill style={{
        background: `radial-gradient(${(poolRx * 1.2).toFixed(1)}px ${(poolRy * 1.2).toFixed(1)}px at ${spotX}% ${spotY}%, rgba(${LAMP},0.24) 0%, rgba(${LAMP},0.12) 50%, rgba(${LAMP},0) 80%)`,
        mixBlendMode: 'soft-light', pointerEvents: 'none', opacity: lamp * (1 - cardLight), // 锁定后退掉：卡上不叠任何泛光，文字保持原生对比
      }} />
      {/* 体积光柱：梯形 + 纵向渐变 + 大半径模糊；推进后光柱变淡（镜头离光源更近、柱身出画） */}
      <AbsoluteFill style={{ mixBlendMode: 'screen', pointerEvents: 'none', opacity: lamp * (1 - 0.45 * ramp(frame, PUSH0, 18, EASE.smooth)) }}>
        {/* 模糊放在外层、裁切放在内层：柱身边缘是软的 */}
        <div style={{ position: 'absolute', inset: 0, filter: 'blur(28px)' }}>
          <div style={{
            position: 'absolute', inset: 0, clipPath: `polygon(${cone})`,
            background: `linear-gradient(${(Math.atan2(py - sy, px - sx) * 180 / Math.PI - 90).toFixed(1)}deg, rgba(${LAMP},0.34) 0%, rgba(${LAMP},0.16) 60%, rgba(${LAMP},0.06) 100%)`,
          }} />
        </div>
        <div style={{ position: 'absolute', inset: 0, clipPath: `polygon(${cone})` }}>
          <Dust look={L} count={36} seed={4} drift={0.3} opacity={0.6} color="#fff1dc" />
        </div>
      </AbsoluteFill>
      {/* 注记层：与页面同一台相机（camAt 复刻 PageCam2D 的坐标数学），但画在灯光层之上——
          它是"自发光"的字，不被关灯的 multiply 压暗；暗色衬底负责把背后的邻卡字压下去 */}
      <NoteCam frame={frame}>
          {/* 3D 注记：卡左侧，同一 3D 空间、同一台相机；reseat 时一起落回页面 */}
          {frame >= 70 ? (
            <div style={{ transformStyle: 'preserve-3d', pointerEvents: 'none' }}>
              {/* 注记投在页面上的软影（落回页面时收拢消失） */}
              <div style={{
                position: 'absolute', left: 520, top: 760, width: 240, height: 70, transform: 'translateZ(2px)',
                background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.55), transparent 70%)', filter: 'blur(12px)',
                opacity: 0.5 * noteIn * (1 - noteSettle),
              }} />
              {/* 暗色衬底：注记压在邻卡文字上，没有衬底就和背后的字打架（Q11）；同一 3D 平面、同一台相机 */}
              <div style={{
                position: 'absolute', left: 400, top: 600, width: 380, height: 240, // 右缘止于卡左缘（x=781）之前，不压卡面
                transform: `translateZ(${(noteZ - 1).toFixed(2)}px) translateY(${((1 - noteIn) * 26).toFixed(2)}px)`,
                background: 'radial-gradient(ellipse 50% 50% at 52% 50%, rgba(16,14,12,0.97) 0%, rgba(16,14,12,0.9) 60%, rgba(16,14,12,0) 100%)',
                filter: 'blur(6px)', opacity: noteIn,
              }} />
              <div style={{
                position: 'absolute', left: 528, top: 662, width: 'max-content', whiteSpace: 'nowrap',
                transform: `translateZ(${noteZ.toFixed(2)}px) translateY(${((1 - noteIn) * 26).toFixed(2)}px)`,
                opacity: noteIn, filter: noteIn < 1 ? `blur(${((1 - noteIn) * 4).toFixed(2)}px)` : undefined,
                fontFamily: FONT.sans, letterSpacing: '-0.035em', lineHeight: 1.1,
              }}>
                <div style={{ fontSize: 34, fontWeight: 760, color: '#f6f3ec', textShadow: '0 2px 18px rgba(0,0,0,0.6)' }}>Your product,</div>
                <div style={{ position: 'relative', display: 'inline-block', marginTop: 2 }}>
                  <div style={{ position: 'absolute', left: -6, top: '8%', bottom: '2%', width: `calc(${hl.toFixed(4)} * (100% + 12px))`, background: GOLD, borderRadius: 4 }} />
                  <div style={{ position: 'relative', fontSize: 34, fontWeight: 760, color: hl > 0.55 ? '#14110c' : '#f6f3ec' }}>in motion.</div>
                </div>
              </div>
            </div>
          ) : null}
      </NoteCam>
      <Grain opacity={0.07} blend="soft-light" />
    </AbsoluteFill>
  );
};
