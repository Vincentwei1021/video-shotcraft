/* typing-code-block — MotionLab 动效模板（Code Block Reveal 代码块揭示）
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

R({
  id: 'b03-typing-code-block', title: 'Code Block Reveal 代码块揭示',
  src: 'remotion-bits.dev', cat: 'typography', dur: 4600,
  tags: ['逐行淡入', '保色逐字打'],
  desc: '同一段语法高亮代码的两种 reveal 对照：左侧逐行淡入上浮（行级 stagger），右侧逐字符打字但保持 token 着色，当前字符带方块光标。',
  setup(stage, { E, seg }) {
    stage.style.background = '#0a0b10';
    // token: [text, color]
    const K = '#c792ea', ID = '#e8eaf0', FN = '#82aaff', ST = '#c3e88d', PU = '#89ddff', CM = '#546e7a';
    const LINES = [
      [['const ', K], ['app', ID], [' = ', PU], ['createApp', FN], ['();', ID]],
      [['app', ID], ['.', PU], ['use', FN], ['(', ID], ['router', ID], [');', ID]],
      [['app', ID], ['.', PU], ['mount', FN], ['(', ID], ["'#root'", ST], [');', ID]],
      [['// ready', CM]],
    ];
    const mkPanel = (x, label) => {
      const p = document.createElement('div');
      p.style.cssText = `position:absolute;left:${x}%;top:14%;width:45%;height:72%;
        background:#10121a;border:1px solid #1c2030;border-radius:8px;padding:10px 12px;
        box-sizing:border-box;font-family:"SF Mono",Menlo,monospace;font-size:12px;line-height:1.9;`;
      const tag = document.createElement('div');
      tag.textContent = label;
      tag.style.cssText = 'font-size:8px;letter-spacing:2px;color:#4a5270;margin-bottom:6px;';
      p.appendChild(tag);
      stage.appendChild(p);
      return p;
    };
    // 左：逐行淡入
    const pL = mkPanel(3.5, 'LINE FADE-IN');
    const rowsL = LINES.map(line => {
      const div = document.createElement('div');
      for (const [txt, color] of line) {
        const s = document.createElement('span');
        s.textContent = txt; s.style.color = color;
        div.appendChild(s);
      }
      pL.appendChild(div);
      return div;
    });
    // 右：逐字符打字（保色）
    const pR = mkPanel(51.5, 'CHAR TYPING');
    const chars = [];
    for (const line of LINES) {
      const div = document.createElement('div');
      div.style.minHeight = '1.9em';
      for (const [txt, color] of line) for (const ch of txt) {
        const s = document.createElement('span');
        s.textContent = ch; s.style.color = color;
        div.appendChild(s);
        chars.push(s);
      }
      pR.appendChild(div);
    }
    return t => {
      rowsL.forEach((row, i) => {
        const k = seg(t, 0.08 + i * 0.14, 0.08 + i * 0.14 + 0.3, E.outCubic);
        row.style.opacity = k;
        row.style.transform = `translateY(${(1 - k) * 8}px)`;
      });
      const typed = Math.floor(seg(t, 0.08, 0.9) * chars.length);
      chars.forEach((s, i) => {
        s.style.opacity = i < typed ? 1 : 0;
        s.style.background = i === typed && typed < chars.length ? '#3a4468' : 'transparent';
        if (i === typed) s.style.opacity = 1; // 光标位字符以底色块形式提示
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
