// doc-park-left-pill-deal — Doc Park 文档靠左 + 结论慢发牌（motion-lab 定稿转原生 Remotion）
// 扫描结束文档不淡出，而是向左滑出只露约 35% 宽并微缩到 0.92；右侧按旁白节奏
// 慢速发牌三张白底描边药丸（outBack 弹入），每张落定后其下方走逐词加深字幕、
// 下一张到来前整句淡出；左侧文档全程做极缓慢自动滚动保持"正在被读"。
// 设计坐标 480×270（DesignStage 等比放大），440×240 定尺画布居中排版。
// 质感层（改版）：文档从骨架条换成出版级 video-shotcraft「宣传片简报」正文（标题 / 元信息 / 分节正文），
// 右侧三张药丸是 agent 据此推荐的三张镜头配方卡（Crash Zoom / Deck Deal / Logo Sting）；
// 自动滚动改为连续匀速（原取模写法每 1/3 片长整页回跳 40px）；每张药丸落定时，文档里对应的
// 依据句被荧光笔划出，并有一条强调色细线从该句连到药丸（"结论从文档里长出来"），随字幕退场；
// 药丸换成受光白面 + 发丝线 + 两层软阴影 + 强调色图标底；柔光浅底 + 颗粒。
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';
import { Backdrop, EASE, FONT, softShadow } from '../../_fixtures/Polish';

export const DOC_PARK_LEFT_PILL_DEAL_DURATION = 174; // 5800ms @30fps

