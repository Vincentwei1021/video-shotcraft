// floating-glossy-label-pills — Glossy Pills Carousel 高光胶囊横滑走廊（第二轮重设计）
// 手法不变：四块功能面板横向排成环形走廊，各顶一枚高光胶囊标签；轨道三拍向右换位（缓起→中段冲→缓收，
// 首拍更慢带长尾），居中者放大清晰、两侧缩小下沉变暗微虚形成走廊感；末段光标从右上滑到末位胶囊。
//
// 设计决定
// - look：aurora（紫粉极光暗场）。胶囊是糖果玻璃：四段紫色渐变 + 粉色底部反光 + 上半椭圆高光 + 内描边，
//   居中者再给一圈紫色泛光；面板是带色相的深色玻璃（发丝线 + 顶沿受光 + 两层深影），
//   胶囊的光会在面板顶沿洒下一抹紫（溢光），把"标签"和"页面"连成一个物件。
// - 内容：虚构产品 Halo 的四个功能——Compose（AI 写作）/ Insights（营收曲线）/ Automate（工作流）/
//   Publish（分享发布）。为镜头设计的 UI：每屏一个主信息（大标题 / 大数字 / 三节点 / 大按钮），
//   要读的字 ≥30px；每块居中时自己的主元素做一个小动作（打字、曲线描出、脉冲走线、开关打开），
//   让 hold 段不是死帧，也让"巡览"有内容。
// - 空间：居中面板 1040×640 占画宽 54%；邻位缩到 0.62、下沉 120px、朝外侧转 16°（rotateY），
//   压暗 50% + 2.2px 虚化——走廊有纵深但邻居仍清楚可见；面板脚下一片紫色地面反光。
//
// 时间表（30fps，168f）
//   0–22    开场余量：轨道偏左 36px 缓归位（outQuart），"上一拍刚结束"；Compose 打字
//   24–50   第 1 拍（26f，inOutCubic，+15% 权重拖 42f 长尾）——最慢最软
//   66–86   第 2 拍（20f）            98–116  第 3 拍（18f）——越来越快，hold 越来越短（16f → 12f）
//   换位中：整条轨道按速度加横向运动模糊；胶囊混入 3f 前的轨道位置，比面板晚约 2f 落定（跟随）
//   118     光标右上硬现（2f），outQuart 20f 斜滑到末位胶囊右端
//   140–152 点按：胶囊下压 5%（3f）后弹回；142–160 单次扫光（Q4：只给主角一次，裁进圆角）
//   0–167   全程整体极缓推近 1→1.025（smooth）
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Dust, LOOKS, Stage, alpha, springAt } from '../../_fixtures/Look';
import { EASE, FONT, SpeedBlur, mix, ramp, velocity } from '../../_fixtures/Polish';

export const FLOATING_GLOSSY_LABEL_PILLS_DURATION = 168; // 5600ms @30fps

const L = LOOKS.aurora;
const F = FONT.sans;

// ── 几何（成片像素） ──
const W = 1040, H = 640; // 居中面板
const SP = 800; // 相邻中心距（< W：邻居压在居中面板身后露出一截）
const PANEL_TOP = 304;
const PILL_W = 320, PILL_H = 88, PILL_Y = 212; // 胶囊固定宽度：换文案不改宽，光标终点不用重标
const SIDE_SCALE = 0.62, SINK_PANEL = 120, SINK_PILL = 150, SIDE_ROT = 16;

