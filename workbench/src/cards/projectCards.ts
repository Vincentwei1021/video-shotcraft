import type React from "react";
import type { CardDef } from "./types";
import type { ManifestUnit, WorkbenchManifest } from "./manifest";
import { UNIT_KINDS, groupUnits, unitsOf } from "./manifest";
import { WORKBENCH as RAW } from "@proj/workbench";
export { unitsOf } from "./manifest";
export type { UnitKind } from "./manifest";

/** 已链接成片工程的清单（未链接 / 工程没写 workbench.ts 时为 null） */
export const MANIFEST: WorkbenchManifest | null = (RAW ?? null) as WorkbenchManifest | null;

const KIND_LABEL = { shot: "镜头", transition: "转场", caption: "字幕", overlay: "叠加层" } as const;
const KIND_ACCENT: Record<keyof typeof KIND_LABEL, string> = {
  shot: "#4c9aff",
  transition: "#f7c948",
  caption: "#34c759",
  overlay: "#8e8e93",
};

/** 成片单元卡 + 每个单元对应的卡 id（导入器用）。分组来自 manifest.groupUnits——
 *  与内容哈希同一份拓扑，保证「存档没过期」等价于「存档里的 cardId 仍指向同一组单元」 */
const build = (m: WorkbenchManifest | null) => {
  const cards: CardDef[] = [];
  const cardIdOfUnit = m ? groupUnits(m) : new Map<ManifestUnit, string>();
  if (!m) return { cards, cardIdOfUnit };
  for (const kind of UNIT_KINDS) {
    const byCard = new Map<string, ManifestUnit[]>();
    for (const u of unitsOf(m, kind)) {
      const id = cardIdOfUnit.get(u)!;
      const g = byCard.get(id);
      if (g) g.push(u);
      else byCard.set(id, [u]);
    }
    for (const [id, units] of byCard) {
      const first = units[0];
      const name =
        units.find((u) => u.cardName)?.cardName ??
        (units.length > 1 ? `${KIND_LABEL[kind]} · ${componentName(first.component)}` : (first.label ?? first.id));
      cards.push({
        id,
        name,
        category: "成片单元",
        durationInFrames: Math.max(2, first.duration),
        // 成片单元按成片自己的帧率编排（不是卡片库的 30fps）
        sourceFps: m.fps,
        width: m.width,
        height: m.height,
        component: first.component,
        schema: first.schema ?? [],
        durationProp: first.durationProp,
        accent: first.accent ?? KIND_ACCENT[kind],
      });
    }
  }
  return { cards, cardIdOfUnit };
};

const componentName = (c: React.ComponentType<Record<string, unknown>>) =>
  (c as { displayName?: string }).displayName ?? c.name ?? "组件";

const built = build(MANIFEST);
export const PROJECT_CARDS: CardDef[] = built.cards;
export const cardIdOfUnit = (u: ManifestUnit) => built.cardIdOfUnit.get(u)!;

/** 原成片整条合成（清单可选提供），Studio 注册为 ProjOriginal 供逐帧对照 */
export const ORIGINAL = MANIFEST?.original ?? null;
