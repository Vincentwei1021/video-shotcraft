import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { FakeDashboard, Card, G } from '../../_fixtures/Fixtures';
import { EASE, Vignette, bezier, mix, ramp } from '../../_fixtures/Polish';

// anime-impact 动漫打击帧〔组合〕：crash-zoom 急推撞停在目标卡上的那 3 帧，
// 整幅画面反转成黑白负片 + 手绘放射集中线 + 红青通道 ±8px 色散——
// 像素被打了一拳，第 4 帧一切撤掉恢复干净特写 + 6px 震屏衰减。
// 节拍：0–22 建立全景（极缓 creep 1→1.012，目标卡 accent 描边亮起锁定）→
//       22–28 预备回拉到 0.985（拳头往后收）→ 28–34 急推（6f ease-in cubic 到 2.25x，
//       时间采样运动模糊）→ 34–36 冲击帧（3f 负片/集中线/RGB split，每帧换形态）→
//       37 起恢复干净特写 + 震屏衰减 + 暗角压一拍 → ~50–120 静止读卡（≥2s 呼吸）。

export const ANIME_IMPACT_DURATION = 120;

const WIND = 22; // 预备回拉起点
const ZOOM_START = 28;
const ZOOM_END = 34; // 撞停帧
const IMPACT_LEN = 3; // 冲击帧持续 3f（34/35/36）
const RECOVER = ZOOM_END + IMPACT_LEN; // 37：恢复干净特写

// 目标卡：盖在 3x2 网格中排第 2 格上（列 2 行 1）
const CARD = { x: 808, y: 108, w: 524, h: 454 };
const CX = CARD.x + CARD.w / 2; // 1070
const CY = CARD.y + CARD.h / 2; // 335
const SCALE_END = 2.25; // 卡高 454×2.25≈1021：撞停特写四周留 ~30px，描边不被画框切半
const ACCENT = G.accent;

const inCubic = bezier(0.55, 0.055, 0.675, 0.19); // ease-in cubic（md：6f ease-in(cubic)）

// seed 正弦哈希（禁 Math.random）
const rnd = (i: number) => {
  const s = Math.sin(i * 127.3) * 43758.5453;
  return s - Math.floor(s);
};

// 相机：全景极缓 creep → 预备回拉 → ease-in 急推；返回 scale 与推近进度 p（卡心收敛到画面正中）
const camAt = (f: number) => {
  const creep = mix(1, 1.012, ramp(f, 0, WIND, EASE.smooth));
  const wind = mix(creep, 0.985, ramp(f, WIND, ZOOM_START - WIND, EASE.smooth));
  const p = ramp(f, ZOOM_START, ZOOM_END - ZOOM_START, inCubic);
  const scale = f < ZOOM_START ? wind : mix(0.985, SCALE_END, p);
  return { scale, p };
};

const zoomStyle = (f: number): React.CSSProperties => {
  const { scale, p } = camAt(f);
  return {
    position: 'absolute',
    inset: 0,
    transform: `translate(${(960 - CX) * p}px, ${(540 - CY) * p}px) scale(${scale})`,
    transformOrigin: `${CX}px ${CY}px`,
  };
};

