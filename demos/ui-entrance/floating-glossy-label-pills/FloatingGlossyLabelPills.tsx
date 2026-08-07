// floating-glossy-label-pills — Glossy Pills Carousel 高光胶囊横滑走廊（motion-lab 定稿转原生 Remotion）
// 白底四角强调色雾霭，四块浅灰 dashboard 占位 mockup（三栏卡片 / 折线图仪表盘 /
// 列表表格 / 表单+开关列表）横向排队，各顶一枚高光强调色胶囊标签（Feature A–D）；
// 轨道环形循环，任一拍居中面板左右都露出相邻面板边缘。开场有上一拍收尾余量
// （偏左 11px 缓归位），随后轨道三拍向右换位（t≈0.20/0.483/0.688，inOutCubic，
// 第一拍带长尾）——居中者放大清晰，两侧缩至 0.62、下沉变淡微模糊；t≈0.717 黑色
// 描白边光标右上硬现，减速斜滑向左下，t≈0.90 停在末位胶囊右端。
// 整卡唯一色相来源是 ACCENT 及其深浅档，按项目品牌色替换即换肤。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
import React from 'react';
import { DesignStage, E, lerp, rand, seg, useT } from '../../_fixtures/Motion';

export const FLOATING_GLOSSY_LABEL_PILLS_DURATION = 120; // 4000ms @30fps

// ── 模板强调色：实际使用时按项目品牌色替换这一组变量 ──
const ACCENT = '#7a8699'; // 中性蓝灰做默认演示色
const ACCENT_LIGHT = '#a8b2c0', ACCENT_DEEP = '#4c5666';
const A_RGB = '122,134,153', AL_RGB = '168,178,192', AD_RGB = '76,86,102';
const F = '-apple-system,BlinkMacSystemFont,sans-serif';

// 逐帧实测（480×270 裁切系）：
//   居中面板 x 105-357（W≈252）、top=75，下缘正好压住画面底 → 真高 H≈195
//   邻位（静止）面板 x -70..86（缩到 0.62）、top=126 → 缩放 + 下沉 51px
//   相邻两块中心距 SP≈232
// 内部 UI 按 330×255 的内容坐标书写，再整体等比 scale 到 252×195
const CW = 330, CH = 255, CS = 252 / CW;
const W = Math.round(CW * CS), H = Math.round(CH * CS), SP = 232;
const PANEL_TOP = 75;

// ── 通用占位（wireframe / skeleton）零件：全部只用灰条 + 色块，不写具体文案 ──
const TITLE = '#a8adb5', TEXT = '#d4d7dd', FAINT = '#e3e5ea', LINE = '#eceef1';

// 骨架条：默认圆角 min(h/2, 3)
const Skel: React.FC<{ x: number; y: number; w: number; h: number; col: string; r?: number }> = ({ x, y, w, h, col, r }) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: r === undefined ? Math.min(h / 2, 3) : r,
      background: col,
    }}
  />
);

// 窗口顶栏：强调色方块 + 字标灰条 + 右侧两枚圆点（各页面通用 chrome）
const Topbar: React.FC = () => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: 16, background: '#fff', borderBottom: '1px solid #eceef1', zIndex: 1 }}>
    <Skel x={8} y={4} w={8} h={8} col={ACCENT} r={2} />
    <Skel x={20} y={6} w={28} h={5} col="#b9bec6" />
    <div style={{ position: 'absolute', right: 8, top: 5.5, width: 5, height: 5, borderRadius: '50%', background: '#d8dbe0' }} />
    <div style={{ position: 'absolute', right: 18, top: 5.5, width: 5, height: 5, borderRadius: '50%', background: '#d8dbe0' }} />
  </div>
);

// 左侧导航：一条高亮项 + 若干灰条
const Sidebar: React.FC = () => (
  <div style={{ position: 'absolute', left: 0, top: 16, width: 70, height: 'calc(100% - 16px)', background: '#f7f8f9', borderRight: '1px solid #eceef1' }}>
    <Skel x={8} y={8} w={36} h={8} col={ACCENT} />
    {Array.from({ length: 8 }, (_, i) => (
      <Skel key={i} x={8} y={26 + i * 11} w={30 + rand(i + 9) * 22} h={4} col={i === 1 ? ACCENT_LIGHT : '#d8dbe0'} />
    ))}
  </div>
);

