// overhead-tabletop-drop｜上帝视角桌面滑降（第二轮重设计）
// 手法不变：三张页面卡平躺成桌面卡阵，相机俯拍横滑巡视（只动 translateX，角度锁死），
// 滑过目标后一拍停顿，骤降扎入——rotateX / scale / translateX 三通道同跑，抬正成满屏。
//
// 设计决定
// - look：graphite（近单色暗场 · 白 · 一点香槟金）。桌面是深石墨哑光台面，三盏顶灯在台面上各打一个
//   光池，页面像三张刚打印出来的样稿摆在评审桌上——暗桌白纸，反差即层次。台面有发丝网格 + 每张样稿下方
//   一枚印刷标签（01 SHOTS / 02 HOME / 03 CHANGELOG），横滑时它们是"相机在动"的参照。
// - 内容：video-shotcraft 官网的三页——镜头库、首页、更新日志。每页为镜头重新排版：大标题、少元素、
//   真实感文案。目标是中间的首页，落版满屏时它就是一张海报：150px 两行品牌短句 + 右侧分镜板产品图。
// - 节奏：巡视（50f 缓入缓出）→ 选定（停 8f：目标稿离桌 16px、它的顶灯更亮、另外两盏灯暗下去）→
//   骤降（28f，零速起步的不对称曲线，scale 带 ~5% 预备回缩）→ 软回落版（8f）→ 落版后页面里的
//   产品图完成一个小动作：金色「Hero shot」镜头块滑入分镜板空槽、轻过冲落座 → hold。
// - Q2：卡片按落版尺寸 2× 布局栅格化、再在平面内缩回 0.5 摆上桌，扎入满屏时文字是原生分辨率。
//
// 时间表（30fps，共 140f）
//   0–50    横滑巡视：translateX +760→−360（smooth，滑过目标约 1/3 身位），角度锁 62°
//   44–60   选定：目标稿离桌 16px、影子变大变虚；左右两盏顶灯降到 35%，目标灯 +25%
//   58–86   骤降扎入：rotateX 62→−1.6、scale 1→2.04（预备回缩 ~5%）、translateX −360→0 三通道同跑
//   86–94   软回 0° / 2.0 正视满屏；目标稿同时落回桌面
//   98–118  页面内：金色镜头块从右侧滑入空槽（snappy + 一次过冲），同列一块让位下移
//   94–140  hold：极缓推近 1→1.012，尾帧是 video-shotcraft 首页海报
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { LOOKS, alpha, type } from '../../_fixtures/Look';
import { EASE, FONT, Grain, Vignette, bezier, mix, ramp, softShadow } from '../../_fixtures/Polish';
import { BRAND, ShotcraftMark } from '../../_fixtures/Brand';

export const OVERHEAD_TABLETOP_DROP_DURATION = 140;

const L = LOOKS.graphite;
const PAPER = '#f4f1ea'; // 样稿纸色（暖白，不用纯白）
const INK = '#141414';
const INK2 = '#5f5c56';
const INK3 = '#9b968c';
const RULE = 'rgba(20,20,20,0.1)';
const GOLD = '#b8893a'; // 纸上的金（比 look 的香槟金深一档，白底可读）
const SERIF_STACK = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';

const CARD_W = 996;
const CARD_H = 560;
const GAP = 150;
const PITCH = CARD_W + GAP;
const RES = 2; // 卡片按落版倍率布局（1992×1120）后平面内缩回 0.5
const INNER = (CARD_H * RES) / 1080; // 1.037：1920×1080 设计稿在 2x 卡内铺满

const PAN_END = 50;
const DROP = 58;
const DROP_END = 86;
const SETTLE_END = 94;

const DIVE = bezier(0.36, 0, 0.12, 1); // 零速起步、快速加速、长减速落位
const DIVE_SCALE = bezier(0.45, -0.18, 0.12, 1); // 先回缩 ~5%（机位微抬）再扎

// ───────────── 三页样稿（1920×1080 设计坐标） ─────────────

