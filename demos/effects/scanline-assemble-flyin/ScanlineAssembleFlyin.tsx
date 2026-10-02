// scanline-assemble-flyin — Scanline Assemble 扫描装配组件飞入（motion-lab 定稿转原生 Remotion）
// 页面开场为空的暗底网格，一条亮扫描线自上而下掠过；扫过每个区块的落点后，该处组件从画外
// 四面八方飞入（左上 logo 自左、右侧模块卡自右、H1 自左下、CTA 自下、页脚社交自下方两侧），
// 带轻微过冲和残影模糊，贴合落位瞬间四角闪出咬合角标。扫完整页恰好装配完成。
// 页面内容为虚构品牌站（与 scanline-annotate-focus 同一页），强调色可按项目替换。
// 设计坐标 480×270（DesignStage 等比放大）。
//
// 质感升级：占位文案换成可信的工作室官网；空页网格从几乎看不见（.025×.5）提到可读的蓝图网格
// （细线 + 交点亮点），扫描线经过时网格被短暂照亮；各向同性 blur 换成按速度计算、沿飞行方向
// 的 SpeedBlur；整块描边闪框（像调试框）换成四角咬合角标；面板飞行中阴影大而虚、落定收紧；
// 扫描线修掉下侧辉光被裁的问题；状态行下加装配进度细条；暗角 + 颗粒。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { DesignStage, E, lerp, seg } from '../../_fixtures/Motion';
import { Grain, SpeedBlur, Vignette } from '../../_fixtures/Polish';

export const SCANLINE_ASSEMBLE_FLYIN_DURATION = 138; // 4600ms @30fps

const MONO = '"SF Mono","JetBrains Mono",Menlo,Consolas,monospace';
const SERIF = "Georgia,'Times New Roman',serif";
const ACCENT = '#9fb6e8'; // 模板强调色，可按项目替换（与 A_RGB 同色，换肤同改）
const A_RGB = '159,182,232';
const LINE = 'rgba(255,255,255,0.075)';
const LINE2 = 'rgba(255,255,255,0.13)';

/* ---- 每个组件的飞入方案：y=扫描落点（触发用），from=画外起点位移，rot=起始旋转，box=落位盒 ---- */
type Plan = { key: string; y: number; from: [number, number]; rot: number; ft: number; box: [number, number, number, number] };
const PLAN: Plan[] = (() => {
  const ps: Plan[] = [
    { key: 'topbar', y: 30, from: [0, -70], rot: 0, ft: 0, box: [0, 0, 480, 30] },
    { key: 'logo', y: 53, from: [-160, -30], rot: -6, ft: 0, box: [24, 35, 100, 18] },
    { key: 'module', y: 100, from: [230, 40], rot: 5, ft: 0, box: [296, 52, 162, 150] },
    { key: 'h1', y: 148, from: [-260, 60], rot: -4, ft: 0, box: [22, 64, 242, 84] },
    { key: 'cta', y: 192, from: [-60, 130], rot: 3, ft: 0, box: [22, 166, 136, 26] },
    { key: 'footer', y: 257, from: [-140, 70], rot: 2, ft: 0, box: [18, 243, 220, 14] },
    { key: 'social', y: 262, from: [150, 70], rot: -3, ft: 0, box: [352, 239, 108, 16] },
  ];
  // 触发时刻：扫描线（0.05→0.72 纵扫 -30→300）到达组件落点 y，依序钳制最小间隔
  let prev = -1;
  for (const pl of ps) {
    pl.ft = Math.max(0.05 + ((pl.y + 30) / 330) * 0.67 - 0.02, prev + 0.045);
    prev = pl.ft;
  }
  return ps;
})();
const P = Object.fromEntries(PLAN.map((pl) => [pl.key, pl])) as Record<string, Plan>;

