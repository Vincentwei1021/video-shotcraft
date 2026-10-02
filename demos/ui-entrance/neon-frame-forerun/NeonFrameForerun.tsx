// neon-frame-forerun v3 —— v2 基础上按用户意见新增（clickup04 五张）：
// 框内各组件/文字初始悬空在页面上空（3D 抬起），悬空时在面板上映射
// 同形软影，随页面点亮进程同步先后贴合（FloatWrap 模式，对标截图③：
// tab/组件悬空带错位影 → ④全部贴合）。v2 已有：强透视直角框左缘中点
// 两头奔画、面板原地由暗转亮、背景霓虹管框群中亮尾熄。
// —— 质感层（改版）：
// · 面板内容从灰条骨架换成出版级工作台首页（侧栏导航 / 问候标题 / 搜索 / 最近卡片 / 任务表），
//   面板高 900→790 去掉下半截空白，落定构图整框留在画内（原落定 scale 1.04 右上角出画）
// · 同形软影改为纯剪影：离地越高越大越虚越淡、贴近时变小变实（原先反过来越高越深，且影子是
//   灰色内容副本，读作脏糊块）；悬空本体按高度微放大，像真的离镜头更近
// · 面板补深色落地影；背景霓虹管减细，暗角 + 颗粒压住大面积暗场；补导出时长 135f
import React, { useId } from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { FONT, Grain, Vignette } from '../../_fixtures/Polish';

export const NEON_FRAME_FORERUN_DURATION = 135; // 框奔画 0.9s + 点亮&贴落 2.4s + 背景熄灭 1s + 落定

const easeFall = Easing.bezier(0.5, 0.05, 0.6, 1); // 加速下落、末端软着陆

/* 悬浮 + 同形软影：h=悬浮高度(px)。本体向左上抬起（主光在左上），原位留同形剪影软影：
 * 越高越大、越虚、越淡，贴近时收小变实；h→0 时重合、影子消失（对标批次11 GrazeFaceTour FloatWrap） */
const FloatWrap: React.FC<{ h: number; children: React.ReactNode }> = ({ h, children }) => (
  <div style={{ position: 'relative' }}>
    {h > 1 && (
      <div style={{
        position: 'absolute', inset: 0,
        transform: `translate(${(h * 0.26).toFixed(2)}px, ${(h * 0.48).toFixed(2)}px) scale(${(1 + h * 0.0012).toFixed(4)})`,
        filter: `brightness(0) blur(${(1.5 + h * 0.11).toFixed(2)}px)`,
        opacity: Math.max(0.08, 0.3 - h * 0.0011),
        pointerEvents: 'none',
      }}>{children}</div>
    )}
    <div style={{ transform: `translate(${(-h * 0.36).toFixed(2)}px, ${(-h * 0.82).toFixed(2)}px) scale(${(1 + h * 0.0007).toFixed(4)})` }}>{children}</div>
  </div>
);

/* land=贴合完成时刻(0..1)，之前从 H 高度加速贴落 */
const liftOf = (t: number, land: number, H: number) => {
  const FALL = 0.3;
  const p = Math.min(1, Math.max(0, (t - (land - FALL)) / FALL));
  return (1 - easeFall(p)) * H;
};

const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const INK = '#1c1d22', INK2 = '#5d5f67', INK3 = '#9c9ea6';
const HAIR = 'rgba(20,22,28,0.08)';
const ACC = '#6a5ae0';

const PW = 1330;
const PH = 790;
const PL = 1000; // 归一路径长

// 直角矩形路径：从左缘中点出发（对应截图①左缘先亮）
const FRAME_D = `M 0 ${PH / 2} L 0 0 L ${PW} 0 L ${PW} ${PH} L 0 ${PH} Z`;

// 线性小图标（18 视框）
const Glyph: React.FC<{ k: number; c?: string }> = ({ k, c = INK2 }) => {
  const p = { fill: 'none', stroke: c, strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width={17} height={17} viewBox="0 0 18 18">
      {k === 0 && <path d="M3 8 L9 3 L15 8 V15 H3 Z M7.5 15 V11 H10.5 V15" {...p} />}
      {k === 1 && <path d="M2.5 10 L4.5 4 H13.5 L15.5 10 V14.5 H2.5 Z M2.5 10 H6.5 L7.5 11.5 H10.5 L11.5 10 H15.5" {...p} />}
      {k === 2 && <><circle cx={9} cy={9} r={6.2} {...p} /><path d="M6.2 9.2 L8.2 11.2 L12 7" {...p} /></>}
      {k === 3 && <path d="M4.5 2.5 H10.5 L14 6 V15.5 H4.5 Z M10.5 2.5 V6 H14 M7 9.5 H11.5 M7 12.5 H11.5" {...p} />}
      {k === 4 && <><rect x={2.5} y={2.5} width={13} height={13} rx={2} {...p} /><path d="M6 12.5 V9.5 M9 12.5 V6 M12 12.5 V8" {...p} /></>}
      {k === 5 && <><circle cx={9} cy={9} r={6.2} {...p} /><circle cx={9} cy={9} r={2.6} {...p} /></>}
    </svg>
  );
};

