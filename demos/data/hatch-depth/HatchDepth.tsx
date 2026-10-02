// hatch-depth — Hatch → Depth Chart 斜纹柱实体化（motion-lab 定稿转原生 Remotion）
// 标签下的斜纹条逐条 wipe 伸长（保持 45° 斜纹占位质感），随后斜纹层淡出、强调色
// 实心层淡入，蜕变为数据横柱条形图——几何无跳变、只换纹理与颜色，讲"占位变真数据"的隐喻。
// 设计坐标 480×270（DesignStage 等比放大，raster='zoom' 按目标尺寸光栅化，字边清晰），参数表数值以此坐标系标定。
//
// 质感升级：整块图表收进一张深色面板（发丝线 + 顶部内高光 + 两层阴影），背景换柔光暗场 + 颗粒；
// 斜纹改为以条左端为锚的 6px 平铺纹理（条伸长时斜纹不再"爬动"），前沿一根亮线读出 wipe 方向；
// 实心层加顶部受光 + 贴底辉光，蜕变瞬间亮度 1.18→1 落定；柱端数值随蜕变从 0 滚到终值（tabular-nums）；
// 微颤改为阻尼收敛（±2% 起、t=0.9 前归零），尾帧静止；打字机 Courier 换系统字体栈，占位标签换成真实渠道名，
// 表头数据改为与柱值自洽（合计 1.45M / 均值 290K），加 100K 刻度网格让"真数据"有坐标。
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';
import { EASE, FONT, Grain, Backdrop, softShadow } from '../../_fixtures/Polish';

export const HATCH_DEPTH_DURATION = 132; // 4400ms @30fps

const ACCENT = '#5B8DEF'; // 模板强调色，可按项目替换
const ACCENT_HI = '#8FB2F7'; // 同族高亮（数值文字）
const ACCENT_LO = '#4a78de'; // 实心柱根部（左端略深，形成受光方向）

const SCALE_MAX = 420; // 柱宽 1.0 对应 420K（数值 = w × 420）

const ROWS = [
  { label: 'Organic', w: 0.85 },
  { label: 'Direct', w: 0.55 },
  { label: 'Referral', w: 0.95 },
  { label: 'Paid', w: 0.4 },
  { label: 'Email', w: 0.7 },
];
// 生长错峰：首条 0.06 起，间隔 0.055→0.035 递减（越点越快，末条 0.455 长完，给蜕变留窗口）
const GROW_AT = [0.06, 0.115, 0.165, 0.205, 0.24];

// 面板几何（设计坐标）
const PANEL = { x: 36, y: 26, w: 408, h: 218 };
const PAD_X = 22;
const LABEL_W = 58;
const BAR_X = PAD_X + LABEL_W + 12; // 柱区左端（面板内坐标）
const BAR_W = 262; // 柱区宽度：w=1 的满幅
const ROW_Y0 = 58;
const ROW_PITCH = 28;
const BAR_H = 16;

// 斜纹：45° 条纹按 6px 平铺，背景锚在条的左端——条伸长时纹理不随尺寸重算相位
const HATCH =
  'linear-gradient(45deg, rgba(150,157,178,0.5) 25%, transparent 25%, transparent 50%, rgba(150,157,178,0.5) 50%, rgba(150,157,178,0.5) 75%, transparent 75%)';

