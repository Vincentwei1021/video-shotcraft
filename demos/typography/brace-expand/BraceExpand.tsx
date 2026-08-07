// brace-expand — Brace Expand Reveal 括号拉幕（motion-lab 定稿转原生 Remotion）
// 一对紧贴的花括号先小字号出现在正中，随即带过冲（outBack ~8%）地向左右滑开并放大到
// 标题级，文字像被括号拉开幕布般在中间揭示（clip 宽度严格绑括号间距），落定后字距再细微松弛。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';

export const BRACE_EXPAND_DURATION = 114; // 3800ms @30fps

const FONT = '-apple-system,system-ui,sans-serif';
const HALF = 148; // 括号最终半距

// 单只花括号：x 为当前水平偏移（左负右正），sc 为同步放大比例
const Brace: React.FC<{ ch: string; x: number; sc: number; on: number }> = ({ ch, x, sc, on }) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      fontWeight: 800,
      fontSize: 44,
      fontFamily: FONT,
      color: '#fff',
      transform: `translate(-50%,-50%) translateX(${x}px) scale(${sc})`,
      opacity: on,
    }}
  >
    {ch}
  </div>
);

export const BraceExpand: React.FC = () => {
  const t = useT();
  const on = t >= 0.07 ? 1 : 0; // 先单独出现（小字号，约 2 帧后再动）
  const ex = seg(t, 0.13, 0.34, E.outBack); // 弹开：过冲约 8% 再回弹
  const sc = lerp(ex, 0.6, 1); // 字号同步放大到标题级
  const x = HALF * ex * sc;
  // 落定后 letterspacing 细微松弛
  const ls = lerp(seg(t, 0.42, 0.62, E.inOutQuad), 1, 2.6);
  return (
    <DesignStage bg="#0a0b10">
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0 }}>
        {/* 文字揭示宽度严格绑括号间距（幕布感，而非打字） */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: 'translate(-50%,-50%)',
            overflow: 'hidden',
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: Math.max(0, x * 2 - 34),
            opacity: on,
          }}
        >
          <div
            style={{
              fontWeight: 800,
              fontSize: 38,
              fontFamily: FONT,
              color: '#fff',
              whiteSpace: 'nowrap',
              letterSpacing: `${ls}px`,
              transform: `scale(${sc})`,
            }}
          >
            Your title
          </div>
        </div>
        <Brace ch="{" x={-x} sc={sc} on={on} />
        <Brace ch="}" x={x} sc={sc} on={on} />
      </div>
    </DesignStage>
  );
};
