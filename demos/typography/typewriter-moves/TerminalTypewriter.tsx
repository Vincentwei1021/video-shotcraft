// terminal-typewriter —— 终端打字机触发
// 深色终端窗居中（窗口带发丝边、顶部内高光、悬浮软阴影，内有几行历史输出作上下文），
// "$ acme deploy --prod" 逐字符敲出（平均 2f/字符：按真人手速给每个字符 1–3f 的确定性间隔，
// 词间空格前多顿一拍；帧确定 substring，无插值）。方块光标打字时常亮，空闲时 12f 方波闪。
// 敲完停 12f → 回车帧：命令下方出一行输出，整场景 6f Easing.in(cubic) 急推 scale 1→3.2
// 向命令行推入（末 3f 加 blur）硬切到 FakeDashboard A 全屏，1.06→1 回稳 4f 落定；
// f80 右下角浮起一枚"已部署"提示，给引信一个结果。收尾真静止 ≥40f。
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { G, FakeDashboard } from '../../_fixtures/Fixtures';
import { Backdrop, EASE, FONT, Grain, innerHighlight, ramp, softShadow } from '../../_fixtures/Polish';

export const TERMINAL_TYPEWRITER_DURATION = 145;

const CMD = 'acme deploy --prod';

// 每字符间隔（帧）：均值 2f，词首略快、空格前多顿——真人敲命令的节奏，确定性
const GAPS = [2, 2, 1, 2, 2, 4, 2, 1, 2, 2, 1, 2, 4, 1, 2, 2, 2, 2]; // Σ = 36，新词首字前顿 4f
const TYPE_START = 10;
const AT: number[] = []; // 第 i 个字符出现的帧（首字 f12，末字 f46，与均速 2f/字同起止）
GAPS.reduce((acc, g, i) => {
  AT[i] = acc + g;
  return acc + g;
}, TYPE_START);

// 时间轴（30fps，共 145f）
const T = {
  typeStart: TYPE_START, // 开始敲字
  typeEnd: TYPE_START + 36, // 46：18 字符 × 均 2f
  enter: 58, // 敲完停 12f 后回车
  pushEnd: 64, // 6f 急推结束，硬切帧
  settleEnd: 68, // dashboard 1.06→1 回稳 4f
  toast: 80, // 部署完成提示滑入
  total: 145, // f68 起真静止 77f（提示 f92 落定后静止 53f）
};

// 终端窗几何
const TW = 1180;
const TH = 580;
const TL = (1920 - TW) / 2; // 370
const TT = (1080 - TH) / 2; // 250
const TITLEBAR = 56;
const PAD = 40;
const CMD_SIZE = 44;
const HIST = [
  { cmd: 'git push origin main', out: '✓ 12 commits pushed to origin/main' },
  { cmd: 'acme test', out: '✓ 248 passed · 0 failed · 3.1s' },
];
const HIST_LINE = 28 * 1.6; // 历史行高
// 命令行中心（推入焦点）：标题栏 + 内边距 + 4 行历史 + 间隔 + 路径行 + 半个命令行
const FOCUS_Y = TT + TITLEBAR + PAD + HIST_LINE * 4 + 18 + 30 * 1.5 + (CMD_SIZE * 1.5) / 2;
const FOCUS_X = TL + PAD + (CMD.length + 2) * 0.602 * CMD_SIZE * 0.5;

const MONO = FONT.mono;
const T_INK = '#e4e6ee';
const T_DIM = '#6e7282';
const T_PATH = '#9aa2ff';
const T_OK = '#7fd1a3';

const TerminalWindow: React.FC<{ chars: number; cursorOn: boolean; entered: boolean }> = ({ chars, cursorOn, entered }) => (
  <div style={{
    width: TW, height: TH, borderRadius: 16, overflow: 'hidden', boxSizing: 'border-box', position: 'relative',
    background: 'linear-gradient(180deg, #1b1c22 0%, #141519 100%)',
    border: '1px solid rgba(255,255,255,0.07)',
    boxShadow: `${innerHighlight(0.07)}, ${softShadow(56, { strength: 1.6 })}`,
  }}>
    {/* 标题栏：三色窗控（略降饱和）+ 居中窗口名 */}
    <div style={{
      height: TITLEBAR, background: 'linear-gradient(180deg, #24252c 0%, #1f2026 100%)',
      borderBottom: '1px solid rgba(0,0,0,0.35)', boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.03)',
      display: 'flex', alignItems: 'center', gap: 10, padding: '0 22px', boxSizing: 'border-box', position: 'relative',
    }}>
      {['#ec6a5e', '#e8b84a', '#5fc35b'].map((c, i) => (
        <div key={i} style={{ width: 15, height: 15, borderRadius: 8, background: c, boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.25)' }} />
      ))}
      <div style={{
        position: 'absolute', left: 0, right: 0, textAlign: 'center', fontFamily: FONT.sans,
        fontSize: 20, fontWeight: 500, color: '#8a8e9c', letterSpacing: '0.01em',
      }}>
        acme-app — zsh — 120×32
      </div>
    </div>
    {/* 内容区 */}
    <div style={{ padding: PAD, fontFamily: MONO, color: T_INK }}>
      {/* 历史输出：纹理级，压暗不抢戏 */}
      {HIST.map((h, i) => (
        <div key={i} style={{ fontSize: 28, lineHeight: 1.6, whiteSpace: 'pre' }}>
          <div><span style={{ color: T_DIM }}>{'$ '}</span><span style={{ color: '#a3a7b6' }}>{h.cmd}</span></div>
          <div style={{ color: T_DIM }}>{'  '}<span style={{ color: T_OK, opacity: 0.75 }}>{h.out.slice(0, 1)}</span>{h.out.slice(1)}</div>
        </div>
      ))}
      <div style={{ height: 18 }} />
      <div style={{ fontSize: 30, lineHeight: 1.5, whiteSpace: 'pre' }}>
        <span style={{ color: T_PATH }}>~/acme-app</span>
        <span style={{ color: T_DIM }}>{'  on '}</span>
        <span style={{ color: '#c7a7ff' }}>main</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', whiteSpace: 'pre', fontSize: CMD_SIZE, lineHeight: 1.5 }}>
        <span style={{ color: T_OK }}>{'$ '}</span>
        <span>{CMD.substring(0, chars)}</span>
        {!entered && (
          <span style={{
            display: 'inline-block', width: Math.round(CMD_SIZE * 0.6), height: Math.round(CMD_SIZE * 1.12), marginLeft: 3,
            background: T_INK, opacity: cursorOn ? 0.92 : 0, borderRadius: 2,
          }} />
        )}
      </div>
      {/* 回车后的第一行输出：引信点着了 */}
      {entered && (
        <div style={{ fontSize: 30, lineHeight: 1.5, whiteSpace: 'pre', color: T_PATH }}>
          {'▲ Deploying acme-app → production…'}
        </div>
      )}
    </div>
  </div>
);

