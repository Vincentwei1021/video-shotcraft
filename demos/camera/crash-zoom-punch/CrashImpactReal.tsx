// crash-impact 急推撞停（第二轮重设计）——同 crash-zoom 的急推，到位瞬间不回弹而是撞停震屏：
// 高频抖 + 指数衰减 6f，然后真静止。对比点：重量感（"就是它"）vs 回弹款的弹性感（"看这个"）。
//
// 设计决定
// - look：lime（石墨暗场 + 荧光黄绿）。和同卡的回弹款（ember · 后仰浏览器窗口 · 编辑式读数）拉开：
//   这一款是"战术 HUD"语言——真实 projects 页做成一块正视的监视屏，舞台铺淡网格；
//   一只荧光取景框在全景里扫描（card1 → card5 → card4，snappy 跳格），锁定 card4 后才急推。
// - 撞停的重量：到位帧一记"冲击帧"——卡外整片先被荧光黄绿占满（1f），3f 内压成近黑（重物砸地扬起的
//   一闪，而不是暖色曝光）；两道荧光冲击波环从卡缘向外扩散；震屏 14px·e^(−t/1.8)，首拍沿冲击方向下沉。
//   目标卡不浮起、不发光晕——是"砸实"不是"弹起"。全片只这一处作用于整画面（R4）。
// - 落定后：一道扫描线自上而下扫过卡面一次（Q4：唯一一次光效，裁进圆角），左右两栏 HUD 读数错峰落位：
//   左栏 TARGET / OWNER / STATE 等宽读数，右栏 240px 荧光「P0」+ 说明。尾帧是一张完整海报。
// - 截图纹理保留（Q1）；card4 用 4x 高清纹理覆盖原位，特写不糊字（Q2）。
//
// 时间表（30fps，126f）
//   0–4    全景：监视屏已在画面、网格与角标显影，舞台 zoom 0.78 起极缓推近 2%
//   4–30   扫描：取景框落 card1（4f）→ 10f 跳 card5 → 20f 跳 card4（各 8f snappy），28f 收紧锁定 + LOCK 标签
//   32–40  预备：zoom 回退 ~3%（smooth），取景框外扩一呼吸
//   40–46  急推 6f：log 空间强 ease-in 0.76→2.35，目标卡屏幕位置单调收向画面中心；只这段做时间采样运动模糊
//   46     撞停：冲击帧（46 荧光 / 47 余辉 / 48 起近黑）+ 冲击波环；46–52 震屏收干（清晰抖动，不加模糊）
//   52–68  扫描线扫过卡面（16f）；54–84 左右 HUD 读数错峰落位（标签 → 数值，3–4f 一拍）
//   84–125 hold 42f：极缓推近 1→1.012，尾帧干净落定
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import layout from '../../_textures/live-layout.json';
import { EASE, Grain, Vignette, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';

export const CRASHIMPACT_DUR = 126;

// lime 的主光换成偏冷的灰绿：舞台光不抢荧光强调色（荧光只给取景框 / 冲击 / P0）
const L = { ...LOOKS.lime, light: '#9aa58a' };
const LIME = L.accent;
const CARDS = layout.projects.cards;
const CARD = CARDS[3];
const TARGET = { cx: CARD.x + CARD.w / 2, cy: CARD.y + CARD.h / 2 }; // ≈ (960, 772) 页面坐标
const CARD_R = 8.5; // 截图里卡片圆角（页面 px）
// 监视屏取景（页面坐标）：以 card4 为中心裁一块，全景里看得到三排卡
const CROP = { x: 395, y: 222, w: 1130, h: 1100 };
const CROP_C = { x: CROP.x + CROP.w / 2, y: CROP.y + CROP.h / 2 };
const SCREEN_R = 22; // 监视屏圆角（页面 px）

const PUSH = 40;
const HIT = 46;
const Z_WIDE = 0.78;
const Z_HIT = 2.35; // 落定倍率：卡片 ≈ 840×733，占画高 68%，左右各留 ~540px 给 HUD 读数

// 相机：zoom + 目标卡中心的屏幕位置（插值"目标位置"而不是相机中心：急推时目标单调收向画面中心）
const camAt = (f: number) => {
  const creep = mix(Z_WIDE, Z_WIDE * 1.02, ramp(f, 0, 32, EASE.smooth));
  const wind = creep * mix(1, 0.97, ramp(f, 32, 8, EASE.smooth));
  const wideSx = 960 + (TARGET.cx - CROP_C.x) * wind;
  const wideSy = 540 + (TARGET.cy - CROP_C.y) * wind;
  if (f < PUSH) return { zoom: wind, sx: wideSx, sy: wideSy };
  const p = ramp(f, PUSH, HIT - PUSH, EASE.exit); // 到位即停：没有回弹段
  const zoom = Math.exp(mix(Math.log(wind), Math.log(Z_HIT), p)) * (1 + 0.012 * ramp(f, 84, 41, EASE.smooth));
  return { zoom, sx: mix(wideSx, 960, p), sy: mix(wideSy, 540, p) };
};

// 撞停震屏（屏幕空间，确定性）：cos 起相让第 0 帧取包络峰值且朝下（冲击方向延续），
// 频率 ~2.9 rad/f 使相邻帧几乎反号——高频"硬抖"而非手持晃；x 轴幅度 0.55、微旋转 0.025°/px
const shakeAt = (f: number) => {
  const t = f - HIT;
  if (t < 0) return { sx: 0, sy: 0, rot: 0 };
  const env = 14 * Math.exp(-t / 1.8);
  if (env < 0.15) return { sx: 0, sy: 0, rot: 0 };
  return { sx: env * 0.55 * Math.sin(t * 2.4 + 0.6), sy: env * Math.cos(t * 2.9), rot: env * 0.025 * Math.sin(t * 3.7 + 1.9) };
};

// 扫描取景框：依次落在 card1 → card5 → card4（页面坐标的中心与尺寸），snappy 跳格
const HOPS = [
  { at: 4, c: CARDS[0] },
  { at: 10, c: CARDS[4] },
  { at: 20, c: CARD },
];
const reticleAt = (f: number) => {
  const box = (c: typeof CARD) => ({ x: c.x + c.w / 2, y: c.y + c.h / 2, w: c.w, h: c.h });
  let r = box(HOPS[0].c);
  for (let i = 1; i < HOPS.length; i++) {
    const u = ramp(f, HOPS[i].at, 8, EASE.snappy);
    const b = box(HOPS[i].c);
    r = { x: mix(r.x, b.x, u), y: mix(r.y, b.y, u), w: mix(r.w, b.w, u), h: mix(r.h, b.h, u) };
  }
  return r;
};

// 一个相机姿态下的整个世界（监视屏 + 页面 + 取景框 + 冲击波），给运动模糊子帧复用
const World: React.FC<{ f: number; frame: number }> = ({ f, frame }) => {
  const { zoom, sx, sy } = camAt(f);
  const tx = sx - TARGET.cx * zoom;
  const ty = sy - TARGET.cy * zoom;
  const px = (n: number) => n / zoom; // 屏幕 px → 页面 px（线宽恒定）
  // 取景框
  const r = reticleAt(frame);
  const show = ramp(frame, 3, 6, EASE.out);
  const lock = ramp(frame, 28, 8, EASE.snappy);
  const breath = ramp(frame, 32, 8, EASE.smooth) * (1 - ramp(frame, PUSH, 5, EASE.exit));
  const pad = mix(26, 10, lock) + 16 * breath;
  const arm = px(30);
  const bx = r.x - r.w / 2 - pad, by = r.y - r.h / 2 - pad, bw = r.w + pad * 2, bh = r.h + pad * 2;
  // 撞停：卡外先冲击帧（荧光）→ 3f 压成近黑
  const t = frame - HIT;
  const crush = t >= 0;
  const impact = t < 0 ? 0 : t < 1 ? 0.8 : t < 2 ? 0.22 : 0; // 冲击帧：1f 荧光 → 1f 余辉 → 近黑
  const scrimColor = `rgba(${Math.round(mix(11, 198, impact))},${Math.round(mix(12, 244, impact))},${Math.round(mix(9, 50, impact))},${(t < 0 ? 0 : 1).toFixed(3)})`;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: layout.projects.pageH, transformOrigin: '0 0', transform: `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${zoom.toFixed(5)})` }}>
      {/* 监视屏：裁出 CROP 那一块页面；屏外是舞台 */}
      <div style={{
        position: 'absolute', left: CROP.x, top: CROP.y, width: CROP.w, height: CROP.h, borderRadius: SCREEN_R, overflow: 'hidden',
        background: '#f9f6f1',
        boxShadow: `0 0 0 ${px(1.5)}px ${alpha(LIME, 0.35)}, 0 ${px(40)}px ${px(110)}px ${px(-10)}px rgba(0,0,0,0.85)`,
      }}>
        <div style={{ position: 'absolute', left: -CROP.x, top: -CROP.y, width: 1920, height: layout.projects.pageH }}>
          <Img src={staticFile('textures/live/projects-full.png')} style={{ position: 'absolute', width: 1920 }} />
          {/* 全景时页面略压一档，和暗场舞台不打架 */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(12,14,10,0.1)' }} />
          {/* 扫描十字线：贯穿监视屏，跟着取景框中心走 */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: r.y, height: px(1.2), background: alpha('#2d3a00', 0.35 * show * (1 - lock * 0.6)) }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: r.x, width: px(1.2), background: alpha('#2d3a00', 0.35 * show * (1 - lock * 0.6)) }} />
        </div>
      </div>
      {/* 撞停压暗：卡外一圈极大 spread 影子当遮罩（冲击帧先荧光后近黑） */}
      {crush && (
        <div style={{ position: 'absolute', left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, borderRadius: CARD_R, boxShadow: `0 0 0 6000px ${scrimColor}` }} />
      )}
      {/* 压暗后的"桌面"：卡后一片极淡的冷灰光池，暗场不是死平底色（不是光晕——卡本身不发光） */}
      {crush && (
        <div style={{
          position: 'absolute', left: CARD.x - CARD.w * 1.6, top: CARD.y - CARD.h * 1.3, width: CARD.w * 4.2, height: CARD.h * 3.6,
          background: `radial-gradient(ellipse 50% 50% at 50% 46%, ${alpha('#c9d4b8', 0.09 * (1 - impact))}, ${alpha('#c9d4b8', 0)} 70%)`,
        }} />
      )}
      {/* 高清目标卡覆盖原位（Q2） */}
      <Img src={staticFile('textures/live/card4-hires.png')} style={{ position: 'absolute', left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, borderRadius: CARD_R }} />
      {/* 扫描线：落定后自上而下扫过卡面一次，裁进圆角（Q4） */}
      {frame >= 52 && frame <= 70 && (
        <div style={{ position: 'absolute', left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, borderRadius: CARD_R, overflow: 'hidden', pointerEvents: 'none' }}>
          {(() => {
            const y = mix(-0.12, 1.08, ramp(frame, 52, 16, EASE.swift)) * CARD.h;
            return (
              <>
                <div style={{ position: 'absolute', left: 0, right: 0, top: y - 60, height: 60, background: `linear-gradient(180deg, ${alpha(LIME, 0)}, ${alpha(LIME, 0.16)})` }} />
                <div style={{ position: 'absolute', left: 0, right: 0, top: y - px(1.5), height: px(3), background: alpha(LIME, 0.95), boxShadow: `0 0 ${px(14)}px ${alpha(LIME, 0.8)}` }} />
              </>
            );
          })()}
        </div>
      )}
      {/* 冲击波：两道圆角环从卡缘向外扩散（页面坐标、线宽屏幕恒定） */}
      {t >= 0 && t < 20 && [0, 3].map((d, k) => {
        const u = ramp(frame, HIT + d, 16, EASE.snappy);
        const grow = mix(0, k ? 60 : 110, u);
        const op = (1 - u) * (k ? 0.6 : 1) * (frame >= HIT + d ? 1 : 0);
        return (
          <div key={k} style={{
            position: 'absolute', left: CARD.x - grow, top: CARD.y - grow, width: CARD.w + grow * 2, height: CARD.h + grow * 2,
            borderRadius: CARD_R + grow * 0.5, border: `${px(k ? 2 : 4)}px solid ${alpha(LIME, op)}`, boxSizing: 'border-box',
            boxShadow: `0 0 ${px(20)}px ${alpha(LIME, op * 0.5)}`,
          }} />
        );
      })}
      {/* 卡缘：落定后一圈荧光发丝线（取景框的"已锁定"状态） */}
      {t >= 0 && (
        <div style={{ position: 'absolute', left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, borderRadius: CARD_R, boxShadow: `0 0 0 ${px(2)}px ${alpha(LIME, 0.9)}`, pointerEvents: 'none' }} />
      )}
      {/* 取景框角标（页面坐标；线宽按 zoom 反算，屏幕恒定 4px） */}
      {show > 0 && (
        <svg width={bw + 80} height={bh + 80} viewBox={`${bx - 40} ${by - 40} ${bw + 80} ${bh + 80}`}
          style={{ position: 'absolute', left: bx - 40, top: by - 40, overflow: 'visible', opacity: show }}>
          <g fill="none" stroke={LIME} strokeWidth={px(4)} strokeLinecap="square">
            <path d={`M${bx} ${by + arm} V${by} H${bx + arm}`} />
            <path d={`M${bx + bw - arm} ${by} H${bx + bw} V${by + arm}`} />
            <path d={`M${bx + bw} ${by + bh - arm} V${by + bh} H${bx + bw - arm}`} />
            <path d={`M${bx + arm} ${by + bh} H${bx} V${by + bh - arm}`} />
          </g>
          {/* 中心十字准星 */}
          <g stroke={LIME} strokeWidth={px(2)} opacity={1 - lock}>
            <path d={`M${r.x - px(14)} ${r.y} H${r.x + px(14)} M${r.x} ${r.y - px(14)} V${r.y + px(14)}`} />
          </g>
        </svg>
      )}
    </div>
  );
};

