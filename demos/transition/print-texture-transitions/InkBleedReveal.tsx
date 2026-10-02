// 墨渗揭示（ink-bleed-reveal）——一滴墨落在纸上洇开，须状渗边快慢不匀地吃掉旧景，新景在墨里显影。
//
// 第二轮重设计（纸 → 墨 · 杂志章节换页）：
// - look = paper（暖白纸 · 墨 · 朱红）。旧景是一本虚构刊物《The Field Report》的第 02 章扉页：
//   衬线 150px 大标题 + 朱红斜体关键词 + 正文双栏（纹理级小字）+ 刊头书眉，静态纸纹。
// - 新景就是"墨"本身：第 03 章扉页印在深靛墨底上（纸色衬线 170px 标题 + 朱红斜体 + 560px 描边章号），
//   墨洇到哪里，新章就"印"到哪里——介质隐喻闭环：墨不是盖住旧页的遮罩，而是新页的底色。
// - 墨的物理：①墨滴从画外落下（ease-in 重力加速，按速度纵向拉长）→ ②触纸瞬间溅出主墨团 + 7 粒卫星墨点（snappy 外飞）
//   → ③主墨团快慢不匀地洇开（ease-out + ±7% 低频扰动，末段衰减归零），卫星墨点同步长大、被主墨团吞并。
//   四层遮罩共用同一 seed 的 feTurbulence + feDisplacementMap 造须状渗边——filter 只揉遮罩形状、不揉画面：
//   湿晕（纸被水洇湿的一圈极淡暖暗，重羽化）/ 淡墨须边（高频噪声、半透明靛灰，跑在最前）/
//   墨边（比墨底更浓，领先新景 8–18px：真实墨迹边缘颜料最浓）/ 新景显影。
// - 显影：新景在墨里 scale 1.03→1 轻收；洇满后（106f）摘掉 SVG 直接铺新景，结尾像素级真静止；
//   随后朱红细线描出、副题由虚到实，相机极缓推近。
//
// 时间表（30fps，共 152f）：
//   0–8     旧景建立（第 0 帧即完整扉页，纸面极缓推近）
//   8–18    墨滴落下：10f 自由落体（位移 ∝ t²），越落越快、纵向拉长
//   18–26   触纸：主墨团 0→64px 过冲、7 粒卫星墨点外飞并各自洇开一点
//   24–104  洇开：半径 → 1564px（线性与 ease-out 各半），±7% 扰动 84–104f 衰减归零；
//           淡墨须边跑在最前、浓墨边紧随、新景在墨里显影
//   106     摘罩，新景真身就位
//   104–130 跟随：朱红细线描出（104）、副题逐词由虚到实（110）
//   130–152 hold：第 03 章扉页定格，相机极缓推近 1.5%
import React, { useId } from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, FONT, Grain, bezier, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, SERIF, TextReveal, alpha, type } from '../../_fixtures/Look';

export const INK_BLEED_REVEAL_DURATION = 152;

const L = LOOKS.paper;
const INK_BG = '#10121f'; // 墨底（带靛的黑，不用纯黑）
const INK_EDGE = '#06070d'; // 墨边：比墨底更浓
const PAPER_ON_INK = '#f1ead9'; // 印在墨上的"纸色"字

// 落墨点：画面右中，让新章大标题（左侧）最后被墨染到
const CX = 1250, CY = 470;
const DROP0 = 8, IMPACT = 18, BLEED0 = 24, BLEED1 = 104, SETTLE = 106;

const hash = (n: number) => {
  const x = Math.sin(n * 91.345 + 47.853) * 43758.5453;
  return x - Math.floor(x);
};
// 卫星墨点：角度 / 距离 / 半径（确定性）
const SATS = Array.from({ length: 7 }, (_, i) => {
  const a = (i / 7) * Math.PI * 2 + hash(i * 3.3) * 0.7;
  const d = 96 + hash(i * 5.1) * 150;
  return { dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.86, r: 7 + hash(i * 7.9) * 15 };
});

