// line-unfold-panel —— 一线展面（Jarvis/FUI 母题）
// 暗场中心一粒光点 → 极快抽成一条 1180px 的发光细线（6f）→ 细线一分为二、上下推开撑成面板（12f，缓）→
// 扫描带自上而下把内容"开机"点亮 → 静置展示 → 老 CRT 关机：内容过曝一拍、压扁回线、线缩成点、点闪灭。
//
// 第二轮重设计（琥珀荧光 · 地面站遥测屏「Cairn Orbital」）：
// - look = ember 改琥珀荧光（暖黑底 + 单色琥珀 #ffb547）：整个镜头只有一种发光色，像一台单色 CRT 遥测终端；
//   面板叠 3px 扫描线、文字带荧光余辉（text-shadow），开机时整体过曝再回落（荧光粉预热）。
// - 主体是为镜头设计的遥测面板（1180×620，占画宽 61%）：160px 大号高度读数「412.6 km」+ 速度 / 信号两组 44px 数据 +
//   右侧星下点轨迹图（正弦轨迹描出、卫星点沿轨迹走）+ 底部过境进度条。四角 FUI 角标在撑开落定时咬上。
// - 节奏两段对比是手法本体：抽线 6f 急（expo-out）vs 撑面 12f 缓（out-cubic）；关机反向：压扁 7f（ease-in）、缩点 6f（poly4-in）。
// - 结尾不留空黑：光点熄灭处留一道衰减的荧光残影，随后浮出一行 32px 等宽字「END OF PASS · 14:22:07 UTC」作尾帧海报。
//
// 时间表（30fps，共 126f）：
//   0–8     预备：舞台暖光 + 中心光点由暗到亮呼吸（第 1 帧就有点）
//   8–14    主动作①：光点抽成细线（6f expo-out），两端火花
//   14–26   主动作②：细线一分为二推开成面板（12f out-cubic），上下发光边跟着走；24 起四角角标咬合
//   22–46   跟随：扫描带 22–36 自上而下点亮内容（逐行错峰）；高度读数 24–44 快速计数到 412.6；轨迹 28–50 描出
//   46–84   hold：卫星点沿轨迹缓行、LIVE 点呼吸、过境进度条走动；相机极缓推近 1.5%
//   84–86   关机预兆：内容过曝一拍
//   86–93   主动作③：面板压扁回线（7f ease-in）
//   93–99   线缩成点（6f poly4-in），99–104 点闪灭
//   100–126 余波 + hold：荧光残影衰减，尾字 104–118 浮出，干净落定
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, FONT, bezier, mix, ramp } from '../../_fixtures/Polish';
import { LOOKS, Stage, alpha } from '../../_fixtures/Look';

export const LINE_UNFOLD_PANEL_DURATION = 126;

const L = { ...LOOKS.ember, light: '#ff9a3c' };
const AMBER = '#ffb547';
const AMBER_HI = '#ffe6bd';
const AMBER_DIM = '#a5763b';
const MONO = FONT.mono;

const PW = 1180;
const PH = 620;
const CX = 960;
const CY = 540;

// 时间点
const T_LINE = 8;
const T_UNFOLD = 14;
const T_OPEN = 26;
const T_OFF = 86;
const T_FLAT = 93;
const T_DOT = 99;
const T_DEAD = 104;

const expoOut = bezier(0.16, 1, 0.3, 1);
const cubicOut = bezier(0.33, 1, 0.68, 1);
const cubicIn = bezier(0.32, 0, 0.67, 0);
const poly4In = bezier(0.5, 0, 0.75, 0);

const glowText = (c: string, k = 1) => `0 0 ${6 * k}px ${alpha(c, 0.55)}, 0 0 ${22 * k}px ${alpha(c, 0.28)}`;

// 星下点轨迹（右侧图）：正弦地面轨迹
const TRACK_W = 470;
const TRACK_H = 250;
const trackY = (x: number) => TRACK_H / 2 - Math.sin((x / TRACK_W) * Math.PI * 2 - 0.6) * 82;
const TRACK_D = Array.from({ length: 48 }, (_, i) => {
  const x = (i / 47) * TRACK_W;
  return `${i ? 'L' : 'M'}${x.toFixed(1)} ${trackY(x).toFixed(1)}`;
}).join(' ');

