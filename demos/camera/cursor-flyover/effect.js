/* cursor-flyover — MotionLab 动效模板（Cursor Flyover 四角巡览指点）
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
  id: 'b01-cursor-flyover', title: 'Cursor Flyover 四角巡览指点',
  src: 'remotion-bits.dev', cat: 'camera', dur: 6000,
  tags: ['corner anchor 相机', 'easeInOutCubic 过渡+停留', 'SVG 光标跟随'],
  desc: '产品截图平铺，相机先整体俯瞰淡入，再依次飞到四个角落 zoom-in 特写；一枚带阴影的 SVG 光标跟到对应区域指点并留下点击涟漪。每步过渡+停留等长，easeInOutCubic。',
  setup(stage, { E, lerp, seg }) {
    const scene = document.createElement('div');
    scene.style.cssText = 'position:absolute;inset:0;background:#080910;overflow:hidden';
    stage.appendChild(scene);
    const world = document.createElement('div');
    world.style.cssText = 'position:absolute;inset:0;transform-origin:0 0';
    scene.appendChild(world);

    // ---- 截图占位：窗口 chrome + 侧栏 + 四象限控件 ----
    const shot = document.createElement('div');
    shot.style.cssText = `position:absolute;left:4%;top:5%;width:92%;height:90%;border-radius:10px;
      background:#12141d;box-shadow:0 24px 60px rgba(0,0,0,.6),inset 0 0 0 1px #262c3b;overflow:hidden`;
    world.appendChild(shot);
    const bar = document.createElement('div');
    bar.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:9%;background:#1a1d28;border-bottom:1px solid #262c3b';
    shot.appendChild(bar);
    ['#ff6058', '#ffbd2e', '#28ca42'].forEach((c, i) => {
      const d = document.createElement('div');
      d.style.cssText = `position:absolute;left:${8 + i * 12}px;top:50%;width:6px;height:6px;margin-top:-3px;
        border-radius:50%;background:${c}`;
      bar.appendChild(d);
    });
    const url = document.createElement('div');
    url.textContent = 'app.example.com/overview';
    url.style.cssText = `position:absolute;left:56px;top:50%;transform:translateY(-50%);height:13px;line-height:13px;
      padding:0 10px;border-radius:7px;background:#0f1119;color:#5d6580;
      font:500 8px/13px ui-monospace,monospace;letter-spacing:.4px`;
    bar.appendChild(url);
    const side = document.createElement('div');
    side.style.cssText = 'position:absolute;left:0;top:9%;width:15%;height:91%;background:#161923;border-right:1px solid #232937';
    shot.appendChild(side);
    ['Overview', 'Traffic', 'Revenue', 'Cohorts', 'Alerts'].forEach((s, i) => {
      const it = document.createElement('div');
      it.textContent = s;
      it.style.cssText = `position:absolute;left:8%;top:${8 + i * 15}%;width:84%;height:11%;border-radius:5px;
        font:600 7px/1 -apple-system,sans-serif;color:${i === 0 ? '#cfd6ea' : '#5a6280'};
        display:flex;align-items:center;padding-left:6px;background:${i === 0 ? '#222839' : 'transparent'}`;
      side.appendChild(it);
    });

    const quad = (x, y, w, h) => {
      const q = document.createElement('div');
      q.style.cssText = `position:absolute;left:${x}%;top:${y}%;width:${w}%;height:${h}%;border-radius:8px;
        background:#191d29;box-shadow:inset 0 0 0 1px #262c3b`;
      shot.appendChild(q);
      return q;
    };
    // 左上：stat tiles
    const q1 = quad(18, 14, 38, 36);
    ['12.4k', '+38%', '4.1s'].forEach((s, i) => {
      const tile = document.createElement('div');
      tile.innerHTML = `<div style="font:700 13px/1 -apple-system,sans-serif;color:#e7ecfb">${s}</div>
        <div style="margin-top:4px;font:600 6px/1 -apple-system,sans-serif;letter-spacing:1px;color:#5d6580">METRIC ${i + 1}</div>`;
      tile.style.cssText = `position:absolute;left:${5 + i * 31.5}%;top:16%;width:28%;height:44%;border-radius:6px;
        background:#202634;padding:8px 0 0 8px;box-sizing:border-box`;
      q1.appendChild(tile);
    });
    // 右上：折线图
    const q2 = quad(59, 14, 37, 36);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 46');
    svg.style.cssText = 'position:absolute;left:6%;top:16%;width:88%;height:70%';
    let dd = '';
    for (let i = 0; i <= 14; i++) dd += `${i === 0 ? 'M' : 'L'}${i * 7.14},${40 - (6 + rand(i * 5) * 22 + i * 0.7)} `;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', dd); path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#6c8cff'); path.setAttribute('stroke-width', '1.6');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path); q2.appendChild(svg);
    // 右下：柱状图
    const q3 = quad(59, 55, 37, 34);
    for (let i = 0; i < 9; i++) {
      const b = document.createElement('div');
      const hh = 22 + rand(i * 3 + 1) * 55;
      b.style.cssText = `position:absolute;left:${7 + i * 9.8}%;bottom:14%;width:6.4%;height:${hh}%;
        border-radius:2px;background:linear-gradient(180deg,#c86cff,#5c4bd6)`;
      q3.appendChild(b);
    }
    // 左下：表格行
    const q4 = quad(18, 55, 38, 34);
    for (let i = 0; i < 5; i++) {
      const row = document.createElement('div');
      row.style.cssText = `position:absolute;left:6%;top:${12 + i * 17}%;width:88%;height:11%;border-radius:3px;
        background:#202634;box-shadow:inset ${30 + rand(i + 2) * 45}% 0 0 rgba(108,140,255,.35)`;
      q4.appendChild(row);
    }

    // ---- 光标（world 内锚定，逐帧反缩放保持屏幕尺寸）----
    const cur = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    cur.setAttribute('viewBox', '0 0 24 24');
    cur.style.cssText = `position:absolute;left:0;top:0;width:22px;height:22px;transform-origin:0 0;
      filter:drop-shadow(0 3px 5px rgba(0,0,0,.75));pointer-events:none;z-index:40`;
    const cp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    cp.setAttribute('d', 'M4 2 L4 19 L9 14.4 L12.2 21.5 L15.4 20 L12.2 13 L19 12.6 Z');
    cp.setAttribute('fill', '#fff'); cp.setAttribute('stroke', '#101320'); cp.setAttribute('stroke-width', '1.1');
    cur.appendChild(cp); world.appendChild(cur);
    const ring = document.createElement('div');
    ring.style.cssText = `position:absolute;left:0;top:0;width:26px;height:26px;
      border-radius:50%;border:2px solid #8fa7ff;opacity:0;z-index:39;transform-origin:50% 50%`;
    world.appendChild(ring);

    // 相机 Step：overview + 四角；光标目标（world %）
    const CAM = [
      { tx: 50, ty: 50, s: 0.8, cx: 50, cy: 52 },
      { tx: 37, ty: 32, s: 1.72, cx: 41, cy: 38 },
      { tx: 77, ty: 32, s: 1.72, cx: 82, cy: 36 },
      { tx: 77, ty: 72, s: 1.72, cx: 71, cy: 76 },
      { tx: 37, ty: 72, s: 1.72, cx: 33, cy: 78 },
    ];
    const WIN = [[0.20, 0.32], [0.40, 0.52], [0.60, 0.72], [0.79, 0.91]];
    const KEY = ['tx', 'ty', 's', 'cx', 'cy'];
    return t => {
      const v = acc(t, CAM[0], WIN.map((w, i) => ({ at: w, to: CAM[i + 1] })), KEY, seg, E.inOutCubic);
      world.style.transform = `translate(${50 - v.tx * v.s}%,${50 - v.ty * v.s}%) scale(${v.s})`;
      const fade = seg(t, 0, 0.14, E.outCubic);
      world.style.opacity = fade;
      shot.style.filter = `blur(${(1 - fade) * 5}px)`;

      cur.style.left = v.cx + '%'; cur.style.top = v.cy + '%';
      cur.style.transform = `scale(${1 / v.s})`;
      // 每次落位时的点击涟漪
      let click = 0, hold = 0;
      for (let i = 0; i < WIN.length; i++) {
        const c = seg(t, WIN[i][1], WIN[i][1] + 0.055, E.outCubic);
        if (c > 0 && c < 1) { click = c; hold = 1; }
        else if (c >= 1 && t < (WIN[i + 1] ? WIN[i + 1][0] : 1.01)) { click = 1; hold = 1; }
      }
      ring.style.left = v.cx + '%'; ring.style.top = v.cy + '%';
      ring.style.opacity = hold ? (1 - click) * 0.85 : 0;
      ring.style.transform = `translate(-50%,-50%) scale(${(0.3 + click * 1.6) / v.s})`;
      cp.setAttribute('fill', click > 0 && click < 0.4 ? '#dfe6ff' : '#fff');
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
