// assemble-then-type-flyin — Assemble + Type Fly-in 装配后文字 3D 落位（motion-lab 定稿转原生 Remotion）
// 空的暗底网格页面上，无文字的组件骨架（框、卡片、分隔线、色块）先从四面八方飞入贴合；
// 随后各处文字从 3D 空间逐字飞来——每个字符带独立的大角度 rotateX/Y/Z 旋转与纵深位移，
// 旋转着落到自己应在的位置，先大标题后小标注，全部落位后页面成形。
// 内容为中性占位模板，强调色可按项目替换。设计坐标 480×270（DesignStage 等比放大）。
//
// 质感升级：骨架件改成有材质的面板（微渐变 + 发丝线 + 顶部内高光 + 两层软阴影），运动残影
// 改为按真实速度计算的方向性模糊（静止即为 0）；逐字飞入加"远处虚、近处实"的景深模糊；
// 背景加冷色主光斑 + 暗角 + 颗粒；文字全部收进各自的容器（不再溢出 pill / 卡片边）；
// 时间轴整体前移，最后一字在 ≈0.82 落定，留 ≈0.9s 的整页呼吸。
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { DesignStage, E, lerp, rand, seg, useT } from '../../_fixtures/Motion';
import { EASE, Grain, SpeedBlur, Vignette } from '../../_fixtures/Polish';

export const ASSEMBLE_THEN_TYPE_FLYIN_DURATION = 156; // 5200ms @30fps

const MONO2 = "'SF Mono','JetBrains Mono',Menlo,Consolas,monospace";
const SERIF2 = "Georgia,'Times New Roman',serif";
const A_RGB = '159,182,232'; // 强调色槽位（冷蓝），只给 CTA 与 logo 一处小点

/* ---- 组件骨架（全部无文字）：from=飞入起点位移，rot=起始旋转，ft=起飞时刻 ---- */
type Shell = { from: [number, number]; rot: number; ft: number };
const SH: Record<string, Shell> = {
  urlPill: { from: [0, -60], rot: 0, ft: 0.04 },
  topLine: { from: [80, -40], rot: 4, ft: 0.07 },
  mark: { from: [-140, -30], rot: -8, ft: 0.1 },
  card: { from: [220, 30], rot: 6, ft: 0.13 },
  cta: { from: [-70, 120], rot: -4, ft: 0.17 },
  social: { from: [130, 60], rot: 5, ft: 0.2 },
};
const SHELL_DUR = 0.14;