// ── 轨道三拍（帧） ──
const BEATS = [
  { s: 24, d: 26, tail: 42 }, // 第 1 拍：主体 26f，15% 权重摊到 42f 才收住
  { s: 66, d: 20, tail: 0 },
  { s: 98, d: 18, tail: 0 },
];
const trackAt = (f: number) => {
  let x = -36 * (1 - ramp(f, 0, 22, (t) => 1 - Math.pow(1 - t, 4)));
  for (const B of BEATS) {
    const p = B.tail
      ? 0.85 * ramp(f, B.s, B.d, inOutCubic) + 0.15 * ramp(f, B.s, B.tail, (t) => 1 - Math.pow(1 - t, 3))
      : ramp(f, B.s, B.d, inOutCubic);
    x += p * SP;
  }
  return x;
};
function inOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
const N = 4, RING = N * SP;
const ringPos = (x: number) => ((x % RING) + RING * 1.5) % RING - RING / 2;
// 每块面板"开始居中"的帧：它的主元素从这里起做小动作
const FOCUS_AT = [0, 44, 82, 112];

const CLICK = 140; // 光标点按
const CUR_IN = 118; // 光标硬现

// ───────────────────────── 面板零件 ─────────────────────────

const ink = (size: number, weight: number, color: string = L.ink, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: F, fontSize: size, fontWeight: weight, color, lineHeight: 1.15, whiteSpace: 'nowrap',
  letterSpacing: size >= 60 ? '-0.035em' : size >= 30 ? '-0.015em' : '0.01em', fontVariantNumeric: 'tabular-nums', ...extra,
});
const Abs: React.FC<{ x: number; y: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ x, y, children, style }) => (
  <div style={{ position: 'absolute', left: x, top: y, ...style }}>{children}</div>
);

// 窗口顶栏：三点 + 纹理级小标题 + 协作者头像
const AVA = ['linear-gradient(140deg,#f9a8d4,#c084fc)', 'linear-gradient(140deg,#a5b4fc,#6366f1)', 'linear-gradient(140deg,#fde68a,#f472b6)', 'linear-gradient(140deg,#99f6e4,#818cf8)'];
const Chrome: React.FC<{ title: string }> = ({ title }) => (
  <>
    <div style={{ position: 'absolute', left: 0, top: 0, right: 0, height: 68, borderBottom: `1px solid ${L.line}` }} />
    {[0, 1, 2].map((i) => (
      <div key={i} style={{ position: 'absolute', left: 30 + i * 22, top: 28, width: 12, height: 12, borderRadius: 6, background: alpha(L.ink, 0.16) }} />
    ))}
    <Abs x={114} y={24}><div style={ink(20, 650, L.ink3, { letterSpacing: '0.16em' })}>{title}</div></Abs>
    {AVA.slice(0, 3).map((g, i) => (
      <div key={i} style={{ position: 'absolute', right: 30 + i * 24, top: 18, width: 32, height: 32, borderRadius: 16, background: g, boxShadow: `0 0 0 3px ${L.surface}` }} />
    ))}
  </>
);

// 1) Compose：大标题 + 段落 + AI 续写（居中时逐字打出）+ 建议条
const GHOST = 'and ship it by Friday.';
const Compose: React.FC<{ f: number }> = ({ f }) => {
  const typed = Math.max(0, Math.min(GHOST.length, Math.floor((f - 4) * 1.1)));
  const caret = Math.floor(f / 9) % 2 === 0 || typed < GHOST.length;
  return (
    <>
      <Chrome title="HALO · COMPOSE" />
      <Abs x={64} y={112}><div style={ink(26, 500, L.ink3)}>Draft · Launch narrative</div></Abs>
      <Abs x={64} y={158}><div style={ink(68, 700)}>The calm way to ship.</div></Abs>
      <Abs x={64} y={268} style={{ width: 900 }}>
        <div style={{ ...ink(36, 400, L.ink2), whiteSpace: 'normal', lineHeight: 1.5 }}>
          Halo turns scattered notes, threads and specs into one story your team can review{' '}
          <span style={{ color: L.accent, background: alpha(L.accent, 0.12), borderRadius: 6, padding: '0 4px' }}>{GHOST.slice(0, typed)}</span>
          <span style={{ display: 'inline-block', width: 3, height: 38, marginLeft: 2, verticalAlign: '-6px', background: L.accent, opacity: caret ? 1 : 0 }} />
        </div>
      </Abs>
      <Abs x={64} y={474} style={{ width: 912, height: 80, borderRadius: 20, background: L.surface2, boxShadow: `inset 0 0 0 1px ${L.line}` }}>
        <svg width={30} height={30} viewBox="0 0 24 24" style={{ position: 'absolute', left: 28, top: 25 }}>
          <path d="M12 2 L14.2 9.8 L22 12 L14.2 14.2 L12 22 L9.8 14.2 L2 12 L9.8 9.8 Z" fill={L.accent} />
        </svg>
        <Abs x={76} y={21}><div style={ink(32, 550)}>Suggest a sharper opening</div></Abs>
        <Abs x={812} y={20} style={{ padding: '6px 16px', borderRadius: 10, boxShadow: `inset 0 0 0 1.5px ${alpha(L.ink, 0.18)}` }}>
          <div style={ink(24, 600, L.ink2)}>Tab</div>
        </Abs>
      </Abs>
    </>
  );
};