// 1) 三栏卡片占位（居中标题 + 三张卡：标题条/大字块/文本骨架/按钮块）
const BCards: React.FC = () => (
  <>
    <Topbar />
    <Skel x={CW / 2 - 46} y={30} w={92} h={9} col={TITLE} />
    <Skel x={CW / 2 - 70} y={46} w={140} h={5} col={FAINT} />
    {Array.from({ length: 3 }, (_, i) => (
      <div key={i} style={{ position: 'absolute', left: 16 + i * 104, top: 64, width: 92, height: 170, border: `1px solid ${LINE}`, borderRadius: 6, background: '#fff' }}>
        <Skel x={10} y={12} w={38} h={6} col="#b9bec6" />
        <Skel x={10} y={26} w={52} h={14} col={TITLE} r={4} />
        {Array.from({ length: 5 }, (_, k) => (
          <Skel key={k} x={10} y={52 + k * 13} w={44 + rand(i * 7 + k) * 26} h={4} col={FAINT} />
        ))}
        <Skel x={10} y={142} w={72} h={16} col={ACCENT} r={4} />
      </div>
    ))}
  </>
);

// 2) 仪表盘占位（四枚数值卡 + 折线图占位）
const BDash: React.FC = () => (
  <>
    <Topbar />
    <Sidebar />
    <Skel x={84} y={26} w={64} h={9} col={TITLE} />
    {Array.from({ length: 4 }, (_, i) => (
      <div key={i} style={{ position: 'absolute', left: 84 + i * 60, top: 44, width: 54, height: 32, border: `1px solid ${LINE}`, borderRadius: 6, background: '#fff' }}>
        <Skel x={7} y={7} w={34} h={8} col={TITLE} />
        <Skel x={7} y={20} w={22} h={3} col={FAINT} />
      </div>
    ))}
    <div style={{ position: 'absolute', left: 84, top: 86, width: 232, height: 146, border: `1px solid ${LINE}`, borderRadius: 6, background: '#fff' }}>
      <Skel x={8} y={8} w={56} h={5} col={TEXT} />
      <svg viewBox="0 0 232 146" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <path d="M8 116 C 40 112, 56 62, 84 64 S 128 120, 152 116 S 196 50, 224 56 L224 134 L8 134 Z" fill={`rgba(${A_RGB},.18)`} />
        <path d="M8 116 C 40 112, 56 62, 84 64 S 128 120, 152 116 S 196 50, 224 56" fill="none" stroke={ACCENT} strokeWidth={2} />
      </svg>
      {Array.from({ length: 5 }, (_, i) => (
        <Skel key={i} x={12 + i * 44} y={138} w={22} h={3} col={FAINT} />
      ))}
    </div>
  </>
);

// 3) 列表 / 表格占位（小统计条 + 多行骨架 + 状态色块）
const BTable: React.FC = () => (
  <>
    <Topbar />
    <Sidebar />
    <Skel x={84} y={26} w={76} h={9} col={TITLE} />
    {Array.from({ length: 4 }, (_, i) => (
      <div key={i} style={{ position: 'absolute', left: 84 + i * 60, top: 44, width: 54, height: 22, border: `1px solid ${LINE}`, borderRadius: 6, background: '#fff' }}>
        <Skel x={7} y={7} w={26 + rand(i + 3) * 14} h={8} col={TITLE} />
      </div>
    ))}
    {Array.from({ length: 7 }, (_, i) => (
      <div key={i} style={{ position: 'absolute', left: 84, top: 78 + i * 22, width: 232, height: 18, borderBottom: '1px solid #f0f1f4' }}>
        <Skel x={0} y={6} w={70 + rand(i + 21) * 60} h={5} col={TEXT} />
        {/* 状态色块保留功能色（异常淡红 / 正常淡绿） */}
        <Skel x={172} y={4} w={26} h={9} col={i % 2 ? '#f2d6d6' : '#cdeccf'} r={4} />
        <div style={{ position: 'absolute', left: 226, top: 6, width: 6, height: 6, borderRadius: '50%', background: '#28c06a' }} />
      </div>
    ))}
  </>
);

