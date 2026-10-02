// scanline-annotate-focus — Scanline Annotate 扫描分析取景标注（motion-lab 定稿转原生 Remotion）
// 一条亮扫描线自上而下掠过页面，扫过之处按先后顺序弹出相机取景框：四角括号从约 1.75 倍
// 大小快速收拢对准目标区块（对准瞬间轻微过冲再回稳），随后旁侧打出等宽小字标注。
// 顶部状态行同步计数 00/06→06/06，扫完切换 ANALYSIS · COMPLETE。
// 页面内容为虚构品牌站，标注词与强调色均可按项目替换。设计坐标 480×270（DesignStage 等比放大）。
//
// 质感升级：占位文案（"The headline for / your product here"、sample、@USERNAME）换成一张
// 可信的工作室官网；扫描线做成冷蓝光芯 + 两端衰减 + 尾迹，扫过的区域留一层渐隐的扫描网格余晖；
// 取景框角标改细并带微弱辉光、收拢后臂长再收一档（二次动作）；标注升到 8px 可读字号，
// 先亮一颗强调色定位点、再从左向右擦出文字（类目亮 / 细项暗两级）；H1 标注挪到标题下方
// 不再压住右侧模块卡；状态行下加扫描进度细条；背景加暗角与颗粒。
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';
import { Grain, Vignette } from '../../_fixtures/Polish';

export const SCANLINE_ANNOTATE_FOCUS_DURATION = 138; // 4600ms @30fps

const MONO = '"SF Mono","JetBrains Mono",Menlo,Consolas,monospace';
const SERIF = "Georgia,'Times New Roman',serif";
const ACCENT = '#9fb6e8'; // 模板强调色，可按项目替换（与 A_RGB 同色，换肤同改）
const A_RGB = '159,182,232';
const LINE = 'rgba(255,255,255,0.075)'; // 页面发丝线
const LINE2 = 'rgba(255,255,255,0.13)';

/* ---- 分析目标（bbox 手动微调留边）：ft=取景框触发时刻，按扫描顺序推导 ---- */
type Target = { x: number; y: number; w: number; h: number; label: string; lx: number; ly: number; ft: number };
const TARGETS: Target[] = (() => {
  const ts: Target[] = [
    { x: 18, y: 30, w: 108, h: 22, label: 'LOGO · MARK + WORDMARK', lx: 133, ly: 36.5, ft: 0 },
    { x: 292, y: 48, w: 170, h: 158, label: 'MODULE · KINETIC TYPE', lx: 292, ly: 35, ft: 0 },
    { x: 18, y: 58, w: 242, h: 78, label: 'H1 · SERIF DISPLAY', lx: 20, ly: 141, ft: 0 },
    { x: 18, y: 160, w: 136, h: 32, label: 'CTA · PRIMARY + GHOST', lx: 161, ly: 171.5, ft: 0 },
    { x: 14, y: 240, w: 224, h: 18, label: 'FOOTER · LEGAL', lx: 245, ly: 244.5, ft: 0 },
    { x: 348, y: 235, w: 116, h: 23, label: 'SOCIAL · BRAND VOICE', lx: 348, ly: 222.5, ft: 0 },
  ];
  // 触发时刻：扫描线（0.06→0.66 纵扫 -30→300）越过 bbox 下缘
  const rawT = (tg: Target) => 0.06 + ((tg.y + tg.h + 30) / 330) * 0.6;
  let prev = -1;
  for (const tg of [...ts].sort((a, b) => a.y + a.h - (b.y + b.h))) {
    tg.ft = Math.max(rawT(tg), prev + 0.05); // 依序钳制最小间隔
    prev = tg.ft;
  }
  return ts;
})();

// 取景框四角：每角两条 1px 细臂（SVG 圆头），arm = 臂长
const Corner: React.FC<{ k: number; arm: number; w: number; h: number }> = ({ k, arm, w, h }) => {
  const x = k % 2 === 0 ? 0 : w;
  const y = k < 2 ? 0 : h;
  const sx = k % 2 === 0 ? 1 : -1;
  const sy = k < 2 ? 1 : -1;
  return <path d={`M${x} ${y + sy * arm}V${y}H${x + sx * arm}`} />;
};