// ───────────── 旧景：第 02 章扉页（纸）─────────────
const PaperPage: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 85% 75% at 40% 36%, #faf6ee 0%, ${L.bg[1]} 58%, ${L.bg[2]} 100%)`, color: L.ink }}>
    {/* 书眉 */}
    <div style={{ position: 'absolute', left: 120, right: 120, top: 84, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 18, borderBottom: `1.5px solid ${L.ink}` }}>
      <span style={{ ...type(28, 700, { caps: true }), letterSpacing: '0.2em' }}>The Field Report</span>
      <span style={{ ...type(28, 450, { serif: true }), fontStyle: 'italic', color: L.ink2 }}>No. 7 — Autumn 2026</span>
    </div>
    <div style={{ position: 'absolute', left: 120, top: 236, width: 1000 }}>
      <div style={{ ...type(30, 600, { mono: true }), letterSpacing: '0.24em', color: L.accent }}>CHAPTER 02</div>
      <div style={{ ...type(150, 500, { serif: true }), letterSpacing: '-0.035em', lineHeight: 0.98, marginTop: 34 }}>
        Measuring<br />what <span style={{ fontStyle: 'italic', color: L.accent }}>matters.</span>
      </div>
      <div style={{ width: 140, height: 3, background: L.ink, margin: '50px 0 34px' }} />
      <div style={{ ...type(44, 450, { serif: true }), color: L.ink2, lineHeight: 1.3 }}>One dashboard for every<br />signal your team ships.</div>
    </div>
    {/* 正文双栏：纹理级小字（降对比，不当内容读） */}
    <div style={{ position: 'absolute', left: 1240, top: 250, width: 560, display: 'flex', gap: 40, color: alpha(L.ink, 0.42), ...type(19, 420, { serif: true }), lineHeight: 1.55, textAlign: 'justify' }}>
      {[0, 1].map((c) => (
        <div key={c} style={{ flex: 1 }}>
          {c === 0 && <span style={{ float: 'left', ...type(92, 500, { serif: true }), lineHeight: 0.8, marginRight: 8, marginTop: 6, color: L.ink }}>W</span>}
          {c === 0
            ? 'e asked four hundred teams what they look at first each morning. Almost none of them named the metric their dashboard put on top. The numbers that mattered were quieter: the time a review waited, the build that failed twice, the customer who wrote back. This chapter is about finding those signals and giving them room.'
            : 'Good instruments do not shout. They hold still until something changes, and then they make the change impossible to miss. Over the next pages we follow three teams who rebuilt their mornings around that idea, and what it cost them to throw the old charts away.'}
        </div>
      ))}
    </div>
    <div style={{ position: 'absolute', left: 120, right: 120, bottom: 84, display: 'flex', justifyContent: 'space-between', ...type(26, 450, { serif: true }), color: L.ink3 }}>
      <span>— 24 —</span><span style={{ fontStyle: 'italic' }}>Measuring what matters</span>
    </div>
    <Grain opacity={0.09} step={100000} freq={0.9} blend="multiply" />
  </div>
);

