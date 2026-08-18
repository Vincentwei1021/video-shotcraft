---
name: paper-title-card
一句话: 一句话逐词压印上纸、一个词标强调色斜体、短划线收束
适用: 章节转场/价值主张字卡；重要功能出场前的引导卡；全片呼吸位
时长: 1.7–1.8s（50–55f）
能量: 低（呼吸位，隔开两段高能镜头）
标签: transition、rhythm
---

## 意图
在两段产品画面之间给观众一句话的喘息：说清"接下来看什么、它值什么"。letterpress 压印质感让字卡与纸墨风格的产品画面同属一个世界。

## 动效核心
- 单句文案逐词入场：scale 从大压到 1 + blur→0 + opacity（letterpress 压印配方）
- 每句恰好一个重点词：italic + 强调色（模板片为琥珀）
- 强调色短下划线 scaleX 0→1 收束
- 尾部整卡淡出交棒；可挂 mono 小字副行 + DigitRoll 数字

## 参数表
| 参数 | 典型值 | 调节手感 |
|------|--------|----------|
| 逐词入场 | 第 i 词 delay = 4 + i·4、9f，bezier(0.2,0.75,0.3,1)；scale 1.28→1 + blur 7px→0 + opacity | scale 起点 1.28 是"压印"读感的甜点——对照暗场版 TitleCard 用 40px 上移+blur 10，同配方明暗两版 |
| 重点词 | italic + 强调色 oklch(52% 0.115 65)，一句恰好一个 accent | 两个 accent 等于没有 accent；重点词选功能名/收益词（C2） |
| 下划线 | 16→34f scaleX 0→1，220×6px 强调色 | 下划线是收束信号，出现即预告本卡快结束 |
| 时长 | 全片 4 张字卡均 50–55f（≈1.8s） | 字卡时长定式化——观众读一句话的时间，长了拖节奏短了读不完 |
| 版式 | 字号 116/serif；纸底 oklch(97.5% 0.008 82) + 中心暖光 radial；尾部 8f 淡出 | 纸底+暖光与产品画面同色系，字卡才不像广告插播 |
| 副行 | mono 小字 + DigitRoll（如 "5 of 31 fetched today"）；digit-roll 参数见 list-stack-press 卡计数器行 | 副行给具体数字最有说服力；数字滚动必须在本卡淡出前落定（教训）——排节拍从本卡淡出帧倒推 |

## 声音
字卡出场统一钉 swoosh-quick（模板片四张字卡钉在 f220/565/725/885 同音）——同类元素同音是词汇表纪律（S2）；字卡本身无落地重音，能量留给前后镜头。

## 已知坑
- 文案要具体：带产品功能名+具体收益，抽象隐喻词被用户逐字改掉（C2——"one board"→"one place to go"、加 "Paper Radar"）；文案在画面锁定后按最终镜头重写一遍（C1）
- 重要功能出场前要有引导字卡（C2 判例：文档镜头前应加一句引导，如 "Every project, linked to your weekly report"）——字卡不是装饰，是章节路标

## 参考实现
demos/typography/paper-title-card/PaperTitleCard.tsx（原 template/src/aifl/PaperTitleCard.tsx，参数化：words/sub/subDigits 可换文案）
