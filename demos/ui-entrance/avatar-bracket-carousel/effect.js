/* avatar-bracket-carousel — MotionLab 动效模板（Bracket Carousel 对焦框头像轮换）
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

R({
  id: 'b11-avatar-bracket-carousel',
  title: 'Bracket Carousel 对焦框头像轮换',
  src: 'x.com/1amanly',
  cat: 'ui-entrance', dur: 5200,
  tags: ['取景框锁定', '垂直滚轮 spring', '距离衰减 scale'],
  desc: '"Your ___ teammates" 填空排版：四角对焦框锁定当前头像，头像队列垂直 spring 轮换，入框放大清晰、出框缩小淡化，角色标签同步更换，两侧文字不动。',
  setup(stage, { E, seg }) {
    const wrap = document.createElement('div');
    wrap.style.cssText = `position:absolute;inset:0;background:#0b0c12;overflow:hidden;
      display:flex;align-items:center;justify-content:center;gap:22px;
      font-family:-apple-system,system-ui,sans-serif;`;
    stage.appendChild(wrap);

    const mkWord = w => {
      const s = document.createElement('div');
      s.textContent = w;
      s.style.cssText = 'color:#eef1f8;font-weight:800;font-size:34px;letter-spacing:-0.5px;';
      wrap.appendChild(s);
      return s;
    };
    mkWord('Your');

    // 中央对焦框 + 头像列
    const slot = document.createElement('div');
    slot.style.cssText = 'position:relative;width:92px;height:92px;flex:none;';
    wrap.appendChild(slot);

    const bracket = document.createElement('div');
    bracket.innerHTML = `<svg width="92" height="92" viewBox="0 0 92 92">
      ${[[4,4,'M4,26 L4,4 L26,4'],[88,4,'M66,4 L88,4 L88,26'],
         [88,88,'M88,66 L88,88 L66,88'],[4,88,'M26,88 L4,88 L4,66']]
        .map(c => `<path d="${c[2]}" fill="none" stroke="${ACCENT}" stroke-width="4"
          stroke-linecap="round"/>`).join('')}</svg>`;
    bracket.style.cssText = 'position:absolute;inset:0;z-index:3;';

    const col = document.createElement('div');
    col.style.cssText = 'position:absolute;left:50%;top:50%;width:0;height:0;';
    /* 头像底色走中性灰阶梯度（仅用于区分队列项），强调色只留在对焦框上 */
    const AV = [
      { c: '#4a4d59', e: '🎨', role: 'Designer' },
      { c: '#5b6070', e: '💬', role: 'Support' },
      { c: '#6d7383', e: '📊', role: 'Analyst' },
      { c: '#828796', e: '✍️', role: 'Writer' },
    ];
    const avatars = AV.map((a, i) => {
      const el = document.createElement('div');
      el.textContent = a.e;
      el.style.cssText = `position:absolute;left:-29px;top:-29px;width:58px;height:58px;
        border-radius:50%;background:${a.c};display:flex;align-items:center;
        justify-content:center;font-size:26px;box-shadow:0 6px 18px rgba(0,0,0,.4);`;
      col.appendChild(el);
      return el;
    });
    slot.appendChild(col);
    slot.appendChild(bracket);

    mkWord('teammates');

    // 角色标签
    const labels = AV.map(a => {
      const l = document.createElement('div');
      l.textContent = a.role;
      l.style.cssText = `position:absolute;left:50%;top:50%;transform:translate(-50%,64px);
        color:#8f97b3;font-size:12px;font-weight:600;letter-spacing:1px;opacity:0;`;
      slot.appendChild(l);
      return l;
    });

    const STEP = 76;
    return t => {
      // 三次切换：0.24 / 0.46 / 0.68，spring 手感
      let pos = 0;
      [0.24, 0.46, 0.68].forEach(s0 => { pos += seg(t, s0, s0 + 0.14, k => E.spring(k, 0.25)); });

      avatars.forEach((el, k) => {
        const d = Math.abs(k - pos);
        const sc = Math.max(0.5, 1 - d * 0.38);
        const op = Math.max(0, 1 - d * 0.62);
        el.style.transform = `translateY(${(k - pos) * STEP}px) scale(${sc})`;
        el.style.opacity = op * seg(t, 0.02 + k * 0.03, 0.12 + k * 0.03);
        el.style.filter = `blur(${Math.min(3, d * 2.4)}px)`;
      });

      labels.forEach((l, k) => { l.style.opacity = Math.max(0, 1 - Math.abs(k - pos) * 2.2); });

      // 切换瞬间 bracket 呼吸
      let breath = 0;
      [0.24, 0.46, 0.68].forEach(s0 => { breath += Math.sin(seg(t, s0, s0 + 0.1) * Math.PI); });
      bracket.style.transform = `scale(${1 + Math.min(1, breath) * 0.07})`;
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
