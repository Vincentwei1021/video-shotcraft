// terminal-3d — Terminal 3D 命令执行叙事流（motion-lab 定稿转原生 Remotion）
// 多个通用桌面风格终端窗散布 3D 空间不同位置与角度，相机在窗间飞行（途中略微
// 拉远）；每到一窗，窗内打字机敲出命令并逐行吐出结果，形成命令执行叙事流。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
import React from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';

export const TERMINAL_3D_DURATION = 180; // 6000ms @30fps

// 光栅化补偿系数：3D 子树里 Chrome 按布局尺寸取样文字，经 DesignStage 放大 4x
// 后小号等宽字会糊。把整个 3D 场景数值 ×K 建模、再用外层 scale(1/K) 抵消——
// 透视投影对整体缩放自相似（p·x/(p-z) 等比），画面几何与 effect.js 逐像素一致，
// 仅文字光栅化分辨率提升到与原样片（4x device scale 截帧）相同。
const K = 4;

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

// 三个终端窗：3D 位姿 + 标题 + 命令 + 输出行（数值为 480×270 设计坐标）
const DATA = [
  {
    pose: { x: -300, y: -34, z: -110, ry: 24 },
    title: '~/workspace — zsh',
    cmd: '$ git status -sb',
    out: ['## main...origin/main', ' M src/timeline.ts', ' M src/camera.ts', '?? fx/b01.js'],
  },
  {
    pose: { x: 96, y: 62, z: 90, ry: -16 },
    title: 'dev server',
    cmd: '$ npm run dev',
    out: ['vite v5.2.0  ready in 312 ms', '➜  local:   http://localhost:3000', '➜  network: 192.0.2.10:3000', 'watching 148 modules'],
  },
  {
    pose: { x: 402, y: -74, z: -60, ry: -32 },
    title: 'logs',
    cmd: '$ tail -f server.log',
    out: ['12:04:11 GET /api/render 200 41ms', '12:04:12 POST /api/queue 201 88ms', '12:04:14 worker#3 frame 240/270', '12:04:15 done → out/final.mp4'],
  },
];

// Step 时序：每窗 [飞行起, 飞行止]；TYPE 为各窗打字起点
const STEP = [[0, 0.02], [0.30, 0.44], [0.64, 0.78]];
const TYPE = [0.05, 0.47, 0.81];
const PK = ['x', 'y', 'z', 'ry'];

