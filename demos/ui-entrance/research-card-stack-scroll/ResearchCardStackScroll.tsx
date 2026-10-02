// research-card-stack-scroll — 论文卡以越来越快的发牌节拍飞入叠压：最上一张全清晰（正在读），
// 下面的按深度递增模糊变暗、只露顶部标题条，背景横线与卡堆同步推移做速度参照。
//
// 第二轮重设计（石墨暗场 · 纸质文献 · 深度叠堆）：
// - look = graphite（近单色暗场 + 香槟金点缀）。卡片是暖白纸面的"文献卡"压在石墨舞台上——
//   亮纸 vs 暗场的反差让"最上一张在光里、下面的沉进暗处"一眼成立。
// - 构图：左 1/3 是读数区（眉题 + 180px 计数器「已读文献」+ 吞吐率），右 2/3 是卡堆（940×400 卡，
//   主体占画宽一半）。卡堆沿「左上 ↔ 右下」一条轴线：新卡从右下前方斜飞入、落在最前；
//   旧卡每被压一张就往左上后方退一格（缩小 5.5%、模糊 +2.4px、变暗 23%），顶部标题条从新卡上沿露出来，
//   形成一摞有厚度的索引；退满 4 格淡出回收。
// - 节拍：11 张，间隔 13→7f 递减（越发越快的发牌，量级感一路加压），末张 f≈112 落定后 38f hold。
// - 每张卡落定后，摘要里一句关键结论被金色荧光笔从左到右划过（6f）——"这一张被读过了"；
//   计数器随每次落位跳一档（总计 1,284，按发牌累计量导出，与卡堆严格同步）。
// - 背景横线（台账线）间距 = 退格步长，随卡堆同一累计量上移：一推一停，是速度参照。
// - 落定：末张落下后计数器锁定弹一下、下方「Synthesis ready」逐词升起；全程相机极缓推近 3%。
//
// 时间表（30fps，共 150f）：
//   0–10     预备：舞台光、读数区眉题、计数 0；首卡 f=2 起飞、f=10 落定
//   10–112   发牌：间隔 13→7f；每张 9f 飞行（snappy）+ 落位 3f 压缩 + 金笔划线
//   112–124  锁定：计数器 1,284 弹簧落定（damping 16），「Synthesis ready」升起（118f 起）
//   124–150  hold：末卡全清晰，相机推近收尾
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Sheen, Stage, TextReveal, alpha, springAt, type } from '../../_fixtures/Look';

export const RESEARCH_CARD_STACK_SCROLL_DURATION = 150;

const L = LOOKS.graphite;
const GOLD = L.accent2; // #e4c58a 香槟金
const GOLD_INK = '#8a6424'; // 纸面上能读的深金
const PAPER = ['#f6f3ec', '#ece7dd'];
const PAPER_INK = '#16140f';
const PAPER_INK2 = '#5b554b';

const CW = 940; // 卡宽
const CH = 400; // 卡高
const CX = 1268; // 最前一张卡中心
const CY = 640;
const STEP_X = -18; // 每退一格：左移
const STEP_Y = -60; // 每退一格：上移（= 台账线间距）
const STEP_S = 0.055; // 每退一格缩小
const FLY = 9; // 飞行帧数

