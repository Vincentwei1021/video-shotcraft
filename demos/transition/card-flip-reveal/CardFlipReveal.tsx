// 功能卡 3D 翻面揭示（card-flip-reveal）——Apple bento 翻转段。
// 手法不变：一排功能卡逐张错峰沿 Y 轴翻 180°（perspective + 双面 backface hidden），正面是功能界面，
// 背面是它带来的大号结论数字（语义成对）；翻转末端过冲再回落，侧棱最薄处有一道随角度走的受光。
//
// 第二轮重设计（设计决定）
// - look = graphite（近单色暗场，白为强调、香槟金点缀）。正面是暗色功能卡，背面是亮瓷白结论卡：
//   翻面 = 从暗到亮的反相，"所以呢？"的答案被打亮，三张翻完画面从一排暗卡变成一排白色数字海报。
// - 内容：虚构写作工具 Quill 的三项能力——Compose（续写建议）/ Summaries（会议纪要）/ Search（全局搜索），
//   正面画成为镜头设计的大字 UI（≥ 28px），背面 158px 数字 3.2× / −41% / 0.2s + 34px 结论，上方一组「之前 / 用上之后」对照条在落定后收短。
// - 卡片竖版 480×620（bento 比例），三卡 1536px 宽占画宽 80%；左上 84px 标题 + 金色眉题；
//   卡片立在一面暗色镜面地板上——每张卡在地板里有一份同步翻转的倒影（遮罩渐隐），空间一下就成立了。
// - 翻转动作：4f 预备（反向后仰 −10°）→ 16f 加速翻到 194°（bezier 0.55,0,0.3,1）→ 物理弹簧落回 180°；
//   翻转中卡片离地抬起（scale +6%）、面随偏离主光的角度变暗（|cos θ| 着色），侧棱 60–120° 有一道
//   随角度从左扫到右的窄受光（物理光照，不是额外的扫光特效）。背面数字在落定时由 1.08 收到 1，标签晚 4f。
//
// 时间表（30fps，150f）
//   0–16    暗卡一排已在画面，眉题 + 标题逐行升起，相机全程 1 → 1.03 极缓推近
//   22–48   卡 0：22 预备 → 26–42 翻转 → 42–52 弹簧落定，数字收拢、标签升起
//   34–60   卡 1（错峰 12f）
//   46–72   卡 2
//   72–150  全部落定后 hold ~78f（R1），尾帧是三张白色结论卡的海报
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, bezier, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, springAt, type } from '../../_fixtures/Look';

export const CARD_FLIP_REVEAL_DURATION = 150;

const L = LOOKS.graphite;
const GOLD = L.accent2;
const CW = 480;
const CH = 620;
const GAP = 48;
const X0 = (1920 - (CW * 3 + GAP * 2)) / 2; // 192
const Y = 330;
const FLIP0 = 22;
const STAGGER = 12;
const PRE = 4; // 预备帧
const FLIP = 16; // 翻转帧
const PEAK_DEG = 194;

const flipEase = bezier(0.55, 0, 0.3, 1);

// 卡 i 在帧 f 的翻转角：0 → −10（预备）→ 194（加速翻转）→ 180（弹簧落定）
const angleAt = (f: number, i: number) => {
  const s = FLIP0 + i * STAGGER;
  if (f < s + PRE) return -10 * ramp(f, s, PRE, EASE.out);
  if (f < s + PRE + FLIP) return mix(-10, PEAK_DEG, ramp(f, s + PRE, FLIP, flipEase));
  return PEAK_DEG - (PEAK_DEG - 180) * springAt(f, s + PRE + FLIP, { damping: 15, stiffness: 190 });
};

const FEATURES = [
  { name: 'Compose', desc: 'Writes the next line with you.', value: '3.2×', label: 'faster first drafts', bars: [1, 0.31], unit: ['48 min', '15 min'] },
  { name: 'Summaries', desc: 'Every meeting, in five lines.', value: '−41%', label: 'time spent in meetings', bars: [1, 0.59], unit: ['6.1 h', '3.6 h'] },
  { name: 'Search', desc: 'One box for every doc.', value: '0.2s', label: 'to find anything', bars: [1, 0.06], unit: ['3.4 s', '0.2 s'] },
];

