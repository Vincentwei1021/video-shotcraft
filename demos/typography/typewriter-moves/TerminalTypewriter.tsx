// terminal-typewriter —— 终端打字机触发（命令是引信，回车即引爆）
//
// 第二轮重设计（暖黑 · 引信）：
// - look = ember：暖黑舞台 + 顶光，终端窗是带色相的深色玻璃（发丝边 + 顶部内高光 + 两层软阴影 +
//   窗底一圈橙色余光）。命令行 64px 等宽大字「❯ forge ship --prod」，历史输出 30px 压暗作纹理。
// - 打字：帧确定逐字（1–4f 的确定性真人间隔，新词首字前顿一拍）；每个字落下时 3f 由橙热到奶白
//   （键击余温），方块光标打字中常亮、空闲 12f 方波闪。打字全程相机极缓前推 1→1.035（蓄力）。
// - 回车（f58）：命令行瞬间转橙、一条引信光从提示符烧到行尾（4f），下方出一行输出；
//   同时整窗 8f 急推 scale 1→4.4（t³ 加速，origin 钉命令行中心）+ 末 4f 模糊 + 暖白曝光闪。
// - 硬切（f66）：终端整棵卸载，部署结果页挂载并 1.12→1 回稳（14f snappy，只回稳不再推）；
//   闪光跨切点 8f 衰减。结果页：巨字「Live」+ 呼吸状态点，右侧三个区域行错峰入场、进度条
//   依次走满后翻成 Live（结果回执）。
//
// 时间表（30fps，共 150f）：
//   0–10    预备：终端已在画面里，光标方波闪
//   10–46   敲命令 17 字符（均 ~2f/字，词首顿 4f）
//   46–58   停 12f，光标闪一下（等回车）
//   58–66   回车 → 引信 4f + 急推 8f（末 4f 模糊、曝光闪）
//   66–80   硬切 → 结果页 1.12→1 回稳；闪光衰减
//   70–112  区域行错峰入场（72/78/84）、进度条依次走满（~80–110），状态翻 Live
//   112–150 hold：状态点脉动、舞台光呼吸（切后不再推），尾帧是一张完整的部署海报
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, FONT, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha, glow, type } from '../../_fixtures/Look';

export const TERMINAL_TYPEWRITER_DURATION = 150;

const L = LOOKS.ember;
const MONO = FONT.mono;
const CMD = 'forge ship --prod';

// 每字符间隔（帧）：均 ~2f，新词首字前顿 4f——真人敲命令的节奏，确定性
const GAPS = [2, 2, 1, 2, 2, 4, 2, 1, 2, 2, 4, 2, 1, 2, 2, 2, 1]; // Σ = 34
const TYPE_START = 12;
const AT: number[] = [];
GAPS.reduce((acc, g, i) => {
  AT[i] = acc;
  return acc + g;
}, TYPE_START);

const T = {
  typeEnd: AT[AT.length - 1], // 末字出现帧（f45）
  enter: 58, // 回车
  fuse: 4, // 引信烧完的帧数
  pushEnd: 66, // 急推结束 = 硬切帧
  settle: 14, // 结果页回稳时长
};

// ───────────── 终端窗几何（绝对定位，推入焦点可精确计算）─────────────
const TW = 1240;
const TH = 590;
const TL = (1920 - TW) / 2; // 340
const TT = (1080 - TH) / 2 - 10; // 235
const BAR = 60;
const PADX = 60;
const CMD_SIZE = 64;
const CH = CMD_SIZE * 0.6; // 等宽字符步进
const CMD_TOP = 368; // 命令行顶（窗内）
const CMD_LH = 88;
const FOCUS_X = TL + PADX + ((CMD.length + 2) * CH) / 2;
const FOCUS_Y = TT + CMD_TOP + CMD_LH / 2;

const HIST: { cmd: string; out: string }[] = [
  { cmd: 'forge test', out: '✓ 312 passed · 0 failed · 4.2s' },
  { cmd: 'forge build', out: '✓ bundle 1.4 MB · 8.1s' },
];

const T_PROMPT = L.accent;
const T_DIM = alpha(L.ink2, 0.42);
const T_HIST = alpha(L.ink, 0.5);
const T_OK = '#e8b25a';