/* ---- 文字块（逐字 3D 飞入）：段内 i 表示斜体；start=该块首字起飞时刻 ---- */
// align='right' 时 x 表示右缘（用于卡片右上角页码，保证不出卡片边）
type TSeg = { s: string; i?: boolean };
type Block = {
  x: number; y: number; font: string; color: string; ls: number; start: number; segs: TSeg[];
  dy?: number; align?: 'right';
};
// 大字先落（0.34 起），小标注后落（0.52→0.66）。dy 是基线补偿：29px Georgia 在 transform 缩放
// 渲染下的基线取整与原 DPR=4 截图差 0.5px，用 translateY 校回（top 会被整像素吸附）。
const BLOCKS: Block[] = [
  { x: 22, y: 64, font: `400 29px ${SERIF2}`, color: '#f2f3f6', ls: -0.3, start: 0.34, segs: [{ s: 'The headline for' }], dy: -0.5 },
  { x: 22, y: 100, font: `400 29px ${SERIF2}`, color: '#f2f3f6', ls: -0.3, start: 0.4, segs: [{ s: 'your product here', i: true }], dy: -0.5 },
  { x: 41, y: 35.5, font: `400 13px ${SERIF2}`, color: '#eceef2', ls: -0.1, start: 0.46, segs: [{ s: 'Acme ' }, { s: 'Studio', i: true }] },
  { x: 316, y: 96, font: `italic 400 36px ${SERIF2}`, color: '#f4f5f8', ls: -0.4, start: 0.48, segs: [{ s: 'sample', i: true }] },
  { x: 33.5, y: 173.5, font: `600 7px ${MONO2}`, color: '#eef0f5', ls: 1.1, start: 0.52, segs: [{ s: 'GET STARTED' }] },
  { x: 120, y: 173.5, font: `500 7px ${MONO2}`, color: '#7a808c', ls: 1.1, start: 0.55, segs: [{ s: 'DOCS' }] },
  { x: 30, y: 14.5, font: `500 6.5px ${MONO2}`, color: '#8d93a0', ls: 0.5, start: 0.56, segs: [{ s: 'app.example.com' }], dy: 0.5 },
  { x: 306, y: 61, font: `500 6.5px ${MONO2}`, color: '#8a909c', ls: 1.4, start: 0.58, segs: [{ s: 'WORK' }] },
  { x: 448, y: 61, font: `500 6.5px ${MONO2}`, color: '#5c616c', ls: 0.8, start: 0.6, segs: [{ s: '04 / 08' }], align: 'right' },
  { x: 306, y: 164, font: `500 6px ${MONO2}`, color: '#727884', ls: 1.4, start: 0.61, segs: [{ s: 'KINETIC TYPE · 04' }] },
  { x: 22, y: 143, font: `500 6.5px ${MONO2}`, color: '#5c616c', ls: 1.4, start: 0.63, segs: [{ s: 'H1 · UI-SERIF / GEORGIA' }] },
  { x: 22, y: 246, font: `500 6.5px ${MONO2}`, color: '#50555f', ls: 1.4, start: 0.645, segs: [{ s: 'A PRODUCT OF ACME · ACME LABS, INC.' }] },
  { x: 369, y: 242.5, font: `600 7px ${MONO2}`, color: '#c9cdd6', ls: 1.1, start: 0.66, segs: [{ s: '@USERNAME' }] },
];
// 每块最后一字的落定上限：0.82 ≈ 第 127 帧，之后 ≈29f 整页静止呼吸
const TEXT_END = 0.82;
const CHAR_DUR = 0.13;

// 逐字随机飞入参数：k 为全局字符序号（跨块累加，与 effect.js 的 charSeed 一致）
type CharP = { dx: number; dy: number; dz: number; rx: number; ry: number; rz: number };
let charSeed = 0;
const CHAR_PARAMS: CharP[][][] = BLOCKS.map((b) =>
  b.segs.map((sg) =>
    Array.from(sg.s, () => {
      const k = charSeed++;
      return {
        dx: (rand(k) - 0.5) * 340,
        dy: (rand(k + 50) - 0.5) * 260,
        dz: -120 - rand(k + 99) * 300,
        rx: (rand(k + 7) - 0.5) * 340,
        ry: (rand(k + 13) - 0.5) * 380,
        rz: (rand(k + 23) - 0.5) * 240,
      };
    })
  )
);

// 面板材质（设计坐标下的 px；放大 4 倍后 0.25px≈1 物理像素的发丝线）
const PANEL: React.CSSProperties = {
  background: 'linear-gradient(180deg, #16171e 0%, #111218 100%)',
  border: '0.5px solid rgba(255,255,255,0.085)',
  boxShadow:
    'inset 0 0.5px 0 rgba(255,255,255,0.07), 0 0.5px 1px rgba(0,0,0,0.45), 0 10px 24px -8px rgba(0,0,0,0.6)',
};