// ───────────── 正面 UI（暗色、大字） ─────────────
const FrontUI: React.FC<{ i: number; frame: number }> = ({ i, frame }) => {
  const ink = L.ink, ink2 = L.ink2, ink3 = L.ink3;
  if (i === 0) {
    const caret = Math.floor(frame / 9) % 2 === 0;
    return (
      <div style={{ fontSize: 30, lineHeight: 1.42, color: ink2, fontWeight: 450 }}>
        <div style={{ color: ink }}>Dear team, the launch is</div>
        <div style={{ color: ink }}>
          on track for Friday<span style={{ display: 'inline-block', width: 3, height: 34, verticalAlign: -6, background: caret ? GOLD : 'transparent', marginLeft: 2 }} />
          <span style={{ color: alpha(ink, 0.32) }}> and</span>
        </div>
        <div style={{ color: alpha(ink, 0.32) }}>every review is closed.</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 26 }}>
          <div style={{ height: 40, padding: '0 14px', borderRadius: 10, boxShadow: `inset 0 0 0 2px ${alpha(ink, 0.22)}`, display: 'flex', alignItems: 'center', fontFamily: FONT.mono, fontSize: 22, fontWeight: 600, color: ink }}>Tab</div>
          <div style={{ fontSize: 24, color: ink3 }}>to accept</div>
        </div>
      </div>
    );
  }
  if (i === 1) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {['#8a8f99', '#c9b48a', '#6f7480', '#a8acb4'].map((c, k) => (
            <div key={k} style={{ width: 48, height: 48, borderRadius: 24, background: c, marginLeft: k ? -12 : 0, boxShadow: `0 0 0 3px ${L.surface}` }} />
          ))}
          <div style={{ marginLeft: 16, fontSize: 24, color: ink3 }}>Weekly sync · 42 min</div>
        </div>
        {['Launch moves to Friday', 'Design signs off on v2', 'Ana owns the rollout'].map((t, k) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: k ? 18 : 30 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: k === 0 ? GOLD : alpha(ink, 0.4) }} />
            <div style={{ fontSize: 30, color: ink, fontWeight: 500 }}>{t}</div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div>
      <div style={{ height: 70, borderRadius: 18, background: L.surface2, boxShadow: `inset 0 0 0 1.5px ${alpha(ink, 0.12)}`, display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px' }}>
        <svg width={26} height={26} viewBox="0 0 26 26"><circle cx={11} cy={11} r={8} fill="none" stroke={ink2} strokeWidth={2.6} /><path d="M17 17l6 6" stroke={ink2} strokeWidth={2.6} strokeLinecap="round" /></svg>
        <div style={{ fontSize: 30, color: ink, fontWeight: 500 }}>q3 roadmap</div>
      </div>
      {[['Q3 Roadmap', 'Doc'], ['Roadmap review', 'Notes'], ['Q3 goals', 'Sheet']].map(([t, k2], k) => (
        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: k ? 14 : 26, padding: '0 6px' }}>
          <div style={{ width: 36, height: 44, borderRadius: 7, background: alpha(ink, k === 0 ? 0.9 : 0.16) }} />
          <div style={{ fontSize: 28, color: k === 0 ? ink : ink2, fontWeight: k === 0 ? 650 : 450 }}>{t}</div>
          <div style={{ marginLeft: 'auto', fontSize: 22, color: ink3 }}>{k2}</div>
        </div>
      ))}
    </div>
  );
};

