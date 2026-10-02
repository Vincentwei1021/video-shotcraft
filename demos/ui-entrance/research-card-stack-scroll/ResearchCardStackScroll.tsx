// research-card-stack-scroll — Research Stack 论文卡叠压滚流（motion-lab 定稿转原生 Remotion）
// 深色论文卡沿微微向右下的轴线连续飞入并叠压在中心：入场是 translateY(-40)+scale 0.94→1
// 的 6 帧短促动作，落位带压缩；只有最上一张全清晰渲染标题+作者+摘要，
// 下方卡按 depth 递增 blur/变暗只露顶部标题条，背景浅灰横向 grid 同步移动做速度参照。
// 质感改版：
// - 节拍改为"越来越快"的发牌节奏（间隔 14→9.5f，均值仍≈12f），11 张在 f≈124 全部落定，尾段静止呼吸；
// - 堆的下沉不再是匀速漂移，而是每落一张就把整叠往右下"推"一格（ease-out），grid 与之严格同步；
// - 正文随落位淡入（不再落定那一帧硬切出现），飞行段按速度加纵向运动模糊；
// - 卡面出版级：分类 chip / 编号 / 作者 / 两行摘要 / 引用与页数，发丝线 + 内高光 + 随深度变化的两层阴影。
// 设计坐标 480×270（DesignStage zoom 放大，字形按目标尺寸光栅化），参数表数值以此坐标系标定。
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';
import { Backdrop, EASE, FONT as PFONT, Grain } from '../../_fixtures/Polish';

export const RESEARCH_CARD_STACK_SCROLL_DURATION = 144; // 4800ms @30fps

const ORANGE = '#FF6A1F';
const ORANGE_SOFT = '#FF9A5C';
const FONT = PFONT.sans;
const MONO = PFONT.mono;

// 原 setup 里的 stage.clientWidth/clientHeight 分支——原渲染 stage 恒为 480×270
const W = 480;
const H = 270;
const F = 144; // recipe 帧总数（f = t·F）
const GAP = 30; // 叠压后每张卡的下移间距（每被压一张推一格）
const XOFF = 9; // 每被压一张的右移量
const FLY = 6; // 入场行程（帧）

// 逻辑画布 420×250 → 实际 stage 的等比缩放
const LW = 420;
const LH = 250;
const S = Math.min(W / LW, H / LH);

type Paper = { title: string; tag: string; authors: string; abs: string; cites: number; pages: number };
const PAPERS: Paper[] = [
  { title: 'Sparse Attention for Long-Context Reasoning', tag: 'cs.LG', authors: 'M. Okafor, L. Chen, R. Iyer', abs: 'We show block-sparse attention retains 97% of dense accuracy on 128k-token reasoning tasks while cutting memory by 6.2×.', cites: 214, pages: 18 },
  { title: 'Retrieval Drift in Multi-Hop Agent Pipelines', tag: 'cs.IR', authors: 'A. Novak, J. Park', abs: 'Errors compound across retrieval hops; a single re-grounding step after hop two recovers most of the lost recall.', cites: 87, pages: 12 },
  { title: 'Latent Caching Reduces Tool-Call Latency by 41%', tag: 'cs.DC', authors: 'S. Haddad, Y. Tanaka, E. Moss', abs: 'Caching intermediate latent states between tool calls removes redundant prefill and lowers p95 latency on agent traces.', cites: 132, pages: 10 },
  { title: 'On the Calibration of Preference Reward Models', tag: 'cs.AI', authors: 'K. Lindqvist, P. Rao', abs: 'Reward models are over-confident near the decision boundary; temperature scaling per prompt cluster fixes most of it.', cites: 59, pages: 14 },
  { title: 'Grid-Aligned Motion Priors for UI Animation', tag: 'cs.GR', authors: 'H. Duarte, N. Abe', abs: 'Snapping keyframes to a layout grid makes generated interface motion read as intentional rather than drifting.', cites: 41, pages: 9 },
  { title: 'Cheap Verifiers Beat Expensive Samplers', tag: 'cs.LG', authors: 'T. Mensah, O. Zhou, B. Klein', abs: 'At a fixed compute budget, sampling more with a small verifier outperforms sampling less with a larger model.', cites: 305, pages: 16 },
  { title: 'Structured Decoding Without Grammar Loss', tag: 'cs.CL', authors: 'I. Petrov, C. Alvarez', abs: 'A lookahead mask keeps outputs schema-valid without the perplexity penalty of hard grammar-constrained decoding.', cites: 76, pages: 11 },
  { title: 'Depth-Ordered Compositing for Live Interfaces', tag: 'cs.HC', authors: 'R. Bauer, F. Nakamura', abs: 'Sorting interface layers by perceived depth before blending removes most halo artifacts in live UI compositing.', cites: 28, pages: 8 },
  { title: 'Token-Budget Routing in Agent Fleets', tag: 'cs.MA', authors: 'D. Osei, M. Laurent, G. Sato', abs: 'Routing subtasks by predicted token cost balances fleet load and reduces total spend by 23% at equal quality.', cites: 64, pages: 13 },
  { title: 'Contrastive Layouts for Document Understanding', tag: 'cs.CV', authors: 'W. Ibrahim, S. Kowalski', abs: 'Pairing each page with a layout-perturbed twin teaches models to read structure, not just the words on it.', cites: 118, pages: 15 },
  { title: 'Fast Approximate Re-Ranking at Query Time', tag: 'cs.IR', authors: 'L. Moreau, A. Gupta', abs: 'A distilled two-tower scorer re-ranks the top 200 candidates in 3 ms with no measurable loss in nDCG@10.', cites: 93, pages: 10 },
];
const N = PAPERS.length;
const CW = 296;
const CH = 96;

