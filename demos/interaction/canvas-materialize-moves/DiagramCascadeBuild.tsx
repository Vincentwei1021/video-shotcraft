// diagram-cascade-build —— miro-promo 104–116s
// prompt 打字 → 结构图逐层级联生成（根 → 2 子 → 4 孙），连线先于节点生长，成树后整棵呼吸一拍。
//
// 第二轮重设计（极光暗场 · AI 画布"一句话长出一棵树"）：
// - look = aurora（深紫夜 · 紫粉光）。主角是"生长"本身：每条连线都带一颗发光的彗星头领跑，
//   线头到达子端口的那一帧子节点才从端口处"被拉出来"（缩放原点 = 节点顶边中点）——线牵节点，因果可见。
// - 生成源头清楚：prompt 条（虚构产品 Arbor 的 AI 命令条，36px 大字）提交后描边变成流动的紫粉渐变（生成中），
//   从 prompt 条底部先滴下一条线接到根节点——树是从这句话里长出来的；生成完毕描边落定、右侧状态变成"7 tables"。
// - 节点做成为镜头设计的 ER 表卡：34px 表名 + 两行 mono 字段（PK/FK 小签），根节点用渐变描边当主角；
//   其余是带色相的深紫玻璃面板 + 发丝线 + 顶部内高光 + 两层软阴影。
// - 相机：开场推近在 prompt 条上（1.3× 居中，读字），提交后随树生长 smooth 拉远到 1.0 揭示整体结构（crane-back），
//   全程平滑无速度突变；成树后以树心为原点呼吸 1→1.03→1，背后极光同步亮一档。
//
// 时间表（30fps，共 180f）：
//   0–10    舞台 + prompt 条落下（空条 + 光标闪）
//   8–44    打字 "Map the data model for our SaaS"（每字 1–2f 不均匀，像真人敲）
//   46–50   敲完：描边转紫确认；48f 按下提交键（scale 0.9 → 回弹）
//   50–136  生成中：描边流光；50f 起相机 1.3→1.0 拉远（smooth，72f），prompt 条从画面中心升到顶部
//   54      prompt 底部滴线 → 62f 根节点从端口拉出（spring damping 14）
//   82/104  第 1 / 2 层：线先行 10f（16f ease-out + 彗星头），同层兄弟错峰 5f
//   ~128    末节点落定 → 状态 "7 tables · 6 links"、描边流光收束
//   138–166 整棵呼吸一拍 + 极光亮一档
//   166–180 落定 hold：完整海报
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, mix, ramp, softShadow } from '../../_fixtures/Polish';
import { Dust, LOOKS, Stage, alpha, springAt, type } from '../../_fixtures/Look';

export const DIAGRAM_CASCADE_BUILD_DURATION = 180;

const L = LOOKS.aurora;
const A1 = L.accent; // 紫
const A2 = L.accent2; // 粉（点缀：渐变另一端）

const PROMPT = 'Map the data model for our SaaS';
const TYPE_START = 8;
// 每个字符的敲击间隔（帧）：确定性"人手节奏"——词间空格多停半拍
const charGap = (i: number) => (PROMPT[i] === ' ' ? 1.7 : 0.95 + 0.25 * Math.abs(Math.sin(i * 2.17)));
const CHAR_T: number[] = [];
{
  let t = TYPE_START;
  for (let i = 0; i < PROMPT.length; i++) {
    t += charGap(i);
    CHAR_T.push(t);
  }
}
const TYPE_END = CHAR_T[CHAR_T.length - 1];
const SUBMIT = Math.round(TYPE_END) + 4;

