// terminal-3d — Terminal 3D 命令执行叙事流（motion-lab 定稿转原生 Remotion）
// 多个通用桌面风格终端窗散布 3D 空间不同位置与角度，相机在窗间飞行（途中略微
// 拉远）；每到一窗，窗内打字机敲出命令并逐行吐出结果，形成命令执行叙事流。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
//
// 改版要点：①修光标穿帮——旧版未打出的字符仍占位，光标悬在行尾空处；现在只排
// 已打出的字符，光标紧贴字尾，提示符 "$" 常驻；②等宽字体换系统栈（SF Mono/
// JetBrains Mono），输出按 git/vite/日志语义着色；③窗体换玻璃质感：发丝边、
// 顶沿受光、渐变机身、聚焦窗淡淡的靛色环境光；④背景加点阵远景（随相机横移
// 反向视差）+ 暗角 + 颗粒，飞行段按相机速度加方向性运动模糊；⑤时序收紧：
// 第三窗输出在 0.963 吐完，尾段留静止落定（旧版末行到最后一帧还没淡入完）。
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';
import { FONT, Grain, SpeedBlur, Vignette } from '../../_fixtures/Polish';

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

// 终端配色：带色相的深底 + 低饱和语义色
const C = {
  prompt: '#6fe3b0', // 提示符 / 命令
  text: '#c9d1e6', // 主输出
  dim: '#6d7792', // 次要输出
  green: '#6fe3b0',
  amber: '#f2c46d',
  red: '#ff8a7a',
  violet: '#a7adff',
  cyan: '#7cc8ff',
};

// 输出行 = 着色片段数组
type Seg = [string, string];
type Win = { pose: Vec; title: string; cmd: string; out: Seg[][] };

// 三个终端窗：3D 位姿 + 标题 + 命令（不含提示符）+ 输出行（数值为 480×270 设计坐标）
const DATA: Win[] = [
  {
    pose: { x: -300, y: -34, z: -110, ry: 24 },
    title: '~/workspace — zsh',
    cmd: 'git status -sb',
    out: [
      [['## ', C.dim], ['main', C.green], ['...', C.dim], ['origin/main', C.red]],
      [[' M ', C.amber], ['src/timeline.ts', C.text]],
      [[' M ', C.amber], ['src/camera.ts', C.text]],
      [['?? ', C.red], ['fx/b01.js', C.dim]],
    ],
  },
  {
    pose: { x: 96, y: 62, z: 90, ry: -16 },
    title: 'dev server',
    cmd: 'npm run dev',
    out: [
      [['VITE v5.2.0', C.violet], ['  ready in ', C.dim], ['312 ms', C.text]],
      [['➜  ', C.green], ['Local:   ', C.text], ['http://localhost:3000', C.cyan]],
      [['➜  ', C.green], ['Network: ', C.dim], ['192.0.2.10:3000', C.dim]],
      [['watching ', C.dim], ['148', C.text], [' modules', C.dim]],
    ],
  },
  {
    pose: { x: 402, y: -74, z: -60, ry: -32 },
    title: 'logs',
    cmd: 'tail -f server.log',
    out: [
      [['12:04:11 ', C.dim], ['GET ', C.text], ['/api/render ', C.text], ['200', C.green], [' 41ms', C.dim]],
      [['12:04:12 ', C.dim], ['POST ', C.text], ['/api/queue ', C.text], ['201', C.green], [' 88ms', C.dim]],
      [['12:04:14 ', C.dim], ['worker#3 ', C.violet], ['frame 240/270', C.text]],
      [['12:04:15 ', C.dim], ['done → ', C.green], ['out/final.mp4', C.text]],
    ],
  },
];

// Step 时序：每窗 [飞行起, 飞行止]；TYPE 为各窗打字起点（均在到站之后）
const STEP = [[0, 0.02], [0.30, 0.44], [0.63, 0.77]];
const TYPE = [0.05, 0.455, 0.79];
const TYPE_LEN = 0.09; // 命令逐字打出时长
const OUT_AT = 0.095; // 输出首行起点（相对 TYPE）
const OUT_STAGGER = 0.016; // 输出逐行错峰
const OUT_DUR = 0.03; // 每行滑入时长 → 4 行在 TYPE+0.173 吐完
const PK = ['x', 'y', 'z', 'ry'];

const camAt = (t: number) =>
  acc(t, DATA[0].pose, [
    { at: STEP[1], to: DATA[1].pose },
    { at: STEP[2], to: DATA[2].pose },
  ], PK, E.inOutCubic);

const MONO = FONT.mono;

