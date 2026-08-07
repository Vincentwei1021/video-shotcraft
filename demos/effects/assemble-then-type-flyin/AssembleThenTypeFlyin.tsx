// assemble-then-type-flyin — Assemble + Type Fly-in 装配后文字 3D 落位（motion-lab 定稿转原生 Remotion）
// 空的暗底网格页面上，无文字的组件骨架（框、卡片、分隔线、色块）先从四面八方飞入贴合；
// 随后各处文字从 3D 空间逐字飞来——每个字符带独立的大角度 rotateX/Y/Z 旋转与纵深位移，
// 旋转着落到自己应在的位置，先大标题后小标注，全部落位后页面成形。
// 内容为中性占位模板，强调色可按项目替换。设计坐标 480×270（DesignStage 等比放大）。
import React from 'react';
import { DesignStage, E, lerp, rand, seg, useT } from '../../_fixtures/Motion';

export const ASSEMBLE_THEN_TYPE_FLYIN_DURATION = 156; // 5200ms @30fps

const MONO2 = "'SF Mono',Menlo,Consolas,monospace";
const SERIF2 = "Georgia,'Times New Roman',serif";

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

/* ---- 文字块（逐字 3D 飞入）：段内 i 表示斜体；start=该块首字起飞时刻 ---- */
type TSeg = { s: string; i?: boolean };
type Block = { x: number; y: number; font: string; color: string; ls: number; start: number; segs: TSeg[]; dy?: number };
// 大字先落（0.34 起），小标注后落。dy 是基线补偿：29px Georgia 在 transform 缩放
// 渲染下的基线取整与原 DPR=4 截图差 0.5px，用 translateY 校回（top 会被整像素吸附）。
const BLOCKS: Block[] = [
  { x: 22, y: 64, font: `400 29px ${SERIF2}`, color: '#f2f3f6', ls: 0.3, start: 0.34, segs: [{ s: 'The headline for' }], dy: -0.5 },
  { x: 22, y: 100, font: `400 29px ${SERIF2}`, color: '#f2f3f6', ls: 0.3, start: 0.4, segs: [{ s: 'your product here', i: true }], dy: -0.5 },
  { x: 41, y: 35, font: `400 13px ${SERIF2}`, color: '#eceef2', ls: 0, start: 0.47, segs: [{ s: 'Acme ' }, { s: 'Studio', i: true }] },
  { x: 316, y: 96, font: `italic 400 36px ${SERIF2}`, color: '#f4f5f8', ls: 0, start: 0.5, segs: [{ s: 'sample', i: true }] },
  { x: 34, y: 172, font: `600 7.5px ${MONO2}`, color: '#e8e9ee', ls: 1.5, start: 0.58, segs: [{ s: 'GET STARTED' }] },
  { x: 122, y: 173, font: `500 7.5px ${MONO2}`, color: '#6a707c', ls: 1.5, start: 0.62, segs: [{ s: 'DOCS' }] },
  { x: 24, y: 14, font: `500 7px ${MONO2}`, color: '#8d93a0', ls: 1, start: 0.64, segs: [{ s: 'app.example.com' }], dy: 0.5 },
  { x: 306, y: 61, font: `500 6.5px ${MONO2}`, color: '#7c828e', ls: 1.5, start: 0.66, segs: [{ s: 'WORK' }] },
  { x: 432, y: 61, font: `500 6.5px ${MONO2}`, color: '#565b66', ls: 1.5, start: 0.68, segs: [{ s: '04 / 08' }] },
  { x: 306, y: 164, font: `500 6px ${MONO2}`, color: '#6a707c', ls: 1.5, start: 0.7, segs: [{ s: 'KINETIC TYPE · 04' }] },
  { x: 22, y: 143, font: `500 6.5px ${MONO2}`, color: '#565b66', ls: 1.5, start: 0.72, segs: [{ s: 'H1 · UI-SERIF / GEORGIA' }] },
  { x: 18, y: 246, font: `500 6.5px ${MONO2}`, color: '#4c515c', ls: 1.5, start: 0.74, segs: [{ s: 'A PRODUCT OF ACME · ACME LABS, INC.' }] },
  { x: 369, y: 242, font: `600 7.5px ${MONO2}`, color: '#c9cdd6', ls: 1.5, start: 0.76, segs: [{ s: '@USERNAME' }] },
];

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

