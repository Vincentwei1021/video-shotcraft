/* countdown-arc-scatter — MotionLab 动效模板（Countdown Arc 表盘数字扫过）
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
const ACCENT = '#3b82f6';
const ACCENT_RGB = [59, 130, 246];

R({
  id: 'b11-countdown-arc-scatter',
  title: 'Countdown Arc 表盘数字扫过',
  src: 'x.com/1amanly',
  cat: 'typography', dur: 1100,
  tags: ['弧线刻度盘', 'outCubic 减速急停', '数字留位接标题'],
  desc: '白底表盘：等大深色数字沿同一大弧切向排布，整盘扫过 ~96° 减速急停（数字随位置角在弧两端淡入/淡出），短刻度线同步回正；"5" 停上弧顶后落位成标题首字符，"min / to / install" 逐词模糊淡入，结尾整词转强调色（末双字母收尾的染色手法保留）。',
  setup(stage, { E, lerp, seg }) {
    const wrap = document.createElement('div');
    wrap.style.cssText = `position:absolute;inset:0;background:#fff;overflow:hidden;
      font-family:-apple-system,system-ui,sans-serif;`;
    stage.appendChild(wrap);
    const pivot = document.createElement('div');
    pivot.style.cssText = 'position:absolute;left:50%;top:58%;width:0;height:0;';
    wrap.appendChild(pivot);

    const R0 = 150, SP = 24, INK = '#17181c';
    // i=6 是 "5"，落位时角度归零停在弧顶
    const NUMS = [45, 35, 28, 22, 17, 10, 5, 4, 3];
    const items = NUMS.map((n, i) => {
      const el = document.createElement('div');
      el.textContent = n;
      el.style.cssText = `position:absolute;left:0;top:0;color:${INK};font-weight:600;
        font-size:40px;letter-spacing:-0.5px;white-space:nowrap;`;
      pivot.appendChild(el);
      return { el, ang: (i - 6) * SP, is5: n === 5 };
    });

    // 短刻度指针（深色细线，随盘转动回正）
    const tickRot = document.createElement('div');
    tickRot.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;';
    const tick = document.createElement('div');
    tick.style.cssText = `position:absolute;left:-1.5px;top:-101px;width:3px;height:26px;
      border-radius:2px;background:${INK};`;
    tickRot.appendChild(tick);
    pivot.appendChild(tickRot);

    // 标题（相对 pivot 定位，中性占位文案），"5" 落到其左端
    const target = { x: -148, y: -30 };
    const title = document.createElement('div');
    title.style.cssText = `position:absolute;left:-124px;top:-30px;transform:translateY(-50%);
      color:${INK};font-weight:600;font-size:40px;letter-spacing:-0.5px;white-space:nowrap;`;
    title.innerHTML = `<span style="display:inline-block;margin-right:11px">min</span
      ><span style="display:inline-block;margin-right:11px">to</span
      ><span style="display:inline-block">install</span>`;
    const words = [...title.children];
    const lastWord = words[2];
    pivot.appendChild(title);

    const mix = (k, a, b) => Math.round(lerp(k, a, b));
    return t => {
      // 整盘扫过：+96° → 0°，outCubic 减速急停
      const rot = lerp(seg(t, 0, 0.52, E.outCubic), 96, 0);
      const hand = seg(t, 0.52, 0.7, E.inOutCubic); // "5" 落位平移
      const out = seg(t, 0.5, 0.7, E.inQuad);       // 其余数字原地淡出

      for (const it of items) {
        const pa = it.ang + rot;                    // 当前位置角
        const rad = pa * Math.PI / 180;
        let x = Math.sin(rad) * R0, y = -Math.cos(rad) * R0;
        let rSelf = pa;                             // 切向排布：随位置角自转
        let op = Math.max(0, Math.min(1, (70 - Math.abs(pa)) / 22)); // 弧两端淡入淡出
        if (it.is5) {
          x = lerp(hand, x, target.x); y = lerp(hand, y, target.y);
          rSelf *= (1 - hand);
        } else {
          op *= (1 - out);
          it.el.style.filter = `blur(${out * 3}px)`;
        }
        it.el.style.opacity = op;
        it.el.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) rotate(${rSelf}deg)`;
      }
      tickRot.style.transform = `rotate(${rot * 0.35}deg)`;
      tick.style.opacity = 1 - out;

      // 逐词模糊淡入：min → to → install
      [[0.54, 0.68], [0.62, 0.78], [0.7, 0.9]].forEach(([a, b], k) => {
        const p = seg(t, a, b, E.outCubic);
        words[k].style.opacity = p;
        words[k].style.filter = `blur(${(1 - p) * 6}px)`;
      });
      // 结尾整词（末双字母收尾）转强调色 #17181c → ACCENT
      const bl = seg(t, 0.84, 0.98);
      lastWord.style.color = `rgb(${mix(bl, 23, ACCENT_RGB[0])},${mix(bl, 24, ACCENT_RGB[1])},${mix(bl, 28, ACCENT_RGB[2])})`;
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