const Terminal: React.FC<{ frame: number }> = ({ frame }) => {
  const chars = AT.filter((f) => frame >= f).length;
  const entered = frame >= T.enter;
  const typing = frame >= TYPE_START - 2 && frame < T.typeEnd + 4;
  const cursorOn = typing || frame % 12 < 6;
  const fuse = ramp(frame, T.enter, T.fuse, EASE.linear);
  const hot = entered ? 1 - ramp(frame, T.enter + 2, 6, EASE.out) * 0.4 : 0; // 回车后命令行整体转橙

  return (
    <div style={{
      position: 'absolute', left: TL, top: TT, width: TW, height: TH, borderRadius: 22, overflow: 'hidden',
      background: `linear-gradient(180deg, #221812 0%, #170f0b 60%, #140d09 100%)`,
      border: `1px solid ${alpha('#ffd2b0', 0.1)}`,
      boxShadow: `inset 0 1px 0 ${alpha('#ffe6d2', 0.09)}, 0 2px 4px ${alpha(L.shadow, 0.5)}, 0 40px 90px -20px ${alpha(L.shadow, 0.95)}, 0 0 0 1px ${alpha(L.shadow, 0.6)}`,
    }}>
      {/* 窗底橙色轮廓光：玻璃下沿被下方光源照亮（发丝级，中间亮两端隐） */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, background: `linear-gradient(90deg, ${alpha(L.accent, 0)} 8%, ${alpha('#ff9a5a', 0.55)} 50%, ${alpha(L.accent, 0)} 92%)` }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 120, background: `linear-gradient(0deg, ${alpha(L.accent, 0.07)} 0%, ${alpha(L.accent, 0)} 100%)` }} />
      {/* 标题栏 */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 0, height: BAR, display: 'flex', alignItems: 'center', gap: 12, padding: '0 26px',
        background: `linear-gradient(180deg, ${alpha('#ffffff', 0.045)} 0%, ${alpha('#ffffff', 0.015)} 100%)`,
        borderBottom: `1px solid ${alpha('#000000', 0.4)}`, boxShadow: `inset 0 -1px 0 ${alpha('#ffffff', 0.03)}`,
      }}>
        {['#e5674f', '#e0a64a', '#7fae5c'].map((c) => (
          <div key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c, opacity: 0.8, boxShadow: `inset 0 0 0 0.5px ${alpha('#000000', 0.3)}` }} />
        ))}
        <div style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', ...type(24, 500), color: alpha(L.ink2, 0.75) }}>
          atlas — forge — zsh
        </div>
      </div>
      {/* 历史输出：纹理级，压暗 */}
      <div style={{ position: 'absolute', left: PADX, top: BAR + 40, fontFamily: MONO, fontSize: 30, lineHeight: '46px', whiteSpace: 'pre' }}>
        {HIST.map((h) => (
          <React.Fragment key={h.cmd}>
            <div><span style={{ color: alpha(T_PROMPT, 0.55) }}>{'❯ '}</span><span style={{ color: T_HIST }}>{h.cmd}</span></div>
            <div style={{ color: T_DIM }}>{'  '}<span style={{ color: alpha(T_OK, 0.7) }}>{h.out.slice(0, 1)}</span>{h.out.slice(1)}</div>
          </React.Fragment>
        ))}
      </div>
      {/* 路径行 */}
      <div style={{ position: 'absolute', left: PADX, top: 316, fontFamily: MONO, fontSize: 30, lineHeight: '44px', whiteSpace: 'pre' }}>
        <span style={{ color: L.ink2 }}>~/atlas</span>
        <span style={{ color: T_DIM }}>{'  on '}</span>
        <span style={{ color: T_OK }}>main</span>
        <span style={{ color: T_DIM }}>{'  ·  node 22'}</span>
      </div>
      {/* 命令行：逐字符固定槽位，字落下 3f 由橙热到奶白 */}
      <div style={{ position: 'absolute', left: PADX, top: CMD_TOP, height: CMD_LH, display: 'flex', alignItems: 'center', fontFamily: MONO, fontSize: CMD_SIZE, fontWeight: 500 }}>
        <span style={{ width: CH * 2, color: T_PROMPT, textShadow: glow(L.accent, 0.35) }}>❯</span>
        {Array.from(CMD).slice(0, chars).map((c, i) => {
          const heat = 1 - ramp(frame, AT[i], 4, EASE.out);
          const col = entered ? mixHex(L.ink, L.accent, hot) : mixHex(L.ink, '#ffb07a', heat);
          return (
            <span key={i} style={{ display: 'inline-block', width: CH, textAlign: 'center', color: col, textShadow: entered ? glow(L.accent, 0.5 * hot) : heat > 0.05 ? glow(L.accent, 0.4 * heat) : undefined }}>
              {c === ' ' ? ' ' : c}
            </span>
          );
        })}
        {!entered && cursorOn && (
          <span style={{ display: 'inline-block', width: CH * 0.92, height: CMD_SIZE * 1.08, marginLeft: CH * 0.04, borderRadius: 3, background: L.ink, boxShadow: glow('#ffd9b8', 0.45) }} />
        )}
      </div>
      {/* 引信：回车后一道橙光从提示符烧到行尾 */}
      {entered && (
        <div style={{
          position: 'absolute', left: PADX, top: CMD_TOP + CMD_LH - 6, height: 4, borderRadius: 2,
          width: (CMD.length + 2) * CH * fuse,
          background: `linear-gradient(90deg, ${alpha(L.accent, 0.2)} 0%, ${L.accent} 80%, #fff1df 100%)`,
          boxShadow: glow(L.accent, 0.9),
        }} />
      )}
      {/* 回车后的第一行输出 */}
      {entered && (
        <div style={{ position: 'absolute', left: PADX, top: CMD_TOP + CMD_LH + 14, fontFamily: MONO, fontSize: 30, lineHeight: '44px', whiteSpace: 'pre', color: L.accent2 }}>
          {'▲ shipping atlas v2.4 → production…'}
        </div>
      )}
    </div>
  );
};