// ---- 本卡共享量（浅灰瑞士极简系配色，与 Phase 0 fixture 令牌协调） ----
const SANS = FONT.sans;
const TXT = '#17181c'; // 正文近黑（带冷调）
const DIM = '#c4c6cc'; // 浅灰占位字
const INK2 = '#5d5f66';
const INK3 = '#9b9da3';
const LINE = 'rgba(20,22,28,0.09)'; // 发丝描边
const ACCENT = '#5b63d3';

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const h2r = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// 颜色插值：mix(p,'#C9C9CE','#111')
const mix = (p: number, a: string, b: string) => {
  const A = h2r(a), B = h2r(b), q = clamp01(p);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * q)},${Math.round(A[1] + (B[1] - A[1]) * q)},${Math.round(A[2] + (B[2] - A[2]) * q)})`;
};

// 简易线性占位图标（纯 SVG，零依赖），强调色描边
// zoom = 推镜取景角标、deck = 一摞卡、sting = 星芒（片尾 logo 一击）
const Icon: React.FC<{ k: 'zoom' | 'deck' | 'sting'; size: number }> = ({ k, size }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={ACCENT} strokeWidth={1.35} strokeLinecap="round" strokeLinejoin="round">
    {k === 'zoom' && (
      <>
        <path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" />
        <circle cx={8} cy={8} r={1.6} />
      </>
    )}
    {k === 'deck' && (
      <>
        <rect x={4.5} y={2.5} width={9} height={7} rx={1.4} />
        <path d="M2.5 6.2v5.9c0 .8.6 1.4 1.4 1.4h7.4" />
      </>
    )}
    {k === 'sting' && (
      <>
        <path d="M8 2.2 9.3 6.7 13.8 8 9.3 9.3 8 13.8 6.7 9.3 2.2 8 6.7 6.7Z" />
      </>
    )}
  </svg>
);

// 逐词加深字幕（本系列统一语法）：浅灰占位 → 逐词加深到黑 → 逐词淡回浅灰 → 整行归零
// innP: 入场加深进度；outP: 出场进度（>0 时覆盖颜色与整行透明）；showV: 行基础透明
const Caption: React.FC<{
  text: string;
  left: number;
  top: number;
  size: number;
  showV: number;
  innP: number;
  outP: number;
}> = ({ text, left, top, size, showV, innP, outP }) => {
  const words = text.split(' ');
  const n = words.length;
  const st = 0.78 / n, win = st * 1.5; // 入场逐词交错
  const stw = 0.55 / n;                // 出场逐词交错
  const rowOpacity = outP > 0 ? clamp01(1 - (outP - 0.7) / 0.3) : showV;
  return (
    <div
      style={{
        position: 'absolute',
        display: 'flex',
        alignItems: 'baseline',
        whiteSpace: 'nowrap',
        left,
        top,
        opacity: rowOpacity,
      }}
    >
      {words.map((w, i) => {
        const q = clamp01((innP - i * st) / win);
        let color = mix(q, DIM, TXT);
        if (outP > 0) {
          const p = clamp01((outP - i * stw) / (stw * 1.4));
          color = mix(1 - p, DIM, TXT);
        }
        return (
          <span
            key={i}
            style={{
              font: `600 ${size}px/1.25 ${SANS}`,
              color,
              letterSpacing: (-0.03 * (1 - q)).toFixed(4) + 'em',
              marginRight: i === n - 1 ? 0 : 4.5,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

// ---- 文档：出版级客户档案（内容坐标，宽 DW；只露右侧约 35%，行尾要铺满） ----
const DW = 250, DH = 190;
type Line = { y: number; kind: 'title' | 'meta' | 'h' | 'p'; text: string; mark?: number };
const DOC: Line[] = [
  { y: 17, kind: 'title', text: 'Launch film brief · video-shotcraft' },
  { y: 30, kind: 'meta', text: 'Prepared by the Shotcraft agent  ·  Oct 2  ·  12 captures' },
  { y: 53, kind: 'h', text: 'PRODUCT' },
  { y: 63, kind: 'p', text: 'Agent skill for Claude Code and Codex, rendered with Remotion.' },
  { y: 73, kind: 'p', text: 'Takes a frontend repo, real page captures and a one-line prompt.' },
  { y: 83, kind: 'p', text: 'Ships a 1080p promo with beat-synced cuts and film-grade SFX.' },
  { y: 97, kind: 'h', text: 'OPENER' },
  { y: 107, kind: 'p', text: 'Wants a bold opener that hits the hero number on the first beat.', mark: 0 },
  { y: 117, kind: 'p', text: 'Asked twice for camera moves instead of static slide transitions.' },
  { y: 127, kind: 'p', text: 'The hook has to read in two seconds on a muted autoplay feed.' },
  { y: 141, kind: 'h', text: 'MIDDLE' },
  { y: 151, kind: 'p', text: 'The shot recipe library is the proof point viewers remember.', mark: 1 },
  { y: 161, kind: 'p', text: 'Cards should pour in fast enough to feel like a full catalogue.' },
  { y: 171, kind: 'p', text: 'Keep the 2.5D camera moving; no frame should sit dead for long.' },
  { y: 185, kind: 'h', text: 'ENDING' },
  { y: 195, kind: 'p', text: 'Every cut should resolve on the Frame Chisel mark at the close.', mark: 2 },
  { y: 205, kind: 'p', text: 'Hold the final lockup for a full second before the music tails.' },
  { y: 215, kind: 'p', text: 'The wordmark stays lowercase; amber is the only accent colour.' },
  { y: 229, kind: 'h', text: 'AUDIO' },
  { y: 239, kind: 'p', text: 'Track runs at 120 bpm; cuts snap to the downbeat of each bar.' },
  { y: 249, kind: 'p', text: 'A whoosh on every camera move, one heavy hit on the logo sting.' },
  { y: 259, kind: 'p', text: 'Voiceover optional; on-screen captions carry the story on mute.' },
  { y: 273, kind: 'h', text: 'NEXT STEPS' },
  { y: 283, kind: 'p', text: 'Render the crash zoom, deck deal and logo sting as a first cut.' },
  { y: 293, kind: 'p', text: 'Open the workbench to tune timing and swap shots beat by beat.' },
  { y: 303, kind: 'p', text: 'Export a JianYing draft for the final pass with the team.' },
];
// 自动滚动总行程（设计 px）：等于原 3 周期 × 40 的速度（≈0.7px/f），改为连续匀速、不回跳
const SCROLL = 120;
// 文档内容坐标 → 画布坐标（与文档窗格 transform 同一套：left 34 / top 25 / origin 左缘中点）
const DOC_LEFT = 34, DOC_TOP = (240 - DH) / 2;

const ITEMS: { n: string; ic: 'zoom' | 'deck' | 'sting'; cap: string }[] = [
  { n: 'Crash Zoom', ic: 'zoom', cap: 'Zoom lands the hero number' },
  { n: 'Deck Deal', ic: 'deck', cap: 'Deal shows off the shot library' },
  { n: 'Logo Sting', ic: 'sting', cap: 'Sting ends on the brand mark' },
];
const PX = 214, PY = 54, PH = 34, PG = 14;
const T0 = [0.26, 0.48, 0.70]; // 三张药丸的发牌起点

export const DocParkLeftPillDeal: React.FC = () => {
  const t = useT();
  // 文档靠左驻留：滑出只露约 35% 宽 + 微缩 0.92
  const park = seg(t, 0.06, 0.24, E.inOutCubic);
  const tx = lerp(park, 0, -0.55 * DW);
  const sc = lerp(park, 1, 0.92);
  // 极缓慢自动滚动：连续匀速（不取模，避免整页回跳）
  const scrollY = -t * SCROLL;
  const toCanvas = (xd: number, yd: number) => ({
    x: DOC_LEFT + tx + sc * xd,
    y: DOC_TOP + DH / 2 + sc * (yd - DH / 2),
  });

  return (
    <AbsoluteFill>
      <Backdrop tone="light" light={{ x: 0.6, y: 0.24 }} accent={ACCENT} grain={0.05} vignette={0.12} />
      <DesignStage bg="transparent">
        {/* 页面 + 440×240 定尺画布（居中） */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            fontFamily: SANS,
            WebkitFontSmoothing: 'antialiased',
          }}
        >
          <div style={{ position: 'absolute', left: '50%', top: '50%', width: 440, height: 240, margin: '-120px 0 0 -220px' }}>
            {/* 左侧文档窗格：靠左驻留 + 微缩，origin 钉在左缘中点 */}
            <div
              style={{
                position: 'absolute',
                left: DOC_LEFT,
                top: DOC_TOP,
                width: DW,
                height: DH,
                transformOrigin: '0% 50%',
                transform: `translateX(${tx.toFixed(2)}px) scale(${sc.toFixed(4)})`,
              }}
            >
              {/* 文档卡：白面 + 发丝线 + 内高光 + 两层软阴影 */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: DW,
                  height: DH,
                  background: '#fff',
                  border: `0.5px solid ${LINE}`,
                  borderRadius: 10,
                  boxShadow: `inset 0 0.5px 0 rgba(255,255,255,1), ${softShadow(6, { strength: 0.7 })}`,
                  overflow: 'hidden',
                }}
              >
                <div style={{ position: 'absolute', left: 0, top: 0, right: 0, height: 330, transform: `translateY(${scrollY.toFixed(2)}px)` }}>
                  <div style={{ position: 'absolute', left: 14, right: 14, top: 41.5, height: 0.5, background: LINE }} />
                  {DOC.map((l, i) => {
                    const st: React.CSSProperties =
                      l.kind === 'title'
                        ? { fontSize: 8.6, fontWeight: 650, color: TXT, letterSpacing: '-0.015em' }
                        : l.kind === 'meta'
                          ? { fontSize: 5.4, fontWeight: 500, color: INK3, letterSpacing: '0.01em' }
                          : l.kind === 'h'
                            ? { fontSize: 5, fontWeight: 650, color: INK3, letterSpacing: '0.1em' }
                            : { fontSize: 6.3, fontWeight: 450, color: INK2, letterSpacing: '0' };
                    // 依据句荧光笔：对应药丸落定后自左向右划出
                    const mk = l.mark !== undefined ? seg(t, T0[l.mark] + 0.06, T0[l.mark] + 0.13, EASE.out) : 0;
                    return (
                      <div key={i} style={{ position: 'absolute', left: 14, width: DW - 28, top: l.y - 5, height: 10, lineHeight: '10px', whiteSpace: 'nowrap', ...st }}>
                        {mk > 0 && (
                          <div
                            style={{
                              position: 'absolute',
                              left: -2,
                              top: 1.2,
                              height: 7.6,
                              width: `calc(${(mk * 100).toFixed(1)}% + 4px)`,
                              borderRadius: 2,
                              background: 'rgba(91,99,211,0.14)',
                            }}
                          />
                        )}
                        <span style={{ position: 'relative', color: mk > 0 ? mix(mk, '#5d5f66', '#2c3190') : undefined }}>{l.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 依据连线：文档依据句右端 → 药丸左缘，药丸落定后 draw-on，随字幕退场淡出 */}
            <svg width={440} height={240} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
              {ITEMS.map((_, k) => {
                const f = T0[k];
                const ce = k < 2 ? T0[k + 1] - 0.03 : 0.98;
                const draw = seg(t, f + 0.04, f + 0.11, EASE.out);
                const fade = 1 - seg(t, ce - 0.06, ce - 0.01, EASE.out);
                if (draw <= 0 || fade <= 0) return null;
                const line = DOC.find((l) => l.mark === k)!;
                const a = toCanvas(DW - 6, line.y + scrollY);
                const b = { x: PX - 3, y: PY + k * (PH + PG) + PH / 2 };
                const mx = (a.x + b.x) / 2;
                return (
                  <g key={k} opacity={(0.9 * fade).toFixed(3)}>
                    <path
                      d={`M${a.x.toFixed(2)},${a.y.toFixed(2)} C${mx.toFixed(2)},${a.y.toFixed(2)} ${mx.toFixed(2)},${b.y.toFixed(2)} ${b.x.toFixed(2)},${b.y.toFixed(2)}`}
                      fill="none"
                      stroke={ACCENT}
                      strokeWidth={0.75}
                      strokeLinecap="round"
                      pathLength={1}
                      strokeDasharray="1 1"
                      strokeDashoffset={(1 - draw).toFixed(4)}
                    />
                    <circle cx={a.x} cy={a.y} r={1.6} fill={ACCENT} opacity={Math.min(1, draw * 3)} />
                  </g>
                );
              })}
            </svg>

            {/* 右侧三张药丸 + 逐词字幕，按 T0 节奏慢发牌 */}
            {ITEMS.map((it, k) => {
              const f = T0[k];
              const o = seg(t, f, f + 0.035, E.outQuad);
              const b = seg(t, f, f + 0.062, E.outBack);
              // 字幕：落定 +3 帧起加深，下一张入场前淡出
              const cs = f + 0.05, ce = k < 2 ? T0[k + 1] - 0.03 : 0.98;
              const showV = seg(t, cs, cs + 0.02);
              const innP = seg(t, cs, cs + (ce - cs) * 0.7);
              const outP = seg(t, ce - 0.05, ce, E.outQuad);
              // 落定前阴影更高更虚（飞入感），落定后收成静置阴影
              const lift = lerp(clamp01(b), 14, 4);
              return (
                <React.Fragment key={k}>
                  <div
                    style={{
                      position: 'absolute',
                      left: PX,
                      top: PY + k * (PH + PG),
                      width: 172,
                      height: PH,
                      borderRadius: PH / 2,
                      background: 'linear-gradient(180deg, #ffffff 0%, #fbfbfa 100%)',
                      border: `0.5px solid ${LINE}`,
                      boxSizing: 'border-box',
                      boxShadow: `inset 0 0.5px 0 rgba(255,255,255,1), ${softShadow(lift, { strength: 0.75 })}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '0 12px 0 7px',
                      opacity: o,
                      transform: `translateY(${lerp(b, 14, 0).toFixed(2)}px) scale(${lerp(b, 0.94, 1).toFixed(4)})`,
                    }}
                  >
                    <div
                      style={{
                        width: 21,
                        height: 21,
                        borderRadius: 11,
                        background: 'rgba(91,99,211,0.10)',
                        border: '0.5px solid rgba(91,99,211,0.16)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: 'none',
                      }}
                    >
                      <Icon k={it.ic} size={12} />
                    </div>
                    <div style={{ font: `600 12.5px/1 ${SANS}`, color: TXT, letterSpacing: '-.012em' }}>{it.n}</div>
                    <div style={{ flex: 1 }} />
                    <div style={{ font: `500 8px/1 ${SANS}`, color: INK3, letterSpacing: '0.02em', fontVariantNumeric: 'tabular-nums' }}>
                      {['92%', '88%', '95%'][k]}
                    </div>
                  </div>
                  <Caption
                    text={it.cap}
                    left={PX + 4}
                    top={PY + k * (PH + PG) + PH + 7}
                    size={11}
                    showV={showV}
                    innP={innP}
                    outP={outP}
                  />
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </DesignStage>
    </AbsoluteFill>
  );
};
