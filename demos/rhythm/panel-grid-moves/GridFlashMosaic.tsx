// grid-flash-mosaic —— 九宫格闪切：3×3 格按十六分音符逐格硬切亮相，填满停一拍，中心格放大吞掉全屏。
//
// 第二轮重设计（深蓝夜 · 九件工具一面墙）：
// - look = midnight（深蓝 · 电光蓝，青绿只做在线点 / 勾选这类点缀）。主体换成虚构工作台「Ninefold」：
//   8 个外围格 = 8 件工具（Threads / Search / Insights / Calendar / Code / Voice / Tasks / Vault），每格一个为镜头
//   设计的大图形（气泡、⌘K、柱状、月历、代码、声纹、勾选、锁）+ 44px 名称 + 一个数据——一眼读出"功能矩阵"。
//   中心格 = 品牌海报本身（3×3 方块字标 + 「Ninefold」）：九宫格墙 = 字标的九个方块，吞屏后语义闭环。
// - 硬入是命门：未到拍点不渲染、零淡入；每格落下那一帧 4f scale 1.12→1 + 一次白闪（亮场上的"啪"），
//   顺序打乱、每 2f 一格，中心格晚 2f 最后砸下（重拍）。填满后每格内的小图形各自动一下保活（柱子长、声纹跳、光标打字）。
// - 吞屏：3f 预备缩到 0.97 → 16f 强加速、尾段急刹地放大到 3.4（格子圆角同步收成直角，边框滑出画外）；外围 8 格同时
//   向外推开、缩小、压暗——给中心格让出纵深。吞屏完成后摘罩，海报按原生尺寸直出，标语逐词升起。
//
// 时间表（30fps，共 140f）：
//   0–12    空墙：深蓝舞台 + 9 个暗格槽位（第 1 帧就有画面，等待被点亮）
//   12–26   外围 8 格硬切亮相（每 2f 一格，乱序）
//   30      中心格最后砸下（白闪更强）
//   30–52   满墙停一拍：整墙 1.006 呼吸，格内图形各自动一下
//   52–71   吞屏：3f 预备 + 16f 强加速 / 尾段急刹放大
//   74–100  海报：标语 rise 逐词、副标 blur 入
//   100–140 hold：1.5% 极缓推近
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, bezier, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, glow, type } from '../../_fixtures/Look';

export const GRID_FLASH_MOSAIC_DURATION = 140;

const L = LOOKS.midnight;

// ───────────── 网格几何（16:9 格子，放大 3.333 恰好铺满）─────────────
const CW = 576;
const CH = 324;
const GAP = 16;
const GX = (1920 - (CW * 3 + GAP * 2)) / 2; // 80
const GY = (1080 - (CH * 3 + GAP * 2)) / 2; // 38
const MINI = CW / 1920; // 中心格里的海报缩放 0.3
const ZOOM = 3.4; // >3.333：边框完全滑出画外
const END_S = MINI * ZOOM; // 摘罩后海报的缩放 1.02

// ───────────── 时间 ─────────────
const FILL0 = 12;
const STEP = 2;
const ORDER = [2, 6, 0, 8, 3, 1, 7, 5]; // 外围格乱序
const CENTER_AT = FILL0 + ORDER.length * STEP + 2; // 30：中心格晚一拍
const Z0 = 52; // 预备起
const ZPRE = 3;
const ZDUR = 16;
const Z1 = Z0 + ZPRE + ZDUR; // 71
const TAG = 74;

const startOf = (i: number) => (i === 4 ? CENTER_AT : FILL0 + ORDER.indexOf(i) * STEP);

// 中心格缩放：预备 0.97 → 强加速、尾段急刹的不对称 in-out 放大到 ZOOM（满屏那一刻不带着全速硬停）
const ZOOM_EASE = bezier(0.75, 0, 0.22, 1);
const zoomAt = (f: number) => {
  const pre = ramp(f, Z0, ZPRE, EASE.out);
  const go = ramp(f, Z0 + ZPRE, ZDUR, ZOOM_EASE);
  return mix(1 - 0.03 * pre, ZOOM, go);
};

