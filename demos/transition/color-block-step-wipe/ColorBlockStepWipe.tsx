// color-block-step-wipe —— 纯色块按离散阶跃（零插值、逐帧硬跳）吞屏转场，两式接力
// 源：notion-ai 1.5–3.5s（蓝块中央阶跃生长）+ 26–27s（色块从角落斜向吃屏，携带页面卡）
//
// 第二轮重设计（瑞士网格 · 瓷白钴蓝）：
// - look = porcelain（冷白 + 钴蓝），B 式色块用 look 的墨色（深海军蓝）——中性 + 一个强调色，
//   不再是蓝/红两种饱和色撞色。
// - 语法宪法不变：色块、徽章、携带卡全部 stepVal 查表硬跳，无一处补间。为了让"跳"读作设计而非掉帧，
//   每一跳都吸附到画面上可见的 12×9 网格（160×120 格，文档页上画了格点十字），A 式中间态是
//   "像素圆角"的十字形（两个矩形求并），像老式像素游戏的方块生长。
// - 对比成立阶跃：同屏其余元素是顺滑的——文档页极缓推进、接管后的标题逐词顺滑升起。
// - 两式接力成一条完整叙事：文档页（写）→ 钴蓝吞屏 + AI 徽章（起草）→ 墨色从右下角三跳吃掉钴蓝场、
//   把发布卡搬进来（发布）。B 吃的是 A 留下的钴蓝场，全程没有硬切。
//
// 时间表（30fps，共 180f）：
//   0–10    文档页静置（第 0 帧即完整页面），极缓推进开始
//   10–44   A：五跳 @10/17/26/34/44（间隔 7/9/8/10f 不等距 = 节拍感），2×1 → 6×1 → 10×3 十字 → 12×7 十字 → 满屏
//   52–62   徽章三跳 0.55 → 1.12 → 1（52/57/62f）
//   62–84   标题「Drafted in 4 seconds.」顺滑逐词升起（对比）
//   84–96   hold
//   96–115  B：三跳 @96/104/115（间隔 8/11f），墨色三角从右下角吃屏，发布卡同拍跳三个停靠点
//   122–146 标题「Ready to ship.」顺滑升起
//   146–180 hold 34f 干净落定
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, ramp, softShadow } from '../../_fixtures/Polish';
import { LOOKS, Stage, TYPE, TextReveal, alpha, type } from '../../_fixtures/Look';

export const COLOR_BLOCK_STEP_WIPE_DURATION = 180;

const L = LOOKS.porcelain;
const BLUE = L.accent; // #2f5bff
const BLUE_HI = '#5a7dff'; // 打击帧（每跳落地那 1 帧）
const NAVY = L.ink; // #0d1324
const NAVY_HI = '#1e2a4a';
const CW = 160; // 网格格宽
const CH = 120; // 网格格高

// 离散阶跃：frame 越过阈值瞬间跳到新值，无插值
const stepVal = <T,>(frame: number, steps: Array<[number, T]>): T => {
  let v = steps[0][1];
  for (const [f, val] of steps) if (frame >= f) v = val;
  return v;
};

// A 式：每跳 = 两个居中矩形的并集（[宽格, 高格] 主体 + [宽格, 高格] 十字臂）
type Cross = [number, number, number, number];
const A_HITS = [10, 17, 26, 34, 44];
const A_STEPS: Array<[number, Cross]> = [
  [0, [0, 0, 0, 0]],
  [10, [2, 1, 2, 1]],
  [17, [6, 1, 4, 1]],
  [26, [10, 3, 8, 5]],
  [34, [12, 7, 10, 9]],
  [44, [12, 9, 12, 9]],
];
const BADGE: Array<[number, number]> = [[0, 0], [52, 0.55], [57, 1.12], [62, 1]];

// B 式：右下角直角三角，p = 对角线推进量（0 无，200 全覆盖）；携带卡同拍跳位
const B_HITS = [96, 104, 115];
const B_P: Array<[number, number]> = [[0, 0], [96, 46], [104, 112], [115, 200]];
const B_CARD: Array<[number, number]> = [[0, 0], [96, 1], [104, 2], [115, 3]];
const CARD_XY: Array<[number, number]> = [[2300, 1400], [1720, 980], [1460, 730], [1290, 548]];

