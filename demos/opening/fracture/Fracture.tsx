// fracture — Fracture Reassemble 碎片聚合（motion-lab 定稿转原生 Remotion）
// 5×5 瓦片从 3D 空间随机碎片态（±大位移 + 三轴随机旋转）聚合成整面海报，
// 按曼哈顿距离从中心向外波纹式就位；hold 后全部碎片沿背离中心的方向加速旋转飞出画面。
// 正放=开场、倒放=转场。设计坐标 480×270（DesignStage 等比放大），参数以此坐标系标定。
//
// 质感升级：
// - 25 块瓦片切的是**同一张海报**（每块按自身格位偏移 background-position），拼齐才看见完整画面，
//   而不是 25 块各自配色的拼布；海报 = 冷色深场 + 左上柔光 + 底部一道发光地平线弧 + 标题
// - 标题印在海报上（每块瓦片带自己那一片字），hold 段亮起；退场时字跟着碎片一起被撕走，不再单独淡出
// - 瓦片按朝向做明暗（越侧对镜头越暗），顶沿 1px 受光高光；落位最后 ~10f 一次阻尼小摆 = "咔哒"入槽
// - hold 段整面海报极缓推近 3%；飞行段（聚合/飞散）包 CameraMotionBlur，hold 段不包
// - 背景从死平 #0b0b10 换成带色相的柔光深场 + 海报身后一团随拼合程度亮起的环境光
// - DesignStage 用 raster="zoom"：3D 瓦片里的字按目标分辨率栅格化，不靠 transform 放大位图（Q2）
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { CameraMotionBlur } from '@remotion/motion-blur';
import { DesignStage, E, rand, seg, useT } from '../../_fixtures/Motion';
import { bezier, Backdrop, FONT, Grain } from '../../_fixtures/Polish';

export const FRACTURE_DURATION = 156; // 5200ms @30fps

const N = 5;
const ACCENT_HUE = 218; // 模板强调色相，可按项目替换（海报配色全部由它派生）
const PW = 380; // 海报（拼合后）设计尺寸
const PH = 230;
const TW = PW / N; // 76 —— 格距
const TH = PH / N; // 46
const SEAM = 0.5; // 拼缝（设计 px，放大后 2px）——拼齐后仍看得出是瓦片，又不会把字切缺笔

// 聚合曲线：起步柔、中段快、落位前长减速（比对称 inOutCubic 更"吸"进槽位）
const landEase = bezier(0.42, 0, 0.3, 1);

// 海报底图（整张，按 PW×PH 绘制；每块瓦片取自己那一格）
const h = ACCENT_HUE;
const POSTER_BG = [
  // 底部发光地平线弧：一圈细亮环 + 外侧柔晕
  `radial-gradient(circle at 64% 168%, rgba(0,0,0,0) 0 61%, hsla(${h},80%,78%,0.85) 61.6%, hsla(${h},70%,62%,0.28) 63.2%, hsla(${h},60%,50%,0) 70%)`,
  // 弧内侧的地光
  `radial-gradient(ellipse 70% 55% at 64% 100%, hsla(${h},70%,55%,0.32) 0%, hsla(${h},70%,45%,0) 70%)`,
  // 左上主光
  `radial-gradient(ellipse 55% 75% at 18% 0%, hsla(${h},45%,78%,0.30) 0%, hsla(${h},45%,70%,0) 65%)`,
  // 底色：冷色深场纵向渐变
  `linear-gradient(165deg, hsl(${h},30%,21%) 0%, hsl(${h},34%,12%) 55%, hsl(${h},38%,8%) 100%)`,
].join(', ');

// 瓦片参数表：格位 + 入场随机碎片态 + 退场方向（种子与 effect.js 完全一致）
const TILES = Array.from({ length: N * N }, (_, seed) => {
  const r = Math.floor(seed / N);
  const c = seed % N;
  // 退场方向：背离画面中心（中心瓦片给随机角），保证全部飞出画面
  const ang =
    r === 2 && c === 2
      ? rand(seed + 300) * Math.PI * 2
      : Math.atan2(r - 2 + (rand(seed + 310) - 0.5) * 0.8, c - 2 + (rand(seed + 320) - 0.5) * 0.8);
  return {
    r,
    c,
    dx: (rand(seed) - 0.5) * 900,
    dy: (rand(seed + 50) - 0.5) * 600,
    dz: (rand(seed + 100) - 0.3) * 700,
    rx: (rand(seed + 150) - 0.5) * 360,
    ry: (rand(seed + 200) - 0.5) * 360,
    rz: (rand(seed + 250) - 0.5) * 360,
    exX: Math.cos(ang) * (620 + rand(seed + 330) * 260),
    exY: Math.sin(ang) * (470 + rand(seed + 340) * 220),
    exR: (rand(seed + 350) - 0.5) * 300,
    wob: rand(seed + 360) < 0.5 ? -1 : 1, // 入槽小摆的方向
    delay: (Math.abs(r - 2) + Math.abs(c - 2)) * 0.045,
  };
});

