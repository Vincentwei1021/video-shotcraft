import React, { useEffect, useRef, useState } from "react";
import { Player } from "@remotion/player";
import type { CardDef } from "../cards/types";
import { cardSize, defaultsOf } from "../cards/types";
import { CARD_LIST } from "../cards/registry";
import { DEMO_CATEGORIES } from "../cards/demoCards";
import { MANIFEST } from "../cards/projectCards";
import { importProject, useStore } from "../store";
import { sfxUsage } from "../projectImport";
import { BGM_LIB, MEDIA_ITEMS, SFX_LIB } from "../mediaManifest";
import { PROJ_DIR, PROJ_HAS_MANIFEST, PROJ_LINKED } from "../projMeta";
import { setDragPayload } from "../dnd";

const TABS = [
  { id: "media", label: "素材" },
  { id: "cards", label: "动效库" },
  { id: "sfx", label: "音效" },
  { id: "bg", label: "背景" },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** 不进动效库的分类：成片单元只在素材 tab；媒体 / 背景各有去处 */
const NON_MOTION_CATS = new Set(["成片单元", "音频", "素材", "背景"]);

/** 进入视口才挂载重内容（预览视频 / 实时 Player） */
const useVisible = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([en]) => setVisible(en.isIntersecting), {
      rootMargin: "100px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, visible };
};

/** 进入视口才加载并循环播放的预览视频 */
const LazyLoopVideo: React.FC<{ src: string }> = ({ src }) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([en]) => setVisible(en.isIntersecting), {
      rootMargin: "100px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (visible) setLoaded(true);
  }, [visible]);
  useEffect(() => {
    const el = ref.current;
    if (!el || !loaded) return;
    if (visible) el.play().catch(() => {});
    else el.pause();
  }, [visible, loaded]);
  return (
    <video
      ref={ref}
      className="lib-thumb"
      src={loaded ? src : undefined}
      muted
      loop
      playsInline
      autoPlay
      preload="none"
    />
  );
};

/** 没有预渲染视频的卡：可见时用实时 Player 循环当缩略图 */
const LazyCardLoop: React.FC<{ card: CardDef }> = ({ card }) => {
  const { ref, visible } = useVisible();
  const { width, height } = cardSize(card);
  return (
    <div ref={ref} className="lib-thumb" style={{ position: "relative" }}>
      {visible && (
        <Player
          component={card.component}
          inputProps={defaultsOf(card)}
          durationInFrames={Math.max(2, card.durationInFrames)}
          compositionWidth={width}
          compositionHeight={height}
          fps={30}
          autoPlay
          loop
          controls={false}
          initiallyMuted
          numberOfSharedAudioTags={0}
          style={{ width: "100%", height: "100%", pointerEvents: "none" }}
          acknowledgeRemotionLicense
        />
      )}
    </div>
  );
};