// 落位时间表：首张 f=6 落定，此后间隔 14→9.5 帧递减（越来越快的发牌），末张 f≈123.5 落定，留 ~20f 静止
const LAND: number[] = (() => {
  const out = [FLY];
  for (let k = 0; k < N - 1; k++) out.push(out[k] + lerp(k / (N - 2), 14, 9.5));
  return out;
})();

// 每张卡被下一张"推一格"的进度：落位前 0.5f 起、6f 内 ease-out 走完
const pushK = (f: number, j: number) => seg(f, LAND[j] - 0.5, LAND[j] + 5.5, EASE.out);

// 入场位置（逻辑 px，相对落点）：translateY(-40→0)，outCubic
const flyP = (f: number, i: number) => seg(f, LAND[i] - FLY, LAND[i], E.outCubic);

export const ResearchCardStackScroll: React.FC = () => {
  const t = useT();
  const f = t * F;
  // 已压上的张数（连续值）——grid 位移与所有卡的下沉都由它导出，保证严格同速
  const pushes = (i: number) => {
    let s = 0;
    for (let j = i + 1; j < N; j++) s += pushK(f, j);
    return s;
  };
  const gridShift = pushes(0) + pushK(f, 0);
  return (
    <AbsoluteFill>
      <Backdrop tone="light" light={{ x: 0.42, y: 0.12 }} accent={ORANGE} grain={0} vignette={0.2} />
      <DesignStage bg="transparent" raster="zoom">
        {/* 背景横向 grid：随整叠被推下的量同步下移做速度参照；上下羽化，不顶到画框 */}
        <div
          style={{
            position: 'absolute',
            inset: -40,
            backgroundImage: 'linear-gradient(rgba(30,32,40,.07) 0.25px,transparent 0.5px)',
            backgroundSize: '100% 24px',
            transform: `translateY(${((gridShift * GAP * S) % 24).toFixed(3)}px)`,
            WebkitMaskImage: 'linear-gradient(180deg, transparent 6%, #000 30%, #000 70%, transparent 94%)',
            maskImage: 'linear-gradient(180deg, transparent 6%, #000 30%, #000 70%, transparent 94%)',
          }}
        />
        {/* 逻辑画布 track：中心锚点 + 等比缩放 */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 0,
            height: 0,
            transformOrigin: '0 0',
            transform: `scale(${S})`,
          }}
        >
          {PAPERS.map((pp, i) => {
            if (f < LAND[i] - FLY) return null;
            const p = flyP(f, i);
            const e = f - LAND[i]; // 该卡相对落位的本地帧
            const stackN = pushes(i); // 被压了几张（连续）
            const drift = stackN * GAP;
            // 落位压缩：落定后 0→2.4f 内 y 轴压 3% 再弹回（正弦包络，读作"砸实了"）
            const squash = e >= 0 && e < 2.4 ? 1 - 0.03 * Math.sin((e / 2.4) * Math.PI) : 1;
            const y = lerp(p, -40, 0) + drift;
            const x = stackN * XOFF;
            const depth = Math.min(1, drift / (GAP * 3)); // depth 递增 blur + 变暗
            // 入场 1.5f 淡入（尽快不透明，免得透出下面那张的正文）；越深越透（亮底上深色堆不至于糊成黑块）；过 3.2 格后 1.6 格内回收
            const opacity =
              Math.min(1, (f - (LAND[i] - FLY)) / 1.5) * (1 - depth * 0.3) *
              (1 - Math.max(0, Math.min(1, (drift - GAP * 3.2) / (GAP * 1.6))));
            if (opacity <= 0.001) return null;
            // 飞行段纵向运动模糊（按速度，落定为 0）
            const vy = (lerp(flyP(f + 0.5, i), -40, 0) - lerp(flyP(f - 0.5, i), -40, 0)) * S * 4; // 输出 px/帧
            const mb = Math.min(6, vy * 0.22);
            // 正文：飞行后半程淡入上浮（落定时已可读）；被下一张盖住时随其落位淡出
            const bodyIn = seg(f, LAND[i] - 4, LAND[i] + 1, EASE.out);
            const bodyOut = i < N - 1 ? 1 - seg(f, LAND[i + 1] - FLY, LAND[i + 1] - 2) : 1;
            const body = bodyIn * bodyOut;
            const elev = lerp(depth, 1, 0.35); // 越深阴影越弱，避免堆底糊成黑块
            const accent = i % 4 === 1;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: -CW / 2,
                  top: -CH / 2 - 14,
                  width: CW,
                  height: CH,
                  zIndex: i,
                  opacity,
                  transform: `translate(${x.toFixed(3)}px,${y.toFixed(3)}px) scale(${lerp(p, 0.94, 1)},${lerp(p, 0.94, 1) * squash})`,
                  filter:
                    depth > 0.002
                      ? `blur(${(depth * 4).toFixed(2)}px) brightness(${(1 - depth * 0.25).toFixed(3)})`
                      : mb > 0.3
                        ? `url(#rcs-mb-${i})`
                        : undefined,
                }}
              >
                {mb > 0.3 && depth <= 0.002 && (
                  <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
                    <filter id={`rcs-mb-${i}`} x="-10%" y="-40%" width="120%" height="180%">
                      <feGaussianBlur stdDeviation={`0 ${(mb / (S * 4)).toFixed(3)}`} />
                    </filter>
                  </svg>
                )}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(180deg, #202126 0%, #18191d 100%)',
                    borderRadius: 11,
                    overflow: 'hidden',
                    fontFamily: FONT,
                    boxShadow:
                      `inset 0 0.3px 0 rgba(255,255,255,.10), inset 0 0 0 0.3px rgba(255,255,255,.07), ` +
                      `0 ${(0.8 * elev).toFixed(2)}px ${(2 * elev).toFixed(2)}px rgba(14,15,20,${(0.22 * elev).toFixed(3)}), ` +
                      `0 ${(12 * elev).toFixed(2)}px ${(28 * elev).toFixed(2)}px -6px rgba(14,15,20,${(0.30 * elev).toFixed(3)})`,
                  }}
                >
                  {/* 卡顶受光 */}
                  <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 70% at 30% 0%, rgba(255,255,255,.05), rgba(255,255,255,0) 60%)' }} />
                  {/* 左侧色条：每 4 张一根橙色，其余是石墨 */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 10,
                      bottom: 10,
                      width: 2.2,
                      borderRadius: '0 2px 2px 0',
                      background: accent ? ORANGE : 'rgba(255,255,255,.12)',
                    }}
                  />
                  {/* 标题条：所有卡都渲染 */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 14,
                      top: 11,
                      width: 268,
                      font: `640 9.5px/1.3 ${FONT}`,
                      letterSpacing: '-0.012em',
                      color: '#f2f2f4',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {pp.title}
                  </div>
                  {/* 正文（作者 + 摘要 + 页脚）：只有最上一张可见，随落位淡入 */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 14,
                      top: 29,
                      width: 268,
                      opacity: body,
                      transform: `translateY(${lerp(bodyIn, 2.5, 0).toFixed(3)}px)`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, font: `500 7px/1 ${FONT}` }}>
                      <span
                        style={{
                          font: `600 6px/1 ${MONO}`, color: accent ? ORANGE_SOFT : '#c9cad0', padding: '1.6px 3.5px', borderRadius: 3,
                          background: accent ? 'rgba(255,106,31,.14)' : 'rgba(255,255,255,.07)',
                        }}
                      >
                        {pp.tag}
                      </span>
                      <span style={{ color: ORANGE_SOFT, letterSpacing: '0.01em' }}>{pp.authors}</span>
                    </div>
                    <div
                      style={{
                        marginTop: 6, font: `400 7.2px/1.42 ${FONT}`, color: 'rgba(235,236,240,.62)', letterSpacing: '0.004em',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: 20.5,
                      }}
                    >
                      {pp.abs}
                    </div>
                    <div
                      style={{
                        marginTop: 7, display: 'flex', alignItems: 'center', gap: 8, font: `500 6.2px/1 ${MONO}`,
                        color: 'rgba(235,236,240,.40)', fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      <span>arXiv:24{10 + i}.0{(i * 37 + 113) % 900 + 100}</span>
                      <span style={{ width: 1.6, height: 1.6, borderRadius: 1, background: 'rgba(235,236,240,.3)' }} />
                      <span>{pp.cites} citations</span>
                      <span style={{ width: 1.6, height: 1.6, borderRadius: 1, background: 'rgba(235,236,240,.3)' }} />
                      <span>{pp.pages} pp</span>
                      <span
                        style={{
                          marginLeft: 'auto', font: `600 6px/1 ${FONT}`, color: '#e9e9ec', padding: '2px 5px', borderRadius: 3,
                          boxShadow: 'inset 0 0 0 0.3px rgba(255,255,255,.22)',
                        }}
                      >
                        PDF
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DesignStage>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};