// 2) Insights：大数字（居中时数上来）+ 增幅 + 渐变面积曲线（居中时描出）
const CHART = [0.62, 0.58, 0.66, 0.6, 0.7, 0.66, 0.78, 0.74, 0.86, 0.82, 0.95];
const chartPath = (w: number, h: number) => {
  const pts = CHART.map((v, i) => [(i / (CHART.length - 1)) * w, h - v * h] as const);
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C${cx} ${y0} ${cx} ${y1} ${x1} ${y1}`;
  }
  return { d, end: pts[pts.length - 1] };
};
const Insights: React.FC<{ f: number }> = ({ f }) => {
  const k = ramp(f, 2, 26, EASE.out);
  const val = mix(2.12, 2.48, k);
  const draw = ramp(f, 0, 30, EASE.swift);
  const CW = 912, CH = 230;
  const { d, end } = chartPath(CW, CH);
  return (
    <>
      <Chrome title="HALO · INSIGHTS" />
      <Abs x={64} y={112}><div style={ink(28, 500, L.ink2)}>Net revenue · Q3</div></Abs>
      <Abs x={58} y={150}><div style={ink(150, 700, L.ink, { letterSpacing: '-0.05em', lineHeight: 1 })}>${val.toFixed(2)}M</div></Abs>
      <Abs x={680} y={196} style={{ padding: '10px 20px', borderRadius: 999, background: alpha(L.accent2, 0.14), boxShadow: `inset 0 0 0 1px ${alpha(L.accent2, 0.3)}` }}>
        <div style={ink(32, 650, L.accent2)}>▲ 18.2%</div>
      </Abs>
      <svg width={CW} height={CH + 40} viewBox={`0 -20 ${CW} ${CH + 40}`} style={{ position: 'absolute', left: 64, top: 340, overflow: 'visible' }}>
        <defs>
          <linearGradient id="fglp-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={L.accent} stopOpacity={0.42} />
            <stop offset="1" stopColor={L.accent} stopOpacity={0} />
          </linearGradient>
          <clipPath id="fglp-draw"><rect x={-10} y={-40} width={(CW + 20) * draw} height={CH + 80} /></clipPath>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => <line key={g} x1={0} x2={CW} y1={CH * g} y2={CH * g} stroke={alpha(L.ink, 0.07)} strokeWidth={1.5} />)}
        <g clipPath="url(#fglp-draw)">
          <path d={`${d} L${CW} ${CH} L0 ${CH} Z`} fill="url(#fglp-area)" />
          <path d={d} fill="none" stroke={L.accent} strokeWidth={5} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 10px ${alpha(L.accent, 0.7)})` }} />
        </g>
        <circle cx={end[0]} cy={end[1]} r={11} fill={L.ink} opacity={ramp(f, 26, 6)} style={{ filter: `drop-shadow(0 0 12px ${alpha(L.accent, 0.9)})` }} />
      </svg>
      {['Jul', 'Aug', 'Sep'].map((m, i) => (
        <Abs key={m} x={64 + i * 420} y={590}><div style={ink(22, 600, L.ink3, { letterSpacing: '0.12em' })}>{m.toUpperCase()}</div></Abs>
      ))}
    </>
  );
};