const Nav: React.FC<{ active: string }> = ({ active }) => (
  <div style={{ position: 'absolute', left: 150, right: 150, top: 60, height: 64, display: 'flex', alignItems: 'center', fontFamily: FONT.sans }}>
    <ShotcraftMark size={44} tone="light" style={{ marginRight: 14, flex: 'none' }} />
    <div style={{ ...type(32, 700), fontFamily: BRAND.font, letterSpacing: '0.03em', color: INK }}>{BRAND.name}</div>
    <div style={{ display: 'flex', gap: 46, marginLeft: 90, ...type(26, 550), color: INK2 }}>
      {['Product', 'Shots', 'Changelog', 'Docs'].map((n) => (
        <span key={n} style={{ color: n === active ? INK : INK2, fontWeight: n === active ? 700 : 550 }}>{n}</span>
      ))}
    </div>
    <div style={{ marginLeft: 'auto', padding: '16px 30px', borderRadius: 999, background: INK, color: PAPER, ...type(24, 650) }}>View on GitHub</div>
  </div>
);

// 首页右侧产品图：一支宣传片的分镜板（五幕 × 镜头块）；slot = 金色「Hero shot」块的滑入进度
const DAYS = ['Open', 'Hook', 'Demo', 'Proof', 'Outro'];
const BLOCKS: { d: number; y: number; h: number; t: string }[] = [
  { d: 0, y: 40, h: 120, t: 'Tilt reveal' },
  { d: 1, y: 190, h: 150, t: 'Crash zoom' },
  { d: 2, y: 60, h: 100, t: 'Whip pan' },
  { d: 3, y: 230, h: 120, t: 'Drone dive' },
  { d: 4, y: 40, h: 140, t: 'Logo sting' },
  { d: 0, y: 300, h: 110, t: 'Title card' },
  { d: 4, y: 290, h: 110, t: 'End card' },
];
const Planner: React.FC<{ slot: number }> = ({ slot }) => {
  const colW = 126;
  const x0 = 38;
  const s = Math.max(0, slot);
  return (
    <div style={{
      position: 'absolute', left: 1080, top: 250, width: 690, height: 600, borderRadius: 28, background: '#1a1a1c',
      boxShadow: '0 40px 80px -30px rgba(20,16,8,0.55), 0 0 0 1px rgba(0,0,0,0.2)', overflow: 'hidden', fontFamily: FONT.sans,
    }}>
      <div style={{ position: 'absolute', left: 40, top: 32, ...type(30, 700), color: '#f4f4f2' }}>Launch film</div>
      <div style={{ position: 'absolute', right: 40, top: 36, ...type(24, 550), color: '#8f8c86' }}>0:42 · 30 fps</div>
      {DAYS.map((d, i) => (
        <div key={d} style={{ position: 'absolute', left: x0 + i * colW, top: 96, width: colW - 12, ...type(22, 650, { caps: true }), color: '#8f8c86', letterSpacing: '0.12em' }}>{d}</div>
      ))}
      <div style={{ position: 'absolute', left: 40, right: 40, top: 132, height: 1, background: 'rgba(255,255,255,0.1)' }} />
      <div style={{ position: 'absolute', left: 0, top: 150, width: 700, height: 440 }}>
        {BLOCKS.map((b, i) => {
          // Demo 列（d=2）的块在金色块落座时让位下移
          const push = b.d === 2 ? 150 * s : 0;
          return (
            <div key={i} style={{
              position: 'absolute', left: x0 + b.d * colW, top: b.y + push, width: colW - 12, height: b.h, borderRadius: 14,
              background: '#2a2a2d', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)', padding: '14px 14px', boxSizing: 'border-box',
              ...type(22, 600), color: '#c9c6bf', lineHeight: 1.18,
            }}>{b.t}</div>
          );
        })}
        {/* 金色镜头块：从右侧画外滑入 Demo 列的空槽 */}
        <div style={{
          position: 'absolute', left: mix(760, x0 + 2 * colW, slot), top: 60, width: colW - 12, height: 136, borderRadius: 14,
          background: 'linear-gradient(180deg, #e8c983 0%, #d4a85a 100%)', padding: '14px 14px', boxSizing: 'border-box',
          boxShadow: `0 ${12 + 18 * (1 - s)}px ${26 + 20 * (1 - s)}px -8px rgba(212,168,90,0.45), inset 0 1px 0 rgba(255,255,255,0.5)`,
          ...type(22, 750), color: '#2a1e08', lineHeight: 1.18,
        }}>Hero shot<div style={{ ...type(19, 650), color: 'rgba(42,30,8,0.65)', marginTop: 8 }}>120f</div></div>
      </div>
    </div>
  );
};

