// chip-lift-to-user-pill — Chip Lift 选中 chip 长成人名药丸（motion-lab 定稿转原生 Remotion）
// 网格里的目标 chip 先 3 帧硬切反色成黑底白字，其余 chip 按到它的距离交错淡出并缩到 0.9；
// 黑 chip 保持左缘不动向右生长成药丸，内部逐字打出人名并点亮绿点，再拉一条 1px 连接线
// 接到圆形徽标，最后走逐词加深字幕。
// 设计坐标 480×270（DesignStage 等比放大），440×240 定尺画布居中排版。
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';

export const CHIP_LIFT_TO_USER_PILL_DURATION = 150; // 5000ms @30fps

// ---- 本卡共享量（浅灰瑞士极简系配色 / 字体；BG/DIM/h2r 取自 motion-lab/fx/b09.js 同批定义） ----
const SANS = '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif';
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

  return (
    <DesignStage bg={BG}>
      {/* 页面 + 440×240 定尺画布（居中） */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: BG,
          overflow: 'hidden',
          fontFamily: SANS,
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 440, height: 240, margin: '-120px 0 0 -220px' }}>
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
                  background: '#fff',
                  border: `1px solid ${LINE}`,
                  display: 'flex',
                  alignItems: 'center',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,.04)',
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
              border: `1px solid ${mix(aq, LINE, INK)}`,
              display: 'flex',
              alignItems: 'center',
              boxSizing: 'border-box',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,.04)',
            }}
          >
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
                background: '#35D07F',
                boxShadow: '0 0 8px rgba(53,208,127,.6)',
                opacity: clamp01(dq * 2),
                transform: `scale(${dq})`,
              }}
            />
          </div>

          {/* 1px 连接线：从药丸右缘拉到徽标 */}
          <div
            style={{
              position: 'absolute',
              left: TX + PW1,
              top: TY + CH / 2,
              height: 1,
              width: `${(cw * 90).toFixed(1)}px`,
              background: TXT,
            }}
          />

          {/* AI 徽标（白底圆 + 四角星） */}
          <div
            style={{
              position: 'absolute',
              width: BADGE_SIZE,
              height: BADGE_SIZE,
              borderRadius: '50%',
              background: '#fff',
              border: `1px solid ${LINE}`,
              boxSizing: 'border-box',
              boxShadow: '0 2px 10px rgba(0,0,0,.07)',
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
              left: TX + PW1 - 18,
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
  );
};