type Paper = { tag: string; id: string; title: string; authors: string; pre: string; hl: string; post: string; cites: number; pages: number };
const PAPERS: Paper[] = [
  { tag: 'cs.LG', id: '2410.0213', title: 'Sparse Attention for Long-Context Reasoning', authors: 'M. Okafor · L. Chen · R. Iyer', pre: 'Block-sparse attention ', hl: 'keeps 97% of dense accuracy', post: ' at 128k tokens.', cites: 214, pages: 18 },
  { tag: 'cs.IR', id: '2411.0250', title: 'Retrieval Drift in Multi-Hop Agent Pipelines', authors: 'A. Novak · J. Park', pre: 'A single re-grounding step ', hl: 'recovers most lost recall', post: ' after hop two.', cites: 87, pages: 12 },
  { tag: 'cs.DC', id: '2412.0387', title: 'Latent Caching Cuts Tool-Call Latency by 41%', authors: 'S. Haddad · Y. Tanaka · E. Moss', pre: 'Reusing latent state ', hl: 'removes redundant prefill', post: ' on agent traces.', cites: 132, pages: 10 },
  { tag: 'cs.AI', id: '2413.0324', title: 'On the Calibration of Preference Reward Models', authors: 'K. Lindqvist · P. Rao', pre: 'Per-cluster temperature ', hl: 'fixes most over-confidence', post: ' near the boundary.', cites: 59, pages: 14 },
  { tag: 'cs.LG', id: '2414.0361', title: 'Cheap Verifiers Beat Expensive Samplers', authors: 'T. Mensah · O. Zhou · B. Klein', pre: 'At equal compute, ', hl: 'more samples + a small verifier', post: ' win.', cites: 305, pages: 16 },
  { tag: 'cs.CL', id: '2415.0398', title: 'Structured Decoding Without Grammar Loss', authors: 'I. Petrov · C. Alvarez', pre: 'A lookahead mask ', hl: 'keeps outputs schema-valid', post: ' at no perplexity cost.', cites: 76, pages: 11 },
  { tag: 'cs.MA', id: '2416.0435', title: 'Token-Budget Routing in Agent Fleets', authors: 'D. Osei · M. Laurent · G. Sato', pre: 'Routing by predicted cost ', hl: 'cuts total spend by 23%', post: ' at equal quality.', cites: 64, pages: 13 },
  { tag: 'cs.CV', id: '2417.0472', title: 'Contrastive Layouts for Document Understanding', authors: 'W. Ibrahim · S. Kowalski', pre: 'Layout-perturbed twins ', hl: 'teach models to read structure', post: '.', cites: 118, pages: 15 },
  { tag: 'cs.HC', id: '2418.0509', title: 'Depth-Ordered Compositing for Live Interfaces', authors: 'R. Bauer · F. Nakamura', pre: 'Sorting layers by depth ', hl: 'removes most halo artifacts', post: ' in live UI.', cites: 28, pages: 8 },
  { tag: 'cs.IR', id: '2419.0546', title: 'Fast Approximate Re-Ranking at Query Time', authors: 'L. Moreau · A. Gupta', pre: 'A distilled scorer ', hl: 're-ranks 200 results in 3 ms', post: ' with no nDCG loss.', cites: 93, pages: 10 },
  { tag: 'cs.LG', id: '2420.0583', title: 'Scaling Laws for Agentic Literature Review', authors: 'E. Varga · H. Mori · J. Adeyemi', pre: 'Brief quality ', hl: 'scales log-linearly with sources read', post: ', with no plateau before 1,000.', cites: 171, pages: 22 },
];
const N = PAPERS.length;
const TOTAL = 1284; // 计数器终值

// 落位时间表：首张 f=10，此后间隔 13→7f 递减（越发越快），末张 ≈112
const LAND: number[] = (() => {
  const out = [10];
  for (let k = 0; k < N - 1; k++) out.push(out[k] + mix(13, 7, k / (N - 2)));
  return out;
})();
const LAST = LAND[N - 1];

// 第 j 张落位时把它下面整叠推一格：落位前 1f 起、8f ease-out
const pushK = (f: number, j: number) => ramp(f, LAND[j] - 1, 8, EASE.out);
// 某张卡被压了几格（连续值）
const depthOf = (f: number, i: number) => {
  let s = 0;
  for (let j = i + 1; j < N; j++) s += pushK(f, j);
  return s;
};
// 飞行进度
const flyP = (f: number, i: number) => ramp(f, LAND[i] - FLY, FLY, EASE.snappy);
// 飞行轨迹：从右下前方（+260, +300, 旋 5°, 放大 8%）沿轴线落到最前
const flyPos = (p: number) => ({ x: (1 - p) * 260, y: (1 - p) * 300, r: (1 - p) * 5, s: 1 + (1 - p) * 0.08 });