export const Terminal3D: React.FC = () => {
  const t = useT();

  // 相机姿态 = 关键帧累加（两段飞行，inOutCubic）
  const v = camAt(t);
  // 飞行途中拉远：两段过渡各一个正弦鼓包
  let pull = 0;
  for (let i = 1; i < 3; i++) {
    const u = seg(t, STEP[i][0], STEP[i][1]);
    pull += Math.sin(u * Math.PI) * 210;
  }

  // 相机横移的屏幕速度（px/帧，设计坐标 ×4）：喂给方向性运动模糊，静止段为 0
  const dt = 1 / 179;
  const vx = -(camAt(t + dt / 2).x - camAt(t - dt / 2).x) * 4;
  const vy = -(camAt(t + dt / 2).y - camAt(t - dt / 2).y) * 4;

  return (
    <AbsoluteFill>
    <SpeedBlur vx={vx} vy={vy} amount={0.16} max={12}>
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
          {/* 远景：深空渐变 + 一抹靛色余光 + 点阵（随相机横移反向视差） */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(60% 50% at 50% 100%, rgba(91,99,211,0.14), rgba(91,99,211,0) 70%), radial-gradient(120% 90% at 50% 0%,#151927,#07080e 70%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `radial-gradient(circle at ${K}px ${K}px, rgba(160,175,230,0.16) ${0.7 * K}px, rgba(160,175,230,0) ${1.2 * K}px)`,
              backgroundSize: `${14 * K}px ${14 * K}px`,
              backgroundPosition: `${(-v.x * 0.22 * K).toFixed(1)}px ${(-v.y * 0.22 * K).toFixed(1)}px`,
              WebkitMaskImage: 'radial-gradient(70% 70% at 50% 55%, #000 10%, transparent 100%)',
              maskImage: 'radial-gradient(70% 70% at 50% 55%, #000 10%, transparent 100%)',
            }}
          />
          {/* scene：透视容器 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
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
                // 打字机：命令逐字打出（只排已打出的字符），光标紧贴字尾闪烁
                const ty = seg(t, TYPE[i], TYPE[i] + TYPE_LEN);
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
                      borderRadius: 10 * K,
                      background: 'linear-gradient(180deg,#11131b 0%,#0c0e14 100%)',
                      overflow: 'hidden',
                      boxShadow: `0 ${24 * K}px ${60 * K}px rgba(0,0,0,.7), 0 0 ${40 * K}px rgba(110,124,240,${(0.1 * focus).toFixed(3)})`,
                      transform: `translate3d(${p.x * K}px,${p.y * K}px,${p.z * K}px) rotateY(${p.ry}deg)`,
                      opacity: 0.34 + focus * 0.66,
                      filter: `blur(${(1 - focus) * 2.2 * K}px) brightness(${0.7 + focus * 0.3})`,
                    }}
                  >
                    {/* 标题栏：红黄绿灯 + 居中标题 */}
                    <div
                      style={{
                        position: 'absolute', left: 0, top: 0, width: '100%', height: 22 * K,
                        background: 'linear-gradient(180deg,#1e222d,#181b24)',
                        boxShadow: `inset 0 ${-K * 0.5}px 0 rgba(255,255,255,0.06)`,
                      }}
                    >
                      {['#ff5f57', '#febc2e', '#28c840'].map((c, k) => (
                        <div
                          key={c}
                          style={{
                            position: 'absolute', left: (9 + k * 12) * K, top: 7.5 * K, width: 7 * K, height: 7 * K,
                            borderRadius: '50%', background: c,
                            boxShadow: `inset 0 0 0 ${0.5 * K}px rgba(0,0,0,0.22), inset 0 ${0.6 * K}px ${K}px rgba(255,255,255,0.25)`,
                          }}
                        />
                      ))}
                      <div
                        style={{
                          position: 'absolute', left: 0, top: 0, width: '100%', height: 22 * K, textAlign: 'center',
                          font: `600 ${7.5 * K}px/${22 * K}px ${FONT.sans}`, letterSpacing: '0.01em',
                          color: focus > 0.5 ? '#9aa3bd' : '#6c748c',
                        }}
                      >
                        {d.title}
                      </div>
                    </div>
                    {/* 命令行：常驻提示符 + 已打出字符 + 紧贴的光标 */}
                    <div
                      style={{
                        position: 'absolute', left: 12 * K, top: 32 * K,
                        font: `600 ${9.5 * K}px/1 ${MONO}`, color: C.prompt, whiteSpace: 'pre',
                      }}
                    >
                      <span style={{ color: 'rgba(111,227,176,0.6)' }}>$ </span>
                      {d.cmd.slice(0, n)}
                      <span
                        style={{
                          display: 'inline-block',
                          width: 5.6 * K,
                          height: 11 * K,
                          marginLeft: 0.6 * K,
                          verticalAlign: -1.6 * K,
                          borderRadius: 0.6 * K,
                          background: C.prompt,
                          opacity: caretOp,
                        }}
                      />
                    </div>
                    {/* 输出行：命令敲完后逐行 stagger 淡入 + 左滑归位 */}
                    {d.out.map((o, k) => {
                      const a = TYPE[i] + OUT_AT + k * OUT_STAGGER;
                      const ou = seg(t, a, a + OUT_DUR, E.outCubic);
                      return (
                        <div
                          key={k}
                          style={{
                            position: 'absolute', left: 12 * K, top: (52 + k * 16) * K,
                            font: `500 ${8.6 * K}px/1 ${MONO}`,
                            whiteSpace: 'pre',
                            opacity: ou,
                            transform: `translateX(${lerp(ou, -7, 0) * K}px)`,
                          }}
                        >
                          {o.map(([s, c], j) => (
                            <span key={j} style={{ color: c }}>{s}</span>
                          ))}
                        </div>
                      );
                    })}
                    {/* 发丝边 + 顶沿受光：画在最上层，标题栏不会盖住边线 */}
                    <div
                      style={{
                        position: 'absolute', inset: 0, borderRadius: 10 * K, pointerEvents: 'none',
                        boxShadow: `inset 0 0 0 ${K * 0.75}px rgba(255,255,255,0.08), inset 0 ${K}px 0 rgba(255,255,255,0.07)`,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DesignStage>
    </SpeedBlur>
    {/* 暗角与颗粒在运动模糊之外：不被拖影 */}
    <Vignette strength={0.42} color="#020306" />
    <Grain opacity={0.07} blend="soft-light" />
    </AbsoluteFill>
  );
};
