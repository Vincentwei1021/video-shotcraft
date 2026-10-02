// neon-triple-marquee —— 三行对向霓虹跑马灯 recap（clickup-30 61–64.5s 的手法）
//
// 第二轮重设计（夜里的灯牌墙 · 斜拍 + 湿地面反光）：
// - look = custom「neon」：蓝黑砖墙 + 三色灯管（冰青 / 洋红 / 钠灯琥珀）。不再是平铺的彩色描边字，
//   而是一面真实的霓虹灯牌墙：机位斜拍（墙面 rotateY −17°→−9° 极缓摇近，透视让词流有纵深），
//   墙下是一条湿地面，亮着的那行在地上投出倒影与色光池。
// - 灯管三层：暗态玻璃管（同色、低亮、常亮——三行结构永远在）→ 通电彩色管体 + 双层辉光 → 近白热芯；
//   亮行的光同时溢到身后砖墙上（砖缝被照出来），这是"灯在墙上"而不是"字在屏上"。
// - 字体换成粗体窄体（Avenir Next Condensed Heavy），三连词 DRAFT / DESIGN / DEPLOY（头韵，recap 用）；
//   词距按 canvas 实测宽度排，分隔用空心菱形 ◇。
// - 轮唱：周期 42f、相位差 14f，一亮俩暗；每次点亮先打 2 帧点火闪烁（真霓虹的启辉），再余弦软包络。
//   开场三行按 0/5/10f 依次点火闪烁上电；尾段 124f 起自上而下逐行"断电"（闪两下熄灭），
//   落到只剩暗态玻璃管的熄灯海报（墙仍可见），不淡到死黑。
//
// 时间表（30fps，共 150f）：
//   0–18     上电：三行依次点火闪烁（0/5/10f 起），暗态玻璃管亮起
//   18–124   轮唱：42f 周期、14f 相位差，奇偶行反向匀速滚动（marquee 豁免 linear）
//   124–142  断电：自上而下每行错峰 6f 闪两下熄灭
//   142–150  熄灯 hold：暗态灯管 + 墙面余光
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, Grain, Vignette, ramp, mix } from '../../_fixtures/Polish';
import { alpha } from '../../_fixtures/Look';

export const NEON_TRIPLE_MARQUEE_DURATION = 150;

const FONT = '"Avenir Next Condensed", "DIN Condensed", "Arial Narrow", Impact, sans-serif';
const WEIGHT = 800;
const SIZE = 286;
const GAP = SIZE * 0.36;
const PLANE_W = 2900; // 墙面宽（透视斜拍时两侧不露边）
const FLOOR_Y = 900; // 墙脚 / 地面线（墙面坐标）
const ROW_Y = [28, 318, 608];

const WALL = '#0a0b14';
// 砖墙纹理：两行错缝砖（SVG 小图平铺），砖缝极淡——被灯光照到才看得见
const BRICK = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='300' height='120'>" +
  "<rect width='300' height='120' fill='none'/>" +
  "<g stroke='rgba(255,255,255,0.04)' stroke-width='3'>" +
  "<line x1='0' y1='1.5' x2='300' y2='1.5'/><line x1='0' y1='61.5' x2='300' y2='61.5'/>" +
  "<line x1='1.5' y1='0' x2='1.5' y2='60'/><line x1='151.5' y1='0' x2='151.5' y2='60'/>" +
  "<line x1='76.5' y1='60' x2='76.5' y2='120'/><line x1='226.5' y1='60' x2='226.5' y2='120'/></g></svg>",
)}")`;

// 实测文本宽度（同字体同字号，确定性）；无 DOM 时退回估宽
const widthCache = new Map<string, number>();
const measure = (text: string) => {
  const hit = widthCache.get(text);
  if (hit !== undefined) return hit;
  let w = text.length * SIZE * 0.6;
  if (typeof document !== 'undefined') {
    const ctx = document.createElement('canvas').getContext('2d');
    if (ctx) {
      ctx.font = `${WEIGHT} ${SIZE}px ${FONT}`;
      w = ctx.measureText(text).width + text.length * SIZE * 0.02; // letterSpacing 0.02em
    }
  }
  widthCache.set(text, w);
  return w;
};

type Row = { word: string; color: string; core: string; dir: 1 | -1; speed: number };
const ROWS: Row[] = [
  { word: 'DRAFT', color: '#38d9ff', core: '#e9fbff', dir: 1, speed: 9 },
  { word: 'DESIGN', color: '#ff3d9a', core: '#ffe6f3', dir: -1, speed: 11 },
  { word: 'DEPLOY', color: '#ffae34', core: '#fff3dc', dir: 1, speed: 9 },
];

