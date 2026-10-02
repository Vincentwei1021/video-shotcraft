// slide-spotlight-pan v2 —— 按用户截图 clickup03 重做：
// 紫色光线贴着 UI 面板边缘泛光（先绕左上角竖缘、再沿顶边横走），
// 聚光头匀速右移，照到处显影、离开处沉暗；面板匀速左滑（相机右摇感）。
// 用户裁决："紫色的光线是贴着ui界面泛光的，聚光的移动是匀速的"。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { BRAND, ShotcraftMark } from '../../_fixtures/Brand';

const ink = '#3c3c3a';
const mid = '#98989a';
const line = '#e4e4e2';

const PW = 3000;
const PH = 1400;
const TOP = 150;   // 面板顶边在屏幕座标的 y
const CR = 60;     // 面板圆角

const SideRow: React.FC<{ w: number }> = ({ w }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16, height: 44 }}>
    <div style={{ width: 26, height: 26, borderRadius: 7, background: mid }} />
    <div style={{ height: 15, width: w, background: '#c6c6c4', borderRadius: 7 }} />
  </div>
);

const Task: React.FC<{ seed: number }> = ({ seed }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 13, padding: '26px 0' }}>
    <div style={{ height: 13, width: 210 + (seed % 3) * 30, background: line, borderRadius: 6 }} />
    <div style={{ height: 17, width: 260 + ((seed * 7) % 4) * 26, background: '#aeaeac', borderRadius: 8 }} />
    <div style={{ width: 22, height: 16, background: '#d6d6d4', borderRadius: 3 }} />
  </div>
);

const Col: React.FC<{ accent: string; seed: number; w: number }> = ({ accent, seed, w }) => (
  <div style={{ width: w, flexShrink: 0 }}>
    <div style={{ borderTop: `6px solid ${accent}`, paddingTop: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ height: 20, width: 120, background: '#525250', borderRadius: 9 }} />
      <div style={{ width: 32, height: 32, borderRadius: 16, border: `3px solid ${line}` }} />
      <div style={{ marginLeft: 'auto', width: 22, height: 22, background: line, borderRadius: 4 }} />
    </div>
    {[0, 1].map((i) => <Task key={i} seed={seed + i} />)}
  </div>
);