const GridTicks: React.FC<{ color: string }> = ({ color }) => (
  <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
    {Array.from({ length: 11 * 8 }, (_, i) => {
      const x = ((i % 11) + 1) * CW, y = (Math.floor(i / 11) + 1) * CH;
      return <path key={i} d={`M${x - 7} ${y}H${x + 7}M${x} ${y - 7}V${y + 7}`} stroke={color} strokeWidth={1.5} />;
    })}
  </svg>
);

// ───────── 文档页（Northstar 文档工具，出版级原生排版） ─────────
const CHECK = [
  { t: 'Pricing page copy', done: true },
  { t: 'Onboarding rewrite', done: true },
  { t: 'Release notes for 4.2', done: false },
];
const DocPage: React.FC<{ frame: number }> = ({ frame }) => {
  const push = 1 + 0.025 * ramp(frame, 0, 96, EASE.smooth); // 顺滑推进：阶跃的对照组
  return (
    <AbsoluteFill>
      {/* 网格格点：让每一跳"吸附"在看得见的格子上（格点不随页面推进，始终与色块边缘重合） */}
      <GridTicks color={alpha(L.ink, 0.14)} />
      <AbsoluteFill style={{ transform: `scale(${push.toFixed(4)})`, transformOrigin: '50% 46%' }}>
      <div style={{ position: 'absolute', left: 160, right: 160, top: 72, display: 'flex', alignItems: 'center', fontFamily: FONT.sans }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: L.ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width={22} height={22} viewBox="0 0 22 22"><path d="M11 2 13.4 8.6 20 11l-6.6 2.4L11 20l-2.4-6.6L2 11l6.6-2.4z" fill="#fff" /></svg>
        </div>
        <div style={{ ...type(30, 700), color: L.ink, marginLeft: 16 }}>Northstar</div>
        <div style={{ ...type(28, 450), color: L.ink3, marginLeft: 28 }}>Launches  /  Q4</div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 22 }}>
          <div style={{ display: 'flex' }}>
            {['#c9d4ec', '#e3d6c9', '#cfe3dc'].map((c, i) => (
              <div key={i} style={{ width: 44, height: 44, borderRadius: 22, background: c, marginLeft: i ? -12 : 0, boxShadow: `0 0 0 3px ${L.bg[0]}` }} />
            ))}
          </div>
          <div style={{ ...type(26, 600), color: L.onAccent, background: L.ink, borderRadius: 12, padding: '12px 24px' }}>Share</div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 160, top: 232, width: 1500 }}>
        <div style={{ ...type(TYPE.h1, 760), color: L.ink }}>Q4 launch plan</div>
        <div style={{ display: 'flex', gap: 44, marginTop: 30, ...type(30, 500), color: L.ink3 }}>
          <span>Owner <b style={{ color: L.ink2, fontWeight: 600 }}>Jamie Lee</b></span>
          <span>Status <b style={{ color: BLUE, fontWeight: 650 }}>In review</b></span>
          <span>Ships <b style={{ color: L.ink2, fontWeight: 600 }}>Nov 12</b></span>
        </div>
        <div style={{ ...type(TYPE.body, 420), color: L.ink2, marginTop: 44, maxWidth: 1240, lineHeight: 1.36 }}>
          One page for the whole launch — brief, owners and open questions, with the team commenting inline.
        </div>
        <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {CHECK.map((c) => (
            <div key={c.t} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9, boxSizing: 'border-box', flex: 'none',
                background: c.done ? BLUE : 'transparent', border: c.done ? 'none' : `2.5px solid ${alpha(L.ink, 0.25)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {c.done && <svg width={20} height={20} viewBox="0 0 20 20"><path d="M4 10.5 8.2 14.5 16 6" stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </div>
              <div style={{ ...type(36, c.done ? 450 : 560), color: c.done ? L.ink3 : L.ink, textDecoration: c.done ? 'line-through' : undefined, textDecorationColor: alpha(L.ink, 0.3) }}>{c.t}</div>
            </div>
          ))}
        </div>
        {/* AI 提示行：钴蓝吞屏的"起因" */}
        <div style={{
          marginTop: 44, width: 980, height: 84, borderRadius: 20, boxSizing: 'border-box', padding: '0 28px', display: 'flex', alignItems: 'center', gap: 18,
          background: L.surface, boxShadow: `inset 0 0 0 1.5px ${alpha(BLUE, 0.35)}, ${softShadow(10, { color: L.shadow })}`,
        }}>
          <svg width={30} height={30} viewBox="0 0 22 22"><path d="M11 2 13.4 8.6 20 11l-6.6 2.4L11 20l-2.4-6.6L2 11l6.6-2.4z" fill={BLUE} /></svg>
          <div style={{ ...type(32, 500), color: L.ink2 }}>Draft the release notes from this plan</div>
          <div style={{ width: 3, height: 38, background: BLUE, opacity: Math.floor(frame / 8) % 2 ? 0 : 1 }} />
          <div style={{ marginLeft: 'auto', ...type(24, 600, { mono: true }), color: L.ink3 }}>⏎</div>
        </div>
      </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// 有材质的纯色：同色相上亮下沉 + 颗粒；打击帧整块提亮一档（依旧离散）
const Block: React.FC<{ base: string; hi: string; hit: boolean; style: React.CSSProperties }> = ({ base, hi, hit, style }) => (
  <div style={{ position: 'absolute', overflow: 'hidden', background: hit ? hi : `linear-gradient(170deg, ${hi} 0%, ${base} 42%, ${base} 100%)`, ...style }}>
    <Grain opacity={0.08} />
  </div>
);

const Sparkle: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 22 22"><path d="M11 1.5 13.6 8.4 20.5 11l-6.9 2.6L11 20.5l-2.6-6.9L1.5 11l6.9-2.6z" fill={color} /></svg>
);

// 发布卡（B 式携带的页面卡）
const ReleaseCard: React.FC = () => (
  <div style={{
    width: 660, height: 420, borderRadius: 28, boxSizing: 'border-box', padding: '40px 46px', background: L.surface,
    boxShadow: `inset 0 1px 0 #fff, 0 2px 4px rgba(4,8,20,0.3), 0 60px 120px -30px rgba(0,2,10,0.8)`,
    display: 'flex', flexDirection: 'column', fontFamily: FONT.sans,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <Sparkle size={30} color={BLUE} />
      <div style={{ ...type(24, 700, { caps: true }), letterSpacing: '0.16em', color: BLUE }}>Release notes</div>
      <div style={{ marginLeft: 'auto', ...type(24, 500, { mono: true }), color: L.ink3 }}>v4.2</div>
    </div>
    <div style={{ ...type(TYPE.h3, 760), color: L.ink, marginTop: 26 }}>Northstar 4.2</div>
    <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {['Inline AI drafts in every page', 'Launch checklists, shared live', 'Pricing page, rewritten'].map((t) => (
        <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 16, ...type(30, 480), color: L.ink2 }}>
          <div style={{ width: 9, height: 9, borderRadius: 2, background: BLUE, flex: 'none' }} />{t}
        </div>
      ))}
    </div>
    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 12, ...type(26, 600), color: L.ink }}>
      <div style={{ width: 12, height: 12, borderRadius: 6, background: L.accent2 }} />
      Shipped to 12,400 teams
    </div>
  </div>
);