export const ScanlineAnnotateFocus: React.FC = () => {
  const t = useT();

  // 扫描线纵扫（严格匀速：机器的视线）+ 首尾淡入淡出
  const ly = lerp(seg(t, 0.06, 0.66), -30, 300);
  const lineOpacity = seg(t, 0.04, 0.09) * (1 - seg(t, 0.66, 0.71));

  // 已触发的取景框计数（a>0 即已弹出）
  const fired = TARGETS.reduce((acc, tg) => acc + (seg(t, tg.ft, tg.ft + 0.11, E.outCubic) > 0 ? 1 : 0), 0);
  const done = seg(t, 0.74, 0.8);
  const scanProg = seg(t, 0.06, 0.66);

  return (
    <AbsoluteFill style={{ background: '#0a0b0e' }}>
      <DesignStage bg="transparent">
        {/* ---- 页面（静态底）：虚构工作室官网 ---- */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#111319 0%,#0d0e13 60%,#0b0c10 100%)' }}>
          {/* 顶部主光：极淡冷光斑，让页面不是死平的黑 */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 55% at 32% 18%, rgba(150,165,210,0.07) 0%, rgba(150,165,210,0) 70%)' }} />
          {/* 顶栏（url pill + 协议状态） */}
          <div style={{ position: 'absolute', left: 18, top: 11, padding: '3px 9px 3px 8px', boxShadow: `inset 0 0 0 0.5px ${LINE2}`, borderRadius: 9, background: 'rgba(255,255,255,0.025)', font: `500 6.5px ${MONO}`, color: '#8d93a0', letterSpacing: 0.6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width={5} height={6} viewBox="0 0 5 6"><rect x={0.4} y={2.6} width={4.2} height={3} rx={0.6} fill="#6f7685" /><path d="M1.3 2.6V1.8a1.2 1.2 0 0 1 2.4 0v.8" fill="none" stroke="#6f7685" strokeWidth={0.55} /></svg>
            ardenstudio.com
          </div>
          <div style={{ position: 'absolute', right: 18, top: 14, font: `500 6.5px ${MONO}`, color: '#565b66', letterSpacing: 1 }}>200 OK · TLS 1.3</div>
          {/* logo：点阵 mark + 衬线字标 */}
          <div style={{ position: 'absolute', left: 24, top: 35, width: 100, height: 18 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ position: 'absolute', width: 4, height: 4, borderRadius: '50%', background: i === 3 ? ACCENT : '#e8e9ee', left: (i % 2) * 6, top: 2 + (i >> 1) * 6 }} />
            ))}
            <div style={{ position: 'absolute', left: 17, top: 0, font: `400 13px ${SERIF}`, color: '#eceef2', letterSpacing: -0.1 }}>
              Arden <i>Studio</i>
            </div>
          </div>
          {/* H1 两行 */}
          <div style={{ position: 'absolute', left: 22, top: 64, width: 242, height: 84 }}>
            <div style={{ position: 'absolute', left: 0, top: 0, font: `400 29px ${SERIF}`, color: '#f2f3f6', letterSpacing: -0.4, whiteSpace: 'nowrap' }}>Type that moves</div>
            <div style={{ position: 'absolute', left: 0, top: 36, font: `italic 400 29px ${SERIF}`, color: '#f2f3f6', letterSpacing: -0.4, whiteSpace: 'nowrap' }}>the way you speak</div>
          </div>
          {/* CTA 行：实心主按钮 + 幽灵链接 */}
          <div style={{ position: 'absolute', left: 22, top: 166, width: 136, height: 26 }}>
            <div style={{ position: 'absolute', left: 0, top: 0, padding: '6px 12px', borderRadius: 12, background: 'linear-gradient(180deg,#f4f5f8,#dfe2e8)', boxShadow: '0 0.5px 0 rgba(255,255,255,0.6) inset, 0 3px 8px -3px rgba(0,0,0,0.6)', font: `600 7.5px ${MONO}`, color: '#121319', letterSpacing: 1 }}>BOOK A CALL</div>
            <div style={{ position: 'absolute', left: 96, top: 7, font: `500 7.5px ${MONO}`, color: '#7a808c', letterSpacing: 1 }}>WORK →</div>
          </div>
          {/* 右侧模块卡：作品集里的动态字体样片 */}
          <div style={{ position: 'absolute', left: 296, top: 52, width: 162, height: 150, background: 'linear-gradient(180deg,#15171d,#111217)', boxShadow: `inset 0 0 0 0.5px ${LINE2}, inset 0 0.5px 0 rgba(255,255,255,0.06), 0 8px 24px -8px rgba(0,0,0,0.7)`, borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 10, top: 9, font: `500 6.5px ${MONO}`, color: '#8a909c', letterSpacing: 1.2 }}>WORK</div>
            <div style={{ position: 'absolute', right: 10, top: 9, font: `500 6.5px ${MONO}`, color: '#565b66', letterSpacing: 1.2, fontVariantNumeric: 'tabular-nums' }}>04 / 08</div>
            <div style={{ position: 'absolute', left: 0, top: 24, width: '100%', height: 0.5, background: LINE }} />
            <div style={{ position: 'absolute', left: 0, top: 44, width: '100%', textAlign: 'center', font: `italic 400 36px ${SERIF}`, color: '#f4f5f8', letterSpacing: -0.6 }}>kinetic</div>
            <div style={{ position: 'absolute', left: 0, top: 104, width: '100%', height: 0.5, background: LINE }} />
            <div style={{ position: 'absolute', left: 10, top: 112, font: `500 6px ${MONO}`, color: '#6a707c', letterSpacing: 1.2 }}>KINETIC TYPE · 04</div>
            {/* 四格缩略帧：同一个字母的四个关键姿态 */}
            {['Aa', 'Aa', 'Aa', 'Aa'].map((g, i) => (
              <div key={i} style={{ position: 'absolute', left: 10 + i * 30, top: 124, width: 24, height: 16, background: i === 1 ? '#20232c' : '#191b22', boxShadow: `inset 0 0 0 0.5px ${i === 1 ? 'rgba(159,182,232,0.45)' : LINE}`, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, right: 0, top: 3.5, textAlign: 'center', font: `${i % 2 ? 'italic ' : ''}400 8px ${SERIF}`, color: i === 1 ? '#e6eaf3' : '#5f6470', transform: `skewX(${(i - 1.5) * -6}deg)` }}>{g}</div>
              </div>
            ))}
            <div style={{ position: 'absolute', right: 8, top: 129, font: `500 6px ${MONO}`, color: '#565b66', fontVariantNumeric: 'tabular-nums' }}>00:30</div>
          </div>
          {/* 页脚 + 社交 chip */}
          <div style={{ position: 'absolute', left: 18, top: 246, font: `500 6px ${MONO}`, color: '#4c515c', letterSpacing: 1, whiteSpace: 'nowrap' }}>© 2026 ARDEN STUDIO · PRIVACY · TERMS</div>
          <div style={{ position: 'absolute', left: 352, top: 239, width: 108, height: 16 }}>
            <div style={{ position: 'absolute', left: 0, top: 2, width: 12, height: 12, boxShadow: `inset 0 0 0 0.5px ${LINE2}`, borderRadius: 3, background: 'rgba(255,255,255,0.03)' }}>
              <svg style={{ position: 'absolute', left: 3, top: 3 }} width={6} height={6} viewBox="0 0 6 6"><path d="M0.6 0.6 5.4 5.4M5.4 0.6 0.6 5.4" stroke="#c9cdd6" strokeWidth={0.8} strokeLinecap="round" /></svg>
            </div>
            <div style={{ position: 'absolute', left: 17, top: 4, font: `600 7px ${MONO}`, color: '#c9cdd6', letterSpacing: 0.8 }}>@ardenstudio</div>
          </div>
        </div>

        {/* ---- 扫描余晖：扫过的区域短暂留一层点阵网格，随距离渐隐（机器"读过"的痕迹） ---- */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: lineOpacity * 0.9,
            backgroundImage: `radial-gradient(circle, rgba(${A_RGB},0.5) 0.35px, transparent 0.6px)`,
            backgroundSize: '6px 6px',
            WebkitMaskImage: `linear-gradient(180deg, transparent ${ly - 70}px, rgba(0,0,0,0.5) ${ly - 8}px, transparent ${ly}px)`,
            maskImage: `linear-gradient(180deg, transparent ${ly - 70}px, rgba(0,0,0,0.5) ${ly - 8}px, transparent ${ly}px)`,
          }}
        />

        {/* ---- 取景框 + 标注（按扫描顺序触发） ---- */}
        {TARGETS.map((tg, i) => {
          const a = seg(t, tg.ft, tg.ft + 0.11, E.outCubic); // 弹出进度
          const s = lerp(E.outBack(seg(t, tg.ft, tg.ft + 0.13)), 1.75, 1); // 1.75 倍收拢 + 过冲回稳
          const arm = lerp(seg(t, tg.ft + 0.06, tg.ft + 0.16, E.outCubic), 12, 9); // 收拢后臂长再收一档（跟随）
          const fillO = 0.07 * seg(t, tg.ft + 0.04, tg.ft + 0.09) * (1 - seg(t, tg.ft + 0.09, tg.ft + 0.22)); // 对准瞬间微闪
          const dot = seg(t, tg.ft + 0.04, tg.ft + 0.08, E.outCubic); // 定位点先亮
          const la = seg(t, tg.ft + 0.05, tg.ft + 0.16, E.outCubic); // 标注擦出 + 上移
          const [head, ...rest] = tg.label.split(' · ');
          return (
            <React.Fragment key={i}>
              <div
                style={{
                  position: 'absolute',
                  left: tg.x,
                  top: tg.y,
                  width: tg.w,
                  height: tg.h,
                  opacity: Math.min(1, a * 1.6),
                  transform: `scale(${a > 0 ? s : 1.75})`,
                }}
              >
                <div style={{ position: 'absolute', inset: 0.5, background: `rgba(${A_RGB},0.35)`, opacity: fillO * 2.2, borderRadius: 1 }} />
                <svg
                  width={tg.w}
                  height={tg.h}
                  style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', filter: `drop-shadow(0 0 1.5px rgba(${A_RGB},0.55))` }}
                  fill="none"
                  stroke="#f2f4f8"
                  strokeWidth={1}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {[0, 1, 2, 3].map((k) => (
                    <Corner key={k} k={k} arm={arm} w={tg.w} h={tg.h} />
                  ))}
                </svg>
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: tg.lx,
                  top: tg.ly,
                  height: 9,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  whiteSpace: 'nowrap',
                  transform: `translateY(${lerp(la, 3, 0).toFixed(3)}px)`,
                }}
              >
                <div style={{ width: 2.5, height: 2.5, borderRadius: 0.6, background: ACCENT, opacity: dot, boxShadow: `0 0 3px rgba(${A_RGB},0.8)`, flexShrink: 0 }} />
                <div
                  style={{
                    font: `500 8px ${MONO}`,
                    letterSpacing: 0.8,
                    lineHeight: '9px',
                    opacity: Math.min(1, la * 1.4),
                    clipPath: `inset(-2px ${((1 - la) * 100).toFixed(2)}% -2px 0)`,
                  }}
                >
                  <span style={{ color: '#e4e7ee', fontWeight: 600 }}>{head}</span>
                  <span style={{ color: '#7f8592' }}>{rest.length ? ` · ${rest.join(' · ')}` : ''}</span>
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {/* ---- 扫描线：前方无光、身后尾迹；光芯两端衰减 + 冷蓝辉光 ----
            mask 只作用于 border-box，所以外层比尾迹多留 20px，光芯下侧的辉光才不会被裁掉 */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: 68,
            transform: `translateY(${(ly - 48).toFixed(3)}px)`,
            opacity: lineOpacity,
            WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, #000 18%, #000 82%, transparent 100%)',
            maskImage: 'linear-gradient(90deg, transparent 0%, #000 18%, #000 82%, transparent 100%)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '100%',
              height: 48,
              background: `linear-gradient(180deg,transparent,rgba(${A_RGB},.03) 40%,rgba(${A_RGB},.11) 94%,rgba(${A_RGB},.0) 100%)`,
            }}
          />
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

        {/* ---- 顶部状态行：SCAN 计数 → ANALYSIS · COMPLETE，下挂扫描进度细条 ---- */}
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
            opacity: seg(t, 0.03, 0.08),
            textShadow: done >= 1 ? `0 0 6px rgba(${A_RGB},0.5)` : 'none',
          }}
        >
          {done >= 1 ? 'ANALYSIS · COMPLETE' : `SCAN · 0${fired}/0${TARGETS.length}`}
        </div>
        <div style={{ position: 'absolute', left: 205, top: 23.5, width: 70, height: 0.75, borderRadius: 1, background: 'rgba(255,255,255,0.09)', opacity: seg(t, 0.03, 0.08), overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(scanProg * 100).toFixed(2)}%`, background: ACCENT, opacity: lerp(done, 0.7, 1) }} />
        </div>
      </DesignStage>
      <Vignette strength={0.42} inner={0.5} color="#000000" />
      <Grain opacity={0.08} blend="soft-light" />
    </AbsoluteFill>
  );
};