// 海报上的字：眉题 + 主标题（印在海报上，随瓦片切片）
const PosterType: React.FC<{ on: number }> = ({ on }) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      width: PW,
      height: PH,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      fontFamily: FONT.sans,
      color: '#f3f5fb',
      opacity: on,
    }}
  >
    <div style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: '0.24em', color: `hsla(${h},70%,86%,0.85)` }}>
      INTRODUCING
    </div>
    <div style={{ fontSize: 27, fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.05, whiteSpace: 'nowrap' }}>
      Every piece, in place.
    </div>
  </div>
);

const Scene: React.FC = () => {
  const t = useT();
  const T = FRACTURE_DURATION - 1; // t→帧换算
  const typeOn = seg(t, 0.42, 0.52, E.outCubic);
  // hold 段极缓推近（0.45 起步，飞散时继续保持速度不急停）
  const push = 1 + 0.03 * seg(t, 0.45, 1, E.inOutQuad);
  // 拼合程度 → 海报身后环境光
  const whole = seg(t, 0.28, 0.55, E.outCubic) * (1 - seg(t, 0.7, 0.86, E.inQuad));
  return (
    <DesignStage raster="zoom">
      <Backdrop tone="dark" light={{ x: 0.5, y: 0.08 }} accent={`hsl(${h},70%,60%)`} grain={0} vignette={0.55} />
      {/* 海报身后的环境光：拼齐时亮起，像海报在发光 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 52% 56% at 50% 52%, hsla(${h},70%,58%,0.26) 0%, hsla(${h},70%,50%,0) 70%)`,
          opacity: whole,
        }}
      />
      <div style={{ position: 'absolute', inset: 0, perspective: 900, overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: PW,
            height: PH,
            margin: `${-PH / 2}px 0 0 ${-PW / 2}px`,
            transformStyle: 'preserve-3d',
            transform: `scale(${push})`,
          }}
        >
          {TILES.map((tl, i) => {
            const land = tl.delay + 0.34;
            const tin = seg(t, tl.delay, land, landEase);
            // 退场窗口收紧：最晚的角瓦片 0.79 起飞、0.97 前飞完（原 0.85 起飞导致 t=1 时还没出画）
            const tout = seg(t, 0.7 + tl.delay * 0.5, 0.7 + tl.delay * 0.5 + 0.18, E.inCubic);
            const inv = 1 - tin; // 入场：碎片态 → 就位
            // 入槽小摆：落位后 ~10f 内 rotateX 一次阻尼摆动（≤2.5°）+ 微微压进 z
            const since = (t - land) * T; // 落位后经过的帧数
            const settle = since > 0 && since < 14 ? Math.exp(-since / 3.2) * Math.sin(since * 0.75) : 0;
            const rx = tl.rx * inv + tl.wob * 2.5 * settle;
            const ry = tl.ry * inv;
            const rz = tl.rz * inv + tl.exR * tout;
            const tz = tl.dz * inv - 4 * Math.abs(settle);
            // 朝向明暗：法线越偏离镜头越暗（cosθ = cos rx · cos ry）
            const facing = Math.abs(Math.cos((rx * Math.PI) / 180) * Math.cos((ry * Math.PI) / 180));
            const shade = (1 - facing) * 0.6;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: tl.c * TW + SEAM / 2,
                  top: tl.r * TH + SEAM / 2,
                  width: TW - SEAM,
                  height: TH - SEAM,
                  borderRadius: 1.6,
                  overflow: 'hidden',
                  transform: `translate3d(${tl.dx * inv + tl.exX * tout}px,${tl.dy * inv + tl.exY * tout}px,${tz}px)
          rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`,
                  opacity: Math.min(1, tin * 2.5), // 退场不淡出，实体飞出画面
                  boxShadow: `inset 0 0.35px 0 rgba(255,255,255,0.16), inset 0 0 0 0.3px rgba(255,255,255,0.07)`,
                }}
              >
                {/* 这一格的海报切片（底图 + 字），按格位反向偏移 */}
                <div style={{ position: 'absolute', left: -tl.c * TW - SEAM / 2, top: -tl.r * TH - SEAM / 2, width: PW, height: PH, background: POSTER_BG }}>
                  <PosterType on={typeOn} />
                </div>
                {/* 朝向明暗 */}
                {shade > 0.004 && <div style={{ position: 'absolute', inset: 0, background: `rgba(4,6,12,${shade.toFixed(3)})` }} />}
              </div>
            );
          })}
        </div>
      </div>
    </DesignStage>
  );
};

export const Fracture: React.FC = () => {
  const t = useT();
  // 只给飞行段加运动模糊：聚合（t<0.53）与飞散（t>0.7）；hold 段读字，保持锐利
  const flying = t < 0.53 || t > 0.7;
  return (
    <AbsoluteFill>
      {flying ? (
        <CameraMotionBlur shutterAngle={170} samples={8}>
          <Scene />
        </CameraMotionBlur>
      ) : (
        <Scene />
      )}
      {/* 颗粒放在模糊之外（多重采样会把颗粒抹平） */}
      <Grain opacity={0.08} blend="soft-light" />
    </AbsoluteFill>
  );
};
