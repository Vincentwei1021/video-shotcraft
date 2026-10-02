import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, bezier, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, type } from '../../_fixtures/Look';

// grid-wave-flip〔入场退场〕：3×3 卡墙沿对角线波前依次 rotateX 原位翻转 180°，背面翻成正面内容卡；
// 波浪约一秒扫完全屏，只有最后一张落定带一次过冲。
//
// 第二轮重设计（瓷白 · 翻牌广告墙）：
// - look = porcelain（冷白 · 钴蓝）。九张背面不再是灰块：它们拼成一整块钴蓝"广告牌"海报——
//   三行 280px 粗黑体「Plan. / Build. / Ship.」左中右错落、跨格排布，被格缝切开（翻牌墙的味道）；
//   第 1 帧就是一张完整海报。每张背面只渲染海报里属于自己的那一块（同一张海报按格位偏移裁切）。
// - 正面是虚构产品「Oriel」的九个功能卡，按海报三行分组（PLAN / BUILD / SHIP）：
//   64px 钴蓝图标块 + 50px 标题 + 32px 一句话，白瓷卡面 + 内高光 + 两层软阴影；墙心 Build·02 是钴蓝实底主角卡
//   （收尾海报的视觉重心，接住背面海报的颜色）。翻完 = 海报的承诺兑现成功能。
// - 预备：12–28f 一道斜向柔光沿对角线扫过海报（与即将到来的波前同向，提示方向；Q4：整面海报只这一次）。
// - 翻转：每张 16f，曲线 bezier(0.5,-0.22,0.3,1)——先向后微仰 ~6°（预备）再翻过去；对角波前 (row+col)×6f；
//   尾张冲到 192° 再 10f 弹回 180°（全墙唯一过冲）。按角度显式只画朝外那面，cos 压暗 + 90° 最薄处一道高光线；
//   每格地面影随 sin(角度) 抬起变大变虚再收回。整墙共用一个消失点（perspectiveOrigin 换算到墙心）。
//
// 时间表（30fps，共 130f）：
//   0–12    海报 hold（第 1 帧即完整画面）
//   12–28   斜向柔光扫过海报（预备，提示波前方向）
//   24–64   对角波前：首张 24f 起，五条对角线各隔 6f，每张 16f
//   64–74   尾张过冲 192° → 180° 回落
//   0–110   整墙极缓推进 1.000 → 1.025（smooth），110–130 静止收尾
export const GRID_WAVE_FLIP_DURATION = 130;

const L = LOOKS.porcelain;
const COLS = 3;
const ROWS = 3;
const CELL_W = 520;
const CELL_H = 272;
const GAP = 28;
const R = 22; // 圆角
const WAVE0 = 24; // 首张起翻
const STAGGER = 6; // 对角线波前步进
const FLIP = 16; // 单张翻转
const WALL_W = COLS * CELL_W + (COLS - 1) * GAP; // 1616
const WALL_H = ROWS * CELL_H + (ROWS - 1) * GAP; // 872
const WALL_X = (1920 - WALL_W) / 2;
const WALL_Y = (1080 - WALL_H) / 2;

const flipEase = bezier(0.5, -0.22, 0.3, 1); // 先微仰再翻：预备 + 强 ease-out 落座

// 单张卡的翻转角度：普通卡 0→180；尾张（波前最末）冲到 192 再回落 180
const angleAt = (frame: number, row: number, col: number): number => {
  const delay = WAVE0 + (row + col) * STAGGER;
  const isLast = row === ROWS - 1 && col === COLS - 1;
  if (!isLast) return 180 * ramp(frame, delay, FLIP, flipEase);
  const main = 192 * ramp(frame, delay, FLIP, flipEase);
  const settle = -12 * ramp(frame, delay + FLIP, 10, EASE.swift);
  return main + settle;
};

