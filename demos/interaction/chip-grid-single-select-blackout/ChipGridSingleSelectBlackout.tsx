// chip-grid-single-select-blackout — Single Select 1 帧灰闪单选反黑（motion-lab 定稿转原生 Remotion）
// 五个选项 chip 以 3+2 居中排布逐个淡入；选中帧先插一帧灰色按压块，紧接 3 帧内底色变纯黑、
// 文字变白并做 1→1.04→1 的极轻回弹，同窗口其余 chip 淡到 18% 但位置锁死；1s 后余项归零，
// 黑 chip 上移缩小，下方浮现算式行。
// 设计坐标 480×270（DesignStage 等比放大），440×240 定尺画布居中排版。
// 改版：占位选项名换成真实的计费周期选项，算式行改为价格结算（原价划线 + 现价加粗）；
// chip 做成发丝线 + 顶部内高光 + 两层软阴影的实体按钮，黑 chip 带渐变与随抬升加深的投影；
// 柔光底 + 颗粒放在 DesignStage 之外（不随 4× 设计缩放变粗）；整组下移 30 设计 px、算式行上提到 108，收束态成组居中。
// 时间轴与参数表全部保持不变。
import React, { useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill } from 'remotion';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';
import { Backdrop } from '../../_fixtures/Polish';

export const CHIP_GRID_SINGLE_SELECT_BLACKOUT_DURATION = 150; // 5000ms @30fps

