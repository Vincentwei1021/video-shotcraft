// 拉远孤立收束（pull-back-isolation）——pull-back shot：从主卡特写后拉，周围逐层熄灭，孤卡悬在暗场中央。
//
// 第二轮重设计（graphite · 近单色暗场，白为强调，金色只点一处）：
// - 世界是一整面"控制室屏幕墙"：44 块深石墨小屏（迷你曲线 / 柱 / 环 / 数字 / 列表，纹理级小字）
//   排成 8×6 网格，正中 2×2 的位置是主卡「99.999%」。开场 2.4× 怼在主卡上，大数字占满画面。
// - 后拉：scale 2.4→0.62 / 118f，bezier(0.33,0,0.15,1)——起步柔、主体段快、尾段长长地减速落定。
//   按 2.4× 布局（CSS zoom）再缩小，开场特写字锐利（Q2）。
// - 熄灭：28f 起小屏按到主卡的距离由近到远一圈圈熄灭，起点按 EASE.out 错峰（越往外越密 = 塌暗在加速）；
//   每块先"屏幕内容断电"（6f），再整块沉入暗处（14f，opacity→0 + 下沉 0.96 + 压暗）。
//   环境光 = 仍亮着的屏幕占比：墙越灭，四周的屏幕光越弱；最后只剩主卡上方一束顶光。
// - 孤卡：70–112f 白色轮廓光 + 两层冷白光晕升起；落定后屏幕空间的结语逐词升起（56px）——
//   "Five nines. All year."，最后一帧是一张暗场海报。
//
// 时间表（30fps，共 168f）：
//   0–20    特写：主卡 99.999% 满画面（后拉已开始，起步柔）
//   0–118   后拉 2.4 → 0.62
//   28–104  小屏由近到远熄灭（加速塌暗）
//   70–112  主卡轮廓光 / 光晕；环境光收成顶光
//   116–140 结语逐词升起
//   140–168 hold（光晕极缓呼吸）
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, bezier, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, stagger, type } from '../../_fixtures/Look';

export const PULL_BACK_ISOLATION_DURATION = 168; // 118f 后拉 + 50f 孤悬

const L = LOOKS.graphite;
const Z = 2.4; // 相机布局倍率 = 起始特写倍率
const PULL = bezier(0.33, 0, 0.15, 1);
const TILE = { w: 340, h: 220, px: 380, py: 260 };
const HERO = { w: 720, h: 480 };

const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// 8×6 网格，正中 2×2 让给主卡
const COLS = [-1330, -950, -570, -190, 190, 570, 950, 1330];
const ROWS = [-650, -390, -130, 130, 390, 650];
const RAW = COLS.flatMap((x) => ROWS.map((y) => ({ x, y }))).filter((t) => !(Math.abs(t.x) < 300 && Math.abs(t.y) < 200));
const TILES = RAW.map((t, i) => ({ ...t, kind: Math.floor(hash(i * 3.3 + 1) * 5), seed: i, dist: Math.hypot(t.x, t.y * 1.3) }));
const ORDER = TILES.map((_, i) => i).sort((a, b) => TILES[a].dist - TILES[b].dist);
const OFF_AT: number[] = [];
ORDER.forEach((idx, rank) => {
  OFF_AT[idx] = 28 + stagger(rank, ORDER.length, 62, EASE.out) + hash(idx * 9.1) * 3;
});

