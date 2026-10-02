---
name: type-assembly-moves
一句话: 文字集结四式——split-text-stagger 逐字裂升、letterform-drift-assembly 漂移合拢、tracking-expand-reveal 字距呼吸、text-on-path 沿线流入
适用: 大标题/标语的入场；与 type-entrance-moves 两式、split-flap-title、document-typewriter-reveal 同属标题入场大品类，全片 ≤2 种
时长: 单式 4–5s（动作段 A ~70f / B ~104f / C ~58f / D ~101f；demo 全长含 hold：A 135f / B 150f / C 130f / D 150f，各自导出 `*_DURATION`）
能量: A 中 / B 中高 / C 低中 / D 中
---

## 意图
标题入场已有"原位变形系"四式（乱码解码/字符坠落/翻牌/打字机——字
在原地换形态）。本卡补"集结系"：字符从别处**汇聚成**标题，运动轨迹
本身有戏。A 琴键式——每字从看不见的裁切线下滑升，理性利落，通用度
最高；B 片头式——字符四散带模糊漂入、逐个锁定加深，Stranger Things
的仪式感，适合品牌名亮相;C 呼吸式——字母从叠压一团吸一口气展开，
最安静的一式，适合抒情段落；D 语义式——字符沿一条上升曲线鱼贯流入
再摆正，曲线可以正好描着图表增长线走，文字与数据同框叙事。

## 四式选型
| 式 | 做法 | 适用 |
|----|------|------|
| A split-text-stagger 裂升 | 每行一个 overflow 遮罩盒，字符 translateY(1.12em→0) 走物理弹簧（~11% 过冲）、旋转晚 3f 收敛，错峰间隔 3.8f→1.8f 收紧；遮罩底边画成可见裁切线、比字早 4f 生长 | 通用默认；利落理性 |
| B drift-assembly 漂移合拢 | 字符 seed 方向 ±300px + blur 8px 漂入错峰归位，锁定帧加深脉冲，合体后整词呼吸 1.04 | 品牌名/片头级亮相 |
| C tracking-expand 字距呼吸 | 字母从 −0.42em 叠压展开到 0.14em，blur 10→0 同曲线 | 安静抒情段；副标题跟进 |
| D text-on-path 沿线流入 | 整串字按真实步进沿弧长刚性推进（末字领跑、切线角旋转，行进中可读），到达后逐字 12f 摆正水平 | 曲线有语义时（增长线/流程线） |

## 参数表
| 参数 | 典型值 | 调节手感 |
|------|--------|----------|
| A 过冲 | ~11%（弹簧 damping 15 / stiffness 150；原案 6% 可测不可感） | 正常速度要看得见回落那一下；升起快段按竖向速度加 y 向模糊 |
| B 锁定脉冲 | 字色深到 #000 + 描边 0→3px→0 / 8f | 白底上加深+描边，不用发光（判例） |
| B 漂移三绑定 | 位移 (1−p)、blur 8(1−p)、opacity 0.35→1 共用一条 p | 三者分曲线走，字会"到了还糊着" |
| C 实现命门 | letter-spacing 恒为终态，逐字符 span 只做 translateX=(1−p)(i−词心)(−0.56em) | 直接动 letter-spacing 逐帧重排必抖 |
| D 摆正 | 到达停 8f 再从左到右 1.5f 错峰、12f lerp 到水平基线（y 拉平 rotate→0），终位按实测字宽排版 | 不摆正就永远是"挂在线上"，读不出标题 |
| D 曲线 | evolve（dashoffset 按弧长比例）随车头字符同步生长；demo 做成图表增长线（强调色描边 + 线下渐变面积 + 车头光点 + 网格刻度） | 曲线先画完字再走，读作两个动画 |
| 收尾 | 全员落定真静止 ≥30f | R1 |

## 已知坑
- demo 在灰阶/占位素材上调校通过——参数是调校起点非实战定稿，
  首次实战须以真实素材回验
- 标题入场大品类现已八式（本卡四式 + type-entrance-moves 两式 +
  split-flap-title + document-typewriter-reveal），**同片 ≤2 种**（P4）铁律不变
- B 式与 D 式都是高注意力入场，别再叠相机动作——字在飞的时候镜头必须稳
- C 式幅度命门：起始叠压至少 −0.4em 级（每缝 80px+ 位移）才可感，
  −0.1em 级"微展开"正常速度读不出（可感性判例）
- D 式别让字符各自起跑：后面的字要追越前面的字，曲线低段必然挤成一团（原版踩过）；
  按弧长刚性推进、字间距取真实步进才读得出整句；字号 >80px 时曲线拐弯处字会互相啃角，
  大字改用更平缓的曲线或减字数

## 参考实现
demos/typography/type-assembly-moves/
（LetterformDriftAssembly.tsx / SplitTextStagger.tsx / TextOnPath.tsx / TrackingExpandReveal.tsx）
