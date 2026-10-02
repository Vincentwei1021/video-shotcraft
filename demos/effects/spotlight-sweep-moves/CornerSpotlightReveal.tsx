// corner-spotlight-reveal —— 对标 clickup-30.mp4 41.5–44.6s：
// 黑场上，左上角径向聚光从小到大扩张，把白色 Inbox 界面逐步"点亮"，
// 照到的区域显影、照不到的沉黑，最终全屏亮起。光即转场。
//
// 质感升级：灰色骨架条换成可信的收件箱（发件人头像 / 姓名 / 时间 / 摘要 / 类型 chip / 未读点）；
// 光的前沿加一圈紫色辉边（screen 叠加：黑场里是紫光、照亮处自然消失），呼应本卡"贴边紫光"的身份；
// 修掉相机漂移没有钳位、100f 后继续缩放导致底边露黑的问题，漂移改为缓出收住；
// 光心白热光晕降一档并偏暖；补导出时长（100f 扩张 + 30f 全亮 hold）；颗粒防暗场色带。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { EASE, FONT, Grain, Vignette } from '../../_fixtures/Polish';

export const CORNER_SPOTLIGHT_REVEAL_DURATION = 130; // 100f 匀速扩张 + 30f 全亮停留

const ACCENT = '#5b55c8'; // 界面强调色（与紫光同族）
const INK = '#1b1c21';
const INK2 = '#5f6068';
const INK3 = '#9a9ba2';
const HAIR = 'rgba(20,22,28,0.08)';
const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const MAIL = [
  { who: 'Maya Chen', ini: 'MC', bg: '#efe1dc', fg: '#9a5a48', when: '2m', what: 'Commented on Onboarding v3', snippet: '“Let’s ship the new empty state this week.”', tag: 'Docs', unread: true },
  { who: 'Leo Novak', ini: 'LN', bg: '#dfe6f3', fg: '#4c6496', when: '18m', what: 'Assigned you Billing migration', snippet: 'Due Friday · Priority high', tag: 'Tasks', unread: true },
  { who: 'Priya Iyer', ini: 'PI', bg: '#e6e2f4', fg: '#6a5aa8', when: '1h', what: 'Mentioned you in #launch', snippet: '“@you can you sanity-check the copy?”', tag: 'Chat', unread: false },
  { who: 'Sam Okafor', ini: 'SO', bg: '#e0eee6', fg: '#4a7a5e', when: '3h', what: 'Shared Q3 roadmap', snippet: '12 milestones · 4 owners', tag: 'Docs', unread: false },
];

const Check: React.FC = () => (
  <div style={{ width: 40, height: 40, borderRadius: 11, boxShadow: 'inset 0 0 0 2.5px #d3d3d0', background: '#fff', flex: 'none' }} />
);