// ---- 本卡共享量（浅灰瑞士极简系配色 / 字体；BG/DIM/clamp01/h2r 取自 motion-lab/fx/b09.js 同批定义） ----
const SANS = '-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Inter,Arial,sans-serif';
const BG = '#F1F1F3'; // 页面浅灰
const INK = '#0B0B0C'; // 纯黑
const TXT = '#111111'; // 正文黑
const DIM = '#C9C9CE'; // 浅灰占位字
const LINE = '#E6E6EA'; // 描边

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const h2r = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// 颜色插值：mix(p,'#C9C9CE','#111')
const mix = (p: number, a: string, b: string) => {
  const A = h2r(a), B = h2r(b), q = clamp01(p);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * q)},${Math.round(A[1] + (B[1] - A[1]) * q)},${Math.round(A[2] + (B[2] - A[2]) * q)})`;
};

// ---- 参数表（与 effect.js 完全一致） ----
const NAMES = ['Annual billing', 'Monthly billing', 'Two-year commitment', 'Student', 'Nonprofit rate'];
const TI = 0;   // 选中项下标
const FS = 0.44; // 灰闪起点

// 算式行（逐词加深语法）。注意原文含双空格：split(' ') 产生的空串"词"
// 也各占一个 4.5px margin 的空 span，是间距配方的一部分，必须保留。
const CAP_TEXT = '18% off  ·  $42.00  →  $34.44/mo';
const CAP_WORDS = CAP_TEXT.split(' ');
const CAP_N = CAP_WORDS.length;
const CAP_ST = 0.78 / CAP_N;
const CAP_WIN = CAP_ST * 1.5;
const CAP_OLD = CAP_WORDS.indexOf('$42.00'); // 原价：加深后划线、退为次级灰
const CAP_NEW = CAP_N - 1; // 现价：最后一个词，加粗
const LAYOUT_DY = 30; // 整组下移（设计 px）：选择态与收束态（chip + 算式）的视觉重心都落在画面中线附近
const FORMULA_TOP = 108; // 算式行顶（原 150）：贴近上移后的黑 chip（间距约 31 设计 px），不留大空档；仍低于上移途中的 chip 底

// 设计坐标下的材质（×4 后：1px 发丝线 / 4px 内高光 / 两层软阴影）
const HAIR = 'inset 0 0 0 0.25px rgba(20,22,28,0.10)';
const CHIP_SHADOW = 'inset 0 0.25px 0 rgba(255,255,255,0.9), 0 0.25px 0.5px rgba(16,18,24,0.07), 0 2px 5px -1.5px rgba(16,18,24,0.10)';

export const ChipGridSingleSelectBlackout: React.FC = () => {
  const t = useT();

  // 选中 chip 上移时同步回到水平中线：cx = 220 - 选中 chip 在 440 画布内的中心 x。
  // chip 宽度由文本 + padding 决定（flex 布局），挂载后实测一次；149 为兜底估算
  // （"Option one plan" 600 12px ≈ 90px 文本 + 30 padding + 2 border，行首起点 ≈ 11）。
  const targetRef = useRef<HTMLDivElement>(null);
  const [cx, setCx] = useState(149);
  useLayoutEffect(() => {
    const el = targetRef.current;
    if (el && el.offsetWidth) setCx(220 - (el.offsetLeft + el.offsetWidth / 2));
  }, []);

  const capShow = seg(t, FS + 0.36, FS + 0.42);
  const capInn = seg(t, FS + 0.37, 0.98);

  return (
    <AbsoluteFill style={{ background: BG }}>
    <Backdrop tone="light" light={{ x: 0.5, y: 0.32 }} grain={0.035} vignette={0.12} />
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
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 440, height: 240, margin: `${-120 + LAYOUT_DY}px 0 0 -220px` }}>
          {/* 标题 */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 26,
              textAlign: 'center',
              font: `600 11px/1 ${SANS}`,
              letterSpacing: 2.4,
              color: '#9A9AA2',
              opacity: seg(t, 0.02, 0.1, E.outQuad),
            }}
          >
            BILLING CYCLE
          </div>

          {/* 两行 chip：3+2 居中排布（flex 布局，位置全程锁死不重排） */}
          {[0, 1].map((row) => (
            <div
              key={row}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: row === 0 ? 96 : 136,
                display: 'flex',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              {NAMES.map((n, i) => {
                if ((i < 3 ? 0 : 1) !== row) return null;
                const d = 0.05 + i * 0.028;
                const inP = seg(t, d, d + 0.04, E.outQuad);
                let bg = '#fff';
                let borderColor = LINE;
                let labelColor: string = TXT;
                let flashO = '0';
                let shadow = CHIP_SHADOW;
                let gloss = 0; // 黑 chip 顶部渐变高光强度（随反黑出现）
                let opacity: string | number;
                let transform: string;
                if (i === TI) {
                  // 灰闪 1 帧
                  flashO = (seg(t, FS, FS + 0.006) * (1 - seg(t, FS + 0.006, FS + 0.014))).toFixed(3);
                  const bk = seg(t, FS + 0.008, FS + 0.04, E.linear);
                  bg = mix(bk, '#ffffff', INK);
                  borderColor = mix(bk, LINE, INK);
                  labelColor = mix(bk, TXT, '#ffffff');
                  // 按压回弹 1→1.04→1
                  const pr = seg(t, FS + 0.008, FS + 0.075, E.linear);
                  const sc = 1 + Math.sin(pr * Math.PI) * 0.04 * (pr > 0 ? 1 : 0);
                  const lift = seg(t, FS + 0.30, FS + 0.42, E.inOutCubic);
                  gloss = bk;
                  // 反黑后变成"实体按钮"：投影加深，上移时离地更高
                  shadow = bk > 0
                    ? `inset 0 0.25px 0 rgba(255,255,255,${(0.9 - 0.75 * bk).toFixed(3)}), 0 ${(0.25 + 0.75 * lift).toFixed(2)}px ${(0.5 + 1.5 * lift).toFixed(2)}px rgba(10,10,14,${(0.07 + 0.1 * bk).toFixed(3)}), ` +
                      `0 ${(2 + 3 * lift).toFixed(2)}px ${(5 + 7 * lift).toFixed(2)}px ${(-1.5).toFixed(2)}px rgba(10,10,14,${(0.10 + 0.16 * bk).toFixed(3)})`
                    : CHIP_SHADOW;
                  opacity = inP;
                  transform =
                    `translate(${(cx * lift).toFixed(2)}px,${(-46 * lift).toFixed(2)}px) ` +
                    `scale(${(sc * lerp(lift, 1, 0.82)).toFixed(4)})`;
                } else {
                  const fade = seg(t, FS + 0.008, FS + 0.075, E.outQuad);
                  const gone = seg(t, FS + 0.30, FS + 0.35, E.outQuad);
                  opacity = (inP * lerp(fade, 1, 0.18) * (1 - gone)).toFixed(3);
                  transform = 'none';
                }
                return (
                  <div
                    key={i}
                    ref={i === TI ? targetRef : undefined}
                    style={{
                      position: 'relative',
                      height: 30,
                      borderRadius: 15,
                      background: bg,
                      // 宽度仍含 1px 边框（几何与原版一致）；未选中时边框透明，用 0.25px 内描边作发丝线
                      border: `1px solid ${i === TI && borderColor !== LINE ? borderColor : 'transparent'}`,
                      boxSizing: 'border-box',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 15px',
                      boxShadow: `${HAIR}, ${shadow}`,
                      overflow: 'hidden',
                      opacity,
                      transform,
                    }}
                  >
                    {/* 黑 chip 顶部微渐变（受光上沿） */}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.13), rgba(255,255,255,0) 55%)', opacity: gloss }} />
                    <div style={{ position: 'relative', font: `600 12px/1 ${SANS}`, color: labelColor, letterSpacing: '-.01em', whiteSpace: 'nowrap' }}>
                      {n}
                    </div>
                    {/* 按压灰闪块（盖在 label 上） */}
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(120,120,120,.5)', opacity: flashO }} />
                  </div>
                );
              })}
            </div>
          ))}

          {/* 算式行：逐词加深（浅灰占位 → 黑），整行透明度随 show 淡入 */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: FORMULA_TOP,
              display: 'flex',
              alignItems: 'baseline',
              whiteSpace: 'nowrap',
              transform: 'translateX(-50%)',
              opacity: capShow,
            }}
          >
            {CAP_WORDS.map((w, i) => {
              const q = clamp01((capInn - i * CAP_ST) / CAP_WIN);
              // 原价：先加深到正文黑，再划线退为次级灰（划线在其加深完成后 0.04 内画出）
              const strike = i === CAP_OLD ? seg(capInn, (i * CAP_ST + CAP_WIN), (i * CAP_ST + CAP_WIN) + 0.12, E.outCubic) : 0;
              return (
                <span
                  key={i}
                  style={{
                    position: 'relative',
                    font: `${i === CAP_NEW ? 700 : 600} ${i === CAP_NEW ? 15 : 14}px/1.25 ${SANS}`,
                    color: i === CAP_OLD && strike > 0 ? mix(strike, TXT, '#8E8E96') : mix(q, DIM, TXT), // 划线只在加深完成后开始
                    letterSpacing: (-0.03 * (1 - q) - (i === CAP_NEW ? 0.01 : 0)).toFixed(4) + 'em',
                    fontVariantNumeric: 'tabular-nums',
                    marginRight: i === CAP_N - 1 ? 0 : 4.5,
                  }}
                >
                  {w}
                  {i === CAP_OLD && (
                    <span style={{
                      position: 'absolute', left: -0.5, right: -0.5, top: '54%', height: 0.6, borderRadius: 0.3,
                      background: '#8E8E96', transform: `scaleX(${strike.toFixed(4)})`, transformOrigin: 'left center',
                    }} />
                  )}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </DesignStage>
    </AbsoluteFill>
  );
};