// ── 树布局（画布坐标，节点中心）──
const NODE_W = 344;
const NODE_H = 158;
type Field = [string, string, '' | 'PK' | 'FK'];
type Node = { id: number; x: number; y: number; level: number; parent: number; name: string; fields: Field[] };
const NODES: Node[] = [
  { id: 0, x: 960, y: 372, level: 0, parent: -1, name: 'Organization', fields: [['id', 'uuid', 'PK'], ['slug', 'text', '']] },
  { id: 1, x: 540, y: 608, level: 1, parent: 0, name: 'Team', fields: [['id', 'uuid', 'PK'], ['org_id', 'uuid', 'FK']] },
  { id: 2, x: 1380, y: 608, level: 1, parent: 0, name: 'Subscription', fields: [['id', 'uuid', 'PK'], ['org_id', 'uuid', 'FK']] },
  { id: 3, x: 320, y: 852, level: 2, parent: 1, name: 'Member', fields: [['team_id', 'uuid', 'FK'], ['role', 'enum', '']] },
  { id: 4, x: 760, y: 852, level: 2, parent: 1, name: 'Project', fields: [['team_id', 'uuid', 'FK'], ['due_at', 'date', '']] },
  { id: 5, x: 1160, y: 852, level: 2, parent: 2, name: 'Invoice', fields: [['sub_id', 'uuid', 'FK'], ['total', 'money', '']] },
  { id: 6, x: 1600, y: 852, level: 2, parent: 2, name: 'Plan', fields: [['id', 'uuid', 'PK'], ['seats', 'int', '']] },
];
const PROMPT_Y = 96; // prompt 条顶
const PROMPT_H = 100;
const ROOT_DRIP = SUBMIT + 6; // 滴线起笔
const CASCADE_START = SUBMIT + 14; // 根节点出现
const LEVEL_GAP = 22;
const SIBLING_STAGGER = 5;
const LEAD = 10; // 线比子节点早到
const EDGE_DUR = 16;

const nodeStart = (n: Node) => {
  if (n.level === 0) return CASCADE_START;
  const siblingIdx = NODES.filter((m) => m.level === n.level && m.id < n.id).length;
  return CASCADE_START + n.level * LEVEL_GAP + siblingIdx * SIBLING_STAGGER;
};
const LAST = nodeStart(NODES[NODES.length - 1]);
const DONE = LAST + 12;
const BREATHE = DONE + 10;

// ── 圆角折线（父底端口 → 下探 → 横移 → 下探到子顶端口），用 SVG 圆弧，长度可精确计算 ──
const R = 22;
const edgeGeom = (p: Node, c: Node) => {
  const x1 = p.x, y1 = p.y + NODE_H / 2 + 8, x2 = c.x, y2 = c.y - NODE_H / 2 - 8;
  const my = (y1 + y2) / 2;
  const dir = Math.sign(x2 - x1);
  const r = Math.min(R, Math.abs(x2 - x1) / 2);
  const sweep1 = dir > 0 ? 0 : 1;
  const sweep2 = dir > 0 ? 1 : 0;
  const d = `M ${x1} ${y1} L ${x1} ${my - r} A ${r} ${r} 0 0 ${sweep1} ${x1 + dir * r} ${my} L ${x2 - dir * r} ${my} A ${r} ${r} 0 0 ${sweep2} ${x2} ${my + r} L ${x2} ${y2}`;
  const s1 = my - r - y1, a = (Math.PI * r) / 2, h = Math.abs(x2 - x1) - 2 * r, s3 = y2 - my - r;
  const len = s1 + a + h + a + s3;
  // 沿路径弧长 u（px）取点：给彗星头定位
  const at = (u: number) => {
    if (u <= s1) return { x: x1, y: y1 + u };
    u -= s1;
    if (u <= a) { const th = u / r; return { x: x1 + dir * r * (1 - Math.cos(th)), y: my - r + r * Math.sin(th) }; }
    u -= a;
    if (u <= h) return { x: x1 + dir * (r + u), y: my };
    u -= h;
    if (u <= a) { const th = u / r; return { x: x2 - dir * r + dir * r * Math.sin(th), y: my + r - r * Math.cos(th) }; }
    u -= a;
    return { x: x2, y: my + r + Math.min(u, s3) };
  };
  return { d, len, at };
};