// 超宽面板内容（放大特写级别）：侧栏（顶部 video-shotcraft 标志 + 字标）+ 顶栏 + 三列看板
const WidePanel: React.FC = () => (
  <div style={{
    width: PW, height: PH, background: '#f4f4f3',
    display: 'flex', boxSizing: 'border-box',
    borderRadius: `${CR}px ${CR}px 0 0`,
  }}>
    <div style={{ width: 560, borderRight: `3px solid ${line}`, padding: '52px 48px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 56 }}>
        {/* 侧栏品牌位：video-shotcraft 标志 + 字标 */}
        <ShotcraftMark size={46} tone="light" />
        <div style={{ fontFamily: BRAND.font, fontSize: 27, fontWeight: 700, letterSpacing: '0.03em', lineHeight: 1, color: ink, whiteSpace: 'nowrap' }}>{BRAND.name}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <SideRow w={110} /><SideRow w={200} /><SideRow w={100} />
      </div>
      <div style={{ height: 20, width: 130, background: '#adadab', borderRadius: 9, margin: '58px 0 24px' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <SideRow w={180} /><SideRow w={220} /><SideRow w={170} />
      </div>
    </div>
    <div style={{ flex: 1, padding: '52px 64px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: 48 }}>
        <div style={{ width: 36, height: 30, background: mid, borderRadius: 6 }} />
        <div style={{ height: 26, width: 400, background: '#606060', borderRadius: 11 }} />
        <div style={{ height: 18, width: 150, background: line, borderRadius: 8, marginLeft: 64 }} />
        <div style={{ height: 18, width: 120, background: line, borderRadius: 8 }} />
        <div style={{ height: 18, width: 90, background: line, borderRadius: 8 }} />
      </div>
      <div style={{ display: 'flex', gap: 84 }}>
        <Col accent="#c4ad45" seed={1} w={620} />
        <Col accent="#6b5bd6" seed={4} w={620} />
        <Col accent="#4f8f6f" seed={7} w={620} />
      </div>
    </div>
  </div>
);

export const SlideSpotlightPan: React.FC = () => {
  const frame = useCurrentFrame();
  // 面板匀速左滑（相机右摇）——严格 linear
  const slide = interpolate(frame, [0, 132], [180, -1100]);
  // 聚光头在面板本地座标沿顶边匀速右移——严格 linear
  // 起点在左上角竖缘（负值=还在左缘竖直段），随后转过角沿顶边走
  const head = interpolate(frame, [0, 132], [-360, 2600]);
  const onTop = Math.max(0, head);            // 顶边段进度
  const cornerT = Math.min(1, Math.max(0, (head + 360) / 360)); // 竖缘段 0→1
  const vertHeadY = TOP + 620 - cornerT * 620; // 左缘光头从下往上爬到角

  // 屏幕座标的光头位置
  const headScreenX = slide + onTop;
  // 光头在竖缘阶段贴着面板左缘
  const leftEdgeX = slide;

  // 竖缘光线强度：角前满、转角后衰减
  const vGlow = head < 0 ? 1 : Math.max(0, 1 - head / 900);
  // 顶边光线强度：转角后满
  const hGlow = Math.min(1, Math.max(0, (head + 120) / 240));

  const grad = (dir: string, c: string) =>
    `linear-gradient(${dir}, rgba(0,0,0,0) 0%, ${c} 42%, ${c} 58%, rgba(0,0,0,0) 100%)`;

  return (
    <AbsoluteFill style={{ background: '#050409', overflow: 'hidden' }}>
      {/* 面板层：聚光范围内显影 */}
      <div style={{ position: 'absolute', left: 0, top: TOP, transform: `translateX(${slide}px)` }}>
        <WidePanel />
        {/* 贴面泛光：光头下方的紫光晕染进 UI 顶部（贴着界面泛光的关键层） */}
        <div style={{
          position: 'absolute', left: onTop - 620, top: -30, width: 1240, height: 380,
          background: 'radial-gradient(ellipse 620px 190px at 50% 0%, rgba(168,95,245,0.5), rgba(140,75,235,0.16) 55%, rgba(0,0,0,0) 78%)',
          filter: 'blur(6px)', opacity: hGlow,
        }} />
        {/* 左缘贴面泛光（竖缘阶段） */}
        <div style={{
          position: 'absolute', left: -30, top: vertHeadY - TOP - 320, width: 340, height: 780,
          background: 'radial-gradient(ellipse 170px 390px at 0% 50%, rgba(168,95,245,0.45), rgba(140,75,235,0.14) 55%, rgba(0,0,0,0) 78%)',
          filter: 'blur(6px)', opacity: vGlow,
        }} />
        {/* 聚光范围外压暗：以光头为中心的显影罩（面板本地座标，跟光头走） */}
        <div style={{
          position: 'absolute', inset: -60,
          background: `radial-gradient(ellipse 1350px 1000px at ${onTop + 60}px ${(head < 0 ? vertHeadY - TOP : 40) + 260}px, rgba(0,0,0,0) 26%, rgba(0,0,0,0.55) 60%, rgba(5,4,9,0.96) 100%)`,
        }} />
      </div>

      {/* ===== 贴边紫色光线本体（屏幕层，贴着面板边缘） ===== */}
      {/* 顶边横向光线：三层辉光 + 亮芯，中心=光头 */}
      <div style={{ opacity: hGlow }}>
        <div style={{
          position: 'absolute', left: headScreenX - 640, top: TOP - 56, width: 1280, height: 112,
          background: grad('90deg', 'rgba(150,82,238,0.55)'), filter: 'blur(30px)',
        }} />
        <div style={{
          position: 'absolute', left: headScreenX - 470, top: TOP - 17, width: 940, height: 34,
          background: grad('90deg', 'rgba(196,126,255,0.9)'), filter: 'blur(10px)',
        }} />
        <div style={{
          position: 'absolute', left: headScreenX - 330, top: TOP - 8, width: 660, height: 16,
          background: grad('90deg', 'rgba(240,155,235,0.85)'), filter: 'blur(5px)',
        }} />
        <div style={{
          position: 'absolute', left: headScreenX - 300, top: TOP - 3, width: 600, height: 6,
          background: grad('90deg', '#f6e8ff'), filter: 'blur(1.5px)',
        }} />
      </div>
      {/* 左上角竖缘光线（起始阶段，贴面板左缘） */}
      <div style={{ opacity: vGlow }}>
        <div style={{
          position: 'absolute', left: leftEdgeX - 52, top: vertHeadY - 420, width: 104, height: 840,
          background: grad('180deg', 'rgba(150,82,238,0.5)'), filter: 'blur(28px)',
        }} />
        <div style={{
          position: 'absolute', left: leftEdgeX - 14, top: vertHeadY - 330, width: 28, height: 660,
          background: grad('180deg', 'rgba(196,126,255,0.9)'), filter: 'blur(9px)',
        }} />
        <div style={{
          position: 'absolute', left: leftEdgeX - 3, top: vertHeadY - 260, width: 6, height: 520,
          background: grad('180deg', '#f6e8ff'), filter: 'blur(1.5px)',
        }} />
      </div>

      {/* 顶上方黑檐：光带以上纯黑（截图里顶边之上是黑场） */}
      <div style={{
        position: 'absolute', left: 0, top: 0, width: 1920, height: TOP - 4,
        background: 'linear-gradient(180deg, #050409 78%, rgba(5,4,9,0) 100%)',
      }} />
    </AbsoluteFill>
  );
};

export const SLIDE_SPOTLIGHT_PAN_DURATION = 132;