// ───────────── 新景：第 03 章扉页（墨）─────────────
const InkPage: React.FC<{ frame: number }> = ({ frame }) => {
  const rule = ramp(frame, 104, 18, EASE.snappy);
  return (
    <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 80% 80% at 62% 44%, #181b2e 0%, ${INK_BG} 60%, #0a0b14 100%)`, color: PAPER_ON_INK, fontFamily: FONT.sans }}>
      {/* 描边大章号（纹理） */}
      <div style={{
        position: 'absolute', right: 70, top: 120, ...type(600, 400, { serif: true }), letterSpacing: '-0.06em', lineHeight: 1,
        color: 'transparent', WebkitTextStroke: `2px ${alpha(PAPER_ON_INK, 0.16)}`,
      }}>03</div>
      <div style={{ position: 'absolute', left: 120, right: 120, top: 84, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 18, borderBottom: `1.5px solid ${alpha(PAPER_ON_INK, 0.5)}` }}>
        <span style={{ ...type(28, 700, { caps: true }), letterSpacing: '0.2em' }}>The Field Report</span>
        <span style={{ ...type(28, 450, { serif: true }), fontStyle: 'italic', color: alpha(PAPER_ON_INK, 0.6) }}>No. 7 — Autumn 2026</span>
      </div>
      <div style={{ position: 'absolute', left: 120, top: 236, width: 1200 }}>
        <div style={{ ...type(30, 600, { mono: true }), letterSpacing: '0.24em', color: '#ff6a4d' }}>CHAPTER 03</div>
        <div style={{ ...type(176, 500, { serif: true }), letterSpacing: '-0.035em', lineHeight: 0.96, marginTop: 30 }}>
          The quiet<br /><span style={{ fontStyle: 'italic', color: '#ff6a4d' }}>signal.</span>
        </div>
        <div style={{ width: 140, height: 3, background: '#ff6a4d', margin: '48px 0 34px', transform: `scaleX(${rule.toFixed(4)})`, transformOrigin: '0 50%' }} />
        <div style={{ ...type(46, 450, { serif: true }), color: alpha(PAPER_ON_INK, 0.78), lineHeight: 1.3 }}>
          <TextReveal text="What 2,400 teams taught us" start={110} by="word" variant="blur" each={16} gap={2.5} />
          <br />
          <TextReveal text="about paying attention." start={118} by="word" variant="blur" each={16} gap={2.5} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 120, right: 120, bottom: 84, display: 'flex', justifyContent: 'space-between', ...type(26, 450, { serif: true }), color: alpha(PAPER_ON_INK, 0.45) }}>
        <span>— 41 —</span><span style={{ fontStyle: 'italic' }}>The quiet signal</span>
      </div>
      <Grain opacity={0.08} step={100000} freq={0.9} blend="soft-light" />
    </div>
  );
};

// 洇开：线性与 ease-out(quad) 各半——起步可见地快、越往外越慢（纸吸墨越来越费力），但不至于前 1/4 就吃掉大半屏
const GROW = (t: number) => { const u = Math.min(1, Math.max(0, t)); return 0.5 * u + 0.5 * (1 - (1 - u) * (1 - u)); };