// 扫描带点亮：行在 y 处的亮度（0 未亮 → 过曝 → 1）
const rowOn = (f: number, yFrac: number) => {
  const t = ramp(f, 22 + yFrac * 14, 5, EASE.out);
  return t;
};

const Panel: React.FC<{ f: number }> = ({ f }) => {
  const alt = 412.6 * ramp(f, 24, 20, EASE.snappy);
  const vel = 7.66 * ramp(f, 28, 18, EASE.snappy);
  const track = ramp(f, 28, 22, EASE.out);
  const sat = mix(0.18, 0.62, ramp(f, 30, 90, EASE.swift)); // 卫星点沿轨迹缓行
  const satX = sat * TRACK_W, satY = trackY(satX);
  const pass = mix(0.12, 0.58, ramp(f, 26, 70, EASE.swift));
  const live = 0.55 + 0.45 * Math.cos(f / 5);
  const row = (y: number): React.CSSProperties => {
    const p = rowOn(f, y);
    return { opacity: p, filter: p < 1 ? `brightness(${(1 + (1 - p) * 1.6).toFixed(2)})` : undefined };
  };
  return (
    <div style={{ position: 'absolute', inset: 0, padding: '40px 52px', boxSizing: 'border-box', fontFamily: MONO, color: AMBER }}>
      {/* 页眉 */}
      <div style={{ display: 'flex', alignItems: 'center', fontSize: 22, letterSpacing: '0.24em', ...row(0.02) }}>
        <span style={{ color: AMBER, textShadow: glowText(AMBER, 0.7) }}>CAIRN ORBITAL</span>
        <span style={{ color: AMBER_DIM, marginLeft: 26 }}>GS-04 · SVALBARD</span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 12, height: 12, borderRadius: 6, background: AMBER, opacity: live, boxShadow: `0 0 12px ${alpha(AMBER, 0.9)}` }} />
          LIVE · PASS 14
        </span>
      </div>
      <div style={{ height: 1, background: alpha(AMBER, 0.28), margin: '24px 0 30px', ...row(0.06) }} />

      <div style={{ display: 'flex', gap: 56 }}>
        {/* 左：高度大读数 + 两组数据 */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, letterSpacing: '0.24em', color: AMBER_DIM, ...row(0.18) }}>ALTITUDE</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, marginTop: 6, ...row(0.3) }}>
            <span style={{
              fontFamily: FONT.sans, fontSize: 168, fontWeight: 300, letterSpacing: '-0.045em', lineHeight: 1, color: AMBER_HI,
              fontVariantNumeric: 'tabular-nums', textShadow: glowText(AMBER, 1.3),
            }}>{alt.toFixed(1)}</span>
            <span style={{ fontSize: 44, color: AMBER, textShadow: glowText(AMBER, 0.6) }}>km</span>
          </div>
          <div style={{ display: 'flex', gap: 64, marginTop: 34, ...row(0.66) }}>
            {[['VELOCITY', vel.toFixed(2), 'km/s'], ['SIGNAL', f >= 30 ? '−71' : '−−', 'dBm']].map(([k, v, u]) => (
              <div key={k}>
                <div style={{ fontSize: 20, letterSpacing: '0.24em', color: AMBER_DIM }}>{k}</div>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ fontSize: 46, color: AMBER_HI, fontVariantNumeric: 'tabular-nums', textShadow: glowText(AMBER, 0.8) }}>{v}</span>
                  <span style={{ fontSize: 24, color: AMBER }}>{u}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* 右：星下点轨迹 */}
        <div style={{ width: TRACK_W, ...row(0.2) }}>
          <div style={{ fontSize: 20, letterSpacing: '0.24em', color: AMBER_DIM, display: 'flex', justifyContent: 'space-between' }}>
            <span>GROUND TRACK</span><span>78.2°N</span>
          </div>
          <svg width={TRACK_W} height={TRACK_H} style={{ marginTop: 16, overflow: 'visible' }}>
            {[0, 1, 2, 3, 4].map((k) => (
              <line key={`h${k}`} x1={0} x2={TRACK_W} y1={(k * TRACK_H) / 4} y2={(k * TRACK_H) / 4} stroke={alpha(AMBER, k === 2 ? 0.26 : 0.1)} strokeDasharray={k === 2 ? undefined : '2 6'} />
            ))}
            {[0, 1, 2, 3, 4, 5, 6].map((k) => (
              <line key={`v${k}`} y1={0} y2={TRACK_H} x1={(k * TRACK_W) / 6} x2={(k * TRACK_W) / 6} stroke={alpha(AMBER, 0.1)} strokeDasharray="2 6" />
            ))}
            <path d={TRACK_D} fill="none" stroke={AMBER} strokeWidth={2.5} pathLength={100} strokeDasharray="100 100" strokeDashoffset={100 * (1 - track)}
              style={{ filter: `drop-shadow(0 0 6px ${alpha(AMBER, 0.8)})` }} />
            {track > 0.9 && (
              <g transform={`translate(${satX.toFixed(1)} ${satY.toFixed(1)})`}>
                <circle r={18} fill="none" stroke={alpha(AMBER, 0.45)} strokeWidth={1.5} />
                <circle r={6} fill={AMBER_HI} style={{ filter: `drop-shadow(0 0 8px ${AMBER})` }} />
              </g>
            )}
          </svg>
          <div style={{ display: 'flex', gap: 8, marginTop: 22, alignItems: 'flex-end', height: 30 }}>
            {Array.from({ length: 14 }, (_, i) => {
              const h = 10 + ((i * 37) % 19) + (i < 11 ? 0 : -6);
              return <div key={i} style={{ width: 22, height: h, background: i < 11 ? AMBER : alpha(AMBER, 0.2), boxShadow: i < 11 ? `0 0 8px ${alpha(AMBER, 0.5)}` : 'none' }} />;
            })}
          </div>
        </div>
      </div>

      {/* 页脚：过境进度 */}
      <div style={{ position: 'absolute', left: 52, right: 52, bottom: 40, ...row(0.92) }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, letterSpacing: '0.14em', color: AMBER_DIM, marginBottom: 14 }}>
          <span>AOS 14:12:40</span><span style={{ color: AMBER }}>T+{Math.floor(pass * 567)}s</span><span>LOS 14:22:07</span>
        </div>
        <div style={{ height: 6, background: alpha(AMBER, 0.14), position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pass * 100}%`, background: AMBER, boxShadow: `0 0 12px ${alpha(AMBER, 0.8)}` }} />
        </div>
      </div>
    </div>
  );
};

export const LineUnfoldPanel: React.FC = () => {
  const f = useCurrentFrame();

  // 宽：入场抽线（expo-out 6f）；关机缩点（poly4-in 6f）
  const sx = f < T_FLAT ? ramp(f, T_LINE, T_UNFOLD - T_LINE, expoOut) : 1 - ramp(f, T_FLAT, T_DOT - T_FLAT, poly4In);
  // 高：入场撑面（out-cubic 12f）；关机压扁（ease-in 7f）
  const sy = f < T_OFF ? ramp(f, T_UNFOLD, T_OPEN - T_UNFOLD, cubicOut) : 1 - ramp(f, T_OFF, T_FLAT - T_OFF, cubicIn);
  const w = Math.max(6, PW * sx);
  const h = Math.max(3, PH * sy);
  const isPanel = h > 14;

  // 线/点亮度：抽线时最亮；撑开后余辉沿上下边；关机压成线时重新白热
  const hotIn = 1 - 0.35 * ramp(f, T_UNFOLD, T_OPEN - T_UNFOLD, EASE.linear) - 0.65 * ramp(f, T_OPEN, 10, EASE.out); // 撑开全程保持白热，落定后 10f 淡去
  const hotOut = ramp(f, T_OFF + 3, 5, EASE.out);
  const hot = f < T_OFF ? hotIn : hotOut;
  // 预备光点（0–8）与熄灭（99–104）
  const preDot = f < T_LINE ? ramp(f, -2, 8, EASE.out) : 0;
  const deadT = ramp(f, T_DOT, T_DEAD - T_DOT, EASE.out);
  const flare = f >= T_DOT - 1 && f < T_DEAD + 2 ? Math.sin(Math.min(1, (f - (T_DOT - 1)) / 6) * Math.PI) : 0;
  const alive = f < T_DEAD;

  // 关机预兆：过曝一拍
  const boost = ramp(f, T_OFF - 2, 2, EASE.out);
  // 角标：撑开落定时从外 26px 咬进（overshoot）
  const bite = ramp(f, 24, 10, EASE.overshoot);
  const cornerOp = ramp(f, 24, 4, EASE.out) * (1 - ramp(f, T_OFF, 4, EASE.out));
  // 相机：hold 段极缓推近
  const cam = mix(1, 1.015, ramp(f, 26, 60, EASE.smooth));
  // 荧光残影：线缩成点后一道衰减的横向残影
  const ghost = f >= T_FLAT ? Math.exp(-(f - T_FLAT) * 0.09) * ramp(f, T_FLAT, 2, EASE.out) : 0;
  // 尾字
  const tail = ramp(f, 104, 14, EASE.snappy);

  const edge = (y: number, op: number, key: string) => (
    <div key={key} style={{
      position: 'absolute', left: CX - w / 2 - 20, top: y - 1.5, width: w + 40, height: 3, opacity: op,
      background: `linear-gradient(90deg, ${alpha(AMBER, 0)} 0%, ${AMBER_HI} 8%, #fff8ec 50%, ${AMBER_HI} 92%, ${alpha(AMBER, 0)} 100%)`,
      boxShadow: `0 0 12px ${alpha(AMBER, 0.95)}, 0 0 40px ${alpha(AMBER, 0.5)}`,
    }} />
  );

  return (
    <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden', background: L.bg[2] }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.5 }} fill={null} intensity={0.55} breathe={0.3}>
        {/* 台面：极淡点阵，中心可见、四周隐去 */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.55,
          backgroundImage: `radial-gradient(circle, ${alpha(AMBER, 0.16)} 1.2px, transparent 1.6px)`, backgroundSize: '36px 36px', backgroundPosition: '18px 18px',
          WebkitMaskImage: 'radial-gradient(ellipse 52% 56% at 50% 50%, #000 15%, transparent 100%)',
        }} />
      </Stage>

      <div style={{ position: 'absolute', inset: 0, transform: `scale(${cam.toFixed(4)})`, transformOrigin: '50% 50%' }}>
        {/* 预备光点 */}
        {preDot > 0 && (
          <div style={{
            position: 'absolute', left: CX - 40, top: CY - 40, width: 80, height: 80, borderRadius: 40, opacity: preDot,
            background: `radial-gradient(circle, #fff8ec 0%, ${alpha(AMBER_HI, 0.9)} 10%, ${alpha(AMBER, 0.35)} 30%, ${alpha(AMBER, 0)} 65%)`,
          }} />
        )}

        {alive && f >= T_LINE && (isPanel ? (
          <>
            {/* 面板：真实尺寸变高（圆角/发丝线不变形），内容固定居中、被 overflow 揭示 */}
            <div style={{
              position: 'absolute', left: CX - w / 2, top: CY - h / 2, width: w, height: h, overflow: 'hidden', borderRadius: 6,
              background: 'linear-gradient(180deg, rgba(34,20,9,0.94) 0%, rgba(20,12,6,0.96) 100%)',
              boxShadow: `0 0 0 1px ${alpha(AMBER, 0.32)}, 0 0 60px ${alpha(AMBER, 0.12)}, 0 40px 100px rgba(0,0,0,0.7)`,
            }}>
              <div style={{ position: 'absolute', left: (w - PW) / 2, top: (h - PH) / 2, width: PW, height: PH }}>
                <Panel f={f} />
                {/* 扫描带：22–36 自上而下扫过一次 */}
                {f >= 20 && f <= 38 && (
                  <div style={{
                    position: 'absolute', left: 0, right: 0, top: mix(-120, PH, ramp(f, 21, 16, EASE.swift)), height: 120,
                    background: `linear-gradient(180deg, ${alpha(AMBER, 0)} 0%, ${alpha(AMBER, 0.08)} 70%, ${alpha(AMBER, 0.2)} 97%, ${alpha(AMBER_HI, 0.9)} 99%, ${alpha(AMBER, 0)} 100%)`,
                    mixBlendMode: 'screen',
                  }} />
                )}
                {/* 关机预兆：整屏琥珀过曝一拍（screen 叠色，不用 brightness——那会把琥珀推成黄绿） */}
                {boost > 0 && <div style={{ position: 'absolute', inset: 0, background: AMBER, mixBlendMode: 'screen', opacity: boost * 0.32 }} />}
                {/* CRT 扫描线 + 屏幕中心微亮 */}
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  background: `repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 1px, transparent 1px, transparent 3px), radial-gradient(ellipse 70% 70% at 50% 45%, ${alpha(AMBER, 0.06)} 0%, transparent 70%)`,
                }} />
              </div>
            </div>
            {/* 上下发光边：撑开期从中线分裂推开 → 内容亮起后淡去；关机时反向汇拢、白热 */}
            {hot > 0.02 && [edge(CY - h / 2, hot, 't'), edge(CY + h / 2, hot, 'b')]}
          </>
        ) : (
          // 线 / 点阶段：白热芯 + 琥珀辉光
          <div style={{
            position: 'absolute', left: CX - w / 2, top: CY - h / 2, width: w, height: h, borderRadius: h,
            background: `linear-gradient(90deg, ${alpha(AMBER_HI, 0.6)} 0%, #fffaf0 12%, #fffaf0 88%, ${alpha(AMBER_HI, 0.6)} 100%)`,
            opacity: 1 - deadT,
            boxShadow: `0 0 ${14 + 30 * flare}px ${alpha(AMBER, 0.95)}, 0 0 ${50 + 90 * flare}px ${alpha(AMBER, 0.55)}`,
          }} />
        ))}

        {/* 抽线两端火花 */}
        {f >= T_LINE && f < T_UNFOLD + 3 && [-1, 1].map((s) => (
          <div key={s} style={{
            position: 'absolute', left: CX + (s * w) / 2 - 30, top: CY - 10, width: 60, height: 20, borderRadius: 10,
            opacity: 1 - ramp(f, T_UNFOLD - 1, 4, EASE.out),
            background: `radial-gradient(closest-side, #fffaf0 0%, ${alpha(AMBER, 0.8)} 40%, ${alpha(AMBER, 0)} 100%)`,
          }} />
        ))}

        {/* 四角 FUI 角标：撑开落定时咬合 */}
        {cornerOp > 0.01 && [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dy], i) => {
          const off = (1 - bite) * 26 + 14;
          return (
            <svg key={i} width={48} height={48} style={{
              position: 'absolute', left: CX + dx * (PW / 2 + off), top: CY + dy * (PH / 2 + off), opacity: cornerOp,
              transform: `scale(${dx < 0 ? 1 : -1}, ${dy < 0 ? 1 : -1})`, transformOrigin: '0 0', overflow: 'visible',
              filter: `drop-shadow(0 0 6px ${alpha(AMBER, 0.8)})`,
            }}>
              <path d="M1.5 48 V1.5 H48" stroke={AMBER} strokeWidth={3} fill="none" />
            </svg>
          );
        })}

        {/* 点闪灭的十字星芒 */}
        {flare > 0.01 && (
          <>
            <div style={{
              position: 'absolute', left: CX - 70, top: CY - 70, width: 140, height: 140, borderRadius: 70, opacity: flare,
              background: `radial-gradient(circle, #fffaf0 0%, ${alpha(AMBER_HI, 0.8)} 12%, ${alpha(AMBER, 0.3)} 34%, ${alpha(AMBER, 0)} 70%)`,
            }} />
            <div style={{
              position: 'absolute', left: CX - 260, top: CY - 2, width: 520, height: 4, opacity: flare * 0.8,
              background: `linear-gradient(90deg, ${alpha(AMBER, 0)}, #fffaf0, ${alpha(AMBER, 0)})`,
            }} />
          </>
        )}

        {/* 荧光残影：缩点后一道横向余辉缓慢衰减 */}
        {ghost > 0.01 && (
          <div style={{
            position: 'absolute', left: CX - PW / 2, top: CY - 1, width: PW, height: 2, opacity: ghost * 0.5,
            background: `linear-gradient(90deg, ${alpha(AMBER, 0)} 0%, ${alpha(AMBER, 0.9)} 50%, ${alpha(AMBER, 0)} 100%)`,
            boxShadow: `0 0 24px ${alpha(AMBER, 0.4)}`,
          }} />
        )}

        {/* 尾字：熄灭处浮出 */}
        {tail > 0 && (
          <div style={{
            position: 'absolute', left: 0, right: 0, top: CY + 34, textAlign: 'center', fontFamily: MONO, fontSize: 32, letterSpacing: '0.3em',
            color: AMBER, opacity: tail * 0.9, transform: `translateY(${((1 - tail) * 14).toFixed(2)}px)`, textShadow: glowText(AMBER, 0.7),
          }}>END OF PASS · 14:22:07 UTC</div>
        )}
      </div>
    </div>
  );
};
