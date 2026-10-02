// 字距呼吸展开（tracking-expand-reveal）——电影片头字幕惯用的 letter-spacing 入场。
//
// 第二轮重设计（aurora · 黄昏地平线 · 安静的品牌章节字卡）：
// - look = aurora（紫夜 · 粉紫地平线光）。主角是 156px / 300 细字重全大写「AFTERGLOW」——细字 + 宽字距
//   是这一式最该有的气质（安静、呼吸、片头字幕），不是粗黑体。
// - 呼吸 = 先吸后呼：0–10f 字母先往词心再挤一点（预备，像吸气），然后 66f 缓起长尾的曲线展开到 0.34em。
//   起始叠压 −0.42em（每缝 ~120px 位移，可感），blur 16→0、字的辉光 强→弱 共用同一条 p。
//   实现命门不变：letter-spacing 恒为终态，逐字 span 只做 translateX = (1−p)(i−词心)·Δ。
// - 字和光同呼吸：地平线光带的宽度、词下一根发丝线的长度都绑同一条 p 一起"呼"出去；
//   hold 段字距再极缓地多呼出 ~1.5%（ease-out 收尾），光带随之呼吸——画面一直活着但不抖。
// - 层级：眉题 mono「CHAPTER III」（字距收拢浮现）→ 主词 → 副句 40px 逐词虚化揭示。
//
// 时间表（30fps，共 150f）：
//   0       第 1 帧：词心一团虚焦发光的叠字 + 暗地平线（不是空帧）
//   0–10    吸气：叠字再收紧 4%
//   8–74    呼气展开（66f，缓起 + 长尾 ease-out）；地平线光带 / 发丝线同步伸展
//   40–60   眉题字距收拢浮现
//   58–84   副句逐词揭示
//   84–150  hold：极缓的余呼吸（字距 +1.5%、光带呼吸），整画面 1.5% 推近
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { EASE, bezier, ramp } from '../../_fixtures/Polish';
import { Dust, LOOKS, Stage, TextReveal, alpha, type } from '../../_fixtures/Look';

export const TRACKING_EXPAND_REVEAL_DURATION = 150;

const L = LOOKS.aurora;
const WORD = 'AFTERGLOW';
const FS = 156;
const FINAL_EM = 0.34; // 终态字距
const START_EM = -0.42; // 起始叠压
const GAP_DELTA = (START_EM - FINAL_EM) * FS; // 每缝起止差（负 = 挤向词心）
const EXHALE = bezier(0.4, 0.06, 0.1, 1); // 呼气：从静止缓起、中段放开、长尾极慢地铺开（不是一下弹开）
const WORD_Y = 470; // 主词顶

export const TrackingExpandReveal: React.FC = () => {
  const frame = useCurrentFrame();
  // 吸气（预备）：0–10f 再收紧一点
  const inhale = ramp(frame, 0, 10, EASE.swift) * (1 - ramp(frame, 10, 12, EASE.out));
  const p = ramp(frame, 8, 66, EXHALE);
  // 余呼吸：hold 段再呼出 1.5%
  const after = ramp(frame, 72, 78, EASE.out);
  const spread = (1 - p) + 0.06 * inhale; // 字距位移系数（1 = 起始叠压，>1 = 吸气时更紧）
  const extra = 0.015 * after; // 额外外展（em 比例）
  const blur = 16 * (1 - p) * (1 - p) + 0.8 * (1 - p);
  const N = WORD.length;
  const center = (N - 1) / 2;
  const push = 1 + 0.015 * ramp(frame, 60, 90, EASE.swift);
  const breathe = 0.5 + 0.5 * Math.sin((frame - 72) / 16);

  // 光带与发丝线与字同呼吸
  const bandW = 30 + 70 * p + 6 * after * (0.6 + 0.4 * breathe);
  const lineW = 1340 * p * (1 + extra);
  const eyebrow = ramp(frame, 40, 22, EASE.out);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.5, y: 0.86 }} fill={{ x: 0.82, y: 0.2 }} intensity={0.7 + 0.3 * p}>
        {/* 地平线光带：宽度随字距呼出 */}
        <div style={{
          position: 'absolute', left: `${50 - bandW / 2}%`, width: `${bandW}%`, top: 770, height: 240,
          background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${alpha(L.accent2, 0.42)} 0%, ${alpha(L.light, 0.22)} 45%, ${alpha(L.light, 0)} 72%)`,
          filter: 'blur(8px)',
        }} />
        <div style={{
          position: 'absolute', left: `${50 - bandW / 2.4}%`, width: `${bandW / 1.2}%`, top: 890, height: 2,
          background: `linear-gradient(90deg, ${alpha(L.accent2, 0)} 0%, ${alpha('#ffd6ea', 0.85)} 50%, ${alpha(L.accent2, 0)} 100%)`,
        }} />
        <Dust look={L} count={28} seed={3} drift={0.12} opacity={0.4} color="#ffd6ea" />
      </Stage>

      <AbsoluteFill style={{ transform: `scale(${push.toFixed(5)})`, transformOrigin: '50% 52%' }}>
        {/* 眉题 */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: WORD_Y - 92, textAlign: 'center',
          ...type(26, 600, { caps: true, mono: true }), letterSpacing: `${(0.7 - 0.28 * eyebrow).toFixed(3)}em`,
          paddingLeft: `${(0.7 - 0.28 * eyebrow).toFixed(3)}em`, color: L.accent, opacity: eyebrow,
        }}>
          Chapter III
        </div>

        {/* 主词：容器 letterSpacing 恒为终态，字符只做 translateX */}
        <div style={{
          position: 'absolute', top: WORD_Y, left: 0, width: 1920, display: 'flex', justifyContent: 'center',
          filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined,
        }}>
          <div style={{
            ...type(FS, 300, { caps: true }), letterSpacing: `${FINAL_EM}em`, marginLeft: `${FINAL_EM}em`,
            color: L.ink, whiteSpace: 'pre', lineHeight: 1,
            textShadow: `0 0 ${(18 + 40 * (1 - p)).toFixed(1)}px ${alpha(L.accent2, 0.22 + 0.4 * (1 - p))}, 0 0 80px ${alpha(L.light, 0.35)}`,
          }}>
            {WORD.split('').map((ch, i) => {
              const tx = spread * (i - center) * GAP_DELTA + extra * (i - center) * FS;
              return (
                <span key={i} style={{ display: 'inline-block', transform: Math.abs(tx) > 0.01 ? `translateX(${tx.toFixed(2)}px)` : undefined }}>
                  {ch}
                </span>
              );
            })}
          </div>
        </div>

        {/* 词下发丝线：与字同呼吸 */}
        <div style={{
          position: 'absolute', left: 960 - lineW / 2, width: lineW, top: WORD_Y + FS + 34, height: 1.5,
          background: `linear-gradient(90deg, ${alpha(L.ink, 0)} 0%, ${alpha(L.ink, 0.5)} 30%, ${alpha(L.ink, 0.5)} 70%, ${alpha(L.ink, 0)} 100%)`,
        }} />

        {/* 副句 */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: WORD_Y + FS + 70, textAlign: 'center', ...type(40, 400), color: L.ink2 }}>
          <TextReveal text="Evening light, for every screen you own." start={58} by="word" variant="blur" each={18} gap={2.6} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