const HomePage: React.FC<{ slot: number }> = ({ slot }) => (
  <div style={{ position: 'absolute', inset: 0, background: PAPER, fontFamily: FONT.sans }}>
    <Nav active="Product" />
    <div style={{ position: 'absolute', left: 150, top: 290 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, ...type(24, 700, { caps: true }), color: GOLD, letterSpacing: '0.18em' }}>
        <div style={{ width: 36, height: 2, background: GOLD }} />For Claude Code &amp; Codex
      </div>
      <div style={{ ...type(148, 800), color: INK, marginTop: 34, lineHeight: 0.98, letterSpacing: '-0.05em' }}>
        Frame motion.<br /><span style={{ fontFamily: SERIF_STACK, fontStyle: 'italic', fontWeight: 400, letterSpacing: '-0.03em' }}>Craft the shot.</span>
      </div>
      <div style={{ ...type(34, 450), color: INK2, marginTop: 44, width: 860, lineHeight: 1.4 }}>
        Cinematic product videos, crafted by your agent. From screenshot to showreel.
      </div>
      <div style={{ display: 'flex', gap: 22, marginTop: 52 }}>
        <div style={{ padding: '22px 40px', borderRadius: 999, background: INK, color: PAPER, ...type(28, 650) }}>Get the skill</div>
        <div style={{ padding: '22px 40px', borderRadius: 999, boxShadow: `inset 0 0 0 2px ${RULE}`, color: INK, ...type(28, 600) }}>Watch the film →</div>
      </div>
    </div>
    <Planner slot={slot} />
  </div>
);

// 镜头库页：三张镜头配方卡（名字 / 时长 / 一句话），版式沿用三栏卡
const PLANS = [
  { n: 'Crash zoom', p: '2s', u: '60 frames', d: 'Punch in on the one number that matters.' },
  { n: 'Drone dive', p: '4s', u: '120 frames', d: 'Fall from the overview straight into the hero.', hi: true },
  { n: 'Whip pan', p: '1s', u: '30 frames', d: 'Cut between pages at full speed.' },
];
const ShotsPage: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, background: PAPER, fontFamily: FONT.sans }}>
    <Nav active="Shots" />
    <div style={{ position: 'absolute', left: 0, right: 0, top: 200, textAlign: 'center', ...type(104, 800), color: INK, letterSpacing: '-0.045em' }}>Pick a shot.</div>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 336, textAlign: 'center', ...type(32, 450), color: INK2 }}>Shot recipes for cinematic product films.</div>
    <div style={{ position: 'absolute', left: 200, right: 200, top: 450, display: 'flex', gap: 40 }}>
      {PLANS.map((pl) => (
        <div key={pl.n} style={{
          flex: 1, height: 500, borderRadius: 28, padding: '44px 44px', boxSizing: 'border-box',
          background: pl.hi ? INK : '#fbf9f4', color: pl.hi ? PAPER : INK,
          boxShadow: pl.hi ? '0 30px 60px -24px rgba(20,16,8,0.5)' : `inset 0 0 0 2px ${RULE}`,
        }}>
          <div style={{ ...type(30, 650), color: pl.hi ? '#e4c58a' : INK2 }}>{pl.n}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 30 }}>
            <div style={{ ...type(120, 800), letterSpacing: '-0.05em' }}>{pl.p}</div>
            <div style={{ ...type(26, 500), opacity: 0.6 }}>/ {pl.u}</div>
          </div>
          <div style={{ ...type(28, 450), opacity: 0.72, marginTop: 30, lineHeight: 1.4 }}>{pl.d}</div>
        </div>
      ))}
    </div>
  </div>
);

