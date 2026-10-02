// type-and-filter —— 真实 UI 上打字搜索、网格自己收敛成一张卡、点击穿透进详情页
// 第二轮重设计（石墨暗场 · 暖光浮窗 · 一镜到底的操作叙事）：
// - 真实截图纹理全部保留（projects-empty 整页 + 10 张卡片裁片 + detail-full 详情页，Q1），
//   但不再是"整页铺满画框"：页面装进一只暖纸色浏览器窗（地址栏 fieldlab.app/projects），
//   浮在 look = graphite 的暗场上（暖色主光从左上打来、窗下有地面光），产品是画面里唯一亮的东西。
// - 一镜到底：特写搜索框（zoom 2.5，输入字有效字高 ≈44px）→ 相机跟着光标微移 → 打完呼吸 → 拉开到整窗
//   看网格收敛 → 指针点中结果卡 → 卡片做容器变形（shared element）展开成详情页，相机同时推近详情标题。
//   原版交棒给 flash-cut 的"推进穿透"，这里直接落地到详情页，镜头自己有起承转合。
// - 细节都按真实产品补：首键落下时 placeholder 消失、右上计数 "显示 10 / 10 → 1 / 10"、
//   分组标题换成 "RESEARCH INFRA · 1 个项目"（目标卡本属这一组）、下方空分组标题淡出、地址栏跟着换路由。
// - 节奏像人手：nano 四键快、"-" 前犹豫、lab 三键快（3f 基准、不等间隔）；打完留 ~10f 呼吸再过滤。
//
// 时间表（30fps，共 156f）：
//   0–8     预备：搜索框特写，聚焦环亮起，placeholder 还在
//   10–33   打字 n a n o - l a b（10/13/16/19/24/27/30/33），相机随光标 2.5→2.55 微移
//   33–42   呼吸：光标转闪烁
//   40–62   拉开：zoom 2.55→1（EASE.smooth 22f）到整窗
//   46–60   过滤：9 张非目标卡按阅读序 0.9f 错峰淡出下沉（各 7f）；计数 / 分组标题换字
//   50–66   目标卡从视口下方升到首行槽位（16f，EASE.swift，纵向速度拖影，途中浮起 + 阴影变宽）
//   62–78   指针入场并带弧线滑到卡片（EASE.swift）
//   80      点击：指针压 0.86、双圈琥珀涟漪、琥珀描边
//   86–112  容器变形：卡片矩形展开成整个视口（26f，EASE.smooth），卡片纹理淡出、详情页在容器内露出
//   88–118  相机推近详情标题 zoom 1→1.75（EASE.swift）
//   118–156 hold：详情页定格，相机 1.75→1.8 极缓推
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, SpeedBlur, Vignette, mix, ramp, velocity } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha } from '../../_fixtures/Look';
import layout from '../../_textures/live-layout.json';

export const TYPE_AND_FILTER_DURATION = 156;

// graphite 暗场，主光换成暖色（和纸色页面同色温）
const L = { ...LOOKS.graphite, light: '#ffd7a6' };
const PAPER = '#f9f6f1';
const FIELD = '#fefcf9';
const LABEL = '#65635f';
const AMBER = '#c27a2a';

// ───────────── 时间轴 ─────────────
const KEYS = [10, 13, 16, 19, 24, 27, 30, 33]; // n a n o - l a b
const QUERY = 'nano-lab';
const PULL0 = 40;
const PULL1 = 62;
const FILTER = 46;
const RISE0 = 50;
const RISE1 = 66;
const PTR0 = 62;
const PTR1 = 78;
const CLICK = 80;
const EXPAND0 = 86;
const EXPAND1 = 112;
const PUSH0 = 88;
const PUSH1 = 118;

// ───────────── 页面 / 窗口几何 ─────────────
const PAGE_H = layout.projects.pageH;
const cards = layout.projects.cards;
const nanoIdx = cards.findIndex((c) => c.title.includes('nano-lab'));
const nano = cards[nanoIdx];
const SLOT = { x: 408, y: 247 }; // 首行槽位（Q9：真实布局坐标）
const leaveRank = new Map<number, number>();
cards.forEach((_, i) => {
  if (i !== nanoIdx) leaveRank.set(i, leaveRank.size);
});

