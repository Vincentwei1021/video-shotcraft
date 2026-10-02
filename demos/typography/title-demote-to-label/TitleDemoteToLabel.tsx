// title-demote-to-label —— 大标题降格为节标签（两式串播）
// 源：perplexity-promo 16–18.5s；B 式变体源自 framer text-selection-title。
//
// 第二轮重设计（paper · 瑞士网格编辑版式 · 产品 = video-shotcraft 的分镜工作台）：
// - look = paper（暖白纸 · 墨 · 朱红）。主角是 220px / 850 字重的单词海报标题「Frame.」「Craft.」（品牌短句 Frame motion. Craft the shot.），
//   句点是朱红——降格后它就是栏目标签的识别点。12 栏网格的左边距 120、发丝线、mono 眉题撑起编辑版式。
// - 降格：一次连续补间（26f，不对称 in-out：起步果断、落点很软）scale 1→0.22、中心→左上标签槽，
//   transform-origin 左中、居中修正 translate(-50%) 随补间归零；飞行按速度加方向性运动模糊。
//   眉题「CHAPTER 01」随起飞 6f 淡出，落位时标签前的「01 /」从左擦入接班。
// - 内容在降格进行到 12f 时开始错峰生长（裁切揭开 + 上移 + 淡入，先密后疏），交接零空档：
//   A = 导语 + 三张卡（镜头配方卡 / 用户评价 / 卡点节拍）；B = 一段分镜脚本，其中一句带朱红选区 → 连线 → 匹配镜头卡。
// - 两式之间不再白闪：A 内容 ease-in 上移退场，A 标签上移一行、变灰缩小成"上一节"（多节连用不叠放），
//   B 大标题在同一个舞台上显影——共享一个 Stage，没有接缝。
// - B 式：朱红选区扫入（右缘跟着 3px 插入光标）→ 站 10f → 左缘撤走 → 再降格。
//
// 时间表（30fps，共 246f）：
//   A  0–16    眉题字距收拢 + 标题逐字从线下升起（rise，先到先稳）
//      16–36   站稳 20f（极缓 1.5% 推近，画面不死）
//      36–62   降格 26f；48 起内容生长（~44f 长完）
//      92–112  hold
//   转 112–124 A 内容退场（exit 12f）；A 标签 124–140 上移成"上一节"
//   B  118–134 B 标题显影；136–146 选区扫入；146–156 站；156–164 撤；166–192 降格；178 起内容生长
//      226–246 hold 落定（尾帧 = 完整编辑页海报）
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, SpeedBlur, bezier, mix, ramp, softShadow } from '../../_fixtures/Polish';
import { LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';
import { BRAND, ShotcraftMark } from '../../_fixtures/Brand';

const L = LOOKS.paper;
export const TITLE_DEMOTE_TO_LABEL_DURATION = 246;

const B0 = 112; // B 式（转场）起点
const MARGIN = 120; // 网格左边距
const HERO = 220; // 标题字号
const LABEL_SCALE = 0.22; // 降格终点缩放（≈48px）
const SLOT = { x: MARGIN + 96, y: 196 }; // 标签槽（左中锚点）；前面留给「01 /」
const DEMOTE_EASE = bezier(0.6, 0, 0.18, 1); // 起步果断、落点很软的不对称 in-out
const SEL = alpha(L.accent, 0.2);

// ───────────── 生长块：裁切从左揭开 + 上移 + 淡入（内容不变形） ─────────────
const Grow: React.FC<{ frame: number; at: number; dur?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  frame, at, dur = 20, children, style,
}) => {
  const p = ramp(frame, at, dur, EASE.out);
  return (
    <div style={{
      opacity: Math.min(1, p * 1.6),
      transform: `translateY(${((1 - p) * 30).toFixed(2)}px)`,
      clipPath: p < 1 ? `inset(-60px ${((1 - (0.3 + 0.7 * p)) * 100).toFixed(2)}% -60px -20px)` : undefined,
      ...style,
    }}>
      {children}
    </div>
  );
};

const Tag: React.FC<{ label: string; color?: string }> = ({ label, color = L.accent }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, ...type(22, 700, { caps: true, mono: true }), letterSpacing: '0.14em', color: L.ink2 }}>
    <span style={{ width: 10, height: 10, borderRadius: 5, background: color }} />
    {label}
  </span>
);

const card: React.CSSProperties = {
  position: 'relative', width: 536, height: 430, borderRadius: 22, background: L.surface,
  border: `1px solid ${L.line}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.9), ${softShadow(10, { color: L.shadow, strength: 0.9 })}`,
  padding: '34px 36px', boxSizing: 'border-box', overflow: 'hidden',
};

