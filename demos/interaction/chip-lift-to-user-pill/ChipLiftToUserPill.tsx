// chip-lift-to-user-pill — Chip Lift 选中 chip 长成人名药丸（motion-lab 定稿转原生 Remotion）
// 网格里的目标 chip 先 3 帧硬切反色成黑底白字，其余 chip 按到它的距离交错淡出并缩到 0.9；
// 黑 chip 保持左缘不动向右生长成药丸，内部逐字打出人名并点亮绿点，再拉一条 1px 连接线
// 接到圆形徽标，最后走逐词加深字幕。
// 设计坐标 480×270（DesignStage 等比放大），440×240 定尺画布居中排版。
// 改版：时间轴与参数表不变；加一条"跟拍"机位——选择段网格居中，药丸定型后（0.44→0.68）
// 平滑横移到"药丸 + 连线 + 徽标 + 字幕"整组居中（生长段机位静止，左缘锚定的读法不受影响）；
// chip 发丝线 + 内高光 + 两层软阴影，黑药丸带受光上沿与随选中抬起的投影；连接线改 0.5 设计 px
// 并带一颗领跑小点；字幕与药丸左缘对齐；柔光底 + 颗粒在 DesignStage 之外。
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';
import { Backdrop, EASE } from '../../_fixtures/Polish';

export const CHIP_LIFT_TO_USER_PILL_DURATION = 150; // 5000ms @30fps

// ---- 本卡共享量（浅灰瑞士极简系配色 / 字体；BG/DIM/h2r 取自 motion-lab/fx/b09.js 同批定义） ----
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

// ---- 网格参数（与 effect.js 完全一致） ----
const COLS = 4, ROWS = 3, CW = 40, CH = 24, GX = 10, GY = 9, GX0 = 8, GY0 = 70;
const TC = 1, TR = 1; // 目标 chip 的列/行
const LABELS = ['JD', 'MK', 'CD', 'RL', 'AV', 'TP', 'KN', 'BW', 'CE', 'HR', 'LM', 'DQ'];
// 目标 chip 左上角坐标（左缘锚定，生长时不动）
const TX = GX0 + TC * (CW + GX); // 58
const TY = GY0 + TR * (CH + GY); // 103
// 其余 chip：位置 + 到目标的曼哈顿距离（交错淡出用）
const OTHERS = Array.from({ length: ROWS * COLS }, (_, i) => {
  const r = Math.floor(i / COLS), c = i % COLS;
  return {
    x: GX0 + c * (CW + GX),
    y: GY0 + r * (CH + GY),
    label: LABELS[i],
    dist: Math.abs(c - TC) + Math.abs(r - TR),
    isT: c === TC && r === TR,
  };
}).filter((o) => !o.isT);

const PW0 = CW, PW1 = 190; // 药丸生长的起止宽度
const NAME_CHARS = 'Casey Doe'.split(''); // 药丸内逐字打出的人名

// 结尾字幕（逐词加深语法，只用到 show + inn 两态）
const CAP_WORDS = 'Starting with Casey'.split(' ');
const CAP_ST = 0.78 / CAP_WORDS.length;
const CAP_WIN = CAP_ST * 1.5;

// 徽标尺寸（白底圆 + 四角星）
const BADGE_SIZE = 26;
const BADGE_SVG = Number((BADGE_SIZE * 0.52).toFixed(1)); // 13.5

// 机位（设计 px）：网格中心 (103,115) → 结果组中心 (211,140，含下方字幕) 都对到画布中心 (220,120)
const CAM0 = { x: 220 - 103, y: 120 - 115 };
const CAM1 = { x: 220 - 211, y: 120 - 140 };
const LINE_W = 90; // 连接线终长（徽标坐标基于它）

// 设计坐标下的材质（×4 后：1px 发丝线 / 顶部内高光 / 两层软阴影）
const HAIR = 'inset 0 0 0 0.25px rgba(20,22,28,0.10)';
const CHIP_SHADOW = 'inset 0 0.25px 0 rgba(255,255,255,0.9), 0 0.25px 0.5px rgba(16,18,24,0.07), 0 1.5px 4px -1.2px rgba(16,18,24,0.10)';