// 手绘放射集中线：外圈 34 根粗楔 + 22 根细针，内端落在卡周缘一带留出干净焦点；phase 每帧换形态
const SpeedLines: React.FC<{ phase: number }> = ({ phase }) => {
  const cx = 960;
  const cy = 540;
  const R_OUT = 1300; // 超出画框对角(~1101)
  const wedge = (i: number, n: number, k: number, r0Min: number, r0Var: number, wMin: number, wVar: number) => {
    const ang = ((i + 0.5) / n) * Math.PI * 2 + (rnd(k) - 0.5) * 0.24;
    const r0 = r0Min + rnd(k + 1) * r0Var; // 内端长短参差
    const halfW = (wMin + rnd(k + 2) * wVar) / R_OUT; // 外端宽度
    const ax = cx + Math.cos(ang) * r0 * 1.18; // 横向略拉长：焦点区是卡片的宽椭圆
    const ay = cy + Math.sin(ang) * r0;
    const p1 = `${cx + Math.cos(ang - halfW) * R_OUT},${cy + Math.sin(ang - halfW) * R_OUT}`;
    const p2 = `${cx + Math.cos(ang + halfW) * R_OUT},${cy + Math.sin(ang + halfW) * R_OUT}`;
    return `${ax},${ay} ${p1} ${p2}`;
  };
  const thick = Array.from({ length: 34 }, (_, i) => wedge(i, 34, i * 13 + phase * 101, 330, 230, 9, 22));
  const thin = Array.from({ length: 22 }, (_, i) => wedge(i + 0.37, 22, i * 29 + phase * 57 + 7, 420, 260, 2, 4));
  return (
    <svg viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <defs>
        {/* 焦点内缘柔化：集中线内端不是硬切，而是被一圈径向渐隐吃掉 */}
        <radialGradient id="ai-lines-fade" cx="960" cy="540" r="700" gradientUnits="userSpaceOnUse">
          <stop offset="0.38" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="1" />
        </radialGradient>
        <mask id="ai-lines-mask">
          <rect width="1920" height="1080" fill="url(#ai-lines-fade)" />
        </mask>
      </defs>
      <g mask="url(#ai-lines-mask)">
        {thick.map((pts, i) => (
          <polygon key={`a${i}`} points={pts} fill={i % 5 === 0 ? '#0d0e12' : '#f4f2ee'} />
        ))}
        {thin.map((pts, i) => (
          <polygon key={`b${i}`} points={pts} fill="#f4f2ee" opacity={0.85} />
        ))}
      </g>
    </svg>
  );
};

// 目标卡叠层 + 全景底；lock = 目标卡 accent 描边亮起进度（0–1）
const Scene: React.FC<{ lock: number }> = ({ lock }) => (
  <>
    <FakeDashboard variant="A" />
    <div style={{ position: 'absolute', left: CARD.x, top: CARD.y }}>
      <Card
        w={CARD.w}
        h={CARD.h}
        seed={9}
        style={{
          boxShadow:
            `0 0 0 ${(1.5 * lock).toFixed(2)}px ${ACCENT}, 0 0 0 ${(6 * lock).toFixed(2)}px rgba(91,99,211,${(0.14 * lock).toFixed(3)}), ` +
            `inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 4px rgba(16,18,24,0.06), 0 ${mix(6, 22, lock)}px ${mix(18, 48, lock)}px -10px rgba(16,18,24,${mix(0.1, 0.22, lock).toFixed(3)})`,
        }}
      />
    </div>
  </>
);

// 急推段时间采样运动模糊：快门 0.6f 内取 N 个子帧叠化（第 k 层 opacity 1/(k+1) = 等权平均），
// 每个子帧再按相邻子帧间距加一点高斯模糊把阶梯抹平；只给 28–33 的飞行帧，撞停帧本身锐利
const SHUTTER = 0.6;
const blurAt = (f: number) => {
  if (f <= ZOOM_START || f >= ZOOM_END) return { n: 1, sd: 0 };
  const a = camAt(f), b = camAt(f - SHUTTER);
  const edge = Math.abs(a.scale - b.scale) * 900 + Math.abs(a.p - b.p) * 160; // 画框边缘处位移 px
  const n = Math.max(1, Math.min(12, Math.ceil(edge / 10)));
  return { n, sd: n > 1 ? Math.min(6, (edge / (n - 1)) * 0.45) : 0 };
};

// 锐利中心遮罩：跟着卡心在屏幕上的位置走（transform-origin 在卡心，屏幕位置 = 卡心 + 平移）
const sharpMask = (f: number) => {
  const { p } = camAt(f);
  const x = ((CX + (960 - CX) * p) / 1920) * 100;
  const y = ((CY + (540 - CY) * p) / 1080) * 100;
  return `radial-gradient(ellipse 30% 34% at ${x.toFixed(1)}% ${y.toFixed(1)}%, #000 0%, rgba(0,0,0,0.85) 45%, transparent 100%)`;
};