// 3) Automate：三节点工作流，居中时一颗光点沿连线跑过
const NODES = [
  { t: 'New signup', s: 'Trigger', g: `linear-gradient(140deg, ${L.accent}, #7c4dff)` },
  { t: 'Enrich with AI', s: 'Action', g: `linear-gradient(140deg, ${L.accent2}, #c026d3)` },
  { t: 'Notify team', s: 'Action', g: 'linear-gradient(140deg, #99f6e4, #6366f1)' },
];
const Automate: React.FC<{ f: number }> = ({ f }) => {
  const NW = 270, NH = 168, GAP = 51, Y = 286;
  const pulse = ramp(f, 4, 34, EASE.smooth); // 0→1 走完两段连线
  return (
    <>
      <Chrome title="HALO · AUTOMATE" />
      <Abs x={64} y={112}><div style={ink(28, 500, L.ink2)}>Workflow · Onboarding</div></Abs>
      <Abs x={64} y={154}><div style={ink(60, 700)}>When someone signs up</div></Abs>
      {NODES.map((n, i) => {
        const x = 64 + i * (NW + GAP);
        const lit = ramp(f, 4 + i * 16, 8, EASE.out);
        return (
          <Abs key={n.t} x={x} y={Y} style={{ width: NW, height: NH, borderRadius: 24, background: L.surface2, boxShadow: `inset 0 0 0 1px ${alpha(L.accent, 0.12 + 0.3 * lit)}, 0 0 ${30 * lit}px ${alpha(L.accent, 0.18 * lit)}` }}>
            <div style={{ position: 'absolute', left: 24, top: 24, width: 52, height: 52, borderRadius: 14, background: n.g, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)' }} />
            <Abs x={24} y={92}><div style={ink(30, 650)}>{n.t}</div></Abs>
            <Abs x={24} y={132}><div style={ink(22, 600, L.ink3, { letterSpacing: '0.12em' })}>{n.s.toUpperCase()}</div></Abs>
          </Abs>
        );
      })}
      {[0, 1].map((i) => {
        const x0 = 64 + (i + 1) * NW + i * GAP, y = Y + NH / 2;
        const p = Math.min(1, Math.max(0, pulse * 2 - i));
        return (
          <React.Fragment key={i}>
            <div style={{ position: 'absolute', left: x0, top: y - 1.5, width: GAP, height: 3, background: alpha(L.accent, 0.35) }} />
            {p > 0 && p < 1 && (
              <div style={{ position: 'absolute', left: x0 + GAP * p - 7, top: y - 7, width: 14, height: 14, borderRadius: 7, background: L.ink, boxShadow: `0 0 16px ${L.accent}, 0 0 4px #fff` }} />
            )}
          </React.Fragment>
        );
      })}
      <Abs x={64} y={516} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 14, height: 14, borderRadius: 7, background: '#5eead4', boxShadow: '0 0 12px rgba(94,234,212,0.8)' }} />
        <div style={ink(30, 500, L.ink2)}>Live · 1,284 runs this week</div>
      </Abs>
    </>
  );
};