// Inbox 界面（自绘，替代真 UI）——1920×1080 布局，由外层相机放大取左上局部
const InboxPanel: React.FC = () => (
  <div
    style={{
      width: 1920,
      height: 1080,
      background: 'linear-gradient(180deg, #fbfbfa 0%, #f5f5f3 100%)',
      fontFamily: FONT.sans,
      padding: '110px 210px', // 左上留足边距：开场 1.75 倍特写时标题与 All tab 不被裁
      boxSizing: 'border-box',
      color: INK,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <div style={{ fontSize: 118, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1 }}>Inbox</div>
      <svg width={34} height={34} viewBox="0 0 16 16" style={{ marginTop: 22 }} fill="none" stroke="#3a3b40" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="m4 6 4 4 4-4" />
      </svg>
      <div style={{ marginLeft: 18, marginTop: 14, padding: '8px 18px', borderRadius: 999, background: 'rgba(91,85,200,0.1)', color: ACCENT, fontSize: 30, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        12 new
      </div>
    </div>
    {/* 分类 tab */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 56, marginTop: 84, fontSize: 42, color: INK2, letterSpacing: '-0.01em' }}>
      <div style={{ background: 'rgba(91,85,200,0.1)', color: ACCENT, padding: '10px 30px', borderRadius: 14, fontWeight: 600 }}>All</div>
      <div>Tasks</div>
      <div>Docs</div>
      <div>People</div>
      <div>Chat</div>
    </div>
    <div style={{ height: 1.5, background: HAIR, marginTop: 34, width: 1120 }} />
    {/* 消息行 */}
    {MAIL.map((m, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 26, height: 138, width: 1120, borderBottom: `1.5px solid ${HAIR}` }}>
        <Check />
        <div style={{ width: 14, height: 14, borderRadius: 7, background: m.unread ? ACCENT : 'transparent', flex: 'none' }} />
        <div style={{ width: 64, height: 64, borderRadius: 32, background: m.bg, color: m.fg, fontSize: 24, fontWeight: 650, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          {m.ini}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: 34, fontWeight: m.unread ? 650 : 550, letterSpacing: '-0.015em' }}>{m.who}</span>
            <span style={{ fontSize: 30, color: INK2 }}>{m.what}</span>
            <span style={{ fontSize: 26, color: INK3 }}>· {m.when}</span>
          </div>
          <div style={{ marginTop: 10, fontSize: 28, color: INK3, whiteSpace: 'nowrap' }}>{m.snippet}</div>
        </div>
        <div style={{ marginLeft: 'auto', padding: '7px 18px', borderRadius: 10, background: '#f0f0ee', boxShadow: `inset 0 0 0 1.5px ${HAIR}`, fontSize: 24, fontWeight: 550, color: INK2, flex: 'none' }}>
          {m.tag}
        </div>
      </div>
    ))}
  </div>
);

export const CornerSpotlightReveal: React.FC = () => {
  const frame = useCurrentFrame();

  // 聚光半径扩张：全程匀速（用户裁决"整个过程要匀速"——严格 linear，无缓动）
  // r+feather=1.85r 是光前沿；1.85*1300≈2400 恰在片尾盖满全屏对角，
  // 保证扩张动作占满全片时长而不是前 1/3 就饱和
  const r = interpolate(frame, [0, 100], [160, 1300], CLAMP);

  // 光心沿左上角匀速游移（linear）
  const cx = interpolate(frame, [0, 96], [140, 420], CLAMP);
  const cy = interpolate(frame, [0, 96], [90, 260], CLAMP);

  // 软边宽度：扩张时边缘更羽化
  const feather = r * 0.85;
  const R = r + feather;
  const inner = Math.max(0, ((r - feather * 0.25) / R) * 100);

  // UI 轻微透视漂移（原片相机贴着界面缓推）：0–112f 缓出收住，之后静止（钳位，不再外推）
  const drift = EASE.out(interpolate(frame, [0, 112], [0, 1], CLAMP));
  const scale = 1.75 - 0.28 * drift;
  const tx = -40 + 70 * drift;
  const ty = -30 + 50 * drift;

  const mask = `radial-gradient(circle ${R.toFixed(1)}px at ${cx.toFixed(1)}px ${cy.toFixed(1)}px, rgba(255,255,255,1) ${inner.toFixed(2)}%, rgba(255,255,255,0.55) ${(inner + (100 - inner) * 0.45).toFixed(2)}%, rgba(255,255,255,0) 100%)`;

  // 光前沿紫色辉边：峰值在羽化带中段，screen 叠加（黑处发紫光、亮处自然消失）；全亮后淡出
  const rimA = interpolate(frame, [0, 8, 84, 104], [0, 1, 1, 0], CLAMP);
  const rimPeak = inner + (100 - inner) * 0.55;
  const rim = `radial-gradient(circle ${R.toFixed(1)}px at ${cx.toFixed(1)}px ${cy.toFixed(1)}px, rgba(140,80,240,0) ${inner.toFixed(2)}%, rgba(150,88,245,0.42) ${rimPeak.toFixed(2)}%, rgba(110,60,220,0.12) ${(rimPeak + (100 - rimPeak) * 0.6).toFixed(2)}%, rgba(110,60,220,0) 100%)`;

  return (
    <AbsoluteFill style={{ background: '#050409' }}>
      <AbsoluteFill
        style={{
          WebkitMaskImage: mask,
          maskImage: mask,
          transform: `scale(${scale.toFixed(4)}) translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) rotate(${(-1.2 + 1.2 * drift).toFixed(3)}deg)`,
          transformOrigin: '18% 12%',
        }}
      >
        <InboxPanel />
      </AbsoluteFill>
      {/* 光前沿的紫色辉边 */}
      <AbsoluteFill style={{ background: rim, mixBlendMode: 'screen', opacity: rimA }} />
      {/* 聚光自身的暖白光晕（叠在界面上方，光心最亮） */}
      <div
        style={{
          position: 'absolute',
          left: cx - r * 0.7,
          top: cy - r * 0.7,
          width: r * 1.4,
          height: r * 1.4,
          borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(255,250,244,0.8), rgba(255,248,240,0.22) 45%, transparent 75%)',
          filter: 'blur(26px)',
          opacity: interpolate(frame, [0, 10, 60, 90], [0, 0.8, 0.45, 0], CLAMP),
          pointerEvents: 'none',
        }}
      />
      <Vignette strength={0.16} inner={0.55} color="#1a1626" />
      <Grain opacity={0.06} />
    </AbsoluteFill>
  );
};