// 4) 表单 + 开关列表占位（左侧字段框，右侧头像色块行 + 开关）
const BForm: React.FC = () => (
  <>
    <Topbar />
    <Sidebar />
    <Skel x={84} y={26} w={96} h={9} col={TITLE} />
    <Skel x={84} y={44} w={44} h={5} col="#b9bec6" />
    {Array.from({ length: 3 }, (_, i) => (
      <React.Fragment key={i}>
        <Skel x={84} y={56 + i * 26} w={34 + rand(i + 51) * 30} h={4} col={TEXT} />
        <div style={{ position: 'absolute', left: 84, top: 64 + i * 26, width: 120, height: 13, border: '1px solid #dcdfe4', borderRadius: 4, background: '#fff' }} />
      </React.Fragment>
    ))}
    <Skel x={84} y={140} w={120} h={15} col="#26282d" r={8} />
    <Skel x={84} y={168} w={60} h={5} col="#b9bec6" />
    {Array.from({ length: 3 }, (_, i) => (
      <Skel key={i} x={84} y={180 + i * 9} w={110 + rand(i + 71) * 60} h={3} col={FAINT} />
    ))}
    <Skel x={218} y={44} w={40} h={5} col="#b9bec6" />
    <Skel x={218} y={122} w={52} h={5} col="#b9bec6" />
    {Array.from({ length: 4 }, (_, i) => (
      <div key={i} style={{ position: 'absolute', left: 218, top: 56 + i * 30 + (i > 1 ? 22 : 0), width: 100, height: 22 }}>
        <div style={{ position: 'absolute', left: 0, top: 3, width: 13, height: 13, borderRadius: '50%', background: `hsl(${212 + i * 4},14%,${56 + i * 5}%)` }} />
        <Skel x={19} y={3} w={48} h={4} col="#c2c6cc" />
        <Skel x={19} y={11} w={32} h={4} col={FAINT} />
        {/* 开关保留功能色（开=蓝 / 关=灰） */}
        <div style={{ position: 'absolute', right: 0, top: 4, width: 18, height: 10, borderRadius: 6, background: i % 2 ? '#d6d9de' : '#2f7de1' }}>
          <div style={{ position: 'absolute', top: 1.5, ...(i % 2 ? { left: 1.5 } : { right: 1.5 }), width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />
        </div>
      </div>
    ))}
  </>
);

// 四组：胶囊 + 占位 mockup 横向排队（i 越大越靠左，滑入中央越晚），轨道循环
const GROUPS: { txt: string; Body: React.FC }[] = [
  { txt: 'Feature A', Body: BCards },
  { txt: 'Feature B', Body: BDash },
  { txt: 'Feature C', Body: BTable },
  { txt: 'Feature D', Body: BForm },
];

// 雾块静态参数（位置 / 颜色）
const FOGS = [
  { left: '68%', top: '8%', rgb: AD_RGB },
  { left: '4%', top: '60%', rgb: A_RGB },
  { left: '40%', top: '82%', rgb: AL_RGB },
];

// 轨道三拍：起点 t≈0.20 / 0.483 / 0.688，inOutCubic 缓起→中段冲→缓收；
// 第一拍明显更慢且带长尾（到 t≈0.48 才完全收住），后两拍干脆些。
const BEATS = [
  { b: 0.200, d: 0.185, tail: 0.28 }, // 第 1 位 → 第 2 位
  { b: 0.483, d: 0.150, tail: 0 },    // 第 2 位 → 第 3 位
  { b: 0.688, d: 0.150, tail: 0 },    // 第 3 位 → 第 4 位
];

export const FloatingGlossyLabelPills: React.FC = () => {
  const t = useT();
  // 开场有上一拍的收尾余量：t=0 时轨道偏左 11px，t≈0.19 归位
  let trackX = -11 * (1 - seg(t, 0, 0.19, E.outQuart));
  for (const B of BEATS) {
    const p = B.tail
      ? 0.85 * seg(t, B.b, B.b + B.d, E.inOutCubic) + 0.15 * seg(t, B.b, B.b + B.tail, E.outCubic)
      : seg(t, B.b, B.b + B.d, E.inOutCubic);
    trackX += p * SP;
  }
  const N = GROUPS.length, RING = N * SP;
  // 光标：t≈0.717 于右上（x≈403,y≈36）一帧硬现，减速斜滑向左下，
  // t≈0.90 抵达末位胶囊右端附近（x≈281,y≈56）后几乎静止
  const cp = seg(t, 0.717, 0.90, E.outQuart);
  return (
    <DesignStage bg="#fbfbfc">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          background: `radial-gradient(55% 75% at 106% 42%, rgba(${A_RGB},.55), transparent 70%),
      radial-gradient(42% 50% at -6% 88%, rgba(${AD_RGB},.42), transparent 70%),
      radial-gradient(48% 40% at 12% -10%, rgba(${AL_RGB},.5), transparent 70%),
      #fbfbfc`,
        }}
      >
        {/* 漂移雾块 */}
        {FOGS.map(({ left, top, rgb }, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left,
              top,
              width: 240,
              height: 160,
              borderRadius: '50%',
              filter: 'blur(50px)',
              background: `rgba(${rgb},.14)`,
              transform: `translate(${Math.sin(t * Math.PI * 2 * 0.5 + i * 2.1) * 18}px,${Math.cos(t * Math.PI * 2 * 0.4 + i) * 12}px)`,
            }}
          />
        ))}

        {GROUPS.map(({ txt, Body }, i) => {
          // 环形轨道：面板绕 4 位循环，保证任一拍都有左右邻居各露一截在画面边缘
          let wx = trackX - i * SP;
          wx = ((wx % RING) + RING * 1.5) % RING - RING / 2;
          const d = Math.min(1, Math.abs(wx) / SP); // 0=正居中，1=已到邻位
          const close = 1 - d;
          const sc = lerp(close, 0.62, 1);          // 邻位实测缩到 0.62
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: '50%',
                top: 0,
                width: W,
                height: 270,
                marginLeft: -W / 2,
                transform: `translateX(${wx}px)`,
                // 邻位（d=1）必须仍清楚可见 —— 原片左右两侧始终露出相邻面板边缘
                opacity: lerp(Math.min(1, close * 2.4), 0.78, 1),
                filter: `blur(${d * 1.3}px)`,
                zIndex: close > 0.5 ? 2 : 1,
              }}
            >
              {/* 面板：等比缩小 + 顶边随 d 线性下沉（斜率 ≈80px） */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: PANEL_TOP,
                  width: W,
                  height: H,
                  borderRadius: 8,
                  transformOrigin: '50% 0',
                  boxShadow: `0 0 0 1.5px rgba(${A_RGB},.6), 0 14px 34px rgba(${AD_RGB},.22)`,
                  transform: `translateY(${d * 80}px) scale(${sc})`,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: CW,
                    height: CH,
                    borderRadius: 10,
                    background: '#fff',
                    overflow: 'hidden',
                    transform: `scale(${CS})`,
                    transformOrigin: '0 0',
                    fontFamily: F,
                  }}
                >
                  <Body />
                </div>
              </div>
              {/* 胶囊：实测中心 y 从 45（居中）沉到 102（邻位），比面板沉得更多，
                  离心时贴近面板顶边 —— 单独一条更陡的下沉曲线 */}
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 28,
                  transformOrigin: '50% 50%',
                  padding: '4px 13px',
                  borderRadius: 999,
                  whiteSpace: 'nowrap',
                  // 原 cssText 中 font 简写在 line-height:1 之后，实际生效行高为 normal
                  font: `700 14px ${F}`,
                  color: '#fff',
                  background: `linear-gradient(180deg,${ACCENT_LIGHT} 0%,${ACCENT} 45%,${ACCENT_DEEP} 100%)`,
                  boxShadow: `inset 0 2px 3px rgba(255,255,255,.65), inset 0 -4px 8px rgba(34,39,47,.5),
          0 12px 28px rgba(${AD_RGB},.35)`,
                  transform: `translateX(-50%) translateY(${d * 92}px) scale(${sc})`,
                }}
              >
                {txt}
                <div
                  style={{
                    position: 'absolute',
                    left: '12%',
                    top: 3,
                    width: '76%',
                    height: '38%',
                    borderRadius: 999,
                    background: 'linear-gradient(180deg,rgba(255,255,255,.75),rgba(255,255,255,0))',
                    pointerEvents: 'none',
                  }}
                />
              </div>
            </div>
          );
        })}

        {/* 黑色描白边光标（结尾划向末位胶囊，macOS 指针样式） */}
        <div
          style={{
            position: 'absolute',
            width: 0,
            height: 0,
            borderLeft: '8px solid #0d0d11',
            borderRight: '4px solid transparent',
            borderBottom: '14px solid transparent',
            filter: 'drop-shadow(0 0 1px #fff) drop-shadow(0 0 1px #fff) drop-shadow(0 2px 3px rgba(0,0,0,.3))',
            transform: 'rotate(-16deg)',
            opacity: seg(t, 0.717, 0.725),
            zIndex: 5,
            left: `${(lerp(cp, 403, 281) / 480) * 100}%`,
            top: `${(lerp(cp, 36, 56) / 270) * 100}%`,
          }}
        />
      </div>
    </DesignStage>
  );
};