export const Terminal3D: React.FC = () => {
  const t = useT();

  // 相机姿态 = 关键帧累加（两段飞行，inOutCubic）
  const v = acc(t, DATA[0].pose, [
    { at: STEP[1], to: DATA[1].pose },
    { at: STEP[2], to: DATA[2].pose },
  ], PK, E.inOutCubic);
  // 飞行途中拉远：两段过渡各一个正弦鼓包
  let pull = 0;
  for (let i = 1; i < 3; i++) {
    const u = seg(t, STEP[i][0], STEP[i][1]);
    pull += Math.sin(u * Math.PI) * 210;
  }

  return (
    <DesignStage bg="#07080e">
      {/* 反缩放包裹层：把 ×K 建模的场景缩回设计坐标（见 K 注释） */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 480 * K,
          height: 270 * K,
          transform: `scale(${1 / K})`,
          transformOrigin: 'top left',
        }}
      >
        {/* scene：透视容器 + 深空渐变背景 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(120% 90% at 50% 0%,#141826,#07080e 70%)',
            perspective: `${900 * K}px`,
            overflow: 'hidden',
            WebkitFontSmoothing: 'antialiased', // 原样片截帧为灰度平滑，避免笔画偏粗
          }}
        >
          {/* world：相机逆变换载体 —— 先拉远/推近，再反转角，再反平移 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              transformStyle: 'preserve-3d',
              transform: `translateZ(${(300 - pull) * K}px) rotateY(${-v.ry}deg) translate3d(${-v.x * K}px,${-v.y * K}px,${-v.z * K}px)`,
            }}
          >
            {DATA.map((d, i) => {
              const p = d.pose;
              // 离焦：与当前相机 x 距离越远越暗越糊
              const focus = 1 - Math.min(1, Math.abs(v.x - p.x) / 420);
              // 打字机：命令逐字点亮，光标闪烁，输出逐行滑入
              const ty = seg(t, TYPE[i], TYPE[i] + 0.09);
              const n = Math.floor(ty * d.cmd.length + 0.0001);
              const caretOp = ty >= 1
                ? (Math.floor(t * 26) % 2 ? 0.15 : 0.9)
                : (Math.floor(t * 40) % 2 ? 0.35 : 1);
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: 300 * K,
                    height: 176 * K,
                    margin: `${-88 * K}px 0 0 ${-150 * K}px`,
                    borderRadius: 9 * K,
                    background: '#0e1017',
                    overflow: 'hidden',
                    boxShadow: `0 ${24 * K}px ${60 * K}px rgba(0,0,0,.7),inset 0 0 0 ${K}px #2a3040`,
                    transform: `translate3d(${p.x * K}px,${p.y * K}px,${p.z * K}px) rotateY(${p.ry}deg)`,
                    opacity: 0.34 + focus * 0.66,
                    filter: `blur(${(1 - focus) * 2.2 * K}px) brightness(${0.7 + focus * 0.3})`,
                  }}
                >
                  {/* 标题栏：红黄绿灯 + 居中标题 */}
                  <div
                    style={{
                      position: 'absolute', left: 0, top: 0, width: '100%', height: 22 * K,
                      background: 'linear-gradient(180deg,#242a38,#1b202b)', borderBottom: `${K}px solid #2c3242`,
                    }}
                  >
                    {['#ff6058', '#ffbd2e', '#28ca42'].map((c, k) => (
                      <div
                        key={c}
                        style={{
                          position: 'absolute', left: (9 + k * 13) * K, top: 8 * K, width: 7 * K, height: 7 * K,
                          borderRadius: '50%', background: c,
                        }}
                      />
                    ))}
                    <div
                      style={{
                        position: 'absolute', left: 0, top: 0, width: '100%', height: 22 * K, textAlign: 'center',
                        font: `600 ${8 * K}px/${22 * K}px Courier,monospace`, color: '#77809b',
                      }}
                    >
                      {d.title}
                    </div>
                  </div>
                  {/* 命令行：逐字 opacity + 尾随光标 */}
                  <div
                    style={{
                      position: 'absolute', left: 12 * K, top: 32 * K,
                      font: `600 ${9.5 * K}px/1 Courier,monospace`, color: '#9dffcf', whiteSpace: 'pre',
                    }}
                  >
                    {Array.from(d.cmd, (ch, c) => (
                      // 空格换成 nbsp，对齐 effect.js 的 textContent 处理
                      <span key={c} style={{ opacity: c < n ? 1 : 0 }}>{ch === ' ' ? ' ' : ch}</span>
                    ))}
                    <span
                      style={{
                        color: '#9dffcf',
                        opacity: caretOp,
                        display: 'inline-block',
                        transform: `translateX(${(d.cmd.length - n) * -0.1 * K}px)`,
                      }}
                    >
                      ▌
                    </span>
                  </div>
                  {/* 输出行：命令敲完后逐行 stagger 淡入 + 左滑归位 */}
                  {d.out.map((o, k) => {
                    const ou = seg(t, TYPE[i] + 0.10 + k * 0.022, TYPE[i] + 0.145 + k * 0.022, E.outCubic);
                    return (
                      <div
                        key={k}
                        style={{
                          position: 'absolute', left: 12 * K, top: (52 + k * 16) * K,
                          font: `500 ${9 * K}px/1 Courier,monospace`,
                          color: k === 0 ? '#c9d3ea' : '#7f8aa6',
                          whiteSpace: 'pre',
                          opacity: ou,
                          transform: `translateX(${lerp(ou, -7, 0) * K}px)`,
                        }}
                      >
                        {o}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DesignStage>
  );
};