// ───────────── 背面：一整张钴蓝海报，按格位裁切 ─────────────
const POSTER_WORDS = [
  { txt: 'Plan.', align: 'left' as const, x: 54 },
  { txt: 'Build.', align: 'center' as const, x: 0 },
  { txt: 'Ship.', align: 'right' as const, x: 54 },
];
const Poster: React.FC<{ sweep: number }> = ({ sweep }) => {
  // 斜向柔光的带心位置（沿 135° 对角，-0.3 → 1.3）
  const p = mix(-0.35, 1.35, sweep);
  return (
    <div style={{
      position: 'absolute', left: 0, top: 0, width: WALL_W, height: WALL_H,
      background: `radial-gradient(ellipse 60% 70% at 22% 10%, #4f78ff 0%, rgba(79,120,255,0) 70%), linear-gradient(135deg, #2f5bff 0%, #2148e6 45%, #1532b8 100%)`,
    }}>
      {/* 细网格（海报底纹） */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.22,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)',
        backgroundSize: '68px 68px', backgroundPosition: '-1px -1px',
      }} />
      {POSTER_WORDS.map((w, r) => (
        <div key={r} style={{
          position: 'absolute', top: r * (CELL_H + GAP) + CELL_H / 2 - 150, height: 300,
          left: w.align === 'right' ? undefined : w.align === 'left' ? w.x : 0,
          right: w.align === 'right' ? w.x : w.align === 'center' ? 0 : undefined,
          textAlign: w.align, ...type(290, 820), lineHeight: '300px', color: '#ffffff', whiteSpace: 'nowrap',
          textShadow: '0 6px 24px rgba(8,20,90,0.35)',
        }}>{w.txt}</div>
      ))}
      {/* 行号小字（纹理） */}
      {['01 — PLAN', '02 — BUILD', '03 — SHIP'].map((t, r) => (
        <div key={t} style={{
          position: 'absolute', top: r * (CELL_H + GAP) + 26, [r === 2 ? 'left' : 'right']: 30,
          ...type(22, 700, { caps: true }), letterSpacing: '0.2em', color: 'rgba(255,255,255,0.62)',
        }}>{t}</div>
      ))}
      <div style={{ position: 'absolute', left: 30, bottom: 26, ...type(22, 700, { caps: true }), letterSpacing: '0.2em', color: 'rgba(255,255,255,0.62)' }}>Oriel</div>
      {/* 预备扫光：沿对角线，与波前同向 */}
      {sweep > 0 && sweep < 1 && (
        <div style={{
          position: 'absolute', inset: 0, mixBlendMode: 'screen',
          background: `linear-gradient(135deg, transparent ${((p - 0.16) * 100).toFixed(2)}%, rgba(170,200,255,0.42) ${(p * 100).toFixed(2)}%, transparent ${((p + 0.16) * 100).toFixed(2)}%)`,
        }} />
      )}
    </div>
  );
};

