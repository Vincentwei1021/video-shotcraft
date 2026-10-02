// popup-book-rise —— 立体书立起
// 一本摊开的"年度报告"立体书平躺在桌上，页面上印着的 dashboard 卡片是模切纸片：沿各自底边
// 由远到近错峰立起成墙（spring 过冲到 ~95° 再回弹 90°，纸的韧性），最后最近的一条标题横幅立起收尾。
//
// 第二轮重设计（暖白纸 · 瑞士网格数据报告 · 立体书剧场）：
// - look = paper（暖白纸 + 墨 + 朱红）。主体不再是灰条骨架卡，而是 7 张为镜头设计的数据纸片：
//   后排 3 张高卡（营收主图 / 活跃团队 / NPS 环）、前排 3 张矮卡（可用性 / 流失 / 发布节奏）、
//   最前一条 1200 宽标题横幅「Year in review.」。数字 72–150px 粗黑体 + 等宽小标签，
//   朱红只给营收曲线、标题句点与横幅年份。
// - 舞台：一本对开书（中缝阴影 + 页边厚度 + 两侧页面微弧光）躺在暖纸桌面上；卡片躺平时是
//   页面上的"印刷件"（看得到版式），立起后露出模切凹槽，根部投影随立起收窄。
// - 景深层次：后排高、前排矮、横幅最近——立起后形成三层错落的纸艺剧场，前层挡住后层的下沿。
// - 相机：只做一次缓慢降臂 rotateX 55°→70°（0–96f in-out，之后再极缓 1°）：开场俯看整页印刷，
//   收尾贴近桌面，立起的纸片越来越正对镜头（构件自己立起是主角，相机只是陪着落低）。
//
// 时间表（30fps，共 156f）：
//   0–10    预备：书页平躺、印刷件可读，相机已在缓慢降臂（首帧不空）
//   10–22   后排三张错峰立起（间隔 6f，spring damping 11 → 过冲 ~5° 回弹）
//   30–40   前排三张错峰立起（间隔 5f，更密 = 越来越快）
//   52      标题横幅立起（最大、最近、最后——收尾重音）
//   52–92   余波：横幅回弹落定，所有根部投影收窄
//   92–156  hold：相机降臂收尾（96f 后只剩 1° 极缓漂移），干净定格
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, springAt, type } from '../../_fixtures/Look';

export const POPUP_BOOK_RISE_DURATION = 156;

// paper 微调：远处桌面/背景压暗一档（顶 → 底由暗到亮），白纸片立起后轮廓更清楚
const L = { ...LOOKS.paper, bg: ['#cfc5b5', '#e2d9ca', '#eee7da'] as [string, string, string] };

// 书页（对开）坐标系：PW×PH 设计 px，卡片沿 hinge 线立起
const PW = 1800;
const PH = 1560;

type Piece = {
  id: string; x: number; hinge: number; w: number; h: number; start: number; kind: 'teams' | 'revenue' | 'nps' | 'uptime' | 'churn' | 'cadence' | 'banner';
};
const BACK = 620;
const FRONT = 1040;
const BANNER = 1460;
const PIECES: Piece[] = [
  { id: 'teams', kind: 'teams', x: 110, hinge: BACK, w: 440, h: 480, start: 10 },
  { id: 'revenue', kind: 'revenue', x: 580, hinge: BACK, w: 640, h: 540, start: 16 },
  { id: 'nps', kind: 'nps', x: 1250, hinge: BACK, w: 440, h: 480, start: 22 },
  { id: 'uptime', kind: 'uptime', x: 170, hinge: FRONT, w: 440, h: 240, start: 30 },
  { id: 'churn', kind: 'churn', x: 680, hinge: FRONT, w: 440, h: 240, start: 35 },
  { id: 'cadence', kind: 'cadence', x: 1190, hinge: FRONT, w: 440, h: 240, start: 40 },
  { id: 'banner', kind: 'banner', x: 280, hinge: BANNER, w: 1240, h: 200, start: 52 },
];

const INK = L.ink;
const INK2 = L.ink2;
const INK3 = L.ink3;
const RED = L.accent;

