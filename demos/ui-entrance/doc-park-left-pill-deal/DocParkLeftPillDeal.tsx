// doc-park-left-pill-deal —— 文档靠左驻留 + 结论慢发牌（第二轮重设计 · 瓷白 SaaS）
// 手法不变：文档读完后不淡出，而是滑向左侧只露一截并微缩到 0.92、全程极缓慢自动滚动（"仍在被读"）；
// 右侧按旁白节奏慢速发三张结论药丸，每张落定后它下方的说明逐词加深，下一张到来前整句淡出。
//
// 设计决定
// - look = porcelain（冷白 + 钴蓝 + 一点青绿）。原生 1920 排版，不再走 480 设计坐标放大：
//   文档是一张出版级"客户档案"白纸（标题 52px / 正文 30px），药丸放大成 128px 高的结论条（名称 54px），
//   说明句 44px——每个要读的字都过 Q11。
// - 因果更直观：每张药丸先在文档里"找到依据"——依据句被钴蓝荧光笔自左向右划出——
//   然后药丸从这句话的位置飞出、带一次过冲落进右栏槽位，再由一条钴蓝细线把依据句尾和药丸连起来。
//   结论确实是从文档里"长出来"的。
// - 开场：文档居中，一道钴蓝扫描光带自上而下扫过（"正在读"），眉题 ANALYZING 计数源；扫完即驻留。
// - 节奏：发牌间隔 38f（一句短旁白的长度），每张药丸内部是"快—慢"两条曲线（透明度 6f 先到、位移 14f 过冲后到）。
//   末句说明留到最后（尾帧是一张三条结论 + 一句理由的完整海报）。
//
// 时间表（30fps，共 180f）
//   0–30    扫描：光带扫过整页，眉题"ANALYZING · 12 SOURCES"
//   18–46   驻留：文档 translateX → 只露约 40%，scale 1→0.92（smooth in-out 28f）；右栏眉题淡入
//   全程    自动滚动：连续匀速 1.4px/f（不取模，不回跳）
//   T0=46 / 84 / 122  每张：依据句荧光笔 T0−6→T0+6；药丸 T0→T0+14 从依据句飞到槽位（overshoot）；
//           连线 T0+8→T0+20 draw-on；说明 T0+12 起逐词加深（~20f），下一张 T0−8 前淡出（末张不淡出）
//   150–180 hold 30f：三条结论 + 末句说明，极缓推近 1%
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, mix, ramp, softShadow } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, type } from '../../_fixtures/Look';

export const DOC_PARK_LEFT_PILL_DEAL_DURATION = 180;