// 部署完成提示（切到 dashboard 后的结果回执）
const Toast: React.FC<{ p: number }> = ({ p }) => (
  <div style={{
    position: 'absolute', right: 48, bottom: 48, width: 470, padding: '22px 26px', boxSizing: 'border-box',
    background: '#ffffff', borderRadius: 16, border: `1px solid ${G.hairline}`,
    boxShadow: `${innerHighlight(0.9)}, ${softShadow(mix3(36, 18, p))}`,
    display: 'flex', gap: 18, alignItems: 'center', fontFamily: FONT.sans,
    opacity: Math.min(1, p * 1.6), transform: `translateY(${((1 - p) * 22).toFixed(2)}px) scale(${(0.97 + 0.03 * p).toFixed(4)})`,
  }}>
    <div style={{
      width: 48, height: 48, borderRadius: 24, flex: 'none', background: 'rgba(46,160,96,0.12)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2e9a5e', fontSize: 26, fontWeight: 700,
    }}>
      ✓
    </div>
    <div>
      <div style={{ fontSize: 26, fontWeight: 650, color: G.ink1, letterSpacing: '-0.01em' }}>Deployed to production</div>
      <div style={{ fontSize: 21, color: G.ink2, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>acme-app v2.4.1 · 12s · 3 regions</div>
    </div>
  </div>
);
const mix3 = (a: number, b: number, t: number) => a + (b - a) * t;

export const TerminalTypewriter: React.FC = () => {
  const frame = useCurrentFrame();

  // 帧确定打字：按 AT 表逐字出现
  const chars = AT.filter((f) => frame >= f).length;
  const typing = frame >= T.typeStart && frame < T.typeEnd + 4;

  // 方块光标：打字中常亮，空闲时 12f 周期方波闪
  const cursorOn = typing || frame % 12 < 6;
  const entered = frame >= T.enter;

  // 回车急推：整场景 scale 1→3.2，6f Easing.in(cubic)，向命令行推入
  const pushScale = interpolate(frame, [T.enter, T.pushEnd], [1, 3.2], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  });
  // 末 3f 运动模糊（f61–f64），硬切后摘罩=条件挂载
  const pushBlur = interpolate(frame, [T.pushEnd - 3, T.pushEnd], [0, 12], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.in(Easing.quad),
  });

  // 硬切：f64 起终端场景整体卸载，dashboard 挂载
  const cut = frame >= T.pushEnd;

  // dashboard 落定：1.06→1 回稳 4f
  const dashScale = interpolate(frame, [T.pushEnd, T.settleEnd], [1.06, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const toastP = ramp(frame, T.toast, 12, EASE.snappy);

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', background: G.bg }}>
      {!cut ? (
        <div style={{
          position: 'absolute', inset: 0,
          transform: `scale(${pushScale.toFixed(4)})`,
          transformOrigin: `${FOCUS_X}px ${FOCUS_Y}px`,
          ...(pushBlur > 0 ? { filter: `blur(${pushBlur.toFixed(2)}px)` } : {}),
        }}>
          <Backdrop tone="light" light={{ x: 0.5, y: 0.2 }} grain={0} />
          <div style={{ position: 'absolute', left: TL, top: TT }}>
            <TerminalWindow chars={chars} cursorOn={cursorOn} entered={entered} />
          </div>
        </div>
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          transform: `scale(${dashScale.toFixed(4)})`,
          transformOrigin: '960px 540px',
        }}>
          <FakeDashboard variant="A" />
          {toastP > 0 && <Toast p={toastP} />}
        </div>
      )}
      <Grain opacity={0.045} />
    </div>
  );
};