// 快门窗口内等权叠加：第 i 层不透明度 1/(i+1)，逐层 over 合成后恰为算术平均；子帧间距 ≤8px，封顶 36
const SHUTTER = 0.55;
const edgeAt = (f: number) => {
  const a = camAt(f), b = camAt(f - SHUTTER);
  return Math.abs(a.zoom - b.zoom) * 1100 + Math.hypot(a.sx - b.sx, a.sy - b.sy);
};

// HUD 读数（屏幕空间）：标签 → 数值，错峰落位
const Readout: React.FC<{ frame: number; at: number; label: string; children: React.ReactNode }> = ({ frame, at, label, children }) => {
  const a = ramp(frame, at, 12, EASE.snappy);
  return (
    <div style={{ marginBottom: 46 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, ...type(22, 600, { mono: true }), letterSpacing: '0.2em', color: LIME, opacity: a, textTransform: 'uppercase' }}>
        <span style={{ height: 2, width: mix(0, 28, a), background: LIME }} />
        {label}
      </div>
      <div style={{ marginTop: 12, opacity: ramp(frame, at + 3, 10, EASE.out), transform: `translateX(${((1 - ramp(frame, at + 3, 14, EASE.snappy)) * -24).toFixed(1)}px)` }}>{children}</div>
    </div>
  );
};

