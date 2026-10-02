// word-relay-filmstrip v4 —— 质感升级（结构沿用 v3）：
// ① 左列页面卡黑白相间、每张等高（940x530，间距 105），内容从灰条骨架升级为出版级假页面
//    （基准报告 / 研究长文 / 构建流水线 / 代码评审 / 影像查看器 / 出货表，真实排版与假文案），
//    且每个动词落位时停在与之对应的那张证据上（文字与画面互为注脚）；
// ② 左列平时静止，只在右侧切词的窗口内滚动一格（滚动与切词同步，easeInOutCubic 16f），
//    滚动最快的几帧叠纵向运动模糊（静止为 0）；
// ③ 右侧 Didot 系衬线 116px，"Computer" 固定第一行，动词第二行原位接力：旧词先灰化，
//    切点起 8f 上移淡出（ease-in，顺着胶片滚动方向），新词后半窗口从下方 16px 去虚落位；
//    词块垂直中心与当前页面卡中点 y=540 对齐（top=402）；词块上方一枚小序号 01/03 同步翻页。
// 底景：暖纸色纵向渐变 + 左上柔光 + 轻暗角 + 颗粒。
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, SpeedBlur, Vignette, hairline, ramp, softShadow, velocity } from '../../_fixtures/Polish';

export const WORD_RELAY_FILMSTRIP_DURATION = 170; // 末词 f124 落定后 hold 46f（≈1.5s）

const CARD_W = 940;
const CARD_H = 530;
const GAP = 105;
const STEP = CARD_H + GAP;

const SANS = FONT.sans;
const SERIF_TXT = '"Iowan Old Style", "Charter", Georgia, serif';

