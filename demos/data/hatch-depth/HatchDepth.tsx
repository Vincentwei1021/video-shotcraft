// hatch-depth — Hatch → Depth Chart 斜纹柱实体化（motion-lab 定稿转原生 Remotion）
// 标签下的斜纹条逐条 wipe 伸长（保持 45° 斜纹占位质感），随后斜纹层淡出、强调色
// 实心层淡入，蜕变为数据横柱条形图——几何无跳变、只换纹理与颜色，讲"占位变真数据"的隐喻。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
import React from 'react';
import { DesignStage, E, seg, useT } from '../../_fixtures/Motion';

export const HATCH_DEPTH_DURATION = 132; // 4400ms @30fps

const ACCENT = '#5B8DEF'; // 模板强调色，可按项目替换
const ACCENT_HI = '#8FB2F7'; // 同族高亮（数值文字）

const ROWS = [
  { label: 'SERIES_A', w: 0.85 },
  { label: 'SERIES_B', w: 0.55 },
  { label: 'GROUP_C', w: 0.95 },
  { label: 'GROUP_D', w: 0.4 },
  { label: 'OTHER_E', w: 0.7 },
];

// 头部信息条里的 &nbsp;&nbsp;（连续普通空格在 JSX 会被折叠，须用不换行空格）
const NBSP2 = '  ';

export const HatchDepth: React.FC = () => {
  const t = useT();
  // 头部信息条：下滑入场
  const headIn = seg(t, 0.62, 0.78, E.outCubic);
  return (
    <DesignStage bg="#0a0a0c">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#0a0a0c',
          padding: '36px 60px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 13,
          // 原栈 SF Mono 对无头 Chrome 不可见，真实 Chrome 落到 macOS 默认
          // 等宽字体 Courier（衬线打字机形）；显式补 Courier 兜底对齐原片
          fontFamily: '"SF Mono",Courier,monospace',
        }}
      >
        {ROWS.map(({ label, w }, i) => {
          // 逐条 wipe 伸长 → 斜纹淡出/实心淡入 → 末段轻微 wiggle
          const grow = seg(t, 0.06 + i * 0.05, 0.06 + i * 0.05 + 0.22, E.outCubic);
          const morph = seg(t, 0.5 + i * 0.03, 0.5 + i * 0.03 + 0.14);
          const wiggle = 1 + Math.sin(t * 30 + i * 2.1) * 0.02 * seg(t, 0.7, 0.85);
          const wPct = grow * w * 100 * wiggle;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, height: 26 }}>
              <span
                style={{
                  color: morph > 0.5 ? '#5c626f' : '#8b91a3',
                  fontSize: 11,
                  width: 70,
                  flex: 'none',
                  textAlign: 'right',
                }}
              >
                {label}
              </span>
              <div style={{ position: 'relative', height: '100%', flex: 1 }}>
                {/* 斜纹占位层 */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${wPct}%`,
                    borderRadius: 3,
                    background: 'repeating-linear-gradient(45deg,#565860 0 4px,transparent 4px 9px)',
                    border: '1px solid #565860',
                    // 原渲染无全局 border-box：宽高为内容尺寸，1px 边框外扩
                    // （斜纹相位随元素尺寸变化，box-sizing 不还原相位就对不上）
                    boxSizing: 'content-box',
                    opacity: 1 - morph,
                  }}
                />
                {/* 强调色实心层 */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${wPct}%`,
                    borderRadius: 3,
                    background: `linear-gradient(90deg,${ACCENT},${ACCENT_HI})`,
                    opacity: morph,
                  }}
                />
                {/* 柱端数值 */}
                <span
                  style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: ACCENT_HI,
                    fontSize: 10,
                    left: `calc(${wPct}% + 8px)`,
                    opacity: morph,
                  }}
                >
                  {Math.round(w * 420 * grow)}K
                </span>
              </div>
            </div>
          );
        })}
        {/* 头部信息条 */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: 60,
            fontWeight: 600,
            fontSize: 12,
            fontFamily: '"SF Mono",Courier,monospace', // 同上：Courier 兜底
            letterSpacing: 1,
            transform: `translateY(${-30 + headIn * 30}px)`,
            opacity: headIn,
          }}
        >
          <span style={{ color: '#e8eaf0', fontWeight: 700 }}>METRICS</span>
          {NBSP2}
          <span style={{ color: '#67d17c' }}>● LIVE</span>
          {NBSP2}
          <span style={{ color: '#8b91a3' }}>TOTAL 875K{NBSP2}AVG 1.02M</span>
        </div>
      </div>
    </DesignStage>
  );
};
