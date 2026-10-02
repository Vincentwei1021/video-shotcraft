// scan-bracket-sweep — 取景括号 + 扫描光带：文档落到画面中央，四角落下 L 形取景括号，
// 一条扫描光带拖着随速度伸缩的尾迹在文档上往复扫 5 趟，两端慢中间快——文档全程静止，只有光在读它。
//
// 第二轮重设计（暖黑 · 琥珀扫描光 · 合同审阅）：
// - look = ember。主体是一份 1180×700 的暗色合同条款表（「Master Services Agreement」7 条条款），
//   放在暖黑舞台正中，占画宽 61%；条款字 30px，真能读。扫描光是琥珀色：白热细芯 + 金色柔辉 +
//   screen 叠加的暖色拖尾（暗场里光是"加"上去的，不再是亮场的 multiply 染色），整条裁进文档圆角。
// - "光在读"做成可见的结果：第 1 趟光芯扫过的行由暗转亮（未读 ink3 → 已读 ink），两条有风险的条款
//   在光芯经过时于右侧页边亮起琥珀标记；之后每趟光芯经过行只做瞬时提亮。文档本身一像素不动。
// - 底部 HUD（不在文档里）：状态点 + 进度条 + 「Clause 04 / 07」跟着扫描走；扫完收束为
//   「Review ready · 2 clauses flagged」，四角括号同帧向内收紧一次（锁定），给结尾一拍。
//
// 时间表（30fps，共 190f）：
//   0–18    预备 + 入场：舞台光第 1 帧就在；文档 scale 0.94→1（snappy），透明度先到——先"在了"再"稳了"
//   10–30   四角括号错峰从外侧 40px 斜向落位（overshoot ~8% 一次回弹），各 14f
//   30–146  扫描 5 趟（每趟 ~23f：inOutSine + 末 12% 停顿换气），30–36 淡入、142–150 淡出
//   148–162 收束：括号向内收紧 14px（spring damping 16）、HUD 文案切换、标记常驻
//   162–190 hold 28f：相机全程 smooth 极缓推进 1.000→1.018（~180f 收敛）
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, FONT, mix, ramp } from '../../_fixtures/Polish';
import { Dust, LOOKS, Stage, alpha, springAt, type } from '../../_fixtures/Look';

export const SCAN_BRACKET_SWEEP_DURATION = 190;

const L = LOOKS.ember;
const AMBER = L.accent2; // 扫描光 / 标记（唯一的光色）
const ORANGE = L.accent;

// 文档几何（画布像素）
const DW = 1180;
const DH = 700;
const DX = (1920 - DW) / 2;
const DY = 128;
const R = 22; // 文档圆角（光带裁切与之一致）

// 表格
const ROW_TOP = 196; // 第一行顶（文档内）
const ROW_H = 58;
const COLS = [64, 150, 560, 960]; // §、条款、条款内容、负责人 的左缘
type Row = { no: string; clause: string; term: string; owner: string; flag?: string };
const ROWS: Row[] = [
  { no: '01', clause: 'Term', term: '24 months, auto-renews', owner: 'Legal' },
  { no: '02', clause: 'Fees', term: '$18,400 per month', owner: 'Finance' },
  { no: '03', clause: 'Payment', term: 'Net 45 from invoice', owner: 'Finance', flag: 'Policy is Net 30' },
  { no: '04', clause: 'Liability cap', term: '1× annual fees', owner: 'Legal' },
  { no: '05', clause: 'Data residency', term: 'EU region only', owner: 'Security' },
  { no: '06', clause: 'Termination', term: '90 days written notice', owner: 'Legal', flag: 'Standard is 30 days' },
  { no: '07', clause: 'Governing law', term: 'State of Delaware', owner: 'Legal' },
];
const rowCenter = (r: number) => ROW_TOP + r * ROW_H + ROW_H / 2;

// 扫描
const SCAN0 = 30;
const SCAN1 = 146;
const PASSES = 5;
const Y_MIN = 150; // 光带行程：表头下沿 → 表尾（文档内 y）
const Y_MAX = ROW_TOP + ROWS.length * ROW_H + 12;
const TAIL = 200; // 峰值速度时的拖尾长度（px）

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const inOutSin = (x: number) => 0.5 - Math.cos(Math.PI * clamp01(x)) / 2;

// 扫描位置（文档内 y）与方向、所在趟：帧的纯函数（便于求速度）
const scanAt = (f: number) => {
  const sp = clamp01((f - SCAN0) / (SCAN1 - SCAN0));
  const raw = sp * PASSES;
  const pi = Math.min(PASSES - 1, Math.floor(raw));
  const local = clamp01((raw - pi) / 0.88); // 每趟末 12% 完全停顿
  const dir = pi % 2 === 0 ? 1 : -1;
  const prog = inOutSin(local);
  const y = dir > 0 ? mix(Y_MIN, Y_MAX, prog) : mix(Y_MAX, Y_MIN, prog);
  return { y, dir, pass: pi };
};

