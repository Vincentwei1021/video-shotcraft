import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, useCurrentFrame} from 'remotion';
import {EASE, FONT, Grain, Vignette, ramp, tracking} from '../../_fixtures/Polish';
import backplate from './agent-stream.jpg';

// 整段时长：摘要 18 → 7 行证据 42–93 → 末图标 done ≈104 → 完成脉冲 110–120 → 静止 30f
export const STREAM_RESPONSE_DURATION = 150;

// 行节拍：cue[i]=42+[0,11,21,30,38,45,51]，间隔 11→6f 逐渐收紧（工作加速，但仍可数）
const ROW_CUES = [42, 53, 63, 72, 80, 87, 93];
const ROWS = [
  ['Indexed the workspace', '128 files'],
  ['Mapped the authentication flow', '12 modules'],
  ['Checked recent error traces', 'No blockers'],
  ['Matched API contracts to handlers', '24 routes'],
  ['Verified permission boundaries', '6 roles'],
  ['Cross-checked release notes', '3 changes'],
  ['Prepared an implementation plan', 'Ready'],
] as const;

const SUMMARY_CUE = 18; // 摘要语义块揭示起点（12f 软 wipe）
const STATUS_LAG = 3; // 状态图标比行体晚 3f（拖拽层级）
const STATUS_DUR = 8; // pending → running → done
const PULSE = 110; // 末图标 done 后 6f：面板级一次完成脉冲（10f）

const LIME = '184,243,106'; // 唯一强调色（完成态）
const INK1 = '#eef0f2';
const INK2 = '#9aa1a9';
const INK3 = '#646b73';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const rowEase = Easing.bezier(0.2, 0.75, 0.25, 1); // 卡片参数表：行入场曲线

const ROW_H = 58;
const ROW_GAP = 10;

const CheckPath: React.FC<{draw: number; size: number; stroke: number}> = ({draw, size, stroke}) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M3.6 8.4 6.7 11.2 12.4 5.1"
      stroke="#132008" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw}
    />
  </svg>
);