// 顺滑的行升起（遮罩内上移，阶跃的对照组）
const LineRise: React.FC<{ frame: number; start: number; children: React.ReactNode }> = ({ frame, start, children }) => {
  const p = ramp(frame, start, 20, EASE.snappy);
  return (
    <div style={{ overflow: 'hidden', padding: '0.04em 0 0.16em', margin: '-0.04em 0 -0.16em' }}>
      <div style={{ transform: `translateY(${((1 - p) * 115).toFixed(2)}%)` }}>{children}</div>
    </div>
  );
};

export const ColorBlockStepWipe: React.FC = () => {
  const frame = useCurrentFrame();

  // ---------- A：钴蓝十字块中央阶跃生长 ----------
  const [w1, h1, w2, h2] = stepVal(frame, A_STEPS);
  const aHit = A_HITS.includes(frame);
  const aFull = frame >= 44;
  const badge = stepVal(frame, BADGE);

  // ---------- B：墨色三角从右下角阶跃吃屏 ----------
  const p = stepVal(frame, B_P);
  const card = stepVal(frame, B_CARD);
  const bHit = B_HITS.includes(frame);
  const bFull = frame >= 115;
  const [cx, cy] = CARD_XY[card];

  const rect = (wc: number, hc: number): React.CSSProperties => ({
    left: 960 - (wc * CW) / 2, top: 540 - (hc * CH) / 2, width: wc * CW, height: hc * CH,
  });

  return (
    <AbsoluteFill style={{ background: L.bg[1], overflow: 'hidden' }}>
      {/* 共享舞台：只有这一层 Stage */}
      {!aFull && (
        <>
          <Stage look={L} keyLight={{ x: 0.3, y: 0.0 }} fill={{ x: 0.9, y: 1 }} />
          <DocPage frame={frame} />
        </>
      )}

      {/* A 色块：两矩形求并 = 像素圆角十字；满屏后保留为 B 的底 */}
      {!bFull && w1 > 0 && (
        aFull ? (
          <Block base={BLUE} hi={BLUE_HI} hit={aHit} style={{ inset: 0 }} />
        ) : (
          <>
            <Block base={BLUE} hi={BLUE_HI} hit={aHit} style={rect(w1, h1)} />
            <Block base={BLUE} hi={BLUE_HI} hit={aHit} style={rect(w2, h2)} />
          </>
        )
      )}

      {/* A 接管后：徽章（阶跃三跳）+ 顺滑标题 */}
      {aFull && !bFull && (
        <>
          <GridTicks color={alpha('#ffffff', 0.13)} />
          {badge > 0 && (
            <div style={{
              position: 'absolute', left: 960 - 110, top: 300 - 110, width: 220, height: 220, borderRadius: '50%',
              background: 'radial-gradient(circle at 38% 30%, #ffffff 0%, #f1f4ff 72%, #e2e8ff 100%)',
              boxShadow: `inset 0 2px 0 #fff, 0 3px 6px rgba(10,30,120,0.25), 0 40px 80px -24px rgba(8,20,90,0.6)`,
              transform: `scale(${badge})`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkle size={112} color={BLUE} />
            </div>
          )}
          <div style={{ position: 'absolute', left: 0, right: 0, top: 500, textAlign: 'center', ...type(TYPE.h1, 760), color: '#ffffff' }}>
            <TextReveal text="Drafted in 4 seconds." by="word" variant="rise" start={64} each={18} gap={4} />
          </div>
          <div style={{
            position: 'absolute', left: 0, right: 0, top: 664, textAlign: 'center', ...type(TYPE.body, 450), color: alpha('#ffffff', 0.72),
            opacity: ramp(frame, 74, 16, EASE.out),
          }}>
            Release notes for 4.2, written from your plan.
          </div>
        </>
      )}

      {/* B 色块：墨色直角三角（硬边不羽化） */}
      {p > 0 && (
        <Block base={NAVY} hi={NAVY_HI} hit={bHit} style={{
          inset: 0, clipPath: bFull ? undefined : `polygon(${100 - p}% 100%, 100% ${100 - p}%, 100% 100%)`,
        }} />
      )}
      {bFull && (
        <>
          {/* 墨色场上的一处钴蓝余光（不抢卡） */}
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 50% 60% at 70% 52%, ${alpha(BLUE, 0.22)}, ${alpha(BLUE, 0)} 70%)` }} />
          <GridTicks color={alpha('#ffffff', 0.07)} />
          <div style={{ position: 'absolute', left: 160, top: 380, ...type(TYPE.h1, 780), color: '#ffffff' }}>
            <LineRise frame={frame} start={122}>Ready</LineRise>
            <LineRise frame={frame} start={128}>
              to ship
              {/* 句点是一颗钴蓝"像素"，同样阶跃出现——强调色只给这一处 */}
              <span style={{ display: 'inline-block', width: '0.2em', height: '0.2em', marginLeft: '0.06em', background: BLUE, opacity: frame >= 140 ? 1 : 0 }} />
            </LineRise>
          </div>
          <div style={{
            position: 'absolute', left: 160, top: 640, ...type(TYPE.body, 450), color: alpha('#ffffff', 0.62), opacity: ramp(frame, 132, 16, EASE.out),
          }}>
            Plan, draft and publish — one page.
          </div>
        </>
      )}
      {/* 携带卡：与三角同拍跳位，-4° 定角，无补间 */}
      {card > 0 && (
        <div style={{ position: 'absolute', left: cx - 330, top: cy - 210, transform: 'rotate(-4deg)' }}>
          <ReleaseCard />
        </div>
      )}
    </AbsoluteFill>
  );
};