export const AnimeImpact: React.FC = () => {
  const frame = useCurrentFrame();

  const lock = ramp(frame, 6, 14, EASE.out); // 目标卡描边亮起：观众先知道"拳头要落在哪"
  const impact = frame >= ZOOM_END && frame < RECOVER;
  const phase = impact ? frame - ZOOM_END : 0; // 每 1f 换一次集中线形态

  // 撞停后震屏：6px 起步、指数衰减 τ≈2.2f；cos 起相首拍沿推进方向"下沉"，相邻帧近乎反号的硬抖
  const since = frame - RECOVER;
  const env = since >= 0 ? 6 * Math.exp(-since / 2.2) : 0;
  const live = env > 0.12;
  const shakeX = live ? env * 0.7 * Math.sin(since * 2.5 + 0.6) : 0;
  const shakeY = live ? env * Math.cos(since * 2.9) : 0;
  const shakeR = live ? env * 0.04 * Math.sin(since * 3.3 + 1.7) : 0;

  // 撞停重量：暗角猛压一拍再退；目标卡外的页面压暗一点让特写"站出来"
  const hitK = frame >= RECOVER ? 1 - ramp(frame, RECOVER, 22, EASE.out) : 0;
  const vig = frame >= RECOVER ? mix(0.16, 0.42, hitK) : 0.12;

  const { n, sd } = blurAt(frame);

  return (
    <AbsoluteFill style={{ background: impact ? '#0d0e12' : G.bg, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate(${shakeX.toFixed(2)}px, ${shakeY.toFixed(2)}px) rotate(${shakeR.toFixed(3)}deg)`,
        }}
      >
        {/* 主层：冲击帧期间整幅高反差黑白负片；急推段 n>1 时做时间采样运动模糊 */}
        <div style={{ position: 'absolute', inset: 0, filter: impact ? 'invert(1) grayscale(1) contrast(1.45)' : 'none' }}>
          {Array.from({ length: n }, (_, k) => (
            <div
              key={k}
              style={{
                ...zoomStyle(frame - (SHUTTER * k) / Math.max(1, n - 1)),
                opacity: k === 0 ? 1 : 1 / (k + 1),
                filter: sd > 0.3 ? `blur(${sd.toFixed(2)}px)` : undefined,
              }}
            >
              <Scene lock={lock} />
            </div>
          ))}
          {/* 变焦模糊的径向性：画心（推进中心）位移最小 → 叠一层当前帧的锐利副本，径向遮罩只留中心 */}
          {n > 1 && (
            <div
              style={{
                position: 'absolute', inset: 0,
                WebkitMaskImage: sharpMask(frame),
                maskImage: sharpMask(frame),
              }}
            >
              <div style={zoomStyle(frame)}>
                <Scene lock={lock} />
              </div>
            </div>
          )}
        </div>
        {/* RGB split：红/青双层负片副本，screen 叠底、±8px 错位（随 phase 换向） */}
        {impact && (
          <>
            {[
              { dx: -8, dy: phase % 2 === 0 ? 4 : -4, tint: '#ff2a4a' },
              { dx: 8, dy: phase % 2 === 0 ? -4 : 4, tint: '#16e0ff' },
            ].map((c, i) => (
              <div
                key={i}
                style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen', transform: `translate(${c.dx}px, ${c.dy}px)`, isolation: 'isolate' }}
              >
                <div style={{ ...zoomStyle(frame), filter: 'invert(1) grayscale(1) contrast(1.45)' }}>
                  <Scene lock={lock} />
                </div>
                <div style={{ position: 'absolute', inset: 0, background: c.tint, mixBlendMode: 'multiply' }} />
              </div>
            ))}
            {/* 手绘放射集中线：每帧换形态 */}
            <SpeedLines phase={phase} />
          </>
        )}
        {/* 恢复后：目标卡外压暗（卡外大 spread 阴影当遮罩，随特写坐标走） */}
        {frame >= RECOVER && (
          <div style={zoomStyle(frame)}>
            <div
              style={{
                position: 'absolute', left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, borderRadius: 14,
                boxShadow: `0 0 0 3000px rgba(14,15,20,${mix(0.1, 0.22, hitK).toFixed(3)})`,
              }}
            />
          </div>
        )}
      </div>
      {!impact && <Vignette strength={vig} inner={0.5} color="#0b0c12" />}
    </AbsoluteFill>
  );
};