// ───────────── A：取景（导语 + 配方卡 / 评价 / 节拍三张卡） ─────────────
const ContentA: React.FC<{ frame: number; at: number }> = ({ frame, at }) => {
  const t = (k: number) => at + k; // 先密后疏的错峰
  return (
    <div style={{ position: 'absolute', left: MARGIN, top: 262, width: 1680 }}>
      <Grow frame={frame} at={t(8)} dur={18}>
        <div style={{ height: 1.5, background: alpha(L.ink, 0.85) }} />
      </Grow>
      <Grow frame={frame} at={t(6)} style={{ marginTop: 40 }}>
        <div style={{ ...type(60, 650), color: L.ink, whiteSpace: 'nowrap' }}>
          Pick a shot. <span style={{ color: L.ink3 }}>Each one comes with a recipe.</span>
        </div>
      </Grow>
      <div style={{ display: 'flex', gap: 36, marginTop: 56 }}>
        <Grow frame={frame} at={t(10)} dur={22}>
          <div style={card}>
            <Tag label="Recipe card" />
            <div style={{ ...type(42, 700), color: L.ink, marginTop: 26, lineHeight: 1.12 }}>Crash zoom punch</div>
            <div style={{ ...type(32, 400), color: L.ink2, marginTop: 18, lineHeight: 1.35 }}>Slam into the one number that matters.</div>
            <div style={{ position: 'absolute', left: 36, right: 36, bottom: 30, display: 'flex', justifyContent: 'space-between', ...type(22, 500, { mono: true }), color: L.ink3 }}>
              <span>camera / punch-in</span><span>18f</span>
            </div>
          </div>
        </Grow>
        <Grow frame={frame} at={t(16)} dur={22}>
          <div style={{ ...card, background: L.ink, border: 'none' }}>
            <Tag label="Review" color={L.accent} />
            <div style={{ fontFamily: '"Iowan Old Style", Palatino, Georgia, serif', fontSize: 52, lineHeight: 1.12, fontStyle: 'italic', color: L.surface, marginTop: 26, letterSpacing: '-0.015em' }}>
              “Camera moves I’d have keyframed for a <span style={{ color: L.accent }}>week</span>.”
            </div>
            <div style={{ position: 'absolute', left: 36, right: 36, bottom: 30, ...type(22, 500, { mono: true }), color: alpha(L.surface, 0.5) }}>
              Saved from launch day · 03:12
            </div>
          </div>
        </Grow>
        <Grow frame={frame} at={t(24)} dur={22}>
          <div style={card}>
            <Tag label="Beat grid" color={L.accent2} />
            <div style={{ ...type(42, 700), color: L.ink, marginTop: 26, lineHeight: 1.12 }}>Launch BGM, 128 BPM</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 120, marginTop: 30 }}>
              {Array.from({ length: 34 }, (_, i) => {
                const hgt = 18 + 90 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.43));
                return <span key={i} style={{ width: 7, height: hgt, borderRadius: 4, background: i < 13 ? L.accent2 : alpha(L.ink, 0.18) }} />;
              })}
            </div>
            <div style={{ position: 'absolute', left: 36, right: 36, bottom: 30, display: 'flex', justifyContent: 'space-between', ...type(22, 500, { mono: true }), color: L.ink3 }}>
              <span>Cuts on the beat</span><span>00:32</span>
            </div>
          </div>
        </Grow>
      </div>
    </div>
  );
};