// —— 页面卡集合：黑白相间（奇偶强制交替），内容各异 ——
// 研究长文（亮）——"researches" 的证据
const LightArticle: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, background: '#ffffff', padding: '30px 46px', fontFamily: SANS }}>
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28, paddingBottom: 16, borderBottom: '1px solid #eceae5' }}>
      <div style={{ fontFamily: SERIF_TXT, fontSize: 22, fontWeight: 700, color: '#1d1c1a', letterSpacing: '0.01em' }}>
        Perspective<span style={{ color: '#c4523a' }}>.</span>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 26, fontSize: 14, color: '#8a8780' }}>
        {['Research', 'Models', 'Policy', 'About'].map((t, i) => <span key={t} style={{ color: i === 0 ? '#1d1c1a' : undefined, fontWeight: i === 0 ? 600 : 400 }}>{t}</span>)}
      </div>
    </div>
    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', color: '#c4523a', marginBottom: 12 }}>RESEARCH NOTE · 12 MIN READ</div>
    <div style={{ fontFamily: SERIF_TXT, fontSize: 38, lineHeight: 1.14, color: '#1b1a18', width: 620, marginBottom: 22, letterSpacing: '-0.01em' }}>
      How open models changed the cost of curiosity
    </div>
    <div style={{ display: 'flex', gap: 30 }}>
      <div style={{ flex: 1.3, fontFamily: SERIF_TXT, fontSize: 15.5, lineHeight: 1.6, color: '#5d5a54' }}>
        Three years ago, running a frontier-scale experiment meant a grant, a queue and a quarter of waiting. Today a
        graduate student can reproduce last spring&apos;s headline result on a rented GPU before lunch. We traced 1,240
        published replications to see what that shift did to the questions people dare to ask.
      </div>
      <div style={{ flex: 1, borderRadius: 10, background: '#f7f5f0', border: '1px solid #ebe7de', padding: '16px 18px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: '#9a7a3a', marginBottom: 12 }}>KEY FINDINGS</div>
        {[['4.2×', 'more replications per paper'], ['61%', 'run on a single node'], ['−83%', 'median compute cost'], ['2.1 d', 'time to first result']].map(([n, l]) => (
          <div key={l} style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginBottom: 9 }}>
            <span style={{ width: 56, fontSize: 15, fontWeight: 700, color: '#1d1c1a', fontVariantNumeric: 'tabular-nums' }}>{n}</span>
            <span style={{ fontSize: 13.5, color: '#77736b' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
    {/* 图 1：逐年复现数的小柱图 + 图注 */}
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22, marginTop: 20, paddingTop: 14, borderTop: '1px solid #eceae5' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 48 }}>
        {[0.18, 0.24, 0.31, 0.46, 0.58, 0.72, 0.9, 1].map((v, i) => (
          <div key={i} style={{ width: 14, height: `${v * 100}%`, borderRadius: 2, background: i === 7 ? '#c4523a' : '#d9d4ca' }} />
        ))}
      </div>
      <div style={{ fontSize: 13, color: '#8a8780', lineHeight: 1.45 }}>
        <span style={{ fontWeight: 700, color: '#4a4741' }}>Fig. 1</span> — Replications per published paper, 2019–2026
      </div>
      <div style={{ marginLeft: 'auto', fontSize: 13, color: '#8a8780' }}>By M. Lindqvist &amp; T. Park</div>
    </div>
  </div>
);

const DarkMri: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, background: '#08090b', fontFamily: SANS }}>
    <div style={{ height: 46, borderBottom: '1px solid #1a1c21', display: 'flex', alignItems: 'center', gap: 14, padding: '0 24px' }}>
      <div style={{ fontSize: 15, fontWeight: 650, color: '#d4d7dc' }}>Scan Viewer</div>
      <div style={{ fontSize: 13, color: '#5f646e' }}>Study 0042 · Brain MRI · T2 FLAIR</div>
      <div style={{ marginLeft: 'auto', fontSize: 12.5, color: '#b8a24e', fontWeight: 600 }}>● 3 annotations</div>
    </div>
    <div style={{ display: 'flex', height: CARD_H - 46 }}>
      <div style={{ width: 190, borderRight: '1px solid #16181c', padding: '18px 18px' }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.12em', color: '#8d7c3e', marginBottom: 12 }}>SERIES</div>
        {['Axial T1', 'Axial T2', 'FLAIR', 'DWI b1000', 'ADC map'].map((t, i) => (
          <div key={t} style={{ fontSize: 13.5, color: i === 2 ? '#e2e4e8' : '#5c616b', padding: '6px 8px', borderRadius: 6, background: i === 2 ? 'rgba(255,255,255,0.05)' : 'transparent', marginBottom: 2 }}>{t}</div>
        ))}
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 290, height: 350, borderRadius: '46% 46% 42% 42%',
          background: 'radial-gradient(ellipse 46% 40% at 50% 42%, #b9bcc0 0%, #6c7076 34%, #33363c 62%, #101216 100%)',
          position: 'relative', boxShadow: '0 0 60px rgba(150,160,180,0.08)',
        }}>
          {[[118, 98], [196, 150], [92, 210]].map(([x, y], i) => (
            <div key={i} style={{ position: 'absolute', left: x, top: y, width: 14, height: 14, borderRadius: 7, border: '2px solid #d8b25a', boxShadow: '0 0 8px rgba(216,178,90,0.5)' }} />
          ))}
        </div>
      </div>
      <div style={{ width: 200, borderLeft: '1px solid #16181c', padding: '18px 18px' }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.12em', color: '#6a6f79', marginBottom: 12 }}>FINDINGS</div>
        {[['A1', 'Focal hyperintensity, 4 mm'], ['A2', 'No mass effect'], ['A3', 'Ventricles normal']].map(([k, v]) => (
          <div key={k} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#d8b25a' }}>{k}</div>
            <div style={{ fontSize: 13, color: '#8a8f99', lineHeight: 1.4 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const LightTable: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, background: '#ffffff', padding: '28px 40px', fontFamily: SANS }}>
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(145deg, #2c62c6, #1d4f9e)', marginRight: 12 }} />
      <div style={{ fontSize: 22, fontWeight: 700, color: '#1d1e21', letterSpacing: '-0.01em' }}>Q3 shipments by region</div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 18, fontSize: 13.5, color: '#8b9099' }}>
        <span>Export CSV</span><span>Filters (2)</span>
      </div>
    </div>
    <div style={{ display: 'flex', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#9aa0aa', padding: '0 0 8px', borderBottom: '1px solid #e6e8ec' }}>
      <span style={{ width: 40 }}>#</span><span style={{ flex: 1 }}>REGION</span>
      <span style={{ width: 110, textAlign: 'right' }}>UNITS</span><span style={{ width: 110, textAlign: 'right' }}>REVENUE</span><span style={{ width: 90, textAlign: 'right' }}>YOY</span>
    </div>
    {[
      ['Northern Europe', '48,210', '$12.4M', '+18%', '#3a8a52'], ['East Asia', '41,977', '$11.9M', '+9%', '#2c62b8'],
      ['North America', '39,402', '$10.2M', '+4%', '#caa53c'], ['Latin America', '22,816', '$5.1M', '+27%', '#b23a3a'],
      ['Middle East', '18,330', '$4.6M', '−2%', '#3a8a52'], ['Oceania', '9,114', '$2.3M', '+11%', '#2c62b8'],
      ['Southern Africa', '6,702', '$1.4M', '+6%', '#caa53c'],
    ].map(([name, u, r, y, c], i) => (
      <div key={name} style={{ display: 'flex', alignItems: 'center', padding: '10.5px 0', borderBottom: '1px solid #f0f1f4', fontSize: 15, color: '#2a2c30', fontVariantNumeric: 'tabular-nums' }}>
        <span style={{ width: 40, color: '#a0a5ae', fontSize: 13.5 }}>{i + 1}</span>
        <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: c }} />{name}
        </span>
        <span style={{ width: 110, textAlign: 'right' }}>{u}</span>
        <span style={{ width: 110, textAlign: 'right', fontWeight: 600 }}>{r}</span>
        <span style={{ width: 90, textAlign: 'right', color: y.startsWith('−') ? '#b8463d' : '#2e8a50', fontWeight: 600 }}>{y}</span>
      </div>
    ))}
  </div>
);

const DarkStats: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #110f14 0%, #0c0b0f 100%)', padding: '34px 46px', fontFamily: SANS }}>
    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', color: '#b0584c', marginBottom: 8 }}>LAB REPORT · BENCHMARKS</div>
    <div style={{ fontSize: 28, fontWeight: 700, color: '#ece8e2', letterSpacing: '-0.015em', marginBottom: 22 }}>Reasoning accuracy, by model size</div>
    <div style={{ borderLeft: '2px solid #5e2530', paddingLeft: 26 }}>
      {[['1B', 0.24, '24.7'], ['3B', 0.33, '33.5'], ['7B', 0.46, '46.2'], ['13B', 0.58, '58.0'], ['34B', 0.69, '69.4'], ['70B', 0.86, '86.1']].map(([k, w, v], i) => (
        <div key={k as string} style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
          <span style={{ width: 40, fontSize: 14, color: '#7d7983', fontWeight: 600 }}>{k}</span>
          <div style={{ width: 520, height: i === 5 ? 22 : 16, borderRadius: 4, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
            <div style={{ width: `${(w as number) * 100}%`, height: '100%', borderRadius: 4, background: i === 5 ? 'linear-gradient(90deg, #8c2f27, #d24a3a)' : '#5a5560' }} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: i === 5 ? '#f08a76' : '#bdb8c2', fontVariantNumeric: 'tabular-nums' }}>{v}%</span>
        </div>
      ))}
    </div>
    <div style={{ marginTop: 22, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '16px 24px', display: 'flex', gap: 54 }}>
      {[['+39.9', 'pts, 7B → 70B'], ['1.8×', 'tokens / sec'], ['0.4%', 'variance, 5 runs']].map(([n, l]) => (
        <div key={l}>
          <div style={{ fontSize: 22, fontWeight: 750, color: '#e8735f', fontVariantNumeric: 'tabular-nums' }}>{n}</div>
          <div style={{ fontSize: 13, color: '#77727e' }}>{l}</div>
        </div>
      ))}
    </div>
  </div>
);

// 构建流水线（暗）——"builds" 的证据
const DarkBuild: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #111318 0%, #0c0d11 100%)', padding: '26px 40px', fontFamily: SANS }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <div style={{ fontSize: 19, fontWeight: 700, color: '#e6e8ee' }}>acme / web-app</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#9aa1b4', padding: '3px 9px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)' }}>main</div>
      <div style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: '#e8b84a' }}>● Build #1284 running</div>
    </div>
    {/* 流水线步骤 */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      {[['Install', 1], ['Compile', 1], ['Test', 1], ['Bundle', 1], ['Deploy', 0]].map(([t, ok], i) => (
        <React.Fragment key={t as string}>
          {i > 0 && <div style={{ flex: 1, height: 1, background: ok ? 'rgba(95,195,140,0.4)' : 'rgba(255,255,255,0.1)' }} />}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 9, fontSize: 13.5, fontWeight: 600,
            color: ok ? '#cfe9da' : '#f1d58f', background: ok ? 'rgba(95,195,140,0.09)' : 'rgba(232,184,74,0.1)',
            border: `1px solid ${ok ? 'rgba(95,195,140,0.22)' : 'rgba(232,184,74,0.3)'}`,
          }}>
            <span style={{ color: ok ? '#5fc38c' : '#e8b84a' }}>{ok ? '✓' : '◐'}</span>{t}
          </div>
        </React.Fragment>
      ))}
    </div>
    <div style={{ display: 'flex', gap: 18 }}>
      {/* 构建日志 */}
      <div style={{ flex: 1.6, background: '#08090c', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 18px', fontFamily: FONT.mono, fontSize: 13, lineHeight: 1.75, color: '#7c8293' }}>
        <div><span style={{ color: '#5f6577' }}>$</span> <span style={{ color: '#d4d8e2' }}>pnpm build --filter web</span></div>
        <div><span style={{ color: '#5fc38c' }}>✓</span> Compiled 412 modules in 8.3s</div>
        <div><span style={{ color: '#5fc38c' }}>✓</span> 248 tests passed · 0 failed</div>
        <div><span style={{ color: '#5fc38c' }}>✓</span> Generated 38 static pages</div>
        <div><span style={{ color: '#5fc38c' }}>✓</span> Bundle 1.82 MB (−6.4%)</div>
        <div><span style={{ color: '#e8b84a' }}>▲</span> <span style={{ color: '#c9cdd8' }}>Deploying to 3 regions…</span></div>
      </div>
      {/* 汇总 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[['Duration', '1m 42s'], ['Cache hit', '87%'], ['Lighthouse', '98']].map(([k, v]) => (
          <div key={k} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '11px 16px' }}>
            <div style={{ fontSize: 12, color: '#6c7283', fontWeight: 600, letterSpacing: '0.06em' }}>{k.toUpperCase()}</div>
            <div style={{ fontSize: 21, fontWeight: 700, color: '#e6e8ee', fontVariantNumeric: 'tabular-nums' }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// 代码评审（亮）——"codes" 的证据
const CODE: { n: number; d?: '+' | '-'; t: [string, string][] }[] = [
  { n: 12, t: [['export function ', '#a626a4'], ['useCart', '#4078f2'], ['(userId: ', '#383a42'], ['string', '#c18401'], [') {', '#383a42']] },
  { n: 13, t: [['  const ', '#a626a4'], ['items', '#383a42'], [' = ', '#0184bc'], ['useQuery', '#4078f2'], ['(cartKey(userId));', '#383a42']] },
  { n: 14, d: '-', t: [['  const ', '#a626a4'], ['total', '#383a42'], [' = items.reduce((s, i) => s + i.price, ', '#383a42'], ['0', '#986801'], [');', '#383a42']] },
  { n: 14, d: '+', t: [['  const ', '#a626a4'], ['total', '#383a42'], [' = ', '#0184bc'], ['useMemo', '#4078f2'], ['(() => ', '#383a42'], ['sum', '#4078f2'], ['(items), [items]);', '#383a42']] },
  { n: 15, d: '+', t: [['  const ', '#a626a4'], ['isEmpty', '#383a42'], [' = items.length === ', '#383a42'], ['0', '#986801'], [';', '#383a42']] },
  { n: 16, t: [['', '#383a42']] },
  { n: 17, t: [['  return ', '#a626a4'], ['{ items, total, isEmpty };', '#383a42']] },
  { n: 18, t: [['}', '#383a42']] },
];
const LightCode: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, background: '#ffffff', fontFamily: SANS, display: 'flex', flexDirection: 'column' }}>
    <div style={{ height: 52, display: 'flex', alignItems: 'center', gap: 12, padding: '0 28px', borderBottom: '1px solid #eceef1' }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#1d1e21' }}>Refactor cart totals</div>
      <div style={{ fontSize: 13, color: '#8b9099' }}>#482 · 3 files · +24 −9</div>
      <div style={{ marginLeft: 'auto', fontSize: 12.5, fontWeight: 700, color: '#2e8a50', padding: '4px 10px', borderRadius: 10, background: 'rgba(46,138,80,0.1)' }}>✓ Checks passed</div>
    </div>
    <div style={{ display: 'flex', flex: 1 }}>
      <div style={{ width: 200, borderRight: '1px solid #eceef1', padding: '16px 18px', fontSize: 13.5, color: '#6b7079' }}>
        {[['src/', 0], ['hooks/', 1], ['useCart.ts', 2], ['useOrders.ts', 2], ['lib/', 1], ['sum.ts', 2], ['tests/', 0]].map(([t, l]) => (
          <div key={t as string} style={{
            padding: '5px 8px', paddingLeft: 8 + (l as number) * 14, borderRadius: 6, marginBottom: 1,
            background: t === 'useCart.ts' ? '#eef2fb' : 'transparent', color: t === 'useCart.ts' ? '#2c62c6' : undefined,
            fontWeight: t === 'useCart.ts' ? 600 : 400,
          }}>{t}</div>
        ))}
      </div>
      <div style={{ flex: 1, padding: '14px 0', fontFamily: FONT.mono, fontSize: 14.5, lineHeight: 1.85 }}>
        <div style={{ padding: '0 20px 8px', fontSize: 12.5, color: '#8b9099', fontFamily: SANS }}>src/hooks/useCart.ts</div>
        {CODE.map((r, i) => (
          <div key={i} style={{
            display: 'flex', whiteSpace: 'pre',
            background: r.d === '+' ? 'rgba(46,160,90,0.09)' : r.d === '-' ? 'rgba(200,60,50,0.07)' : 'transparent',
          }}>
            <span style={{ width: 44, textAlign: 'right', color: '#b3b7bf', paddingRight: 10, fontVariantNumeric: 'tabular-nums' }}>{r.n}</span>
            <span style={{ width: 18, color: r.d === '+' ? '#2e9a5e' : '#c4473c' }}>{r.d ?? ' '}</span>
            {r.t.map(([s, c], k) => <span key={k} style={{ color: c, opacity: r.d === '-' ? 0.6 : 1 }}>{s}</span>)}
          </div>
        ))}
        {/* 评审评论 */}
        <div style={{ margin: '14px 20px 0 62px', display: 'flex', gap: 12, alignItems: 'flex-start', fontFamily: SANS }}>
          <div style={{ width: 30, height: 30, borderRadius: 15, background: '#e6e9f2', color: '#4a5577', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>MR</div>
          <div style={{ border: '1px solid #e6e8ec', borderRadius: 10, padding: '9px 14px', background: '#fafbfc' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#2a2c30', marginBottom: 2 }}>Mira R. <span style={{ fontWeight: 400, color: '#9aa0aa' }}>· approved</span></div>
            <div style={{ fontSize: 13.5, color: '#4a4e56' }}>Memoizing this drops the re-render on every keystroke. Ship it.</div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// 黑白相间的固定顺序（奇偶交替）
// 第 k 个词配第 k+1 张卡（首个词随第一格滚动出现）：researches→研究长文、builds→构建流水线、codes→代码评审；
// 第 0 张是开场的基准报告，第 4、5 张是上下露边的邻卡
const CARDS: React.FC[] = [DarkStats, LightArticle, DarkBuild, LightCode, DarkMri, LightTable];

const WORDS = ['researches', 'builds', 'codes'];
// 切词窗口：第一个词入场 f14–30；换词 f62–78、f108–124
const SWITCHES = [14, 62, 108];
const SW_DUR = 16;
const SERIF = '"Didot", "Bodoni 72", "Playfair Display", Georgia, serif';

// 滚动步进：平时静止，仅在切词窗口内滚一格（ease-in-out）
const stepAt = (frame: number) => {
  let stepF = 0;
  SWITCHES.forEach((s) => {
    const p = interpolate(frame, [s, s + SW_DUR], [0, 1], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });
    // easeInOutCubic
    stepF += p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  });
  return stepF;
};

export const WordRelayFilmstrip: React.FC = () => {
  const frame = useCurrentFrame();

  const stepF = stepAt(frame);
  const scroll = stepF * STEP;
  const vy = -velocity((f) => stepAt(f) * STEP, frame); // 胶片向上滚（px/帧）

  // 卡片布局：焦点卡顶 y=275，向两侧铺开；黑白相间
  const total = CARDS.length * STEP;
  const cards: React.ReactNode[] = [];
  for (let rep = -1; rep < 2; rep++) {
    CARDS.forEach((C, i) => {
      const y = 275 + i * STEP + rep * total - scroll;
      if (y > 1200 || y < -CARD_H - 120) return;
      cards.push(
        <div key={`${rep}-${i}`} style={{
          position: 'absolute', top: y, left: 106, width: CARD_W, height: CARD_H,
          borderRadius: 14, overflow: 'hidden', background: '#fff',
          border: hairline(0.07), boxShadow: softShadow(18, { color: '#1e1a14' }),
        }}>
          <C />
        </div>,
      );
    });
  }

  // —— 右侧词接力：旧词灰化 → 上移淡出（先出），新词从下方去虚落位（后进）——
  const wordStyle: React.CSSProperties = {
    fontFamily: SERIF, fontWeight: 400, fontSize: 116, lineHeight: 1.18,
    letterSpacing: '0.002em', textAlign: 'right', whiteSpace: 'nowrap',
  };
  const wordNodes = WORDS.map((w, i) => {
    const sIn = SWITCHES[i];
    const sOut = i + 1 < SWITCHES.length ? SWITCHES[i + 1] : null;
    // 新词后半窗口落位（避免与旧词叠影）；第一个词随第一格滚动 12f 入场
    const pIn = i === 0 ? ramp(frame, sIn, 12, EASE.snappy) : ramp(frame, sIn + 7, SW_DUR - 7, EASE.snappy);
    if (pIn <= 0) return null;
    // 灰化：切点前 14 帧开始，切点时已全灰
    const grey = sOut ? ramp(frame, sOut - 14, 12, EASE.smooth) : 0;
    // 淡出：切点起 8f 内上移出完（ease-in，决绝）
    const pOut = sOut ? ramp(frame, sOut, 8, EASE.exit) : 0;
    const op = Math.min(1, pIn * 1.25) * (1 - pOut);
    if (op <= 0.001) return null;
    const ch = Math.round(0x19 + (0x9d - 0x19) * grey);
    const y = (1 - pIn) * 16 - pOut * 14;
    const blur = (1 - pIn) * 5 + pOut * 3;
    return (
      <div key={w} style={{
        ...wordStyle, position: 'absolute', right: 0, top: 0,
        color: `rgb(${ch},${Math.round(0x19 + (0x98 - 0x19) * grey)},${Math.round(0x19 + (0x8e - 0x19) * grey)})`,
        opacity: op, transform: `translateY(${y.toFixed(2)}px)`,
        filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined,
      }}>
        {w}
      </div>
    );
  });

  // 小序号：跟着当前词翻页（与词同节奏的淡入淡出）
  const IDX_AT = SWITCHES.map((s, i) => (i === 0 ? s : s + 7)); // 与新词落位同起点
  const idx = IDX_AT.filter((s) => frame >= s).length; // 0..3
  const idxIn = idx === 0 ? 0 : ramp(frame, IDX_AT[idx - 1], 9, EASE.out);
  const idxOut = idx > 0 && idx < SWITCHES.length ? ramp(frame, SWITCHES[idx], 6, EASE.exit) : 0; // 与旧词同步先出

  return (
    <AbsoluteFill style={{ background: '#f6f3ec' }}>
      {/* 暖纸色底：纵向渐变 + 左上柔光 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 60% 70% at 28% 22%, rgba(255,253,248,0.95) 0%, rgba(255,253,248,0) 70%), linear-gradient(180deg, #f8f6f0 0%, #f1ede5 100%)',
      }} />
      <SpeedBlur vx={0} vy={vy} amount={0.2} max={9}>{cards}</SpeedBlur>
      {/* 右侧词组：Computer 固定第一行，动词第二行原位换词。
          块总高≈137(Computer 行)+140(词行容器)=277，垂直中心须对齐
          当前页面卡中点 y=540（卡顶 275 + 卡高 530/2）→ top=540-277/2≈402 */}
      <div style={{ position: 'absolute', right: 210, top: 402 }}>
        <div style={{ ...wordStyle, color: '#191919' }}>Computer</div>
        <div style={{ position: 'relative', height: 140 }}>{wordNodes}</div>
      </div>
      {/* 序号：词块右缘对齐，悬在 Computer 上方 */}
      <div style={{
        position: 'absolute', right: 216, top: 352, fontFamily: SANS, fontSize: 30, fontWeight: 500,
        letterSpacing: '0.06em', color: '#9b968c', fontVariantNumeric: 'tabular-nums', opacity: idxIn * (1 - idxOut),
      }}>
        <span style={{ color: '#3a3833' }}>{String(Math.max(1, idx)).padStart(2, '0')}</span>
        {' / 03'}
      </div>
      <Vignette strength={0.16} color="#3a3020" />
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};
