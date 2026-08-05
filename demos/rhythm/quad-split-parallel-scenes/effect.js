/* quad-split-parallel-scenes — MotionLab 动效模板（Quad Split 四宫并行蒙太奇）
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
const ACCENT = '#7c5cff';
const ACCENT_SOFT = '#c9bcff';
const qBez = (a, b, c, t) => {
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * b[0] + t * t * c[0],
          u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]];
};

R({
  id: 'b26-quad-split-parallel-scenes',
  title: 'Quad Split 四宫并行蒙太奇',
  src: 'x.com/thiswillblossom',
  cat: 'rhythm', dur: 2100,
  tags: ['并行微场景', '错拍 stagger'],
  desc: '手法卡：画面硬切成 2×2 四宫格，四个象限并行跑各自独立的微场景（格内内容可任意替换，此处仅为示例），关键节拍互相错开 3-6 帧、全程无转场，靠并行密度制造信息轰炸。',
  setup(stage, { E, lerp, seg }) {
    const quads = [];
    // 四宫格底色走中性灰阶（深浅交替保证格线可读），需要主题色时换成项目色板
    const bgs = ['#c3c6cc', '#f2f1ef', '#e7e6e3', '#b8bcc3'];
    for (let i = 0; i < 4; i++) {
      const q = document.createElement('div');
      q.style.cssText = `position:absolute;left:${(i % 2) * 50}%;top:${(i >> 1) * 50}%;
        width:50%;height:50%;overflow:hidden;background:${bgs[i]};`;
      stage.appendChild(q);
      quads.push(q);
    }
    const F = 'system-ui,-apple-system,sans-serif';

    // ---- TL：迷你浏览器 + 逐字符打字 + 标签堆积 ----
    const brow = document.createElement('div');
    brow.style.cssText = `position:absolute;left:10%;top:22%;width:80%;height:60%;
      background:#fff;border-radius:10px;box-shadow:0 8px 24px rgba(20,40,80,.25);font-family:${F};`;
    brow.innerHTML = `
      <div style="display:flex;align-items:center;gap:5px;padding:8px 10px 4px">
        ${['#ff5f57','#febc2e','#28c840'].map(c => `<i style="width:7px;height:7px;border-radius:50%;background:${c}"></i>`).join('')}
        <div class="tabs" style="display:flex;flex:1;gap:3px;margin-left:6px;min-width:0"></div>
      </div>
      <div style="margin:6px 10px;height:22px;border-radius:11px;background:#f0f2f5;display:flex;align-items:center;padding:0 10px;font-size:10px;color:#333">
        <b style="color:#8a8f98;margin-right:6px">&#9670;</b><span class="ty1"></span><i class="cur1" style="width:1px;height:12px;background:#333;margin-left:1px"></i>
      </div>`;
    quads[0].appendChild(brow);
    const tabsBox = brow.querySelector('.tabs');
    const TABNAMES = ['Tab One', 'Tab Two', 'Tab Three', 'Tab Four', 'Tab Five', 'Tab Six'];
    const tabEls = TABNAMES.map(n => {
      const tb = document.createElement('div');
      tb.textContent = n;
      tb.style.cssText = `flex:1;min-width:0;overflow:hidden;white-space:nowrap;font-size:8px;
        color:#555;background:#e8eaee;border-radius:5px 5px 0 0;padding:2px 5px;transform:scale(0)`;
      tabsBox.appendChild(tb);
      return tb;
    });
    const TXT1 = "Placeholder headline text";
    const ty1 = brow.querySelector('.ty1'), cur1 = brow.querySelector('.cur1');

    // ---- TR：mono 打字 + 急推 ----
    const chat = document.createElement('div');
    chat.style.cssText = `position:absolute;inset:0;font-family:"SF Mono",Menlo,monospace;`;
    chat.innerHTML = `
      <div style="position:absolute;left:12%;top:24%;width:76%;background:#fbf8f1;border-radius:8px;
        box-shadow:0 6px 20px rgba(0,0,0,.12);padding:8px 12px 14px">
        <div style="display:flex;gap:4px;margin-bottom:6px">
          ${['#ff5f57','#febc2e','#28c840'].map(c => `<i style="width:6px;height:6px;border-radius:50%;background:${c}"></i>`).join('')}
        </div>
        <div style="font-size:8px;color:#8a8f98;margin-bottom:5px">✦ Section label ›</div>
        <div style="font-size:11px;color:#111"><span class="ty2"></span><span class="cur2">_</span></div>
      </div>`;
    quads[1].appendChild(chat);
    const TXT2 = 'and a second line of copy';
    const ty2 = chat.querySelector('.ty2'), cur2 = chat.querySelector('.cur2');

    // ---- BL：逐词入场 ----
    const line = document.createElement('div');
    line.style.cssText = `position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
      gap:7px;font-family:${F};font-weight:800;font-size:19px;color:#1a1a1a`;
    quads[2].appendChild(line);
    const wordEls = ['One', 'clear', 'message'].map(w => {
      const s = document.createElement('span');
      s.textContent = w;
      s.style.transform = 'scale(0)';
      line.appendChild(s);
      return s;
    });

    // ---- BR：pill 滑入 → 光标点击 → 卡片弹出 ----
    const br = document.createElement('div');
    br.style.cssText = `position:absolute;inset:0;font-family:${F}`;
    br.innerHTML = `
      <div class="card4" style="position:absolute;left:12%;bottom:46%;width:66%;background:rgba(255,255,255,.92);
        border-radius:8px;padding:6px 9px;font-size:8px;color:#222;transform:scale(0);transform-origin:20% 100%;
        box-shadow:0 5px 16px rgba(20,40,90,.25)"><b>You · just now</b><br>All good!</div>
      <div class="pill4" style="position:absolute;left:8%;bottom:26%;width:84%;height:26px;border-radius:13px;
        background:rgba(255,255,255,.55);backdrop-filter:blur(6px);display:flex;align-items:center;
        padding:0 8px;gap:6px;font-size:8px;box-shadow:0 4px 14px rgba(20,40,90,.2)">
        <span style="background:${ACCENT};color:#fff;border-radius:8px;padding:1px 5px">00:00</span>
        <span class="in4" style="flex:1;color:#666">Leave your comment...</span>
        <span class="send4" style="color:${ACCENT_SOFT}">➤</span>
      </div>
      <div class="dot4" style="position:absolute;width:9px;height:9px;border-radius:50%;background:#fff;
        border:1.5px solid #333;z-index:5;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`;
    quads[3].appendChild(br);
    const pill4 = br.querySelector('.pill4'), in4 = br.querySelector('.in4'),
          send4 = br.querySelector('.send4'), card4 = br.querySelector('.card4'), dot4 = br.querySelector('.dot4');

    return t => {
      const frame = Math.floor(t * 63); // dur 2100ms @30fps
      // TL —— 打字 + tab 弹入 + 慢推
      const n1 = Math.floor(seg(t, 0.02, 0.95) * TXT1.length);
      ty1.textContent = TXT1.slice(0, n1);
      cur1.style.opacity = frame % 16 < 8 ? 1 : 0;
      tabEls.forEach((tb, i) => {
        const k = seg(t, 0.08 + i * 0.13, 0.08 + i * 0.13 + 0.09, E.outBack);
        tb.style.transform = `scale(${k})`;
      });
      brow.style.transform = `scale(${lerp(E.inQuad(t), 1, 1.45)})`;
      brow.style.transformOrigin = '50% 78%';

      // TR —— mono 打字 + whip 急推（错拍：0.42-0.54）
      const n2 = Math.floor(seg(t, 0.06, 0.9) * TXT2.length);
      ty2.textContent = TXT2.slice(0, n2);
      cur2.style.opacity = (frame + 5) % 14 < 7 ? 1 : 0;
      const zip = seg(t, 0.42, 0.54, E.inOutCubic);
      chat.style.transform = `scale(${lerp(zip, 1, 2.1)})`;
      chat.style.transformOrigin = '46% 42%';
      chat.style.filter = `blur(${Math.sin(zip * Math.PI) * 4}px)`;

      // BL —— 三次逐词（0.24 / 0.46 / 0.56，与其他象限错开）
      wordEls.forEach((s, i) => {
        const k = seg(t, [0.24, 0.46, 0.56][i], [0.24, 0.46, 0.56][i] + 0.1, E.outBack);
        s.style.transform = `scale(${k}) translateY(${(1 - k) * 8}px)`;
        s.style.opacity = Math.min(1, k * 2);
      });

      // BR —— 五步交互
      const slide = seg(t, 0.12, 0.3, E.outBack);
      pill4.style.transform = `translateX(${(1 - slide) * 120}%)`;
      const m1 = seg(t, 0.3, 0.42, E.inOutCubic);
      const m2 = seg(t, 0.62, 0.74, E.inOutCubic);
      let p;
      if (m2 > 0) p = qBez([44, 66], [66, 52], [82, 68], m2);
      else p = qBez([88, 30], [50, 40], [44, 66], m1);
      dot4.style.left = p[0] + '%'; dot4.style.top = p[1] + '%';
      const c1 = seg(t, 0.42, 0.47), c2 = seg(t, 0.74, 0.79);
      dot4.style.transform = `scale(${1 - Math.sin(c1 * Math.PI) * 0.3 - Math.sin(c2 * Math.PI) * 0.3})`;
      const n4 = Math.floor(seg(t, 0.46, 0.62) * 9);
      in4.textContent = t < 0.44 ? 'Leave your comment...' : 'All good!'.slice(0, n4) || '';
      in4.style.color = t < 0.44 ? '#666' : '#111';
      send4.style.color = n4 >= 9 ? ACCENT : ACCENT_SOFT;
      const pop = seg(t, 0.8, 0.88, E.outBack);
      card4.style.transform = `scale(${pop})`;
      pill4.style.marginBottom = `${-pop * 4}px`;
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