const L = LOOKS.porcelain;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const h2r = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixColor = (p: number, a: string, b: string) => {
  const A = h2r(a), B = h2r(b), q = clamp01(p);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * q)},${Math.round(A[1] + (B[1] - A[1]) * q)},${Math.round(A[2] + (B[2] - A[2]) * q)})`;
};

// ───────────── 文档（内容坐标：宽 DW；窗口高 DH；内容比窗口长，供连续滚动） ─────────────
const DW = 1000, DH = 880;
const DOC_X = 460, DOC_Y = 100; // 居中时的位置
const PAD = 64;
const PARK_X = -1010; // 驻留：左移量（scale 0.92 以左缘为锚 → 右缘落在 x≈370，露约 40%）
const SCROLL_V = 1.4; // px/帧

type Line = { kind: 'title' | 'meta' | 'h' | 'p'; text: string; mark?: number };
const RAW: Line[] = [
  { kind: 'title', text: 'Account review — Northwind Studio' },
  { kind: 'meta', text: 'Prepared by Customer Ops · Oct 2 · 12 sources' },
  { kind: 'h', text: 'PROFILE' },
  { kind: 'p', text: 'Design agency, 14 seats, onboarded in March via partners.' },
  { kind: 'p', text: 'Two admins; most members join from shared invite links.' },
  { kind: 'h', text: 'PREFERENCES' },
  { kind: 'p', text: 'Asked twice for a guided setup instead of blank projects.', mark: 0 },
  { kind: 'p', text: 'Opens the onboarding checklist within the first minutes.' },
  { kind: 'h', text: 'USAGE' },
  { kind: 'p', text: 'Most sessions land on weekdays between 9 and 11 am local.', mark: 1 },
  { kind: 'p', text: 'Weekend activity under 4%; mobile share steady at 18%.' },
  { kind: 'h', text: 'ORDERS' },
  { kind: 'p', text: 'The starter kit is their most repeated item, nine orders.', mark: 2 },
  { kind: 'p', text: 'Average basket of 3.2 items; reorders every 24 days.' },
  { kind: 'h', text: 'NOTES' },
  { kind: 'p', text: 'Champion is the studio lead; finance signs annual plans.' },
  { kind: 'p', text: 'Wants a bundle once the team grows past twenty seats.' },
  { kind: 'p', text: 'Next check-in after the quarterly planning cycle ends.' },
];
// 排版：逐行累计 y（内容坐标，行中线）
const DOC: (Line & { y: number; size: number; h: number })[] = (() => {
  let y = PAD;
  return RAW.map((l) => {
    const size = l.kind === 'title' ? 52 : l.kind === 'meta' ? 26 : l.kind === 'h' ? 22 : 30;
    const before = l.kind === 'h' ? 40 : l.kind === 'meta' ? 14 : 0;
    const h = l.kind === 'title' ? 64 : l.kind === 'meta' ? 40 : l.kind === 'h' ? 44 : 52;
    y += before;
    const out = { ...l, y: y + h / 2, size, h };
    y += h;
    return out;
  });
})();

// ───────────── 右栏结论 ─────────────
const ITEMS: { n: string; ic: 'spark' | 'calendar' | 'box'; pct: string; cap: string }[] = [
  { n: 'Guided quick start', ic: 'spark', pct: '92%', cap: 'They asked for guided setup, twice.' },
  { n: 'Weekday team plan', ic: 'calendar', pct: '88%', cap: 'Usage peaks 9–11 am on weekdays.' },
  { n: 'Starter kit refill', ic: 'box', pct: '95%', cap: 'Their most reordered item, nine times.' },
];
const PX = 600, PW = 1000, PH = 128;
const PY = [196, 436, 676];
const T0 = [46, 84, 122];

const Icon: React.FC<{ k: 'spark' | 'calendar' | 'box'; size: number; color: string }> = ({ k, size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    {k === 'spark' && (<><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="M12 8.5l1.2 2.3 2.3 1.2-2.3 1.2L12 15.5l-1.2-2.3L8.5 12l2.3-1.2z" /></>)}
    {k === 'calendar' && (<><rect x={3.5} y={5} width={17} height={15} rx={3} /><path d="M3.5 10h17M8 3v4M16 3v4" /><path d="M8 14h3" /></>)}
    {k === 'box' && (<><path d="M3.5 8 12 3.5 20.5 8v8L12 20.5 3.5 16z" /><path d="M3.5 8 12 12.5 20.5 8M12 12.5v8" /></>)}
  </svg>
);

// 逐词加深说明句：ink3 → ink 逐词，出场整句淡出
const Caption: React.FC<{ text: string; innP: number; outP: number; style: React.CSSProperties }> = ({ text, innP, outP, style }) => {
  const words = text.split(' ');
  const n = words.length;
  const st = 0.75 / n, win = st * 1.6;
  return (
    <div style={{ position: 'absolute', whiteSpace: 'nowrap', opacity: clamp01(innP * 6) * (1 - outP), transform: `translateY(${(-10 * outP).toFixed(2)}px)`, ...style }}>
      {words.map((w, i) => {
        const q = clamp01((innP - i * st) / win);
        return (
          <span key={i} style={{ color: mixColor(q, '#c3cad8', L.ink), display: 'inline-block', transform: `translateY(${((1 - EASE.out(q)) * 8).toFixed(2)}px)`, marginRight: '0.26em' }}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

export const DocParkLeftPillDeal: React.FC = () => {
  const frame = useCurrentFrame();

  // 驻留
  const park = ramp(frame, 18, 28, EASE.smooth);
  const tx = mix(0, PARK_X, park);
  const sc = mix(1, 0.92, park);
  const scrollY = -frame * SCROLL_V;
  // 文档内容坐标 → 屏幕坐标（窗口 transform-origin：左缘中点）
  const toScreen = (xd: number, yd: number) => ({
    x: DOC_X + tx + sc * xd,
    y: DOC_Y + DH / 2 + sc * (yd + scrollY - DH / 2),
  });

  // 扫描光带：0–30 自上而下
  const scan = ramp(frame, 2, 28, EASE.swift);
  const scanOp = clamp01(frame / 4) * (1 - ramp(frame, 26, 6, EASE.out));
  const kickA = ramp(frame, 0, 10, EASE.out) * (1 - ramp(frame, 18, 10, EASE.out));
  const kickB = ramp(frame, 36, 14, EASE.out);

  // 整体极缓推近（hold 段让画面活着）
  const push = 1 + 0.01 * ramp(frame, 120, 60, EASE.smooth);

  return (
    <AbsoluteFill style={{ fontFamily: FONT.sans, overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.62, y: 0.12 }} fill={{ x: 0.1, y: 0.9 }} />

      <AbsoluteFill style={{ transform: `scale(${push.toFixed(5)})`, transformOrigin: '1100px 540px' }}>
        {/* ── 文档窗格：驻留 + 微缩，origin 钉在左缘中点 ── */}
        <div
          style={{
            position: 'absolute', left: DOC_X, top: DOC_Y, width: DW, height: DH, transformOrigin: '0% 50%',
            transform: `translateX(${tx.toFixed(2)}px) scale(${sc.toFixed(4)})`,
          }}
        >
          <div
            style={{
              position: 'absolute', inset: 0, borderRadius: 28, overflow: 'hidden', background: L.surface,
              border: `1px solid ${L.line}`,
              boxShadow: `inset 0 1px 0 #ffffff, ${softShadow(28, { color: L.shadow, strength: 1.1 })}`,
            }}
          >
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, transform: `translateY(${scrollY.toFixed(2)}px)` }}>
              {DOC.map((l, i) => {
                const mk = l.mark !== undefined ? ramp(frame, T0[l.mark] - 6, 12, EASE.out) : 0;
                const st: React.CSSProperties =
                  l.kind === 'title' ? { ...type(52, 720), color: L.ink }
                  : l.kind === 'meta' ? { ...type(26, 500), color: L.ink3 }
                  : l.kind === 'h' ? { ...type(22, 700, { caps: true }), letterSpacing: '0.16em', color: L.ink3 }
                  : { ...type(30, 450), letterSpacing: '-0.01em', color: L.ink2 };
                return (
                  <div key={i} style={{ position: 'absolute', left: PAD, width: DW - 2 * PAD, top: l.y - l.h / 2, height: l.h, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                    {mk > 0 && (
                      <div style={{ position: 'absolute', left: -10, top: 6, bottom: 6, width: `calc(${(mk * 100).toFixed(1)}% + 20px)`, borderRadius: 8, background: alpha(L.accent, 0.12), borderLeft: `4px solid ${alpha(L.accent, 0.8)}` }} />
                    )}
                    <span style={{ position: 'relative', ...st, ...(mk > 0 ? { color: mixColor(mk, '#4c566e', '#1b3fd1'), fontWeight: 550 } : null) }}>{l.text}</span>
                    {l.kind === 'meta' && <div style={{ position: 'absolute', left: 0, right: 0, bottom: -12, height: 1, background: L.line }} />}
                  </div>
                );
              })}
            </div>
            {/* 扫描光带（裁在纸面圆角内） */}
            {scanOp > 0.001 && (
              <div style={{ position: 'absolute', left: 0, right: 0, top: scan * (DH + 120) - 120, height: 120, opacity: scanOp, pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${alpha(L.accent, 0)} 0%, ${alpha(L.accent, 0.1)} 85%, ${alpha(L.accent, 0.0)} 100%)` }} />
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 14, height: 2, background: `linear-gradient(90deg, transparent, ${alpha(L.accent, 0.55)} 20%, ${alpha(L.accent, 0.55)} 80%, transparent)`, boxShadow: `0 0 18px ${alpha(L.accent, 0.4)}` }} />
              </div>
            )}
            {/* 纸面上下渐隐：滚动的内容从边缘柔和进出 */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `linear-gradient(180deg, ${L.surface} 0%, ${alpha(L.surface, 0)} 7%, ${alpha(L.surface, 0)} 90%, ${L.surface} 100%)` }} />
          </div>
        </div>

        {/* 开场眉题（文档上方，驻留时退场） */}
        <div style={{ position: 'absolute', left: DOC_X, top: 44, display: 'flex', alignItems: 'center', gap: 14, opacity: kickA, ...type(24, 600, { mono: true }), letterSpacing: '0.16em', color: L.ink2 }}>
          <span style={{ width: 10, height: 10, borderRadius: 5, background: L.accent, boxShadow: `0 0 0 5px ${alpha(L.accent, 0.15)}` }} />
          ANALYZING · 12 SOURCES
        </div>

        {/* 右栏眉题 */}
        <div style={{ position: 'absolute', left: PX + 8, top: 108, display: 'flex', alignItems: 'center', gap: 14, opacity: kickB, transform: `translateY(${((1 - kickB) * 12).toFixed(2)}px)`, ...type(24, 600, { mono: true }), letterSpacing: '0.16em', color: L.ink3 }}>
          <span style={{ width: 10, height: 10, borderRadius: 5, background: L.accent2 }} />
          RECOMMENDED FOR NORTHWIND
        </div>

        {/* 依据连线：依据句尾（文档可见右缘内）→ 药丸左缘 */}
        <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}>
          {ITEMS.map((_, k) => {
            const f = T0[k];
            const draw = ramp(frame, f + 8, 12, EASE.out);
            const fade = k < 2 ? 1 - ramp(frame, T0[k + 1] - 10, 8, EASE.out) : 1;
            if (draw <= 0 || fade <= 0) return null;
            const line = DOC.find((l) => l.mark === k)!;
            const a = toScreen(DW - 40, line.y);
            const b = { x: PX - 6, y: PY[k] + PH / 2 };
            const mx = (a.x + b.x) / 2;
            return (
              <g key={k} opacity={fade}>
                <path d={`M${a.x.toFixed(1)},${a.y.toFixed(1)} C${mx.toFixed(1)},${a.y.toFixed(1)} ${mx.toFixed(1)},${b.y.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`}
                  fill="none" stroke={L.accent} strokeWidth={3} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={(1 - draw).toFixed(4)} />
                <circle cx={a.x} cy={a.y} r={7} fill={L.surface} stroke={L.accent} strokeWidth={3} opacity={clamp01(draw * 3)} />
              </g>
            );
          })}
        </svg>

        {/* 右栏：三张结论药丸 + 说明句 */}
        {ITEMS.map((it, k) => {
          const f = T0[k];
          const o = ramp(frame, f, 6, EASE.out);
          const b = ramp(frame, f, 14, EASE.overshoot);
          // 起点：依据句在屏幕上的位置附近（左侧、偏向那一行）
          const line = DOC.find((l) => l.mark === k)!;
          const src = toScreen(DW - 120, line.y);
          const ox = mix(src.x - PX - 200, 0, b);
          const oy = mix(src.y - (PY[k] + PH / 2), 0, b);
          const s = mix(0.72, 1, b);
          const lift = mix(30, 6, clamp01(b));
          // 速度 → 横向运动模糊
          const spd = Math.abs(ramp(frame + 0.5, f, 14, EASE.overshoot) - ramp(frame - 0.5, f, 14, EASE.overshoot)) * Math.hypot(src.x - PX - 200, src.y - PY[k]);
          const landed = ramp(frame, f + 10, 10, EASE.out);
          const capIn = ramp(frame, f + 12, 22, EASE.linear);
          const capOut = k < 2 ? ramp(frame, T0[k + 1] - 8, 8, EASE.exit) : 0;
          if (o <= 0) return null;
          return (
            <React.Fragment key={k}>
              <div
                style={{
                  position: 'absolute', left: PX, top: PY[k], width: PW, height: PH, borderRadius: PH / 2,
                  background: `linear-gradient(180deg, #ffffff 0%, ${L.surface2} 100%)`,
                  border: `1px solid ${L.line}`, boxSizing: 'border-box',
                  boxShadow: `inset 0 1px 0 #ffffff, ${softShadow(lift, { color: L.shadow, strength: 1 })}`,
                  display: 'flex', alignItems: 'center', gap: 30, padding: '0 22px 0 22px',
                  opacity: o, transform: `translate(${ox.toFixed(2)}px, ${oy.toFixed(2)}px) scale(${s.toFixed(4)})`, transformOrigin: '0% 50%',
                  filter: spd > 2 ? `blur(${Math.min(8, spd * 0.06).toFixed(2)}px)` : undefined,
                }}
              >
                <div
                  style={{
                    width: 84, height: 84, borderRadius: 42, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `linear-gradient(150deg, #4f78ff 0%, ${L.accent} 70%)`,
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.35), 0 8px 20px ${alpha(L.accent, 0.35)}`,
                  }}
                >
                  <Icon k={it.ic} size={44} color="#ffffff" />
                </div>
                <div style={{ ...type(54, 680), color: L.ink }}>{it.n}</div>
                <div style={{ flex: 1 }} />
                <div
                  style={{
                    height: 64, padding: '0 24px', borderRadius: 32, display: 'flex', alignItems: 'center', gap: 10,
                    background: alpha(L.accent2, 0.1), color: '#007a69', ...type(30, 650, { mono: true }),
                    opacity: landed, transform: `scale(${mix(0.85, 1, landed).toFixed(3)})`,
                  }}
                >
                  <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#00a08a" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.2 4.2L19 7" /></svg>
                  {it.pct}
                </div>
              </div>
              <Caption text={it.cap} innP={capIn} outP={capOut} style={{ left: PX + 36, top: PY[k] + PH + 22, ...type(44, 560), letterSpacing: '-0.02em' }} />
            </React.Fragment>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