export const ChipLiftToUserPill: React.FC = () => {
  const t = useT();

  // A 反色硬切（3 帧感）：进度台阶化到 0 / 0.5 / 1 → 硬切质感
  const a = seg(t, 0.04, 0.085, E.linear);
  const aq = a < 0.34 ? 0 : a < 0.67 ? 0.5 : 1;

  // C 药丸从左缘生长 + 逐字 + 绿点
  const g = seg(t, 0.26, 0.44, E.outCubic);
  const w = lerp(g, PW0, PW1);
  const dq = seg(g, 0.85, 1, E.outBack);

  // D 连接线 → 徽标 → 字幕
  const cw = seg(t, 0.47, 0.57, E.outQuad);
  const bp = seg(t, 0.56, 0.63, E.outCubic);
  const capShow = seg(t, 0.6, 0.66);
  const capInn = seg(t, 0.6, 0.92);

  // 跟拍：药丸定型后才动（生长期机位静止），smooth in-out
  const cam = seg(t, 0.44, 0.68, EASE.smooth);
  const camX = lerp(cam, CAM0.x, CAM1.x);
  const camY = lerp(cam, CAM0.y, CAM1.y);
  // 选中"抬起"：反黑后投影加深（离地感），生长期保持
  const lift = seg(t, 0.06, 0.2, E.outCubic);

  return (
    <AbsoluteFill style={{ background: BG }}>
    <Backdrop tone="light" light={{ x: 0.5, y: 0.34 }} grain={0.035} vignette={0.12} />
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
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 440, height: 240, margin: '-120px 0 0 -220px', transform: `translate(${camX.toFixed(3)}px, ${camY.toFixed(3)}px)` }}>
          {/* B 其余 chip：按到目标的曼哈顿距离交错淡出 + scale .9 */}
          {OTHERS.map((o, i) => {
            const d0 = 0.10 + o.dist * 0.022;
            const p = seg(t, d0, d0 + 0.075, E.outQuad);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: o.x,
                  top: o.y,
                  width: CW,
                  height: CH,
                  borderRadius: CH / 2,
                  background: 'linear-gradient(180deg, #ffffff, #fbfbfb)',
                  display: 'flex',
                  alignItems: 'center',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                  boxShadow: `${HAIR}, ${CHIP_SHADOW}`,
                  opacity: 1 - p,
                  transform: `scale(${lerp(p, 1, 0.9)})`,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: CW,
                    height: CH,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    font: `600 10.5px/1 ${SANS}`,
                    letterSpacing: '.6px',
                    color: TXT,
                  }}
                >
                  {o.label}
                </div>
              </div>
            );
          })}

          {/* 目标 chip（最上层）：反色硬切 → 左缘锚定向右生长成药丸 */}
          <div
            style={{
              position: 'absolute',
              left: TX,
              top: TY,
              width: w,
              height: CH,
              borderRadius: CH / 2,
              background: mix(aq, '#ffffff', INK),
              display: 'flex',
              alignItems: 'center',
              boxSizing: 'border-box',
              overflow: 'hidden',
              boxShadow: aq > 0
                ? `inset 0 0 0 0.25px rgba(255,255,255,0.06), 0 ${(0.25 + 0.5 * lift).toFixed(2)}px ${(0.5 + 1 * lift).toFixed(2)}px rgba(10,10,14,${(0.08 + 0.08 * lift).toFixed(3)}), 0 ${(1.5 + 2.5 * lift).toFixed(2)}px ${(4 + 6 * lift).toFixed(2)}px -1.2px rgba(10,10,14,${(0.10 + 0.18 * lift).toFixed(3)})`
                : `${HAIR}, ${CHIP_SHADOW}`,
            }}
          >
            {/* 黑药丸受光上沿 */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0) 55%)', opacity: aq }} />
            {/* 原缩写标签：反色后随生长淡出 */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: CW,
                height: CH,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                font: `600 10.5px/1 ${SANS}`,
                letterSpacing: '.6px',
                color: mix(aq, TXT, '#ffffff'),
                opacity: 1 - clamp01(g * 5),
              }}
            >
              CD
            </div>
            {/* 人名逐字打出（stagger 跑在生长进度 g 上） */}
            <div
              style={{
                position: 'absolute',
                left: 13,
                top: 0,
                height: CH,
                display: 'flex',
                alignItems: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              {NAME_CHARS.map((ch, i) => {
                const p = seg(g, 0.18 + i * 0.062, 0.18 + i * 0.062 + 0.05, E.outQuad);
                return (
                  <span
                    key={i}
                    style={{
                      font: `600 11px/1 ${SANS}`,
                      color: '#fff',
                      opacity: p,
                      whiteSpace: 'pre',
                      letterSpacing: '.2px',
                      transform: `translateY(${lerp(p, 2, 0)}px)`,
                      display: 'inline-block',
                    }}
                  >
                    {ch}
                  </span>
                );
              })}
            </div>
            {/* 在线绿点：outBack 弹出，钉在药丸右缘内侧 */}
            <div
              style={{
                position: 'absolute',
                top: (CH - 7) / 2,
                left: w - 15,
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 40% 35%, #6ff0a8, #35D07F 60%)',
                boxShadow: '0 0 8px rgba(53,208,127,.6), 0 0 0 1.2px rgba(53,208,127,.18)',
                opacity: clamp01(dq * 2),
                transform: `scale(${dq})`,
              }}
            />
          </div>

          {/* 连接线（0.5 设计 px = 成片 2px）：从药丸右缘拉到徽标，线头带一颗领跑小点，抵达徽标时并入 */}
          <div
            style={{
              position: 'absolute',
              left: TX + PW1,
              top: TY + CH / 2 - 0.5,
              height: 1, // 亚像素高度会被布局取整吃掉，用 1px + scaleY(.5) 得到成片 2px 细线
              width: `${(cw * LINE_W).toFixed(2)}px`,
              background: `linear-gradient(90deg, rgba(17,17,17,0.35), ${TXT})`,
              transform: 'scaleY(0.5)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: TX + PW1 + cw * LINE_W - 1.5,
              top: TY + CH / 2 - 1.5,
              width: 3,
              height: 3,
              borderRadius: '50%',
              background: TXT,
              opacity: cw > 0 ? 1 - bp : 0,
            }}
          />

          {/* AI 徽标（白底圆 + 四角星） */}
          <div
            style={{
              position: 'absolute',
              width: BADGE_SIZE,
              height: BADGE_SIZE,
              borderRadius: '50%',
              background: 'linear-gradient(180deg, #ffffff, #f7f7f8)',
              boxSizing: 'border-box',
              boxShadow: `${HAIR}, inset 0 0.25px 0 #fff, 0 0.5px 1px rgba(16,18,24,0.08), 0 3px 8px -2px rgba(16,18,24,0.14)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              left: TX + PW1 + 90 - 2,
              top: TY + CH / 2 - 13,
              opacity: bp,
              transform: `scale(${lerp(bp, 0.8, 1)})`,
            }}
          >
            <svg width={BADGE_SVG} height={BADGE_SVG} viewBox="0 0 24 24">
              <path d="M12 0.8 L14.3 9.7 L23.2 12 L14.3 14.3 L12 23.2 L9.7 14.3 L0.8 12 L9.7 9.7 Z" fill={TXT} />
            </svg>
          </div>

          {/* 结尾字幕：逐词加深（浅灰占位 → 黑），整行透明度随 show 淡入 */}
          <div
            style={{
              position: 'absolute',
              display: 'flex',
              alignItems: 'baseline',
              whiteSpace: 'nowrap',
              left: TX + 1, // 与药丸左缘对齐（原 TX + PW1 − 18 悬在徽标下方）
              top: TY + CH + 34,
              opacity: capShow,
            }}
          >
            {CAP_WORDS.map((wd, i) => {
              const q = clamp01((capInn - i * CAP_ST) / CAP_WIN);
              return (
                <span
                  key={i}
                  style={{
                    font: `600 13px/1.25 ${SANS}`,
                    color: mix(q, DIM, TXT),
                    letterSpacing: (-0.03 * (1 - q)).toFixed(4) + 'em',
                    marginRight: i === CAP_WORDS.length - 1 ? 0 : 4.5,
                  }}
                >
                  {wd}
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
