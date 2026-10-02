// hit-counter 连招计数：三张功能卡接连砸入槽位，每次命中 = 全局顿帧 2f + 落点伤害数字上浮渐隐
// + 右上角 ×N combo 跳字（脉冲 / 倾斜 / 字号逐次加码）。组合：hitstop + damage-number-pop + combo-counter。
//
// 第二轮重设计（钴蓝街机海报 · 构建工具更新日）：
// - look = custom「cobalt arcade」：满版高饱和钴蓝色场（不是深海军蓝暗场）+ 白卡 + 街机黄。
//   格斗游戏 combo UI 的语言直接拿来讲"功能连招"：伤害数字是黄色斜体 900 字重 + 硬投影（漫画式错位影），
//   计数器是 150→210px 的斜体「×N」，底下三格热度条逐格点亮。
// - 内容：虚构构建工具 Brickyard 3.0 的三项更新，每一击的"伤害"= 每次推送省下的时间（−48s / −3 min / −12 min），
//   三击打完收尾一行「Up to 16 min back on every push.」——游戏梗落到真实收益上。
// - 顿帧是全局的：背景斜纹滚动、浮尘、卡片、特效全部由同一个 remap 时间 t 驱动，命中时整幅画面一起冻 2f；
//   只有卡面闪白与槽位受光用真实帧（冻结期间也要发生）。
// - 触地：卡按速度竖向拉伸 + 运动模糊 → 触地压扁回弹（指数回落）→ 白色冲击环外扩 + 黄色火花八向迸射 + 槽底受光。
//
// 时间表（动画时间 t，30fps；真实帧 = t + 已冻结帧）：
//   0–22    建立：钴蓝场、三个虚线槽位（01/02/03）、眉题、暗色 ×0 计数器
//   20/48/76 → 30/58/86  三张卡各 10f ease-in(quad) 砸落（间隔 28f 的均匀连招节拍）
//   每命中   全局顿帧 2f；伤害数字打在卡面上 scale 1.45→1 + 上浮 150px 出卡沿，4f 后 12f 渐隐；计数器 exp(−t/2.4) 回落
//   100–124 收尾行逐词升起，"16 min" 用街机黄
//   124–176 hold：背景斜纹极缓滚动，干净海报
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, SpeedBlur, Vignette, bezier, mix, ramp } from '../../_fixtures/Polish';
import { TextReveal, alpha, type } from '../../_fixtures/Look';

export const HIT_COUNTER_DURATION = 176;

// 自定义 look「cobalt arcade」
const C = {
  bg0: '#1b3fd6', bg1: '#1230b0', bg2: '#0a1d78',
  card: '#f7f8ff', ink: '#0b1240', ink2: '#4a5488', ink3: '#8a93bf',
  hit: '#ffd23f', // 街机黄：只给伤害数字 / 计数器 / 火花 / 关键收益
  deep: '#06104a', // 硬投影色
};

const HITS_T = [30, 58, 86]; // 命中时刻（动画时间）
const STOP = 2; // 每次顿帧帧数
const HITS_REAL = HITS_T.map((h, i) => h + i * STOP); // 真实命中帧 = 动画命中帧 + 已冻结帧

const SLOT_W = 480;
const SLOT_H = 330;
const SLOT_Y = 446;
const GAP = 60;
const SLOT_XS = [0, 1, 2].map((i) => 960 - (SLOT_W * 3 + GAP * 2) / 2 + i * (SLOT_W + GAP));
const DROP_FROM = -460;
const inQuad = bezier(0.55, 0.085, 0.68, 0.53);

const DMG = ['−48s', '−3 min', '−12 min'];
const DMG_SIZE = [88, 104, 124]; // 伤害数字逐击加大
const PULSE = [1.3, 1.45, 1.6];
const TILT = [-2, -4, -6];
const COUNTER_SIZE = [140, 166, 196];

const FEATURES = [
  { icon: 'cache', name: 'Cached builds', desc: 'Skips untouched packages.', note: 'avg. per push' },
  { icon: 'split', name: 'Parallel tests', desc: 'Suites shard across 32 runners.', note: 'avg. per push' },
  { icon: 'eye', name: 'Instant previews', desc: 'Every branch gets a live URL.', note: 'avg. per review' },
];

const Icon: React.FC<{ name: string }> = ({ name }) => {
  const sw = { fill: 'none', stroke: C.bg1, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width={34} height={34} viewBox="0 0 24 24">
      {name === 'cache' && (
        <>
          <ellipse cx="12" cy="6" rx="7" ry="2.6" {...sw} />
          <path d="M5 6v6c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6M5 12v6c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-6" {...sw} />
        </>
      )}
      {name === 'split' && <path d="M4 12h5l3-6h8M9 12l3 6h8M17 3l3 3-3 3M17 15l3 3-3 3" {...sw} />}
      {name === 'eye' && (
        <>
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" {...sw} />
          <circle cx="12" cy="12" r="3" {...sw} />
        </>
      )}
    </svg>
  );
};