// ───────────── B：分镜脚本 + 句内选区 → 连线 → 匹配镜头卡 ─────────────
const ContentB: React.FC<{ frame: number; at: number }> = ({ frame, at }) => {
  const sel = ramp(frame, at + 20, 12, EASE.swift); // 文中那句的选区扫入
  const wire = ramp(frame, at + 30, 12, EASE.swift); // 选区 → 答案卡的连线
  const body: React.CSSProperties = { ...type(58, 450), lineHeight: 1.5, color: L.ink2, whiteSpace: 'nowrap' };
  return (
    <div style={{ position: 'absolute', left: MARGIN, top: 262, width: 1680 }}>
      <Grow frame={frame} at={at + 6} dur={18}>
        <div style={{ height: 1.5, background: alpha(L.ink, 0.85) }} />
      </Grow>
      <Grow frame={frame} at={at + 8} style={{ marginTop: 40 }}>
        <div style={{ ...type(22, 700, { caps: true, mono: true }), letterSpacing: '0.14em', color: L.ink3 }}>
          Launch film <span style={{ color: L.accent }}>·</span> Storyboard v4
        </div>
      </Grow>
      <div style={{ position: 'relative', marginTop: 22 }}>
        <Grow frame={frame} at={at + 10}><div style={body}>The launch film opens on the dashboard,</div></Grow>
        <Grow frame={frame} at={at + 12}><div style={body}>glides past the chart and, best of all,</div></Grow>
        <Grow frame={frame} at={at + 14}>
          <div style={body}>
            <span style={{ position: 'relative', color: L.ink }}>
              <span style={{ position: 'absolute', left: -6, top: 8, bottom: 4, width: `calc(${(sel * 100).toFixed(2)}% + 12px)`, background: SEL, borderRadius: 5 }} />
              <span style={{ position: 'relative' }}>every cut lands right on the beat.</span>
            </span>
          </div>
        </Grow>
        <Grow frame={frame} at={at + 16}><div style={{ ...body, color: L.ink3 }}>Sound design and the logo sting come last.</div></Grow>
        {/* 连线：从选区右缘拐到旁注卡 */}
        <svg width={1680} height={400} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}>
          <path d="M 800 217 L 1112 217" stroke={L.accent} strokeWidth={2.5} fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - wire} />
          {wire > 0.02 && <circle cx={800} cy={217} r={6} fill={L.accent} />}
        </svg>
        {/* 旁注：匹配到的镜头配方卡 */}
        <div style={{ position: 'absolute', left: 1120, top: -40, width: 560 }}>
          <Grow frame={frame} at={at + 38} dur={22}>
            <div style={{ ...card, width: 560, height: 'auto', padding: '32px 36px 30px' }}>
              <Tag label="Shot match · 2 cards" />
              <div style={{ ...type(40, 650), color: L.ink, marginTop: 22, lineHeight: 1.18 }}>
                Every line of the script becomes a tuned shot.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 28 }}>
                {[['beat-cut-moves', '4 cuts'], ['crash-zoom-punch', '18f']].map(([a, b]) => (
                  <div key={a} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 12, background: L.surface2, ...type(26, 500, { mono: true }), color: L.ink2 }}>
                    <span>{a}</span><span style={{ color: L.accent }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          </Grow>
        </div>
      </div>
    </div>
  );
};

// 页脚：发丝线 + 纹理级 mono 小字（两节共用，给海报一个底边）
const Footer: React.FC<{ frame: number }> = ({ frame }) => {
  const p = ramp(frame, 54, 26, EASE.out);
  return (
    <div style={{ position: 'absolute', left: MARGIN, right: MARGIN, top: 948, opacity: p }}>
      <div style={{ height: 1, background: L.line, transformOrigin: 'left', transform: `scaleX(${p.toFixed(4)})` }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, ...type(22, 500, { mono: true }), letterSpacing: '0.06em', color: L.ink3 }}>
        <span>{BRAND.name} / storyboard</span><span>Autosaved · just now</span>
      </div>
    </div>
  );
};

