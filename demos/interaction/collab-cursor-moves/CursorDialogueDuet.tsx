// cursor-dialogue-duet —— figma-devmode 0:16–0:20
// 两枚具名协作光标在纯暗场演一场"设计 → 开发"交接的双人戏：入场 → 对话 → 绕位交换 → 话语权移交 →
// 一枚冲向镜头放大成巨箭头，整屏遮挡当转场，落成一张海报。
//
// 第二轮重设计（剧场 · 追光）：
// - look = graphite（近单色石墨暗场）+ 两枚身份色：Designer 冷调长春花蓝 / Developer 暖调琥珀。
//   舞台是黑匣子剧场：顶上一盏钨丝色追光（体积光锥 + 地面光池）钉在台口左侧的"说话位"，
//   听的人站在暗处（光标去饱和、名牌压暗）——"灯光交接"是绕位时一个走出光、一个走进光。
// - 光标升格为演员：放大到 ~112px 高（矢量 SVG，任意倍率都锐利），名牌在说话时展开成 cursor chat
//   气泡、逐字打出台词（48px，要读）——"Specs are final." / "Shipping tonight."，剧情一眼可读。
// - 绕位交换：两枚以各自起止中点为圆心同向转半圈（Designer 走上弧、Developer 走下弧，礼让），
//   纵向压扁成扁弧（不出画）；快段按速度加方向性运动模糊。
// - 收尾：Developer 先后缩一拍（预备）再冲向镜头——缩放走对数空间的 ease-in（指数级加速），
//   箭头体内一点锚定到画面中心，~22f 后琥珀色整屏遮挡（可藏切点），遮挡面上升起标题，成一张海报。
//
// 时间表（30fps，共 216f）：
//   0–28     Designer 从左下贝塞尔入场（snappy），追光同时亮起（开场第 1 帧已有舞台光与光锥）
//   8–36     Developer 从右上入场，停在暗处
//   34–52    Designer 名牌展开成气泡，逐字打出 "Specs are final."（~1.1f/字）
//   52–66    hold：台词可读（R1）；Developer 微微探身
//   64–72    Designer 气泡收回成名牌
//   66–102   绕位交换（36f，smooth in-out）；追光钉在说话位，谁走进光谁亮（按距离算亮度）
//   100–124  Developer 气泡展开、打出 "Shipping tonight."
//   124–136  hold
//   136–144  预备：Developer 后缩 12%（swift）
//   142–162  冲镜：对数缩放 ease-in，5.6 → 380 px/单位；Designer 被吞没，追光随之收掉
//   158–190  遮挡面海报：眉题 + 两行标题逐词从线下升起 + 副标题；174–196 Designer 回到句尾（谢幕）
//   196–216  hold（遮挡面光极缓呼吸）
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, ramp, mix, SpeedBlur } from '../../_fixtures/Polish';
import { LOOKS, Stage, Dust, TextReveal, alpha, type, TYPE } from '../../_fixtures/Look';

export const CURSOR_DIALOGUE_DUET_DURATION = 216;

const L = LOOKS.graphite;
const BLUE = '#8fb0ff'; // Designer 身份色（冷）
const AMBER = '#f2b347'; // Developer 身份色（暖）——也是收尾遮挡面的颜色
const TUNGSTEN = '#f4e3c4'; // 追光色温
const INK_ON = '#0d0f14'; // 名牌/气泡上的字

type P = [number, number];
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const bez = (t: number, p0: P, c1: P, c2: P, p3: P): P => {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p3[1],
  ];
};