// saved = 伤害数字飘走后，收益「落」进卡片页脚的进度（0–1）
const FeatureCard: React.FC<{ i: number; elev: number; saved: number }> = ({ i, elev, saved }) => {
  const f = FEATURES[i];
  return (
    <div
      style={{
        width: SLOT_W, height: SLOT_H, boxSizing: 'border-box', borderRadius: 26, padding: '34px 38px 32px',
        background: `linear-gradient(180deg, #ffffff 0%, ${C.card} 100%)`,
        boxShadow: `inset 0 1px 0 #fff, 0 ${(2 + elev * 0.4).toFixed(1)}px ${(4 + elev * 0.6).toFixed(1)}px ${alpha(C.deep, 0.25)}, 0 ${(10 + elev * 0.8).toFixed(1)}px ${(30 + elev * 1.4).toFixed(1)}px -8px ${alpha(C.deep, 0.5)}`,
        display: 'flex', flexDirection: 'column', fontFamily: FONT.sans, color: C.ink,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ width: 62, height: 62, borderRadius: 18, background: alpha(C.bg0, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={f.icon} />
        </div>
        <div style={{ marginLeft: 'auto', ...type(26, 600, { mono: true }), color: C.ink3 }}>0{i + 1}</div>
      </div>
      <div style={{ marginTop: 30, ...type(48, 760), letterSpacing: '-0.035em', lineHeight: 1.02 }}>{f.name}</div>
      <div style={{ marginTop: 12, ...type(30, 450), lineHeight: 1.3, color: C.ink2 }}>{f.desc}</div>
      <div
        style={{
          marginTop: 'auto', paddingTop: 18, borderTop: `1px solid ${alpha(C.ink, 0.1)}`, display: 'flex', alignItems: 'baseline',
          opacity: saved, transform: `translateY(${mix(10, 0, saved).toFixed(1)}px)`,
        }}
      >
        <span style={{ ...type(32, 800), fontStyle: 'italic', letterSpacing: '-0.02em', color: C.bg1 }}>{DMG[i]}</span>
        <span style={{ marginLeft: 'auto', ...type(26, 500), color: C.ink3 }}>{f.note}</span>
      </div>
    </div>
  );
};

const dropY = (t: number, hit: number) => mix(DROP_FROM, SLOT_Y, ramp(t, hit - 10, 10, inQuad));

const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export const HitCounter: React.FC = () => {
  const frame = useCurrentFrame();

  // —— 全局帧 remap：每个真实命中帧起冻结 2f ——
  const remap = (fr: number) => {
    let t = fr;
    for (const h of HITS_REAL) t -= Math.min(Math.max(fr - h, 0), STOP);
    return t;
  };
  const t = remap(frame);
  const count = HITS_T.filter((h) => t >= h).length;

  // —— 计数器 ——
  let cScale = 1;
  let cRot = 0;
  let cSize = 130;
  if (count > 0) {
    const i = count - 1;
    const since = t - HITS_T[i];
    cScale = 1 + (PULSE[i] - 1) * Math.exp(-since / 2.4);
    cRot = TILT[i];
    cSize = COUNTER_SIZE[i];
  }
  const stamp = count > 0 ? 1 - ramp(t, HITS_T[count - 1], 7, EASE.out) : 0;

  // 背景斜纹滚动（t 驱动 → 顿帧时一起冻住）
  const stripeShift = t * 2.2;

  return (
    <AbsoluteFill style={{ overflow: 'hidden', fontFamily: FONT.sans, background: `linear-gradient(170deg, ${C.bg0} 0%, ${C.bg1} 55%, ${C.bg2} 100%)` }}>
      {/* 背景：主光 + 斜纹（速度线的静态版）+ 网点 */}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 60% 55% at 38% 30%, ${alpha('#6f8dff', 0.45)} 0%, ${alpha('#6f8dff', 0)} 70%)` }} />
      <div
        style={{
          position: 'absolute', inset: -200, opacity: 0.1,
          backgroundImage: 'repeating-linear-gradient(-58deg, #ffffff 0px, #ffffff 2px, transparent 2px, transparent 46px)',
          transform: `translateX(${(stripeShift % 54.2).toFixed(2)}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute', inset: 0, opacity: 0.14,
          backgroundImage: `radial-gradient(circle, ${C.deep} 1.4px, transparent 1.6px)`, backgroundSize: '18px 18px',
          WebkitMaskImage: 'linear-gradient(180deg, transparent 40%, #000 100%)', maskImage: 'linear-gradient(180deg, transparent 40%, #000 100%)',
        }}
      />

      {/* 眉题 */}
      <div style={{ position: 'absolute', left: 120, top: 104, display: 'flex', alignItems: 'center', gap: 18, opacity: ramp(frame, 0, 14, EASE.out) }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 20, height: 14, borderRadius: 3, background: C.bg1, boxShadow: `8px 8px 0 -2px ${C.hit}` }} />
        </div>
        <div style={{ ...type(34, 760), color: '#fff', letterSpacing: '-0.02em' }}>Brickyard 3.0</div>
        <div style={{ ...type(24, 650, { caps: true }), color: alpha('#ffffff', 0.62), letterSpacing: '0.24em', marginLeft: 8 }}>What’s new</div>
      </div>

      {/* 槽位：虚线 + 大号序号，建立期就立预期 */}
      {SLOT_XS.map((x, i) => {
        const near = ramp(t, HITS_T[i] - 10, 10, inQuad);
        const df = frame - HITS_REAL[i];
        const glowA = df >= 0 ? Math.exp(-df / 6) : 0; // 槽底受光（真实帧）
        return (
          <React.Fragment key={`slot-${i}`}>
            <div
              style={{
                position: 'absolute', left: x, top: SLOT_Y, width: SLOT_W, height: SLOT_H, borderRadius: 26, boxSizing: 'border-box',
                border: `2px dashed ${alpha('#ffffff', 0.28)}`, background: alpha(C.deep, 0.16),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                ...type(120, 800), color: alpha('#ffffff', 0.1), letterSpacing: '-0.04em',
              }}
            >
              0{i + 1}
            </div>
            {near > 0 && t < HITS_T[i] && (
              <div
                style={{
                  position: 'absolute', left: x + 40 - (1 - near) * 40, top: SLOT_Y + 50, width: SLOT_W - 80 + (1 - near) * 80, height: SLOT_H - 40,
                  borderRadius: 30, background: C.deep, filter: `blur(${mix(44, 16, near).toFixed(1)}px)`, opacity: mix(0.05, 0.5, near),
                }}
              />
            )}
            {glowA > 0.02 && (
              <div
                style={{
                  position: 'absolute', left: x - 120, top: SLOT_Y + SLOT_H - 80, width: SLOT_W + 240, height: 200, borderRadius: '50%',
                  background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha(C.hit, 0.45 * glowA)} 0%, ${alpha(C.hit, 0)} 70%)`,
                }}
              />
            )}
          </React.Fragment>
        );
      })}

      {/* 三张功能卡 */}
      {HITS_T.map((hit, i) => {
        if (t < hit - 10) return null;
        const y = dropY(t, hit);
        const vy = t < hit ? dropY(t + 0.5, hit) - dropY(t - 0.5, hit) : 0;
        const speed = Math.min(1, vy / 200);
        const s = t - hit;
        const squash = s >= 0 ? 0.07 * Math.exp(-s / 1.6) : 0;
        const sy = 1 + speed * 0.06 - squash;
        const sx = 1 - speed * 0.025 + squash * 0.5;
        const elev = s >= 0 ? 6 : mix(6, 60, (SLOT_Y - y) / (SLOT_Y - DROP_FROM));
        const df = frame - HITS_REAL[i];
        const flash = df >= 0 && df < STOP + 4 ? (df < STOP ? 0.7 : 0.7 * (1 - (df - STOP + 1) / 5)) : 0;
        return (
          <SpeedBlur key={`card-${i}`} vx={0} vy={vy} amount={0.12} max={24}>
            <div style={{ position: 'absolute', left: SLOT_XS[i], top: y, transform: `scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`, transformOrigin: 'bottom center' }}>
              <FeatureCard i={i} elev={elev} saved={ramp(t, hit + 12, 12, EASE.snappy)} />
              {flash > 0 && <div style={{ position: 'absolute', inset: 0, borderRadius: 26, background: '#ffffff', opacity: flash }} />}
            </div>
          </SpeedBlur>
        );
      })}

      {/* 触地冲击：白色冲击环 + 八向黄色火花（t 驱动，顿帧时冻住） */}
      {HITS_T.map((hit, i) => {
        const s = t - hit;
        if (s < 0 || s > 16) return null;
        const ring = ramp(t, hit, 14, EASE.out);
        const grow = mix(0, 46 + i * 10, ring);
        const x0 = SLOT_XS[i];
        const cx = x0 + SLOT_W / 2;
        const cy = SLOT_Y + SLOT_H / 2;
        const burst = ramp(t, hit, 12, EASE.snappy);
        const n = 10 + i * 3; // 火花逐击加码
        return (
          <React.Fragment key={`fx-${i}`}>
            <div
              style={{
                position: 'absolute', left: x0 - grow, top: SLOT_Y - grow * 0.7, width: SLOT_W + grow * 2, height: SLOT_H + grow * 1.4,
                borderRadius: 26 + grow * 0.6, boxSizing: 'border-box', border: `${mix(5, 1, ring).toFixed(2)}px solid #ffffff`, opacity: (1 - ring) * 0.8,
              }}
            />
            <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
              {Array.from({ length: n }, (_, k) => {
                const ang = (k / n) * Math.PI * 2 + hash(i * 31 + k) * 0.4;
                const rx = SLOT_W * 0.52;
                const ry = SLOT_H * 0.56;
                const r0 = mix(1, 1.08 + hash(k + i * 7) * 0.15, burst);
                const r1 = mix(1.04, 1.3 + hash(k * 3 + i) * 0.35 + i * 0.06, Math.min(1, burst * 1.2));
                return (
                  <line
                    key={k}
                    x1={cx + Math.cos(ang) * rx * r0} y1={cy + Math.sin(ang) * ry * r0}
                    x2={cx + Math.cos(ang) * rx * r1} y2={cy + Math.sin(ang) * ry * r1}
                    stroke={k % 3 === 0 ? '#ffffff' : C.hit} strokeWidth={mix(7, 2, burst)} strokeLinecap="round"
                    opacity={Math.min(1, burst * 6) * (1 - burst)}
                  />
                );
              })}
            </svg>
          </React.Fragment>
        );
      })}

      {/* 伤害数字：黄色斜体 + 漫画式硬投影 */}
      {HITS_T.map((hit, i) => {
        const s = t - hit;
        if (s < 0 || s > 17) return null;
        const scale = mix(1.45, 1, ramp(t, hit, 5, EASE.snappy));
        const rise = mix(0, -150, ramp(t, hit, 16, EASE.out));
        const opacity = s < 4 ? 1 : 1 - ramp(t, hit + 4, 12, EASE.swift);
        return (
          <div
            key={`dmg-${i}`}
            style={{
              // 落点在卡面中下部（打在目标身上），上浮出卡沿：不与右上角计数器抢位置
              position: 'absolute', left: SLOT_XS[i] + SLOT_W / 2, top: SLOT_Y + SLOT_H * 0.62 - DMG_SIZE[i] + rise,
              transform: `translateX(-50%) scale(${scale.toFixed(3)}) skewX(-8deg)`, transformOrigin: 'center bottom', opacity,
              ...type(DMG_SIZE[i], 900), fontStyle: 'italic', letterSpacing: '-0.04em', lineHeight: 1, color: C.hit, whiteSpace: 'nowrap',
              textShadow: `6px 6px 0 ${C.deep}`,
            }}
          >
            {DMG[i]}
          </div>
        );
      })}

      {/* 右上角 combo 计数器 */}
      <div
        style={{
          position: 'absolute', right: 120, top: 64, width: 400, height: 280,
          transform: `scale(${cScale.toFixed(4)}) rotate(${cRot}deg)`, transformOrigin: '90% 20%',
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
        }}
      >
        <div style={{ ...type(26, 800, { caps: true }), letterSpacing: '0.3em', color: count ? '#ffffff' : alpha('#ffffff', 0.4), fontStyle: 'italic' }}>Combo</div>
        <div
          style={{
            ...type(cSize, 900), fontStyle: 'italic', letterSpacing: '-0.05em', lineHeight: 0.9, whiteSpace: 'nowrap',
            color: count ? C.hit : alpha('#ffffff', 0.22), textShadow: count ? `7px 7px 0 ${C.deep}` : 'none',
            transform: `translateY(${(-stamp * 0.14 * cSize).toFixed(1)}px) skewX(-6deg)`, marginTop: 6,
          }}
        >
          ×{count}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {[0, 1, 2].map((k) => (
            <div key={k} style={{ width: 56, height: 10, borderRadius: 5, background: k < count ? C.hit : alpha('#ffffff', 0.18), boxShadow: k < count ? `3px 3px 0 ${C.deep}` : 'none' }} />
          ))}
        </div>
      </div>

      {/* 收尾：真实收益 */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 866, textAlign: 'center' }}>
        <TextReveal
          text="Up to 16 min back on every push."
          by="word"
          variant="rise"
          start={HITS_REAL[2] + 14}
          each={18}
          gap={3}
          style={{ ...type(60, 760), letterSpacing: '-0.03em', color: '#ffffff' }}
          unitStyle={(k) => (k === 2 || k === 3 ? { color: C.hit } : {})}
        />
      </div>

      <Vignette strength={0.42} inner={0.45} color={C.deep} />
      <Grain opacity={0.07} blend="soft-light" />
    </AbsoluteFill>
  );
};
