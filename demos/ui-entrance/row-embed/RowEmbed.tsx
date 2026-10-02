// row-embed —— 内容行从空中降下、rotateX 收平、嵌入瞬间底边亮一道强调色的缝。
// "结构化数据长进页面"的详情页/列表镜头。飞行体 = 整页截图 backgroundImage 负偏移裁片（Q1：裁片不重绘内容）。
//
// 第二轮重设计（暖黑舞台 · 3D 俯拍升降 · 真高度落位）：
// - look = ember（暖黑 + 橙）：截图页面的强调色本就是赤橙（「研究问题」页签），舞台用同色系暖黑，
//   嵌入缝的橙光在两边都对得上。页面不再是铺满全屏的平面贴图，而是一张放在暖黑舞台上的"纸"——
//   顶部受光、远端压暗、底下一层大软影，开场就看得出它是个物体。
// - 机位：开场低角度斜俯（rotateX 44°、rotateZ −7°、页面 0.92 倍），行从页面上方 ~250px 的真实
//   3D 高度落下（translateZ，而不是 2D 平移），影子投在页面上、随高度降低收紧变实；
//   全程一条 crane：边落边把机位摇正、推近到正视（rotateX 0、1.6 倍、页面铺满画框）——
//   最后一行嵌入时恰好变成可读的正视列表（Q6：信息密集镜头落定为正视）。
// - 落位：行以底边为铰链、顶边抬起 16° 的姿态下落（铰链先着地、顶边再"合上"），
//   末段仍带速度砸进槽位 + 3f press 回弹；槽位先是页面真实底色补丁 + 虚线框占位，落地即消失（Q9）。
// - 嵌入缝：底边 3px 橙缝从中心 6f 向两侧展开 + 一层极淡的橙色行底光，10f 内收掉（每行一次、只在底边、裁在行宽内）。
// - 渲染清晰度（Q2）：页面平面按目标倍率直接布局（宽 = 1920·Z，背景图按同倍率铺），3D 只做旋转不做放大。
//
// 时间表（30fps，共 112f）：
//   0–12    预备：斜俯机位已在缓慢升起；五个空槽虚线框，首槽提亮
//   12–62   行雨：cue 12/24/34/42/49（间隔 12→7 递减，越落越快），每行 13f 飞行，落地 25/37/47/55/62
//   62–72   末行嵌入缝收尾
//   0–90    crane：rotateX 44→0、rotateZ −7→0、Z 0.92→1.6（不对称 in-out，后半程很软）
//   90–112  hold：正视列表，极缓推近 1.5%
import React from 'react';
import { AbsoluteFill, staticFile, useCurrentFrame } from 'remotion';
import { EASE, bezier, mix, ramp } from '../../_fixtures/Polish';
import { Dust, LOOKS, Stage, alpha } from '../../_fixtures/Look';
import layout from '../../_textures/live-layout.json';

export const ROW_EMBED_DURATION = 112;

const L = LOOKS.ember;
const PAGE_W = 1920;
const PAGE_H = layout.detail.pageH;
const rows = layout.detail.rows;
const PAGE_BG = '#f9f6f1'; // 截图里内容区的真实底色（逐像素采样）
const SEAM = '#e8642a'; // 页面自身的赤橙
const SRC = staticFile('textures/live/detail-full.png');

const CUES = [12, 24, 34, 42, 49];
const FLY = 13;
const LIFT = 250; // 起落高度（页面 px）
const TILT = 16; // 空中姿态：顶边抬起角度
// 下落：起步慢、末段仍带速度砸进槽位（终点斜率 >1），由 press 回弹吸收冲击
const FLY_EASE = bezier(0.5, 0, 0.8, 0.72);
const CRANE = bezier(0.55, 0, 0.25, 1);

// 页面里只取「研究问题」这一节做主体面板（页签 + 筛选 + 表格，真实截图裁片）
const PANEL = { x: 390, y: 520, w: 1140, h: 640 };
const Z_END = 1.38; // 正视落定倍率：面板 1573×883，四周留暖黑舞台

