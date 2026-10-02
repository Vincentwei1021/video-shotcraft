// ai-stream-response — AI 响应面板先落一句可读结论，再让带状态图标的证据行逐条汇入，最后统一收束成完成态。
//
// 第二轮重设计（暖纸 · 编辑部式 AI 回答）：
// - look = paper（暖白纸 · 墨 · 朱红，墨绿做完成态）。虚构研究助手「Wren」回答一个真实感的业务问题；
//   面板 1440×888 正视居中（信息密集镜头正视，Q6），为镜头设计：问题 34px、结论 50px 衬线大字、证据行 32px。
// - 结论先到：结论句按三个语义块（"Conversion fell 3.2 pts" / "after release 4.18" / "broke one-tap pay on mobile web."）
//   依次由虚到实升起，落定后朱红记号笔在关键短语「release 4.18」下划出一道——观众先读懂答案。
// - 证据随后：6 条证据行自下 20px + blur 6px 逐行汇入，间隔 10→6f 逐渐收紧（工作在加速，但仍可数）；
//   行体先停，状态图标晚 3f 由 pending 虚环 → running 朱红缺口弧 → done 墨绿实心勾（过冲 + 勾线描出），
//   正在处理的行底色微暖（状态，不是扫光）；页脚进度条与计数随每个 done 前进。
// - 完成收束：末图标 done 后面板只做一次墨绿描边脉冲（Q4：面板级一次，不逐行发光），状态 chip 由
//   Thinking（呼吸点）换成 Done · 38s，页脚换成「Analysis complete」。相机全程 1.04 → 1.0 微退。
// - 亮场的层次：面板身后一抹暖光 + 一张错后 26px、缩到 0.955 的底页（纸堆厚度，晚 3f 跟随落定）。
//
// 时间表（30fps，共 150f）：
//   0–16    面板上浮落定（snappy），问题与 Thinking chip 已在
//   14–44   结论：眉题 14f → 三个语义块 18 / 25 / 32f 起各 12f；记号笔 42–54f
//   56–108  证据行：cue = 56 + [0,10,19,27,34,40]，每行 12f；图标晚 3f、8f 完成
//   108–122 完成：面板描边脉冲 108–120f、chip / 页脚换态 110f 起
//   0–120   相机 1.04 → 1.0（out）；122–150 全画面静止 28f
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, FONT, bezier, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, SERIF, Stage, alpha, type } from '../../_fixtures/Look';

export const STREAM_RESPONSE_DURATION = 150;

const L = LOOKS.paper;
const RED = L.accent; // 朱红：助手身份 + 关键短语 + running
const GREEN = L.accent2; // 墨绿：done / 完成态

const SUMMARY_CUE = 18;
const CHUNK_GAP = 7;
const ROW_CUES = [56, 66, 75, 83, 90, 96]; // 间隔 10→6f 逐渐收紧
const STATUS_LAG = 3; // 图标比行体晚 3f（拖拽层级）
const STATUS_DUR = 8; // pending → running → done
const PULSE = 108; // 末图标 done ≈ 107 后的面板级完成脉冲

const ROWS: [string, string][] = [
  ['Compared 14 days of checkout funnels', '2.1M events'],
  ['Isolated the drop to mobile web sessions', '−71% pay rate'],
  ['Matched the timing to release 4.18', 'Tue 14:02'],
  ['Found wallet-token errors in the logs', '2,418 errors'],
  ['Confirmed the fix on staging', 'PR #3127'],
  ['Drafted a rollback plan', 'Ready'],
];
const CHUNKS = ['Conversion fell 3.2 pts ', 'after release 4.18 ', 'broke one-tap pay on mobile web.'];

const PANEL = { x: 240, y: 96, w: 1440, h: 888 };
const ROW_H = 58;
const ROW_GAP = 8;
const rowEase = bezier(0.2, 0.75, 0.25, 1);