// 状态回执：pending 虚环 → running 缺口弧（旋转）→ done 实心勾（轻过冲 + 勾线描出）
const StatusIcon: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const pending = interpolate(t, [0, 0.3], [1, 0], clamp);
  const running = interpolate(t, [0, 0.25, 0.6, 0.78], [0, 1, 1, 0], clamp);
  const done = interpolate(t, [0.55, 1], [0, 1], clamp);
  const pop = interpolate(EASE.overshoot(interpolate(t, [0.55, 1], [0, 1], clamp)), [0, 1], [0.6, 1]);
  const draw = EASE.out(interpolate(t, [0.7, 1], [0, 1], clamp));
  const spin = frame * 14 + t * 220;
  return (
    <div style={{position: 'relative', width: 28, height: 28, flex: '0 0 auto'}}>
      <div style={{
        position: 'absolute', inset: 3, borderRadius: 99, border: '1.5px dashed rgba(170,178,188,.38)',
        opacity: pending * (t > 0 ? 1 : 0.9),
      }}/>
      <svg width={28} height={28} viewBox="0 0 28 28" style={{position: 'absolute', inset: 0, opacity: running, transform: `rotate(${spin}deg)`}}>
        <circle cx={14} cy={14} r={10.5} fill="none" stroke="rgba(255,255,255,.10)" strokeWidth={2}/>
        <circle cx={14} cy={14} r={10.5} fill="none" stroke={`rgb(${LIME})`} strokeWidth={2} strokeLinecap="round"
          strokeDasharray="20 66"/>
      </svg>
      <div style={{
        position: 'absolute', inset: 1, borderRadius: 99, opacity: done, transform: `scale(${pop})`,
        background: `linear-gradient(180deg, #c9f78a, rgb(${LIME}) 60%, #a2df55)`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,.45), 0 0 0 1px rgba(${LIME},.25), 0 4px 10px -2px rgba(${LIME},.25)`,
        display: 'grid', placeItems: 'center',
      }}>
        <CheckPath draw={draw} size={17} stroke={2.2}/>
      </div>
    </div>
  );
};

const EvidenceRow: React.FC<{cue: number; title: string; meta: string; index: number}> = ({cue, title, meta, index}) => {
  const frame = useCurrentFrame();
  const body = interpolate(frame, [cue, cue + 12], [0, 1], {...clamp, easing: rowEase});
  const status = interpolate(frame, [cue + STATUS_LAG, cue + STATUS_LAG + STATUS_DUR], [0, 1], clamp);
  // 刚到的行底色略亮（"正在处理"），done 后 10f 收回到静置底色——是状态，不是扫光
  const active = interpolate(frame, [cue, cue + 6, cue + STATUS_LAG + STATUS_DUR, cue + STATUS_LAG + STATUS_DUR + 10], [0, 1, 1, 0], clamp);
  const doneMeta = interpolate(status, [0.7, 1], [0, 1], clamp);
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, top: index * (ROW_H + ROW_GAP), height: ROW_H,
      borderRadius: 14, boxSizing: 'border-box',
      border: `1px solid rgba(255,255,255,${0.06 + 0.04 * active})`,
      background: `linear-gradient(180deg, rgba(255,255,255,${0.035 + 0.025 * active}), rgba(255,255,255,${0.018 + 0.015 * active}))`,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04)',
      display: 'flex', alignItems: 'center', padding: '0 22px 0 18px', gap: 16,
      opacity: body,
      transform: `translateY(${18 * (1 - body)}px)`,
      filter: body < 0.999 ? `blur(${(6 * (1 - body)).toFixed(2)}px)` : undefined,
    }}>
      <StatusIcon t={status} frame={frame}/>
      <div style={{fontSize: 24, fontWeight: 500, color: INK1, letterSpacing: tracking(24), flex: 1}}>{title}</div>
      <div style={{
        fontSize: 18, fontWeight: 560, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.005em',
        padding: '5px 12px', borderRadius: 99,
        color: `rgba(${LIME},${0.5 + 0.45 * doneMeta})`,
        background: `rgba(${LIME},${0.03 + 0.06 * doneMeta})`,
        border: `1px solid rgba(${LIME},${0.06 + 0.12 * doneMeta})`,
        filter: doneMeta < 1 ? `saturate(${doneMeta})` : undefined,
      }}>{meta}</div>
    </div>
  );
};

export const StreamResponse: React.FC = () => {
  const frame = useCurrentFrame();

  // 面板入场：上浮 + 微缩放，强 ease-out；相机 1.04→1.0 微退（背景比面板退得多 = 轻视差）
  const panelIn = ramp(frame, 0, 18, EASE.snappy);
  const cam = ramp(frame, 0, 110, EASE.out);
  const plateScale = 1.075 - 0.075 * cam;
  const panelScale = 1.04 - 0.04 * cam;

  // 摘要：语义块软边 wipe（遮罩带 18% 羽化），附句晚 5f 跟随
  const summary = ramp(frame, SUMMARY_CUE, 12, EASE.out);
  const summarySub = ramp(frame, SUMMARY_CUE + 5, 12, EASE.out);
  const wipe = summary * 118;

  // 完成：末图标 done ≈104，6f 后面板级脉冲 0.25→0.55→0.25（共 10f），然后全画面静止
  const pulse = interpolate(frame, [PULSE - 6, PULSE, PULSE + 5, PULSE + 10], [0, 0.25, 0.55, 0.25], clamp);
  const complete = ramp(frame, PULSE, 12, EASE.snappy);

  // 底部进度：每行 done 时计数 +1，进度条跟随（out 缓动，不跳格）
  const doneAt = (i: number) => ROW_CUES[i] + STATUS_LAG + STATUS_DUR * 0.7;
  const doneCount = ROW_CUES.reduce((n, _, i) => n + (frame >= doneAt(i) ? 1 : 0), 0);
  const progress = ROW_CUES.reduce((s, _, i) => s + ramp(frame, doneAt(i) - 2, 8, EASE.out), 0) / ROWS.length;

  return (
    <AbsoluteFill style={{background: '#08090b', fontFamily: FONT.sans, overflow: 'hidden'}}>
      {/* 后景：参考截图只做"纹理"——重虚化、压暗、去饱和，读不出字 */}
      <AbsoluteFill style={{transform: `scale(${plateScale})`}}>
        <Img src={backplate} style={{
          width: '100%', height: '100%', objectFit: 'cover',
          filter: 'brightness(.42) saturate(.5) blur(9px)', opacity: .75,
        }}/>
      </AbsoluteFill>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 60% 55% at 50% 46%, rgba(8,10,12,.15) 0%, rgba(6,7,9,.78) 100%)'}}/>
      {/* 面板身后一抹极淡的强调色余光 */}
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse 38% 34% at 50% 52%, rgba(${LIME},${0.035 + 0.05 * pulse}) 0%, rgba(${LIME},0) 70%)`,
      }}/>

      <div style={{
        position: 'absolute', left: 344, top: 72, width: 1232, height: 936, boxSizing: 'border-box',
        borderRadius: 30, overflow: 'hidden',
        background: 'linear-gradient(165deg, rgba(28,31,35,.985) 0%, rgba(17,19,22,.99) 45%, rgba(13,15,17,.995) 100%)',
        border: `1px solid rgba(255,255,255,${0.08 * (1 - pulse * 1.4)})`,
        boxShadow: [
          `0 0 0 1px rgba(${LIME},${pulse})`,
          `0 0 ${36 + 40 * pulse}px rgba(${LIME},${pulse * 0.22})`,
          'inset 0 1px 0 rgba(255,255,255,.07)',
          '0 2px 6px rgba(0,0,0,.4)',
          '0 50px 120px -20px rgba(0,0,0,.75)',
        ].join(', '),
        opacity: panelIn,
        transform: `translateY(${16 * (1 - panelIn)}px) scale(${(0.985 + 0.015 * panelIn) * panelScale})`,
      }}>
        {/* 顶栏 */}
        <div style={{
          height: 84, display: 'flex', alignItems: 'center', padding: '0 34px',
          borderBottom: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.012)',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center',
            background: 'linear-gradient(180deg, #f4f6f7, #d9dee2)', color: '#15191b', fontWeight: 760, fontSize: 18,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.9), 0 2px 6px rgba(0,0,0,.35)',
          }}>A</div>
          <div style={{marginLeft: 14, fontSize: 24, fontWeight: 620, color: INK1, letterSpacing: tracking(24)}}>Ask Atlas</div>
          <div style={{marginLeft: 12, fontSize: 16, color: INK3, letterSpacing: '0.01em'}}>Workspace agent</div>
          {/* 运行态 chip：Working（呼吸点）→ Complete（勾），跟随完成态切换 */}
          <div style={{
            marginLeft: 'auto', position: 'relative', height: 36, width: 148, borderRadius: 99,
            border: `1px solid rgba(${complete > 0.5 ? LIME : '255,255,255'},${complete > 0.5 ? 0.22 : 0.08})`,
            background: `rgba(${LIME},${0.02 + 0.06 * complete})`,
          }}>
            <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, opacity: 1 - complete, fontSize: 16, color: INK2, fontWeight: 520}}>
              <span style={{width: 8, height: 8, borderRadius: 99, background: `rgb(${LIME})`, opacity: 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(frame / 4.5))}}/>
              Working
            </div>
            <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: complete, transform: `translateY(${4 * (1 - complete)}px)`, fontSize: 16, color: `rgb(${LIME})`, fontWeight: 600}}>
              <svg width={14} height={14} viewBox="0 0 16 16" fill="none"><path d="M3.4 8.3 6.6 11l6-6" stroke={`rgb(${LIME})`} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"/></svg>
              Complete
            </div>
          </div>
        </div>

        <div style={{padding: '28px 38px 0'}}>
          {/* 用户提问 */}
          <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
            <div style={{
              width: 34, height: 34, borderRadius: 99, flex: 'none', display: 'grid', placeItems: 'center',
              background: 'linear-gradient(180deg, #5d6470, #3c424b)', color: '#e9ecef', fontSize: 14, fontWeight: 650,
            }}>MK</div>
            <div style={{
              flex: 1, height: 52, borderRadius: 14, display: 'flex', alignItems: 'center', padding: '0 20px',
              background: 'rgba(255,255,255,.045)', border: '1px solid rgba(255,255,255,.05)',
              color: '#c3c8cd', fontSize: 20, letterSpacing: tracking(20),
            }}>
              Review this codebase and identify the safest implementation path
            </div>
          </div>

          {/* 摘要：结论先到 */}
          <div style={{
            marginTop: 22, padding: '18px 22px 20px', borderRadius: 16, position: 'relative',
            background: `rgba(${LIME},${0.04 * pulse})`,
          }}>
            <div style={{
              opacity: summary,
              transform: `translateY(${10 * (1 - summary)}px)`,
              WebkitMaskImage: `linear-gradient(90deg, #000 ${wipe - 18}%, transparent ${wipe}%)`,
              maskImage: `linear-gradient(90deg, #000 ${wipe - 18}%, transparent ${wipe}%)`,
            }}>
              <div style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12}}>
                <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                  <path d="M8 1.5l1.6 4.2 4.4.3-3.4 2.8 1.1 4.3L8 10.7 4.3 13.1l1.1-4.3L2 6l4.4-.3z" fill={`rgba(${LIME},.85)`}/>
                </svg>
                <span style={{color: INK2, fontSize: 15, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.14em'}}>Result summary</span>
              </div>
              <div style={{color: '#f6f7f8', fontSize: 34, fontWeight: 620, lineHeight: 1.22, letterSpacing: tracking(34)}}>
                The codebase is ready for a focused, low-risk implementation.
              </div>
            </div>
            <div style={{
              marginTop: 10, color: INK2, fontSize: 19, lineHeight: 1.4, letterSpacing: tracking(19),
              opacity: summarySub, transform: `translateY(${8 * (1 - summarySub)}px)`,
            }}>
              Auth, API and permission layers agree; no blocking errors in the last 7 days.
            </div>
          </div>

          <div style={{height: 1, margin: '16px 0 18px', background: 'linear-gradient(90deg, rgba(255,255,255,.09), rgba(255,255,255,.04))'}}/>

          {/* 证据行：真实槽位，逐条汇入 */}
          <div style={{position: 'relative', height: ROWS.length * (ROW_H + ROW_GAP) - ROW_GAP}}>
            {ROWS.map(([title, meta], index) => (
              <EvidenceRow key={title} cue={ROW_CUES[index]} title={title} meta={meta} index={index}/>
            ))}
          </div>

          {/* 底部：进度计数 → 完成态 */}
          <div style={{marginTop: 24, position: 'relative', height: 66}}>
            <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 3, borderRadius: 3, background: 'rgba(255,255,255,.06)', overflow: 'hidden'}}>
              <div style={{
                width: `${progress * 100}%`, height: '100%', borderRadius: 3,
                background: `linear-gradient(90deg, rgba(${LIME},.55), rgb(${LIME}))`,
              }}/>
            </div>
            <div style={{position: 'absolute', left: 0, right: 0, top: 22, display: 'flex', alignItems: 'center', height: 32}}>
              <div style={{position: 'relative', flex: 1, height: 32}}>
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 10,
                  opacity: frame < ROW_CUES[0] ? ramp(frame, 30, 10) : 1 - complete,
                  color: INK2, fontSize: 19,
                }}>
                  Running checks
                </div>
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 12,
                  opacity: complete, transform: `translateY(${6 * (1 - complete)}px)`,
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 99, display: 'grid', placeItems: 'center',
                    background: `rgb(${LIME})`, transform: `scale(${interpolate(EASE.overshoot(complete), [0, 1], [0.6, 1])})`,
                  }}>
                    <CheckPath draw={EASE.out(ramp(frame, PULSE + 3, 8, EASE.linear))} size={16} stroke={2.3}/>
                  </div>
                  <span style={{color: '#e2ecd6', fontSize: 21, fontWeight: 620, letterSpacing: tracking(21)}}>Analysis complete</span>
                  <span style={{color: INK3, fontSize: 18}}>ready to build</span>
                </div>
              </div>
              <div style={{
                fontSize: 19, fontWeight: 560, fontVariantNumeric: 'tabular-nums',
                color: doneCount === ROWS.length ? `rgb(${LIME})` : INK2,
                opacity: ramp(frame, 30, 10),
              }}>
                {doneCount}/{ROWS.length} checks
              </div>
            </div>
          </div>
        </div>
      </div>

      <Vignette strength={0.42} inner={0.55} color="#030405"/>
      <Grain opacity={0.07} blend="soft-light"/>
    </AbsoluteFill>
  );
};
