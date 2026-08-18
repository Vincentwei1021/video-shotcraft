---
name: outro-group-photo-launch
一句话: 全片元素从四面八方飞来围住字标合影，crane 落机位+舞台光+金尘做成发布会收场
适用: outro/品牌收尾；多功能产品的"全家福"式终镜
时长: 约 4.8s（145f）
能量: 峰值（全片最高点）
---

## 意图
把看过的每个功能各抽一个代表元素叫回来合影，字标压轴登场——观众离场前最后记住的是"这些东西属于同一个产品"。规格必须是发布会级：能量推到全片最高。

## 动效核心
- 9 个页面元素（nav/卡片/内容条/搜索框/统计条/文档头）从四方带旋转飞入，落地强调色（模板片为琥珀）glow
- 字标 letterpress 逐字登场，全员"退后排"让主角；rule 长出、延长线射出
- crane 运镜：合影层整体 rotateX 4°→0 + scale 落下，之后缓推
- 发布会氛围三件套：开场光带扫过、字标背后舞台光、金尘上飘
- 背景页面 blur 化作景深

## 参数表
| 参数 | 典型值 | 调节手感 |
|------|--------|----------|
| 元素飞入 | 9 元素 cue 从 4 起每 3f 一个，各飞 12f；起点偏移 ±360–500px；渲染顺序=cue 顺序，后到者叠上 | 每个已展示过的功能都要有代表元素（Q8 自检项），缺谁观众都会察觉 |
| 飞入缓动 | bezier(0.34,1.4,0.44,1) | 代码注释点名教训：旧 bezier(0.25,0.9,0.3,1) "never crossed 1" 没有真过冲——落地要弹 y1 必须 >1 |
| 飞行姿态 | 飞行中 rot×2→settled rot（±5° 内）、scale ×1.12→1；ghost 残影滞后 8% blur 8px；落地强调色 glow 6f（0.35→0）multiply | 落定角度收进 ±5° 内——合影要整齐但不刻板 |
| 退后排 | 字标登场时 42–50f 全员 opacity −12%、saturate −8% | 主角登场配角必须让位，不让位字标压不住 9 个元素 |
| crane 运镜 | `perspective(1400px) rotateX(4°→0) scale(1.06→1)` 前 40f 落下，之后缓推 +0.035 | crane 幅度就这么小（4°）已经够"落机位"读感，大了会晕（推测） |
| 氛围三件套 | 光带 2–14f（600px 宽 overlay 峰值 opacity 0.12）；舞台光 42→50→58f 0→0.5→0.25；金尘 20 颗 2–3px、opacity 0.15–0.35、全参数 index 派生确定性 | 粒子/光效参数必须确定性派生（硬规则：渲染必须可复现）；金尘超过 30 颗开始像雪（推测） |
| 字标 | 字母 delay=42+i·1.8、8f；rule 58→70f 长出、两端 190px 延长线 8f 射出 6f 淡去；字距 62–66f 呼吸；背景页 24f 内 blur 0→14；落定后 sign-off hold 30f | 字标落定 hold 满 1 秒（R1 定案）；outro 不加解说 caption 保持干净（C1 例外项） |

## 声音
固定三拍句式：riser-cine 铺进组装（模板片钉在 f945）→ impact-deep-whoosh 钉字标 stamp（f980，vol 0.55 全片峰值）→ sparkle 点 rule（f1005）。这是模板片定稿后唯一从未改动的段落句式（S2；详见 sound-design 4.3）。

## 已知坑
- 初版收尾几乎总是偏保守（Q8：安静签名式→合影→发布会三级加码）——起稿就按"像一个产品发布"的规格给足 crane/舞台光/粒子
- 结构先于特效：先有"四方飞入合影"结构再加码氛围；直接堆特效没有骨架
- outro tagline 与字标下方文案查重（P4 dedupe 判例），同一句话全片只出现一次

## 参考实现
demos/outro/outro-group-photo-launch/OutroGroupPhotoLaunch.tsx（原 template/src/aifl/live/SceneOutroLive.tsx；30f sign-off hold 时长见 template/src/aifl/Main.tsx 时间线）
