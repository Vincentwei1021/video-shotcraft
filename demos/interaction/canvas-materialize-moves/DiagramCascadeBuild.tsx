// diagram-cascade-build —— miro-promo 104–116s
// prompt 行打字 → 图表节点自上而下逐层级联弹出（根→2 子→4 孙），
// 连线跟随节点生长（SVG path 描线），成树后整体呼吸一拍。
// 改版：节点从骨架条换成 ER 实体卡（表名 + 字段/类型/键），连线改 2px 圆角折线 + 端口点，
// prompt 条加 AI 图标与提交键（敲完→按下→生成），柔光画布底；孙层重新排布不再相互贴边。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Easing } from 'remotion';
import { G } from '../../_fixtures/Fixtures';
import { Backdrop, EASE, FONT, ramp, softShadow, tracking } from '../../_fixtures/Polish';

// 整段：打字 6–42f → 提交 44f → 根 52f → 末孙 110f → 呼吸 132–160f
export const DIAGRAM_CASCADE_BUILD_DURATION = 160;

const PROMPT = 'Generate an entity-relationship diagram';
const TYPE_START = 6;
const TYPE_CPS = 1.1; // 字符/帧
const TYPE_END = TYPE_START + Math.ceil(PROMPT.length / TYPE_CPS);
const SUBMIT = TYPE_END + 2; // 敲完 2f 后按下提交键

// 树布局（画布坐标，节点中心）——孙层等距 420，兄弟间留 120px 呼吸
const NODE_W = 300;
const NODE_H = 132;
type Field = [string, string, '' | 'PK' | 'FK'];
type Node = { id: number; x: number; y: number; level: number; parent: number; name: string; fields: Field[] };
const NODES: Node[] = [
  // level 0
  { id: 0, x: 960, y: 336, level: 0, parent: -1, name: 'Workspace', fields: [['id', 'uuid', 'PK'], ['name', 'text', '']] },
  // level 1
  { id: 1, x: 540, y: 588, level: 1, parent: 0, name: 'Project', fields: [['id', 'uuid', 'PK'], ['workspace_id', 'uuid', 'FK']] },
  { id: 2, x: 1380, y: 588, level: 1, parent: 0, name: 'Member', fields: [['id', 'uuid', 'PK'], ['workspace_id', 'uuid', 'FK']] },
  // level 2
  { id: 3, x: 330, y: 840, level: 2, parent: 1, name: 'Task', fields: [['id', 'uuid', 'PK'], ['project_id', 'uuid', 'FK']] },
  { id: 4, x: 750, y: 840, level: 2, parent: 1, name: 'Milestone', fields: [['id', 'uuid', 'PK'], ['due_at', 'date', '']] },
  { id: 5, x: 1170, y: 840, level: 2, parent: 2, name: 'Role', fields: [['id', 'uuid', 'PK'], ['member_id', 'uuid', 'FK']] },
  { id: 6, x: 1590, y: 840, level: 2, parent: 2, name: 'Invite', fields: [['email', 'text', ''], ['member_id', 'uuid', 'FK']] },
];

const CASCADE_START = 52; // 根节点弹出时刻
const LEVEL_GAP = 20; // 层间隔
const SIBLING_STAGGER = 6;

const EDGE_C = 'rgba(92,96,108,0.55)';

const nodeStart = (n: Node) => {
  if (n.level === 0) return CASCADE_START;
  const siblingIdx = NODES.filter((m) => m.level === n.level && m.id < n.id).length;
  return CASCADE_START + n.level * LEVEL_GAP + siblingIdx * SIBLING_STAGGER;
};

// 圆角折线：父底边中点 → 垂直下探 → 水平 → 垂直进子顶边（两个拐角 r=16 圆角）
const edgePath = (p: Node, c: Node) => {
  const x1 = p.x;
  const y1 = p.y + NODE_H / 2 + 6;
  const x2 = c.x;
  const y2 = c.y - NODE_H / 2 - 6;
  const my = (y1 + y2) / 2;
  const r = Math.min(16, Math.abs(x2 - x1) / 2);
  const dir = Math.sign(x2 - x1);
  return `M ${x1} ${y1} L ${x1} ${my - r} Q ${x1} ${my} ${x1 + dir * r} ${my} L ${x2 - dir * r} ${my} Q ${x2} ${my} ${x2} ${my + r} L ${x2} ${y2}`;
};

