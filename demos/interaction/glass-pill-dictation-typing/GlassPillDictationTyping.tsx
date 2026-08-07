// glass-pill-dictation-typing — Glass Pill Dictation 玻璃胶囊听写（motion-lab 定稿转原生 Remotion）
// 纯黑底上一条定宽玻璃胶囊：整条以约 1.25 倍略大弹出后缓落到位，胶囊内部自左暗到右亮
// 铺一层强调色光（ACCENT 变量，默认紫）；光标先行出现，随后打字出现占位句
// 「Speak or type here」，光随打字进度渐渐熄灭，收尾成中性深色玻璃条；右端是描边圆角
// 方块里的竖条声波图标——全片最安静的一拍。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
import React, { useLayoutEffect, useRef, useState } from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';

export const GLASS_PILL_DICTATION_TYPING_DURATION = 50; // 1650ms @30fps

// 模板强调色：实际使用时按项目品牌色替换这一个变量（内嵌光 + 外泛光共用）
const ACCENT_RGB = '146,126,212';
const UI = '-apple-system,system-ui,"Segoe UI",sans-serif';
const PH = 46; // 胶囊高度
const ICON = 30; // 右端声波图标方块尺寸
const BASE = [13, 7, 10, 6, 9]; // 竖条基准高度（左高右低的听写图标）
const TEXT = 'Speak or type here'; // 占位句，长度贴近原片（19→18 字符），打字节奏不变

export const GlassPillDictationTyping: React.FC = () => {
  const t = useT();

  // 定宽：原片胶囊宽度约为整句文本宽度的 2 倍，不随词伸缩——挂载时实测一次整句宽度
  const measRef = useRef<HTMLDivElement>(null);
  const [textW, setTextW] = useState(180); // 兜底估算值，useLayoutEffect 实测后覆盖（先于首帧绘制）
  useLayoutEffect(() => {
    if (measRef.current) setTextW(measRef.current.offsetWidth);
  }, []);
  const PW = Math.round(textW + 168);

  // 出场：整体略大（~1.25x）快速浮现，约 0.45s 内缓落到位
  const s = lerp(seg(t, 0, 0.22, E.outCubic), 1.25, 1);
  // 打字：caret 先行（~t0.03），字符 t0.06→0.73 匀速铺完，尾段保持
  const n = Math.floor(seg(t, 0.06, 0.73) * TEXT.length + 1e-6);
  const caretO = seg(t, 0.025, 0.045) * (1 - seg(t, 0.75, 0.8));
  // 强调色光随打字进度渐熄；同步收掉描边亮度的一点富余
  const g = 1 - seg(t, 0.08, 0.76, E.inOutQuad);

  return (
    <DesignStage bg="#000">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#000',
          overflow: 'hidden',
          // 暗部校色：原样片 x264 把外泛光的暗尾（1~2 级灰）压成纯 0，本渲染的
          // 泛光尾巴因此比样片亮一档、拖得更远。contrast(1.008) 等价于黑端减 ~1 级
          // （255*0.008/2≈1）、中间调不动，按对照帧实测校准（f1 0.9205→0.9844）。
          filter: 'contrast(1.008)',
        }}
      >
        {/* 居中走 translateX：PW 为奇数时圆心在 .5 半像素上，left/flex 会被布局
            取整偏 0.5 设计像素；transform 矩阵不吸附，能与原片圆心逐像素对齐 */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: (270 - PH) / 2,
            height: PH,
            width: PW,
            borderRadius: PH / 2,
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            padding: '0 8px 0 16px',
            overflow: 'hidden',
            background: '#0d0d13',
            willChange: 'transform,opacity',
            opacity: seg(t, 0, 0.025),
            transform: `translateX(${(480 - PW) / 2}px) scale(${s})`,
            boxShadow: `inset 0 0 0 1px rgba(255,255,255,${0.16 + 0.1 * g}), inset 0 14px 22px rgba(255,255,255,${0.03 + 0.04 * g}), 0 0 ${26 * g}px rgba(${ACCENT_RGB},${0.28 * g})`,
          }}
        >
          {/* 内嵌强调色光：左暗右亮的渐层，随打字进度熄灭（原片光在胶囊内部，无外部光晕） */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              opacity: g,
              background: `linear-gradient(90deg,rgba(${ACCENT_RGB},0) 0%,rgba(${ACCENT_RGB},.35) 42%,rgba(${ACCENT_RGB},.95) 100%)`,
            }}
          />
          <div
            style={{
              position: 'relative',
              font: `400 21px ${UI}`,
              color: '#f4f4f5',
              whiteSpace: 'pre',
              letterSpacing: 0.3,
              flex: 'none',
            }}
          >
            {TEXT.slice(0, n)}
          </div>
          <div
            style={{
              position: 'relative',
              width: 2,
              height: 23,
              borderRadius: 1,
              background: '#eaeaec',
              marginLeft: 2,
              flex: 'none',
              opacity: caretO,
            }}
          />
          <div
            style={{
              position: 'relative',
              marginLeft: 'auto',
              width: ICON,
              height: ICON,
              borderRadius: 9,
              boxSizing: 'border-box',
              border: '1.5px solid rgba(255,255,255,.5)',
              background: 'rgba(255,255,255,.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 'none',
            }}
          >
            {/* 声波竖条轻微呼吸（原片几乎静止，仅微动） */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2.2, height: '100%' }}>
              {BASE.map((h, i) => (
                <div
                  key={i}
                  style={{
                    width: 1.5,
                    borderRadius: 1.5,
                    background: '#ececee',
                    height: h + 1.6 * Math.sin(t * 18 + i * 1.7),
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        {/* 隐藏测量条：与正文同字体同字距，量一次整句宽度以定胶囊定宽 */}
        <div
          ref={measRef}
          style={{
            position: 'absolute',
            visibility: 'hidden',
            whiteSpace: 'pre',
            font: `400 21px ${UI}`,
            letterSpacing: 0.3,
            top: -999,
          }}
        >
          {TEXT}
        </div>
      </div>
    </DesignStage>
  );
};