const Check: React.FC<{ draw: number; size: number; color?: string; stroke?: number }> = ({ draw, size, color = '#ffffff', stroke = 2.4 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M3.6 8.4 6.7 11.2 12.4 5.1" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
  </svg>
);

// 状态回执：pending 虚环 → running 朱红缺口弧（旋转）→ done 墨绿实心勾（轻过冲 + 勾线描出）
const StatusIcon: React.FC<{ t: number; frame: number }> = ({ t, frame }) => {
  const pending = 1 - ramp(t, 0, 0.3, EASE.linear);
  const running = Math.min(ramp(t, 0, 0.25, EASE.linear), 1 - ramp(t, 0.6, 0.18, EASE.linear));
  const done = ramp(t, 0.55, 0.45, EASE.linear);
  const pop = mix(0.55, 1, EASE.overshoot(ramp(t, 0.55, 0.45, EASE.linear)));
  const draw = ramp(t, 0.72, 0.28, EASE.out);
  const spin = frame * 16 + t * 240;
  return (
    <div style={{ position: 'relative', width: 36, height: 36, flex: '0 0 auto' }}>
      <div style={{ position: 'absolute', inset: 4, borderRadius: 99, border: `2px dashed ${alpha(L.ink, 0.22)}`, opacity: pending }} />
      <svg width={36} height={36} viewBox="0 0 36 36" style={{ position: 'absolute', inset: 0, opacity: running, transform: `rotate(${spin}deg)` }}>
        <circle cx={18} cy={18} r={13} fill="none" stroke={alpha(L.ink, 0.1)} strokeWidth={2.5} />
        <circle cx={18} cy={18} r={13} fill="none" stroke={RED} strokeWidth={2.5} strokeLinecap="round" strokeDasharray="22 60" />
      </svg>
      <div style={{
        position: 'absolute', inset: 2, borderRadius: 99, opacity: done, transform: `scale(${pop.toFixed(3)})`,
        background: `linear-gradient(180deg, #2c7a62, ${GREEN})`, display: 'grid', placeItems: 'center',
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 10px -3px ${alpha(GREEN, 0.5)}`,
      }}>
        <Check draw={draw} size={20} />
      </div>
    </div>
  );
};

const EvidenceRow: React.FC<{ cue: number; title: string; meta: string; index: number; frame: number }> = ({ cue, title, meta, index, frame }) => {
  const body = ramp(frame, cue, 12, rowEase);
  const status = ramp(frame, cue + STATUS_LAG, STATUS_DUR, EASE.linear);
  const doneAt = cue + STATUS_LAG + STATUS_DUR;
  // 正在处理：行底色微暖（状态），done 后 10f 收回
  const active = Math.min(ramp(frame, cue, 6, EASE.out), 1 - ramp(frame, doneAt, 10, EASE.out));
  const doneMeta = ramp(status, 0.7, 0.3, EASE.linear);
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, top: index * (ROW_H + ROW_GAP), height: ROW_H, borderRadius: 14,
      display: 'flex', alignItems: 'center', gap: 22, padding: '0 22px', boxSizing: 'border-box',
      background: alpha('#f3e7d6', 0.85 * active),
      opacity: body, transform: `translateY(${(20 * (1 - body)).toFixed(2)}px)`,
      filter: body < 0.995 ? `blur(${(6 * (1 - body)).toFixed(2)}px)` : undefined,
    }}>
      <StatusIcon t={status} frame={frame} />
      <div style={{ ...type(32, 520), color: L.ink, flex: 1 }}>{title}</div>
      <div style={{ ...type(28, 500, { mono: true }), color: doneMeta > 0.5 ? L.ink2 : L.ink3, opacity: 0.55 + 0.45 * doneMeta }}>{meta}</div>
    </div>
  );
};

export const StreamResponse: React.FC = () => {
  const frame = useCurrentFrame();

  // 面板入场 + 相机微退
  const panelIn = ramp(frame, 0, 16, EASE.snappy);
  const cam = 1.04 - 0.04 * ramp(frame, 0, 120, EASE.out);

  // 结论：眉题 → 三个语义块（由虚到实升起）→ 记号笔
  const eyebrow = ramp(frame, 14, 10, EASE.out);
  const marker = ramp(frame, 42, 12, EASE.swift);

  // 完成：面板描边一次脉冲（墨绿），chip 与页脚换态
  const pulse = Math.sin(ramp(frame, PULSE, 12, EASE.linear) * Math.PI);
  const complete = ramp(frame, PULSE + 2, 12, EASE.snappy);

  // 页脚进度：每行 done 时 +1，进度条 out 缓动跟随
  const doneAt = (i: number) => ROW_CUES[i] + STATUS_LAG + STATUS_DUR * 0.7;
  const doneCount = ROW_CUES.reduce((n, _, i) => n + (frame >= doneAt(i) ? 1 : 0), 0);
  const progress = ROW_CUES.reduce((s, _, i) => s + ramp(frame, doneAt(i) - 2, 8, EASE.out), 0) / ROWS.length;
  const footIn = ramp(frame, 48, 10, EASE.out);

  return (
    <AbsoluteFill style={{ overflow: 'hidden', fontFamily: FONT.sans }}>
      <Stage look={L} keyLight={{ x: 0.3, y: 0.02 }} fill={{ x: 0.85, y: 0.95 }} />
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${cam.toFixed(5)})`, transformOrigin: '960px 520px' }}>
        {/* 面板身后：一抹暖光 + 一张错后的底页（纸堆的厚度，给亮场一层前后景） */}
        <div style={{ position: 'absolute', left: PANEL.x - 200, top: PANEL.y - 100, width: PANEL.w + 400, height: PANEL.h + 260, background: `radial-gradient(ellipse 50% 50% at 50% 55%, ${alpha('#f2b48a', 0.22)}, ${alpha('#f2b48a', 0)} 70%)`, opacity: panelIn }} />
        <div style={{
          position: 'absolute', left: PANEL.x, top: PANEL.y, width: PANEL.w, height: PANEL.h, borderRadius: 32,
          background: '#f3ebdf', boxShadow: `inset 0 0 0 1px ${alpha(L.ink, 0.06)}, 0 30px 60px -30px ${alpha(L.shadow, 0.3)}`,
          opacity: panelIn * 0.9, transform: `translateY(${(26 + 30 * (1 - ramp(frame, 3, 18, EASE.snappy))).toFixed(2)}px) scale(0.955)`,
        }} />
        <div style={{
          position: 'absolute', left: PANEL.x, top: PANEL.y, width: PANEL.w, height: PANEL.h, borderRadius: 32, overflow: 'hidden',
          background: 'linear-gradient(180deg, #fffdf9 0%, #fdf9f2 100%)',
          boxShadow: [
            `0 0 0 ${(1 + 1.5 * pulse).toFixed(2)}px ${pulse > 0.01 ? alpha(GREEN, 0.15 + 0.5 * pulse) : alpha(L.ink, 0.08)}`,
            `0 0 ${(40 * pulse).toFixed(1)}px ${alpha(GREEN, 0.18 * pulse)}`,
            'inset 0 1px 0 rgba(255,255,255,1)',
            `0 2px 4px ${alpha(L.shadow, 0.06)}`,
            `0 40px 90px -30px ${alpha(L.shadow, 0.32)}`,
          ].join(', '),
          opacity: panelIn, transform: `translateY(${(30 * (1 - panelIn)).toFixed(2)}px) scale(${(0.985 + 0.015 * panelIn).toFixed(4)})`,
        }}>
          {/* 页头：用户问题 + 状态 chip */}
          <div style={{ height: 112, display: 'flex', alignItems: 'center', padding: '0 44px', gap: 20, borderBottom: `1px solid ${L.line}` }}>
            <div style={{
              width: 52, height: 52, borderRadius: 99, display: 'grid', placeItems: 'center', flex: 'none',
              background: 'linear-gradient(180deg, #e9dfd0, #d9ccb8)', color: L.ink2, ...type(22, 700),
            }}>JL</div>
            <div style={{ ...type(34, 500), color: L.ink2 }}>Why did checkout conversion drop last week?</div>
            <div style={{ marginLeft: 'auto', position: 'relative', height: 48, width: 210, borderRadius: 99,
              background: complete > 0.5 ? alpha(GREEN, 0.1) : alpha(L.ink, 0.045),
              boxShadow: `inset 0 0 0 1px ${complete > 0.5 ? alpha(GREEN, 0.3) : alpha(L.ink, 0.08)}`,
            }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, opacity: 1 - complete, ...type(28, 600), color: L.ink2 }}>
                <span style={{ width: 10, height: 10, borderRadius: 99, background: RED, opacity: 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(frame / 4.5)) }} />
                Thinking
              </div>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: complete, transform: `translateY(${(5 * (1 - complete)).toFixed(2)}px)`, ...type(28, 650), color: GREEN }}>
                <Check draw={complete} size={20} color={GREEN} stroke={2.6} />
                Done · 38s
              </div>
            </div>
          </div>

          <div style={{ padding: '34px 44px 0' }}>
            {/* 结论：眉题 + 衬线大字（语义块揭示）+ 记号笔 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, opacity: eyebrow, transform: `translateY(${(8 * (1 - eyebrow)).toFixed(2)}px)` }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center',
                background: `linear-gradient(160deg, #f0624b, ${RED})`, boxShadow: `0 4px 10px -4px ${alpha(RED, 0.6)}`,
              }}>
                <svg width={18} height={18} viewBox="0 0 16 16"><path d="M8 1.5l1.6 4.2 4.4.3-3.4 2.8 1.1 4.3L8 10.7 4.3 13.1l1.1-4.3L2 6l4.4-.3z" fill="#fffaf3" /></svg>
              </div>
              <div style={{ ...type(22, 700, { caps: true }), letterSpacing: '0.2em', color: L.ink3 }}>Wren · Answer</div>
            </div>
            <div style={{ marginTop: 22, fontFamily: SERIF, fontSize: 54, fontWeight: 600, lineHeight: 1.16, letterSpacing: '-0.015em', color: L.ink, maxWidth: 1320 }}>
              {CHUNKS.map((c, k) => {
                const p = ramp(frame, SUMMARY_CUE + k * CHUNK_GAP, 12, EASE.out);
                const key = k === 1;
                return (
                  <span key={k} style={{
                    display: 'inline', opacity: p, filter: p < 0.995 ? `blur(${(8 * (1 - p)).toFixed(2)}px)` : undefined,
                    position: 'relative',
                  }}>
                    {key ? (
                      <span style={{ position: 'relative', display: 'inline-block', transform: `translateY(${(14 * (1 - p)).toFixed(2)}px)` }}>
                        {/* 朱红记号笔：从左往右划在短语下沿 */}
                        <span style={{
                          position: 'absolute', left: -4, right: 8, bottom: 6, height: 16, borderRadius: 4,
                          background: alpha(RED, 0.28), transformOrigin: 'left center', transform: `scaleX(${marker.toFixed(4)}) skewX(-8deg)`,
                        }} />
                        <span style={{ position: 'relative', color: key && marker > 0.5 ? '#b22a17' : L.ink }}>{c}</span>
                      </span>
                    ) : (
                      <span style={{ display: 'inline-block', transform: `translateY(${(14 * (1 - p)).toFixed(2)}px)`, whiteSpace: 'pre-wrap' }}>{c}</span>
                    )}
                  </span>
                );
              })}
            </div>

            <div style={{ height: 1, margin: '26px 0 16px', background: L.line }} />

            {/* 证据行：真实槽位，逐条汇入 */}
            <div style={{ position: 'relative', height: ROWS.length * (ROW_H + ROW_GAP) - ROW_GAP, margin: '0 -22px' }}>
              {ROWS.map(([title, meta], i) => (
                <EvidenceRow key={title} cue={ROW_CUES[i]} title={title} meta={meta} index={i} frame={frame} />
              ))}
            </div>

            {/* 页脚：进度 → 完成 */}
            <div style={{ position: 'relative', marginTop: 22, height: 64, opacity: footIn }}>
              <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 4, borderRadius: 4, background: alpha(L.ink, 0.07), overflow: 'hidden' }}>
                <div style={{ width: `${(progress * 100).toFixed(2)}%`, height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${alpha(GREEN, 0.6)}, ${GREEN})` }} />
              </div>
              <div style={{ position: 'absolute', left: 0, right: 0, top: 20, height: 40, display: 'flex', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, height: 40 }}>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', opacity: 1 - complete, ...type(30, 500), color: L.ink3 }}>
                    Running checks…
                  </div>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 14, opacity: complete, transform: `translateY(${(6 * (1 - complete)).toFixed(2)}px)` }}>
                    <span style={{ ...type(30, 650), color: GREEN }}>Analysis complete</span>
                    <span style={{ ...type(30, 450), color: L.ink3 }}>— rollback plan ready to review</span>
                  </div>
                </div>
                <div style={{ ...type(30, 600, { mono: true }), color: doneCount === ROWS.length ? GREEN : L.ink2 }}>
                  {doneCount}/{ROWS.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
