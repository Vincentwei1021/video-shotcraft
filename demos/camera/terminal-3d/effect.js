/* terminal-3d — MotionLab 动效模板（Terminal 3D 命令执行叙事流）
   自包含：直接在浏览器 <script> 引入即可；接 Remotion 时用 setup+render：
     const render = MotionLab.effect.setup(stageEl, MotionLab);
     render(frame / durationInFrames);   // 确定性 render(t)，t∈[0,1] */
(() => {
// ---- MotionLab 最小运行时（自包含；接 Remotion 时只需 setup+render） ----
const E = {
  linear: t => t, inQuad: t => t*t, outQuad: t => t*(2-t),
  inOutQuad: t => t<.5 ? 2*t*t : -1+(4-2*t)*t,
  inCubic: t => t*t*t, outCubic: t => 1 - Math.pow(1-t,3),
  inOutCubic: t => t<.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2,
  outQuart: t => 1 - Math.pow(1-t,4), outQuint: t => 1 - Math.pow(1-t,5),
  inQuart: t => t*t*t*t,
  outExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10*t),
  inExpo: t => t === 0 ? 0 : Math.pow(2, 10*t-10),
  outBack: (t, s=1.70158) => 1 + (s+1)*Math.pow(t-1,3) + s*Math.pow(t-1,2),
  inBack: (t, s=1.70158) => (s+1)*t*t*t - s*t*t,
  outElastic: t => t===0?0 : t===1?1 : Math.pow(2,-10*t) * Math.sin((t*10-.75)*(2*Math.PI/3)) + 1,
  spring: (t, bounce=.25) => { const w = 8 + 8*(1-bounce); return 1 - Math.exp(-6*t) * Math.cos(w*t*bounce*2.2); },
};
const lerp = (t, a, b) => a + (b-a)*t;
const seg = (t, t0, t1, ease=E.linear) => ease(Math.min(1, Math.max(0, (t-t0)/(t1-t0))));
// 确定性伪随机（等价 Remotion random(seed)，渲染可复现）
const rand = seed => { let x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const MotionLab = { E, lerp, seg, register(fx) { MotionLab.effect = fx; } };
const R = fx => MotionLab.register(fx);

// ---- 该效果依赖的文件级共享量 ----
const acc = (t, base, kfs, keys, seg, ease) => {
  const out = {};
  for (const k of keys) out[k] = base[k];
  let prev = base;
  for (const kf of kfs) {
    const u = seg(t, kf.at[0], kf.at[1], ease);
    for (const k of keys) out[k] += u * (kf.to[k] - prev[k]);
    prev = kf.to;
  }
  return out;
};

R({
  id: 'b01-terminal-3d', title: 'Terminal 3D 命令执行叙事流',
  src: 'remotion-bits.dev', cat: 'camera', dur: 6000,
  tags: ['相机逆变换飞行', '打字机触发时序', '通用终端窗'],
  desc: '多个通用桌面风格终端窗散布 3D 空间不同位置与角度，相机在窗间飞行（途中略微拉远）；每到一窗，窗内打字机敲出命令并逐行吐出结果，形成命令执行叙事流。',
  setup(stage, { E, lerp, seg }) {
    const scene = document.createElement('div');
    scene.style.cssText = 'position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 0%,#141826,#07080e 70%);perspective:900px;overflow:hidden';
    stage.appendChild(scene);
    const world = document.createElement('div');
    world.style.cssText = 'position:absolute;inset:0;transform-style:preserve-3d';
    scene.appendChild(world);

    const DATA = [
      { pose: { x: -300, y: -34, z: -110, ry: 24 }, cmd: '$ git status -sb', out: ['## main...origin/main', ' M src/timeline.ts', ' M src/camera.ts', '?? fx/b01.js'] },
      { pose: { x: 96, y: 62, z: 90, ry: -16 }, cmd: '$ npm run dev', out: ['vite v5.2.0  ready in 312 ms', '➜  local:   http://localhost:3000', '➜  network: 192.0.2.10:3000', 'watching 148 modules'] },
      { pose: { x: 402, y: -74, z: -60, ry: -32 }, cmd: '$ tail -f server.log', out: ['12:04:11 GET /api/render 200 41ms', '12:04:12 POST /api/queue 201 88ms', '12:04:14 worker#3 frame 240/270', '12:04:15 done → out/final.mp4'] },
    ];
    const wins = DATA.map((d, wi) => {
      const w = document.createElement('div');
      w.style.cssText = `position:absolute;left:50%;top:50%;width:300px;height:176px;margin:-88px 0 0 -150px;
        border-radius:9px;background:#0e1017;overflow:hidden;
        box-shadow:0 24px 60px rgba(0,0,0,.7),inset 0 0 0 1px #2a3040;`;
      const tb = document.createElement('div');
      tb.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:22px;background:linear-gradient(180deg,#242a38,#1b202b);border-bottom:1px solid #2c3242';
      w.appendChild(tb);
      ['#ff6058', '#ffbd2e', '#28ca42'].forEach((c, i) => {
        const dt = document.createElement('div');
        dt.style.cssText = `position:absolute;left:${9 + i * 13}px;top:8px;width:7px;height:7px;border-radius:50%;background:${c}`;
        tb.appendChild(dt);
      });
      const ttl = document.createElement('div');
      ttl.textContent = ['~/workspace — zsh', 'dev server', 'logs'][wi];
      ttl.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:22px;text-align:center;font:600 8px/22px ui-monospace,monospace;color:#77809b';
      tb.appendChild(ttl);

      const chars = [];
      const line = document.createElement('div');
      line.style.cssText = 'position:absolute;left:12px;top:32px;font:600 9.5px/1 ui-monospace,monospace;color:#9dffcf;white-space:pre';
      for (const ch of d.cmd) {
        const s = document.createElement('span');
        s.textContent = ch === ' ' ? ' ' : ch;
        s.style.opacity = 0;
        line.appendChild(s); chars.push(s);
      }
      const caret = document.createElement('span');
      caret.textContent = '▌';
      caret.style.cssText = 'color:#9dffcf';
      line.appendChild(caret);
      w.appendChild(line);

      const outs = d.out.map((o, i) => {
        const el = document.createElement('div');
        el.textContent = o;
        el.style.cssText = `position:absolute;left:12px;top:${52 + i * 16}px;font:500 9px/1 ui-monospace,monospace;
          color:${i === 0 ? '#c9d3ea' : '#7f8aa6'};white-space:pre;opacity:0`;
        w.appendChild(el);
        return el;
      });
      world.appendChild(w);
      return { el: w, chars, caret, outs, pose: d.pose };
    });

    // Step 时序：每窗 [飞行起, 飞行止, 打字起]
    const STEP = [[0, 0.02], [0.30, 0.44], [0.64, 0.78]];
    const TYPE = [0.05, 0.47, 0.81];
    const PK = ['x', 'y', 'z', 'ry'];
    return t => {
      const v = acc(t, wins[0].pose, [
        { at: STEP[1], to: wins[1].pose },
        { at: STEP[2], to: wins[2].pose },
      ], PK, seg, E.inOutCubic);
      // 飞行途中拉远：两段过渡各一个正弦鼓包
      let pull = 0;
      for (let i = 1; i < 3; i++) {
        const u = seg(t, STEP[i][0], STEP[i][1]);
        pull += Math.sin(u * Math.PI) * 210;
      }
      world.style.transform =
        `translateZ(${300 - pull}px) rotateY(${-v.ry}deg) translate3d(${-v.x}px,${-v.y}px,${-v.z}px)`;

      wins.forEach((w, i) => {
        const p = w.pose;
        w.el.style.transform = `translate3d(${p.x}px,${p.y}px,${p.z}px) rotateY(${p.ry}deg)`;
        const focus = 1 - Math.min(1, Math.abs(v.x - p.x) / 420);
        w.el.style.opacity = 0.34 + focus * 0.66;
        w.el.style.filter = `blur(${(1 - focus) * 2.2}px) brightness(${0.7 + focus * 0.3})`;

        // 打字机：命令逐字，输出逐行
        const ty = seg(t, TYPE[i], TYPE[i] + 0.09);
        const n = Math.floor(ty * w.chars.length + 0.0001);
        for (let c = 0; c < w.chars.length; c++) w.chars[c].style.opacity = c < n ? 1 : 0;
        w.caret.style.opacity = ty >= 1
          ? (Math.floor(t * 26) % 2 ? 0.15 : 0.9)
          : (Math.floor(t * 40) % 2 ? 0.35 : 1);
        w.caret.style.transform = `translateX(${(w.chars.length - n) * -0.1}px)`;
        w.outs.forEach((o, k) => {
          const ou = seg(t, TYPE[i] + 0.10 + k * 0.022, TYPE[i] + 0.145 + k * 0.022, E.outCubic);
          o.style.opacity = ou;
          o.style.transform = `translateX(${lerp(ou, -7, 0)}px)`;
        });
      });
    };
  },
});

// ---- 导出：CommonJS / ESM-interop / 浏览器全局三态 ----
// Node/Remotion: const { effect, MotionLab } = require('.../effect.js')
// 浏览器多文件共存: window.MotionLabEffects['<name>']
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { effect: MotionLab.effect, MotionLab };
} else if (typeof window !== 'undefined') {
  window.MotionLabEffects = window.MotionLabEffects || {};
  window.MotionLabEffects[MotionLab.effect.id] = { effect: MotionLab.effect, MotionLab };
  window.MotionLab = MotionLab; // 单文件场景的便捷句柄（多文件以 MotionLabEffects 为准）
}
})();