export const AssembleThenTypeFlyin: React.FC = () => {
  const t = useT();

  // 阶段一：骨架四方飞入（无字）——outBack 回弹 + 运动残余 blur
  const shell = ({ from, rot, ft }: Shell): React.CSSProperties => {
    const a = seg(t, ft, ft + 0.14, E.outBack);
    const sp = a > 0 && a < 0.97 ? 1 - a : 0;
    return {
      position: 'absolute',
      opacity: t >= ft ? Math.min(1, seg(t, ft, ft + 0.05) * 1.5) : 0,
      transform: `translate(${lerp(a, from[0], 0)}px,${lerp(a, from[1], 0)}px) rotate(${lerp(a, rot, 0)}deg)`,
      filter: sp > 0.03 ? `blur(${sp * 2}px)` : 'none',
    };
  };

  return (
    <DesignStage bg="#0a0b0e">
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#101116,#0c0d11)' }}>
        {/* 底层网格 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.5,
            background:
              'repeating-linear-gradient(0deg,transparent 0 23px,rgba(255,255,255,.025) 23px 24px),' +
              'repeating-linear-gradient(90deg,transparent 0 23px,rgba(255,255,255,.025) 23px 24px)',
          }}
        />
        {/* 顶栏 url pill + 右侧短线 */}
        <div style={{ ...shell(SH.urlPill), left: 18, top: 11, width: 78, height: 14, border: '1px solid #2a2c33', borderRadius: 9 }} />
        <div style={{ ...shell(SH.topLine), right: 18, top: 16, width: 52, height: 5, background: '#1d1f26', borderRadius: 2 }} />
        {/* logo 点阵 */}
        <div style={{ ...shell(SH.mark), left: 24, top: 37, width: 10, height: 10 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: '#e8e9ee',
                left: (i % 2) * 6,
                top: (i >> 1) * 6,
              }}
            />
          ))}
        </div>
        {/* 右侧模块卡（含分隔线与缩略块，无文字） */}
        <div
          style={{
            ...shell(SH.card),
            left: 296,
            top: 52,
            width: 162,
            height: 150,
            background: '#121319',
            border: '1px solid #23252d',
            borderRadius: 5,
          }}
        >
          <div style={{ position: 'absolute', left: 0, top: 24, width: '100%', height: 1, background: '#1e2028' }} />
          <div style={{ position: 'absolute', left: 0, top: 104, width: '100%', height: 1, background: '#1e2028' }} />
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{ position: 'absolute', left: 10 + i * 30, top: 124, width: 24, height: 16, background: '#1a1c23', borderRadius: 2 }}
            />
          ))}
        </div>
        {/* CTA pill 骨架 */}
        <div style={{ ...shell(SH.cta), left: 22, top: 166, width: 74, height: 24, border: '1px solid #3a3d46', borderRadius: 12 }} />
        {/* 社交 x 方块 */}
        <div style={{ ...shell(SH.social), left: 352, top: 241, width: 11, height: 11, border: '1px solid #3a3d46', borderRadius: 2 }} />

        {/* 阶段二：文字逐字 3D 旋转落位（间隔按块长自适应，保证 t≈0.95 前全部落位） */}
        {BLOCKS.map((b, bi) => {
          const n = CHAR_PARAMS[bi].reduce((acc, sgp) => acc + sgp.length, 0);
          const step = Math.min(0.012, Math.max(0.002, (0.94 - b.start - 0.13) / n));
          let ci = 0; // 块内字符序号（跨段累计，决定各字的错峰起飞）
          return (
            <div
              key={bi}
              style={{
                position: 'absolute',
                left: b.x,
                top: b.y,
                font: b.font,
                color: b.color,
                letterSpacing: b.ls,
                whiteSpace: 'nowrap',
                transform: b.dy ? `translateY(${b.dy}px)` : undefined,
              }}
            >
              {b.segs.map((sg, si) => (
                <span key={si} style={sg.i ? { fontStyle: 'italic' } : undefined}>
                  {Array.from(sg.s, (ch, k) => {
                    const c = CHAR_PARAMS[bi][si][k];
                    const ft = b.start + ci++ * step;
                    const a = seg(t, ft, ft + 0.13, E.outCubic);
                    return (
                      <span
                        key={k}
                        style={{
                          display: 'inline-block',
                          opacity: a > 0 ? Math.min(1, a * 1.8) : 0,
                          transform:
                            a >= 1
                              ? 'none'
                              : `perspective(600px) translate3d(${lerp(a, c.dx, 0)}px,${lerp(a, c.dy, 0)}px,${lerp(a, c.dz, 0)}px) ` +
                                `rotateX(${lerp(a, c.rx, 0)}deg) rotateY(${lerp(a, c.ry, 0)}deg) rotateZ(${lerp(a, c.rz, 0)}deg)`,
                        }}
                      >
                        {ch === ' ' ? '\u00a0' : ch}
                      </span>
                    );
                  })}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </DesignStage>
  );
};
