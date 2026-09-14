import React, { useRef } from "react";
import type { PropField } from "../cards/types";
import { cardFps, inOffsetFps, sourceLength } from "../cards/types";
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
        <div className="panel-title">Свойства</div>
        <div className="inspector-empty dim">
          Выберите клип на таймлайне,
          <br />
          чтобы изменить его текст, цвет,
          <br />
          темп анимации, скорость и свойства слоя.
          <br />
          <br />
          Горячие клавиши: пробел — воспроизведение · S — разделить
          <br />
          Delete — удалить · ⌘Z — отменить · ⌘D — дублировать
        </div>
      </div>
    );
  }

  const { track, clip } = hit;
  const card = CARDS[clip.cardId];
  const fps = project.fps;
  // 卡片编排帧率 ≠ 工程帧率（只有逐帧编排的卡需要提示；媒体卡按墙钟走无此问题）
  const srcFps = card ? cardFps(card) : fps;
  const fpsMismatch = !!card && card.timing !== "realtime" && srcFps !== fps;
  // 裁入点按源帧计（见 inOffsetFps），秒数换算不能一律用工程 fps
  const inFps = inOffsetFps(card, fps);
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
            <div className="sec-title">Содержимое и стиль</div>
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
          <div className="sec-title">Время и скорость</div>
          <Row label="Начало">
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
          <Row label="Длительность">
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
          <Row label="Скорость">
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
          <Row label="Точка входа">
            <span className="ctl-row">
              <input
                type="number"
                value={Number((clip.inOffset / inFps).toFixed(2))}
                min={0}
                step={0.1}
                onFocus={begin}
                onChange={(e) =>
                  updateClip(clip.id, {
                    inOffset: Math.max(0, Math.round(Number(e.target.value) * inFps)),
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
                title="Вернуть исходную длительность карточки с учётом текущей скорости"
                onClick={() => {
                  begin();
                  updateClip(clip.id, {
                    duration: Math.max(
                      2,
                      Math.round((sourceLength(card, fps) - clip.inOffset) / clip.speed),
                    ),
                  });
                }}
              >
                ↺ Вернуть исходную длительность
              </button>
            </Row>
          )}
          {fpsMismatch && (
            <div className="dim" style={{ fontSize: 11, lineHeight: 1.5, padding: "4px 0 2px" }}>
              Эта карточка собрана в {srcFps} fps, а проект работает в {fps} fps: длительность и скорость уже пересчитаны для сохранения темпа.
              Если внутри карточки время считается через useVideoConfig().fps (например, spring), темп всё равно будет отличаться в {(fps / srcFps).toFixed(2)} раза.
            </div>
          )}
        </section>

        <section>
          <div className="sec-title">Слой</div>
          <Row label="Непрозрачность">
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
          <Row label="Масштаб">
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
          <Row label="Смещение X">
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
          <Row label="Смещение Y">
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
            Удалить клип
          </button>
        </section>
      </div>
    </div>
  );
};