// ───────────── 外围 8 格的内容 ─────────────
type Tile = { kicker: string; name: string; stat: string };
const TILES: Record<number, Tile> = {
  0: { kicker: 'Chat', name: 'Threads', stat: '1.2k today' },
  1: { kicker: 'Find', name: 'Search', stat: '12 ms' },
  2: { kicker: 'Analytics', name: 'Insights', stat: '+38%' },
  3: { kicker: 'Plan', name: 'Calendar', stat: 'Fri 14' },
  5: { kicker: 'Build', name: 'Code', stat: 'main ✓' },
  6: { kicker: 'Meet', name: 'Voice', stat: '02:14' },
  7: { kicker: 'Do', name: 'Tasks', stat: '18 / 20' },
  8: { kicker: 'Secure', name: 'Vault', stat: 'SOC 2' },
};

// 每格的大图形（局部坐标，放在格子右上区域；a = 保活进度 0→1）
const Visual: React.FC<{ i: number; a: number; f: number }> = ({ i, a, f }) => {
  const box: React.CSSProperties = { position: 'absolute', right: 34, top: 34 };
  const blue = L.accent;
  if (i === 0) {
    return (
      <div style={{ ...box, width: 250, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-end' }}>
        <div style={{ padding: '12px 18px', borderRadius: '20px 20px 6px 20px', background: L.surface2, border: `1px solid ${L.line}`, ...type(24, 500), color: L.ink2 }}>Ship it Friday?</div>
        <div style={{ padding: '12px 18px', borderRadius: '20px 20px 20px 6px', background: blue, ...type(24, 600), color: L.onAccent, alignSelf: 'flex-start', transform: `translateY(${(1 - a) * 10}px)`, opacity: 0.4 + 0.6 * a }}>Merged ✓</div>
      </div>
    );
  }
  if (i === 1) {
    const q = 'roadmap q4';
    const n = Math.floor(ramp(f, CENTER_AT, 16, EASE.linear) * q.length);
    return (
      <div style={{ ...box, width: 300, height: 64, borderRadius: 16, background: L.surface2, border: `1px solid ${alpha(blue, 0.5)}`, boxShadow: `0 0 0 4px ${alpha(blue, 0.12)}`, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px' }}>
        <div style={{ ...type(22, 700, { mono: true }), color: L.ink2, padding: '4px 8px', borderRadius: 8, border: `1px solid ${L.line}` }}>⌘K</div>
        <div style={{ ...type(26, 500, { mono: true }), color: L.ink }}>{q.slice(0, n)}<span style={{ color: blue, opacity: Math.floor(f / 8) % 2 ? 1 : 0.2 }}>▍</span></div>
      </div>
    );
  }
  if (i === 2) {
    const hs = [0.35, 0.5, 0.42, 0.62, 0.55, 0.74, 0.68, 1];
    return (
      <div style={{ ...box, width: 260, height: 150, display: 'flex', alignItems: 'flex-end', gap: 10 }}>
        {hs.map((h, k) => (
          <div key={k} style={{ flex: 1, height: `${h * (0.55 + 0.45 * a) * 100}%`, borderRadius: 5, background: k === hs.length - 1 ? blue : alpha(L.ink, 0.16), boxShadow: k === hs.length - 1 ? `0 0 24px ${alpha(blue, 0.5)}` : undefined }} />
        ))}
      </div>
    );
  }
  if (i === 3) {
    return (
      <div style={{ ...box, display: 'grid', gridTemplateColumns: 'repeat(7, 30px)', gap: 7 }}>
        {Array.from({ length: 21 }, (_, k) => {
          const on = k === 11;
          return <div key={k} style={{ height: 30, borderRadius: 8, background: on ? blue : alpha(L.ink, k % 7 > 4 ? 0.05 : 0.1), ...type(16, 700), color: L.onAccent, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: on ? `scale(${1 + 0.15 * Math.sin(Math.PI * a)})` : undefined }}>{on ? '14' : ''}</div>;
        })}
      </div>
    );
  }
  if (i === 5) {
    const lines: Array<[string, string][]> = [
      [['const ', L.ink3], ['ship', blue], [' = ', L.ink3], ['await', L.accent2]],
      [['  deploy', L.ink], ['(', L.ink3], ["'prod'", '#f5b86b'], [')', L.ink3]],
      [['// ', L.ink3], ['all checks passed', L.ink3]],
    ];
    return (
      <div style={{ ...box, width: 300, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {lines.map((ln, k) => (
          <div key={k} style={{ ...type(22, 500, { mono: true }), whiteSpace: 'pre', opacity: k === 2 ? 0.3 + 0.7 * a : 1 }}>
            {ln.map(([t, c], j) => <span key={j} style={{ color: c }}>{t}</span>)}
          </div>
        ))}
      </div>
    );
  }
  if (i === 6) {
    return (
      <div style={{ ...box, width: 270, height: 110, display: 'flex', alignItems: 'center', gap: 6 }}>
        {Array.from({ length: 24 }, (_, k) => {
          const h = 0.25 + 0.75 * Math.abs(Math.sin(k * 0.9 + f * 0.22) * Math.cos(k * 0.37));
          return <div key={k} style={{ flex: 1, height: `${h * 100}%`, borderRadius: 4, background: k < 15 ? blue : alpha(L.ink, 0.18) }} />;
        })}
      </div>
    );
  }
  if (i === 7) {
    return (
      <div style={{ ...box, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {['Brief', 'Review', 'Launch'].map((t, k) => {
          const done = k < 2 || a > 0.6;
          return (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: done ? L.accent2 : 'transparent', border: `2px solid ${done ? L.accent2 : L.ink3}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {done && <svg width={18} height={18} viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" stroke={L.onAccent} strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </div>
              <div style={{ ...type(26, 500), color: done ? L.ink3 : L.ink, textDecoration: done ? 'line-through' : 'none', width: 120 }}>{t}</div>
            </div>
          );
        })}
      </div>
    );
  }
  // 8: Vault
  return (
    <svg width={150} height={150} viewBox="0 0 100 100" style={{ position: 'absolute', right: 60, top: 26 }}>
      <circle cx={50} cy={50} r={44} fill="none" stroke={alpha(blue, 0.25)} strokeWidth={2} strokeDasharray="3 5" transform={`rotate(${a * 60} 50 50)`} />
      <rect x={30} y={44} width={40} height={32} rx={7} fill={blue} />
      <path d="M38 44 V36 a12 12 0 0 1 24 0 V44" fill="none" stroke={L.ink} strokeWidth={5} strokeLinecap="round" />
      <circle cx={50} cy={60} r={4} fill={L.onAccent} />
    </svg>
  );
};

const ToolTile: React.FC<{ i: number; f: number }> = ({ i, f }) => {
  const t = TILES[i];
  const a = ramp(f, CENTER_AT + 2 + (i % 4) * 2, 18, EASE.swift); // 满墙后的保活小动作
  return (
    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, ${L.surface2} 0%, ${L.surface} 60%, #0c1222 100%)` }}>
      <div style={{ position: 'absolute', left: 34, top: 34, ...type(22, 700, { caps: true }), letterSpacing: '0.18em', color: L.ink3 }}>{t.kicker}</div>
      <div style={{ position: 'absolute', inset: 0, transform: 'scale(1.18)', transformOrigin: `${CW - 34}px 34px` }}>
        <Visual i={i} a={a} f={f} />
      </div>
      <div style={{ position: 'absolute', left: 34, right: 34, bottom: 30, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ ...type(48, 750), color: L.ink }}>{t.name}</div>
        <div style={{ ...type(30, 550), color: L.ink2 }}>{t.stat}</div>
      </div>
    </div>
  );
};

// ───────────── 海报（中心格 = 1920×1080 原生版式）─────────────
const Mark: React.FC<{ size: number; lit: number }> = ({ size, lit }) => {
  const g = size * 0.24;
  const s = (size - 2 * g) / 3;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      {Array.from({ length: 9 }, (_, k) => {
        const on = k === 4;
        return (
          <div key={k} style={{
            position: 'absolute', left: (k % 3) * (s + g), top: Math.floor(k / 3) * (s + g), width: s, height: s, borderRadius: s * 0.28,
            background: on ? L.accent : alpha(L.ink, 0.88), boxShadow: on ? `0 0 ${30 * lit}px ${alpha(L.accent, 0.8 * lit)}` : undefined,
          }} />
        );
      })}
    </div>
  );
};

const Poster: React.FC<{ f: number; live: boolean }> = ({ f, live }) => {
  const lit = 0.5 + 0.5 * ramp(f, Z1 - 4, 14, EASE.out);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.2 }} fill={{ x: 0.5, y: 1.05 }} horizon={0.8} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 214, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Mark size={184} lit={lit} />
        <div style={{ ...type(200, 820), color: L.ink, marginTop: 52, textShadow: glow(L.accent, 0.25) }}>Ninefold</div>
        <div style={{ ...type(62, 600), color: L.ink2, marginTop: 34, height: 74 }}>
          {live ? (
            <TextReveal text="Nine tools. One workspace." by="word" variant="rise" start={TAG} each={18} gap={4}
              unitStyle={(k) => (k >= 2 ? { color: L.ink } : {})} />
          ) : null}
        </div>
        <div style={{ ...type(30, 600, { caps: true }), letterSpacing: '0.26em', color: L.accent, marginTop: 40, opacity: live ? ramp(f, TAG + 16, 14, EASE.out) : 0 }}>
          Now in public beta
        </div>
      </div>
    </div>
  );
};

export const GridFlashMosaic: React.FC = () => {
  const f = useCurrentFrame();

  // ===== 摘罩：吞屏完成后海报原生直出（+ 极缓推近）=====
  if (f >= Z1) {
    const s = END_S * (1 + 0.015 * ramp(f, Z1, 69, EASE.smooth));
    return (
      <AbsoluteFill style={{ background: L.bg[2], overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transform: `scale(${s})`, transformOrigin: '960px 540px' }}>
          <Poster f={f} live />
        </div>
      </AbsoluteFill>
    );
  }

  const breath = f >= CENTER_AT && f < Z0 ? 1 + 0.006 * Math.sin((Math.PI * (f - CENTER_AT)) / (Z0 - CENTER_AT)) : 1;
  const zoom = zoomAt(f);
  const recede = ramp(f, Z0 + ZPRE, ZDUR, EASE.swift);

  return (
    <AbsoluteFill style={{ overflow: 'hidden', fontFamily: FONT.sans }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.45 }} fill={{ x: 0.85, y: 0.95 }} />
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${breath})`, transformOrigin: '960px 540px' }}>
        {Array.from({ length: 9 }, (_, i) => {
          const row = Math.floor(i / 3);
          const col = i % 3;
          const left = GX + col * (CW + GAP);
          const top = GY + row * (CH + GAP);
          const st = startOf(i);
          const center = i === 4;
          const on = f >= st;
          // 空槽：未亮的格子是一块极暗的凹槽（硬入前的"等待"）
          if (!on) {
            return <div key={i} style={{ position: 'absolute', left, top, width: CW, height: CH, borderRadius: 18, background: alpha('#000', 0.25), border: `1px solid ${alpha(L.ink, 0.05)}` }} />;
          }
          const pop = ramp(f, st, 4, EASE.snappy);
          const flash = 1 - ramp(f, st, center ? 5 : 3, EASE.out);
          // 外围格吞屏时向外推开、缩小、压暗
          const dx = (col - 1) * 90 * recede;
          const dy = (row - 1) * 60 * recede;
          const sc = center ? mix(1.16, 1, pop) * zoom : mix(1.12, 1, pop) * (1 - 0.08 * recede);
          const radius = center ? 18 * (1 - ramp(f, Z0 + ZPRE, ZDUR, EASE.linear)) : 18;
          return (
            <div key={i} style={{
              position: 'absolute', left, top, width: CW, height: CH, borderRadius: radius, overflow: 'hidden',
              transform: `translate(${dx}px, ${dy}px) scale(${sc.toFixed(4)})`, transformOrigin: 'center', zIndex: center ? 10 : 1,
              border: `1px solid ${center ? alpha(L.accent, 0.45) : L.line}`, boxSizing: 'border-box',
              boxShadow: center
                ? `0 0 0 1px ${alpha(L.accent, 0.2)}, 0 30px 80px -20px ${alpha(L.shadow, 0.9)}, 0 0 60px ${alpha(L.accent, 0.18)}`
                : `inset 0 1px 0 ${alpha(L.ink, 0.06)}, 0 18px 40px -18px ${alpha(L.shadow, 0.9)}`,
            }}>
              {center ? (
                <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transform: `scale(${MINI})`, transformOrigin: '0 0' }}>
                  <Poster f={f} live={false} />
                </div>
              ) : (
                <ToolTile i={i} f={f} />
              )}
              {!center && recede > 0 && <div style={{ position: 'absolute', inset: 0, background: L.bg[2], opacity: 0.7 * recede }} />}
              {flash > 0.01 && <div style={{ position: 'absolute', inset: 0, background: '#e8eeff', opacity: (center ? 0.8 : 0.6) * flash }} />}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