const CardBack: React.FC<{ row: number; col: number; sweep: number }> = ({ row, col, sweep }) => (
  <div style={{ position: 'absolute', inset: 0, borderRadius: R, overflow: 'hidden', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)' }}>
    <div style={{ position: 'absolute', left: -col * (CELL_W + GAP), top: -row * (CELL_H + GAP) }}>
      <Poster sweep={sweep} />
    </div>
    <div style={{ position: 'absolute', inset: 0, borderRadius: R, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), inset 0 0 0 1px rgba(255,255,255,0.08)' }} />
  </div>
);

// ───────────── 正面：Oriel 九个功能 ─────────────
const GROUP = ['Plan', 'Build', 'Ship'];
const FEATURES: { title: string; line: string; icon: string }[] = [
  { title: 'Roadmaps', line: 'Every quarter on one page', icon: 'M4 6h10M4 12h16M4 18h7' },
  { title: 'Specs', line: 'Docs that link to code', icon: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6' },
  { title: 'Triage', line: 'Bugs sorted before standup', icon: 'M4 5h16l-6 8v6l-4-2v-4z' },
  { title: 'Branches', line: 'One click from issue to PR', icon: 'M6 3v12M18 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM18 9c0 6-12 3-12 9' },
  { title: 'Reviews', line: 'Diffs with the full context', icon: 'M4 5h16v11H9l-5 4zM9 10h6' },
  { title: 'Checks', line: 'CI results, explained', icon: 'M5 12l4 4 10-10' },
  { title: 'Releases', line: 'Ship on a schedule', icon: 'M12 3l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6L3 10l6-1z' },
  { title: 'Changelog', line: 'Notes write themselves', icon: 'M5 4h14v16H5zM9 8h6M9 12h6M9 16h3' },
  { title: 'Insights', line: 'See what customers use', icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
];

const HERO = 4; // 墙心那张（Build · 02）做钴蓝实底主角卡：收尾海报的视觉重心，也接住背面海报的颜色
const CardFront: React.FC<{ i: number }> = ({ i }) => {
  const f = FEATURES[i];
  const row = Math.floor(i / COLS);
  const hero = i === HERO;
  return (
    <div style={{
      position: 'absolute', inset: 0, borderRadius: R, overflow: 'hidden', boxSizing: 'border-box', padding: '34px 38px',
      background: hero
        ? `radial-gradient(ellipse 70% 90% at 15% 0%, #5a80ff 0%, rgba(90,128,255,0) 70%), linear-gradient(150deg, #2f5bff 0%, #1d3fd6 100%)`
        : `linear-gradient(180deg, #ffffff 0%, #f7f9fd 100%)`,
      boxShadow: hero
        ? `inset 0 1px 0 rgba(255,255,255,0.4), inset 0 0 0 1px rgba(255,255,255,0.1)`
        : `inset 0 1px 0 rgba(255,255,255,1), inset 0 0 0 1px ${L.line}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18, display: 'grid', placeItems: 'center',
          background: hero ? '#ffffff' : `linear-gradient(160deg, #4d74ff 0%, ${L.accent} 55%, #1f43d8 100%)`,
          boxShadow: hero ? '0 8px 20px -8px rgba(5,15,70,0.6)' : `inset 0 1px 0 rgba(255,255,255,0.4), 0 8px 18px -8px ${alpha(L.accent, 0.7)}`,
        }}>
          <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={hero ? L.accent : '#ffffff'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={f.icon} /></svg>
        </div>
        {hero && (
          <div style={{ marginLeft: 16, ...type(22, 750, { caps: true }), letterSpacing: '0.14em', color: L.accent, background: '#ffffff', padding: '8px 14px', borderRadius: 99 }}>New</div>
        )}
        <div style={{ marginLeft: 'auto', ...type(22, 700, { caps: true }), letterSpacing: '0.18em', color: hero ? '#ffffff' : L.accent }}>
          {GROUP[row]} <span style={{ color: hero ? 'rgba(255,255,255,0.6)' : L.ink3 }}>· 0{(i % COLS) + 1}</span>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 38, bottom: 86, ...type(50, 720), color: hero ? '#ffffff' : L.ink }}>{f.title}</div>
      <div style={{ position: 'absolute', left: 38, bottom: 36, ...type(32, 480), color: hero ? 'rgba(235,241,255,0.86)' : L.ink2 }}>{f.line}</div>
    </div>
  );
};

export const GridWaveFlip: React.FC = () => {
  const frame = useCurrentFrame();
  const sweep = ramp(frame, 12, 16, EASE.swift);
  const cam = 1 + 0.025 * ramp(frame, 0, 110, EASE.smooth);
  const done = ramp(frame, 60, 24, EASE.out); // 全部翻完后舞台主光略升

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.3, y: 0.0 }} fill={{ x: 0.85, y: 0.95 }} intensity={0.9 + 0.1 * done} />
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${cam.toFixed(5)})`, transformOrigin: '960px 540px' }}>
        {/* 地面影层（不随卡旋转）：翻转中抬起变大变虚、落定收紧 */}
        {Array.from({ length: ROWS * COLS }).map((_, i) => {
          const row = Math.floor(i / COLS);
          const col = i % COLS;
          const a = angleAt(frame, row, col);
          const lift = Math.sin((Math.min(Math.max(a, 0), 180) * Math.PI) / 180);
          return (
            <div key={`sh${i}`} style={{
              position: 'absolute', left: WALL_X + col * (CELL_W + GAP), top: WALL_Y + row * (CELL_H + GAP),
              width: CELL_W, height: CELL_H, borderRadius: R,
              boxShadow:
                `0 ${(2 + lift * 4).toFixed(1)}px ${(4 + lift * 8).toFixed(1)}px ${alpha(L.shadow, 0.1 - lift * 0.05)}, ` +
                `0 ${(18 + lift * 26).toFixed(1)}px ${(40 + lift * 50).toFixed(1)}px -${(14 + lift * 6).toFixed(1)}px ${alpha(L.shadow, 0.2 + lift * 0.14)}`,
            }} />
          );
        })}
        {Array.from({ length: ROWS * COLS }).map((_, i) => {
          const row = Math.floor(i / COLS);
          const col = i % COLS;
          const x = WALL_X + col * (CELL_W + GAP);
          const y = WALL_Y + row * (CELL_H + GAP);
          const angle = angleAt(frame, row, col);
          const showFront = angle >= 90;
          // 受光：面越侧向镜头越暗（cos）；背面向后仰时上沿受光、正面翻上来时下沿先亮
          const facing = Math.abs(Math.cos((angle * Math.PI) / 180));
          const shade = (1 - facing) * 0.55;
          // 最薄处高光线：翻到 90° 时最亮，随角度从上缘扫向下缘
          const glint = Math.max(0, 1 - Math.abs(angle - 90) / 40);
          const glintTop = 8 + 84 * Math.min(1, Math.max(0, (angle - 50) / 80));
          return (
            <div key={i} style={{
              position: 'absolute', left: x, top: y, width: CELL_W, height: CELL_H,
              perspective: 2200,
              perspectiveOrigin: `${WALL_W / 2 - col * (CELL_W + GAP)}px ${WALL_H / 2 - row * (CELL_H + GAP)}px`,
            }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: R, transform: `rotateX(${(showFront ? angle - 180 : angle).toFixed(3)}deg)` }}>
                {showFront ? <CardFront i={i} /> : <CardBack row={row} col={col} sweep={sweep} />}
                {shade > 0.004 && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: R, pointerEvents: 'none',
                    background: `linear-gradient(${showFront ? 0 : 180}deg, ${alpha('#0a1030', shade * 0.5)}, ${alpha('#0a1030', shade)})`,
                  }} />
                )}
              </div>
              {glint > 0.01 && (
                <div style={{
                  position: 'absolute', left: '3%', width: '94%', top: `${glintTop}%`, height: 3, borderRadius: 2,
                  background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0) 100%)',
                  boxShadow: `0 0 16px ${alpha('#9fb6ff', 0.8)}`, opacity: glint, pointerEvents: 'none',
                }} />
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