// 4) Publish：分享发布面板，居中时"公开链接"开关打开
const Publish: React.FC<{ f: number }> = ({ f }) => {
  const on = ramp(f, 8, 10, EASE.snappy);
  return (
    <>
      <Chrome title="HALO · PUBLISH" />
      <Abs x={64} y={112}><div style={ink(28, 500, L.ink2)}>Share · Q3 Launch Plan</div></Abs>
      <Abs x={64} y={154}><div style={ink(64, 700)}>Ready to publish</div></Abs>
      <Abs x={64} y={262} style={{ display: 'flex', alignItems: 'center' }}>
        {AVA.map((g, i) => <div key={i} style={{ width: 48, height: 48, borderRadius: 24, background: g, marginLeft: i ? -12 : 0, boxShadow: `0 0 0 4px ${L.surface}` }} />)}
        <div style={{ ...ink(30, 500, L.ink2), marginLeft: 22 }}>Maya, Theo and 2 others can edit</div>
      </Abs>
      <Abs x={64} y={350} style={{ width: 912, height: 86, borderRadius: 20, background: L.surface2, boxShadow: `inset 0 0 0 1px ${L.line}` }}>
        <Abs x={28} y={24}><div style={ink(32, 600)}>Public link</div></Abs>
        <Abs x={300} y={28}><div style={ink(28, 500, L.ink3, { fontFamily: FONT.mono, letterSpacing: 0 })}>halo.page/q3-launch</div></Abs>
        <div style={{ position: 'absolute', right: 28, top: 22, width: 84, height: 42, borderRadius: 21, background: on > 0.5 ? L.accent : alpha(L.ink, 0.16), transition: 'none' }}>
          <div style={{ position: 'absolute', top: 4, left: mix(4, 46, on), width: 34, height: 34, borderRadius: 17, background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.35)' }} />
        </div>
      </Abs>
      <Abs x={64} y={480} style={{ width: 360, height: 84, borderRadius: 22, background: `linear-gradient(180deg, #c4b5fd 0%, ${L.accent} 45%, #7c4dff 100%)`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.5), 0 14px 30px -8px ${alpha('#7c4dff', 0.7)}` }}>
        <div style={{ ...ink(32, 650, '#ffffff'), position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Publish to web</div>
      </Abs>
      <Abs x={456} y={505}><div style={ink(28, 500, L.ink3)}>Anyone with the link can view</div></Abs>
    </>
  );
};

const PANELS: { pill: string; icon: string; Body: React.FC<{ f: number }> }[] = [
  { pill: 'Compose', icon: 'M4 20 L4 16 L15 5 L19 9 L8 20 Z M13 7 L17 11', Body: Compose },
  { pill: 'Insights', icon: 'M5 19 L5 12 M10 19 L10 7 M15 19 L15 10 M20 19 L20 4', Body: Insights },
  { pill: 'Automate', icon: 'M13 2 L5 13 L11 13 L10 22 L19 10 L13 10 Z', Body: Automate },
  { pill: 'Publish', icon: 'M12 19 L12 5 M6 11 L12 5 L18 11', Body: Publish },
];

// macOS 指针（tip 在 (0,0)）
const Cursor: React.FC = () => (
  <svg width={13 * 3.4} height={19 * 3.4} viewBox="0 0 13 19" style={{ position: 'absolute', left: -3, top: -3, overflow: 'visible', filter: 'drop-shadow(0 4px 6px rgba(5,2,15,0.55))' }}>
    <path d="M1 1 L1 15.2 L4.4 12 L6.9 17.6 L9.3 16.6 L6.9 11.1 L11.6 11.1 Z" fill="#111216" stroke="#fff" strokeWidth={1.05} strokeLinejoin="round" />
  </svg>
);

// ───────────────────────── 镜头 ─────────────────────────

export const FloatingGlossyLabelPills: React.FC = () => {
  const frame = useCurrentFrame();
  const trackX = trackAt(frame);
  const pillTrack = mix(trackX, trackAt(frame - 3), 0.3); // 胶囊跟随：晚约 2f 落定
  const vx = velocity(trackAt, frame);
  const push = 1 + 0.025 * ramp(frame, 0, 167, EASE.smooth);
  // 光标：硬现后 outQuart 斜滑到末位胶囊右端（胶囊中心 960，右缘 1120）
  const cp = ramp(frame, CUR_IN, 20, (t) => 1 - Math.pow(1 - t, 4));
  const curX = mix(1480, 1086, cp), curY = mix(70, PILL_Y + 8, cp);
  // 点按：3f 下压，随后弹簧弹回
  const press = frame < CLICK ? 0 : frame < CLICK + 3 ? ramp(frame, CLICK, 3, EASE.out) : 1 - springAt(frame, CLICK + 3, { damping: 14, stiffness: 260 });
  const sheen = ramp(frame, CLICK + 2, 18, EASE.swift);

  return (
    <Stage look={L} keyLight={{ x: 0.5, y: 0.02 }} fill={{ x: 0.86, y: 0.98 }} horizon={0.93} breathe={0.6} vignette={0.5}>
      {/* 面板脚下的地面反光（紫） */}
      <div style={{ position: 'absolute', left: 300, right: 300, top: 900, height: 200, borderRadius: '50%', background: `radial-gradient(closest-side, ${alpha(L.accent, 0.3)}, ${alpha(L.accent, 0)})` }} />
      <Dust look={L} count={26} seed={3} drift={0.22} opacity={0.5} color="#d8c8ff" />

      <AbsoluteFill style={{ transform: `scale(${push.toFixed(5)})`, transformOrigin: '50% 45%' }}>
        <SpeedBlur vx={vx} amount={0.065} max={3}>
          {/* 先画离心远的，居中的最后画（压在邻居上面） */}
          {PANELS.map((P, i) => ({ P, i, wx: ringPos(trackX - i * SP) }))
            .sort((a, b) => Math.abs(b.wx) - Math.abs(a.wx))
            .map(({ P, i, wx }) => {
              const d = Math.min(1, Math.abs(wx) / SP); // 0 = 正居中，1 = 邻位
              const sc = mix(1, SIDE_SCALE, d);
              const rot = -Math.sign(wx) * SIDE_ROT * d; // 邻位朝外侧转：走廊纵深
              const pwx = ringPos(pillTrack - i * SP);
              const pd = Math.min(1, Math.abs(pwx) / SP);
              const psc = mix(1, SIDE_SCALE, pd);
              const isLast = i === N - 1;
              const pr = isLast ? press : 0;
              const bob = Math.sin(frame / 20 + i * 1.7) * 4; // 漂浮：极缓上下浮动
              const lit = 1 - pd; // 居中程度 → 泛光
              const fLocal = frame - FOCUS_AT[i];
              const Body = P.Body;
              if (Math.abs(wx) > SP * 1.7) return null; // 画外的不画
              return (
                <React.Fragment key={i}>
                  {/* 面板 */}
                  <div
                    style={{
                      position: 'absolute', left: 960 - W / 2, top: PANEL_TOP, width: W, height: H, transformOrigin: '50% 0',
                      transform: `translateX(${wx.toFixed(2)}px) translateY(${(d * SINK_PANEL).toFixed(2)}px) ` +
                        (Math.abs(rot) > 0.01 ? `perspective(2200px) rotateY(${rot.toFixed(3)}deg) ` : '') + `scale(${sc.toFixed(4)})`,
                      filter: d > 0.01 ? `blur(${(d * 2.2).toFixed(2)}px)` : undefined,
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute', inset: 0, borderRadius: 32, overflow: 'hidden',
                        background: `linear-gradient(180deg, #1f1834 0%, ${L.surface} 46%, #100b1d 100%)`,
                        boxShadow: `0 0 0 1px ${L.line}, 0 50px 100px -20px ${alpha(L.shadow, 0.95)}, 0 18px 40px ${alpha(L.shadow, 0.7)}`,
                      }}
                    >
                      <Body f={fLocal} />
                      {/* 胶囊溢光：顶沿正中一抹紫，随居中程度出现 */}
                      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 260, background: `radial-gradient(ellipse 40% 100% at 50% 0%, ${alpha(L.accent, 0.22 * (1 - d))}, ${alpha(L.accent, 0)} 70%)`, pointerEvents: 'none' }} />
                      {/* 顶沿受光 */}
                      <div style={{ position: 'absolute', inset: 0, borderRadius: 32, boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.14)}`, pointerEvents: 'none' }} />
                      {/* 离心压暗 */}
                      {d > 0.01 && <div style={{ position: 'absolute', inset: 0, background: alpha('#07040f', 0.5 * d) }} />}
                    </div>
                  </div>
                  {/* 胶囊：比面板沉得更多，离心时贴近面板顶边 */}
                  <div
                    style={{
                      position: 'absolute', left: 960 - PILL_W / 2, top: PILL_Y - PILL_H / 2, width: PILL_W, height: PILL_H, borderRadius: 999,
                      transform: `translateX(${pwx.toFixed(2)}px) translateY(${(pd * SINK_PILL + bob * (1 - pd * 0.5)).toFixed(2)}px) scale(${(psc * (1 - 0.05 * pr)).toFixed(4)})`,
                      boxShadow: `0 ${mix(22, 10, pd)}px ${mix(44, 24, pd)}px -10px ${alpha('#5b21b6', 0.75)}, 0 0 ${70 * lit}px ${alpha(L.accent, 0.42 * lit)}`,
                      filter: pd > 0.01 ? `blur(${(pd * 1.6).toFixed(2)}px)` : undefined,
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute', inset: 0, borderRadius: 999, overflow: 'hidden',
                        background: `radial-gradient(ellipse 70% 60% at 50% 125%, ${alpha('#ffc4ec', 0.75)}, ${alpha('#ffc4ec', 0)} 70%), linear-gradient(180deg, #ddd0ff 0%, #a78bfa 34%, #7c4dff 70%, #5b21b6 100%)`,
                        boxShadow: `inset 0 0 0 1.5px ${alpha('#ffffff', 0.28)}, inset 0 -6px 14px ${alpha('#3b0f8c', 0.55)}`,
                      }}
                    >
                      {/* 上半椭圆高光，裁在胶囊圆角内 */}
                      <div style={{ position: 'absolute', left: 18, right: 18, top: 5, height: '44%', borderRadius: 999, background: 'linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,255,255,0.04))' }} />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                        <svg width={32} height={32} viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 1px 1.5px rgba(40,10,110,0.6))' }}>
                          <path d={P.icon} fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span style={{ ...ink(38, 650, '#ffffff'), letterSpacing: '-0.015em', textShadow: '0 1.5px 2px rgba(50,10,120,0.55)' }}>{P.pill}</span>
                      </div>
                      {isLast && sheen > 0 && sheen < 1 && (
                        // 点按后的单次扫光：斜向白带从左扫到右，screen 混合，裁在胶囊圆角内（Q4）
                        <div style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen', opacity: Math.sin(Math.PI * sheen) * 0.85, background: `linear-gradient(105deg, transparent ${mix(-40, 110, sheen) - 14}%, rgba(255,255,255,0.75) ${mix(-40, 110, sheen)}%, transparent ${mix(-40, 110, sheen) + 14}%)` }} />
                      )}
                      {pd > 0.01 && <div style={{ position: 'absolute', inset: 0, background: alpha('#0b0616', 0.4 * pd) }} />}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
        </SpeedBlur>
      </AbsoluteFill>

      {/* 光标：硬现（2f），不随整体推近（它在屏幕空间） */}
      {frame >= CUR_IN && (
        <div style={{ position: 'absolute', left: curX, top: curY + 3 * press, width: 0, height: 0, opacity: ramp(frame, CUR_IN, 2), zIndex: 5 }}>
          <Cursor />
        </div>
      )}
    </Stage>
  );
};