const Card: React.FC<{ p: Paper; i: number; f: number }> = ({ p, i, f }) => {
  const fp = flyP(f, i);
  const d = depthOf(f, i);
  const pos = flyPos(fp);
  // 落位压缩：落定后 3f 内 y 轴压 2.5% 再回（读作"砸实了"）
  const e = f - LAND[i];
  const squash = e >= 0 && e < 3 ? 1 - 0.025 * Math.sin((e / 3) * Math.PI) : 1;
  const dd = Math.min(d, 4);
  const x = CX + pos.x + d * STEP_X;
  const y = CY + pos.y + d * STEP_Y;
  const s = pos.s * (1 - d * STEP_S);
  // 退满 3.4 格开始淡出，4.4 格回收
  const fade = 1 - Math.min(1, Math.max(0, (d - 3.4) / 1));
  const appear = Math.min(1, (f - (LAND[i] - FLY)) / 2);
  if (fade <= 0 || appear <= 0) return null;
  // 飞行段速度模糊（沿轴线方向；落定为 0）
  const v = Math.hypot(flyPos(flyP(f + 0.5, i)).x - flyPos(flyP(f - 0.5, i)).x, flyPos(flyP(f + 0.5, i)).y - flyPos(flyP(f - 0.5, i)).y);
  const mb = Math.min(9, v * 0.12);
  const depthBlur = dd * 2.4;
  const bright = 1 - dd * 0.23;
  // 正文：飞行后半程淡入，被下一张盖住时淡出；只有最前一张可读
  const bodyIn = ramp(f, LAND[i] - 4, 7, EASE.out);
  const bodyOut = i < N - 1 ? 1 - ramp(f, LAND[i + 1] - FLY + 2, 6, EASE.linear) : 1;
  const body = bodyIn * bodyOut;
  // 金笔划线：落定 2f 后 7f 划完
  const hl = ramp(f, LAND[i] + 2, 7, EASE.swift);
  const id = `rcs${i}`;
  const elev = mix(1, 0.3, dd / 4);
  return (
    <div style={{
      position: 'absolute', left: x - CW / 2, top: y - CH / 2, width: CW, height: CH, zIndex: i,
      opacity: appear * fade,
      transform: `rotate(${pos.r.toFixed(3)}deg) scale(${s.toFixed(4)}, ${(s * squash).toFixed(4)})`,
      transformOrigin: '50% 100%',
      filter: depthBlur > 0.05
        ? `blur(${depthBlur.toFixed(2)}px) brightness(${bright.toFixed(3)}) saturate(${(1 - dd * 0.15).toFixed(3)})`
        : mb > 0.4 ? `url(#${id})` : undefined,
    }}>
      {mb > 0.4 && depthBlur <= 0.05 && (
        <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
          <filter id={id} x="-20%" y="-30%" width="140%" height="160%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`${(mb * 0.65).toFixed(2)} ${mb.toFixed(2)}`} />
          </filter>
        </svg>
      )}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 26, overflow: 'hidden',
        background: `linear-gradient(172deg, ${PAPER[0]} 0%, ${PAPER[1]} 100%)`,
        boxShadow:
          `inset 0 1px 0 rgba(255,255,255,0.9), inset 0 0 0 1px rgba(40,30,15,0.08), ` +
          `0 ${(4 * elev).toFixed(1)}px ${(10 * elev).toFixed(1)}px rgba(0,0,0,${(0.45 * elev).toFixed(3)}), ` +
          `0 ${(40 * elev).toFixed(1)}px ${(90 * elev).toFixed(1)}px -10px rgba(0,0,0,${(0.7 * elev).toFixed(3)})`,
      }}>
        {/* 末卡落定后一次扫光（Q4：只给主角一次，裁进圆角） */}
        {i === N - 1 && <Sheen progress={ramp(f, LAND[i] + 8, 22, EASE.swift)} strength={0.55} width={0.18} />}
        {/* 纸面受光：顶部偏左一抹亮 */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(90% 70% at 22% 0%, rgba(255,255,255,0.55), rgba(255,255,255,0) 60%)' }} />
        {/* 顶部标题条：分类 / 编号 / 页数——这条在旧卡上从新卡上沿露出 */}
        <div style={{ position: 'absolute', left: 52, right: 52, top: 30, display: 'flex', alignItems: 'center', gap: 18, fontFamily: FONT.mono, fontSize: 24, letterSpacing: '0.02em', color: PAPER_INK2 }}>
          <span style={{ background: PAPER_INK, color: PAPER[0], padding: '5px 12px 4px', borderRadius: 8, fontWeight: 600 }}>{p.tag}</span>
          <span>PREPRINT {p.id}</span>
          <span style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>{p.cites} cites · {p.pages} pp</span>
        </div>
        {/* 标题：所有卡都有 */}
        <div style={{ position: 'absolute', left: 52, right: 60, top: 92, ...type(54, 680), lineHeight: 1.06, color: PAPER_INK }}>{p.title}</div>
        {/* 正文：作者 + 带金笔划线的结论句 */}
        <div style={{ position: 'absolute', left: 52, right: 52, top: 236, opacity: body, transform: `translateY(${((1 - bodyIn) * 10).toFixed(2)}px)` }}>
          <div style={{ fontFamily: FONT.sans, fontSize: 30, fontWeight: 600, color: GOLD_INK, letterSpacing: '-0.005em' }}>{p.authors}</div>
          <div style={{ marginTop: 18, fontFamily: FONT.sans, fontSize: 34, fontWeight: 450, lineHeight: 1.32, color: PAPER_INK2, letterSpacing: '-0.012em' }}>
            {p.pre}
            <span style={{
              color: PAPER_INK, fontWeight: 600,
              backgroundImage: `linear-gradient(90deg, ${alpha('#f2c65a', 0.75)}, ${alpha('#f2c65a', 0.75)})`,
              backgroundRepeat: 'no-repeat', backgroundSize: `${(hl * 100).toFixed(2)}% 46%`, backgroundPosition: '0 82%',
              boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone',
            }}>{p.hl}</span>
            {p.post}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ResearchCardStackScroll: React.FC = () => {
  const f = useCurrentFrame();
  // 全局已发牌累计量（连续）——台账线、计数器都由它导出，与卡堆严格同步
  let dealt = 0;
  for (let j = 0; j < N; j++) dealt += pushK(f, j);
  const lineShift = (dealt * -STEP_Y) % 60; // 台账线上移（间距 60 = 退格步长）
  const count = Math.round((TOTAL * Math.min(dealt, N)) / N);
  const lock = springAt(f, LAST + 2, { damping: 16, stiffness: 200 });
  const lockPulse = f > LAST + 2 ? 1 + 0.045 * Math.sin(Math.min(1, lock) * Math.PI) : 1;
  const cam = 1 + 0.03 * ramp(f, 0, 150, EASE.smooth);
  const intro = ramp(f, 0, 14, EASE.out);
  // 吞吐率：随发牌加速而升（按当前间隔换算 papers/sec 的"展示值"）
  const rate = (mix(4.2, 11.6, ramp(f, 10, LAST - 10, EASE.linear))).toFixed(1);
  return (
    <AbsoluteFill style={{ background: L.bg[2] }}>
      <Stage look={L} keyLight={{ x: 0.66, y: 0.3 }} fill={{ x: 0.1, y: 0.95 }} breathe={0.4}>
        {/* 台账横线：间距 = 退格步长，跟卡堆同一累计量上移；左右与上下羽化 */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: -60, bottom: -60,
          backgroundImage: `linear-gradient(180deg, ${alpha('#ffffff', 0.055)} 1px, transparent 1px)`,
          backgroundSize: '100% 60px', backgroundPosition: `0 ${(-lineShift + 20).toFixed(2)}px`,
          WebkitMaskImage: 'radial-gradient(ellipse 52% 60% at 64% 52%, #000 35%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 52% 60% at 64% 52%, #000 35%, transparent 100%)',
        }} />
      </Stage>

      <AbsoluteFill style={{ transform: `scale(${cam.toFixed(4)})`, transformOrigin: '60% 55%' }}>
        {/* 卡堆下方的接触光：卡片落在一束光里 */}
        <div style={{
          position: 'absolute', left: CX - 640, top: CY + 120, width: 1280, height: 260,
          background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha('#000000', 0.55)} 0%, transparent 70%)`,
        }} />
        {PAPERS.map((p, i) => (f >= LAND[i] - FLY ? <Card key={i} p={p} i={i} f={f} /> : null))}

        {/* 读数区 */}
        <div style={{ position: 'absolute', left: 132, top: 352, width: 520, opacity: intro, transform: `translateY(${((1 - intro) * 16).toFixed(2)}px)` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.2em', color: L.ink3 }}>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: GOLD, boxShadow: `0 0 14px ${alpha(GOLD, 0.8)}` }} />
            ORRERY · DEEP RESEARCH
          </div>
        </div>
        <div style={{
          position: 'absolute', left: 124, top: 396, ...type(184, 760), color: L.ink,
          transform: `scale(${lockPulse.toFixed(4)})`, transformOrigin: '0% 60%',
          textShadow: f > LAST ? `0 0 ${(40 * (1 - ramp(f, LAST + 2, 30))).toFixed(1)}px ${alpha(GOLD, 0.35)}` : undefined,
        }}>
          {count.toLocaleString('en-US')}
        </div>
        <div style={{ position: 'absolute', left: 132, top: 596, ...type(40, 500), color: L.ink2, opacity: intro }}>
          papers read for your brief
        </div>
        {/* 吞吐率 → 落定后换成 Synthesis ready */}
        <div style={{ position: 'absolute', left: 132, top: 676, height: 44, overflow: 'hidden', width: 520 }}>
          <div style={{
            fontFamily: FONT.mono, fontSize: 32, color: L.ink3, fontVariantNumeric: 'tabular-nums',
            opacity: intro * (1 - ramp(f, LAST + 2, 8, EASE.exit)),
            transform: `translateY(${(-ramp(f, LAST + 2, 10, EASE.exit) * 40).toFixed(2)}px)`,
          }}>
            {rate} papers / sec
          </div>
          <div style={{ position: 'absolute', left: 0, top: 0, display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{
              width: 12, height: 12, borderRadius: 6, background: GOLD, opacity: ramp(f, LAST + 6, 8),
              boxShadow: `0 0 16px ${alpha(GOLD, 0.9)}`,
            }} />
            <TextReveal text="Synthesis ready" by="word" variant="rise" start={LAST + 6} each={14} gap={4}
              style={{ ...type(32, 600), color: GOLD }} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
