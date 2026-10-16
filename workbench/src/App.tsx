import React, { useEffect, useRef, useState } from "react";
import { LibraryPanel } from "./panels/LibraryPanel";
import { Inspector } from "./panels/Inspector";
import { PreviewPanel } from "./preview/PreviewPanel";
import { Timeline } from "./timeline/Timeline";
import { resetProject, useStore } from "./store";
import { seekTo, togglePlay } from "./playerRef";
import type { ProjectData } from "./types";
import { applyLocaleToDocument, LOCALES, useLocale, useT, type Locale } from "./i18n";

const isEditable = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable);

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** 面板尺寸：可拖拽调整，落 localStorage */
const usePanelSize = (key: string, def: number) => {
  const [v, setV] = useState<number>(() => {
    const s = localStorage.getItem(key);
    return s ? Number(s) : def;
  });
  useEffect(() => {
    localStorage.setItem(key, String(v));
  }, [key, v]);
  return [v, setV] as const;
};

/** 拖拽分隔条：pointerdown 后跟踪位移，交给回调换算尺寸 */
const startSplit = (
  e: React.PointerEvent,
  onMove: (dx: number, dy: number) => void,
) => {
  e.preventDefault();
  const sx = e.clientX;
  const sy = e.clientY;
  const mm = (ev: PointerEvent) => onMove(ev.clientX - sx, ev.clientY - sy);
  const up = () => window.removeEventListener("pointermove", mm);
  window.addEventListener("pointermove", mm);
  window.addEventListener("pointerup", up, { once: true });
};

/** 导出成片：提交当前工程给 dev server 的 Remotion 渲染任务，轮询进度 */
const ExportButton: React.FC = () => {
  const t = useT();
  const [job, setJob] = useState<{
    id: string;
    status: "running" | "done" | "error";
    progress: number;
    lastLine?: string;
  } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const poll = (id: string) => {
    timer.current = window.setInterval(async () => {
      const r = await fetch(`/api/export/${id}`);
      if (!r.ok) return;
      const j = await r.json();
      setJob({ id, ...j });
      if (j.status !== "running") window.clearInterval(timer.current);
    }, 1000);
  };

  const start = async () => {
    const project = useStore.getState().project;
    const r = await fetch("/api/export", { method: "POST", body: JSON.stringify({ project }) });
    const j = await r.json();
    if (!r.ok) {
      window.alert(j.error ?? t("export.startFailed"));
      return;
    }
    setJob({ id: j.id, status: "running", progress: 0 });
    poll(j.id);
  };

  useEffect(() => () => window.clearInterval(timer.current), []);

  if (job?.status === "running")
    return (
      <button className="btn primary" disabled>
        {t("export.running", { pct: Math.round(job.progress * 100) })}
      </button>
    );
  if (job?.status === "done")
    return (
      <>
        <button
          className="btn"
          title={t("export.revealTitle")}
          onClick={() => fetch(`/api/export/${job.id}/reveal`, { method: "POST" })}
        >
          {t("export.done")}
        </button>
        <button className="btn primary" onClick={start}>
          {t("export.again")}
        </button>
      </>
    );
  if (job?.status === "error")
    return (
      <button className="btn danger" title={job.lastLine} onClick={start}>
        {t("export.failedRetry")}
      </button>
    );
  return (
    <button
      className="btn primary"
      title={t("export.title")}
      onClick={start}
    >
      {t("export.film")}
    </button>
  );
};

