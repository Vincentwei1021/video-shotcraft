---
name: ui-to-brand-morph
一句话: UI 变品牌两式——icon-flip-bloom 图标 Y 轴翻扁成竖线绽放成花形 mark + wordmark 逐字落定，与 input-morph-assemble 输入框收缩成胶囊、三粒图元落下集结成 logo 单瓣
适用: 品牌收尾/outro 前最后一拍；"你每天用的那个 UI 就是这个品牌"的视觉论证
时长: A ~4.3s（130f）/ B ~4.7s（140f）
能量: 中高（收尾点睛，一次完整变形讲完）
---

## 意图
品牌收尾库里已有三条路：brand-ink-open 是开场描画压印、
morph-from-primitive 是图元→UI 容器（方向相反）、
outro-group-photo-launch 是元素围拢合影（聚而不变）。本卡补第四条：
**产品 UI 元素自己变形成品牌符号**——A 式是图标翻一个身变成 logo
（同位实体交换），B 式是全片反复出现的输入框在最后一次发送后集结成
logo 单瓣（多元素落位拼装）。观众看到的不是"logo 出现了"，而是
"刚才用的东西原来就是它"，因果链本身就是品牌论证。

## 两式选型
| 式 | 做法 | 适用 |
|----|------|------|
| A icon-flip-bloom | 图标 anticipation 晃两下→Y 轴 scaleX 压扁成竖线（双层拖影+blur）→最薄处实体交换、spring 绽放成 5 瓣花形 mark→mark 左移让位、wordmark 逐字落定 | 单图标产品；图标与 logo 形态差异大、需要"翻过去变身"的魔术感 |
| B input-morph-assemble | 光标点发送→文字飞走→输入框 x/y/w/h/r 五量 spring 插值成圆角胶囊→三粒图元错峰从画外落下拼成抽象单瓣→整组呼吸 | 输入框/卡片等矩形 UI 是全片主角的片子；logo 可拆解为几何图元组合 |

## 参数表
| 参数 | 典型值 | 调节手感 |
|------|--------|----------|
| A anticipation | 12–34f 倾斜 -12°/+14°/-18°→0°，inOut(sin)，transformOrigin 钉底部 78% | 幅度递增才读作"蓄力"；只晃一下读不出预备动作 |
| A 翻扁 | 12f Easing.in(cubic)，scaleX 1→0.04；两层残影 opacity 0.22/0.14 + blur 6px 滞后 0.12/0.24 | 加速入是"甩"的关键；匀速翻读作 flip 卡片。0.04 是最薄处，实体交换在这帧做 |
| A 绽放 | spring(damping 11, stiffness 130)；5 瓣 ellipse 角度从 -90°（全竖直重叠）张到均匀分布，长 20→38、宽 3→15 同步生长 | 花瓣从闭合竖线张开才接得住"翻过最薄处"；直接 scale 整朵会断因果 |
| A wordmark | mark 18f 左移 -350px 让位（字标起点 mark+200，整组居中）；逐字 2.6f 错峰、每字 12f：scale 1.9→1 + blur 14→0（snappy），原点钉基线 | 对照原片：各字母由大变小落位，大的时候模糊、落位时清晰（scale+blur 联动逐字落定），不是横向扫出；错峰 <2.4f 每字的"由大变小"读不清 |
| B 发送反馈 | 光标 22f 移入按下 scale 0.82 + 按钮闪白 6f；文字 12f Easing.in 加速右上飞出（+700,-380）+ rotate -10° + 淡出 | 飞走必须加速——匀速飞读作平移不读作"发出去了" |
| B morph | 34f 起 spring(damping 13, stiffness 90)，860×120 r26 → 300×108 r54 五量同步；白描边随进度填成实心 | 五量必须同一个 spring 驱动，分开插值会中途散架 |
| B 三粒落下 | 56/70/84f 错峰 14f，各自 spring(damping 12) 从画外 -260px 落到预排位 | 错峰是"集结"的节奏感；齐落读作下雨 |
| B 落定呼吸 | 108f 起整组 scale 1±0.03 正弦（0.18 rad/f），transformOrigin 钉瓣心 | 呼吸给"活的 logo"收尾；没有呼吸落定即死帧 |

## 已知坑
- demo 在灰阶/占位素材上调校通过——参数是调校起点非实战定稿，
  首次实战须以真实素材回验
- A 式实体交换必须发生在 scaleX ≤0.05 的最薄帧——提前换观众看见两个图形叠影，魔术穿帮
- A 式 wordmark 已改为逐字 scale+blur 落定，错峰 2.2→2.6f；换更长的字标时按可感性判例正常速度看片再定间隔
- B 式拼的是抽象单瓣（泪滴+胶囊组合）不是真 Slack logo——实战换成自家 logo 的图元分解，图元数 3–4 粒为宜，多了读作粒子不读作拼装
- 变形中途别叠其他动画（morph-from-primitive 同判例）：morph 本身是全部信息
- 与 outro-group-photo-launch 分工：那是全片元素飞来围住字标合影（聚），本卡是 UI 元素自己变成品牌符号（变）；同片收尾二选一
- 声音：A 翻扁一声"唰"、绽放落定"嗒"；B 发送一声 send、每粒落位一声 pop、呼吸段静

## 参考实现
demos/outro/ui-to-brand-morph/
（IconFlipBloomLogo.tsx / InputMorphsIntoLogo.tsx）
原片出处：A perplexity-promo 88–91.5s / B slack-promo 40–41s

实现状态：两式均有参考实现与 Gallery 动态样片。
