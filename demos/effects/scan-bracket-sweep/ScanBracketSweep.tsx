// scan-bracket-sweep — Scan Bracket 取景括号扫描光带（motion-lab 定稿转原生 Remotion）
// 文档弹到画面中央，四角落下 L 形取景括号（向内位移 8px），随后一条扫描光带带着
// 朝来向的渐变拖尾在文档上往复扫 5 趟，两端慢中间快，文档本身完全静止。
// 设计坐标 480×270（DesignStage raster="zoom"：文档小字按成片尺寸栅格化，不糊）。
//
// 质感升级：骨架灰条换成出版级的明细表——video-shotcraft 宣传片的分镜清单（标题 / 元信息 / 4 列 7 行 / 合计）；
// 光带从"黑线 + 灰泥拖尾"改成靛蓝扫描光——细亮芯 + 柔辉 + 正片叠底的色调拖尾，
// 拖尾长度随扫描速度伸缩（趟末停顿时收成 0，换向不再"啪"地跳到另一侧）；
// 光带经过的表格行被轻微照亮（光在读，文档不动）；括号改成圆头描边并带一次轻过冲落位；
// 背景换柔光底 + 颗粒，文档带随落位收紧的两层阴影。
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';
import { Backdrop, EASE, FONT, Grain, softShadow } from '../../_fixtures/Polish';
import { BRAND } from '../../_fixtures/Brand';

export const SCAN_BRACKET_SWEEP_DURATION = 150; // 5000ms @30fps

// —— 颜色：INK 负责括号与正文，SCAN 是唯一的光色（光带芯 / 辉光 / 拖尾共用，换肤只改这两个）——
const INK = '#16171c'; // 带冷调的近黑（替代纯黑）
const SCAN = '91,99,211'; // 靛蓝扫描光（rgb 分量，便于拼 alpha）
const INK2 = '#5d5f66';
const INK3 = '#9b9da3';
const HAIR = 'rgba(20,22,28,0.09)';

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const inOutSin = (x: number) => 0.5 - Math.cos(Math.PI * clamp01(x)) / 2;

// 文档几何：440×240 定尺画布内居中的 300×178 文档
const DW = 300;
const DH = 178;
const DX = (440 - DW) / 2;
const DY = (240 - DH) / 2;

// 表格列：沿用原骨架的 4 列栅格（左右各 14 内边距、列距 10）
const COLS = 4;
const COL_W = (DW - 28 - (COLS - 1) * 10) / COLS;
const colX = (c: number) => 14 + c * (COL_W + 10);
// 分镜清单：镜头 / 配方卡 / 入点 / 帧数（入点 = 前面各镜帧数累加 @30fps，合计 828f = 27.6 s）
const HEAD = ['Shot', 'Recipe', 'Cue', 'Frames'];
const ROWS: [string, string, string, string][] = [
  ['Cold open', 'Text mask', '0:00', '96 f'],
  ['Hero reveal', 'Spotlight', '0:03', '120 f'],
  ['Feature tour', 'Graze tour', '0:07', '150 f'],
  ['Data beat', 'Riso hit', '0:12', '120 f'],
  ['Workbench', 'Crash zoom', '0:16', '90 f'],
  ['Gallery pass', 'Flyover', '0:19', '144 f'],
  ['Logo sting', 'Brand snap', '0:24', '108 f'],
];
const ROW_TOP = 58; // 第一行顶（与原骨架行距 13 一致）
const ROW_H = 13;

// 四角取景括号：外扩 −7、臂长 34（含描边共 36），1.6px 圆头 L 形
const CS = 36;
const CORNERS = [
  { left: -8, top: -8, d: 'M1 35V1h34', dx: 1, dy: 1 },
  { left: DW + 8 - CS, top: -8, d: 'M1 1h34v34', dx: -1, dy: 1 },
  { left: DW + 8 - CS, top: DH + 8 - CS, d: 'M35 1v34H1', dx: -1, dy: -1 },
  { left: -8, top: DH + 8 - CS, d: 'M35 35H1V1', dx: 1, dy: -1 },
];

const PASSES = 5;
const TAIL = 82; // 拖尾最大长度（峰值速度时）

// 扫描位置（文档内 y，0→DH）与方向：t 的纯函数，便于求速度
const scanAt = (t: number) => {
  const sp = seg(t, 0.17, 0.95, E.linear);
  const raw = sp * PASSES;
  const pi = Math.min(PASSES - 1, Math.floor(raw));
  const local = clamp01((raw - pi) / 0.88); // 每趟末尾 12% 完全停顿
  const dir = pi % 2 === 0 ? 1 : -1;
  const prog = inOutSin(local);
  return { y: dir > 0 ? prog * DH : DH - prog * DH, dir };
};

