// avatar-grid-radial-build-colorize — 8×7 客户卡网格由中心分环生长铺满，随后少数卡片陆续染红标异常
// 第二轮重设计（石墨监控墙 · 只有红色会说话）：
// - look = graphite（近单色暗场）：整面墙是灰阶的——头像、logo、名字全部去色，健康状态点也压成低饱和灰绿，
//   画面里唯一饱和的颜色就是"流失风险红"。红点一亮，观众的眼睛被迫扫全场找下一个（手法核心：群体中浮现异常）。
// - 内容为镜头编写：虚构客户成功产品 Tether 的账户墙。38 张 200×118 原生 1920 布局的账户卡
//   （首字母头像 / 抽象人像 / 公司 logo 三种混合 + 名字 + ARR），中央 3×6 区域 visibility:hidden 占位留给标题：
//   112px「Who's drifting away?」+ 实时滚动的风险汇总「6 accounts · $284k ARR at risk」+ 三色图例计数。
// - 染红不是"变色"而是一次事件：底 / 描边 / 状态点同一条曲线染红 + 卡片顿一下（1→1.05→1）+ 一圈裁在卡内的红色涟漪
//   + ARR 行换成流失原因（Inactive 21d / Seats −40% / No champion …）；其余健康卡随异常增多整体退暗（1→0.5），红卡越来越跳。
// - 收尾：6 张全部浮现后，标题下升起一枚红色行动胶囊「Bring them back in →」（原卡标题文案变成行动），海报落定。
//
// 时间表（30fps，共 168f）：
//   0–14    标题逐词从线下升起（each 14f，gap 3f），中央先有主角（Q5）
//   10–40   分环生长：ring = round(hypot(c−3.5, (r−3)/0.85))，每环 4f + 0–3f 抖动；
//           卡片 opacity 6f + scale 0.86→1（EASE.overshoot 10f）+ 6px→0 收焦，无位移——"长出来"
//   36–48   汇总行与图例跟进（EASE.out）
//   52–104  异常浮现：6 张卡在 52/61/69/80/90/101 陆续染红（间隔不等、先疏后密再疏，"陆续发现"）
//   50–110  健康卡整体退暗 1→0.5（EASE.smooth），风险金额随每次染红滚动累加
//   112–126 行动胶囊升起（EASE.snappy）
//   126–168 hold：相机全程 1→1.03 极缓推，红卡辉光微呼吸
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, mix, ramp } from '../../_fixtures/Polish';
import { Dust, LOOKS, Stage, TextReveal, alpha } from '../../_fixtures/Look';

export const AVATAR_GRID_RADIAL_BUILD_COLORIZE_DURATION = 168; // 5.6s @30fps

const L = LOOKS.graphite;
const RED = '#ff4a3d';
const OK = '#7fae92'; // 低饱和灰绿：健康不抢戏
const WARN = '#c9a46a'; // 低饱和琥珀

// 确定性伪随机
const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ───────────── 网格几何（原生 1920×1080）─────────────
const COLS = 8;
const ROWS = 7;
const MX = 96;
const MY = 72;
const GAP = 18;
const CW = (1920 - 2 * MX - (COLS - 1) * GAP) / COLS; // ≈200
const CH = (1080 - 2 * MY - (ROWS - 1) * GAP) / ROWS; // ≈118
const isHidden = (c: number, r: number) => r >= 2 && r <= 4 && c >= 1 && c <= 6;

const NAMES = [
  'Ava L.', 'Kenji M.', 'Brio', 'Noor H.', 'Sable', 'Theo R.', 'Pinecrest', 'Mara V.',
  'Quillon', 'Iris D.', 'Lowfield', 'Omar S.', 'Juno K.', 'Ferro', 'Elena P.', 'Cobalt',
  'Ravi N.', 'Wilde', 'Sana T.', 'Dov A.', 'Orchid', 'Lena B.', 'Tamsin G.', 'Haven',
  'Yuki O.', 'Marlo F.', 'Halden', 'Priya C.', 'Fennel', 'Ines W.', 'Calder', 'Rhea J.',
  'Moss', 'Ari Z.', 'Lumio', 'Basil E.', 'Wren Q.', 'Ostra', 'Kai U.', 'Nell Y.',
];

