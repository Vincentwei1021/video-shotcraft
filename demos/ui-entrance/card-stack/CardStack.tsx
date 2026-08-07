// card-stack — Card Stack 3D 扇形展开（motion-lab 定稿转原生 Remotion）
// 8 张卡片从屏下 spring 弹入（stagger 3 帧），叠成一摞后呈扇形展开：每张
// (i-3.5)*8° 旋转 + 横移 + z 递退，形成 3D 扇面。入场动画与扇形终态偏移分层叠加。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
import React from 'react';
import { DesignStage, E, lerp, rand, seg, useT } from '../../_fixtures/Motion';

export const CARD_STACK_DURATION = 126; // 4200ms @30fps

const N = 8;
const HUES = [222, 238, 254, 270, 286, 302, 318, 334];
const GLYPHS = ['◆', '●', '▲', '■', '✦', '◐', '◇', '○'];

export const CardStack: React.FC = () => {
  const t = useT();
  return (
    <DesignStage bg="#0a0b10">
      {/* 3D 场景容器：perspective 900px 供卡片 translateZ 递退产生纵深 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#0a0b10',
          perspective: '900px',
          overflow: 'hidden',
        }}
      >
        {Array.from({ length: N }, (_, i) => {
          const hue = HUES[i];
          // 入场：屏下 spring 弹入，stagger 3 帧（0.033/张）
          const inT = seg(t, 0.02 + i * 0.033, 0.02 + i * 0.033 + 0.3);
          const y = lerp(E.spring(inT, 0.3), 300, 0);
          // 扇形：全员落位后一次性展开（静态终态偏移 × 展开进度）
          const fan = seg(t, 0.55, 0.8, E.inOutCubic);
          const k = i - (N - 1) / 2;
          const rot = k * 8 * fan;
          const tx = k * 34 * fan;
          const tz = -10 * Math.abs(k) * fan;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 110,
                height: 150,
                // 原采集页为 content-box：1px 边框外扩，卡片实占 112×152
                boxSizing: 'content-box',
                margin: '-85px 0 0 -55px',
                borderRadius: 12,
                transformOrigin: '50% 130%',
                background: `linear-gradient(165deg,hsl(${hue},45%,26%),hsl(${hue},55%,14%))`,
                border: `1px solid hsla(${hue},60%,60%,.35)`,
                boxShadow: '0 12px 34px rgba(0,0,0,.5)',
                transform: `translate3d(${tx}px,${y}px,${tz}px) rotate(${rot}deg)`,
                opacity: Math.min(1, inT * 4),
                zIndex: 20 - Math.abs(k * 2),
              }}
            >
              {/* 卡面装饰：两条信息条（宽度用 rand 确定性随机，种子与源一致）+ 居中符号 */}
              <div
                style={{
                  position: 'absolute',
                  left: 12,
                  top: 14,
                  width: 40 + rand(i) * 40,
                  height: 8,
                  borderRadius: 4,
                  background: `hsla(${hue},70%,70%,.8)`,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 12,
                  top: 30,
                  width: 26 + rand(i + 9) * 30,
                  height: 6,
                  borderRadius: 3,
                  background: `hsla(${hue},40%,60%,.4)`,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '62%',
                  transform: 'translate(-50%,-50%)',
                  fontSize: 30,
                  color: `hsla(${hue},80%,75%,.9)`,
                }}
              >
                {GLYPHS[i]}
              </div>
            </div>
          );
        })}
      </div>
    </DesignStage>
  );
};