export const CrashImpactReal: React.FC = () => {
  const frame = useCurrentFrame();
  const { sx, sy, rot } = shakeAt(frame);
  const n = frame >= PUSH && frame <= HIT ? Math.max(1, Math.min(36, Math.ceil(edgeAt(frame) / 8))) : 1;
  const smear = n > 1 ? Math.min(4, (edgeAt(frame) / n) * 0.5 * Math.min(1, Math.max(0, (edgeAt(frame) - 60) / 200))) : 0;
  const wide = 1 - ramp(frame, PUSH, HIT - PUSH, EASE.exit);
  const vig = frame < HIT ? 0.35 + 0.25 * ramp(frame, PUSH, HIT - PUSH, EASE.exit) : mix(0.75, 0.4, ramp(frame, HIT, 16, EASE.out));
  // 取景框标签（屏幕空间，跟着全景里的取景框走；急推开始即收起）
  const cam = camAt(frame);
  const r = reticleAt(frame);
  const lock = ramp(frame, 28, 8, EASE.snappy);
  const tagX = cam.sx + (r.x - r.w / 2 - TARGET.cx) * cam.zoom - 12;
  const tagY = cam.sy + (r.y + r.h / 2 - TARGET.cy) * cam.zoom + 22; // 标签挂在取景框左下（首格 card1 在顶排，挂上沿会压到屏幕标题）
  const hop = frame < 10 ? '01' : frame < 20 ? '05' : '04';
  return (
    <AbsoluteFill style={{ background: L.bg[2], overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: -0.1 }} fill={{ x: 0.5, y: 1.1 }} intensity={0.6} breathe={0.4} vignette={0.2}>
        {/* 舞台网格：跟随相机 30% 的缩放做视差，急推后隐入暗场 */}
        <div style={{
          position: 'absolute', inset: -400, opacity: 0.55 * wide + 0.1,
          transform: `scale(${(1 + (cam.zoom / Z_WIDE - 1) * 0.3).toFixed(4)})`,
          backgroundImage: `linear-gradient(${alpha(LIME, 0.07)} 1.5px, transparent 1.5px), linear-gradient(90deg, ${alpha(LIME, 0.07)} 1.5px, transparent 1.5px)`,
          backgroundSize: '64px 64px', backgroundPosition: '400px 400px',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, #000 30%, transparent 80%)',
        }} />
      </Stage>

      {/* 震屏层：整页 + 遮罩 + 冲击波一起抖（2.35x 下页面远超画框，抖动不露边） */}
      <AbsoluteFill style={{ transform: `translate(${sx.toFixed(2)}px, ${sy.toFixed(2)}px) rotate(${rot.toFixed(4)}deg)` }}>
        {n > 1 ? (
          Array.from({ length: n }, (_, i) => (
            <AbsoluteFill key={i} style={{ opacity: 1 / (i + 1), filter: smear > 0.3 ? `blur(${smear.toFixed(2)}px)` : undefined }}>
              <World f={frame - (SHUTTER * i) / (n - 1)} frame={frame} />
            </AbsoluteFill>
          ))
        ) : (
          <World f={frame} frame={frame} />
        )}
      </AbsoluteFill>

      {/* 全景 HUD：监视屏上沿两角的等宽标签 + 取景框标签 */}
      <AbsoluteFill style={{ opacity: wide, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', left: 960 - (CROP.w / 2) * cam.zoom, top: 540 - (CROP.h / 2) * cam.zoom - 50, display: 'flex', gap: 14, alignItems: 'center', ...type(22, 600, { mono: true }), letterSpacing: '0.18em', color: L.ink2, opacity: ramp(frame, 0, 8, EASE.out) }}>
          <span style={{ width: 10, height: 10, borderRadius: 5, background: LIME, boxShadow: `0 0 12px ${alpha(LIME, 0.8)}` }} />
          LIVE · /PROJECTS
        </div>
        <div style={{ position: 'absolute', right: 960 - (CROP.w / 2) * cam.zoom, top: 540 - (CROP.h / 2) * cam.zoom - 50, ...type(22, 600, { mono: true }), letterSpacing: '0.18em', color: L.ink3 }}>
          10 PROJECTS · SCANNING
        </div>
        {frame >= 4 && (
          <div style={{
            position: 'absolute', left: tagX, top: tagY, height: 34, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: 4,
            background: lock > 0.5 ? LIME : alpha('#0b0d06', 0.85), color: lock > 0.5 ? L.onAccent : LIME,
            border: `1.5px solid ${LIME}`, ...type(22, 700, { mono: true }), letterSpacing: '0.14em',
            opacity: ramp(frame, 4, 4, EASE.out), transform: `scale(${mix(1.25, 1, ramp(frame, 28, 6, EASE.snappy)).toFixed(3)})`, transformOrigin: '0 0',
          }}>
            {lock > 0.5 ? `LOCK ${hop}` : `SCAN ${hop}`}
          </div>
        )}
      </AbsoluteFill>

      {/* 落定 HUD：左栏等宽读数，右栏 P0 */}
      {frame >= 52 && (
        <AbsoluteFill style={{ pointerEvents: 'none', transform: `translate(${(sx * 0.4).toFixed(2)}px, ${(sy * 0.4).toFixed(2)}px)` }}>
          <div style={{ position: 'absolute', left: 104, top: 262 }}>
            <Readout frame={frame} at={54} label="Target">
              <div style={{ ...type(64, 600, { mono: true }), color: L.ink }}>04<span style={{ color: L.ink3 }}>/10</span></div>
            </Readout>
            <Readout frame={frame} at={58} label="Owner">
              <div style={{ ...type(48, 600), color: L.ink }}>Yuki</div>
            </Readout>
            <Readout frame={frame} at={62} label="State">
              <div style={{ ...type(48, 600), color: L.ink, display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ width: 16, height: 16, borderRadius: 8, background: LIME, boxShadow: `0 0 16px ${alpha(LIME, 0.9)}` }} />
                Active
              </div>
            </Readout>
          </div>
          <div style={{ position: 'absolute', left: 1452, top: 258, width: 400 }}>
            <div style={{ ...type(22, 600, { mono: true }), letterSpacing: '0.2em', color: LIME, opacity: ramp(frame, 60, 10, EASE.out) }}>PRIORITY · THIS SPRINT</div>
            <div style={{ ...type(250, 800, { mono: true }), letterSpacing: '-0.04em', color: LIME, marginTop: 18, marginLeft: -12, textShadow: `0 0 60px ${alpha(LIME, 0.35)}` }}>
              <TextReveal text="P0" by="char" variant="rise" start={62} each={16} gap={3} />
            </div>
            <div style={{ height: 2, width: 360, marginTop: 28, background: alpha(L.ink, 0.18), transform: `scaleX(${ramp(frame, 70, 18, EASE.snappy).toFixed(4)})`, transformOrigin: '0 50%' }} />
            <div style={{ ...type(40, 500), color: L.ink, marginTop: 28 }}>
              <TextReveal text="7 open questions" by="word" variant="blur" start={74} each={14} gap={3} ease={EASE.out} />
            </div>
            <div style={{ ...type(32, 400), color: L.ink2, marginTop: 10 }}>
              <TextReveal text="Routing ships first." by="word" variant="blur" start={79} each={14} gap={3} ease={EASE.out} />
            </div>
          </div>
        </AbsoluteFill>
      )}
      <Vignette strength={vig} inner={0.4} color={L.shadow} cy={0.5} />
      <Grain opacity={0.07} blend="soft-light" />
    </AbsoluteFill>
  );
};