// ───────────── 标题：显影 → (选区) → 降格 ─────────────
const Title: React.FC<{
  frame: number; word: string; num: string; reveal: number; demote: number; select?: { on: number; off: number };
  retire?: number; // 被下一节顶上去的时刻（变"上一节"）
}> = ({ frame, word, num, reveal, demote, select, retire }) => {
  const demAt = (f: number) => ramp(f, demote, 26, DEMOTE_EASE);
  const dem = demAt(frame);
  const v = demAt(frame + 0.5) - demAt(frame - 0.5);
  const hold = ramp(frame, reveal + 14, demote - reveal - 14, EASE.linear);
  const scale = mix(1 + 0.015 * hold, LABEL_SCALE, dem);
  const x = mix(960, SLOT.x, dem);
  const y = mix(540, SLOT.y, dem);
  // 退位：上移一行、变小、变灰
  const ret = retire !== undefined ? ramp(frame, retire, 16, EASE.swift) : 0;
  const ry = -68 * ret;
  const rs = 1 - 0.3 * ret;
  if (frame < reveal) return null;

  // 眉题：字距由宽收紧（显影），起飞后 6f 淡出
  const eyebrowIn = ramp(frame, reveal, 16, EASE.out);
  const eyebrowOut = ramp(frame, demote, 6, EASE.exit);
  // 选区（B 式）
  let selL = 0, selW = 0, caret = 0;
  if (select) {
    const on = ramp(frame, select.on, 10, EASE.swift);
    const off = ramp(frame, select.off, 8, EASE.exit);
    selL = off * 100;
    selW = Math.max(0, on * 100 - selL);
    caret = frame >= select.on && frame < select.off + 6 ? 1 - off : 0;
  }
  // 「01 /」在落位前 4f 从左擦入
  const numIn = ramp(frame, demote + 20, 12, EASE.out);
  const ink = ret > 0 ? `rgb(${[23, 19, 15].map((c, k) => Math.round(mix(c, [155, 145, 132][k], ret))).join(',')})` : L.ink;

  return (
    <>
      {/* 落位后的「01 /」 */}
      <div style={{
        position: 'absolute', left: MARGIN, top: SLOT.y + ry, transform: `translateY(-50%) scale(${rs})`, transformOrigin: 'left center',
        ...type(30, 700, { mono: true }), color: ret > 0.5 ? L.ink3 : L.accent, whiteSpace: 'nowrap',
        clipPath: `inset(-10px ${((1 - numIn) * 100).toFixed(1)}% -10px 0)`, opacity: numIn,
      }}>
        {num} <span style={{ color: L.ink3 }}>/</span>
      </div>
      <SpeedBlur vx={v * (SLOT.x - 960)} vy={v * (SLOT.y - 540)} amount={0.2} max={12}>
        <div style={{
          position: 'absolute', left: x - (SLOT.x - MARGIN) * (1 - rs), top: y + ry,
          transform: `translate(${(-(1 - dem) * 50).toFixed(3)}%, -50%) scale(${(scale * rs).toFixed(4)})`,
          transformOrigin: 'left center', whiteSpace: 'nowrap',
        }}>
          {/* 眉题 */}
          <div style={{
            position: 'absolute', left: 14, top: -46, ...type(30, 700, { caps: true, mono: true }),
            letterSpacing: `${(0.3 - 0.12 * eyebrowIn).toFixed(3)}em`, color: L.accent,
            opacity: eyebrowIn * (1 - eyebrowOut), whiteSpace: 'nowrap',
          }}>
            Chapter {num}
          </div>
          <div style={{ position: 'relative', ...type(HERO, 850), letterSpacing: '-0.055em', color: ink, padding: '0 14px' }}>
            {selW > 0 && (
              <div style={{ position: 'absolute', left: `${selL}%`, width: `${selW}%`, top: '8%', bottom: '2%', background: SEL, borderRadius: 6 }} />
            )}
            {caret > 0 && (
              <div style={{ position: 'absolute', left: `calc(${(selL + selW).toFixed(2)}% - 2px)`, top: '4%', bottom: '-2%', width: 5, borderRadius: 3, background: L.accent, opacity: caret }} />
            )}
            <span style={{ position: 'relative' }}>
              <TextReveal text={word} start={reveal} by="char" variant="rise" each={16} gap={1.6} />
              <span style={{ color: ret > 0.5 ? L.ink3 : L.accent, display: 'inline-block', transform: `scale(${ramp(frame, reveal + 10, 14, EASE.overshoot).toFixed(3)})`, transformOrigin: '50% 85%' }}>.</span>
            </span>
          </div>
        </div>
      </SpeedBlur>
    </>
  );
};

export const TitleDemoteToLabel: React.FC = () => {
  const frame = useCurrentFrame();
  // A 内容退场
  const outA = ramp(frame, B0, 12, EASE.exit);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.3, y: 0.05 }} fill={{ x: 0.9, y: 0.95 }} />
      {/* 网格页眉：右上角品牌（镜刻标志 + 全小写字标）/ 页码（纹理级小字） */}
      <div style={{ position: 'absolute', right: MARGIN, top: 182, display: 'flex', alignItems: 'center', gap: 40, ...type(22, 600, { caps: true, mono: true }), letterSpacing: '0.16em', color: L.ink3, opacity: ramp(frame, 40, 20, EASE.out) }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, textTransform: 'none', letterSpacing: '0.04em' }}><ShotcraftMark size={28} tone="light" />{BRAND.name}</span><span style={{ color: L.ink }}>{frame < 190 ? '01' : '02'} / 04</span>
      </div>
      {frame < B0 + 14 && (
        <div style={{ position: 'absolute', inset: 0, opacity: 1 - outA, transform: `translateY(${(-50 * outA).toFixed(2)}px)` }}>
          <ContentA frame={frame} at={48} />
        </div>
      )}
      {frame >= B0 + 40 && <ContentB frame={frame} at={178} />}
      <Footer frame={frame} />
      <Title frame={frame} word="Frame" num="01" reveal={0} demote={36} retire={B0 + 54} />
      <Title frame={frame} word="Craft" num="02" reveal={B0 + 6} demote={166} select={{ on: 136, off: 156 }} />
    </AbsoluteFill>
  );
};
