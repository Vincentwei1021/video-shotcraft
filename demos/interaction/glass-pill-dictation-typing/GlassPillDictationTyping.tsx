// glass-pill-dictation-typing — Glass Pill Dictation 玻璃胶囊听写（motion-lab 定稿转原生 Remotion）
// 近黑底上一条定宽玻璃胶囊：整条以约 1.25 倍略大弹出后缓落到位，胶囊内部自左暗到右亮
// 铺一层强调色光（ACCENT 变量，默认紫）；光标先行出现，随后打字出现占位句
// 「Speak or type here」，光随打字进度渐渐熄灭，收尾成中性深色玻璃条；右端是描边圆角
// 方块里的竖条声波图标——全片最安静的一拍。
// 设计坐标 480×270（DesignStage 等比放大），参数表数值以此坐标系标定。
// 质感升级：带色相的近黑环境（顶光 + 胶囊下方随光一起熄灭的强调色地面反光 + 暗角 + 颗粒）、
// 真玻璃层次（顶沿高光线、上亮下暗的体积渐变、底缘内暗边、两层落地影）、
// 落位时从"靠近观众"的轻微失焦收焦到清晰；时间轴与参数表数值不变。
import React, { useLayoutEffect, useRef, useState } from 'react';
import { DesignStage, E, lerp, seg, useT } from '../../_fixtures/Motion';
import { FONT, Grain, Vignette } from '../../_fixtures/Polish';

export const GLASS_PILL_DICTATION_TYPING_DURATION = 50; // 1650ms @30fps

