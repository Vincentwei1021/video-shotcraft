// 字形漂移合拢（letterform-drift-assembly）——Stranger Things 片头式入场。
// 品牌名 "Shotcraft"（BRAND.short，video-shotcraft 的简称）拆 9 字符：各自从不同方向（h(i) seeded 随机向量，
// 幅度 ±260–360px）带 blur 8px + opacity 0.35 缓慢漂入，错峰归位
// （delay i×3f，45f 行程，Easing.out(cubic)）。每字锁定瞬间给一次
// "加深脉冲"：字色 ink→#000→ink + 描边 0→3px→0（8f）——白底上
// 不用发光用加深（库判例）。全部合体后整词 scale 1→1.04→1 收束呼吸
// （判例：1.02 太弱，加码到 1.04）。
// 关键帧：0–24 各字错峰启程 → i 字 [i*3, i*3+45] 漂入归位 →
// 锁定帧 i*3+45 起 8f 加深脉冲（最后一字 69–77）→ 80–104 整词呼吸 →
// 104–150 全静止（46f，无逐帧滤镜）。
//
// 质感升级：去掉调试标题；柔光 Backdrop；系统 SF 栈 700、带色相的近黑墨色；
// 漂入除位移/blur/opacity 外再绑同一条 p 的旋转（±24°→0）与纵深缩放（1.22→1），
// 字是从镜头前的空间里飘回字面，而不是平面滑动；合体后字面下方浮出一层极淡的落地影。
// 补导出时长 150f（原工作台按 56f 推断，渲染止于半空）。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G } from '../../_fixtures/Fixtures';
import { Backdrop, EASE, FONT, ramp } from '../../_fixtures/Polish';
import { BRAND } from '../../_fixtures/Brand';

export const LETTERFORM_DRIFT_ASSEMBLY_DURATION = 150;

const h = (n: number) => {
  const s = Math.sin(n * 127.3) * 43758.5453;
  return s - Math.floor(s);
};

const WORD = BRAND.short; // 'Shotcraft'——片头式亮相落在品牌名上
const TRAVEL = 45; // 每字漂入行程帧数
const STAG = 3; // 错峰间隔
const INK = [23, 24, 28]; // G.ink1 #17181c

export const LetterformDriftAssembly: React.FC = () => {
  const frame = useCurrentFrame();
  const chars = WORD.split('');
  const lastLock = (chars.length - 1) * STAG + TRAVEL; // 69

  // 整词收束呼吸：80–92 放大到 1.04，92–104 回落，之后恒 1 → 帧确定
  const breath =
    frame < 92
      ? interpolate(frame, [80, 92], [1, 1.04], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.inOut(Easing.cubic),
        })
      : interpolate(frame, [92, 104], [1.04, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.inOut(Easing.cubic),
        });
  // 合体后落地影
  const ground = ramp(frame, lastLock - 6, 30, EASE.out);

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden' }}>
      <Backdrop tone="light" light={{ x: 0.5, y: 0.32 }} accent="#5b63d3" grain={0.05} vignette={0.14} />
      {/* 落地影：合体后在字面下方出现的极淡椭圆影 */}
      <div
        style={{
          position: 'absolute',
          left: 960 - 520,
          top: 540 + 70,
          width: 1040,
          height: 70,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(20,22,32,0.13), rgba(20,22,32,0) 70%)',
          opacity: ground,
          transform: `scale(${breath})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${breath})`,
        }}
      >
        {chars.map((c, i) => {
          const start = i * STAG;
          const lock = start + TRAVEL;
          // 漂入进度（位移 / blur / opacity / 旋转 / 纵深 共用一条 p）
          const p = interpolate(frame, [start, lock], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.out(Easing.cubic),
          });
          // seeded 起始向量：方向 h(i)，幅度 260–360px
          const ang = h(i + 1) * Math.PI * 2;
          const mag = 260 + h(i + 101) * 100;
          const dx = Math.cos(ang) * mag * (1 - p);
          const dy = Math.sin(ang) * mag * (1 - p);
          const rot = (h(i + 201) - 0.5) * 48 * (1 - p);
          const depth = 1 + 0.22 * (1 - p);
          const blur = 8 * (1 - p);
          const op = interpolate(p, [0, 1], [0.35, 1]);
          // 锁定加深脉冲：lock→lock+8，三角波 0→1→0
          const pulse =
            frame <= lock || frame >= lock + 8
              ? 0
              : frame < lock + 4
                ? (frame - lock) / 4
                : (lock + 8 - frame) / 4;
          const color = `rgb(${INK.map((v) => Math.round(v * (1 - pulse))).join(',')})`;
          const strokeW = 3 * pulse;
          const settled = p >= 1 && pulse === 0;
          return (
            <span
              key={i}
              style={{
                fontFamily: FONT.sans,
                fontWeight: 700,
                fontSize: 148,
                letterSpacing: '0.02em',
                color: settled ? G.ink1 : color,
                display: 'inline-block',
                transform: settled
                  ? undefined
                  : `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${depth.toFixed(4)})`,
                opacity: op,
                filter: blur > 0.01 ? `blur(${blur.toFixed(2)}px)` : undefined,
                WebkitTextStroke: strokeW > 0.01 ? `${strokeW.toFixed(2)}px #000` : undefined,
              }}
            >
              {c}
            </span>
          );
        })}
      </div>
    </div>
  );
};
