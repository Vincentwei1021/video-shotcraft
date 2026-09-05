import type { CardDef } from "./types";
import { DEMO_MODULES } from "./demo-index";
import { DEMO_CATEGORIES, DEMO_META } from "./demoMeta";

/** 镜头卡动效库：demos/<类别>/<卡>/<Stem>.tsx 全量接入（scripts/gen-index.mjs 生成静态索引）。
 *  接入条件与 assets/scripts/smoke-render-demos.py 同口径：文件同时导出 `<Stem>: React.FC`
 *  与 `*_DURATION` / `*_DUR` 时长常量。demo 是顶部常量驱动、不吃 props，所以 schema 为空——
 *  上轨后可裁剪 / 变速 / 定格 / 图层变换；要逐属性调参，把 CONFIG 常量提成 props + schema
 *  （模式见 references/workbench.md）。
 *  motion-lab 血统的卡（DesignStage + useT）按 Sequence 长度归一化时间：clip 拉长=动画放慢；
 *  其余卡按绝对帧走：clip 超出原时长后尾帧定格。 */
export const DEMO_CARDS: CardDef[] = DEMO_MODULES.map((m) => {
  const meta = DEMO_META[m.stem];
  return {
    id: `demo:${m.stem}`,
    name: meta?.name ?? m.stem,
    category: meta?.category ?? "动效库",
    durationInFrames: Math.max(2, Math.round(m.duration)),
    component: m.component,
    schema: [],
    accent: "#c58a2a",
    preview: meta?.preview ? `cardpreviews/${meta.preview}` : undefined,
    summary: meta?.summary,
  };
});

export { DEMO_CATEGORIES };
