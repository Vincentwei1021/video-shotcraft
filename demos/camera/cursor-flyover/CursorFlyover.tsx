// cursor-flyover — Cursor Flyover 四角巡览指点（motion-lab 定稿转原生 Remotion）
// 产品截图平铺，相机先整体俯瞰淡入，再依次飞到四个角落 zoom-in 特写；一枚带阴影
// 的 SVG 光标跟到对应区域指点并留下点击涟漪。每步过渡+停留等长，easeInOutCubic。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
import React from 'react';
import { DesignStage, E, lerp, rand, seg, useT } from '../../_fixtures/Motion';

export const CURSOR_FLYOVER_DURATION = 180; // 6000ms @30fps

// 关键帧累加器：base 起步，每段 [at0,at1] 内朝 to 推进（效果源文件级共享 helper）
type Vec = Record<string, number>;
const acc = (t: number, base: Vec, kfs: { at: number[]; to: Vec }[], keys: string[], ease: (x: number) => number) => {
  const out: Vec = {};
  for (const k of keys) out[k] = base[k];
  let prev = base;
  for (const kf of kfs) {
    const u = seg(t, kf.at[0], kf.at[1], ease);
    for (const k of keys) out[k] += u * (kf.to[k] - prev[k]);
    prev = kf.to;
  }
  return out;
};

// 相机 Step：overview + 四角；光标目标（world %）
const CAM = [
  { tx: 50, ty: 50, s: 0.8,  cx: 50, cy: 52 },
  { tx: 37, ty: 32, s: 1.72, cx: 41, cy: 38 },
  { tx: 77, ty: 32, s: 1.72, cx: 82, cy: 36 },
  { tx: 77, ty: 72, s: 1.72, cx: 71, cy: 76 },
  { tx: 37, ty: 72, s: 1.72, cx: 33, cy: 78 },
];
const WIN = [[0.20, 0.32], [0.40, 0.52], [0.60, 0.72], [0.79, 0.91]];
const KEY = ['tx', 'ty', 's', 'cx', 'cy'];

// 右上折线图路径（种子与 effect.js 相同）
const LINE_D = (() => {
  let dd = '';
  for (let i = 0; i <= 14; i++) dd += `${i === 0 ? 'M' : 'L'}${i * 7.14},${40 - (6 + rand(i * 5) * 22 + i * 0.7)} `;
  return dd;
})();

// 四象限容器（截图内相对定位）
const Quad: React.FC<{ x: number; y: number; w: number; h: number; children?: React.ReactNode }> = ({
  x, y, w, h, children,
}) => (
  <div
    style={{
      position: 'absolute',
      left: `${x}%`,
      top: `${y}%`,
      width: `${w}%`,
      height: `${h}%`,
      borderRadius: 8,
      background: '#191d29',
      boxShadow: 'inset 0 0 0 1px #262c3b',
    }}
  >
    {children}
  </div>
);

