import React, { useRef } from "react";
import type { PropField } from "../cards/types";
import { CARDS } from "../cards/registry";
import { findClip, useStore } from "../store";

/** 单个属性控件：按 schema 字段类型渲染 */
const PropControl: React.FC<{
  field: PropField;
  value: unknown;
  onChange: (v: unknown) => void;
  onBegin: () => void;
}> = ({ field, value, onChange, onBegin }) => {
  switch (field.type) {
    case "text":
      return (
        <input
          type="text"
          value={String(value ?? "")}
          onFocus={onBegin}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "textarea":
      return (
        <textarea
          rows={3}
          value={String(value ?? "")}
          onFocus={onBegin}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "number":
      return (
        <span className="ctl-row">
          <input
            type="number"
            value={Number(value ?? 0)}
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            onFocus={onBegin}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          {field.unit && <span className="unit">{field.unit}</span>}
        </span>
      );
    case "slider":
      return (
        <span className="ctl-row">
          <input
            type="range"
            value={Number(value ?? field.default)}
            min={field.min}
            max={field.max}
            step={field.step}
            onPointerDown={onBegin}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          <span className="slider-val">
            {Number(value ?? field.default)}
            {field.unit ?? ""}
          </span>
        </span>
      );
    case "color":
      return (
        <span className="ctl-row">
          <input
            type="color"
            value={String(value ?? field.default)}
            onFocus={onBegin}
            onChange={(e) => onChange(e.target.value)}
          />
          <input
            type="text"
            className="color-text"
            value={String(value ?? field.default)}
            onFocus={onBegin}
            onChange={(e) => onChange(e.target.value)}
          />
        </span>
      );
    case "select":
      return (
        <select
          value={String(value ?? field.default)}
          onFocus={onBegin}
          onChange={(e) => onChange(e.target.value)}
        >
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case "boolean":
      return (
        <input
          type="checkbox"
          checked={Boolean(value ?? field.default)}
          onChange={(e) => {
            onBegin();
            onChange(e.target.checked);
          }}
        />
      );
  }
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="prop-row">
    <span className="prop-label">{label}</span>
    <span className="prop-ctl">{children}</span>
  </label>
);

export const Inspector: React.FC = () => {
  const project = useStore((s) => s.project);
  const selectedClipId = useStore((s) => s.selectedClipId);
  const updateClip = useStore((s) => s.updateClip);
  const updateClipProps = useStore((s) => s.updateClipProps);
  const removeClip = useStore((s) => s.removeClip);
  const commit = useStore((s) => s.commit);

  const hit = selectedClipId ? findClip(project, selectedClipId) : null;
  // 连续编辑合并为一步撤销：间隔 >800ms 才压新快照
  const lastBeginRef = useRef(0);

  if (!hit) {
    return (
      <div className="inspector">
        <div className="panel-title">属性</div>
        <div className="inspector-empty dim">
          选中时间轨上的片段后，
          <br />
          在这里调整它的文字、颜色、
          <br />
          动画节奏、变速与图层属性。
          <br />
          <br />
          快捷键：空格 播放 · S 分割
          <br />
          Delete 删除 · ⌘Z 撤销 · ⌘D 复制
        </div>
      </div>
    );
  }

  const { track, clip } = hit;
  const card = CARDS[clip.cardId];
  const fps = project.fps;
  // 每次编辑手势开始压一次撤销快照；短时间内的连续输入合并为一步
  const begin = () => {
    const now = Date.now();
    if (now - lastBeginRef.current > 800) commit();
    lastBeginRef.current = now;
  };

  return (
    <div className="inspector">
      <div className="panel-title">
        {card?.name ?? clip.cardId}
        <span className="dim" style={{ marginLeft: 8, fontWeight: 400 }}>
          {track.name}
        </span>
      </div>

      <div className="inspector-scroll">
        {card && card.schema.length > 0 && (
          <section>
            <div className="sec-title">内容与样式</div>
            {card.schema.map((field) => (
              <Row key={field.key} label={field.label}>
                <PropControl
                  field={field}
                  value={clip.props[field.key] ?? field.default}
                  onChange={(v) => updateClipProps(clip.id, { [field.key]: v })}
                  onBegin={begin}
                />
              </Row>
            ))}
          </section>
        )}

        <section>
          <div className="sec-title">时间与变速</div>
          <Row label="起点">
            <span className="ctl-row">
              <input
                type="number"
                value={Number((clip.start / fps).toFixed(2))}
                min={0}
                step={0.1}
                onFocus={begin}
                onChange={(e) =>
                  updateClip(clip.id, { start: Math.max(0, Math.round(Number(e.target.value) * fps)) })
                }
              />
              <span className="unit">s</span>
            </span>
          </Row>
          <Row label="时长">
            <span className="ctl-row">
              <input
                type="number"
                value={Number((clip.duration / fps).toFixed(2))}
                min={2 / fps}
                step={0.1}
                onFocus={begin}
                onChange={(e) =>
                  updateClip(clip.id, {
                    duration: Math.max(2, Math.round(Number(e.target.value) * fps)),
                  })
                }
              />
              <span className="unit">s</span>
            </span>
          </Row>
          <Row label="变速">
            <span className="ctl-row">
              <input
                type="range"
                min={0.25}
                max={4}
                step={0.05}
                value={clip.speed}
                onPointerDown={begin}
                onChange={(e) => updateClip(clip.id, { speed: Number(e.target.value) })}
              />
              <span className="slider-val">{clip.speed}×</span>
            </span>
          </Row>
          <Row label="">
            <span className="ctl-row preset-row">
              {[0.5, 1, 1.5, 2].map((v) => (
                <button
                  key={v}
                  className={`mini preset${clip.speed === v ? " on" : ""}`}
                  onClick={() => {
                    begin();
                    updateClip(clip.id, { speed: v });
                  }}
                >
                  {v}×
                </button>
              ))}
            </span>
          </Row>
          <Row label="裁入点">
            <span className="ctl-row">
              <input
                type="number"
                value={Number((clip.inOffset / fps).toFixed(2))}
                min={0}
                step={0.1}
                onFocus={begin}
                onChange={(e) =>
                  updateClip(clip.id, {
                    inOffset: Math.max(0, Math.round(Number(e.target.value) * fps)),
                  })
                }
              />
              <span className="unit">s</span>
            </span>
          </Row>
          {card && (
            <Row label="">
              <button
                className="mini"
                title="时长恢复为卡片原始时长（按当前变速换算）"
                onClick={() => {
                  begin();
                  updateClip(clip.id, {
                    duration: Math.max(
                      2,
                      Math.round((card.durationInFrames - clip.inOffset) / clip.speed),
                    ),
                  });
                }}
              >
                ↺ 恢复原始时长
              </button>
            </Row>
          )}
        </section>

        <section>
          <div className="sec-title">图层</div>
          <Row label="不透明度">
            <span className="ctl-row">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={clip.opacity}
                onPointerDown={begin}
                onChange={(e) => updateClip(clip.id, { opacity: Number(e.target.value) })}
              />
              <span className="slider-val">{Math.round(clip.opacity * 100)}%</span>
            </span>
          </Row>
          <Row label="缩放">
            <span className="ctl-row">
              <input
                type="range"
                min={0.2}
                max={3}
                step={0.01}
                value={clip.scale}
                onPointerDown={begin}
                onChange={(e) => updateClip(clip.id, { scale: Number(e.target.value) })}
              />
              <span className="slider-val">{clip.scale.toFixed(2)}</span>
            </span>
          </Row>
          <Row label="位移 X">
            <span className="ctl-row">
              <input
                type="number"
                value={clip.x}
                step={2}
                onFocus={begin}
                onChange={(e) => updateClip(clip.id, { x: Number(e.target.value) })}
              />
              <span className="unit">px</span>
            </span>
          </Row>
          <Row label="位移 Y">
            <span className="ctl-row">
              <input
                type="number"
                value={clip.y}
                step={2}
                onFocus={begin}
                onChange={(e) => updateClip(clip.id, { y: Number(e.target.value) })}
              />
              <span className="unit">px</span>
            </span>
          </Row>
        </section>

        <section>
          <button className="btn danger" onClick={() => removeClip(clip.id)}>
            删除片段
          </button>
        </section>
      </div>
    </div>
  );
};