// 小屏内容（纹理级）
const Mini: React.FC<{ kind: number; seed: number }> = ({ kind, seed }) => {
  const r = (k: number) => hash(seed * 17.3 + k);
  const ink = alpha(L.ink, 0.82);
  const dim = alpha(L.ink, 0.3);
  const head = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 8, height: 8, borderRadius: 4, background: dim }} />
      <div style={{ width: 80 + r(1) * 70, height: 9, borderRadius: 5, background: dim }} />
    </div>
  );
  let body: React.ReactNode = null;
  if (kind === 0) {
    const pts = Array.from({ length: 14 }, (_, j) => `${j ? 'L' : 'M'}${(j * 21).toFixed(0)} ${(80 - 20 * Math.sin(j * 0.7 + r(2) * 6) - r(j + 3) * 40).toFixed(1)}`).join(' ');
    body = <svg width={280} height={110} style={{ marginTop: 18 }}><path d={pts} fill="none" stroke={ink} strokeWidth={3} strokeLinejoin="round" /></svg>;
  } else if (kind === 1) {
    body = (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 110, marginTop: 18 }}>
        {Array.from({ length: 9 }, (_, j) => <div key={j} style={{ width: 20, height: 20 + r(j + 5) * 88, borderRadius: 4, background: j === 6 ? ink : dim }} />)}
      </div>
    );
  } else if (kind === 2) {
    const p = 0.35 + r(4) * 0.55;
    body = (
      <svg width={120} height={120} viewBox="0 0 120 120" style={{ marginTop: 12 }}>
        <circle cx={60} cy={60} r={46} fill="none" stroke={dim} strokeWidth={12} />
        <circle cx={60} cy={60} r={46} fill="none" stroke={ink} strokeWidth={12} strokeDasharray={`${(p * 289).toFixed(1)} 289`} transform="rotate(-90 60 60)" strokeLinecap="round" />
      </svg>
    );
  } else if (kind === 3) {
    body = (
      <div style={{ marginTop: 22 }}>
        <div style={{ ...type(72, 700), color: ink }}>{(1 + r(6) * 98).toFixed(1)}{r(7) > 0.5 ? 'k' : '%'}</div>
        <div style={{ width: 150, height: 9, borderRadius: 5, background: dim, marginTop: 16 }} />
      </div>
    );
  } else {
    body = (
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[0, 1, 2, 3].map((j) => (
          <div key={j} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: j === 0 ? ink : dim }} />
            <div style={{ width: 120 + r(j + 9) * 110, height: 8, borderRadius: 4, background: dim }} />
          </div>
        ))}
      </div>
    );
  }
  return <div style={{ padding: '22px 24px' }}>{head}{body}</div>;
};

// 52 周可用率条：全亮，只有一周带一点金（"那次 26 秒的抖动"）
const WEEKS = Array.from({ length: 52 }, (_, i) => (i === 31 ? 1 : 0));

const HeroCard: React.FC<{ rim: number }> = ({ rim }) => (
  <div style={{
    position: 'absolute', inset: 0, borderRadius: 30, boxSizing: 'border-box', padding: '40px 48px', overflow: 'hidden',
    background: `linear-gradient(180deg, #202226 0%, ${L.surface} 100%)`,
    border: `1.5px solid ${alpha('#ffffff', 0.1 + rim * 0.22)}`,
    boxShadow: `inset 0 1.5px 0 ${alpha('#ffffff', 0.12 + rim * 0.2)}`,
    display: 'flex', flexDirection: 'column', fontFamily: FONT.sans,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 12, height: 12, borderRadius: 6, background: L.accent2, boxShadow: `0 0 12px ${alpha(L.accent2, 0.8)}` }} />
      <div style={{ ...type(24, 650, { caps: true }), letterSpacing: '0.2em', color: L.ink2 }}>Uptime · last 365 days</div>
    </div>
    <div style={{ marginTop: 30, display: 'flex', alignItems: 'baseline', ...type(170, 700), letterSpacing: '-0.05em', color: L.ink }}>
      99.999<span style={{ fontSize: '0.42em', fontWeight: 500, color: L.ink2, marginLeft: '0.06em', letterSpacing: '-0.02em' }}>%</span>
    </div>
    <div style={{ marginTop: 'auto', display: 'flex', gap: 4, height: 44, alignItems: 'stretch' }}>
      {WEEKS.map((d, i) => (
        <div key={i} style={{ flex: 1, borderRadius: 3, background: d ? L.accent2 : alpha(L.ink, 0.78) }} />
      ))}
    </div>
    <div style={{ marginTop: 14, display: 'flex', ...type(22, 500), color: L.ink3 }}>
      <span>Oct 2025</span>
      <span style={{ marginLeft: 'auto' }}>Today</span>
    </div>
  </div>
);