// 模板强调色：实际使用时按项目品牌色替换这一个变量（内嵌光 + 外泛光 + 地面反光共用）
const ACCENT_RGB = '146,126,212';
const UI = FONT.sans;
const PH = 46; // 胶囊高度
const ICON = 30; // 右端声波图标方块尺寸
const BASE = [13, 7, 10, 6, 9]; // 竖条基准高度（左高右低的听写图标）
const TEXT = 'Speak or type here'; // 占位句，长度贴近原片（19→18 字符），打字节奏不变
const TOP = (270 - PH) / 2; // 胶囊上沿（设计坐标）

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
  const k = seg(t, 0, 0.22, E.outCubic);
  const s = lerp(k, 1.25, 1);
  // 落位收焦：放大段视作"离镜头更近"，带一点景深虚化，随落位收成锐利（设计 px，×4 后最大约 3px）
  const defocus = 0.75 * (1 - seg(t, 0, 0.16, E.outQuad));
  // 打字：caret 先行（~t0.03），字符 t0.06→0.73 匀速铺完，尾段保持
  const n = Math.floor(seg(t, 0.06, 0.73) * TEXT.length + 1e-6);
  const caretO = seg(t, 0.025, 0.045) * (1 - seg(t, 0.75, 0.8));
  // 强调色光随打字进度渐熄；同步收掉描边亮度的一点富余
  const g = 1 - seg(t, 0.08, 0.76, E.inOutQuad);
  const appear = seg(t, 0, 0.025);

  return (
    <DesignStage bg="#060609" raster="zoom">
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {/* 环境：带冷色相的近黑底 + 顶部偏左的柔和主光（替代死平的纯黑） */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 70% 62% at 46% 30%, rgba(120,124,160,0.10) 0%, rgba(120,124,160,0) 70%), linear-gradient(180deg, #0b0b10 0%, #07070a 60%, #050507 100%)',
          }}
        />
        {/* 地面反光：胶囊下方一抹强调色余光，跟内嵌光同一个 g 熄灭——光让位给文字时环境也跟着暗下来 */}
        <div
          style={{
            position: 'absolute',
            left: 240 - PW * 0.55,
            width: PW * 1.1,
            top: TOP + PH * 0.55,
            height: PH * 2.1,
            opacity: appear,
            background: `radial-gradient(ellipse 50% 50% at 62% 30%, rgba(${ACCENT_RGB},${(0.05 + 0.13 * g).toFixed(3)}) 0%, rgba(${ACCENT_RGB},0) 72%)`,
          }}
        />
        {/* 落地影：两层（近地小而实 + 远地大而虚），跟胶囊同缩放，落位时一起收紧 */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: TOP,
            width: PW,
            height: PH,
            borderRadius: PH / 2,
            opacity: appear,
            transform: `translateX(${(480 - PW) / 2}px) translateY(${lerp(k, 6, 3)}px) scale(${s})`,
            boxShadow: '0 2px 4px rgba(0,0,0,0.55), 0 10px 26px -6px rgba(0,0,0,0.8)',
          }}
        />
        {/* 居中走 translateX：PW 为奇数时圆心在 .5 半像素上，left/flex 会被布局
            取整偏 0.5 设计像素；transform 矩阵不吸附，能与原片圆心逐像素对齐 */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: TOP,
            height: PH,
            width: PW,
            borderRadius: PH / 2,
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            padding: '0 8px 0 16px',
            overflow: 'hidden',
            // 玻璃体积：上亮下暗的微渐变（主光在上），底色仍是原片的 #0d0d13
            background: 'linear-gradient(180deg, #16161e 0%, #0e0e14 52%, #0b0b10 100%)',
            opacity: appear,
            transform: `translateX(${(480 - PW) / 2}px) scale(${s})`,
            filter: defocus > 0.02 ? `blur(${defocus.toFixed(3)}px)` : undefined,
            boxShadow: `inset 0 0 0 1px rgba(255,255,255,${0.12 + 0.1 * g}), inset 0 14px 22px rgba(255,255,255,${0.03 + 0.04 * g}), inset 0 -6px 10px rgba(0,0,0,0.35), 0 0 ${26 * g}px rgba(${ACCENT_RGB},${0.28 * g})`,
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
          {/* 光的体积：同一层光在下半部更浓、上沿被玻璃顶光冲淡，读作"光在玻璃里面" */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              opacity: g * 0.55,
              background: `radial-gradient(ellipse 46% 120% at 100% 100%, rgba(${ACCENT_RGB},0.55) 0%, rgba(${ACCENT_RGB},0) 70%)`,
              mixBlendMode: 'screen',
            }}
          />
          {/* 顶沿高光线：一条在两端渐隐的 0.5px 亮线，裁在胶囊圆角里——玻璃的受光上沿 */}
          <div
            style={{
              position: 'absolute',
              left: PH * 0.4,
              right: PH * 0.4,
              top: 0.6,
              height: 0.5,
              pointerEvents: 'none',
              background:
                'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.32) 22%, rgba(255,255,255,0.22) 70%, rgba(255,255,255,0) 100%)',
            }}
          />
          <div
            style={{
              position: 'relative',
              font: `400 21px ${UI}`,
              color: '#f2f2f5',
              whiteSpace: 'pre',
              letterSpacing: 0.3,
              flex: 'none',
              textShadow: '0 0.5px 1px rgba(0,0,0,0.35)',
            }}
          >
            {TEXT.slice(0, n)}
          </div>
          {/* 光标：本色白里掺一点强调色，光熄时回到中性 */}
          <div
            style={{
              position: 'relative',
              width: 2,
              height: 23,
              borderRadius: 1,
              background: `linear-gradient(180deg, rgba(${ACCENT_RGB},${(0.0 + 0.5 * g).toFixed(3)}) 0%, rgba(${ACCENT_RGB},0) 100%), #ececf0`,
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
              border: '1px solid rgba(255,255,255,.34)',
              background: 'linear-gradient(180deg, rgba(255,255,255,.10) 0%, rgba(255,255,255,.03) 100%)',
              boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.28), 0 1px 2px rgba(0,0,0,0.35)',
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
        <Vignette strength={0.55} inner={0.4} color="#000000" />
        <Grain opacity={0.07} blend="soft-light" scale={0.25} />
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