const Label: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color }) => (
  <div style={{ fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.16em', color: color ?? INK2, textTransform: 'uppercase' }}>{children}</div>
);

// 营收曲线（朱红）：12 个月
const REV = [0.18, 0.22, 0.2, 0.3, 0.34, 0.33, 0.45, 0.52, 0.5, 0.66, 0.78, 0.94];

const PieceFace: React.FC<{ p: Piece }> = ({ p }) => {
  const pad = 36;
  if (p.kind === 'banner') {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 56px', boxSizing: 'border-box', background: INK, color: '#f6f2ea' }}>
        <div style={{ ...type(118, 800), letterSpacing: '-0.05em', whiteSpace: 'nowrap' }}>
          Year in review<span style={{ color: RED }}>.</span>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.18em', color: alpha('#f6f2ea', 0.6) }}>NORTHWIND</div>
          <div style={{ ...type(64, 700), color: RED, marginTop: 4 }}>2026</div>
        </div>
      </div>
    );
  }
  const frame: React.CSSProperties = { position: 'absolute', inset: 0, padding: pad, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', color: INK };
  if (p.kind === 'revenue') {
    const cw = p.w - pad * 2;
    const ch = 190;
    const pts = REV.map((v, i) => [(i / (REV.length - 1)) * cw, ch - v * ch] as const);
    const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    return (
      <div style={frame}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Label>Annual revenue</Label>
          <div style={{ ...type(30, 700), color: RED }}>▲ 41%</div>
        </div>
        <div style={{ ...type(150, 800), letterSpacing: '-0.055em', marginTop: 14 }}>$4.82M</div>
        <svg width={cw} height={ch + 30} style={{ marginTop: 26, overflow: 'visible' }}>
          {[0, 0.5, 1].map((g) => <line key={g} x1={0} x2={cw} y1={ch * g} y2={ch * g} stroke={L.line} strokeWidth={1.5} />)}
          <path d={`${d} L${cw},${ch} L0,${ch} Z`} fill={alpha(RED, 0.1)} />
          <path d={d} fill="none" stroke={RED} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={9} fill={RED} />
          {['JAN', 'APR', 'JUL', 'OCT'].map((m, i) => (
            <text key={m} x={(i / 3) * cw * 0.92} y={ch + 28} fontFamily={FONT.mono} fontSize={20} letterSpacing="0.1em" fill={INK3}>{m}</text>
          ))}
        </svg>
      </div>
    );
  }
  if (p.kind === 'teams') {
    const bars = [0.3, 0.38, 0.35, 0.48, 0.55, 0.52, 0.64, 0.72, 0.7, 0.84, 0.9, 1];
    return (
      <div style={frame}>
        <Label>Active teams</Label>
        <div style={{ ...type(104, 800), letterSpacing: '-0.05em', marginTop: 14 }}>12,480</div>
        <div style={{ ...type(32, 600), color: INK2, marginTop: 6 }}>+38% year over year</div>
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-end', gap: 9, height: 110 }}>
          {bars.map((b, i) => <div key={i} style={{ flex: 1, height: `${b * 100}%`, background: i === bars.length - 1 ? INK : alpha(INK, 0.18), borderRadius: 2 }} />)}
        </div>
      </div>
    );
  }
  if (p.kind === 'nps') {
    const r = 92;
    const c = 2 * Math.PI * r;
    return (
      <div style={frame}>
        <Label>Customer NPS</Label>
        <div style={{ position: 'relative', marginTop: 'auto', marginBottom: 'auto', alignSelf: 'center', width: 250, height: 250 }}>
          <svg width={250} height={250} viewBox="0 0 250 250" style={{ position: 'absolute', inset: 0 }}>
            <circle cx={125} cy={125} r={r} fill="none" stroke={alpha(INK, 0.1)} strokeWidth={22} />
            <circle cx={125} cy={125} r={r} fill="none" stroke={INK} strokeWidth={22} strokeDasharray={`${c * 0.72} ${c}`} transform="rotate(-90 125 125)" strokeLinecap="butt" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', ...type(96, 800), letterSpacing: '-0.05em' }}>72</div>
        </div>
      </div>
    );
  }
  const small = {
    uptime: { label: 'Uptime', value: '99.98%', note: '12 of 12 regions' },
    churn: { label: 'Net churn', value: '1.2%', note: 'down from 3.4%' },
    cadence: { label: 'Releases', value: '164', note: '3.1 per week' },
  }[p.kind];
  return (
    <div style={frame}>
      <Label>{small.label}</Label>
      <div style={{ ...type(84, 800), letterSpacing: '-0.05em', marginTop: 12 }}>{small.value}</div>
      <div style={{ ...type(30, 550), color: INK2, marginTop: 8 }}>{small.note}</div>
    </div>
  );
};

const PopPiece: React.FC<{ p: Piece; frame: number }> = ({ p, frame }) => {
  // 0 = 平躺在页面上，1 = 立直（局部 rotateX -90°）；damping 11 过冲到 ~1.05（≈95°）再回弹
  const s = springAt(frame, p.start, { damping: 11, stiffness: 120, mass: 0.9 });
  const rx = -90 * s;
  const stand = Math.min(1, Math.max(0, s));
  const lie = 1 - stand;
  // 立起中段卡面朝向主光（≈45°）最亮，落定回常态
  const facing = Math.sin(stand * Math.PI);
  const isBanner = p.kind === 'banner';
  return (
    <div style={{ position: 'absolute', left: p.x, top: p.hinge - p.h, width: p.w, height: p.h, transformStyle: 'preserve-3d' }}>
      {/* 模切凹槽（立起后露出）：浅槽 + 内阴影 */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 4,
        background: `linear-gradient(180deg, ${alpha('#d9cfbf', 0.7)} 0%, ${alpha('#e7dfd2', 0.6)} 100%)`,
        boxShadow: 'inset 0 3px 8px rgba(42,29,16,0.16), inset 0 0 0 1.5px rgba(42,29,16,0.08)',
      }} />
      {/* 根部投影：贴在页面上不随立起（光在左上 → 影往卡后右侧拖），随立起收窄 */}
      <div style={{
        position: 'absolute', left: 10, right: -10, bottom: 0, height: 26 + 110 * lie,
        background: `rgba(42,29,16,${(0.1 + 0.14 * lie).toFixed(3)})`, borderRadius: 8, filter: 'blur(12px)',
        opacity: stand > 0.02 ? 1 : 0,
      }} />
      <div style={{
        position: 'absolute', left: 6, right: 6, bottom: -3, height: 6, borderRadius: 3,
        background: `rgba(42,29,16,${(0.32 * stand).toFixed(3)})`, filter: 'blur(3px)',
      }} />
      {/* 纸片本体：沿底边立起 */}
      <div style={{
        position: 'absolute', inset: 0, transform: `rotateX(${rx.toFixed(3)}deg)`, transformOrigin: '50% 100%',
        backfaceVisibility: 'hidden', borderRadius: 4, overflow: 'hidden',
        background: isBanner ? INK : `linear-gradient(180deg, ${L.surface} 0%, #f9f4ea 100%)`,
        boxShadow: isBanner ? 'none' : `inset 0 0 0 1.5px ${alpha(INK, 0.08)}`,
      }}>
        <PieceFace p={p} />
        {/* 纸纤维 */}
        <Grain opacity={0.08} freq={1.2} blend="multiply" step={1000} />
        {/* 铰链处环境遮蔽：立起后底边一层渐暗 */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(0deg, rgba(42,29,16,0.16) 0%, rgba(42,29,16,0) 22%)', opacity: stand }} />
        {/* 受光：立起中段整面提亮一次（上亮下暗） */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: facing * 0.85,
          background: 'linear-gradient(180deg, rgba(255,252,244,0.38) 0%, rgba(255,252,244,0) 50%, rgba(42,29,16,0.08) 100%)',
        }} />
        {/* 躺平时卡面朝天、略灰（离光远）；立起后回到正常亮度 */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'rgba(60,44,24,0.06)', opacity: lie }} />
      </div>
    </div>
  );
};