// 机位：开场斜俯 → 正视。焦点始终是面板中心
const camAt = (f: number) => {
  const t = CRANE(Math.min(1, Math.max(0, f / 86)));
  const hold = ramp(f, 86, 26, EASE.swift);
  return {
    rx: mix(40, 0, t),
    rz: mix(-6, 0, t),
    Z: mix(1.12, Z_END, t) * (1 + 0.015 * hold),
    cx: PANEL.x + PANEL.w / 2,
    cy: PANEL.y + PANEL.h / 2,
    lift: mix(40, 0, t),
  };
};

const airOf = (f: number, cue: number) => 1 - FLY_EASE(Math.min(1, Math.max(0, (f - cue) / FLY)));

export const RowEmbed: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camAt(f);
  const Z = cam.Z;
  const crop = (r: { x: number; y: number }): React.CSSProperties => ({
    backgroundImage: `url(${SRC})`,
    backgroundSize: `${PAGE_W * Z}px ${PAGE_H * Z}px`,
    backgroundPosition: `${-r.x * Z}px ${-r.y * Z}px`,
  });

  return (
    <AbsoluteFill style={{ background: L.bg[2] }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.14 }} fill={{ x: 0.9, y: 0.96 }} intensity={0.85} breathe={0.3}>
        <Dust look={L} count={26} seed={7} drift={0.18} opacity={0.35} />
      </Stage>

      {/* 3D 世界：原点在画面中心，页面焦点 (cx, cy) 落在原点 */}
      <AbsoluteFill style={{ perspective: 2200, perspectiveOrigin: '960px 380px' }}>
        <div style={{
          position: 'absolute', left: 960, top: 540 + cam.lift, width: 0, height: 0, transformStyle: 'preserve-3d',
          transform: `rotateX(${cam.rx.toFixed(3)}deg) rotateZ(${cam.rz.toFixed(3)}deg)`,
        }}>
          {/* 面板平面：一个 0×0 的 preserve-3d 容器，页面坐标 (px, py) → (px−cx, py−cy)·Z；
              按 Z 倍率直接布局（不做 3D 放大，字形按目标尺寸栅格化） */}
          <div style={{ position: 'absolute', left: -cam.cx * Z, top: -cam.cy * Z, width: PAGE_W * Z, height: PAGE_H * Z, transformStyle: 'preserve-3d' }}>
            {/* 面板：真实截图裁片 + 圆角 + 两层大软影 + 发丝边 */}
            <div style={{
              position: 'absolute', left: PANEL.x * Z, top: PANEL.y * Z, width: PANEL.w * Z, height: PANEL.h * Z, borderRadius: 22 * Z, overflow: 'hidden',
              backgroundColor: PAGE_BG, ...crop(PANEL),
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.9), 0 ${6 * Z}px ${16 * Z}px rgba(0,0,0,0.45), 0 ${50 * Z}px ${130 * Z}px ${-14 * Z}px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,220,190,0.14), 0 0 ${90 * Z}px ${alpha(L.light, 0.12)}`,
            }}>
              {/* 纸面受光：远端（上）压暗、近端暖光——斜俯时读作一张受光的纸，摇正后收成极淡的顶光 */}
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: `linear-gradient(180deg, rgba(50,22,8,${(0.06 + 0.26 * cam.rx / 40).toFixed(3)}) 0%, rgba(50,22,8,0) 45%), ` +
                  `radial-gradient(80% 60% at 50% 0%, rgba(255,240,222,0.18), rgba(255,240,222,0) 70%)`,
              }} />
            </div>
            {rows.map((r, i) => {
              const cue = CUES[i];
              const land = cue + FLY;
              const x = r.x * Z, y = r.y * Z, w = r.w * Z, h = r.h * Z;
              const patch = 1 - ramp(f, land, 2, EASE.linear);
              const hint = ramp(f, cue - 8, 10, EASE.out); // 槽位在行飞来前提亮（"这里"）
              const air = airOf(f, cue);
              const flying = f >= cue && f < land + 4;
              // press 回弹：落地后 4f 0.992→1
              const press = f >= land ? mix(0.992, 1, ramp(f, land, 4, EASE.out)) : 1;
              const scale = f < land ? 1 + 0.04 * air : press;
              const appear = ramp(f, cue, 3, EASE.linear);
              // 纵向速度 → 运动模糊（落地为 0）
              const v = LIFT * Z * (airOf(f - 0.5, cue) - airOf(f + 0.5, cue));
              const mb = f < land ? Math.min(5, v * 0.06) : 0;
              // 嵌入缝
              const spread = ramp(f, land, 6, EASE.snappy);
              const seamOp = f < land ? 0 : 1 - ramp(f, land + 3, 8, EASE.linear);
              return (
                <React.Fragment key={i}>
                  {patch > 0 && (
                    <div style={{ position: 'absolute', left: x - 8 * Z, top: y - 4 * Z, width: w + 24 * Z, height: h + 8 * Z, background: PAGE_BG, opacity: patch }}>
                      <div style={{
                        position: 'absolute', left: 8 * Z, top: 10 * Z, width: w, height: h - 12 * Z, borderRadius: 10 * Z, boxSizing: 'border-box',
                        border: `${Math.max(1.5, 1.6 * Z).toFixed(2)}px dashed rgba(170,90,40,${(0.28 + 0.3 * hint).toFixed(3)})`,
                        background: `rgba(232,100,42,${(0.025 + 0.05 * hint * (f < land ? 1 : 0)).toFixed(3)})`,
                      }} />
                    </div>
                  )}
                  {/* 投影：行越低越小越实，偏向近端（主光在后上方） */}
                  {flying && (
                    <div style={{
                      position: 'absolute', left: x + 14 * Z, top: y + (8 + 60 * air) * Z, width: w - 28 * Z, height: h - 8 * Z, borderRadius: 12 * Z,
                      background: `rgba(70,35,12,${(0.32 * (1 - 0.65 * air) * (f < land ? 1 : 1 - ramp(f, land, 3))).toFixed(3)})`,
                      filter: `blur(${((4 + 36 * air) * Z).toFixed(1)}px)`,
                    }} />
                  )}
                  {flying && (
                    <div style={{
                      position: 'absolute', left: x, top: y, width: w, height: h, opacity: appear,
                      transformOrigin: '50% 100%',
                      transform: `translateZ(${(LIFT * air * Z).toFixed(2)}px) rotateX(${(-TILT * air).toFixed(3)}deg) scale(${scale.toFixed(4)})`,
                      filter: mb > 0.3 ? `blur(${(mb * 0.5).toFixed(2)}px)` : undefined,
                    }}>
                      <div style={{
                        position: 'absolute', inset: 0, borderRadius: 10 * Z, overflow: 'hidden', backgroundColor: PAGE_BG, ...crop(r),
                        boxShadow: `inset 0 1px 0 rgba(255,255,255,${(0.9 * air).toFixed(3)}), 0 0 0 1px rgba(90,50,20,${(0.1 * air).toFixed(3)})`,
                      }}>
                        {/* 空中时行面带一点顶光，落地后与页面融为一体 */}
                        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(255,255,255,${(0.35 * air).toFixed(3)}), rgba(255,255,255,0) 60%)` }} />
                      </div>
                    </div>
                  )}
                  {/* 嵌入缝 + 行底光：落地瞬间从中心向两侧展开，裁在行宽内 */}
                  {seamOp > 0 && (
                    <>
                      <div style={{
                        position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 10 * Z, overflow: 'hidden', opacity: seamOp * 0.9,
                        background: `radial-gradient(60% 120% at 50% 100%, ${alpha(SEAM, 0.14)}, ${alpha(SEAM, 0)} 70%)`,
                      }} />
                      <div style={{
                        position: 'absolute', left: x + (w * (1 - spread)) / 2, top: y + h - 2 * Z, width: w * spread, height: 3 * Z, borderRadius: 2 * Z,
                        opacity: seamOp,
                        background: `linear-gradient(90deg, ${alpha(SEAM, 0)} 0%, ${SEAM} 16%, #ff9a52 50%, ${SEAM} 84%, ${alpha(SEAM, 0)} 100%)`,
                        boxShadow: `0 0 ${10 * Z}px ${alpha(SEAM, 0.55)}`,
                      }} />
                    </>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