const WIN = { x: 200, y: 62, w: 1520, h: 956, r: 22 };
const CHROME = 56;
const VP = { x: WIN.x, y: WIN.y + CHROME, w: WIN.w, h: WIN.h - CHROME };
const PAGE_X0 = 328; // 视口左缘对应的页面 x（页面内容列 408–1512 居中）
const PS = VP.w / (1920 - 2 * PAGE_X0); // 页面 → 世界缩放 ≈1.2025
const VP_PAGE_H = VP.h / PS; // 视口里能看到的页面高度
const pw = (px: number, py: number) => ({ x: VP.x + (px - PAGE_X0) * PS, y: VP.y + py * PS });

// ───────────── 相机（世界坐标的焦点 + zoom，分段缓动）─────────────
type Cam = { cx: number; cy: number; z: number };
const TEXT0 = pw(448, 152);
const CAM_TIGHT: Cam = { cx: TEXT0.x + 250, cy: TEXT0.y + 4, z: 2.5 };
const CAM_TYPED: Cam = { cx: TEXT0.x + 300, cy: TEXT0.y + 4, z: 2.55 };
const CAM_WIDE: Cam = { cx: 960, cy: 540, z: 1 };
const TITLE = pw(640, 170);
const CAM_DETAIL: Cam = { cx: TITLE.x + 40, cy: TITLE.y + 30, z: 1.75 };
const lerpCam = (a: Cam, b: Cam, t: number): Cam => {
  // zoom 按对数插值（推拉速度感均匀），焦点按屏幕空间一致插值
  const z = Math.exp(mix(Math.log(a.z), Math.log(b.z), t));
  return { cx: mix(a.cx, b.cx, t), cy: mix(a.cy, b.cy, t), z };
};
const camAt = (f: number): Cam => {
  if (f < KEYS[KEYS.length - 1]) return lerpCam(CAM_TIGHT, CAM_TYPED, ramp(f, 0, KEYS[KEYS.length - 1], EASE.swift));
  if (f < PULL1) return lerpCam(CAM_TYPED, CAM_WIDE, ramp(f, PULL0, PULL1 - PULL0, EASE.smooth));
  if (f < PUSH1) return lerpCam(CAM_WIDE, CAM_DETAIL, ramp(f, PUSH0, PUSH1 - PUSH0, EASE.swift));
  const t = ramp(f, PUSH1, TYPE_AND_FILTER_DURATION - PUSH1, EASE.swift);
  return { ...CAM_DETAIL, z: CAM_DETAIL.z * (1 + 0.028 * t) };
};

// 指针（世界坐标）：从窗口右下带弧线滑到结果卡中心
const CARD_C = pw(SLOT.x + nano.w / 2, SLOT.y + nano.h / 2 + 10);
const PTR_FROM = { x: 1360, y: 860 };
const ptrAt = (f: number) => {
  const t = ramp(f, PTR0, PTR1 - PTR0, EASE.swift);
  return {
    x: mix(PTR_FROM.x, CARD_C.x, t) + Math.sin(t * Math.PI) * 50,
    y: mix(PTR_FROM.y, CARD_C.y, t) + Math.sin(t * Math.PI) * 40,
  };
};

const Patch: React.FC<{ x: number; y: number; w: number; h: number; o: number; to?: number; bg?: string; children?: React.ReactNode; align?: 'left' | 'right' }> = ({ x, y, w, h, o, to, bg = PAPER, children, align = 'left' }) => (
  <div style={{
    position: 'absolute', left: x, top: y, width: w, height: h, background: alpha(bg, o), color: alpha(LABEL, to ?? o),
    display: 'flex', alignItems: 'center', justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
    fontFamily: FONT.sans, whiteSpace: 'nowrap',
  }}>{children}</div>
);