export const CursorFlyover: React.FC = () => {
  const t = useT();

  const v = acc(t, CAM[0], WIN.map((w, i) => ({ at: w, to: CAM[i + 1] })), KEY, E.inOutCubic);
  const fade = seg(t, 0, 0.14, E.outCubic);

  // 每次落位时的点击涟漪
  let click = 0;
  let hold = 0;
  for (let i = 0; i < WIN.length; i++) {
    const c = seg(t, WIN[i][1], WIN[i][1] + 0.055, E.outCubic);
    if (c > 0 && c < 1) { click = c; hold = 1; }
    else if (c >= 1 && t < (WIN[i + 1] ? WIN[i + 1][0] : 1.01)) { click = 1; hold = 1; }
  }

  return (
    <DesignStage bg="#080910" raster="zoom">
      <div style={{ position: 'absolute', inset: 0, background: '#080910', overflow: 'hidden' }}>
        {/* world：相机 translate+scale 的载体，淡入由 opacity 承担 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transformOrigin: '0 0',
            transform: `translate(${50 - v.tx * v.s}%,${50 - v.ty * v.s}%) scale(${v.s})`,
            opacity: fade,
          }}
        >
          {/* ---- 截图占位：窗口 chrome + 侧栏 + 四象限控件 ---- */}
          <div
            style={{
              position: 'absolute',
              left: '4%',
              top: '5%',
              width: '92%',
              height: '90%',
              borderRadius: 10,
              background: '#12141d',
              boxShadow: '0 24px 60px rgba(0,0,0,.6),inset 0 0 0 1px #262c3b',
              overflow: 'hidden',
              filter: `blur(${(1 - fade) * 5}px)`,
            }}
          >
            {/* 顶栏：红黄绿灯 + URL 胶囊（原采集页 content-box：border-bottom 在 9% 高度之外） */}
            <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '9%', background: '#1a1d28', borderBottom: '1px solid #262c3b', boxSizing: 'content-box' }}>
              {['#ff6058', '#ffbd2e', '#28ca42'].map((c, i) => (
                <div
                  key={c}
                  style={{
                    position: 'absolute', left: 8 + i * 12, top: '50%', width: 6, height: 6, marginTop: -3,
                    borderRadius: '50%', background: c,
                  }}
                />
              ))}
              <div
                style={{
                  position: 'absolute', left: 56, top: '50%', transform: 'translateY(-50%)', height: 13, lineHeight: '13px',
                  padding: '0 10px', borderRadius: 7, background: '#0f1119', color: '#5d6580',
                  font: '500 8px/13px ui-monospace,monospace', letterSpacing: 0.4,
                }}
              >
                app.example.com/overview
              </div>
            </div>
            {/* 侧栏导航（content-box：border-right 在 15% 宽度之外） */}
            <div style={{ position: 'absolute', left: 0, top: '9%', width: '15%', height: '91%', background: '#161923', borderRight: '1px solid #232937', boxSizing: 'content-box' }}>
              {['Overview', 'Traffic', 'Revenue', 'Cohorts', 'Alerts'].map((s, i) => (
                <div
                  key={s}
                  style={{
                    position: 'absolute', left: '8%', top: `${8 + i * 15}%`, width: '84%', height: '11%', borderRadius: 5,
                    font: '600 7px/1 -apple-system,sans-serif', color: i === 0 ? '#cfd6ea' : '#5a6280',
                    display: 'flex', alignItems: 'center', paddingLeft: 6,
                    boxSizing: 'content-box', // 原采集页 content-box：paddingLeft 加在 84% 之外，激活项底色更宽
                    background: i === 0 ? '#222839' : 'transparent',
                  }}
                >
                  {s}
                </div>
              ))}
            </div>
            {/* 左上：stat tiles */}
            <Quad x={18} y={14} w={38} h={36}>
              {['12.4k', '+38%', '4.1s'].map((s, i) => (
                <div
                  key={s}
                  style={{
                    position: 'absolute', left: `${5 + i * 31.5}%`, top: '16%', width: '28%', height: '44%', borderRadius: 6,
                    background: '#202634', padding: '8px 0 0 8px', boxSizing: 'border-box',
                  }}
                >
                  <div style={{ font: '700 13px/1 -apple-system,sans-serif', color: '#e7ecfb' }}>{s}</div>
                  <div style={{ marginTop: 4, font: '600 6px/1 -apple-system,sans-serif', letterSpacing: 1, color: '#5d6580' }}>
                    METRIC {i + 1}
                  </div>
                </div>
              ))}
            </Quad>
            {/* 右上：折线图 */}
            <Quad x={59} y={14} w={37} h={36}>
              <svg viewBox="0 0 100 46" style={{ position: 'absolute', left: '6%', top: '16%', width: '88%', height: '70%' }}>
                <path d={LINE_D} fill="none" stroke="#6c8cff" strokeWidth={1.6} strokeLinejoin="round" />
              </svg>
            </Quad>
            {/* 右下：柱状图 */}
            <Quad x={59} y={55} w={37} h={34}>
              {Array.from({ length: 9 }, (_, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute', left: `${7 + i * 9.8}%`, bottom: '14%', width: '6.4%',
                    height: `${22 + rand(i * 3 + 1) * 55}%`,
                    borderRadius: 2, background: 'linear-gradient(180deg,#c86cff,#5c4bd6)',
                  }}
                />
              ))}
            </Quad>
            {/* 左下：表格行 */}
            <Quad x={18} y={55} w={38} h={34}>
              {Array.from({ length: 5 }, (_, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute', left: '6%', top: `${12 + i * 17}%`, width: '88%', height: '11%', borderRadius: 3,
                    background: '#202634',
                    boxShadow: `inset ${30 + rand(i + 2) * 45}% 0 0 rgba(108,140,255,.35)`,
                  }}
                />
              ))}
            </Quad>
          </div>

          {/* ---- 点击涟漪（world 内锚定，反缩放保持屏幕尺寸；content-box：外径 26+2×2=30px 与原采集页一致） ---- */}
          <div
            style={{
              position: 'absolute', left: `${v.cx}%`, top: `${v.cy}%`, width: 26, height: 26,
              boxSizing: 'content-box',
              borderRadius: '50%', border: '2px solid #8fa7ff', zIndex: 39, transformOrigin: '50% 50%',
              opacity: hold ? (1 - click) * 0.85 : 0,
              transform: `translate(-50%,-50%) scale(${(0.3 + click * 1.6) / v.s})`,
            }}
          />
          {/* ---- 光标（world 内锚定，逐帧反缩放保持屏幕尺寸） ---- */}
          <svg
            viewBox="0 0 24 24"
            style={{
              position: 'absolute', left: `${v.cx}%`, top: `${v.cy}%`, width: 22, height: 22, transformOrigin: '0 0',
              filter: 'drop-shadow(0 3px 5px rgba(0,0,0,.75))', pointerEvents: 'none', zIndex: 40,
              transform: `scale(${1 / v.s})`,
            }}
          >
            <path
              d="M4 2 L4 19 L9 14.4 L12.2 21.5 L15.4 20 L12.2 13 L19 12.6 Z"
              fill={click > 0 && click < 0.4 ? '#dfe6ff' : '#fff'}
              stroke="#101320"
              strokeWidth={1.1}
            />
          </svg>
        </div>
      </div>
    </DesignStage>
  );
};