const NAV = ['Home', 'Inbox', 'My Tasks', 'Docs', 'Dashboards', 'Goals'];
const SPACES: [string, string][] = [['Product', '#8b7cf0'], ['Marketing', '#e48aa8'], ['Engineering', '#5aa5e6'], ['Design', '#e8a35c'], ['Operations', '#5bbf95']];
const RECENTS: [string, string, number][] = [
  ['Q4 roadmap', 'Doc · 2h ago', 3], ['Launch checklist', 'List · 4h ago', 2], ['Revenue overview', 'Dashboard · Yesterday', 4],
  ['Hiring plan', 'Doc · Yesterday', 3], ['Sprint 42', 'Board · Mon', 2], ['Brand refresh', 'Whiteboard · Mon', 5], ['OKRs · H2', 'Goal · Last week', 5],
];
const TASKS: [string, string, string, string][] = [
  ['Finalize pricing tiers for launch', '#e05c5c', 'In review', 'Today'],
  ['Ship onboarding email sequence', '#e8a23c', 'In progress', 'Tomorrow'],
  ['QA payment flow on mobile', '#e05c5c', 'Blocked', 'Today'],
  ['Draft press release v2', '#5aa5e6', 'In progress', 'Fri'],
  ['Record product walkthrough', '#5aa5e6', 'To do', 'Mon'],
  ['Update help center articles', '#9a9ca4', 'To do', 'Next week'],
];
const AV = ['#e4e1da', '#dde0e8', '#e8e2e8', '#dce6e1'];