// ───────────── 结果页（硬切后）─────────────
const REGIONS = [
  { code: 'iad1', city: 'Washington, D.C.', ms: '38 ms', at: 72 },
  { code: 'fra1', city: 'Frankfurt', ms: '41 ms', at: 78 },
  { code: 'hnd1', city: 'Tokyo', ms: '44 ms', at: 84 },
];
const PANEL_L = 1060;
const PANEL_W = 710;

const Result: React.FC<{ frame: number }> = ({ frame }) => {
  const pulse = 0.5 + 0.5 * Math.sin(frame / 9);
  const subP = ramp(frame, 74, 18, EASE.snappy);
  return (
    <>
      {/* 左：眉题 + 巨字 Live + 副标题 */}
      <div style={{ position: 'absolute', left: 150, top: 300, ...type(24, 650, { caps: true }), letterSpacing: '0.24em', color: L.ink3 }}>
        Forge&nbsp;&nbsp;·&nbsp;&nbsp;Deploy #1284
      </div>
      <div style={{ position: 'absolute', left: 138, top: 338, display: 'flex', alignItems: 'center' }}>
        <div style={{
          ...type(290, 800), letterSpacing: '-0.055em', lineHeight: 1,
          backgroundImage: `linear-gradient(180deg, #fffaf4 30%, #ffd6b2 100%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        }}>
          Live
        </div>
        {/* 状态点：呼吸光晕 */}
        <div style={{ position: 'relative', width: 62, height: 62, marginLeft: 34, marginTop: 70 }}>
          <div style={{ position: 'absolute', inset: -26 - pulse * 10, borderRadius: '50%', background: `radial-gradient(circle, ${alpha(L.accent, 0.38 - pulse * 0.16)} 0%, ${alpha(L.accent, 0)} 70%)` }} />
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `radial-gradient(circle at 40% 35%, #ffb27a 0%, ${L.accent} 55%, #c9431a 100%)`, boxShadow: glow(L.accent, 0.8) }} />
        </div>
      </div>
      <div style={{
        position: 'absolute', left: 150, top: 668, ...type(44, 450), color: L.ink2, whiteSpace: 'nowrap',
        opacity: subP, transform: `translateY(${((1 - subP) * 18).toFixed(2)}px)`,
      }}>
        atlas v2.4 <span style={{ color: L.accent }}>→</span> production <span style={{ color: L.ink3 }}>·</span> <span style={{ color: L.ink, fontVariantNumeric: 'tabular-nums' }}>41s</span>
      </div>
      {/* 右：区域面板 */}
      <div style={{
        position: 'absolute', left: PANEL_L, top: 296, width: PANEL_W, height: 470, borderRadius: 26, boxSizing: 'border-box', padding: '34px 40px',
        background: `linear-gradient(180deg, ${alpha('#2a1c14', 0.92)} 0%, ${alpha('#1a110c', 0.92)} 100%)`,
        border: `1px solid ${alpha('#ffd2b0', 0.1)}`,
        boxShadow: `inset 0 1px 0 ${alpha('#ffe6d2', 0.08)}, 0 2px 4px ${alpha(L.shadow, 0.5)}, 0 34px 80px -24px ${alpha(L.shadow, 0.95)}`,
        opacity: ramp(frame, T.pushEnd, 8, EASE.out),
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 18 }}>
          <div style={{ ...type(32, 600), color: L.ink }}>Regions</div>
          <div style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 30, color: L.ink3 }}>
            <span style={{ color: L.ink }}>{REGIONS.filter((r) => frame >= r.at + 26).length}</span> / 3
          </div>
        </div>
        {REGIONS.map((r) => {
          const inP = ramp(frame, r.at, 16, EASE.snappy);
          const bar = ramp(frame, r.at + 6, 20, EASE.swift);
          const live = frame >= r.at + 26;
          const pop = live ? ramp(frame, r.at + 26, 10, EASE.overshoot) : 0;
          return (
            <div key={r.code} style={{
              height: 118, borderTop: `1px solid ${L.line}`, position: 'relative',
              opacity: inP, transform: `translateY(${((1 - inP) * 26).toFixed(2)}px)`,
            }}>
              <div style={{ position: 'absolute', left: 0, top: 24, display: 'flex', alignItems: 'baseline', gap: 18 }}>
                <span style={{ fontFamily: MONO, fontSize: 36, fontWeight: 600, color: L.ink }}>{r.code}</span>
                <span style={{ ...type(30, 450), color: L.ink3 }}>{r.city}</span>
              </div>
              <div style={{ position: 'absolute', right: 0, top: 22, display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontFamily: MONO, fontSize: 28, color: L.ink3, opacity: live ? 1 : 0 }}>{r.ms}</span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10, padding: '6px 16px', borderRadius: 999, ...type(26, 650),
                  color: live ? L.onAccent : L.ink3, background: live ? L.accent : alpha('#ffffff', 0.05),
                  boxShadow: live ? glow(L.accent, 0.35 * pop) : undefined, transform: `scale(${live ? mix(0.9, 1, pop) : 1})`,
                }}>
                  {live ? 'Live' : 'Building'}
                </span>
              </div>
              {/* 进度条 */}
              <div style={{ position: 'absolute', left: 0, right: 0, top: 88, height: 6, borderRadius: 3, background: alpha('#ffffff', 0.06), overflow: 'hidden' }}>
                <div style={{ width: `${bar * 100}%`, height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${alpha(L.accent, 0.5)} 0%, ${L.accent} 85%, #ffd2a8 100%)`, boxShadow: glow(L.accent, 0.4) }} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

// 十六进制颜色按 k 混合
const mixHex = (a: string, b: string, k: number) => {
  const t = Math.max(0, Math.min(1, k));
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

export const TerminalTypewriter: React.FC = () => {
  const frame = useCurrentFrame();
  const cut = frame >= T.pushEnd;

  // 打字段相机：极缓前推（蓄力），origin 同样钉在命令行，和急推无缝衔接
  const creep = mix(1, 1.035, ramp(frame, 0, T.enter, EASE.swift));
  // 回车急推：t³ 加速（越推越快，末帧动势最猛处硬切）
  const pt = Math.max(0, Math.min(1, (frame - T.enter) / (T.pushEnd - T.enter)));
  const push = creep * mix(1, 4.8, Math.pow(pt, 2.3));
  const pushBlur = frame >= T.pushEnd - 4 ? mix(0, 16, ramp(frame, T.pushEnd - 4, 4, EASE.linear)) : 0;

  // 曝光闪：推的末段升起，跨切点 8f 衰减（不是交叉溶解，是爆点的光）
  const flash = !cut ? ramp(frame, T.pushEnd - 4, 4, EASE.exit) * 0.6 : 0.6 * (1 - ramp(frame, T.pushEnd, 7, EASE.out));

  // 结果页回稳 1.12→1（只回稳不再推：一棒只交一次）；hold 段靠舞台光呼吸 + 状态点脉动保持活着
  const settle = mix(1.12, 1, ramp(frame, T.pushEnd, T.settle, EASE.snappy));

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', background: L.bg[2] }}>
      {!cut ? (
        <>
          <Stage look={L} keyLight={{ x: 0.5, y: 0.02 }} fill={{ x: 0.5, y: 1.05 }} horizon={0.9} intensity={0.8} />
          <div style={{
            position: 'absolute', inset: 0, transformOrigin: `${FOCUS_X}px ${FOCUS_Y}px`,
            transform: `scale(${push.toFixed(4)})`,
            filter: pushBlur > 0.2 ? `blur(${pushBlur.toFixed(2)}px)` : undefined,
          }}>
            <Terminal frame={frame} />
          </div>
        </>
      ) : (
        <>
          <Stage look={L} keyLight={{ x: 0.24, y: 0.18 }} fill={{ x: 0.82, y: 0.85 }} horizon={0.88} breathe={0.6} />
          <div style={{ position: 'absolute', inset: 0, transformOrigin: '960px 540px', transform: `scale(${settle.toFixed(4)})` }}>
            <Result frame={frame} />
          </div>
        </>
      )}
      {flash > 0.005 && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: flash,
          background: `radial-gradient(ellipse 70% 64% at ${cut ? 30 : (FOCUS_X / 19.2).toFixed(1)}% ${cut ? 44 : (FOCUS_Y / 10.8).toFixed(1)}%, #ffe2c4 0%, ${alpha('#ff8a45', 0.8)} 38%, ${alpha(L.accent, 0)} 82%)`,
          mixBlendMode: 'screen',
        }} />
      )}
    </div>
  );
};
