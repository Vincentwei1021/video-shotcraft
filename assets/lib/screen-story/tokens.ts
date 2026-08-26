// ⚠ 本文件的调色板/字体取自 tsenta（示例产品）。按核心理念 2，copy 进新 work 后
// 必须用目标产品的 design tokens 重新蒙皮（保留 E 缓动与结构即可）。
// tokens.ts — 品牌 tokens 移植自 tsenta-promo-v2（实测自 tsenta.com computed styles）
// 视觉语言从产品自身生长：不另造宣传片皮肤。

import { Easing } from 'remotion';

export const C = {
  ink: '#000000',
  ink900: '#171717',
  paper: '#FDFCFC',
  paper2: '#F5F3F1',
  cream: '#F5F0E6',
  warmGray: '#777169',
  border: '#E5E5E5',
  accent: '#FF4704', // 品牌橙——全片唯一热色，只给峰值
  forest: '#15362B',
} as const;

export const F = {
  sans: '"DM Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
} as const;

// 产品在 60px 仍用 w400——全片不得为"更有力"而加粗（v2 DESIGN-SPEC 版式命门）
export const T = {
  h1: { fontSize: 60, lineHeight: '1.05', fontWeight: 400, letterSpacing: '-0.02em' },
  h2: { fontSize: 40, lineHeight: '1.05', fontWeight: 400, letterSpacing: '-0.015em' },
  h3: { fontSize: 28, lineHeight: '1.05', fontWeight: 400, letterSpacing: '-0.02em' },
  label: { fontSize: 12, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' as const },
} as const;

export const E = {
  quint: Easing.bezier(0.22, 1, 0.36, 1), // 主缓动（产品自有 token）
  out: Easing.bezier(0, 0, 0.2, 1),
  inOut: Easing.bezier(0.4, 0, 0.2, 1),
  // 相机专用：对称缓起缓停，杜绝"甩镜头"（用户反馈：运动要柔和）
  soft: Easing.bezier(0.45, 0.05, 0.15, 1),
  // 光标专用：略快起步的平滑曲线（真实鼠标手感，但不甩尾）
  glide: Easing.bezier(0.3, 0.05, 0.2, 1),
} as const;

export const FPS = 30;