// 落位咬合角标的四个 L（相对落位盒外扩 3px，臂长 5）
const SnapTicks: React.FC<{ w: number; h: number; o: number }> = ({ w, h, o }) => {
  const g = 3;
  const arm = 5;
  const d = [
    `M${-g} ${-g + arm}V${-g}H${-g + arm}`,
    `M${w + g - arm} ${-g}H${w + g}V${-g + arm}`,
    `M${w + g} ${h + g - arm}V${h + g}H${w + g - arm}`,
    `M${-g + arm} ${h + g}H${-g}V${h + g - arm}`,
  ].join('');
  return (
    <svg
      width={w}
      height={h}
      style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: o, filter: `drop-shadow(0 0 1.5px rgba(${A_RGB},0.8))`, pointerEvents: 'none' }}
    >
      <path d={d} fill="none" stroke={`rgba(${A_RGB},0.95)`} strokeWidth={0.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export const ScanlineAssembleFlyin: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const tAt = (f: number) => Math.min(1, Math.max(0, f / Math.max(1, durationInFrames - 1)));
  const t = tAt(frame);

  // 扫描线纵扫（匀速：施工进度条）+ 首尾淡入淡出
  const ly = lerp(seg(t, 0.05, 0.72), -30, 300);
  const lineOpacity = seg(t, 0.03, 0.08) * (1 - seg(t, 0.72, 0.77));

  // 飞入位姿（f 的纯函数，便于中心差分求速度）：outBack 过冲贴合
  const poseAt = (pl: Plan, f: number) => {
    const a = seg(tAt(f), pl.ft, pl.ft + 0.15, E.outBack);
    return { a, x: lerp(a, pl.from[0], 0), y: lerp(a, pl.from[1], 0), r: lerp(a, pl.rot, 0) };
  };

  // 组件：SpeedBlur 沿飞行方向拖影（速度≈0 自动不加滤镜）+ 位姿 + 落位角标
  const Fly: React.FC<{ pl: Plan; style?: React.CSSProperties; children: React.ReactNode }> = ({ pl, style, children }) => {
    const { a, x, y, r } = poseAt(pl, frame);
    const p0 = poseAt(pl, frame - 0.5);
    const p1 = poseAt(pl, frame + 0.5);
    const vis = t >= pl.ft ? 1 : 0;
    const [bx, by, bw, bh] = pl.box;
    const tick = seg(t, pl.ft + 0.11, pl.ft + 0.14) * (1 - seg(t, pl.ft + 0.16, pl.ft + 0.27));
    const settled = a >= 0.99 && seg(t, pl.ft, pl.ft + 0.15) >= 1;
    return (
      <SpeedBlur vx={settled ? 0 : p1.x - p0.x} vy={settled ? 0 : p1.y - p0.y} amount={0.11} max={3.2}>
        <div
          style={{
            position: 'absolute',
            left: bx,
            top: by,
            width: bw,
            height: bh,
            opacity: vis * Math.min(1, seg(t, pl.ft, pl.ft + 0.06) * 1.4),
            transform: `translate(${x.toFixed(3)}px,${y.toFixed(3)}px) rotate(${r.toFixed(3)}deg)`,
            ...style,
          }}
        >
          {children}
          {pl.key !== 'topbar' && <SnapTicks w={bw} h={bh} o={tick} />}
        </div>
      </SpeedBlur>
    );
  };

  // 已落位组件计数（a≥0.99 视为贴合完成）
  const placed = PLAN.reduce((acc, pl) => acc + (seg(t, pl.ft, pl.ft + 0.15, E.outBack) >= 0.99 ? 1 : 0), 0);
  const done = seg(t, 0.8, 0.86);
  const buildProg = seg(t, 0.05, 0.72);

  // 模块卡飞行中阴影大而虚、落定收紧（离地感）
  const modA = poseAt(P.module, frame).a;
  const modLift = 1 - Math.min(1, Math.max(0, modA));

  return (
    <AbsoluteFill style={{ background: '#0a0b0e' }}>
      <DesignStage bg="transparent">
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#111319 0%,#0d0e13 60%,#0b0c10 100%)' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 55% at 32% 18%, rgba(150,165,210,0.06) 0%, rgba(150,165,210,0) 70%)' }} />
          {/* 空页底：蓝图网格（24px 细线 + 交点亮点），组件飞入前唯一可见的东西；装配完成后退到 35% */}
          <div style={{ position: 'absolute', inset: 0, opacity: lerp(done, 1, 0.35) }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'repeating-linear-gradient(0deg,transparent 0 23.5px,rgba(255,255,255,.035) 23.5px 24px),' +
                'repeating-linear-gradient(90deg,transparent 0 23.5px,rgba(255,255,255,.035) 23.5px 24px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'radial-gradient(circle at 23.75px 23.75px, rgba(255,255,255,0.16) 0.55px, transparent 0.9px)',
              backgroundSize: '24px 24px',
            }}
          />
          </div>
          {/* 扫描线经过时网格被短暂照亮（身后 60px 渐隐） */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: lineOpacity,
              background:
                `repeating-linear-gradient(0deg,transparent 0 23.5px,rgba(${A_RGB},.22) 23.5px 24px),` +
                `repeating-linear-gradient(90deg,transparent 0 23.5px,rgba(${A_RGB},.22) 23.5px 24px)`,
              WebkitMaskImage: `linear-gradient(180deg, transparent ${ly - 60}px, rgba(0,0,0,0.9) ${ly - 2}px, transparent ${ly + 1}px)`,
              maskImage: `linear-gradient(180deg, transparent ${ly - 60}px, rgba(0,0,0,0.9) ${ly - 2}px, transparent ${ly + 1}px)`,
            }}
          />

          {/* 顶栏（url pill + 状态）——整组自上方落下 */}
          <Fly pl={P.topbar}>
            <div style={{ position: 'absolute', left: 18, top: 11, padding: '3px 9px 3px 8px', boxShadow: `inset 0 0 0 0.5px ${LINE2}`, borderRadius: 9, background: 'rgba(255,255,255,0.025)', font: `500 6.5px ${MONO}`, color: '#8d93a0', letterSpacing: 0.6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width={5} height={6} viewBox="0 0 5 6"><rect x={0.4} y={2.6} width={4.2} height={3} rx={0.6} fill="#6f7685" /><path d="M1.3 2.6V1.8a1.2 1.2 0 0 1 2.4 0v.8" fill="none" stroke="#6f7685" strokeWidth={0.55} /></svg>
              ardenstudio.com
            </div>
            <div style={{ position: 'absolute', right: 18, top: 14, font: `500 6.5px ${MONO}`, color: '#565b66', letterSpacing: 1 }}>200 OK · TLS 1.3</div>
          </Fly>
          {/* logo：点阵 mark + 衬线字标——自左飞入 */}
          <Fly pl={P.logo}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ position: 'absolute', width: 4, height: 4, borderRadius: '50%', background: i === 3 ? ACCENT : '#e8e9ee', left: (i % 2) * 6, top: 2 + (i >> 1) * 6 }} />
            ))}
            <div style={{ position: 'absolute', left: 17, top: 0, font: `400 13px ${SERIF}`, color: '#eceef2', letterSpacing: -0.1 }}>
              Arden <i>Studio</i>
            </div>
          </Fly>
          {/* H1 两行 + 注脚——自左下飞入 */}
          <Fly pl={P.h1}>
            <div style={{ position: 'absolute', left: 0, top: 0, font: `400 29px ${SERIF}`, color: '#f2f3f6', letterSpacing: -0.4, whiteSpace: 'nowrap' }}>Type that moves</div>
            <div style={{ position: 'absolute', left: 0, top: 36, font: `italic 400 29px ${SERIF}`, color: '#f2f3f6', letterSpacing: -0.4, whiteSpace: 'nowrap' }}>the way you speak</div>
            <div style={{ position: 'absolute', left: 1, top: 79, font: `500 6px ${MONO}`, color: '#5b606b', letterSpacing: 1.2, whiteSpace: 'nowrap' }}>MOTION IDENTITY · TYPE SYSTEMS · SINCE 2014</div>
          </Fly>
          {/* CTA 行：实心主按钮 + 幽灵链接——自下飞入 */}
          <Fly pl={P.cta}>
            <div style={{ position: 'absolute', left: 0, top: 0, padding: '6px 12px', borderRadius: 12, background: 'linear-gradient(180deg,#f4f5f8,#dfe2e8)', boxShadow: '0 0.5px 0 rgba(255,255,255,0.6) inset, 0 3px 8px -3px rgba(0,0,0,0.6)', font: `600 7.5px ${MONO}`, color: '#121319', letterSpacing: 1 }}>BOOK A CALL</div>
            <div style={{ position: 'absolute', left: 96, top: 7, font: `500 7.5px ${MONO}`, color: '#7a808c', letterSpacing: 1 }}>WORK →</div>
          </Fly>
          {/* 右侧模块卡——自右飞入（飞行中阴影大而虚，落定收紧） */}
          <Fly
            pl={P.module}
            style={{
              background: 'linear-gradient(180deg,#15171d,#111217)',
              borderRadius: 5,
              boxShadow:
                `inset 0 0 0 0.5px ${LINE2}, inset 0 0.5px 0 rgba(255,255,255,0.06), ` +
                `0 ${(3 + modLift * 10).toFixed(2)}px ${(10 + modLift * 22).toFixed(2)}px -4px rgba(0,0,0,${(0.65 + modLift * 0.2).toFixed(3)})`,
            }}
          >
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 5 }}>
              <div style={{ position: 'absolute', left: 10, top: 9, font: `500 6.5px ${MONO}`, color: '#8a909c', letterSpacing: 1.2 }}>WORK</div>
              <div style={{ position: 'absolute', right: 10, top: 9, font: `500 6.5px ${MONO}`, color: '#565b66', letterSpacing: 1.2, fontVariantNumeric: 'tabular-nums' }}>04 / 08</div>
              <div style={{ position: 'absolute', left: 0, top: 24, width: '100%', height: 0.5, background: LINE }} />
              <div style={{ position: 'absolute', left: 0, top: 44, width: '100%', textAlign: 'center', font: `italic 400 36px ${SERIF}`, color: '#f4f5f8', letterSpacing: -0.6 }}>kinetic</div>
              <div style={{ position: 'absolute', left: 0, top: 104, width: '100%', height: 0.5, background: LINE }} />
              <div style={{ position: 'absolute', left: 10, top: 112, font: `500 6px ${MONO}`, color: '#6a707c', letterSpacing: 1.2 }}>KINETIC TYPE · 04</div>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{ position: 'absolute', left: 10 + i * 30, top: 124, width: 24, height: 16, background: i === 1 ? '#20232c' : '#191b22', boxShadow: `inset 0 0 0 0.5px ${i === 1 ? 'rgba(159,182,232,0.45)' : LINE}`, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: 0, right: 0, top: 3.5, textAlign: 'center', font: `${i % 2 ? 'italic ' : ''}400 8px ${SERIF}`, color: i === 1 ? '#e6eaf3' : '#5f6470', transform: `skewX(${(i - 1.5) * -6}deg)` }}>Aa</div>
                </div>
              ))}
              <div style={{ position: 'absolute', right: 8, top: 129, font: `500 6px ${MONO}`, color: '#565b66', fontVariantNumeric: 'tabular-nums' }}>00:30</div>
            </div>
          </Fly>
          {/* 页脚——自左下飞入 */}
          <Fly pl={P.footer}>
            <div style={{ position: 'absolute', left: 0, top: 3, font: `500 6px ${MONO}`, color: '#4c515c', letterSpacing: 1, whiteSpace: 'nowrap' }}>© 2026 ARDEN STUDIO · PRIVACY · TERMS</div>
          </Fly>
          {/* 社交 chip——自右下飞入 */}
          <Fly pl={P.social}>
            <div style={{ position: 'absolute', left: 0, top: 2, width: 12, height: 12, boxShadow: `inset 0 0 0 0.5px ${LINE2}`, borderRadius: 3, background: 'rgba(255,255,255,0.03)' }}>
              <svg style={{ position: 'absolute', left: 3, top: 3 }} width={6} height={6} viewBox="0 0 6 6"><path d="M0.6 0.6 5.4 5.4M5.4 0.6 0.6 5.4" stroke="#c9cdd6" strokeWidth={0.8} strokeLinecap="round" /></svg>
            </div>
            <div style={{ position: 'absolute', left: 17, top: 4, font: `600 7px ${MONO}`, color: '#c9cdd6', letterSpacing: 0.8 }}>@ardenstudio</div>
          </Fly>
        </div>

        {/* ---- 扫描线：身后尾迹 + 白热光芯 + 冷蓝辉光，两端渐隐 ----
            mask 只作用于 border-box，外层比尾迹多留 20px，光芯下侧辉光才不会被裁 */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: 68,
            transform: `translateY(${(ly - 48).toFixed(3)}px)`,
            opacity: lineOpacity,
            WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, #000 16%, #000 84%, transparent 100%)',
            maskImage: 'linear-gradient(90deg, transparent 0%, #000 16%, #000 84%, transparent 100%)',
          }}
        >
          <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: 48, background: `linear-gradient(180deg,transparent,rgba(${A_RGB},.03) 40%,rgba(${A_RGB},.11) 94%,rgba(${A_RGB},0) 100%)` }} />
          <div
            style={{
              position: 'absolute',
              top: 47.55,
              left: 0,
              width: '100%',
              height: 0.9,
              background: '#f4f7ff',
              boxShadow: `0 0 1.5px #ffffff,0 0 5px ${ACCENT},0 0 14px rgba(${A_RGB},.55)`,
            }}
          />
        </div>

        {/* ---- 顶部状态行：BUILD 计数 → ASSEMBLY · COMPLETE，下挂装配进度细条 ---- */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            width: 480,
            top: 12,
            textAlign: 'center',
            font: `600 7.5px ${MONO}`,
            letterSpacing: 1.8,
            fontVariantNumeric: 'tabular-nums',
            color: done >= 1 ? ACCENT : '#a3a9b5',
            opacity: seg(t, 0.02, 0.07),
            textShadow: done >= 1 ? `0 0 6px rgba(${A_RGB},0.5)` : 'none',
            zIndex: 60,
          }}
        >
          {done >= 1 ? 'ASSEMBLY · COMPLETE' : `BUILD · 0${placed}/0${PLAN.length}`}
        </div>
        <div style={{ position: 'absolute', left: 205, top: 23.5, width: 70, height: 0.75, borderRadius: 1, background: 'rgba(255,255,255,0.09)', opacity: seg(t, 0.02, 0.07), overflow: 'hidden', zIndex: 60 }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(buildProg * 100).toFixed(2)}%`, background: ACCENT, opacity: lerp(done, 0.7, 1) }} />
        </div>
      </DesignStage>
      <Vignette strength={0.42} inner={0.5} color="#000000" />
      <Grain opacity={0.08} blend="soft-light" />
    </AbsoluteFill>
  );
};