export const PopupBookRise: React.FC = () => {
  const frame = useCurrentFrame();
  // 相机降臂：55°（俯看整页印刷）→ 70°（贴近桌面看立起的纸墙），0–96f in-out；之后极缓再走 1°
  const cam = ramp(frame, 0, 96, EASE.smooth);
  const sceneRx = 55 + 15 * cam + 1 * ramp(frame, 96, 60, EASE.out);

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', background: L.bg[2] }}>
      <Stage look={L} keyLight={{ x: 0.36, y: 0.12 }} fill={null} vignette={0.42} grain={0.05}>
        {/* 桌面纸纹 */}
        <Grain opacity={0.08} freq={0.5} scale={2} blend="multiply" step={1000} />
      </Stage>

      <div style={{ position: 'absolute', inset: 0, perspective: 2400, perspectiveOrigin: '50% 30%' }}>
        <div style={{
          position: 'absolute', left: (1920 - PW) / 2, top: 972 - PH, width: PW, height: PH,
          transform: `rotateX(${sceneRx.toFixed(3)}deg)`,
          transformOrigin: '50% 100%', transformStyle: 'preserve-3d',
        }}>
          {/* 书：页边厚度（下沿几层纸）+ 桌面接触影 */}
          <div style={{ position: 'absolute', left: -14, right: -14, top: -10, bottom: -22, borderRadius: 10, background: '#d8ccb8', boxShadow: '0 30px 80px rgba(42,29,16,0.35), 0 4px 10px rgba(42,29,16,0.25)' }} />
          <div style={{ position: 'absolute', left: -8, right: -8, top: -5, bottom: -12, borderRadius: 8, background: 'repeating-linear-gradient(180deg, #efe6d6 0px, #efe6d6 3px, #ddd2bf 4px)' }} />
          {/* 两页：各自向中缝微微变暗 + 外侧受光 */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 6, overflow: 'hidden',
            background:
              'linear-gradient(90deg, #f7f1e6 0%, #fbf7ef 30%, #efe7d8 48.6%, #d9ceba 50%, #efe7d8 51.4%, #fbf7ef 70%, #f4ede1 100%)',
          }}>
            {/* 页面印刷：页眉、页码、网格线 */}
            <div style={{ position: 'absolute', left: 80, top: 40, fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.18em', color: INK3 }}>NORTHWIND — ANNUAL REPORT</div>
            <div style={{ position: 'absolute', right: 80, top: 40, fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.18em', color: INK3 }}>P. 12 — 13</div>
            {[BACK, FRONT, BANNER].map((y) => (
              <div key={y} style={{ position: 'absolute', left: 60, right: 60, top: y + 14, height: 1.5, background: alpha(INK, 0.12) }} />
            ))}
            <Grain opacity={0.1} freq={1.1} blend="multiply" step={1000} />
          </div>
          {/* 纸片（远 → 近，DOM 顺序即遮挡顺序） */}
          {PIECES.map((p) => <PopPiece key={p.id} p={p} frame={frame} />)}
        </div>
      </div>
    </div>
  );
};