const Chip: React.FC<{ w: number; i: number }> = ({ w, i }) => {
  const [title, meta, k] = RECENTS[i];
  return (
    <div style={{
      width: w, height: 74, background: '#ffffff', borderRadius: 10, padding: '13px 14px', boxSizing: 'border-box',
      boxShadow: `0 0 0 1px ${HAIR}, 0 1px 2px rgba(16,18,24,0.05), 0 6px 14px -8px rgba(16,18,24,0.12)`,
      display: 'flex', gap: 11, alignItems: 'flex-start',
    }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: '#f2f2f0', boxShadow: `inset 0 0 0 1px ${HAIR}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        <Glyph k={k} c={i === 0 ? ACC : INK2} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: INK, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{title}</div>
        <div style={{ fontSize: 12.5, color: INK3, marginTop: 5, whiteSpace: 'nowrap' }}>{meta}</div>
      </div>
    </div>
  );
};

/* t = 贴落进程(0..1)。各组件按页面展示顺序（侧栏自上而下、主区自上而下）
 * 错峰从空中贴落，悬空时投同形软影（对标截图③虚影→④⑤贴合） */
const HomePage: React.FC<{ t?: number }> = ({ t = 1 }) => {
  const L = (land: number, H = 72) => liftOf(t, land, H * 1.7);
  return (
  <div style={{
    width: PW, height: PH, background: 'linear-gradient(180deg, #f8f8f7 0%, #f3f3f1 100%)', borderRadius: 6, display: 'flex',
    // 不裁切：悬空组件按透视本就会探出面板边缘，裁掉会在半空被切成半截
    overflow: 'visible', boxSizing: 'border-box', fontFamily: FONT.sans,
  }}>
    <div style={{ width: 290, background: '#f0f0ee', borderRadius: '6px 0 0 6px', boxShadow: `inset -1px 0 0 ${HAIR}`, padding: '26px 22px', boxSizing: 'border-box' }}>
      <FloatWrap h={L(0.24, 84)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 26, padding: '0 4px' }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(150deg, #8f7ff2, ${ACC})`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 2px 6px rgba(106,90,224,0.35)', color: '#fff', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>N</div>
          <div style={{ fontSize: 17, fontWeight: 650, color: INK, letterSpacing: '-0.015em' }}>Northwind</div>
          <svg width={12} height={12} viewBox="0 0 12 12" style={{ marginLeft: 2 }}><path d="M3 4.5 L6 7.5 L9 4.5" fill="none" stroke={INK3} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
      </FloatWrap>
      {NAV.map((n, i) => (
        <FloatWrap key={n} h={L(0.3 + i * 0.045, 66)}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 11, height: 36, padding: '0 10px', borderRadius: 8,
            background: i === 0 ? '#ffffff' : 'transparent', boxShadow: i === 0 ? `0 0 0 1px ${HAIR}, 0 1px 2px rgba(16,18,24,0.06)` : undefined,
          }}>
            <Glyph k={i} c={i === 0 ? ACC : INK2} />
            <div style={{ fontSize: 15, fontWeight: i === 0 ? 600 : 500, color: i === 0 ? INK : INK2 }}>{n}</div>
            {i === 1 && <div style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 700, color: '#fff', background: ACC, borderRadius: 9, padding: '2px 7px', fontVariantNumeric: 'tabular-nums' }}>4</div>}
          </div>
        </FloatWrap>
      ))}
      <FloatWrap h={L(0.56, 62)}>
        <div style={{ fontSize: 11.5, fontWeight: 650, letterSpacing: '0.09em', color: INK3, margin: '26px 10px 10px' }}>SPACES</div>
      </FloatWrap>
      {SPACES.map(([n, c], i) => (
        <FloatWrap key={n} h={L(0.62 + i * 0.05, 66)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, height: 34, padding: '0 10px' }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, background: c, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)', color: '#fff', fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n[0]}</div>
            <div style={{ fontSize: 14.5, color: INK2 }}>{n}</div>
          </div>
        </FloatWrap>
      ))}
    </div>
    <div style={{ flex: 1, padding: '30px 40px', boxSizing: 'border-box' }}>
      <FloatWrap h={L(0.26, 90)}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 20 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: INK, letterSpacing: '-0.025em' }}>Good morning, Dana</div>
          <div style={{ fontSize: 14, color: INK3 }}>Tuesday, Oct 14</div>
        </div>
      </FloatWrap>
      <FloatWrap h={L(0.34, 80)}>
        <div style={{
          height: 46, borderRadius: 12, marginBottom: 24, display: 'flex', alignItems: 'center', padding: '0 16px', background: '#ffffff',
          boxShadow: `0 0 0 1px rgba(20,22,28,0.11), 0 1px 2px rgba(16,18,24,0.05)`,
        }}>
          <svg width={17} height={17} viewBox="0 0 18 18"><circle cx={8} cy={8} r={5.2} fill="none" stroke={INK3} strokeWidth={1.8} /><path d="M12 12 L15.5 15.5" stroke={INK3} strokeWidth={1.8} strokeLinecap="round" /></svg>
          <div style={{ fontSize: 15, color: INK3, marginLeft: 12 }}>Search tasks, docs and people…</div>
          <div style={{ marginLeft: 'auto', fontSize: 12, fontFamily: FONT.mono, color: INK3, background: '#f3f3f1', borderRadius: 6, padding: '3px 7px', boxShadow: `inset 0 0 0 1px ${HAIR}` }}>⌘K</div>
        </div>
      </FloatWrap>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <FloatWrap key={i} h={L(0.42 + i * 0.04, 76)}>
            <Chip w={228} i={i} />
          </FloatWrap>
        ))}
      </div>
      <FloatWrap h={L(0.72, 60)}>
        <div style={{ display: 'flex', gap: 26, marginBottom: 6, boxShadow: `inset 0 -1px 0 ${HAIR}` }}>
          {['My Work', 'Assigned', 'Comments', 'Done'].map((n, i) => (
            <div key={n} style={{ fontSize: 14.5, fontWeight: i === 0 ? 650 : 500, color: i === 0 ? INK : INK3, paddingBottom: 11, boxShadow: i === 0 ? `inset 0 -2px 0 ${ACC}` : undefined }}>{n}</div>
          ))}
        </div>
      </FloatWrap>
      {TASKS.map(([title, pri, status, due], i) => (
        <FloatWrap key={i} h={L(0.78 + i * 0.04, 64)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 44, boxShadow: `inset 0 -1px 0 ${HAIR}` }}>
            <div style={{ width: 16, height: 16, borderRadius: 8, boxShadow: `inset 0 0 0 1.8px ${pri}` }} />
            <div style={{ fontSize: 15, color: INK, fontWeight: 500 }}>{title}</div>
            <div style={{ marginLeft: 'auto', fontSize: 12.5, fontWeight: 600, color: status === 'Blocked' ? '#b4453f' : INK2, background: status === 'Blocked' ? '#fbe8e6' : '#efefed', borderRadius: 6, padding: '3px 9px' }}>{status}</div>
            <div style={{ display: 'flex', width: 62, justifyContent: 'flex-end' }}>
              {[0, 1].map((k) => (
                <div key={k} style={{ width: 24, height: 24, borderRadius: 12, background: AV[(i + k) % 4], marginLeft: k ? -4 : 0, boxShadow: '0 0 0 2px #f6f6f5', fontSize: 9.5, fontWeight: 700, color: '#55575e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {['DW', 'MK', 'JS', 'AL'][(i + k) % 4]}
                </div>
              ))}
            </div>
            <div style={{ width: 78, textAlign: 'right', fontSize: 13, color: due === 'Today' ? '#c2453f' : INK3, fontVariantNumeric: 'tabular-nums' }}>{due}</div>
          </div>
        </FloatWrap>
      ))}
    </div>
  </div>
  );
};

