import type React from "react";

/** 素材库 → 时间轨 的拖拽负载协议 */
export const DRAG_MIME = "application/x-wb-item";

export type DragPayload = {
  cardId: string;
  props?: Record<string, unknown>;
  label?: string;
  duration?: number;
};

export const setDragPayload = (e: React.DragEvent, payload: DragPayload) => {
  e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
  e.dataTransfer.effectAllowed = "copy";
};

export const readDragPayload = (e: React.DragEvent): DragPayload | null => {
  const raw = e.dataTransfer.getData(DRAG_MIME);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DragPayload;
  } catch {
    return null;
  }
};