// 6 张异常卡：浮现帧 + 原因 + ARR（k$），总计 284
const FLAG_TIMES = [52, 61, 69, 80, 90, 101];
const FLAG_INFO = [
  { why: 'Inactive 21d', arr: 48 },
  { why: 'Seats −40%', arr: 62 },
  { why: 'Usage −62%', arr: 35 },
  { why: 'No champion', arr: 71 },
  { why: 'Ticket spike', arr: 29 },
  { why: 'Card failed', arr: 39 },
];

type Cell = {
  c: number; r: number; x: number; y: number; hidden: boolean; kind: number; name: string;
  arr: number; delay: number; flag: number; pending: boolean; seed: number;
};

const CELLS: Cell[] = (() => {
  const out: Cell[] = [];
  let n = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      const hidden = isHidden(c, r);
      const ring = Math.round(Math.hypot(c - 3.5, (r - 3) / 0.85)); // 到中心的"环号"
      out.push({
        c, r, x: MX + c * (CW + GAP), y: MY + r * (CH + GAP), hidden,
        kind: Math.floor(rand(i * 9.1) * 3), name: hidden ? '' : NAMES[n++ % NAMES.length],
        arr: 8 + Math.round(rand(i * 3.3) * 70), delay: 10 + ring * 4 + rand(i + 40) * 3, flag: -1, pending: false, seed: i,
      });
    }
  }
  // 挑 6 张分散的卡做异常（固定种子排序，再按"离已选卡足够远"筛），按浮现顺序编号
  const vis = out.filter((x) => !x.hidden).sort((a, b) => rand(a.seed + 900) - rand(b.seed + 900));
  const picked: Cell[] = [];
  for (const v of vis) {
    if (picked.length >= 6) break;
    if (picked.every((p) => Math.abs(p.c - v.c) + Math.abs(p.r - v.r) >= 3)) picked.push(v);
  }
  picked.forEach((p, k) => (p.flag = k));
  vis.filter((v) => v.flag < 0).slice(0, 2).forEach((v) => (v.pending = true));
  return out;
})();