// 第 1 趟光芯到达某 y 的帧（行"已读"与标记亮起的时刻）
const firstPassFrame = (yy: number) => {
  const per = (SCAN1 - SCAN0) / PASSES;
  const p = clamp01((yy - Y_MIN) / (Y_MAX - Y_MIN));
  // 反解 inOutSin：local = acos(1-2p)/π
  const local = Math.acos(1 - 2 * p) / Math.PI;
  return SCAN0 + local * 0.88 * per;
};

// 四角括号：臂长 72、线宽 5，外扩 26px
const ARM = 72;
const OUT = 26;
const CORNERS = [
  { x: -OUT, y: -OUT, d: `M3 ${ARM} V3 H${ARM}`, sx: -1, sy: -1 },
  { x: DW + OUT - ARM - 3, y: -OUT, d: `M3 3 H${ARM} V${ARM}`, sx: 1, sy: -1 },
  { x: DW + OUT - ARM - 3, y: DH + OUT - ARM - 3, d: `M${ARM} 3 V${ARM} H3`, sx: 1, sy: 1 },
  { x: -OUT, y: DH + OUT - ARM - 3, d: `M${ARM} ${ARM} H3 V3`, sx: -1, sy: 1 },
];

export const ScanBracketSweep: React.FC = () => {
  const f = useCurrentFrame();

  // 文档入场
  const dp = ramp(f, 0, 18, EASE.snappy);
  const docOp = clamp01(dp * 2.5);
  const docS = mix(0.94, 1, dp);

  // 扫描
  const { y, dir } = scanAt(f);
  const speed = Math.abs(scanAt(f + 0.5).y - scanAt(f - 0.5).y);
  const PEAK = ((Y_MAX - Y_MIN) * Math.PI) / 2 / (((SCAN1 - SCAN0) / PASSES) * 0.88);
  const tail = TAIL * Math.pow(clamp01(speed / PEAK), 0.75);
  const beamOp = ramp(f, SCAN0, 6, EASE.out) * (1 - ramp(f, SCAN1 - 4, 8, EASE.swift));
  const lit = (cy: number) => beamOp * Math.exp(-Math.pow((y - cy) / 30, 2));

  // 收束：括号向内收紧（spring）+ HUD 切换
  const lockT = 148;
  const lock = f < lockT ? 0 : springAt(f, lockT, { damping: 16, stiffness: 200 });
  const done = f >= lockT + 2;

  // 进度（HUD）：扫描窗口内线性推进（机械读条语义）
  const prog = clamp01((f - SCAN0) / (SCAN1 - SCAN0));
  const curRow = Math.max(0, Math.min(ROWS.length - 1, Math.floor((y - ROW_TOP) / ROW_H)));
  const flagged = ROWS.filter((r, i) => r.flag && f >= firstPassFrame(rowCenter(i))).length;

  // 相机：极缓推进
  const cam = 1 + 0.018 * ramp(f, 0, 180, EASE.smooth);

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.02 }} fill={{ x: 0.86, y: 0.96 }} horizon={0.88} intensity={0.72} breathe={0.4}>
        <Dust look={L} count={26} seed={7} drift={0.18} opacity={0.45} />
      </Stage>

      <div style={{ position: 'absolute', inset: 0, transform: `scale(${cam.toFixed(5)})`, transformOrigin: '50% 45%' }}>
        {/* 文档后的暖色地光：让暗色文档从暗场里"浮"出来 */}
        <div style={{
          position: 'absolute', left: DX - 160, top: DY + DH - 120, width: DW + 320, height: 300, opacity: docOp,
          background: `radial-gradient(ellipse 50% 40% at 50% 50%, ${alpha(ORANGE, 0.16)} 0%, ${alpha(ORANGE, 0)} 70%)`,
        }} />

        <div style={{ position: 'absolute', left: DX, top: DY, width: DW, height: DH }}>
          {/* 文档：带色相的深色面板 + 低透明度白描边 + 顶部内高光 + 两层阴影 */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: R, overflow: 'hidden', opacity: docOp,
            transform: `scale(${docS.toFixed(5)})`, transformOrigin: '50% 50%',
            background: `linear-gradient(180deg, #21160f 0%, #190f0a 100%)`,
            boxShadow: `inset 0 0 0 1.5px rgba(255,220,190,0.09), inset 0 1.5px 0 rgba(255,230,210,0.10), 0 2px 6px rgba(0,0,0,0.5), 0 40px 90px -20px rgba(0,0,0,0.75)`,
            fontFamily: FONT.sans, color: L.ink, fontVariantNumeric: 'tabular-nums',
          }}>
            {/* 页眉 */}
            <div style={{ position: 'absolute', left: 64, top: 48, ...type(46, 720), letterSpacing: '-0.025em', color: L.ink }}>
              Master Services Agreement
            </div>
            <div style={{ position: 'absolute', left: 64, top: 108, ...type(26, 450), color: L.ink2 }}>
              Halvorsen &amp; Pike Ltd. · Effective 1 March 2027
            </div>
            <div style={{
              position: 'absolute', right: 56, top: 54, padding: '9px 16px', borderRadius: 10,
              border: `1.5px solid ${alpha(L.ink, 0.14)}`, fontFamily: FONT.mono, fontSize: 22, fontWeight: 600,
              letterSpacing: '0.1em', color: L.ink2,
            }}>
              PDF · 14 PAGES
            </div>
            <div style={{ position: 'absolute', left: 48, right: 48, top: 164, height: 1.5, background: alpha(L.ink, 0.1) }} />

            {/* 条款行 */}
            {ROWS.map((r, i) => {
              const cy = rowCenter(i);
              const read = ramp(f, firstPassFrame(cy) - 2, 8, EASE.out); // 第 1 趟光芯扫过即"已读"
              const k = lit(cy);
              const c1 = `rgba(255,245,238,${(0.24 + 0.76 * read).toFixed(3)})`;
              const c2 = `rgba(212,182,164,${(0.24 + 0.68 * read).toFixed(3)})`;
              const flagOn = r.flag ? ramp(f, firstPassFrame(cy), 10, EASE.snappy) : 0;
              return (
                <React.Fragment key={i}>
                  {/* 行照亮：光芯经过时整行被暖光照一下（纯空间函数，文档不动） */}
                  <div style={{
                    position: 'absolute', left: 24, right: 24, top: ROW_TOP + i * ROW_H + 3, height: ROW_H - 6, borderRadius: 10,
                    background: `rgba(255,194,75,${(k * 0.1 + flagOn * 0.05).toFixed(3)})`,
                  }} />
                  {i > 0 && <div style={{ position: 'absolute', left: 48, right: 48, top: ROW_TOP + i * ROW_H, height: 1, background: alpha(L.ink, 0.06) }} />}
                  {/* 一行四列：flex + baseline 对齐（等宽编号 / 负责人与无衬线正文共用基线） */}
                  <div style={{ position: 'absolute', left: COLS[0], right: 48, top: cy - 20, height: 40, display: 'flex', alignItems: 'baseline' }}>
                    <div style={{ width: COLS[1] - COLS[0], fontFamily: FONT.mono, fontSize: 24, fontWeight: 600, color: c2, letterSpacing: '0.04em' }}>§{r.no}</div>
                    <div style={{ width: COLS[2] - COLS[1], ...type(30, 640), letterSpacing: '-0.015em', color: c1 }}>{r.clause}</div>
                    <div style={{ width: COLS[3] - COLS[2], ...type(30, 430), letterSpacing: '-0.015em', color: r.flag && flagOn > 0 ? `rgba(255,214,140,${(0.4 + 0.6 * read).toFixed(3)})` : c1 }}>{r.term}</div>
                    <div style={{ fontFamily: FONT.mono, fontSize: 24, fontWeight: 500, color: c2, letterSpacing: '0.04em' }}>{r.owner.toUpperCase()}</div>
                  </div>
                  {/* 风险标记：右侧页边的琥珀竖条 + 点（第 1 趟光芯经过时亮起） */}
                  {r.flag && (
                    <>
                      <div style={{
                        position: 'absolute', left: 0, top: ROW_TOP + i * ROW_H + 10, width: 6, height: ROW_H - 20, borderRadius: 3,
                        background: AMBER, opacity: flagOn, transform: `scaleY(${flagOn.toFixed(4)})`, boxShadow: `0 0 16px ${alpha(AMBER, 0.7)}`,
                      }} />
                      <div style={{
                        position: 'absolute', right: 40, top: cy - 9, width: 18, height: 18, borderRadius: 9, background: AMBER,
                        opacity: flagOn, transform: `scale(${mix(0.3, 1, EASE.overshoot(clamp01((f - firstPassFrame(cy)) / 10))).toFixed(4)})`,
                        boxShadow: `0 0 18px ${alpha(AMBER, 0.8)}`,
                      }} />
                    </>
                  )}
                </React.Fragment>
              );
            })}

            {/* 页脚 */}
            <div style={{ position: 'absolute', left: 48, right: 48, top: DH - 72, height: 1.5, background: alpha(L.ink, 0.1) }} />
            <div style={{ position: 'absolute', left: 64, top: DH - 52, fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.1em', color: L.ink3 }}>
              SCHEDULE A — COMMERCIAL TERMS
            </div>
            <div style={{ position: 'absolute', right: 64, top: DH - 52, fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.1em', color: L.ink3 }}>
              PAGE 3 / 14
            </div>

            {/* 扫描光带：裁在文档圆角内（与文档同一 overflow:hidden 层） */}
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 0, opacity: beamOp, transform: `translateY(${y.toFixed(2)}px)` }}>
              {/* 拖尾：screen 叠加的暖光，挂在来向一侧，长度随速度伸缩 */}
              <div style={{
                position: 'absolute', left: 0, right: 0, height: tail, top: dir > 0 ? -tail : 0, mixBlendMode: 'screen',
                background: `linear-gradient(${dir > 0 ? 180 : 0}deg, ${alpha(AMBER, 0)} 0%, ${alpha(AMBER, 0.05)} 50%, ${alpha(AMBER, 0.2)} 100%)`,
              }} />
              {/* 柔辉 */}
              <div style={{
                position: 'absolute', left: 0, right: 0, top: -22, height: 44, mixBlendMode: 'screen',
                background: `linear-gradient(180deg, ${alpha(AMBER, 0)} 0%, ${alpha(AMBER, 0.32)} 50%, ${alpha(AMBER, 0)} 100%)`,
              }} />
              {/* 光芯：白热中段 → 两端琥珀 */}
              <div style={{
                position: 'absolute', left: 0, right: 0, top: -1.5, height: 3,
                background: `linear-gradient(90deg, ${alpha(AMBER, 0.4)} 0%, ${AMBER} 16%, #fff6e2 50%, ${AMBER} 84%, ${alpha(AMBER, 0.4)} 100%)`,
                boxShadow: `0 0 10px ${alpha(AMBER, 0.9)}, 0 0 28px ${alpha(ORANGE, 0.5)}`,
              }} />
            </div>
          </div>

          {/* 四角取景括号：错峰从外侧斜向落位（overshoot），收束时向内收紧一次 */}
          {CORNERS.map((c, i) => {
            const t0 = 10 + i * 3;
            const a = ramp(f, t0, 6, EASE.out);
            const p = EASE.overshoot(clamp01((f - t0) / 14));
            const off = (1 - p) * 40 - lock * 14;
            return (
              <svg key={i} width={ARM + 6} height={ARM + 6} viewBox={`0 0 ${ARM + 6} ${ARM + 6}`}
                style={{
                  position: 'absolute', left: c.x, top: c.y, overflow: 'visible', opacity: a,
                  transform: `translate(${(off * c.sx).toFixed(2)}px, ${(off * c.sy).toFixed(2)}px)`,
                  filter: `drop-shadow(0 0 ${(6 + 10 * Math.min(1, lock)).toFixed(1)}px ${alpha(AMBER, 0.45 + 0.3 * Math.min(1, lock))})`,
                }}>
                <path d={c.d} fill="none" stroke={done ? '#fff1d6' : AMBER} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            );
          })}
        </div>

        {/* HUD：文档下方，状态 + 进度 + 当前条款 */}
        <div style={{
          position: 'absolute', left: DX, top: DY + DH + 64, width: DW, display: 'flex', alignItems: 'center', gap: 28,
          fontFamily: FONT.mono, fontSize: 28, fontWeight: 600, letterSpacing: '0.08em', color: L.ink2,
          opacity: ramp(f, 22, 12, EASE.out), transform: `translateY(${((1 - ramp(f, 22, 16, EASE.snappy)) * 16).toFixed(2)}px)`,
        }}>
          <div style={{
            width: 14, height: 14, borderRadius: 7, background: done ? L.ink : AMBER, flex: 'none',
            boxShadow: `0 0 ${done ? 8 : 14}px ${alpha(done ? L.ink : AMBER, 0.8)}`,
          }} />
          <span style={{ color: L.ink, whiteSpace: 'nowrap' }}>{done ? 'REVIEW READY' : 'QUILLON · READING'}</span>
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: alpha(L.ink, 0.1), overflow: 'hidden' }}>
            <div style={{ width: `${(prog * 100).toFixed(2)}%`, height: '100%', background: done ? L.ink : `linear-gradient(90deg, ${ORANGE}, ${AMBER})`, borderRadius: 2 }} />
          </div>
          <span style={{ whiteSpace: 'nowrap', color: done ? AMBER : L.ink2 }}>
            {done ? `${flagged} CLAUSES FLAGGED` : `CLAUSE ${ROWS[curRow].no} / 07`}
          </span>
        </div>
      </div>
    </div>
  );
};