export const AssembleThenTypeFlyin: React.FC = () => {
  const t = useT();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const tOf = (f: number) => Math.min(1, Math.max(0, f / Math.max(1, durationInFrames - 1)));

  // 阶段一：骨架四方飞入（无字）——outBack 过冲贴合；位置写成 frame 的函数，方便求速度
  const shellPos = (s: Shell, f: number) => {
    const a = seg(tOf(f), s.ft, s.ft + SHELL_DUR, E.outBack);
    return { x: lerp(a, s.from[0], 0), y: lerp(a, s.from[1], 0), r: lerp(a, s.rot, 0) };
  };
  // 骨架件外层：方向性运动模糊（按 px/帧 速度，静止为 0）+ 入场淡入；children 自行绝对定位
  const shelled = (s: Shell, style: React.CSSProperties, children?: React.ReactNode) => {
    const p = shellPos(s, frame);
    const p0 = shellPos(s, frame - 0.5);
    const p1 = shellPos(s, frame + 0.5);
    const op = t >= s.ft ? Math.min(1, seg(t, s.ft, s.ft + 0.05) * 1.5) : 0;
    if (op <= 0) return null;
    return (
      <SpeedBlur vx={p1.x - p0.x} vy={p1.y - p0.y} amount={0.16} max={3}>
        <div style={{ position: 'absolute', opacity: op, transform: `translate(${p.x}px,${p.y}px) rotate(${p.r}deg)`, ...style }}>
          {children}
        </div>
      </SpeedBlur>
    );
  };

  // 背景主光：骨架段由暗到亮缓慢点亮（0→0.3），之后静止
  const lightUp = seg(t, 0, 0.3, EASE.out);
  // CTA 强调色：文字段之后才"通电"（填充 + 边线染色），作为页面成形的最后一笔
  const ctaOn = seg(t, 0.62, 0.78, EASE.out);

  return (
    <DesignStage bg="#0a0b0e">
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#111219 0%,#0d0e13 60%,#0a0b0f 100%)' }}>
        {/* 主光斑（左上偏中，冷色）+ 卡片背后一抹强调色余光 */}
        <div
          style={{
            position: 'absolute', inset: 0, opacity: lightUp,
            background:
              `radial-gradient(ellipse 58% 64% at 30% 30%, rgba(${A_RGB},0.075) 0%, rgba(${A_RGB},0) 70%),` +
              `radial-gradient(ellipse 34% 46% at 78% 46%, rgba(${A_RGB},0.05) 0%, rgba(${A_RGB},0) 72%)`,
          }}
        />
        {/* 底层网格：中心更清楚、四周隐去（遮罩），像台面而不是满屏格纸 */}
        <div
          style={{
            position: 'absolute', inset: 0, opacity: 0.55 + 0.25 * lightUp,
            background:
              'repeating-linear-gradient(0deg,transparent 0 23.5px,rgba(255,255,255,.03) 23.5px 24px),' +
              'repeating-linear-gradient(90deg,transparent 0 23.5px,rgba(255,255,255,.03) 23.5px 24px)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 75% at 45% 45%, #000 30%, transparent 100%)',
            maskImage: 'radial-gradient(ellipse 70% 75% at 45% 45%, #000 30%, transparent 100%)',
          }}
        />

        {/* 顶栏 url pill + 右侧短线 */}
        {shelled(SH.urlPill, { ...PANEL, left: 18, top: 11, width: 88, height: 14, borderRadius: 7 },
          <div style={{ position: 'absolute', left: 4, top: 4.5, width: 4, height: 4, borderRadius: 2, background: '#3a3e48' }} />,
        )}
        {shelled(SH.topLine, { right: 18, top: 15.5, width: 52, height: 4, borderRadius: 2, background: 'linear-gradient(90deg,#20222a,#2a2d36)' })}
        {/* logo 点阵：右下一颗点亮强调色 */}
        {shelled(SH.mark, { left: 24, top: 37, width: 10, height: 10 },
          [0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                position: 'absolute', width: 4, height: 4, borderRadius: '50%',
                background: i === 3 ? `rgb(${A_RGB})` : '#e8e9ee',
                boxShadow: i === 3 ? `0 0 3px rgba(${A_RGB},0.6)` : 'none',
                left: (i % 2) * 6, top: (i >> 1) * 6,
              }}
            />
          )),
        )}
        {/* 右侧模块卡（含分隔线与缩略块，无文字） */}
        {shelled(SH.card, { ...PANEL, left: 296, top: 52, width: 162, height: 150, borderRadius: 6, overflow: 'hidden' }, <>
          <div style={{ position: 'absolute', left: 0, top: 24, width: '100%', height: 0.5, background: 'rgba(255,255,255,0.07)' }} />
          <div style={{ position: 'absolute', left: 0, top: 104, width: '100%', height: 0.5, background: 'rgba(255,255,255,0.07)' }} />
          {/* 中区微弱的强调色光：给"sample"一个舞台 */}
          <div style={{ position: 'absolute', left: 0, top: 24.5, width: '100%', height: 79.5, background: `radial-gradient(ellipse 60% 70% at 50% 60%, rgba(${A_RGB},0.06), rgba(${A_RGB},0) 70%)` }} />
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                position: 'absolute', left: 10 + i * 30, top: 124, width: 24, height: 16, borderRadius: 2.5,
                background: `linear-gradient(160deg, ${['#22252e', '#1d2029', '#252832', '#1b1d25'][i]} 0%, #15161c 100%)`,
                boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.06), inset 0 0.5px 0 rgba(255,255,255,0.05)',
              }}
            />
          ))}
        </>)}
        {/* CTA pill 骨架：文字落定后强调色"通电" */}
        {shelled(SH.cta, {
          left: 22, top: 166, width: 84, height: 24, borderRadius: 12,
          background: `linear-gradient(180deg, rgba(${A_RGB},${0.02 + 0.12 * ctaOn}) 0%, rgba(${A_RGB},${0.01 + 0.06 * ctaOn}) 100%)`,
          border: `0.5px solid rgba(${A_RGB},${0.22 + 0.4 * ctaOn})`,
          boxShadow: `inset 0 0.5px 0 rgba(255,255,255,${0.05 + 0.08 * ctaOn}), 0 6px 16px -6px rgba(${A_RGB},${0.25 * ctaOn})`,
        })}
        {/* 社交 x 方块 */}
        {shelled(SH.social, { ...PANEL, left: 352, top: 241, width: 11, height: 11, borderRadius: 2.5 }, <>
          <svg width={11} height={11} viewBox="0 0 11 11" style={{ position: 'absolute', left: 0, top: 0 }}>
            <path d="M3.7 3.7l3.6 3.6M7.3 3.7L3.7 7.3" stroke="#7a808c" strokeWidth={0.7} strokeLinecap="round" />
          </svg>
        </>)}

        {/* 阶段二：文字逐字 3D 旋转落位（间隔按块长自适应，保证 TEXT_END 前全部落位） */}
        {BLOCKS.map((b, bi) => {
          const n = CHAR_PARAMS[bi].reduce((acc, sgp) => acc + sgp.length, 0);
          const step = Math.min(0.012, Math.max(0.002, (TEXT_END - b.start - CHAR_DUR) / n));
          let ci = 0; // 块内字符序号（跨段累计，决定各字的错峰起飞）
          return (
            <div
              key={bi}
              style={{
                position: 'absolute',
                ...(b.align === 'right' ? { right: 480 - b.x } : { left: b.x }),
                top: b.y,
                font: b.font,
                color: b.color,
                letterSpacing: b.ls,
                whiteSpace: 'nowrap',
                fontKerning: 'normal',
                transform: b.dy ? `translateY(${b.dy}px)` : undefined,
              }}
            >
              {b.segs.map((sg, si) => (
                <span key={si} style={sg.i ? { fontStyle: 'italic' } : undefined}>
                  {Array.from(sg.s, (ch, k) => {
                    const c = CHAR_PARAMS[bi][si][k];
                    const ft = b.start + ci++ * step;
                    const a = seg(t, ft, ft + CHAR_DUR, EASE.snappy);
                    // 景深：离焦平面越远越虚（dz 大 → 更糊），落近后迅速变实
                    const far = (1 - a) * (1 - a);
                    const blur = far * (0.6 + (-c.dz / 420) * 1.6);
                    return (
                      <span
                        key={k}
                        style={{
                          display: 'inline-block',
                          opacity: a > 0 ? Math.min(1, a * 1.8) : 0,
                          filter: a > 0 && a < 1 && blur > 0.04 ? `blur(${blur.toFixed(2)}px)` : 'none',
                          transform:
                            a >= 1
                              ? 'none'
                              : `perspective(600px) translate3d(${lerp(a, c.dx, 0)}px,${lerp(a, c.dy, 0)}px,${lerp(a, c.dz, 0)}px) ` +
                                `rotateX(${lerp(a, c.rx, 0)}deg) rotateY(${lerp(a, c.ry, 0)}deg) rotateZ(${lerp(a, c.rz, 0)}deg)`,
                        }}
                      >
                        {ch === ' ' ? ' ' : ch}
                      </span>
                    );
                  })}
                </span>
              ))}
            </div>
          );
        })}

        <Vignette strength={0.55} inner={0.42} color="#05060a" cx={0.48} cy={0.46} />
        <Grain opacity={0.09} blend="soft-light" scale={0.25} />
      </div>
    </DesignStage>
  );
};
