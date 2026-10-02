// mask-wipe 元素遮罩擦除（轮 D）——真实项目卡放大成全屏窗口，该项目的**详情页**从窗内
// 长出接管："点开一张卡进入它的世界"。卡 = nano-lab（card9），窗内 = 同一项目的
// detail-full 详情页（标题一致，语义闭环：被点开的元素 → 它自己的详情世界）。
// 先演"点开"这件事：页面滚动惯性落到底 → 光标滑上卡片 → 卡片悬浮抬起（阴影变大变虚）
// → 按下微缩 → 放大成窗。窗几何与窗内景由同一个 t 驱动（窗内景从 0.42 反向补偿长到 1），
// 背后的列表页随窗变大压暗 + 轻微虚化，主次分明；窗在飞行中挂随高度变化的两层软阴影。
// 节拍：0–26 页面滚动落定 → 12–32 光标滑入 → 26–38 卡片悬浮 → 36–40 按下 →
// 40–85 卡放大成窗 → 85–120 详情页 hold（真静止）。
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import layout from '../../_textures/live-layout.json';
import { EASE, bezier, ramp, mix, softShadow } from '../../_fixtures/Polish';

export const MASKWIPE_DUR = 120;

const CARD = layout.projects.cards[8]; // nano-lab：页面空间 x=408,y=1402,w=357,h=312
const PAGE_H = layout.projects.pageH; // 1746
const VIEW_END = PAGE_H - 1080; // 666：滚到页底，卡片完整入画
const VIEW_START = 430;
const EXPAND = bezier(0.5, 0, 0.2, 1);

export const MaskWipeReal: React.FC = () => {
  const frame = useCurrentFrame();

  // 页面滚动：0–26 惯性减速落到页底
  const viewY = mix(VIEW_START, VIEW_END, ramp(frame, 0, 26, EASE.out));
  // 悬浮抬起 + 按下
  const hover = ramp(frame, 26, 12, EASE.snappy);
  const press = ramp(frame, 36, 3, EASE.out) * (1 - ramp(frame, 39, 4, EASE.out));
  // 放大成窗：40–85，单段 bezier
  const t = ramp(frame, 40, 45, EXPAND);

  // 卡在屏幕空间的起始几何（随滚动走）+ 悬浮抬升
  const lift = 8 * hover;
  const s0 = 1 + 0.025 * hover - 0.02 * press;
  const g0 = {
    x: CARD.x - (CARD.w * (s0 - 1)) / 2,
    y: CARD.y - viewY - lift - (CARD.h * (s0 - 1)) / 2,
    w: CARD.w * s0,
    h: CARD.h * s0,
    r: 12,
  };
  const x = mix(g0.x, 0, t);
  const y = mix(g0.y, 0, t);
  const w = mix(g0.w, 1920, t);
  const h = mix(g0.h, 1080, t);
  const r = mix(g0.r, 0, t);
  // 窗内新景：从 0.42 缩放反向长到 1（与窗几何同一个 t）
  const innerScale = mix(0.42, 1, t);
  // 阴影高度：悬浮 4→18，飞行中再抬到 ~56，铺满时归零
  const elev = (4 + 14 * hover) * (1 - t) + 56 * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (1 - t);
  // 背景列表页：随窗变大压暗 + 虚化
  const bgDim = 0.22 * ramp(frame, 40, 36, EASE.out);
  const bgBlur = 3 * ramp(frame, 40, 36, EASE.out);
  const done = frame >= 85;

  // 光标：12–32 从右下滑到卡片中心偏右，按下缩一下，放大开始后淡出
  const curT = ramp(frame, 12, 20, EASE.out);
  const curX = mix(1230, CARD.x + CARD.w * 0.62, curT);
  const curY = mix(1010, CARD.y - VIEW_END + CARD.h * 0.55, curT) - lift;
  const curOpacity = ramp(frame, 12, 6, EASE.out) * (1 - ramp(frame, 42, 6, EASE.out));

  return (
    <AbsoluteFill style={{ backgroundColor: '#f9f6f1', overflow: 'hidden' }}>
      {/* 背景：projects 全景（滚到页底） */}
      {!done && (
        <div style={{ position: 'absolute', inset: 0, filter: bgBlur > 0.05 ? `blur(${bgBlur.toFixed(2)}px)` : undefined }}>
          <Img
            src={staticFile('textures/live/projects-full.png')}
            style={{ position: 'absolute', left: 0, top: -viewY, width: 1920, height: PAGE_H }}
          />
          {bgDim > 0.002 && <div style={{ position: 'absolute', inset: 0, background: `rgba(38,32,24,${bgDim.toFixed(3)})` }} />}
        </div>
      )}
      {/* 卡片即窗口 */}
      <div
        style={{
          position: 'absolute', left: x, top: y, width: w, height: h,
          borderRadius: r, overflow: 'hidden', background: '#f9f6f1',
          boxShadow: !done && elev > 0.2 ? softShadow(elev, { color: '#2a2218', strength: 1.1 }) : 'none',
        }}
      >
        {/* 窗内新景：nano-lab 详情页，反向补偿铺满 */}
        {t > 0 && (
          <div
            style={{
              position: 'absolute', width: 1920, height: 1080, left: '50%', top: '50%',
              transform: done ? 'translate(-50%, -50%)' : `translate(-50%, -50%) scale(${innerScale})`,
              overflow: 'hidden', background: '#f9f6f1',
            }}
          >
            <Img
              src={staticFile('textures/live/detail-full.png')}
              style={{ position: 'absolute', left: 0, top: 0, width: 1920 }}
            />
          </div>
        )}
        {/* 卡片脸：随放大渐隐露出窗内景（cover 保持纹理比例，窗变宽时不横向拉伸） */}
        {t < 0.46 && (
          <Img
            src={staticFile('textures/live/card9.png')}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: Math.max(0, 1 - t * 2.2) }}
          />
        )}
      </div>
      {/* 光标 */}
      {curOpacity > 0.01 && (
        <svg width={28} height={36} viewBox="0 0 26 34" style={{
          position: 'absolute', left: curX, top: curY, opacity: curOpacity,
          transform: `scale(${1 - 0.12 * press})`, transformOrigin: '2px 2px',
          filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.28))',
        }}>
          <path d="M2 2 L2 27 L8.5 21 L13 31.5 L17.5 29.5 L13 19.5 L22 19.5 Z" fill="#17181c" stroke="#ffffff" strokeWidth={1.8} strokeLinejoin="round" />
        </svg>
      )}
    </AbsoluteFill>
  );
};