/** 静态背景卡：组件本身就是纯 CSS 静态底，按画布等比缩放渲染 */
const StaticCardThumb: React.FC<{ card: CardDef }> = ({ card }) => {
  const Comp = card.component;
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const { width, height } = cardSize(card);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return (
    <div ref={ref} className="lib-thumb" style={{ position: "relative", overflow: "hidden" }}>
      {scale > 0 && (
        <div
          style={{
            position: "absolute",
            width,
            height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <Comp {...defaultsOf(card)} />
        </div>
      )}
    </div>
  );
};

const groupBy = <T,>(items: T[], key: (t: T) => string) => {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    const g = m.get(k);
    if (g) g.push(it);
    else m.set(k, [it]);
  }
  return [...m.entries()];
};

export const LibraryPanel: React.FC = () => {
  const setPreview = useStore((s) => s.setPreview);
  const [tab, setTab] = useState<TabId>(PROJ_LINKED ? "media" : "cards");
  // 折叠分组默认收起，点击标题展开
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());
  const toggleCat = (cat: string) =>
    setOpenCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });

  /** 网格单元通用外壳：点击=中屏预览，拖拽=上轨 */
  const Cell: React.FC<{
    name: string;
    meta?: string;
    title?: string;
    onClick: () => void;
    payload: Parameters<typeof setDragPayload>[1];
    children: React.ReactNode;
  }> = ({ name, meta, title, onClick, payload, children }) => (
    <div
      className="lib-cell"
      draggable
      onDragStart={(e) => setDragPayload(e, payload)}
      onClick={onClick}
      title={`${name}${title ? `\n${title}` : ""}\n点击预览，拖到时间轨添加`}
    >
      {children}
      <div className="lib-cell-name">{name}</div>
      {meta && <div className="lib-cell-meta dim">{meta}</div>}
    </div>
  );

  /** 动效卡网格单元 */
  const CardCell: React.FC<{ card: CardDef }> = ({ card }) => (
    <Cell
      name={card.name}
      meta={`${(card.durationInFrames / 30).toFixed(1)}s${card.schema.length > 0 ? " · 可调参" : ""}`}
      title={card.summary}
      onClick={() => setPreview({ kind: "card", cardId: card.id })}
      payload={{ cardId: card.id, label: card.name }}
    >
      {card.preview ? <LazyLoopVideo src={`/${card.preview}`} /> : <LazyCardLoop card={card} />}
    </Cell>
  );

  /** 音效等无画面素材的列表行 */
  const Row: React.FC<{
    dot: string;
    name: string;
    meta?: string;
    onClick: () => void;
    payload: Parameters<typeof setDragPayload>[1];
  }> = ({ dot, name, meta, onClick, payload }) => (
    <div
      className="lib-card"
      draggable
      onDragStart={(e) => setDragPayload(e, payload)}
      onClick={onClick}
      title={`${name} · 点击预览，拖到时间轨添加`}
    >
      <span className="lib-dot" style={{ background: dot }} />
      <span className="lib-name">{name}</span>
      {meta && <span className="lib-dur">{meta}</span>}
    </div>
  );

  /** 可折叠分组标题 */
  const Group: React.FC<{ id: string; label: string; count: number; children: React.ReactNode; defaultOpen?: boolean }> =
    ({ id, label, count, children, defaultOpen }) => {
      const open = defaultOpen ? !openCats.has(id) : openCats.has(id);
      return (
        <div>
          <button className="lib-cat-toggle" onClick={() => toggleCat(id)}>
            <span className={`caret${open ? " open" : ""}`}>▸</span>
            {label}
            <span className="dim" style={{ marginLeft: "auto" }}>{count}</span>
          </button>
          {open && children}
        </div>
      );
    };

  const motionCards = CARD_LIST.filter((c) => !NON_MOTION_CATS.has(c.category));
  const projectCards = CARD_LIST.filter((c) => c.category === "成片单元");
  const bgCards = CARD_LIST.filter((c) => c.category === "背景");
  const usage = sfxUsage(MANIFEST);
  const projectAudio = MEDIA_ITEMS.filter((m) => m.kind === "audio");
  const projectVisual = MEDIA_ITEMS.filter((m) => m.kind !== "audio");

  // 动效库：工作台原生卡靳前，然后按画廊分类
  const motionGroups = ["工作台", ...DEMO_CATEGORIES]
    .map((cat) => ({ cat, cards: motionCards.filter((c) => c.category === cat) }))
    .filter((g) => g.cards.length > 0);

  const audioPayload = (file: string, label: string, volume: number, duration: number) =>
    ({ cardId: "audio-clip", props: { file, volume }, label, duration }) as const;

  return (
    <div className="library">
      <div className="lib-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`lib-tab${tab === t.id ? " on" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="library-list">
        {tab === "media" && (
          <>
            {MANIFEST ? (
              <button
                className="btn wide"
                title={`把成片按 src/workbench.ts 清单拆成镜头 / 转场 / 字幕 / 叠加层 / 音效 / 音乐的多轨工程（可撤销）\n${PROJ_DIR}`}
                onClick={() => importProject()}
              >
                ⇣ 导入成片：{MANIFEST.name}
              </button>
            ) : (
              <div className="lib-cat" style={{ whiteSpace: "normal", lineHeight: 1.5 }}>
                {PROJ_LINKED
                  ? `已链接 ${PROJ_DIR}，但工程没有 src/workbench.ts 清单，无法拆解导入（写法见 references/workbench.md）`
                  : "未接入成片工程。在 workbench/ 目录运行：node scripts/open.mjs <成片工程目录>"}
              </div>
            )}

            {projectCards.length > 0 && (
              <>
                <div className="lib-cat">成片单元（可再加一份）</div>
                <div className="lib-grid">
                  {projectCards.map((card) => (
                    <Cell
                      key={card.id}
                      name={card.name}
                      meta={`${(card.durationInFrames / 30).toFixed(1)}s${card.schema.length ? " · 可调参" : ""}`}
                      onClick={() => setPreview({ kind: "card", cardId: card.id })}
                      payload={{ cardId: card.id, label: card.name }}
                    >
                      <LazyCardLoop card={card} />
                    </Cell>
                  ))}
                </div>
              </>
            )}

            {projectVisual.length > 0 && <div className="lib-cat">素材文件（工程 public/）</div>}
            {groupBy(projectVisual, (m) => m.dir || "/").map(([dir, items]) => (
              <Group key={dir} id={`media:${dir}`} label={dir} count={items.length} defaultOpen={items.length <= 12}>
                <div className="lib-grid">
                  {items.map((m) => (
                    <Cell
                      key={m.file}
                      name={m.name}
                      meta={m.kind === "video" ? "视频" : "图片"}
                      onClick={() => setPreview({ kind: m.kind, file: m.file, label: m.name })}
                      payload={
                        m.kind === "video"
                          ? { cardId: "video-clip", props: { file: m.file }, label: m.name, duration: 150 }
                          : { cardId: "image-clip", props: { file: m.file }, label: m.name, duration: 90 }
                      }
                    >
                      {m.kind === "video" ? (
                        <LazyLoopVideo src={`/${m.file}`} />
                      ) : (
                        <img className="lib-thumb" src={`/${m.file}`} />
                      )}
                    </Cell>
                  ))}
                </div>
              </Group>
            ))}
          </>
        )}

        {tab === "cards" &&
          motionGroups.map((g) => (
            <Group key={g.cat} id={`cat:${g.cat}`} label={g.cat} count={g.cards.length} defaultOpen={g.cat === "工作台"}>
              <div className="lib-grid">
                {g.cards.map((card) => (
                  <CardCell key={card.id} card={card} />
                ))}
              </div>
            </Group>
          ))}

        {tab === "bg" && (
          <>
            <div className="lib-cat">预设幕底（铺在最下面一条轨）</div>
            <div className="lib-grid">
              {bgCards.map((card) => (
                <Cell
                  key={card.id}
                  name={card.name}
                  meta="静态底 · 可调参"
                  onClick={() => setPreview({ kind: "card", cardId: card.id })}
                  payload={{ cardId: card.id, label: card.name }}
                >
                  <StaticCardThumb card={card} />
                </Cell>
              ))}
            </div>
          </>
        )}

        {tab === "sfx" && (
          <>
            {projectAudio.length > 0 && (
              <Group id="sfx:proj" label="本片音频（工程 public/）" count={projectAudio.length} defaultOpen>
                {projectAudio.map((m) => (
                  <Row
                    key={m.file}
                    dot="#ff9f0a"
                    name={m.name}
                    meta={usage.has(m.file) ? `片中×${usage.get(m.file)}` : "未用"}
                    onClick={() => setPreview({ kind: "audio", file: m.file, label: m.name })}
                    payload={audioPayload(m.file, m.name.replace(/\.[^.]+$/, ""), 0.4, 90)}
                  />
                ))}
              </Group>
            )}
            {BGM_LIB.length > 0 && (
              <Group id="sfx:bgm" label="BGM 备选（assets/audio/bgm）" count={BGM_LIB.length}>
                {BGM_LIB.map((b) => (
                  <Row
                    key={b.file}
                    dot="#bf5af2"
                    name={b.name}
                    onClick={() => setPreview({ kind: "audio", file: b.file, label: b.name })}
                    payload={audioPayload(b.file, b.name, 0.35, 900)}
                  />
                ))}
              </Group>
            )}
            {groupBy(SFX_LIB, (s) => s.cat).map(([cat, items]) => (
              <Group key={cat} id={`sfx:${cat}`} label={`音效库 · ${cat}`} count={items.length}>
                {items.map((s) => (
                  <Row
                    key={s.file}
                    dot="#ff9f0a"
                    name={s.name}
                    onClick={() => setPreview({ kind: "audio", file: s.file, label: s.name })}
                    payload={audioPayload(s.file, s.name, 0.4, 90)}
                  />
                ))}
              </Group>
            ))}
          </>
        )}
      </div>

      <div className="lib-foot dim">
        动效 {motionCards.length} 卡（{motionCards.filter((c) => c.schema.length > 0).length} 张可调参）
        · 音效库 {SFX_LIB.length} · 背景 {bgCards.length}
        {PROJ_LINKED && PROJ_HAS_MANIFEST ? ` · 成片单元 ${projectCards.length}` : ""}
        <br />
        点击预览 · 拖拽到时间轨添加
      </div>
    </div>
  );
};