export const ScanBracketSweep: React.FC = () => {
  const t = useT();
  const dt = 1 / (SCAN_BRACKET_SWEEP_DURATION - 1); // 一帧对应的 t

  // 文档弹入：scale 0.86→1（snappy），透明度 dp*3 提前满亮——先"在了"再"稳了"
  const dp = seg(t, 0, 0.11, EASE.snappy);
  const elev = lerp(dp, 22, 6);

  // 扫描：位置 + 速度（拖尾长度跟速度走，趟末停顿处收成 0）
  const { y, dir } = scanAt(t);
  const speed = Math.abs(scanAt(t + dt / 2).y - scanAt(t - dt / 2).y); // 设计 px/帧
  const PEAK = (DH * Math.PI) / 2 / (((0.78 * SCAN_BRACKET_SWEEP_DURATION) / PASSES) * 0.88);
  const sNorm = clamp01(speed / PEAK);
  const tail = TAIL * Math.pow(sNorm, 0.75);
  // 光带整体淡入（0.16–0.20）淡出（0.93–0.99）
  const clipOp = seg(t, 0.16, 0.2) * (1 - seg(t, 0.93, 0.99));

  // 行照亮：光芯离行中心越近越亮（纯空间函数，文档本身不动）
  const lit = (cy: number) => clipOp * Math.exp(-Math.pow((y - cy) / 7, 2));

  const cell = (txt: string, c: number, top: number, style: React.CSSProperties) => (
    <div
      style={{
        position: 'absolute',
        top,
        left: colX(c),
        width: COL_W,
        textAlign: c === 3 ? 'right' : 'left',
        whiteSpace: 'nowrap',
        lineHeight: 1,
        ...style,
      }}
    >
      {txt}
    </div>
  );

  return (
    <AbsoluteFill>
      <Backdrop tone="light" light={{ x: 0.5, y: 0.3 }} accent="#5b63d3" grain={0} vignette={0.16} />
      <DesignStage bg="transparent" raster="zoom">
        {/* 440×240 定尺画布，居中于 480×270 设计坐标 */}
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 440, height: 240, margin: '-120px 0 0 -220px' }}>
          {/* holder：文档 + 光带 + 括号共用的定位容器 */}
          <div style={{ position: 'absolute', left: DX, top: DY, width: DW, height: DH }}>
            {/* 文档卡片：发丝线 + 顶部内高光 + 随落位收紧的两层阴影 */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, #ffffff 0%, #fcfcfb 100%)',
                borderRadius: 10,
                boxShadow: `inset 0 0 0 0.3px ${HAIR}, inset 0 0.4px 0 rgba(255,255,255,0.9), ${softShadow(elev / 4, { strength: 1.1 })}`,
                overflow: 'hidden',
                transformOrigin: '50% 50%',
                transform: `scale(${lerp(dp, 0.86, 1)})`,
                opacity: clamp01(dp * 3),
                fontFamily: FONT.sans,
                color: INK,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {/* 页眉：文档图标 + 标题 + 页数 chip */}
              <svg style={{ position: 'absolute', left: 14, top: 10.5 }} width={9} height={11} viewBox="0 0 9 11">
                <path d="M1 .5h4.6L8.5 3.4V10a.5.5 0 0 1-.5.5H1A.5.5 0 0 1 .5 10V1A.5.5 0 0 1 1 .5z" fill="#eef0fb" stroke={`rgb(${SCAN})`} strokeWidth={0.6} />
                <path d="M5.5.6v2.9h2.9" fill="none" stroke={`rgb(${SCAN})`} strokeWidth={0.6} />
              </svg>
              <div style={{ position: 'absolute', left: 27, top: 11, fontSize: 8.6, fontWeight: 650, letterSpacing: '-0.01em', lineHeight: 1 }}>
                Launch Film — Shot List
              </div>
              <div style={{ position: 'absolute', left: 27, top: 23, fontSize: 5.4, color: INK2, lineHeight: 1, letterSpacing: '-0.01em' }}>
                {BRAND.name} · Storyboard v3 · 1080p · 30 fps
              </div>
              <div
                style={{
                  position: 'absolute',
                  right: 14,
                  top: 12,
                  padding: '2px 4.5px',
                  borderRadius: 4,
                  background: '#f3f3f1',
                  boxShadow: `inset 0 0 0 0.3px ${HAIR}`,
                  fontFamily: FONT.mono,
                  fontSize: 4.6,
                  color: INK2,
                  letterSpacing: '0.04em',
                  lineHeight: 1,
                }}
              >
                7 SHOTS · 0:28
              </div>
              <div style={{ position: 'absolute', left: 14, right: 14, top: 36, height: 0.3, background: HAIR }} />

              {/* 表头 */}
              {HEAD.map((h, c) =>
                cell(h.toUpperCase(), c, 44, { fontSize: 4.5, fontWeight: 600, color: INK3, letterSpacing: '0.07em' }),
              )}
              <div style={{ position: 'absolute', left: 14, right: 14, top: 52.5, height: 0.3, background: HAIR }} />

              {/* 明细行：光芯经过时整行被轻微照亮 */}
              {ROWS.map((row, r) => {
                const top = ROW_TOP + r * ROW_H;
                const L = lit(top + 3);
                return (
                  <React.Fragment key={r}>
                    <div
                      style={{
                        position: 'absolute',
                        left: 8,
                        right: 8,
                        top: top - 3.5,
                        height: ROW_H - 1,
                        borderRadius: 3,
                        background: `rgba(${SCAN},${(L * 0.09).toFixed(3)})`,
                      }}
                    />
                    {row.map((v, c) =>
                      cell(v, c, top, {
                        fontSize: 5.6,
                        letterSpacing: '-0.012em',
                        fontWeight: c === 0 || c === 3 ? 520 : 420,
                        color: c === 0 || c === 3 ? INK : INK2,
                      }),
                    )}
                  </React.Fragment>
                );
              })}

              {/* 合计 */}
              <div style={{ position: 'absolute', left: 14, right: 14, top: 151, height: 0.3, background: HAIR }} />
              {cell('Runtime', 0, 158, { fontSize: 5.6, fontWeight: 600 })}
              {cell('30 fps', 2, 158, { fontSize: 5.6, color: INK2 })}
              {cell('828 f · 27.6 s', 3, 157.2, { fontSize: 7, fontWeight: 680, letterSpacing: '-0.01em' })}
            </div>

            {/* 扫描光带（裁在文档同 10px 圆角内）：细亮芯 + 柔辉 + 朝来向的色调拖尾 */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 10,
                overflow: 'hidden',
                pointerEvents: 'none',
                opacity: clipOp,
              }}
            >
              <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 0, transform: `translateY(${y.toFixed(3)}px)` }}>
                {/* 拖尾：正片叠底把表格"染"上光色；长度随速度伸缩，下行挂上方、上行挂下方 */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    height: tail,
                    top: dir > 0 ? -tail : 0,
                    mixBlendMode: 'multiply',
                    background:
                      dir > 0
                        ? `linear-gradient(180deg, rgba(${SCAN},0) 0%, rgba(${SCAN},0.06) 55%, rgba(${SCAN},0.2) 100%)`
                        : `linear-gradient(0deg, rgba(${SCAN},0) 0%, rgba(${SCAN},0.06) 55%, rgba(${SCAN},0.2) 100%)`,
                  }}
                />
                {/* 柔辉：光芯两侧对称的窄光晕 */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: -5,
                    height: 10,
                    background: `linear-gradient(180deg, rgba(${SCAN},0) 0%, rgba(${SCAN},0.22) 50%, rgba(${SCAN},0) 100%)`,
                  }}
                />
                {/* 光芯：1.2px 靛蓝线，中间提亮成白热 */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: -0.6,
                    height: 1.2,
                    background: `linear-gradient(90deg, rgba(${SCAN},0.55) 0%, rgb(${SCAN}) 18%, #8f95ff 50%, rgb(${SCAN}) 82%, rgba(${SCAN},0.55) 100%)`,
                    boxShadow: `0 0 2.5px rgba(${SCAN},0.75)`,
                  }}
                />
              </div>
            </div>

            {/* 四角取景括号：交错落位，从外侧 8px 带一次轻过冲收进来 */}
            {CORNERS.map((c, i) => {
              const t0 = 0.08 + i * 0.022;
              const a = seg(t, t0, t0 + 0.03); // 透明度先到
              const p = EASE.overshoot(clamp01((t - t0) / 0.055)); // 位移带 ~8% 过冲
              const off = (1 - p) * 8;
              return (
                <svg
                  key={i}
                  width={CS}
                  height={CS}
                  viewBox={`0 0 ${CS} ${CS}`}
                  style={{
                    position: 'absolute',
                    left: c.left,
                    top: c.top,
                    overflow: 'visible',
                    opacity: a,
                    transform: `translate(${(-off * c.dx).toFixed(3)}px,${(-off * c.dy).toFixed(3)}px)`,
                  }}
                >
                  <path d={c.d} fill="none" stroke={INK} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              );
            })}
          </div>
        </div>
      </DesignStage>
      <Grain opacity={0.045} />
    </AbsoluteFill>
  );
};
