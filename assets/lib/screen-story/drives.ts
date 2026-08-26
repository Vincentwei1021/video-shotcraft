// ⚠ growMatchRings / revealHighlights / enableButtonAfter 里的选择器与颜色匹配
// （svg circle、green-200、按钮文案）是"按产品写"的示例，新产品需按快照实际 DOM 调整。
import { type DriveFn } from './HtmlSnap';

// drives.ts — iframe 内部 DOM 的逐帧驱动器。全部幂等：value/scrollTop 每帧从头赋值。
// 帧号为素材 cut 本地帧（cut 挂载即 0）。

const easeQuint = (t: number) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 5);

/** 打字机：把 input/textarea 的 value 按帧写入 */
export const typeInto =
  (selector: string, text: string, startF: number, framesPerChar = 2): DriveFn =>
  (doc, f) => {
    const el = doc.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | null;
    if (!el) return;
    const n = Math.min(text.length, Math.max(0, Math.floor((f - startF) / framesPerChar)));
    el.value = text.slice(0, n);
  };

/** 多个驱动器合成一个 */
export const compose =
  (...fns: DriveFn[]): DriveFn =>
  (doc, f) => {
    for (const fn of fns) fn(doc, f);
  };

/** 内部滚动容器滚动（找最高的可滚 div） */
export const scrollInner =
  (fromY: number, toY: number, startF: number, durF: number): DriveFn =>
  (doc, f) => {
    let target: Element | null = null;
    let best = 200; // 至少可滚 200px 才算
    for (const el of doc.querySelectorAll('div,main,section')) {
      const room = el.scrollHeight - el.clientHeight;
      if (room > best && el.clientHeight > 400) {
        best = room;
        target = el;
      }
    }
    if (!target) return;
    const t = easeQuint((f - startF) / durF);
    (target as HTMLElement).scrollTop = fromY + (toY - fromY) * t;
  };

/** 隐藏包含指定文本的浮层（清理快照里冻结的 hover 提示等） */
export const hideByText =
  (needle: string, maxLen = 400): DriveFn =>
  (doc) => {
    for (const el of doc.querySelectorAll('div,section,aside,span')) {
      const t = (el.textContent || '').trim();
      if (t.length < maxLen && t.includes(needle)) (el as HTMLElement).style.display = 'none';
    }
  };

const clamp01 = (t: number) => Math.min(Math.max(t, 0), 1);
const easeCubicOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

/** 匹配环"解冻"：SVG 描边从空环生长到快照原值 + 环内百分比数字同步滚动。
 * 原站 JS 动画的确定性复刻——首帧静态扫描并缓存原值（幂等），逐帧写 dashoffset。
 * startF 取超大值（如 1e9）即为"清零待命"态（环空、数字 0%）。 */
export const growMatchRings =
  (startF: number, durF = 40, stagger = 6): DriveFn =>
  (doc, f) => {
    const win = doc.defaultView;
    if (!win) return;
    if (!doc.body.hasAttribute('data-rings-marked')) {
      let i = 0;
      for (const c of doc.querySelectorAll('svg circle')) {
        const s = win.getComputedStyle(c);
        const dash = parseFloat(s.strokeDasharray);
        if (!dash || Number.isNaN(dash)) continue;
        if (c.getBoundingClientRect().width < 8) continue; // 隐藏副本跳过
        const el = c as SVGCircleElement;
        el.dataset.ringI = String(i++);
        el.dataset.ringDash = String(dash);
        el.dataset.ringOff = String(parseFloat(s.strokeDashoffset) || 0);
      }
      let j = 0;
      for (const el of doc.querySelectorAll('span,div')) {
        if (!/^\d+%$/.test((el.textContent || '').trim())) continue;
        if (el.children.length > 0) continue;
        if (el.getBoundingClientRect().width < 4) continue;
        const h = el as HTMLElement;
        h.dataset.pctI = String(j++);
        h.dataset.pctTarget = String(parseInt(el.textContent!, 10));
      }
      doc.body.setAttribute('data-rings-marked', '1');
    }
    for (const c of doc.querySelectorAll('[data-ring-i]')) {
      const el = c as SVGCircleElement;
      const i = Number(el.dataset.ringI);
      const dash = Number(el.dataset.ringDash);
      const off = Number(el.dataset.ringOff);
      const t = easeCubicOut((f - startF - i * stagger) / durF);
      el.style.strokeDashoffset = `${dash + (off - dash) * t}px`;
    }
    for (const s of doc.querySelectorAll('[data-pct-i]')) {
      const el = s as HTMLElement;
      const i = Number(el.dataset.pctI);
      const target = Number(el.dataset.pctTarget);
      const t = easeCubicOut((f - startF - i * stagger) / durF);
      el.textContent = `${Math.round(target * t)}%`;
    }
  };

/** 环清零待命态（S04 落地仪表盘时环为空，S05 特写时生长，跨场景无跳变） */
export const ringsEmpty: DriveFn = growMatchRings(1e9);

/** Tailor 高亮渐次点亮：green-200 高亮 span 按文档序错峰淡入（原站高亮的动画化复刻） */
export const revealHighlights =
  (startF: number, stagger = 9, fadeF = 8): DriveFn =>
  (doc, f) => {
    const win = doc.defaultView;
    if (!win) return;
    if (!doc.body.hasAttribute('data-hl-marked')) {
      let i = 0;
      for (const el of doc.querySelectorAll('span')) {
        const bg = win.getComputedStyle(el).backgroundColor;
        if (!/187,\s*247,\s*208/.test(bg) && !/oklch\(0\.925/.test(bg)) continue;
        // 快照里每处高亮都有一份隐藏 diff 副本（rect 0×0），只标记可见项，
        // 否则错峰序号被隐藏副本占满，可见高亮排到场景结束之后
        if (el.getBoundingClientRect().width < 2) continue;
        (el as HTMLElement).dataset.hlI = String(i++);
      }
      doc.body.setAttribute('data-hl-marked', '1');
    }
    for (const el of doc.querySelectorAll('[data-hl-i]')) {
      const h = el as HTMLElement;
      const i = Number(h.dataset.hlI);
      const t = clamp01((f - startF - i * stagger) / fadeF);
      h.style.setProperty('background-color', `rgba(187, 247, 208, ${t.toFixed(3)})`, 'important');
    }
  };

/** 按钮状态反馈：afterF 帧起从禁用态点亮为启用态（双向幂等，seek 安全）。
 * setProperty + important 压过快照里 Tailwind 的 disabled 样式。 */
export const enableButtonAfter =
  (matchText: string, newText: string, afterF: number, bg = '#15362B', color = '#FFFFFF'): DriveFn =>
  (doc, f) => {
    for (const b of doc.querySelectorAll('button')) {
      const t = b.textContent || '';
      if (!t.includes(matchText) && !t.includes(newText)) continue;
      const el = b as HTMLElement;
      if (f >= afterF) {
        b.textContent = newText;
        el.style.setProperty('background-color', bg, 'important');
        el.style.setProperty('background-image', 'none', 'important');
        el.style.setProperty('color', color, 'important');
        el.style.setProperty('opacity', '1', 'important');
        el.style.setProperty('cursor', 'pointer', 'important');
      } else {
        // 回滚到禁用观感（倒放/scrub 时也正确）
        el.style.removeProperty('background-color');
        el.style.removeProperty('background-image');
        el.style.removeProperty('color');
        el.style.removeProperty('opacity');
        el.style.removeProperty('cursor');
      }
    }
  };