export const TypeAndFilter: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camAt(f);
  const camStyle: React.CSSProperties = {
    position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0',
    transform: `translate(${(960 - cam.cx * cam.z).toFixed(2)}px, ${(540 - cam.cy * cam.z).toFixed(2)}px) scale(${cam.z.toFixed(4)})`,
  };

  // ── 输入 ──
  const typed = KEYS.filter((k) => f >= k).length;
  const lastKey = KEYS[KEYS.length - 1];
  const caretOn = f >= 4 && f < EXPAND0 && (f <= lastKey + 3 || Math.floor((f - lastKey - 3) / 8) % 2 === 0);
  const focus = ramp(f, 2, 6, EASE.out) * (1 - ramp(f, CLICK, 6, EASE.linear));
  const charIn = (i: number) => ramp(f, KEYS[i], 3, EASE.snappy);

  // ── 过滤 ──
  const swapBg = ramp(f, FILTER + 2, 3, EASE.out); // 计数 / 分组标题换字：先盖旧字…
  const swap = ramp(f, FILTER + 4, 6, EASE.out); // …再淡入新字（避免新旧字叠影）
  const lowerFade = ramp(f, FILTER + 4, 10, EASE.out);
  const riseAt = (fr: number) => ramp(fr, RISE0, RISE1 - RISE0, EASE.swift);
  const rise = riseAt(f);
  const riseVy = velocity((fr) => (SLOT.y - nano.y) * riseAt(fr) * PS * cam.z, f);
  const lift = Math.sin(rise * Math.PI);

  // ── 指针 / 点击 ──
  const ptr = ptrAt(f);
  const ptrO = ramp(f, PTR0 - 2, 5, EASE.linear) * (1 - ramp(f, EXPAND0 + 2, 6, EASE.linear));
  const press = f < CLICK - 1 ? 1 : mix(0.86, 1, ramp(f, CLICK + 1, 6, EASE.out));
  const outlineO = ramp(f, CLICK + 1, 3, EASE.out) * (1 - ramp(f, EXPAND0, 8, EASE.linear));

  // ── 容器变形：卡片矩形 → 视口（页面坐标）──
  const ex = ramp(f, EXPAND0, EXPAND1 - EXPAND0, EASE.smooth);
  const expanding = f >= EXPAND0;
  const R0 = { x: SLOT.x, y: SLOT.y, w: nano.w, h: nano.h };
  const R1 = { x: PAGE_X0, y: 0, w: 1920 - 2 * PAGE_X0, h: VP_PAGE_H };
  const R = { x: mix(R0.x, R1.x, ex), y: mix(R0.y, R1.y, ex), w: mix(R0.w, R1.w, ex), h: mix(R0.h, R1.h, ex) };
  const cardFade = 1 - ramp(f, EXPAND0 + 2, 10, EASE.linear);
  const detail = f >= EXPAND1;
  const url = f >= EXPAND0 + 4 ? 'fieldlab.app/projects/nano-lab' : f >= FILTER ? 'fieldlab.app/projects?q=nano-lab' : 'fieldlab.app/projects';

  const ripple = [0, 1].map((k) => {
    const s = CLICK + k * 3;
    if (f < s || f > s + 12) return null;
    const t = ramp(f, s, 12, EASE.out);
    const rad = mix(10, k === 0 ? 46 : 70, t);
    return (
      <div key={k} style={{
        position: 'absolute', left: SLOT.x + nano.w / 2 - rad, top: SLOT.y + nano.h / 2 + 10 / PS - rad, width: rad * 2, height: rad * 2,
        borderRadius: '50%', boxSizing: 'border-box', border: `${k === 0 ? 2.5 : 1.5}px solid ${AMBER}`, opacity: 1 - t, zIndex: 8,
        background: k === 0 ? `radial-gradient(circle, ${alpha(AMBER, 0)} 55%, ${alpha(AMBER, 0.14)} 100%)` : undefined,
      }} />
    );
  });

  return (
    <AbsoluteFill style={{ background: L.bg[2], overflow: 'hidden' }}>
      <div style={camStyle}>
        {/* 舞台（外扩，特写时四周也有底） */}
        <div style={{ position: 'absolute', left: -400, top: -300, width: 2720, height: 1680 }}>
          <Stage look={L} keyLight={{ x: 0.3, y: 0.12 }} fill={{ x: 0.8, y: 0.85 }} intensity={0.9} vignette={0.25} grain={0} />
        </div>
        {/* 窗下地面光 */}
        <div style={{
          position: 'absolute', left: WIN.x + 100, top: WIN.y + WIN.h - 30, width: WIN.w - 200, height: 120,
          background: `radial-gradient(ellipse 50% 50% at 50% 30%, ${alpha('#ffcf96', 0.16)} 0%, ${alpha('#ffcf96', 0)} 70%)`,
        }} />

        {/* 浏览器窗 */}
        <div style={{
          position: 'absolute', left: WIN.x, top: WIN.y, width: WIN.w, height: WIN.h, borderRadius: WIN.r, overflow: 'hidden', background: PAPER,
          boxShadow: `0 0 0 1px rgba(255,235,210,0.14), 0 0 80px ${alpha('#ffcf96', 0.12)}, 0 50px 110px -30px rgba(0,0,0,0.85), 0 16px 36px -10px rgba(0,0,0,0.6)`,
        }}>
          {/* 窗口栏 */}
          <div style={{ position: 'absolute', left: 0, top: 0, width: WIN.w, height: CHROME, background: 'linear-gradient(180deg, #f1ece4, #ebe5dc)', borderBottom: '1px solid rgba(60,45,30,0.12)', display: 'flex', alignItems: 'center', padding: '0 22px', boxSizing: 'border-box' }}>
            {['#ec6a5e', '#f4bf4f', '#61c554'].map((c) => <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c, marginRight: 9, boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.15)' }} />)}
            <div style={{
              position: 'absolute', left: WIN.w / 2 - 300, top: 11, width: 600, height: 34, borderRadius: 9, background: 'rgba(255,255,255,0.75)',
              boxShadow: 'inset 0 0 0 1px rgba(60,45,30,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: FONT.sans, fontSize: 17, color: '#6d665d', letterSpacing: '-0.005em',
            }}>
              <svg width={12} height={14} viewBox="0 0 12 14"><rect x={1} y={6} width={10} height={7} rx={2} fill="#9a9187" /><path d="M3.5 6V4.2a2.5 2.5 0 0 1 5 0V6" stroke="#9a9187" strokeWidth={1.6} fill="none" /></svg>
              {url}
            </div>
          </div>

          {/* 视口：页面坐标系（translate + scale） */}
          <div style={{ position: 'absolute', left: 0, top: CHROME, width: VP.w, height: VP.h, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: PAGE_H, transformOrigin: '0 0', transform: `translate(${(-PAGE_X0 * PS).toFixed(2)}px, 0px) scale(${PS.toFixed(5)})` }}>
              <Img src={staticFile('textures/live/projects-empty.png')} style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: PAGE_H }} />

              {/* 计数：显示 10 / 10 → 1 / 10 */}
              <Patch x={1400} y={92} w={112} h={18} o={swapBg} to={swap} align="right"><span style={{ fontSize: 13, letterSpacing: '0.02em' }}>显示 1 / 10</span></Patch>
              {/* 分组标题换成目标卡所属的 Research Infra */}
              <Patch x={404} y={205} w={260} h={18} o={swapBg} to={swap}><span style={{ fontSize: 11.5, letterSpacing: '0.13em' }}>RESEARCH INFRA</span></Patch>
              <Patch x={1420} y={205} w={92} h={18} o={swapBg} to={swap} align="right"><span style={{ fontSize: 12.5 }}>1 个项目</span></Patch>
              {/* 下方空分组整段淡出 */}
              {layout.projects.sections.slice(2).map((s) => (
                <Patch key={s.text} x={400} y={s.y - 8} w={1120} h={34} o={lowerFade} />
              ))}

              {/* 搜索框：首键落下即盖掉 placeholder，叠打字层 + 聚焦环（画在卡片之下，展开的详情容器能盖住它） */}
              {typed > 0 && !detail && <div style={{ position: 'absolute', left: 438, top: 134, width: 980, height: 36, background: FIELD }} />}
              {!detail && (
                <>
                  <div style={{
                    position: 'absolute', left: 407, top: 129, width: 1018, height: 46, borderRadius: 9, boxSizing: 'border-box', opacity: focus,
                    border: `1.5px solid ${alpha(AMBER, 0.65)}`, boxShadow: `0 0 0 4px ${alpha(AMBER, 0.14)}`,
                  }} />
                  <div style={{ position: 'absolute', left: 446, top: 130, height: 44, display: 'flex', alignItems: 'center', fontFamily: FONT.sans, fontSize: 15.5, color: '#2a2622', letterSpacing: '0.005em' }}>
                    {QUERY.split('').slice(0, typed).map((c, i) => (
                      <span key={i} style={{ display: 'inline-block', opacity: charIn(i), transform: `translateY(${((1 - charIn(i)) * 3).toFixed(2)}px)` }}>{c}</span>
                    ))}
                    <span style={{ display: 'inline-block', width: 1.6, height: 19, marginLeft: 1.5, borderRadius: 1, background: AMBER, opacity: caretOn ? 1 : 0 }} />
                  </div>
                </>
              )}
              {/* 9 张非目标卡：阅读序错峰淡出下沉 */}
              {cards.map((c, i) => {
                if (i === nanoIdx) return null;
                const cue = FILTER + leaveRank.get(i)! * 0.9;
                if (f >= cue + 7) return null;
                const t = ramp(f, cue, 7, EASE.exit);
                return (
                  <div key={c.file} style={{
                    position: 'absolute', left: c.x, top: c.y, width: c.w, height: c.h, borderRadius: 16, overflow: 'hidden',
                    transform: `translateY(${(10 * t).toFixed(2)}px) scale(${(1 - 0.03 * t).toFixed(4)})`, opacity: 1 - t,
                    boxShadow: '0 1px 2px rgba(60,45,30,.06), 0 4px 12px -4px rgba(60,45,30,.08)',
                  }}>
                    <Img src={staticFile(`textures/live/${c.file}`)} style={{ width: '100%', height: '100%', display: 'block' }} />
                  </div>
                );
              })}

              {/* 目标卡：升到首行槽位 → 点击 → 容器变形展开成详情页 */}
              {!expanding ? (
                <SpeedBlur vx={0} vy={riseVy} amount={0.05} max={10} style={{ zIndex: 3 }}>
                  <div style={{
                    position: 'absolute', left: nano.x, top: nano.y, width: nano.w, height: nano.h, borderRadius: 16, overflow: 'hidden',
                    transform: `translate(${(SLOT.x - nano.x) * rise}px, ${((SLOT.y - nano.y) * rise).toFixed(2)}px) scale(${(1 + 0.03 * lift).toFixed(4)})`,
                    boxShadow: `0 ${1 + 3 * lift}px ${2 + 5 * lift}px rgba(60,45,30,${0.07 + 0.04 * lift}), 0 ${4 + 24 * lift}px ${12 + 36 * lift}px -${4 + 6 * lift}px rgba(60,45,30,${0.1 + 0.16 * lift})`,
                  }}>
                    <Img src={staticFile(`textures/live/${nano.file}`)} style={{ width: '100%', height: '100%', display: 'block' }} />
                  </div>
                </SpeedBlur>
              ) : (
                <div style={{
                  position: 'absolute', left: R.x, top: R.y, width: R.w, height: R.h, overflow: 'hidden', zIndex: 3,
                  borderRadius: 16 * (1 - ex), background: PAPER,
                  boxShadow: detail ? undefined : `0 ${(30 * (1 - ex)).toFixed(1)}px ${(60 * (1 - ex)).toFixed(1)}px -20px rgba(60,45,30,0.3)`,
                }}>
                  {/* 详情页固定在最终位置，容器矩形只是它的遮罩 */}
                  <Img src={staticFile('textures/live/detail-full.png')} style={{ position: 'absolute', left: -R.x, top: -R.y, width: 1920, height: 1172 }} />
                  {cardFade > 0.01 && (
                    <Img src={staticFile(`textures/live/${nano.file}`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: cardFade }} />
                  )}
                </div>
              )}

              {/* 琥珀描边（与卡片同心圆角）+ 点击涟漪 */}
              {outlineO > 0.01 && (
                <div style={{
                  position: 'absolute', left: SLOT.x - 6, top: SLOT.y - 6, width: nano.w + 12, height: nano.h + 12, borderRadius: 22,
                  boxSizing: 'border-box', border: `3px solid ${AMBER}`, opacity: outlineO, zIndex: 6,
                  boxShadow: `0 0 0 5px ${alpha(AMBER, 0.12)}, 0 10px 36px -6px ${alpha(AMBER, 0.45)}`,
                  transform: `scale(${mix(1.02, 1, ramp(f, CLICK + 1, 6, EASE.out)).toFixed(4)})`,
                }} />
              )}
              {ripple}

            </div>
          </div>
        </div>

        {/* macOS 指针：世界坐标定位，按相机 zoom 反向缩放 → 屏幕上恒定大小 */}
        {ptrO > 0.01 && (
          <svg width={28} height={28} viewBox="0 0 28 28" style={{
            position: 'absolute', left: ptr.x - 2, top: ptr.y - 1, opacity: ptrO, overflow: 'visible',
            transformOrigin: '2px 1px', transform: `scale(${((1.5 / cam.z) * press).toFixed(4)})`,
            filter: 'drop-shadow(0 1px 1px rgba(20,14,8,0.4)) drop-shadow(0 4px 6px rgba(20,14,8,0.3))',
          }}>
            <path d="M2 1 L2 23 L8 17.5 L11.5 25 L15.5 23.2 L12 15.8 L20 15 Z" fill="#17181c" stroke="#ffffff" strokeWidth={1.6} strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <Vignette strength={0.32} color="#050505" inner={0.5} />
      <Grain opacity={0.07} blend="soft-light" />
    </AbsoluteFill>
  );
};
