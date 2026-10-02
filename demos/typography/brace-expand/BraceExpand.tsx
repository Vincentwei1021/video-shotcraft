// brace-expand — Brace Expand Reveal 括号拉幕（motion-lab 定稿转原生 Remotion）
// 一对紧贴的花括号先小字号出现在正中，随即带过冲（outBack ~8%）地向左右滑开并放大到
// 标题级，文字像被括号拉开幕布般在中间揭示（clip 宽度严格绑括号间距），落定后字距再细微松弛。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
// 质感层（改版）：暗场柔光 Backdrop + 颗粒；括号换等宽字形 + 强调色微光，弹开快速段按速度
// 给水平运动模糊；clip 两侧 5px 羽化（仍严格绑括号位置）；文案宽度贴满括号内腔，
// 幕布真正"拉到头"才露全。
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';
import { Backdrop, FONT, Grain, SpeedBlur } from '../../_fixtures/Polish';

export const BRACE_EXPAND_DURATION = 114; // 3800ms @30fps

const HALF = 148; // 括号最终半距
const TITLE = 'Ship it faster'; // 字宽 ≈ 内腔宽（2·HALF − 34），揭示到最后一帧才露全
const ACCENT = '#8f97ff'; // 括号强调色（全片唯一彩色）

// 括号半距 x(t)：位移与缩放乘在一起（放大本身也在推开括号）
const braceX = (t: number) => {
  const ex = seg(t, 0.13, 0.34, E.outBack);
  return HALF * ex * lerp(ex, 0.6, 1);
};

// 单只花括号：x 为当前水平偏移（左负右正），sc 为同步放大比例，blurV 为水平速度（设计 px/帧）
const Brace: React.FC<{ ch: string; x: number; sc: number; on: number; v: number }> = ({ ch, x, sc, on, v }) => (
  // 运动模糊层要罩住括号整个行程（±HALF·过冲），滤镜区域按元素盒计算
  <div style={{ position: 'absolute', left: -240, top: -60, width: 480, height: 120 }}>
    <SpeedBlur vx={v} amount={0.32} max={6}>
      <div
        style={{
          position: 'absolute',
          left: 240,
          top: 60,
          fontWeight: 500,
          fontSize: 44,
          lineHeight: 1,
          fontFamily: FONT.mono,
          color: ACCENT,
          textShadow: `0 0 10px rgba(143,151,255,0.35)`,
          transform: `translate(-50%,-54%) translateX(${x}px) scale(${sc})`,
          opacity: on,
        }}
      >
        {ch}
      </div>
    </SpeedBlur>
  </div>
);

export const BraceExpand: React.FC = () => {
  const t = useT();
  const on = t >= 0.07 ? 1 : 0; // 先单独出现（小字号，硬切不淡入）
  const ex = seg(t, 0.13, 0.34, E.outBack); // 弹开：过冲约 8% 再回弹
  const sc = lerp(ex, 0.6, 1); // 字号同步放大到标题级
  const x = braceX(t);
  // 括号水平速度（设计 px/帧）：t 每帧步长 1/113，中心差分
  const dt = 1 / (BRACE_EXPAND_DURATION - 1);
  const v = (braceX(t + dt / 2) - braceX(t - dt / 2));
  // 落定后 letterspacing 细微松弛
  const ls = lerp(seg(t, 0.42, 0.62, E.inOutQuad), 1, 2.6);
  const clipW = Math.max(0, x * 2 - 34);
  // 两侧羽化：clip 很窄时羽化宽度跟着收，避免整块被羽化吃掉
  const feather = Math.min(5, clipW / 4);
  const mask = `linear-gradient(90deg, transparent 0px, #000 ${feather}px, #000 calc(100% - ${feather}px), transparent 100%)`;
  return (
    <>
      <Backdrop tone="dark" light={{ x: 0.5, y: 0.4 }} accent="#5b63d3" vignette={0.55} grain={0} />
      <DesignStage bg="transparent">
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
              width: clipW,
              opacity: on,
              WebkitMaskImage: mask,
              maskImage: mask,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: 38,
                lineHeight: 1.1,
                fontFamily: FONT.sans,
                whiteSpace: 'nowrap',
                letterSpacing: `${ls - 1.6}px`,
                transform: `scale(${sc})`,
                backgroundImage: 'linear-gradient(180deg, #f7f8fb 0%, #e6e8ef 55%, #c3c7d4 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                paddingBottom: 2,
              }}
            >
              {TITLE}
            </div>
          </div>
          <Brace ch="{" x={-x} sc={sc} on={on} v={-v} />
          <Brace ch="}" x={x} sc={sc} on={on} v={v} />
        </div>
      </DesignStage>
      <Grain opacity={0.07} blend="soft-light" />
    </>
  );
};