export const App: React.FC = () => {
  const t = useT();
  const locale = useLocale((s) => s.locale);
  const setLocale = useLocale((s) => s.setLocale);
  useEffect(() => applyLocaleToDocument(locale), [locale]);
  const project = useStore((s) => s.project);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const updateName = (name: string) =>
    useStore.setState((s) => ({ project: { ...s.project, name } }));
  const fileRef = useRef<HTMLInputElement>(null);
  const [libW, setLibW] = usePanelSize("wb-lib-w", 224);
  const [inspW, setInspW] = usePanelSize("wb-insp-w", 300);
  const [tlH, setTlH] = usePanelSize("wb-tl-h", 264);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      const s = useStore.getState();
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "Backspace" || e.key === "Delete") {
        if (s.selectedClipId) s.removeClip(s.selectedClipId);
      } else if (e.key.toLowerCase() === "s" && !e.metaKey && !e.ctrlKey) {
        if (s.selectedClipId) s.splitClip(s.selectedClipId, s.playhead);
      } else if (e.key.toLowerCase() === "d" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (s.selectedClipId) s.duplicateClip(s.selectedClipId);
      } else if (e.key.toLowerCase() === "z" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const step = (e.shiftKey ? 10 : 1) * (e.key === "ArrowLeft" ? -1 : 1);
        const f = Math.max(0, s.playhead + step);
        seekTo(f);
        s.setPlayhead(f);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${project.name || "workbench-project"}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importJson = (file: File) => {
    file.text().then((text) => {
      try {
        const p = JSON.parse(text) as ProjectData;
        if (!p || !Array.isArray(p.tracks)) throw new Error("bad format");
        useStore.getState().setProject(p);
      } catch {
        window.alert(t("import.invalid"));
      }
    });
  };

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand-mark" title="ShotCraft home" aria-label="ShotCraft home">
          <span className="brand-glyph">S</span>
          <span className="logo">ShotCraft <b>Studio</b></span>
        </button>
        <span className="topbar-divider" />
        <input
          className="project-name"
          value={project.name}
          onChange={(e) => updateName(e.target.value)}
          spellCheck={false}
        />
        <span className="save-state">● Đã lưu</span>
        <span className="workspace-mode">Chỉnh sửa</span>
        <span style={{ flex: 1 }} />
        <button className="btn" disabled={!canUndo} onClick={undo} title={t("undo.title")}>
          {t("undo")}
        </button>
        <button className="btn" disabled={!canRedo} onClick={redo} title={t("redo.title")}>
          {t("redo")}
        </button>
        <span className="tl-sep" />
        <ExportButton />
        <button className="btn" onClick={exportJson}>{t("exportJson")}</button>
        <button className="btn" onClick={() => fileRef.current?.click()}>{t("import")}</button>
        <button
          className="btn"
          onClick={() => window.confirm(t("reset.confirm")) && resetProject()}
        >
          {t("reset")}
        </button>
        <span className="tl-sep" />
        <select
          className="btn"
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
          title={t("lang.title")}
          aria-label={t("lang.title")}
        >
          {LOCALES.map((l) => (
            <option key={l.id} value={l.id}>{l.label}</option>
          ))}
        </select>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importJson(f);
            e.target.value = "";
          }}
        />
      </header>

      <main className="main">
        <nav className="tool-rail" aria-label="Công cụ chỉnh sửa">
          {[
            ["▦", "Media", true],
            ["♫", "Audio", false],
            ["T", "Text", false],
            ["◇", "Stickers", false],
            ["✦", "Effects", false],
            ["↝", "Transitions", false],
            ["◐", "Filters", false],
          ].map(([icon, label, active]) => (
            <button
              key={label}
              className={`tool-rail-item${active ? " active" : ""}`}
              title={String(label)}
              aria-label={String(label)}
            >
              <span className="tool-rail-icon">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
          <span className="tool-rail-spacer" />
          <button className="tool-rail-item" title="Cài đặt" aria-label="Cài đặt">
            <span className="tool-rail-icon">⚙</span>
            <span>Settings</span>
          </button>
        </nav>
        <div className="panel-wrap" style={{ width: libW }}>
          <LibraryPanel />
        </div>
        <div
          className="splitter v"
          title={t("split.library")}
          onPointerDown={(e) => {
            const start = libW;
            startSplit(e, (dx) => setLibW(clamp(start + dx, 160, 440)));
          }}
        />
        <PreviewPanel />
        <div
          className="splitter v"
          title={t("split.inspector")}
          onPointerDown={(e) => {
            const start = inspW;
            startSplit(e, (dx) => setInspW(clamp(start - dx, 220, 500)));
          }}
        />
        <div className="panel-wrap" style={{ width: inspW }}>
          <Inspector />
        </div>
      </main>

      <div
        className="splitter h"
        title={t("split.timeline")}
        onPointerDown={(e) => {
          const start = tlH;
          startSplit(e, (_dx, dy) => setTlH(clamp(start - dy, 150, 600)));
        }}
      />
      <div className="panel-wrap" style={{ height: tlH }}>
        <Timeline />
      </div>
    </div>
  );
};