// ───────────── 头像三种：首字母 / 抽象人像 / 公司 logo（全部灰阶）─────────────
const Avatar: React.FC<{ cell: Cell; red: number }> = ({ cell, red }) => {
  const s = 48;
  const g = 36 + Math.round(rand(cell.seed * 1.7) * 26); // 每个头像灰度不同
  const base = `rgb(${g},${g + 1},${g + 4})`;
  const ring = red > 0 ? `0 0 0 2px ${alpha(RED, 0.8 * red)}` : 'inset 0 0 0 1px rgba(255,255,255,0.08)';
  if (cell.kind === 0) {
    const ini = cell.name.split(' ').map((w) => w[0]).join('').slice(0, 2);
    return (
      <div style={{ width: s, height: s, borderRadius: '50%', background: base, boxShadow: ring, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, fontWeight: 650, color: '#c9ccd3', letterSpacing: '0.01em', flex: 'none' }}>{ini}</div>
    );
  }
  if (cell.kind === 1) {
    const hue = 0.5 + rand(cell.seed * 2.3) * 0.5;
    return (
      <div style={{ position: 'relative', width: s, height: s, borderRadius: '50%', overflow: 'hidden', background: `linear-gradient(160deg, rgb(${Math.round(70 * hue)},${Math.round(72 * hue)},${Math.round(78 * hue)}), #1d1e22)`, boxShadow: ring, flex: 'none' }}>
        <div style={{ position: 'absolute', left: s * 0.33, top: s * 0.2, width: s * 0.34, height: s * 0.36, borderRadius: '50%', background: '#9b9ea6' }} />
        <div style={{ position: 'absolute', left: s * 0.14, top: s * 0.6, width: s * 0.72, height: s * 0.6, borderRadius: '50% 50% 0 0', background: '#7d8088' }} />
      </div>
    );
  }
  const shapes = [
    'M12 4l8 14H4z', 'M12 3l3 6 6 1-4.5 4.5 1 6.5-5.5-3-5.5 3 1-6.5L3 10l6-1z', 'M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z',
    'M13 2L5 14h6l-1 8 8-12h-6z', 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4a5 5 0 1 1 0 10 5 5 0 0 1 0-10z',
  ];
  return (
    <div style={{ width: s, height: s, borderRadius: 15, background: `linear-gradient(160deg, rgb(${g + 18},${g + 19},${g + 23}), ${base})`, boxShadow: `${ring}, inset 0 1px 0 rgba(255,255,255,0.1)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
      <svg width={25} height={25} viewBox="0 0 24 24"><path d={shapes[Math.floor(rand(cell.seed * 4.1) * shapes.length)]} fill="#d5d7dd" fillRule="evenodd" /></svg>
    </div>
  );
};

export const AvatarGridRadialBuildColorize: React.FC = () => {
  const f = useCurrentFrame();

  const flaggedNow = FLAG_TIMES.filter((t) => f >= t).length;
  const recede = ramp(f, 50, 60, EASE.smooth); // 健康卡退暗
  const push = 1 + 0.03 * ramp(f, 0, AVATAR_GRID_RADIAL_BUILD_COLORIZE_DURATION, EASE.smooth);
  const sumIn = ramp(f, 36, 12, EASE.out);
  const ctaT = ramp(f, 112, 14, EASE.snappy);

  // 风险金额：每次染红后 8f 内滚动累加
  const atRisk = FLAG_INFO.reduce((acc, info, k) => acc + info.arr * ramp(f, FLAG_TIMES[k], 8, EASE.out), 0);
  const healthy = 38 - 2 - flaggedNow;

  return (
    <AbsoluteFill style={{ background: L.bg[1], overflow: 'hidden', fontFamily: FONT.sans }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.42 }} fill={{ x: 0.5, y: 1.05 }} intensity={0.75}>
        {/* 中央标题背后一团极淡的红色余光，随异常数增强 */}
        <div style={{ position: 'absolute', left: 360, top: 300, width: 1200, height: 480, background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha(RED, 0.025 + 0.06 * (flaggedNow / 6))} 0%, ${alpha(RED, 0)} 70%)` }} />
        <Dust look={L} count={18} seed={4} drift={0.15} opacity={0.35} />
      </Stage>

      <div style={{ position: 'absolute', inset: 0, transform: `scale(${push.toFixed(4)})`, transformOrigin: '50% 50%' }}>
        {/* ── 账户卡墙 ── */}
        {CELLS.map((cell) => {
          const o = ramp(f, cell.delay, 6, EASE.out);
          const sc = mix(0.86, 1, ramp(f, cell.delay, 10, EASE.overshoot));
          const bl = (1 - ramp(f, cell.delay, 6, EASE.out)) * 6;
          const flagged = cell.flag >= 0;
          const ft = flagged ? FLAG_TIMES[cell.flag] : 9999;
          const red = flagged ? ramp(f, ft, 7, EASE.out) : 0; // 底 / 描边 / 点 同一条曲线
          const tick = flagged ? Math.sin(Math.PI * ramp(f, ft, 9, EASE.swift)) * 0.05 : 0;
          const rip = flagged ? ramp(f, ft + 1, 16, EASE.out) : 0;
          const breathe = flagged && red >= 1 ? 0.85 + 0.15 * Math.sin((f - ft) / 9) : 1;
          const dimK = flagged ? 1 : 1 - 0.5 * recede;
          const info = flagged ? FLAG_INFO[cell.flag] : null;
          const dot = flagged ? (red > 0.5 ? RED : OK) : cell.pending ? WARN : OK;
          return (
            <div key={cell.seed} style={{
              position: 'absolute', left: cell.x, top: cell.y, width: CW, height: CH, visibility: cell.hidden ? 'hidden' : 'visible',
              opacity: o, transform: `scale(${(sc * (1 + tick)).toFixed(4)})`, filter: bl > 0.2 ? `blur(${bl.toFixed(2)}px)` : undefined,
              zIndex: flagged ? 2 : 1,
            }}>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 18, overflow: 'hidden', boxSizing: 'border-box',
                background: `linear-gradient(180deg, ${mixHex('#1b1c20', '#2a1414', red)}, ${mixHex('#151619', '#1f0f0f', red)})`,
                border: `1px solid ${red > 0 ? alpha(RED, 0.15 + 0.6 * red) : 'rgba(255,255,255,0.07)'}`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,${(0.06 * (1 - red)).toFixed(3)}), 0 14px 30px -14px rgba(0,0,0,0.9)${red > 0 ? `, 0 0 ${(34 * red * breathe).toFixed(1)}px ${alpha(RED, 0.32 * red * breathe)}` : ''}`,
                filter: dimK < 0.999 ? `brightness(${dimK.toFixed(3)})` : undefined,
                display: 'flex', alignItems: 'center', gap: 14, padding: '0 16px',
              }}>
                {/* 染红涟漪：从状态点荡开，裁在卡内 */}
                {rip > 0 && rip < 1 && (
                  <div style={{
                    position: 'absolute', left: CW - 24 - 160 * rip, top: 22 - 160 * rip, width: 320 * rip, height: 320 * rip, borderRadius: '50%',
                    border: `2px solid ${alpha(RED, 0.6 * (1 - rip))}`, background: alpha(RED, 0.08 * (1 - rip)),
                  }} />
                )}
                <Avatar cell={cell} red={red} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 620, color: '#dfe1e6', letterSpacing: '-0.015em', whiteSpace: 'nowrap' }}>{cell.name}</div>
                  <div style={{ position: 'relative', height: 24, marginTop: 4, fontSize: 17, fontWeight: 540, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ position: 'absolute', left: 0, top: 0, color: '#7c8088', opacity: 1 - red }}>${cell.arr}k ARR</span>
                    {info && <span style={{ position: 'absolute', left: 0, top: 0, color: RED, opacity: red, transform: `translateY(${((1 - red) * 8).toFixed(2)}px)` }}>{info.why}</span>}
                  </div>
                </div>
                {/* 状态点 */}
                <div style={{
                  position: 'absolute', right: 16, top: 16, width: 11, height: 11, borderRadius: 6, background: dot,
                  boxShadow: red > 0.5 ? `0 0 0 3px ${alpha(RED, 0.2)}, 0 0 12px ${alpha(RED, 0.9)}` : 'none',
                }} />
              </div>
            </div>
          );
        })}

        {/* ── 中央标题 / 汇总 / 图例 / 行动胶囊 ── */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 404, textAlign: 'center' }}>
          <div style={{ fontSize: 112, fontWeight: 800, letterSpacing: '-0.045em', color: L.ink, lineHeight: 1 }}>
            <TextReveal text="Who's drifting away?" by="word" variant="rise" start={0} each={14} gap={3} />
          </div>
          <div style={{
            marginTop: 30, fontSize: 38, fontWeight: 560, color: L.ink2, letterSpacing: '-0.015em', fontVariantNumeric: 'tabular-nums',
            opacity: sumIn, transform: `translateY(${((1 - sumIn) * 14).toFixed(2)}px)`,
          }}>
            <span style={{ color: flaggedNow > 0 ? RED : L.ink2, fontWeight: 720 }}>{flaggedNow} account{flaggedNow === 1 ? '' : 's'}</span>
            {' · '}
            <span style={{ color: L.ink, fontWeight: 700 }}>${Math.round(atRisk)}k</span> ARR at risk
          </div>
          <div style={{
            marginTop: 26, display: 'flex', justifyContent: 'center', gap: 40, fontSize: 26, color: L.ink3, fontWeight: 550,
            opacity: ramp(f, 40, 10, EASE.out) * (1 - ctaT), fontVariantNumeric: 'tabular-nums',
          }}>
            {([['Healthy', OK, healthy], ['Pending', WARN, 2], ['At risk', RED, flaggedNow]] as Array<[string, string, number]>).map(([l, c, n]) => (
              <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 12, height: 12, borderRadius: 6, background: c }} />
                {l} <span style={{ color: L.ink2 }}>{n}</span>
              </span>
            ))}
          </div>
        </div>
        {/* 行动胶囊：图例让位，原卡标题文案变成行动 */}
        <div style={{
          position: 'absolute', left: 960, top: 628, transform: `translate(-50%, ${((1 - ctaT) * 24).toFixed(2)}px) scale(${mix(0.92, 1, ctaT).toFixed(4)})`,
          opacity: ctaT, padding: '16px 34px 16px 38px', borderRadius: 999, background: `linear-gradient(180deg, #ff5a4c, #e8382c)`,
          color: '#fff6f4', fontSize: 30, fontWeight: 680, letterSpacing: '-0.01em', whiteSpace: 'nowrap',
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), 0 16px 40px -12px ${alpha(RED, 0.7)}, 0 0 60px ${alpha(RED, 0.25)}`,
        }}>
          Bring them back in&nbsp;&nbsp;→
        </div>
      </div>
    </AbsoluteFill>
  );
};

// 两个 hex 颜色按 t 混合
function mixHex(a: string, b: string, t: number) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a);
  const B = p(b);
  const k = Math.max(0, Math.min(1, t));
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`;
}