// 背景霓虹管框：大、亮、带透视错落（截图③④）
type BgFrame = { x: number; y: number; w: number; h: number; hue: string; phase: number; period: number; skew: number };
const rng = mulberry32(20260718);
const HUES = ['#b06af0', '#e879c9', '#f0a35c', '#6a7df0', '#e0679a', '#8a5cf0', '#c06af0'];
const BG_FRAMES: BgFrame[] = Array.from({ length: 18 }).map(() => ({
  x: rng() * 2000 - 120, y: rng() * 1100 - 60,
  w: 160 + rng() * 480, h: 70 + rng() * 220,
  hue: HUES[Math.floor(rng() * HUES.length)],
  phase: rng() * 90, period: 55 + rng() * 70,
  skew: -14 + rng() * 10,
}));

export const NeonFrameForerun: React.FC = () => {
  const frame = useCurrentFrame();
  // 滤镜/渐变 ID 按实例生成，多实例同场不串引（useId 的 «:» 在 url() 里非法，需清洗）
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  // 主框描画：左缘中点向两头奔跑，26 帧成型（截图①→②）
  const trace = interpolate(frame, [2, 28], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.bezier(0.3, 0.1, 0.3, 1),
  });
  // 面板原地显影：框成型后内容从近黑到暗灰（截图②），再全亮（截图③）
  const lit = interpolate(frame, [24, 46, 78], [0.0, 0.3, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.bezier(0.35, 0, 0.3, 1),
  });
  // 主框独立描边可见度：面板亮起后并入面板 rim 辉光（截图③以后细线淡出，糊辉光留下）
  const frameLine = interpolate(frame, [50, 90], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const rimGlow = interpolate(frame, [28, 60, 108, 132], [0.9, 1, 0.75, 0.5], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  // 背景：中段全亮（截图③④）→ 尾段熄灭（截图⑤）
  const bgLit = interpolate(frame, [8, 44, 96, 128], [0.15, 1, 0.85, 0.06], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  // 强透视 → 缓和：框飞入时角度大，面板亮起后落定（截图①梯形→③④缓斜）
  const settle = interpolate(frame, [0, 70], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const rotY = -26 + 15 * settle;
  const rotX = 7 - 3 * settle;
  const rotZ = -9 + 4.5 * settle;
  const scale = 0.86 + 0.06 * settle; // 落定 0.92：整框（含辉光）留在画内
  const headP = trace * (PL / 2);
  // 组件贴落进程：与页面点亮(lit 24→78)同步推进，稍滞后收尾——
  // "和页面的展示同步完成贴合"
  const drop = interpolate(frame, [34, 98], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ background: '#060509', overflow: 'hidden' }}>
      {/* 背景霓虹管框群 */}
      <svg width={1920} height={1080} style={{ position: 'absolute' }}>
        <defs>
          <filter id={`bgblur-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation={7} />
          </filter>
        </defs>
        {BG_FRAMES.map((b, i) => {
          const breath = 0.5 + 0.5 * Math.sin(((frame + b.phase) / b.period) * Math.PI * 2);
          const op = bgLit * (0.18 + 0.4 * breath);
          return (
            <g key={i} transform={`translate(${b.x} ${b.y}) skewY(${b.skew * 0.4}) skewX(${b.skew})`}>
              <rect width={b.w} height={b.h} rx={4} fill="none"
                stroke={b.hue} strokeWidth={7} filter={`url(#bgblur-${uid})`} opacity={op * 0.8} />
              <rect width={b.w} height={b.h} rx={4} fill="none"
                stroke={b.hue} strokeWidth={1.6} opacity={op} />
            </g>
          );
        })}
      </svg>
      {/* 主体：强透视斜置的框 + 面板 */}
      <div style={{ position: 'absolute', inset: 0, perspective: 1600, perspectiveOrigin: '42% 40%' }}>
        <div style={{
          position: 'absolute', left: (1920 - PW) / 2, top: (1080 - PH) / 2 - 10,
          transform: `scale(${scale}) rotateY(${rotY}deg) rotateX(${rotX}deg) rotateZ(${rotZ}deg)`,
          transformStyle: 'preserve-3d',
        }}>
          {/* 面板：原地由暗转亮（无位移缩放） */}
          <div style={{ opacity: trace > 0.55 ? 1 : 0, filter: `brightness(${Math.max(0.05, lit)})` }}>
            <HomePage t={drop} />
            {/* 未点亮时的冷色压暗罩 */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 6,
              background: 'linear-gradient(150deg, rgba(30,20,60,0.5), rgba(0,0,0,0.78))',
              opacity: 1 - lit,
            }} />
          </div>
          {/* 面板落地影：深色、大而虚，把面板从背景管群里托出来 */}
          <div style={{
            position: 'absolute', left: 0, top: 0, width: PW, height: PH, borderRadius: 6, pointerEvents: 'none',
            boxShadow: '0 30px 90px -10px rgba(0,0,0,0.75), 0 8px 24px rgba(0,0,0,0.45)', opacity: Math.min(1, trace * 1.4),
            transform: 'translateZ(-1px)',
          }} />
          {/* 面板 rim 辉光（框光并入后由它承担，底缘最强——对应截图③④底/右缘粉光） */}
          <div style={{
            position: 'absolute', left: -10, top: -10, width: PW + 20, height: PH + 20,
            borderRadius: 12, opacity: rimGlow * Math.min(1, trace * 1.6),
            boxShadow: '-18px -8px 42px 6px rgba(185,95,240,0.42), 22px 24px 56px 12px rgba(240,150,90,0.30), 0 14px 80px 22px rgba(200,100,220,0.20)',
          }} />
          {/* 霓虹描边框：左缘中点出发两头奔画，直角转角 */}
          <svg width={PW + 80} height={PH + 80} viewBox={`-40 -40 ${PW + 80} ${PH + 80}`}
            style={{ position: 'absolute', left: -40, top: -40 }}>
            <defs>
              <linearGradient id={`mainfg-${uid}`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={PW} y2={PH}>
                <stop offset="0%" stopColor="#c07af5" />
                <stop offset="38%" stopColor="#e58bd8" />
                <stop offset="72%" stopColor="#f0b06a" />
                <stop offset="100%" stopColor="#e8925c" />
              </linearGradient>
              <filter id={`fblur-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation={10} />
              </filter>
              <filter id={`fblur2-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation={3} />
              </filter>
            </defs>
            {[1, -1].map((dir) => (
              <g key={dir}>
                {/* 糊辉光层：一直保留 */}
                <path d={FRAME_D} pathLength={PL} fill="none" stroke={`url(#mainfg-${uid})`}
                  strokeWidth={14} strokeLinecap="butt" filter={`url(#fblur-${uid})`}
                  strokeDasharray={`${headP} ${PL}`}
                  strokeDashoffset={dir === 1 ? 0 : -(PL - headP)}
                  opacity={0.6 * rimGlow} />
                {/* 亮芯细线：面板亮起后淡出并入 rim */}
                <path d={FRAME_D} pathLength={PL} fill="none" stroke={`url(#mainfg-${uid})`}
                  strokeWidth={3.5} strokeLinecap="butt"
                  strokeDasharray={`${headP} ${PL}`}
                  strokeDashoffset={dir === 1 ? 0 : -(PL - headP)}
                  opacity={0.95 * Math.max(frameLine, 0.25)} />
                {/* 奔跑亮头 */}
                {trace < 1 && (
                  <path d={FRAME_D} pathLength={PL} fill="none" stroke="#ffffff"
                    strokeWidth={6} strokeLinecap="round" filter={`url(#fblur2-${uid})`}
                    strokeDasharray={`8 ${PL}`}
                    strokeDashoffset={dir === 1 ? -(Math.max(0, headP - 8)) : -(PL - headP)}
                    opacity={0.95} />
                )}
              </g>
            ))}
          </svg>
        </div>
      </div>
      <Vignette strength={0.5} inner={0.45} color="#030206" />
      <Grain opacity={0.07} blend="soft-light" />
    </AbsoluteFill>
  );
};