const SparkIcon: React.FC<{ c: string; size?: number }> = ({ c, size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2.5l2.1 6.4 6.4 2.1-6.4 2.1L12 19.5l-2.1-6.4L3.5 11l6.4-2.1z" fill={c} />
    <path d="M19 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" fill={c} opacity={0.6} />
  </svg>
);
const TableIcon: React.FC<{ c: string }> = ({ c }) => (
  <svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <rect x={2} y={3} width={14} height={12} rx={2.5} stroke={c} strokeWidth={1.5} />
    <path d="M2 7.5h14M7 7.5V15" stroke={c} strokeWidth={1.5} />
  </svg>
);

const EntityCard: React.FC<{ n: Node; t: number }> = ({ n, t }) => {
  const dark = n.level === 0;
  const head = interpolate(t, [0, 4, 9], [0, 0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const row = (i: number) => EASE.out(interpolate(t, [6 + i * 3, 14 + i * 3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{
        height: 50, display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px',
        borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : G.hairline}`,
        opacity: head, transform: `translateY(${(1 - head) * 4}px)`,
      }}>
        <TableIcon c={dark ? 'rgba(255,255,255,0.6)' : G.ink3} />
        <span style={{ fontSize: 23, fontWeight: 650, color: dark ? '#f5f6f8' : G.ink1, letterSpacing: tracking(23) }}>{n.name}</span>
        <span style={{ marginLeft: 'auto', fontSize: 14, color: dark ? 'rgba(255,255,255,0.45)' : G.ink3, fontVariantNumeric: 'tabular-nums' }}>
          {n.fields.length + 3} cols
        </span>
      </div>
      <div style={{ padding: '10px 18px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {n.fields.map(([k, type, key], i) => (
          <div key={k} style={{
            display: 'flex', alignItems: 'center', gap: 8, height: 26, fontFamily: FONT.mono, fontSize: 16,
            opacity: row(i), transform: `translateX(${(1 - row(i)) * -6}px)`,
          }}>
            <span style={{ color: dark ? 'rgba(255,255,255,0.86)' : G.ink1 }}>{k}</span>
            {key && (
              <span style={{
                fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', padding: '2px 6px', borderRadius: 5,
                color: key === 'PK' ? (dark ? '#c9ccff' : G.accent) : dark ? 'rgba(255,255,255,0.6)' : G.ink2,
                background: key === 'PK' ? (dark ? 'rgba(141,148,255,0.18)' : G.accentSoft) : dark ? 'rgba(255,255,255,0.08)' : G.fill,
              }}>{key}</span>
            )}
            <span style={{ marginLeft: 'auto', color: dark ? 'rgba(255,255,255,0.45)' : G.ink3 }}>{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const DiagramCascadeBuild: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const typed = Math.min(PROMPT.length, Math.max(0, Math.floor((frame - TYPE_START) * TYPE_CPS)));
  const promptDone = typed >= PROMPT.length;
  // 打字中光标常亮，停手后才闪；提交后隐去
  const caretOn = frame < SUBMIT && (!promptDone || Math.floor((frame - TYPE_END) / 8) % 2 === 0);
  const confirm = ramp(frame, TYPE_END, 8, EASE.out); // 敲完：描边变深确认
  const press = interpolate(frame, [SUBMIT, SUBMIT + 3, SUBMIT + 10], [0, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad),
  });
  const promptIn = ramp(frame, 0, 14, EASE.snappy);

  // 成树后整体呼吸一拍
  const lastStart = nodeStart(NODES[NODES.length - 1]);
  const breathe = interpolate(frame, [lastStart + 22, lastStart + 34, lastStart + 50], [1, 1.035, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.sin),
  });

  return (
    <AbsoluteFill style={{ background: G.bg, overflow: 'hidden', fontFamily: FONT.sans }}>
      <Backdrop tone="light" light={{ x: 0.5, y: 0.28 }} accent={G.accent} grain={0} />
      <AbsoluteFill
        style={{
          backgroundImage: 'radial-gradient(rgba(20,22,28,0.12) 1.6px, transparent 1.8px)',
          backgroundSize: '40px 40px',
          backgroundPosition: '0 16px',
          WebkitMaskImage: 'radial-gradient(ellipse 62% 66% at 50% 56%, #000 35%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 62% 66% at 50% 56%, #000 35%, transparent 100%)',
        }}
      />

      {/* prompt 条 */}
      <div
        style={{
          position: 'absolute',
          left: 460,
          top: 88,
          width: 1000,
          height: 84,
          background: 'linear-gradient(180deg, #ffffff, #fbfbfa)',
          border: `1.5px solid ${confirm > 0 ? `rgba(91,99,211,${0.25 + 0.6 * confirm})` : G.hairlineStrong}`,
          borderRadius: 42,
          display: 'flex',
          alignItems: 'center',
          padding: '0 14px 0 28px',
          boxSizing: 'border-box',
          boxShadow: `0 0 0 ${5 * confirm}px rgba(91,99,211,${0.12 * confirm}), inset 0 1px 0 rgba(255,255,255,0.9), ${softShadow(14)}`,
          fontSize: 30,
          fontWeight: 560,
          color: G.ink1,
          letterSpacing: tracking(30),
          opacity: promptIn,
          transform: `translateY(${(1 - promptIn) * -12}px)`,
        }}
      >
        <div style={{ marginRight: 18, flexShrink: 0, display: 'grid', placeItems: 'center' }}>
          <SparkIcon c={G.accent} />
        </div>
        <span style={{ whiteSpace: 'nowrap' }}>
          {PROMPT.slice(0, typed)}
          <span style={{
            display: 'inline-block', width: 2.5, height: 34, marginLeft: 3, verticalAlign: -6, borderRadius: 2,
            background: G.accent, opacity: caretOn ? 1 : 0,
          }} />
        </span>
        {/* 提交键：敲完点亮 → 按下 → 生成中 */}
        <div style={{
          marginLeft: 'auto', width: 56, height: 56, borderRadius: 28, flexShrink: 0, display: 'grid', placeItems: 'center',
          background: confirm > 0 ? `rgba(91,99,211,${0.15 + 0.85 * confirm})` : G.fill2,
          boxShadow: confirm > 0.5 ? `inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 12px -4px rgba(91,99,211,${0.6 - press * 0.4})` : 'none',
          transform: `scale(${1 - 0.1 * press})`,
        }}>
          <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <path d="M12 19V5M6 11l6-6 6 6" stroke={confirm > 0.5 ? '#fff' : G.ink3} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* 树（呼吸缩放以树心为原点） */}
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${breathe})`, transformOrigin: '960px 620px' }}>
        {/* 连线层 */}
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
          {NODES.filter((n) => n.parent >= 0).map((n) => {
            const p = NODES[n.parent];
            const start = nodeStart(n) - 8; // 线比子节点先长
            const grow = interpolate(frame, [start, start + 16], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.out(Easing.cubic),
            });
            if (grow <= 0) return null;
            const port = ramp(frame, start + 10, 8, EASE.overshoot);
            return (
              <g key={n.id}>
                <path
                  d={edgePath(p, n)}
                  stroke={EDGE_C}
                  strokeWidth={2}
                  fill="none"
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={1 - grow}
                />
                {/* 子端口点：线到位时弹出 */}
                <circle cx={n.x} cy={n.y - NODE_H / 2 - 6} r={4.5 * port} fill="#fff" stroke={EDGE_C} strokeWidth={2} />
              </g>
            );
          })}
          {/* 父端口点：自己的第一条出线开始生长时出现 */}
          {NODES.filter((n) => n.level < 2).map((n) => {
            const firstChild = NODES.find((c) => c.parent === n.id);
            if (!firstChild) return null;
            const port = ramp(frame, nodeStart(firstChild) - 10, 8, EASE.overshoot);
            return <circle key={`p${n.id}`} cx={n.x} cy={n.y + NODE_H / 2 + 6} r={4.5 * port} fill="#fff" stroke={EDGE_C} strokeWidth={2} />;
          })}
        </svg>

        {/* 节点层 */}
        {NODES.map((n) => {
          const start = nodeStart(n);
          if (frame < start) return null;
          const pop = spring({ frame: frame - start, fps, config: { damping: 11, stiffness: 170 } });
          const op = interpolate(frame - start, [0, 5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const lift = (1 - Math.min(1, pop)) * 16; // 弹出时离地更高，落定阴影收紧
          const dark = n.level === 0;
          return (
            <div
              key={n.id}
              style={{
                position: 'absolute',
                left: n.x - NODE_W / 2,
                top: n.y - NODE_H / 2,
                width: NODE_W,
                height: NODE_H,
                background: dark ? 'linear-gradient(180deg, #25272e, #17181d)' : 'linear-gradient(180deg, #ffffff, #fbfbfa)',
                border: dark ? '1px solid rgba(255,255,255,0.06)' : `1px solid ${G.hairline}`,
                borderRadius: 16,
                boxSizing: 'border-box',
                overflow: 'hidden',
                boxShadow: `inset 0 1px 0 rgba(255,255,255,${dark ? 0.1 : 0.9}), ${softShadow(5 + lift, { strength: dark ? 1.6 : 1 })}`,
                opacity: op,
                transform: `translateY(${(1 - pop) * 14}px) scale(${0.82 + 0.18 * pop})`,
              }}
            >
              <EntityCard n={n} t={frame - start} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