export const InkBleedReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const fBleed = `ibB${uid}`, fEdge = `ibE${uid}`, fHalo = `ibH${uid}`, fWash = `ibW${uid}`;
  const mNew = `ibMN${uid}`, mEdge = `ibME${uid}`, mHalo = `ibMH${uid}`, mWash = `ibMW${uid}`;

  // ① 墨滴下落：ease-in（重力），按速度纵向拉长
  const GRAV = (t: number) => t * t; // 自由落体：位移 ∝ t²
  const fall = ramp(frame, DROP0, IMPACT - DROP0, GRAV);
  const dropY = mix(-80, CY, fall);
  const dropV = ramp(frame + 0.5, DROP0, IMPACT - DROP0, GRAV) - ramp(frame - 0.5, DROP0, IMPACT - DROP0, GRAV);
  const stretch = 1 + Math.min(2.2, dropV * 9);
  const dropOn = frame >= DROP0 && frame < IMPACT;

  // ② 触纸：主墨团过冲 + 卫星外飞
  const splat = ramp(frame, IMPACT, 8, EASE.overshoot);
  const satOut = ramp(frame, IMPACT, 6, EASE.snappy);

  // ③ 洇开：主半径 + 低频扰动（末段归零）
  const grow = ramp(frame, BLEED0, BLEED1 - BLEED0, GROW);
  const wob = 1 + 0.07 * Math.sin(frame * 0.31) * (1 - ramp(frame, 84, 20, EASE.linear));
  const r = frame < IMPACT ? 0 : Math.max(64 * splat, (64 + 1500 * grow) * wob);
  const satGrow = ramp(frame, IMPACT, 30, EASE.out); // 卫星墨点自己也洇开一点，随后被主墨团吞并
  const lead = 18 + 22 * Math.sin(Math.PI * ramp(frame, BLEED0, BLEED1 - BLEED0, EASE.linear));
  const disp = mix(36, 110, ramp(frame, IMPACT, BLEED1 - IMPACT, EASE.out));
  const develop = mix(1.03, 1, ramp(frame, BLEED0, 80, EASE.out));
  const settled = frame >= SETTLE;
  const push = mix(1, 1.012, ramp(frame, 0, IMPACT, EASE.smooth));
  const inkPush = mix(1, 1.015, ramp(frame, SETTLE, 50, EASE.smooth));

  // 所有墨形（主墨团 + 卫星），extra = 该层相对新景的外扩量
  const blobs = (extra: number) => {
    if (frame < IMPACT) return null;
    return (
      <>
        <circle cx={CX} cy={CY} r={Math.max(0.1, r + extra)} fill="white" />
        {SATS.map((s, i) => (
          <circle key={i} cx={CX + s.dx * satOut} cy={CY + s.dy * satOut} r={Math.max(0.1, s.r * satOut * (1 + satGrow * 1.6) + extra * 0.6)} fill="white" />
        ))}
      </>
    );
  };
  const filt = (id: string, scale: number, blur: number, freq = 0.022, oct = 3) => (
    <filter id={id} x="-30%" y="-30%" width="160%" height="160%">
      <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={oct} seed={11} result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale={scale} xChannelSelector="R" yChannelSelector="G" result="d" />
      {blur > 0 && <feGaussianBlur in="d" stdDeviation={blur} />}
    </filter>
  );
  const mask = (id: string, filterId: string, extra: number) => (
    <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080">
      <rect width="1920" height="1080" fill="black" />
      <g filter={`url(#${filterId})`}>{blobs(extra)}</g>
    </mask>
  );

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: L.bg[1] }}>
      {settled ? (
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${inkPush.toFixed(5)})`, transformOrigin: '40% 45%' }}>
          <InkPage frame={frame} />
        </div>
      ) : (
        <>
          <div style={{ position: 'absolute', inset: 0, transform: `scale(${push.toFixed(5)})`, transformOrigin: `${(CX / 19.2).toFixed(2)}% ${(CY / 10.8).toFixed(2)}%` }}>
            <PaperPage />
          </div>
          <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, display: 'block' }}>
            <defs>
              {filt(fBleed, disp, 0)}
              {filt(fEdge, disp * 1.04, 1.2)}
              {filt(fWash, disp * 1.25, 3.5, 0.05, 4)}
              {filt(fHalo, disp * 1.3, 22, 0.012, 2)}
              {mask(mHalo, fHalo, lead + 70)}
              {mask(mWash, fWash, lead + 24)}
              {mask(mEdge, fEdge, lead * 0.45)}
              {mask(mNew, fBleed, 0)}
            </defs>
            {/* 湿晕：纸被水洇湿的一圈极淡暖暗 */}
            <rect width="1920" height="1080" fill="#8a7350" opacity={0.08} mask={`url(#${mHalo})`} />
            {/* 淡墨跑在前面：高频须状、半透明靛灰（水带着少量颜料先渗出去） */}
            <rect width="1920" height="1080" fill="#3a4166" opacity={0.34} mask={`url(#${mWash})`} />
            {/* 墨边：比墨底更浓 */}
            <rect width="1920" height="1080" fill={INK_EDGE} opacity={0.96} mask={`url(#${mEdge})`} />
            {/* 新景在墨里显影 */}
            <g mask={`url(#${mNew})`}>
              <foreignObject x="0" y="0" width="1920" height="1080">
                <div style={{ width: 1920, height: 1080, position: 'relative', transform: `scale(${develop.toFixed(5)})`, transformOrigin: `${CX}px ${CY}px` }}>
                  <InkPage frame={frame} />
                </div>
              </foreignObject>
            </g>
          </svg>
          {/* 下落中的墨滴：按速度纵向拉长，头圆尾尖 */}
          {dropOn && (
            <div style={{
              position: 'absolute', left: CX - 13, top: dropY - 26 * stretch, width: 26, height: 30 * stretch,
              borderRadius: '50% 50% 50% 50% / 30% 30% 70% 70%', background: `radial-gradient(ellipse 60% 40% at 40% 70%, #2a2d44 0%, ${INK_EDGE} 70%)`,
              boxShadow: '0 0 0 1px rgba(255,255,255,0.06) inset',
            }} />
          )}
        </>
      )}
    </div>
  );
};