const mixHex = (a: string, b: string, k: number) => {
  const p = (h: string) => [1, 3, 5].map((o) => parseInt(h.slice(o, o + 2), 16));
  const A = p(a), B = p(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`;
};

export const HatchDepth: React.FC = () => {
  const t = useT();
  // 表头：蜕变过半后从上方滑入宣告"上线"；三段错峰 ~3f
  const headIn = (d: number) => seg(t, 0.62 + d, 0.78 + d, EASE.snappy);
  // LIVE 圆点到位后一次外扩脉冲
  const pulse = seg(t, 0.7, 0.86, E.outCubic);
  const gridIn = seg(t, 0.0, 0.1, E.outCubic);
  const tickIn = seg(t, 0.66, 0.82, EASE.out);
  return (
    <AbsoluteFill style={{ background: '#0b0c10' }}>
      <Backdrop tone="dark" light={{ x: 0.3, y: 0.12 }} accent={ACCENT} grain={0} vignette={0.55} />
      <DesignStage raster="zoom" bg="transparent">
        {/* 面板 */}
        <div
          style={{
            position: 'absolute',
            left: PANEL.x,
            top: PANEL.y,
            width: PANEL.w,
            height: PANEL.h,
            borderRadius: 10,
            background: 'linear-gradient(180deg, #181a21 0%, #13151b 100%)',
            border: '0.25px solid rgba(255,255,255,0.09)',
            boxShadow: `inset 0 0.25px 0 rgba(255,255,255,0.08), ${softShadow(10, { color: '#000000', strength: 2.2 })}`,
            overflow: 'hidden',
            fontFamily: FONT.sans,
          }}
        >
          {/* 刻度网格：0/100K/200K/300K/400K，发丝线 */}
          {[0, 1, 2, 3, 4].map((k) => {
            const x = BAR_X + ((k * 100) / SCALE_MAX) * BAR_W;
            return (
              <React.Fragment key={k}>
                <div
                  style={{
                    position: 'absolute',
                    left: x,
                    top: ROW_Y0 - 8,
                    width: 0.25,
                    height: ROW_PITCH * 4 + BAR_H + 16,
                    background: k === 0 ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.055)',
                    opacity: gridIn,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: x,
                    top: ROW_Y0 + ROW_PITCH * 4 + BAR_H + 13,
                    transform: `translate(-50%, ${lerp(tickIn, 3, 0)}px)`,
                    fontSize: 8.5,
                    fontWeight: 500,
                    color: '#6f7585',
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '0.01em',
                    opacity: tickIn,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {k === 0 ? '0' : `${k * 100}K`}
                </div>
              </React.Fragment>
            );
          })}

          {ROWS.map(({ label, w }, i) => {
            // 逐条 wipe 伸长 → 斜纹淡出/实心淡入 → 末段阻尼微颤收敛
            const g0 = GROW_AT[i];
            const grow = seg(t, g0, g0 + 0.22, EASE.snappy);
            const m0 = 0.5 + i * 0.03;
            const morph = seg(t, m0, m0 + 0.14, EASE.smooth);
            // 微颤：t=0.7 起 ±2%，指数衰减，t≈0.9 前归零（尾帧静止）
            const env = seg(t, 0.7, 0.725, E.outQuad) * Math.pow(1 - seg(t, 0.725, 0.9), 2);
            const wiggle = 1 + Math.sin((t - 0.7) * 62 + i * 2.1) * 0.02 * env;
            const barW = grow * w * BAR_W * wiggle; // 斜纹层与实心层共用同一宽度（几何零跳变）
            const y = ROW_Y0 + i * ROW_PITCH;
            // 实心层落定亮度：蜕变中 1.18 → 1
            const lift = 1 + 0.18 * (morph > 0 && morph < 1 ? Math.sin(morph * Math.PI) : 0);
            // 数值随蜕变从 0 滚到终值
            const count = seg(t, m0, m0 + 0.2, EASE.out);
            const labelIn = seg(t, i * 0.012, 0.07 + i * 0.012, EASE.out);
            const edge = grow > 0.01 && grow < 0.995 ? 1 : 0;
            return (
              <React.Fragment key={i}>
                <div
                  style={{
                    position: 'absolute',
                    left: PAD_X,
                    width: LABEL_W,
                    top: y,
                    height: BAR_H,
                    lineHeight: `${BAR_H}px`,
                    textAlign: 'right',
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: '-0.005em',
                    // 蜕变后标签退一档，视觉重心让给数据
                    color: mixHex('#b2b7c4', '#868c9b', morph),
                    opacity: labelIn,
                    transform: `translateX(${lerp(labelIn, -4, 0)}px)`,
                  }}
                >
                  {label}
                </div>
                {/* 斜纹占位层 */}
                <div
                  style={{
                    position: 'absolute',
                    left: BAR_X,
                    top: y,
                    width: barW,
                    height: BAR_H,
                    borderRadius: 3,
                    backgroundImage: HATCH,
                    backgroundSize: '6px 6px',
                    backgroundPosition: '0 0',
                    backgroundColor: 'rgba(120,127,148,0.06)',
                    border: '0.25px solid rgba(160,167,188,0.42)',
                    boxSizing: 'border-box',
                    boxShadow: edge ? 'inset -0.75px 0 0 rgba(214,220,236,0.75)' : 'none',
                    opacity: 1 - morph,
                  }}
                />
                {/* 强调色实心层 */}
                <div
                  style={{
                    position: 'absolute',
                    left: BAR_X,
                    top: y,
                    width: barW,
                    height: BAR_H,
                    borderRadius: 3,
                    // 渐变按满幅柱区铺（不随单条宽度压缩）：颜色读作"量"，短条停在深端、长条走到亮端
                    backgroundImage: `linear-gradient(90deg, ${ACCENT_LO} 0%, ${ACCENT} 45%, ${ACCENT_HI} 100%)`,
                    backgroundSize: `${BAR_W}px 100%`,
                    backgroundRepeat: 'no-repeat',
                    backgroundColor: ACCENT_HI,
                    boxShadow:
                      'inset 0 0.5px 0 rgba(255,255,255,0.32), inset 0 -0.5px 0 rgba(10,20,60,0.25), 0 3px 10px -3px rgba(91,141,239,0.55)',
                    filter: lift > 1.001 ? `brightness(${lift.toFixed(3)})` : undefined,
                    opacity: morph,
                  }}
                />
                {/* 柱端数值 */}
                <div
                  style={{
                    position: 'absolute',
                    left: BAR_X + barW + 7,
                    top: y,
                    height: BAR_H,
                    lineHeight: `${BAR_H}px`,
                    fontSize: 10,
                    fontWeight: 600,
                    color: ACCENT_HI,
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.005em',
                    whiteSpace: 'nowrap',
                    opacity: morph,
                    transform: `translateX(${lerp(morph, -3, 0)}px)`,
                  }}
                >
                  {Math.round(w * SCALE_MAX * count)}K
                </div>
              </React.Fragment>
            );
          })}

          {/* 头部信息条：标题 · LIVE · 合计/均值 */}
          <div
            style={{
              position: 'absolute',
              left: PAD_X,
              top: 18,
              fontSize: 12.5,
              fontWeight: 650,
              letterSpacing: '-0.015em',
              color: '#eceef3',
              opacity: headIn(0),
              transform: `translateY(${lerp(headIn(0), -14, 0)}px)`,
              whiteSpace: 'nowrap',
            }}
          >
            Visitors by channel
          </div>
          <div
            style={{
              position: 'absolute',
              left: PAD_X + 128,
              top: 18.5,
              height: 14,
              padding: '0 7px 0 15px',
              borderRadius: 7,
              background: 'rgba(103,209,124,0.12)',
              border: '0.25px solid rgba(103,209,124,0.3)',
              boxSizing: 'border-box',
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: '0.08em',
              lineHeight: '13.5px',
              color: '#7fdb92',
              opacity: headIn(0.02),
              transform: `translateY(${lerp(headIn(0.02), -14, 0)}px)`,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 6,
                top: 4.5,
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: '#67d17c',
                boxShadow: `0 0 0 ${(pulse * 4).toFixed(2)}px rgba(103,209,124,${(0.35 * (1 - pulse)).toFixed(3)})`,
              }}
            />
            LIVE
          </div>
          <div
            style={{
              position: 'absolute',
              right: PAD_X,
              top: 19.5,
              fontSize: 9.5,
              fontWeight: 500,
              color: '#8a90a0',
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
              opacity: headIn(0.04),
              transform: `translateY(${lerp(headIn(0.04), -14, 0)}px)`,
            }}
          >
            <span style={{ color: '#dfe2ea', fontWeight: 650 }}>1.45M</span> total
            <span style={{ color: '#4c5160' }}>{'\u00a0\u00a0·\u00a0\u00a0'}</span>
            <span style={{ color: '#dfe2ea', fontWeight: 650 }}>290K</span> avg
          </div>
          {/* 表头下分隔发丝线 */}
          <div
            style={{
              position: 'absolute',
              left: PAD_X,
              right: PAD_X,
              top: 41,
              height: 0.25,
              background: 'rgba(255,255,255,0.07)',
              transformOrigin: 'left center',
              transform: `scaleX(${headIn(0.01)})`,
            }}
          />
        </div>
      </DesignStage>
      <Grain opacity={0.07} blend="soft-light" />
    </AbsoluteFill>
  );
};