// ── 小图标 ──
const SparkIcon: React.FC<{ c: string; size?: number }> = ({ c, size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2.5l2.1 6.4 6.4 2.1-6.4 2.1L12 19.5l-2.1-6.4L3.5 11l6.4-2.1z" fill={c} />
    <path d="M19 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" fill={c} opacity={0.6} />
  </svg>
);
const TableIcon: React.FC<{ c: string }> = ({ c }) => (
  <svg width={26} height={26} viewBox="0 0 18 18" fill="none">
    <rect x={2} y={3} width={14} height={12} rx={2.5} stroke={c} strokeWidth={1.5} />
    <path d="M2 7.5h14M7 7.5V15" stroke={c} strokeWidth={1.5} />
  </svg>
);

// ── ER 表卡 ──
const EntityCard: React.FC<{ n: Node; t: number }> = ({ n, t }) => {
  const root = n.level === 0;
  const head = ramp(t, 3, 8, EASE.out);
  const row = (i: number) => ramp(t, 7 + i * 3, 9, EASE.out);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{
        height: 66, display: 'flex', alignItems: 'center', gap: 14, padding: '0 24px',
        borderBottom: `1px solid ${alpha('#ffffff', root ? 0.12 : 0.07)}`,
        opacity: head, transform: `translateY(${((1 - head) * 6).toFixed(2)}px)`,
      }}>
        <TableIcon c={root ? A1 : L.ink3} />
        <span style={{ ...type(34, 650), color: L.ink }}>{n.name}</span>
      </div>
      <div style={{ padding: '14px 24px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {n.fields.map(([k, ty, key], i) => (
          <div key={k} style={{
            display: 'flex', alignItems: 'center', gap: 10, height: 26, ...type(22, 500, { mono: true }),
            opacity: row(i), transform: `translateX(${((1 - row(i)) * -8).toFixed(2)}px)`,
          }}>
            <span style={{ color: L.ink2 }}>{k}</span>
            {key && (
              <span style={{
                ...type(15, 700, { caps: true }), padding: '3px 7px', borderRadius: 6,
                color: key === 'PK' ? A1 : A2, background: alpha(key === 'PK' ? A1 : A2, 0.14),
              }}>{key}</span>
            )}
            <span style={{ marginLeft: 'auto', color: L.ink3 }}>{ty}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const DiagramCascadeBuild: React.FC = () => {
  const frame = useCurrentFrame();

  // ── prompt ──
  let typed = 0;
  while (typed < PROMPT.length && CHAR_T[typed] <= frame) typed++;
  const caretOn = frame < SUBMIT && (typed < PROMPT.length || Math.floor((frame - TYPE_END) / 7) % 2 === 0);
  const confirm = ramp(frame, TYPE_END, 6, EASE.out);
  const press = frame < SUBMIT ? 0 : frame < SUBMIT + 3 ? ramp(frame, SUBMIT, 3, EASE.out) : 1 - ramp(frame, SUBMIT + 3, 10, EASE.out);
  const promptIn = ramp(frame, 0, 14, EASE.snappy);
  const generating = ramp(frame, SUBMIT, 8, EASE.out) * (1 - ramp(frame, DONE, 12, EASE.out));
  const doneIn = ramp(frame, DONE, 14, EASE.snappy);
  const flow = Math.max(0, frame - SUBMIT) * 0.012; // 描边流光相位

  // ── 相机：推近 prompt → 提交后拉远揭示全树 ──
  const pull = ramp(frame, SUBMIT + 2, 72, EASE.smooth);
  const cam = mix(1.3, 1, pull);
  const camY = mix(340, 0, pull); // 推近时把 prompt 条拉到画面正中

  // ── 成树呼吸 ──
  const br = ramp(frame, BREATHE, 14, EASE.smooth) - ramp(frame, BREATHE + 14, 14, EASE.smooth);
  const breathe = 1 + 0.03 * br;
  const auroraUp = ramp(frame, BREATHE - 6, 24, EASE.out);

  const drip = ramp(frame, ROOT_DRIP, 8, EASE.out);
  const root = NODES[0];
  const dripY1 = PROMPT_Y + PROMPT_H + 4;
  const dripY2 = root.y - NODE_H / 2 - 8;

  return (
    <AbsoluteFill style={{ background: L.bg[1], overflow: 'hidden', fontFamily: FONT.sans }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.05 }} fill={{ x: 0.82, y: 0.95 }} breathe={0.5}>
        {/* 树后的极光：随生成逐渐亮起，成树时再亮一档 */}
        <div style={{
          position: 'absolute', left: 260, right: 260, top: 380, height: 640,
          background: `radial-gradient(ellipse 50% 50% at 35% 55%, ${alpha(A1, 0.1 + 0.12 * auroraUp)} 0%, transparent 70%), radial-gradient(ellipse 45% 45% at 70% 60%, ${alpha(A2, 0.05 + 0.08 * auroraUp)} 0%, transparent 70%)`,
          opacity: ramp(frame, SUBMIT, 60, EASE.out),
        }} />
        {/* 画布点阵 */}
        <AbsoluteFill style={{
          backgroundImage: `radial-gradient(${alpha(L.ink, 0.12)} 1.4px, transparent 1.7px)`,
          backgroundSize: '40px 40px', backgroundPosition: '0 16px',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 62% at 50% 58%, #000 25%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 60% 62% at 50% 58%, #000 25%, transparent 100%)',
        }} />
        <Dust look={L} count={22} seed={5} drift={0.18} opacity={0.35} />
      </Stage>

      <AbsoluteFill style={{ transform: `translateY(${camY.toFixed(2)}px) scale(${cam.toFixed(4)})`, transformOrigin: '50% 14%' }}>
        {/* ── prompt 条：渐变描边（生成中流动）+ 内面板 ── */}
        <div style={{
          position: 'absolute', left: 960 - 560, top: PROMPT_Y, width: 1120, height: PROMPT_H, borderRadius: 50,
          padding: 2, boxSizing: 'border-box',
          background: alpha(A1, 0.14 + 0.4 * confirm),
          boxShadow: `0 0 ${(30 + 40 * generating).toFixed(1)}px ${alpha(A1, 0.1 + 0.25 * generating)}, ${softShadow(24, { color: L.shadow, strength: 2.4 })}`,
          opacity: promptIn, transform: `translateY(${((1 - promptIn) * -20).toFixed(2)}px)`,
        }}>
          {/* 生成中：流动的紫粉渐变描边；完成后留一道静止的渐变边 */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 50,
            background: `linear-gradient(90deg, ${A1}, ${A2}, ${A1}, ${A2}, ${A1})`, backgroundSize: '300% 100%',
            backgroundPosition: `${(-flow * 100).toFixed(2)}% 0`, opacity: Math.max(generating, 0.55 * doneIn),
          }} />
          <div style={{
            position: 'relative', width: '100%', height: '100%', borderRadius: 48, boxSizing: 'border-box',
            background: `linear-gradient(180deg, ${L.surface2}, ${L.surface})`,
            boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.08)}`,
            display: 'flex', alignItems: 'center', padding: '0 16px 0 30px',
          }}>
            <div style={{ marginRight: 20, flexShrink: 0, display: 'grid', placeItems: 'center', filter: `drop-shadow(0 0 ${8 + 10 * generating}px ${alpha(A1, 0.6)})` }}>
              <SparkIcon c={A1} />
            </div>
            <span style={{ ...type(36, 520), color: L.ink, whiteSpace: 'nowrap' }}>
              {PROMPT.slice(0, typed)}
              <span style={{
                display: 'inline-block', width: 3, height: 40, marginLeft: 4, verticalAlign: -7, borderRadius: 2,
                background: A1, opacity: caretOn ? 1 : 0,
              }} />
            </span>
            {/* 右侧：提交键 → 生成中 → 完成状态 */}
            <div style={{ marginLeft: 'auto', position: 'relative', height: 68, display: 'flex', alignItems: 'center' }}>
              <div style={{
                position: 'absolute', right: 0, top: 0, whiteSpace: 'nowrap', height: 68, display: 'flex', alignItems: 'center', gap: 12,
                opacity: doneIn, transform: `translateY(${((1 - doneIn) * 12).toFixed(2)}px)`,
                ...type(28, 560), color: L.ink2, paddingRight: 14,
              }}>
                <svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                  <circle cx={12} cy={12} r={10} fill={alpha(A1, 0.18)} />
                  <path d="M7.5 12.3l3 3 6-6.3" stroke={A1} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                7 tables · 6 links
              </div>
              <div style={{
                width: 68, height: 68, borderRadius: 34, display: 'grid', placeItems: 'center',
                background: confirm > 0 ? `linear-gradient(135deg, ${A1}, ${A2})` : alpha('#ffffff', 0.06),
                opacity: (0.4 + 0.6 * confirm) * (1 - doneIn),
                transform: `scale(${(1 - 0.1 * press) * (1 - 0.3 * doneIn)})`,
                boxShadow: confirm > 0.5 ? `0 6px 20px -6px ${alpha(A2, 0.7)}` : 'none',
              }}>
                <svg width={30} height={30} viewBox="0 0 24 24" fill="none">
                  <path d="M12 19V5M6 11l6-6 6 6" stroke={confirm > 0.5 ? L.onAccent : L.ink3} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* ── 树（呼吸以树心为原点） ── */}
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${breathe.toFixed(4)})`, transformOrigin: '960px 620px' }}>
          <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
            <defs>
              <linearGradient id="dcbEdge" x1="0" y1="300" x2="0" y2="800" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor={A1} stopOpacity={0.85} />
                <stop offset="1" stopColor={A2} stopOpacity={0.7} />
              </linearGradient>
              <radialGradient id="dcbHead">
                <stop offset="0" stopColor="#ffffff" stopOpacity={1} />
                <stop offset="0.35" stopColor={A2} stopOpacity={0.9} />
                <stop offset="1" stopColor={A1} stopOpacity={0} />
              </radialGradient>
            </defs>
            {/* prompt → 根的滴线 */}
            {drip > 0 && (
              <g>
                <line x1={960} y1={dripY1} x2={960} y2={mix(dripY1, dripY2, drip)} stroke="url(#dcbEdge)" strokeWidth={2.5} strokeLinecap="round" strokeDasharray="2 7" />
                {drip < 1 && <circle cx={960} cy={mix(dripY1, dripY2, drip)} r={16} fill="url(#dcbHead)" />}
              </g>
            )}
            {NODES.filter((n) => n.parent >= 0).map((n) => {
              const g = edgeGeom(NODES[n.parent], n);
              const start = nodeStart(n) - LEAD;
              const grow = ramp(frame, start, EDGE_DUR, EASE.out);
              if (grow <= 0) return null;
              const tip = g.at(grow * g.len);
              const headOp = 1 - ramp(frame, start + EDGE_DUR - 4, 8, EASE.out);
              const port = ramp(frame, start + EDGE_DUR - 6, 10, EASE.overshoot);
              return (
                <g key={n.id}>
                  {/* 柔光底线 + 实线 */}
                  <path d={g.d} stroke={A1} strokeOpacity={0.18} strokeWidth={9} fill="none" strokeLinecap="round"
                    strokeDasharray={`${g.len} ${g.len}`} strokeDashoffset={g.len * (1 - grow)} />
                  <path d={g.d} stroke="url(#dcbEdge)" strokeWidth={2.5} fill="none" strokeLinecap="round"
                    strokeDasharray={`${g.len} ${g.len}`} strokeDashoffset={g.len * (1 - grow)} />
                  {headOp > 0 && <circle cx={tip.x} cy={tip.y} r={18} fill="url(#dcbHead)" opacity={headOp} />}
                  <circle cx={n.x} cy={n.y - NODE_H / 2 - 8} r={6 * port} fill={L.bg[1]} stroke={A2} strokeWidth={2.5} />
                </g>
              );
            })}
            {/* 父端口：第一条出线起笔时出现 */}
            {NODES.filter((n) => n.level < 2).map((n) => {
              const firstChild = NODES.find((c) => c.parent === n.id)!;
              const port = ramp(frame, nodeStart(firstChild) - LEAD - 4, 8, EASE.overshoot);
              return <circle key={`p${n.id}`} cx={n.x} cy={n.y + NODE_H / 2 + 8} r={6 * port} fill={L.bg[1]} stroke={A1} strokeWidth={2.5} />;
            })}
            {/* 根的顶端口（接滴线） */}
            <circle cx={960} cy={dripY2} r={6 * ramp(frame, ROOT_DRIP + 4, 8, EASE.overshoot)} fill={L.bg[1]} stroke={A1} strokeWidth={2.5} />
          </svg>

          {NODES.map((n) => {
            const start = nodeStart(n);
            if (frame < start) return null;
            const pop = springAt(frame, start, { damping: 14, stiffness: 190 });
            const op = ramp(frame, start, 5, EASE.linear);
            const lift = (1 - Math.min(1, pop)) * 22; // 弹出时离地更高，落定阴影收紧
            const isRoot = n.level === 0;
            return (
              <div key={n.id} style={{
                position: 'absolute', left: n.x - NODE_W / 2, top: n.y - NODE_H / 2, width: NODE_W, height: NODE_H,
                borderRadius: 22, padding: isRoot ? 2 : 0, boxSizing: 'border-box',
                background: isRoot ? `linear-gradient(135deg, ${A1}, ${A2})` : undefined,
                boxShadow: `${softShadow(10 + lift, { color: L.shadow, strength: 2.6 })}${isRoot ? `, 0 0 50px ${alpha(A1, 0.25 + 0.2 * br)}` : ''}`,
                opacity: op,
                // 从顶端口"拉出"：缩放原点 = 顶边中点
                transform: `translateY(${((1 - pop) * -18).toFixed(2)}px) scale(${(0.7 + 0.3 * pop).toFixed(4)})`, transformOrigin: '50% 0%',
              }}>
                <div style={{
                  position: 'relative', width: '100%', height: '100%', borderRadius: isRoot ? 20 : 22, overflow: 'hidden', boxSizing: 'border-box',
                  background: isRoot ? `linear-gradient(180deg, #2a2045, ${L.surface})` : `linear-gradient(180deg, ${alpha('#2a2340', 0.92)}, ${alpha(L.surface, 0.94)})`,
                  border: isRoot ? undefined : `1px solid ${alpha('#ffffff', 0.09)}`,
                  boxShadow: `inset 0 1px 0 ${alpha('#ffffff', isRoot ? 0.14 : 0.08)}`,
                }}>
                  <EntityCard n={n} t={frame - start} />
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