// 点火闪烁序列（确定性）：0/1 门，6 帧后恒 1
const IGNITE = [0, 1, 0.15, 0, 0.9, 0.6];
const ignite = (f: number, at: number) => {
  const k = Math.floor(f - at);
  if (k < 0) return 0;
  return k < IGNITE.length ? IGNITE[k] : 1;
};
// 断电序列：闪两下熄灭
const KILL = [1, 0.2, 0.85, 0.1, 0.5, 0];
const kill = (f: number, at: number) => {
  const k = Math.floor(f - at);
  if (k < 0) return 1;
  return k < KILL.length ? KILL[k] : 0;
};

const PERIOD = 42;
const SLOT = PERIOD / 3; // 每行 14f
// 轮唱亮度：每行在自己的 14f 槽里点亮——前 2 帧启辉闪烁、3f 升满、平台、最后 4f ease-in 熄灭并与下一行
// 重叠 2f 交接（任意时刻总有一行在亮，"一亮俩暗"不出现全暗空拍）
const pulse = (f: number, i: number) => {
  if (f < 18) return 0;
  const ph = ((((f - 18) - i * SLOT) % PERIOD) + PERIOD) % PERIOD;
  const len = SLOT + 2;
  if (ph >= len) return 0;
  const fl = ph < 1 ? 0.6 : ph < 2 ? 0.25 : 1; // 启辉
  const up = ramp(ph, 1, 3, EASE.out);
  const down = 1 - ramp(ph, len - 5, 5, EASE.exit);
  return Math.max(up * down, 0) * fl;
};

const MarqueeRow: React.FC<{ row: Row; f: number; y: number; lit: number; glass: number; cheap?: boolean }> = ({ row, f, y, lit, glass, cheap }) => {
  const wordW = measure(row.word);
  const dotW = SIZE * 0.42;
  const unitW = wordW + GAP + dotW + GAP;
  const copies = Math.ceil(PLANE_W / unitW) + 3;
  const raw = (f * row.speed) % unitW;
  const offset = row.dir === 1 ? -unitW * 1.5 + raw : -unitW * 0.5 - raw;
  const base: React.CSSProperties = {
    position: 'absolute', top: y, left: 0, width: PLANE_W, height: SIZE * 1.05,
    transform: `translateX(${offset.toFixed(2)}px)`,
    fontFamily: FONT, fontWeight: WEIGHT, fontSize: SIZE, letterSpacing: '0.02em', lineHeight: 1, color: 'transparent',
  };
  // 分隔：空心菱形（边框色 / 粗细与同层灯管一致，字本身只描边不填色）
  const text = (sep: string, bw: number) => Array.from({ length: copies }).map((_, i) => (
    <span key={i} style={{ position: 'absolute', left: i * unitW, top: 0, whiteSpace: 'nowrap' }}>
      {row.word}
      <span style={{
        position: 'absolute', left: wordW + GAP + dotW * 0.2, top: SIZE * 0.34, width: dotW * 0.6, height: dotW * 0.6,
        transform: 'rotate(45deg)', boxSizing: 'border-box', border: `${bw.toFixed(2)}px solid ${sep}`, borderRadius: 6,
      }} />
    </span>
  ));
  const tube = 6 + lit * 4;
  const core = 2 + lit * 1.8;
  return (
    <>
      {/* 暗态玻璃管：同色低亮，三行结构永远在 */}
      <div style={{ ...base, WebkitTextStroke: `6px ${alpha(row.color, 0.3 * glass)}` }}>{text(alpha(row.color, 0.3 * glass), 6)}</div>
      {lit > 0.02 && (
        <>
          {/* 通电管体 + 双层辉光 */}
          <div style={{
            ...base, WebkitTextStroke: `${tube.toFixed(2)}px ${row.color}`, opacity: Math.min(1, lit * 1.1),
            filter: cheap ? undefined : `drop-shadow(0 0 ${(3 + lit * 6).toFixed(1)}px ${row.color}) drop-shadow(0 0 ${(14 + lit * 22).toFixed(1)}px ${row.color}) drop-shadow(0 0 ${(40 + lit * 50).toFixed(1)}px ${alpha(row.color, 0.9)})`,
          }}>{text(row.color, tube)}</div>
          {/* 热芯：近白细线，只在通电时亮——"霓虹"而不是"彩色描边"的关键 */}
          <div style={{ ...base, WebkitTextStroke: `${core.toFixed(2)}px ${row.core}`, opacity: Math.min(1, lit * 1.3), filter: cheap ? undefined : `drop-shadow(0 0 2px ${alpha(row.core, 0.9)})` }}>
            {text(row.core, core)}
          </div>
        </>
      )}
    </>
  );
};