// 受光着色：面偏离正面越多越暗；60–120° 区间一道随角度从左扫到右的窄受光（只在侧棱最薄附近）
const FaceLight: React.FC<{ angle: number; dark: boolean }> = ({ angle, dark }) => {
  const c = Math.abs(Math.cos((angle * Math.PI) / 180));
  const shade = (1 - c) * (dark ? 0.55 : 0.4);
  const band = Math.max(0, 1 - Math.abs(angle - 90) / 34);
  const pos = mix(-20, 120, Math.min(1, Math.max(0, (angle - 56) / 68)));
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: shade }} />
      {band > 0.01 && (
        <div style={{
          position: 'absolute', inset: 0, opacity: band * (dark ? 0.5 : 0.35),
          background: `linear-gradient(100deg, rgba(255,255,255,0) ${pos - 12}%, rgba(255,255,255,0.9) ${pos}%, rgba(255,255,255,0) ${pos + 12}%)`,
        }} />
      )}
    </>
  );
};

const FlipCard: React.FC<{ i: number; frame: number }> = ({ i, frame }) => {
  const angle = angleAt(frame, i);
  const f = FEATURES[i];
  const s = FLIP0 + i * STAGGER;
  const lift = Math.max(0, Math.sin((Math.min(180, Math.max(0, angle)) * Math.PI) / 180));
  const land = s + PRE + FLIP;
  const num = springAt(frame, land - 2, { damping: 18, stiffness: 160 });
  const lab = ramp(frame, land + 2, 14, EASE.snappy);
  return (
    <div style={{ position: 'absolute', inset: 0, perspective: 1600 }}>
      <div style={{
        position: 'absolute', inset: 0, transformStyle: 'preserve-3d',
        transform: `translateZ(${(lift * 60).toFixed(2)}px) rotateY(${angle.toFixed(3)}deg)`,
      }}>
        {/* 正面：暗色功能卡 */}
        <div style={{
          position: 'absolute', inset: 0, backfaceVisibility: 'hidden', borderRadius: 34, overflow: 'hidden',
          background: `linear-gradient(180deg, #1d1e22 0%, ${L.surface} 48%, #111214 100%)`,
          boxShadow: `inset 0 0 0 1.5px ${alpha('#ffffff', 0.09)}, inset 0 2px 0 ${alpha('#ffffff', 0.08)}`,
          fontFamily: FONT.sans,
        }}>
          <div style={{ position: 'absolute', left: 40, top: 40, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 22, fontWeight: 600, color: L.ink3 }}>0{i + 1}</div>
            <div style={{ ...type(22, 700, { caps: true }), color: L.ink2, letterSpacing: '0.16em' }}>Feature</div>
          </div>
          <div style={{ position: 'absolute', left: 40, right: 40, top: 112 }}>
            <FrontUI i={i} frame={frame} />
          </div>
          <div style={{ position: 'absolute', left: 40, right: 40, bottom: 40 }}>
            <div style={{ ...type(52, 750), color: L.ink }}>{f.name}</div>
            <div style={{ ...type(28, 450), color: L.ink2, marginTop: 10 }}>{f.desc}</div>
          </div>
          <FaceLight angle={angle} dark />
        </div>
        {/* 背面：瓷白结论卡 */}
        <div style={{
          position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', borderRadius: 34, overflow: 'hidden',
          background: 'linear-gradient(180deg, #fbfaf7 0%, #f1f0ec 100%)',
          boxShadow: `inset 0 0 0 1.5px rgba(0,0,0,0.06), inset 0 2px 0 rgba(255,255,255,0.9)`,
          fontFamily: FONT.sans, color: '#0d0d0f',
        }}>
          <div style={{ position: 'absolute', left: 40, top: 40, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 12, height: 12, borderRadius: 6, background: '#b8925a' }} />
            <div style={{ ...type(22, 700, { caps: true }), color: '#6b6a66', letterSpacing: '0.16em' }}>{f.name}</div>
          </div>
          {/* 对照条：之前 / 用上之后（落定后才长出来） */}
          <div style={{ position: 'absolute', left: 40, right: 40, top: 112 }}>
            {(['Before', 'With Quill'] as const).map((t, k) => {
              const g = k === 0 ? 1 : ramp(frame, land + 4, 18, EASE.snappy);
              const w = k === 0 ? f.bars[0] : mix(f.bars[0], f.bars[1], g);
              return (
                <div key={t} style={{ marginTop: k ? 26 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline' }}>
                    <div style={{ ...type(22, 700, { caps: true }), color: k ? '#0d0d0f' : '#8a8984', letterSpacing: '0.14em' }}>{t}</div>
                    <div style={{ marginLeft: 'auto', fontFamily: FONT.mono, fontSize: 24, fontWeight: 600, color: k ? '#0d0d0f' : '#8a8984', opacity: k ? lab : 1 }}>{f.unit[k]}</div>
                  </div>
                  <div style={{ height: 16, borderRadius: 8, marginTop: 10, background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                    <div style={{ width: `${(w * 100).toFixed(2)}%`, height: '100%', borderRadius: 8, background: k ? '#0d0d0f' : 'rgba(0,0,0,0.18)' }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ position: 'absolute', left: 36, right: 30, bottom: 128 }}>
            <div style={{
              ...type(158, 800), letterSpacing: '-0.06em', lineHeight: 0.9, color: '#0d0d0f', whiteSpace: 'nowrap',
              transform: `scale(${mix(1.08, 1, num).toFixed(4)})`, transformOrigin: 'left bottom',
            }}>{f.value}</div>
          </div>
          <div style={{
            position: 'absolute', left: 40, right: 40, bottom: 48, ...type(34, 550), color: '#3d3c39',
            opacity: lab, transform: `translateY(${((1 - lab) * 14).toFixed(2)}px)`,
          }}>{f.label}</div>
          <FaceLight angle={180 - angle} dark={false} />
        </div>
      </div>
    </div>
  );
};

export const CardFlipReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const push = 1 + 0.03 * ramp(frame, 0, 150, EASE.smooth);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: -0.05 }} fill={{ x: 0.5, y: 1.1 }} horizon={0.88} intensity={0.9}>
        {/* 镜面地板：地平线以下略亮的反射面 */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: Y + CH, bottom: 0,
          background: `linear-gradient(180deg, ${alpha('#ffffff', 0.035)} 0%, ${alpha('#ffffff', 0)} 60%)`,
          borderTop: `1px solid ${alpha('#ffffff', 0.06)}`,
        }} />
      </Stage>
      <AbsoluteFill style={{ transform: `scale(${push.toFixed(4)})`, transformOrigin: '50% 60%' }}>
        {/* 标题 */}
        <div style={{ position: 'absolute', left: X0, top: 118, fontFamily: FONT.sans }}>
          <div style={{ ...type(26, 700, { caps: true }), color: GOLD, letterSpacing: '0.18em' }}>
            <TextReveal text="Quill · Launch results" by="word" variant="blur" start={0} each={14} gap={2} />
          </div>
          <div style={{ ...type(84, 760), color: L.ink, marginTop: 18 }}>
            <TextReveal text="Three features. Three outcomes." by="word" variant="rise" start={2} each={18} gap={2.5} />
          </div>
        </div>
        {[0, 1, 2].map((i) => (
          <React.Fragment key={i}>
            {/* 倒影：同一张卡竖直镜像，遮罩渐隐 */}
            <div style={{
              position: 'absolute', left: X0 + i * (CW + GAP), top: Y + CH + 6, width: CW, height: CH,
              transform: 'scaleY(-1)', transformOrigin: 'center', opacity: 0.22,
              WebkitMaskImage: 'linear-gradient(0deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 26%)',
              maskImage: 'linear-gradient(0deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 26%)',
            }}>
              <FlipCard i={i} frame={frame} />
            </div>
            {/* 接地影 */}
            <div style={{
              position: 'absolute', left: X0 + i * (CW + GAP) + 30, width: CW - 60, top: Y + CH - 18, height: 36, borderRadius: '50%',
              background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0,0,0,0.7), rgba(0,0,0,0) 70%)',
              transform: `scaleX(${Math.max(0.12, Math.abs(Math.cos((angleAt(frame, i) * Math.PI) / 180))).toFixed(3)})`,
            }} />
            <div style={{ position: 'absolute', left: X0 + i * (CW + GAP), top: Y, width: CW, height: CH }}>
              <FlipCard i={i} frame={frame} />
            </div>
          </React.Fragment>
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