// hex 混色（光标"站在暗处"时往石墨灰去饱和）
const hexRgb = (h: string) => {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mixHex = (a: string, b: string, t: number) => {
  const A = hexRgb(a), B = hexRgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
};

// 光标矢量（viewBox 单位，尖端在 0.5,0.5）；K = 每单位像素（20 单位高 → 100px 高）
const ARROW = 'M0.5 0.5 L0.5 17.2 L4.7 13.4 L7.3 19.5 L10 18.3 L7.4 12.3 L13 12.3 Z';
const K = 5.6;
// 冲镜锚点：箭头三角主体内离各边都 ≥3.4 单位的一点——放大后它到画面中心，整屏都被箭头体覆盖
const ANCHOR: P = [4.0, 8.5];
const K_END = 380; // 3.4 单位 × 380 ≈ 1290px > 半对角线 1101px

// ── 时间点 ──
const D_IN = 0, G_IN = 8;
const D_SAY0 = 34, D_MSG = 'Specs are final.';
const D_FOLD = 64;
const SWAP0 = 66, SWAP1 = 102;
const G_SAY0 = 100, G_MSG = 'Shipping tonight.';
const ANTIC = 136;
const ZOOM0 = 142, ZOOM1 = 162;
const POSTER = 158;
const REPRISE = 174; // Designer 回到海报上
const CPS = 1.1; // 每字帧数（cursor chat 打字快）

// 对话位（尖端坐标）：Designer 左下、Developer 右上——气泡向右下展开，彼此不压
const D_TALK: P = [540, 430];
const G_TALK: P = [1250, 372];
// 追光打在"台口左侧的说话位"上，基本不动——两人绕位时 Designer 走出光、Developer 走进光，
// 话语权移交是物理上谁站在光里（亮度按到光心的距离算），而不是两盏灯各自渐变
const SPOT: P = [D_TALK[0] + 46, D_TALK[1] + 70];

// 半圈绕位：以起止中点为圆心转 π（屏幕 y 向下，角度增大 = 顺时针；左侧起步走上弧、右侧起步走下弧）
const orbit = (s: P, e: P, t: number): P => {
  const m: P = [(s[0] + e[0]) / 2, (s[1] + e[1]) / 2];
  const vx = s[0] - m[0], vy = s[1] - m[1];
  const a = Math.PI * t;
  const r = 1 + 0.1 * Math.sin(Math.PI * t); // 弧中段微外扩
  const rx = vx * Math.cos(a) - vy * Math.sin(a);
  const ry = vx * Math.sin(a) + vy * Math.cos(a);
  return [m[0] + rx * r, m[1] + ry * r * (1 - 0.45 * Math.sin(Math.PI * t))]; // 纵向压扁成扁弧，不出画
};

// 站定时极轻的"呼吸"（双频，人手不是钉死的）
const idle = (f: number, ph: number, amp: number): P => [
  (Math.sin(f * 0.07 + ph) * 5 + Math.sin(f * 0.031 + ph * 2) * 3) * amp,
  (Math.cos(f * 0.06 + ph * 1.3) * 4 + Math.cos(f * 0.023 + ph) * 3) * amp,
];

const designerPre = (f: number): P => {
  const t = ramp(f, D_IN, 28, EASE.snappy);
  const p = bez(t, [-180, 760], [120, 760], [360, 380], D_TALK);
  const i = idle(f, 0.4, clamp01((f - 24) / 12));
  return [p[0] + i[0], p[1] + i[1]];
};
const developerPre = (f: number): P => {
  const t = ramp(f, G_IN, 28, EASE.snappy);
  const p = bez(t, [2120, 180], [1800, 120], [1420, 420], G_TALK);
  // 听到台词后微微探身（向 Designer 靠 34px）
  const lean = ramp(f, 50, 14, EASE.swift);
  const i = idle(f, 2.1, clamp01((f - 32) / 12));
  return [p[0] - 34 * lean + i[0], p[1] + 8 * lean + i[1]];
};

const designerAt = (f: number): P => {
  if (f <= SWAP0) return designerPre(f);
  const t = ramp(f, SWAP0, SWAP1 - SWAP0, EASE.smooth);
  const p = orbit(designerPre(SWAP0), G_TALK, t);
  const i = idle(f, 0.4, clamp01((f - SWAP1) / 12));
  return [p[0] + i[0], p[1] + i[1]];
};
const developerSwap = (f: number): P => {
  const t = ramp(f, SWAP0, SWAP1 - SWAP0, EASE.smooth);
  const p = orbit(developerPre(SWAP0), D_TALK, t);
  const i = idle(f, 2.1, clamp01((f - SWAP1) / 12));
  return [p[0] + i[0], p[1] + i[1]];
};

// Developer 的尖端位置与倍率（含预备 + 冲镜）
const developerAt = (f: number): { tip: P; k: number } => {
  if (f <= SWAP0) return { tip: developerPre(f), k: K };
  if (f <= ANTIC) return { tip: developerSwap(f), k: K };
  // 预备：绕锚点后缩 12%
  const base = developerSwap(Math.min(f, ZOOM0));
  const a = ramp(f, ANTIC, 8, EASE.swift);
  const k0 = K * (1 - 0.12 * a);
  const s0: P = [base[0] + ANCHOR[0] * K, base[1] + ANCHOR[1] * K]; // 锚点屏幕位置
  if (f <= ZOOM0) return { tip: [s0[0] - ANCHOR[0] * k0, s0[1] - ANCHOR[1] * k0], k: k0 };
  const kA = K * 0.88;
  const z = clamp01((f - ZOOM0) / (ZOOM1 - ZOOM0));
  const k = kA * Math.exp(Math.log(K_END / kA) * Math.pow(z, 2.4)); // 对数空间 ease-in：指数级加速冲镜
  const c = EASE.snappy(z); // 锚点先到中心，放大后才不会偏
  const s: P = [mix(s0[0], 960, c), mix(s0[1], 540, c)];
  return { tip: [s[0] - ANCHOR[0] * k, s[1] - ANCHOR[1] * k], k };
};

// 速度（px/帧，带 9px/帧 死区：慢动作不糊，只有绕位快段出拖影）
const vel = (fn: (f: number) => P, f: number): P => {
  const a = fn(f - 0.5), b = fn(f + 0.5);
  const vx = b[0] - a[0], vy = b[1] - a[1];
  const sp = Math.hypot(vx, vy);
  const k = sp > 1e-6 ? Math.max(0, sp - 9) / sp : 0;
  return [vx * k, vy * k];
};

// 名牌 → cursor chat 气泡：说话时展开第二行、逐字打字（宽度随字自然长，像真的 cursor chat）
const Badge: React.FC<{
  tip: P; k: number; color: string; name: string; lit: number; open: number; text: string; shown: number; caret: boolean; opacity: number;
}> = ({ tip, k, color, name, lit, open, text, shown, caret, opacity }) => {
  const bg = mixHex(color, '#3a3c42', (1 - lit) * 0.72);
  return (
    <div style={{
      position: 'absolute', left: tip[0] + 9.2 * k, top: tip[1] + 17.4 * k, opacity: opacity * (0.42 + 0.58 * lit),
      background: `linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0) 45%), ${bg}`,
      borderRadius: `8px ${26 + 4 * open}px ${26 + 4 * open}px ${26 + 4 * open}px`,
      padding: `${10 + 6 * open}px ${22 + 6 * open}px ${12 + 8 * open}px`,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.35), 0 10px 30px -8px rgba(0,0,0,0.7)` +
        (lit > 0.5 ? `, 0 0 ${40 * lit}px ${alpha(color, 0.28 * lit)}` : ''),
      whiteSpace: 'nowrap', color: INK_ON, fontFamily: type(30).fontFamily,
    }}>
      <div style={{ ...type(28, 720), letterSpacing: '-0.01em', opacity: 0.62 + 0.38 * (1 - open) }}>{name}</div>
      {open > 0.01 && (
        <div style={{
          ...type(48, 680), height: 56 * EASE.snappy(open), maxWidth: 760 * open * open, overflow: 'hidden', marginTop: 4 * open,
          display: 'flex', alignItems: 'center',
        }}>
          <span style={{ opacity: clamp01(open * 2.2 - 1.2) }}>{text.slice(0, shown)}</span>
          <span style={{
            display: 'inline-block', width: 4, height: 44, marginLeft: 3, borderRadius: 2, background: INK_ON,
            opacity: caret ? 0.85 * clamp01(open * 2 - 1) : 0,
          }} />
        </div>
      )}
    </div>
  );
};

// 矢量光标（全画幅 SVG 里按 tip/k 变换，冲镜放大到 380× 仍是矢量锐利）
const CursorShape: React.FC<{ tip: P; k: number; color: string; lit: number; id: string }> = ({ tip, k, color, lit, id }) => {
  const fill = mixHex(color, '#4a4c52', (1 - lit) * 0.62);
  const big = k > 12;
  return (
    <g transform={`translate(${tip[0].toFixed(2)} ${tip[1].toFixed(2)}) scale(${k.toFixed(4)})`}>
      <defs>
        <linearGradient id={`cf-${id}`} x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor={mixHex(color, '#ffffff', 0.28 * lit)} />
          <stop offset="1" stopColor={fill} />
        </linearGradient>
      </defs>
      <path d={ARROW} fill={`url(#cf-${id})`} stroke="#f6f4ef" strokeWidth={1.05}
        strokeLinejoin="round" filter={big ? undefined : `url(#cs-${id})`} />
    </g>
  );
};

export const CursorDialogueDuet: React.FC = () => {
  const f = useCurrentFrame();

  const dTip = designerAt(f);
  const G = developerAt(f);
  const dv = vel(designerAt, f);
  const gv = f > ANTIC ? ([0, 0] as P) : vel((x) => developerAt(x).tip, f);

  // 话语权 = 谁站在追光里：亮度按光标身体到光心的距离（120px 内全亮，340px 外全暗）
  const litAt = (p: P) => 1 - EASE.smooth(clamp01((Math.hypot(p[0] + 3 * K - SPOT[0], p[1] + 6 * K - SPOT[1]) - 120) / 220));
  const dLit = litAt(dTip);
  const gLit = f > ANTIC ? 1 : litAt(G.tip);
  const hand = clamp01(gLit / Math.max(1e-3, dLit + gLit));

  // 气泡开合与打字
  const dOpen = ramp(f, D_SAY0, 7, EASE.snappy) * (1 - ramp(f, D_FOLD, 8, EASE.swift));
  const dShown = Math.floor(clamp01((f - D_SAY0 - 4) / (D_MSG.length * CPS)) * D_MSG.length + 1e-6);
  const gOpen = ramp(f, G_SAY0, 7, EASE.snappy);
  const gShown = Math.floor(clamp01((f - G_SAY0 - 4) / (G_MSG.length * CPS)) * G_MSG.length + 1e-6);
  const caret = Math.floor(f / 8) % 2 === 0;

  // 追光：光心基本钉在说话位，只极轻地跟一下光里的人（≤12%）
  const who = hand > 0.5 ? developerAt(Math.min(f, ANTIC)).tip : dTip; // 冲镜段光心不跟巨箭头跑
  const sx = SPOT[0] + (who[0] + 3 * K - SPOT[0]) * 0.12;
  const sy = SPOT[1] + (who[1] + 6 * K - SPOT[1]) * 0.12;
  const rigX = 960 + (sx - 960) * 0.3; // 灯架在顶部中央，灯头随演员转
  const FLOOR = 880;
  const spotOn = ramp(f, 0, 20, EASE.out) * (1 - ramp(f, ZOOM1 - 6, 8, EASE.out));

  // 冲镜进度 / 遮挡面
  const zoomT = clamp01((f - ZOOM0) / (ZOOM1 - ZOOM0));
  const cover = ramp(f, POSTER - 2, 6, EASE.out);
  const dGone = 1 - ramp(f, ZOOM0 + 6, 8, EASE.exit);
  const breathe = 1 + 0.04 * Math.sin((f - POSTER) / 20);

  const stageFade = 1 - ramp(f, ZOOM0, 16, EASE.smooth) * 0.4;

  return (
    <AbsoluteFill style={{ background: L.bg[2], overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: -0.1 }} fill={null} intensity={0.55} vignette={0.7} style={{ opacity: stageFade }}>
        {/* 黑匣子后幕：极淡的竖向褶光，给暗场一点空间纵深 */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.5,
          background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0.018) 60px, rgba(255,255,255,0) 120px)',
          WebkitMaskImage: 'linear-gradient(180deg, #000 0%, rgba(0,0,0,0.4) 70%, transparent 82%)',
          maskImage: 'linear-gradient(180deg, #000 0%, rgba(0,0,0,0.4) 70%, transparent 82%)',
        }} />
        {/* 舞台地面：地平线一道冷色反光 + 往近处渐亮的台面 */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: FLOOR - 140, bottom: 0,
          background: `linear-gradient(180deg, rgba(200,204,214,0) 0%, rgba(200,204,214,0.035) 40%, rgba(200,204,214,0.06) 100%)`,
        }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: FLOOR - 141, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.08) 70%, transparent)' }} />
        <Dust look={L} count={30} seed={7} drift={0.18} opacity={0.35} color={TUNGSTEN} />
      </Stage>

      {/* 追光：体积光锥（SVG 多边形 + 高斯模糊）+ 地面光池 + 演员身后的光晕 */}
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: spotOn, mixBlendMode: 'screen' }}>
        <defs>
          <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={TUNGSTEN} stopOpacity={0.34} />
            <stop offset="0.55" stopColor={TUNGSTEN} stopOpacity={0.1} />
            <stop offset="1" stopColor={TUNGSTEN} stopOpacity={0.05} />
          </linearGradient>
          <filter id="beamBlur" x="-30%" y="-10%" width="160%" height="120%"><feGaussianBlur stdDeviation="16" /></filter>
          <radialGradient id="pool" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={TUNGSTEN} stopOpacity={0.3} />
            <stop offset="1" stopColor={TUNGSTEN} stopOpacity={0} />
          </radialGradient>
        </defs>
        <polygon filter="url(#beamBlur)" fill="url(#beam)"
          points={`${rigX - 26},-40 ${rigX + 26},-40 ${sx + 330},${FLOOR + 20} ${sx - 330},${FLOOR + 20}`} />
        <ellipse cx={sx} cy={FLOOR + 10} rx={380} ry={70} fill="url(#pool)" />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, opacity: spotOn,
        background: `radial-gradient(circle 360px at ${sx}px ${sy}px, ${alpha(BLUE, 0.16 * dLit)} 0%, ${alpha(BLUE, 0)} 70%), ` +
          `radial-gradient(circle 360px at ${sx}px ${sy}px, ${alpha(AMBER, 0.16 * gLit)} 0%, ${alpha(AMBER, 0)} 70%)`,
      }} />
      {/* 地面接触影：演员越高影越淡越大 */}
      {[{ p: dTip, o: dGone }, { p: G.tip, o: 1 - zoomT }].map((c, i) => (
        <div key={i} style={{
          position: 'absolute', left: c.p[0] + 4 * K - 120, top: FLOOR - 24, width: 240, height: 48, borderRadius: '50%',
          background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0,0,0,0.55), rgba(0,0,0,0))',
          opacity: c.o * (0.35 + 0.4 * (c.p[1] / FLOOR)),
        }} />
      ))}

      {/* 眉题：剧场场记式的小标（纹理级，不抢戏） */}
      <div style={{
        position: 'absolute', left: 120, top: 96, ...type(TYPE.label, 600, { caps: true }), letterSpacing: '0.32em',
        color: L.ink3, opacity: ramp(f, 4, 16) * (1 - ramp(f, ZOOM0, 8)),
      }}>
        Fathom <span style={{ margin: '0 14px', color: L.ink3 }}>—</span> Live handoff
      </div>

      {/* 演员层：Designer（先画，被 Developer 的巨箭头吞没） */}
      <SpeedBlur vx={dv[0]} vy={dv[1]} amount={0.1} max={6}>
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible', opacity: dGone }}>
          <defs>
            <filter id="cs-d" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0.5" stdDeviation="0.6" floodColor="#000" floodOpacity="0.6" />
            </filter>
          </defs>
          <CursorShape tip={dTip} k={K} color={BLUE} lit={0.25 + 0.75 * dLit} id="d" />
        </svg>
        <Badge tip={dTip} k={K} color={BLUE} name="Designer" lit={dLit} open={dOpen} text={D_MSG} shown={dShown}
          caret={caret || dShown < D_MSG.length} opacity={ramp(f, 12, 12, EASE.out) * dGone} />
      </SpeedBlur>
      <SpeedBlur vx={gv[0]} vy={gv[1]} amount={0.1} max={6}>
        <Badge tip={G.tip} k={K} color={AMBER} name="Developer" lit={gLit} open={gOpen} text={G_MSG} shown={gShown}
          caret={caret || gShown < G_MSG.length} opacity={ramp(f, 20, 12, EASE.out) * (1 - ramp(f, ANTIC, 8, EASE.exit))} />
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          <defs>
            <filter id="cs-g" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0.5" stdDeviation="0.6" floodColor="#000" floodOpacity="0.6" />
            </filter>
          </defs>
          <CursorShape tip={G.tip} k={G.k} color={AMBER} lit={0.25 + 0.75 * gLit} id="g" />
        </svg>
      </SpeedBlur>

      {/* 遮挡面海报：巨箭头盖满后，屏幕空间补一层光（左上亮、右下暗）+ 颗粒，再升起标题 */}
      {f >= POSTER - 2 && (
        <AbsoluteFill style={{ opacity: cover }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse 80% 90% at 22% 18%, #ffd27a ${0}%, ${AMBER} 46%, #d98f22 100%)`,
          }} />
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.55 * breathe,
            background: 'radial-gradient(ellipse 50% 60% at 30% 40%, rgba(255,246,220,0.45) 0%, rgba(255,246,220,0) 70%)',
          }} />
          {/* 箭头尖角的剪影：右下角一角暗面，提示"这是那枚光标的身体" */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,0,0,0) 72%, rgba(90,44,0,0.16) 100%)' }} />
          <div style={{ position: 'absolute', left: 150, top: 330 }}>
            <div style={{ ...type(TYPE.label + 4, 700, { caps: true }), letterSpacing: '0.34em', color: 'rgba(40,22,0,0.62)', marginBottom: 34 }}>
              <TextReveal text="Fathom · Live handoff" by="word" variant="blur" start={POSTER + 2} each={14} gap={3} />
            </div>
            <div style={{ ...type(TYPE.h1 + 24, 820), color: '#1c1003' }}>
              <TextReveal text="Handoff," by="word" variant="rise" start={POSTER + 3} each={16} />
            </div>
            <div style={{ ...type(TYPE.h1 + 24, 820), color: '#1c1003', marginTop: 6 }}>
              <TextReveal text="without the handoff." by="word" variant="rise" start={POSTER + 7} each={16} gap={3} />
            </div>
            <div style={{ ...type(TYPE.body, 500), color: 'rgba(40,22,0,0.7)', marginTop: 40 }}>
              <TextReveal text="Design and code, live in the same file." by="word" variant="blur" start={POSTER + 13} each={14} gap={2} />
            </div>
          </div>
          {/* 谢幕：Designer 从右下回到画面，停在标题句尾——两个人仍在同一个文件里 */}
          {f >= REPRISE && (() => {
            const r = ramp(f, REPRISE, 22, EASE.snappy);
            const i = idle(f, 0.4, clamp01((f - REPRISE - 16) / 10));
            const tip: P = [mix(2060, 1452, r) + i[0], mix(1240, 590, r) + i[1]];
            return (
              <>
                <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
                  <defs>
                    <filter id="cs-r" x="-50%" y="-50%" width="200%" height="200%">
                      <feDropShadow dx="0" dy="1.2" stdDeviation="1.4" floodColor="#4a2600" floodOpacity="0.35" />
                    </filter>
                  </defs>
                  <CursorShape tip={tip} k={K} color={BLUE} lit={1} id="r" />
                </svg>
                <Badge tip={tip} k={K} color={BLUE} name="Designer" lit={1} open={0} text="" shown={0} caret={false}
                  opacity={ramp(f, REPRISE + 8, 10, EASE.out)} />
              </>
            );
          })()}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