export const NeonTripleMarquee: React.FC = () => {
  const f = useCurrentFrame();

  // 每行供电：上电点火 × 断电
  const power = ROWS.map((_, i) => ignite(f, i * 5) * kill(f, 124 + i * 6));
  // 暗态玻璃：上电后常亮，断电后仍留 0.6（熄灯海报：灯管看得见）
  const glass = ROWS.map((_, i) => Math.max(ignite(f, i * 5), f >= 124 ? 1 : 0) * (1 - 0.25 * ramp(f, 124 + i * 6 + 4, 8, EASE.out)));
  // 亮度：开场上电时全行点火亮一下（0.7）→ 轮唱
  const lit = ROWS.map((_, i) => {
    const boot = f < 18 ? 0.7 * ignite(f, i * 5) * (1 - ramp(f, 12, 6, EASE.out)) : 0;
    const killFlash = f >= 124 ? 0.55 * kill(f, 124 + i * 6) * (f < 124 + i * 6 ? 0 : 1) : 0;
    return Math.max(boot, pulse(f, i) * power[i], killFlash);
  });

  // 机位：墙面斜拍，rotateY −17° → −9° 极缓摇近（smooth），整体轻推
  const cam = ramp(f, 0, 150, EASE.smooth);
  const rotY = mix(-17, -9, cam);
  const scale = mix(1.0, 1.05, cam);

  return (
    <AbsoluteFill style={{ background: '#05050a', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, perspective: 1700, perspectiveOrigin: '50% 45%' }}>
        <div style={{
          position: 'absolute', left: (1920 - PLANE_W) / 2, top: 40, width: PLANE_W, height: 1200,
          transform: `rotateY(${rotY.toFixed(3)}deg) scale(${scale.toFixed(4)})`, transformOrigin: '50% 40%',
        }}>
          {/* 砖墙：底色 + 极淡砖缝（被灯光照到才看得见） */}
          <div style={{
            position: 'absolute', left: 0, top: -40, width: PLANE_W, height: FLOOR_Y + 40, background: WALL,
            backgroundImage: BRICK, backgroundSize: '300px 120px',
          }} />
          {/* 墙面溢光：每行身后一条同色柔光带，随亮度呼吸（screen 叠在砖墙上） */}
          {ROWS.map((r, i) => (
            <div key={`spill${i}`} style={{
              position: 'absolute', left: 0, right: 0, top: ROW_Y[i] - 200, height: SIZE + 400, mixBlendMode: 'screen',
              background: `radial-gradient(ellipse 50% 44% at 50% 50%, ${alpha(r.color, 0.6)} 0%, ${alpha(r.color, 0.12)} 45%, ${alpha(r.color, 0)} 72%)`,
              opacity: 0.05 * glass[i] + lit[i] * 0.55,
            }} />
          ))}
          {ROWS.map((r, i) => (
            <MarqueeRow key={r.word} row={r} f={f} y={ROW_Y[i]} lit={lit[i]} glass={glass[i]} />
          ))}
          {/* 湿地面：墙脚以下一条深色反光面，倒影只取最下一行（翻转、虚化、渐隐） */}
          <div style={{ position: 'absolute', left: 0, top: FLOOR_Y, width: PLANE_W, height: 300, background: 'linear-gradient(180deg, #08080e 0%, #040407 100%)' }} />
          <div style={{
            position: 'absolute', left: 0, top: FLOOR_Y, width: PLANE_W, height: 300, overflow: 'hidden',
            WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 70%)',
            maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 70%)',
            filter: 'blur(3px)',
          }}>
            {/* 镜像：墙面 y_w 处的点映到地面下 (FLOOR_Y − y_w)；内层 600 高、绕自身中心翻转 → 行放在 y_w − 300 */}
            <div style={{ position: 'absolute', left: 0, top: 0, width: PLANE_W, height: 600, transform: 'scaleY(-1)', transformOrigin: '50% 50%' }}>
              <MarqueeRow row={ROWS[2]} f={f} y={ROW_Y[2] - 300} lit={lit[2]} glass={glass[2]} cheap />
            </div>
          </div>
          {/* 地面色光池：每行的光落在地上（远行更弱） */}
          {ROWS.map((r, i) => (
            <div key={`pool${i}`} style={{
              position: 'absolute', left: 0, right: 0, top: FLOOR_Y - 40, height: 220, mixBlendMode: 'screen',
              background: `radial-gradient(ellipse 46% 40% at 50% 30%, ${alpha(r.color, 0.55)} 0%, ${alpha(r.color, 0)} 70%)`,
              opacity: lit[i] * [0.18, 0.28, 0.5][i],
            }} />
          ))}
          {/* 墙脚接缝：一条发丝高光，把墙和地分开 */}
          <div style={{ position: 'absolute', left: 0, top: FLOOR_Y, width: PLANE_W, height: 2, background: 'rgba(255,255,255,0.06)' }} />
        </div>
      </div>
      <Vignette strength={0.62} inner={0.36} color="#020205" />
      <Grain opacity={0.08} blend="soft-light" />
    </AbsoluteFill>
  );
};