const LOG = [
  { v: '2.4', d: 'Sep 12', t: 'Motion workbench', b: 'Tune every shot on a timeline, then render in one click.' },
  { v: '2.3', d: 'Aug 28', t: 'JianYing export', b: 'Hand the finished cut to your editor as a native draft.' },
  { v: '2.2', d: 'Aug 09', t: 'Beat-synced cuts', b: 'Every cut lands on the music, frame-accurate.' },
];
const ChangelogPage: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, background: PAPER, fontFamily: FONT.sans }}>
    <Nav active="Changelog" />
    <div style={{ position: 'absolute', left: 150, top: 200, ...type(104, 800), color: INK, letterSpacing: '-0.045em' }}>Changelog</div>
    <div style={{ position: 'absolute', left: 150, right: 150, top: 380 }}>
      {LOG.map((e) => (
        <div key={e.v} style={{ display: 'flex', gap: 60, padding: '38px 0', borderTop: `2px solid ${RULE}` }}>
          <div style={{ width: 260 }}>
            <div style={{ display: 'inline-block', padding: '8px 18px', borderRadius: 999, background: INK, color: PAPER, ...type(24, 700) }}>v{e.v}</div>
            <div style={{ ...type(26, 500), color: INK3, marginTop: 14 }}>{e.d}</div>
          </div>
          <div>
            <div style={{ ...type(48, 750), color: INK }}>{e.t}</div>
            <div style={{ ...type(28, 450), color: INK2, marginTop: 12 }}>{e.b}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ───────────── 桌面 ─────────────

// 单张样稿：平躺在桌面上；lift = 离桌高度（px，沿桌面法线）
const PageCard: React.FC<{ x: number; lift?: number; children: React.ReactNode }> = ({ x, lift = 0, children }) => (
  <div style={{
    position: 'absolute', left: x - (CARD_W * RES) / 2, top: -(CARD_H * RES) / 2, width: CARD_W * RES, height: CARD_H * RES,
    borderRadius: 10 * RES, overflow: 'hidden', boxSizing: 'border-box', background: PAPER,
    boxShadow: `${softShadow((4 + lift * 1.6) * RES, { strength: 3.2, color: '#000000' })}, inset 0 ${RES}px 0 rgba(255,255,255,0.7)`,
    backfaceVisibility: 'hidden', transform: `translateZ(${4 + lift}px) scale(${1 / RES})`,
  }}>
    <div style={{ width: 1920, height: 1080, zoom: INNER, position: 'relative' }}>{children}</div>
  </div>
);

// 桌面上的印刷标签：编号 + 页名（等宽、全大写），贴在样稿下沿外
const DeskTag: React.FC<{ x: number; n: string; label: string; on: number }> = ({ x, n, label, on }) => (
  <div style={{
    position: 'absolute', left: x - CARD_W / 2, top: CARD_H / 2 + 34, width: CARD_W, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18,
    fontFamily: FONT.mono, fontSize: 30, letterSpacing: '0.16em', color: alpha(L.ink, 0.42 + 0.5 * on), transform: 'translateZ(1px)',
  }}>
    <span style={{ color: on > 0.5 ? L.accent2 : alpha(L.ink, 0.5) }}>{n}</span>
    <span style={{ flex: 'none', width: 40, height: 2, background: alpha(L.ink, 0.25) }} />
    <span>{label}</span>
  </div>
);

export const OverheadTabletopDrop: React.FC = () => {
  const f = useCurrentFrame();

  // 横滑：只动 translateX（角度锁死——巡视归巡视）
  const panX = mix(760, -360, ramp(f, 0, PAN_END, EASE.smooth));
  // 骤降：三通道同起同止
  const d = ramp(f, DROP, DROP_END - DROP, DIVE);
  const ds = ramp(f, DROP, DROP_END - DROP, DIVE_SCALE);
  const rotX = f < DROP_END
    ? mix(62, -1.6, d)
    : f < 90
      ? mix(-1.6, 0.5, ramp(f, DROP_END, 4, EASE.smooth))
      : mix(0.5, 0, ramp(f, 90, 4, EASE.smooth));
  const push = mix(1, 1.012, ramp(f, SETTLE_END, 46, EASE.smooth)); // 落版后极缓推近
  const scale = (f < DROP_END ? mix(1, 2.04, ds) : mix(2.04, 2.0, ramp(f, DROP_END, SETTLE_END - DROP_END, EASE.smooth))) * push;
  const tx = f <= DROP ? panX : mix(-360, 0, d);

  // 选定：目标稿离桌、顶灯明暗
  const pick = ramp(f, 44, 16, EASE.out);
  const lift = 16 * (pick - ramp(f, 70, 18, EASE.smooth));
  const tilt = Math.max(0, Math.min(1, rotX / 62));
  // 页面内的小动作：金色日程块落座（snappy 位移 + overshoot 收尾）
  const slot = ramp(f, 98, 20, EASE.overshoot);

  // 顶灯光池（世界坐标，落在每张样稿上）：选定后左右两盏暗下去
  const pool = (x: number, k: number) =>
    `radial-gradient(ellipse 820px 620px at ${2800 + x}px 3200px, ${alpha('#f2efe6', 0.2 * k)} 0%, ${alpha('#f2efe6', 0.07 * k)} 45%, ${alpha('#f2efe6', 0)} 75%)`;
  const side = 1 - 0.65 * pick;
  const hero = 1 + 0.25 * pick;

  return (
    <AbsoluteFill style={{ background: L.bg[2], overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, perspective: 1600, perspectiveOrigin: '50% 42%' }}>
        {/* 世界原点 = 屏心；先 in-plane scale，再 rotateX，最后 translateX */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, transformStyle: 'preserve-3d',
          transform: `translateX(${tx}px) rotateX(${rotX}deg) scale(${scale})`,
        }}>
          {/* 台面：深石墨 + 三盏顶灯光池 + 发丝网格（细 80 / 粗 400） */}
          <div style={{
            position: 'absolute', left: -2800, top: -3200, width: 5600, height: 4100, backfaceVisibility: 'hidden',
            background: [
              pool(-PITCH, side), pool(0, hero), pool(PITCH, side),
              'repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1.5px, transparent 1.5px, transparent 400px)',
              'repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1.5px, transparent 1.5px, transparent 400px)',
              'repeating-linear-gradient(90deg, rgba(255,255,255,0.022) 0px, rgba(255,255,255,0.022) 1px, transparent 1px, transparent 80px)',
              'repeating-linear-gradient(0deg, rgba(255,255,255,0.022) 0px, rgba(255,255,255,0.022) 1px, transparent 1px, transparent 80px)',
              `linear-gradient(180deg, ${L.bg[0]}, ${L.bg[1]})`,
            ].join(', '),
          }} />
          <DeskTag x={-PITCH} n="01" label="SHOTS" on={0} />
          <DeskTag x={0} n="02" label="HOME" on={pick} />
          <DeskTag x={PITCH} n="03" label="CHANGELOG" on={0} />
          <PageCard x={-PITCH}><ShotsPage /></PageCard>
          <PageCard x={0} lift={lift}><HomePage slot={slot} /></PageCard>
          <PageCard x={PITCH}><ChangelogPage /></PageCard>
          {/* 左右样稿随顶灯变暗：盖一层台面色 */}
          {[-PITCH, PITCH].map((x) => (
            <div key={x} style={{
              position: 'absolute', left: x - CARD_W / 2, top: -CARD_H / 2, width: CARD_W, height: CARD_H, borderRadius: 10,
              background: L.bg[1], opacity: 0.08 + 0.34 * pick, transform: 'translateZ(5px)', pointerEvents: 'none',
            }} />
          ))}
        </div>
      </div>
      {/* 顶灯光束（屏幕空间体积光）：三盏灯各一束斜落到样稿上，跟着卡阵横移；扎入时随俯角散去 */}
      {[-PITCH, 0, PITCH].map((x, i) => {
        const k = (i === 1 ? hero : side) * tilt;
        if (k < 0.02) return null;
        const cx = 960 + tx + x * 0.92; // 卡阵中线 → 屏幕 x（透视下略收拢）
        return (
          <div key={x} style={{
            position: 'absolute', left: cx - 560, top: -60, width: 1120, height: 560, pointerEvents: 'none', opacity: k,
            filter: 'blur(26px)', mixBlendMode: 'screen',
          }}>
            <div style={{
              position: 'absolute', inset: 0, clipPath: 'polygon(44% 0, 56% 0, 90% 100%, 10% 100%)',
              background: `linear-gradient(180deg, ${alpha('#f2efe6', 0.22)} 0%, ${alpha('#f2efe6', 0.09)} 60%, ${alpha('#f2efe6', 0.0)} 100%)`,
            }} />
          </div>
        );
      })}
      {/* 屏幕空间：远端（画面上部）沉入夜色，随俯角收起；暗角 + 颗粒 */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `linear-gradient(180deg, ${alpha(L.bg[2], 0.95 * tilt)} 0%, ${alpha(L.bg[2], 0.55 * tilt)} 24%, ${alpha(L.bg[2], 0)} 48%)`,
      }} />
      <Vignette strength={0.12 + 0.45 * tilt} inner={0.45} color="#000000" />
      <Grain opacity={0.04 + 0.05 * tilt} blend="soft-light" />
    </AbsoluteFill>
  );
};
