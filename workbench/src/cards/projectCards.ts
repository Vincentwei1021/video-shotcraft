import type React from "react";
import type { CardDef } from "./types";
import type { ManifestUnit, WorkbenchManifest } from "./manifest";
import { WORKBENCH as RAW } from "@proj/workbench";

/** 已链接成片工程的清单（未链接 / 工程没写 workbench.ts 时为 null） */
export const MANIFEST: WorkbenchManifest | null = (RAW ?? null) as WorkbenchManifest | null;

const KIND_LABEL = { shot: "镜头", transition: "转场", caption: "字幕", overlay: "叠加层" } as const;
export type UnitKind = keyof typeof KIND_LABEL;
const KIND_ACCENT: Record<UnitKind, string> = {
  shot: "#4c9aff",
  transition: "#f7c948",
  caption: "#34c759",
  overlay: "#8e8e93",
};

/** 单元 → 卡 id：显式 cardId 优先；否则同一组件引用共用一张卡（首个单元的 id 命名） */
const groupKeyOf = (u: ManifestUnit) => u.cardId ?? u.component;

export const unitsOf = (m: WorkbenchManifest, kind: UnitKind): ManifestUnit[] =>
  kind === "shot" ? m.shots : (m[`${kind}s`] ?? []);

/** 成片单元卡 + 每个单元对应的卡 id（导入器用） */
const build = (m: WorkbenchManifest | null) => {
  const cards: CardDef[] = [];
  const cardIdOfUnit = new Map<ManifestUnit, string>();
  if (!m) return { cards, cardIdOfUnit };
  for (const kind of Object.keys(KIND_LABEL) as UnitKind[]) {
    const groups = new Map<unknown, ManifestUnit[]>();
    for (const u of unitsOf(m, kind)) {
      const k = groupKeyOf(u);
      const g = groups.get(k);
      if (g) g.push(u);
      else groups.set(k, [u]);
    }
    for (const units of groups.values()) {
      const first = units[0];
      const id = `proj:${kind}:${first.cardId ?? first.id}`;
      const name =
        units.find((u) => u.cardName)?.cardName ??
        (units.length > 1 ? `${KIND_LABEL[kind]} · ${componentName(first.component)}` : (first.label ?? first.id));
      cards.push({
        id,
        name,
        category: "成片单元",
        durationInFrames: Math.max(2, first.duration),
        width: m.width,
        height: m.height,
        component: first.component,
        schema: first.schema ?? [],
        durationProp: first.durationProp,
        accent: first.accent ?? KIND_ACCENT[kind],
      });
      for (const u of units) cardIdOfUnit.set(u, id);
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