export const PullBackIsolation: React.FC = () => {
  const frame = useCurrentFrame();

  const scale = mix(Z, 0.62, PULL(Math.min(1, frame / 118)));
  // 仍亮着的屏幕占比 → 环境光
  let lit = 0;
  const states = TILES.map((_, i) => {
    const content = ramp(frame, OFF_AT[i], 6, EASE.out);
    const body = ramp(frame, OFF_AT[i] + 3, 14, EASE.swift);
    lit += 1 - body;
    return { content, body };
  });
  const litFrac = lit / TILES.length;
  const rim = ramp(frame, 70, 42, EASE.smooth);
  const breathe = 1 + 0.06 * Math.sin(frame / 22) * ramp(frame, 120, 20, EASE.smooth);

  return (
    <AbsoluteFill style={{ overflow: 'hidden', fontFamily: FONT.sans }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.0 }} fill={null} intensity={mix(0.6, 0.35, rim)}>
        {/* 屏幕墙的环境光：随亮屏占比衰减 */}
        <AbsoluteFill style={{
          background: `radial-gradient(ellipse 80% 75% at 50% 50%, ${alpha('#c8d0e0', 0.16 * litFrac)} 0%, ${alpha('#c8d0e0', 0)} 75%)`,
        }} />
        {/* 孤卡的顶光：一束收窄的光锥落在主卡上（随轮廓光一起亮起） */}
        <AbsoluteFill style={{
          opacity: rim,
          background:
            `radial-gradient(ellipse 22% 34% at 50% 50%, ${alpha('#dfe4ee', 0.2)} 0%, ${alpha('#dfe4ee', 0)} 100%),` +
            `linear-gradient(180deg, ${alpha('#dfe4ee', 0.1)} 0%, ${alpha('#dfe4ee', 0)} 46%)`,
          WebkitMaskImage: 'radial-gradient(ellipse 30% 70% at 50% 20%, #000 0%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 30% 70% at 50% 20%, #000 0%, transparent 100%)',
        }} />
      </Stage>

      {/* 相机：按 Z 倍布局，以主卡中心（画面中心）为原点 scale(scale/Z) */}
      <div style={{
        position: 'absolute', left: 0, top: 0, width: 1920 * Z, height: 1080 * Z,
        transformOrigin: `${960 * Z}px ${540 * Z}px`,
        transform: `translate(${960 - 960 * Z}px, ${540 - 540 * Z}px) scale(${(scale / Z).toFixed(5)})`,
      }}>
        <div style={{ position: 'relative', width: 1920, height: 1080, zoom: Z }}>
          {TILES.map((t, i) => {
            const { content, body } = states[i];
            if (body >= 1) return null;
            return (
              <div key={i} style={{
                position: 'absolute', left: 960 + t.x - TILE.w / 2, top: 540 + t.y - TILE.h / 2, width: TILE.w, height: TILE.h,
                borderRadius: 20, overflow: 'hidden', boxSizing: 'border-box',
                background: `linear-gradient(180deg, ${L.surface2} 0%, ${L.surface} 100%)`,
                border: `1px solid ${alpha('#ffffff', 0.08)}`,
                opacity: 1 - body,
                transform: `translateY(${(body * 10).toFixed(2)}px) scale(${mix(1, 0.96, body).toFixed(4)})`,
                filter: body > 0.001 ? `brightness(${mix(1, 0.35, body).toFixed(3)})` : undefined,
              }}>
                <div style={{ opacity: 1 - content * 0.85 }}><Mini kind={t.kind} seed={t.seed} /></div>
              </div>
            );
          })}

          {/* 主卡：光晕在卡外层，轮廓光在卡内 */}
          <div style={{
            position: 'absolute', left: 960 - HERO.w / 2, top: 540 - HERO.h / 2, width: HERO.w, height: HERO.h, borderRadius: 30,
            boxShadow:
              `0 30px 80px -20px rgba(0,0,0,0.7), ` +
              `0 0 ${(60 * breathe).toFixed(1)}px ${alpha('#e8ecf5', 0.22 * rim)}, 0 0 ${(200 * breathe).toFixed(1)}px ${alpha('#aab4cc', 0.16 * rim)}`,
          }}>
            <HeroCard rim={rim} />
          </div>
        </div>
      </div>

      {/* 结语：屏幕空间，不随相机缩放 */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 772, textAlign: 'center', ...type(56, 650), color: L.ink }}>
        <TextReveal text="Five nines. All year." by="word" variant="blur" start={116} each={18} gap={4} />
      </div>
    </AbsoluteFill>
  );
};
