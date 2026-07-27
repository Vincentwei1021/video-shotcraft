# audio/ 授权记录

规矩：**下载音频素材时当场记录曲名/URL**，事后无法反查。

目录结构：`bgm/` 5 首 BGM 备选；`sfx/<类别>/` 189 个音效分 17 类（transition impact riser camera ui text paper film light data scifi mech glass fluid crowd counter fire）。类别含义与找音路径见 `references/sound-design.md` 3.0。

下表「路径」列为 `assets/audio/` 下的相对路径。

## 基础 SFX（首批沿用）

批量下载时 metadata 被抹掉，原本无逐文件 URL。**2026-07-27 用 md5 比对补回了 7 个**——
这批文件与已登记 URL 的扩充批次字节完全相同（同一个 Mixkit 素材下了两次、存成两个名字），
据此反查出原始条目，下表「原名 / URL」列即比对结果。剩余 6 个仍无法反查，商用前须逐个确认。

| 文件 | 路径 | 来源 | 原名 / URL |
|---|---|---|---|
| `click-camera.mp3` | `sfx/camera/` | Mixkit SFX Free License | Camera shutter click · https://assets.mixkit.co/active_storage/sfx/1133/1133-preview.mp3 |
| `impact-cine.mp3` | `sfx/impact/` | Mixkit SFX Free License | Cinematic whoosh deep impact · https://assets.mixkit.co/active_storage/sfx/1143/1143-preview.mp3 |
| `impact-transition.mp3` | `sfx/impact/` | Mixkit SFX Free License | Movie trailer epic impact · https://assets.mixkit.co/active_storage/sfx/2908/2908-preview.mp3 |
| `keyboard.mp3` | `sfx/text/` | Mixkit License | **无法反查**，商用前须确认 |
| `pop.mp3` | `sfx/ui/` | 来源待考，商用前须确认 | 无法反查 |
| `riser-cine.mp3` | `sfx/riser/` | Mixkit License | **无法反查**，商用前须确认 |
| `sparkle.mp3` | `sfx/light/` | Mixkit License | **无法反查**，商用前须确认 |
| `swoosh-quick.mp3` | `sfx/transition/` | Mixkit SFX Free License | Fast small sweep transition · https://assets.mixkit.co/active_storage/sfx/166/166-preview.mp3 |
| `transition-snap.mp3` | `sfx/transition/` | Mixkit SFX Free License | Fast transitions swoosh · https://assets.mixkit.co/active_storage/sfx/3115/3115-preview.mp3 |
| `transition-soft.mp3` | `sfx/transition/` | Mixkit SFX Free License | Air zoom vacuum · https://assets.mixkit.co/active_storage/sfx/2608/2608-preview.mp3 |
| `typewriter.mp3` | `sfx/text/` | 来源待考，商用前须确认 | 无法反查 |
| `whoosh-big.mp3` | `sfx/transition/` | Mixkit License | **无法反查**，商用前须确认 |
| `whoosh-fast.mp3` | `sfx/transition/` | Mixkit SFX Free License | Fast whoosh transition · https://assets.mixkit.co/active_storage/sfx/1490/1490-preview.mp3 |

## 扩充 SFX 第一批（2026-07-19 下载，当场记录 URL）

全部 Mixkit Sound Effects Free License（免署名可商用）。

| 文件 | 路径 | 原名 | URL |
|---|---|---|---|
| `air-zoom-vacuum.mp3` | `sfx/transition/` | Air zoom vacuum | https://assets.mixkit.co/active_storage/sfx/2608/2608-preview.mp3 |
| `bass-hit-futuristic.mp3` | `sfx/impact/` | Futuristic bass hit | https://assets.mixkit.co/active_storage/sfx/2303/2303-preview.mp3 |
| `bass-hit-short.mp3` | `sfx/impact/` | Short bass hit | https://assets.mixkit.co/active_storage/sfx/2299/2299-preview.mp3 |
| `camera-shutter-hard.mp3` | `sfx/camera/` | Camera shutter hard click | https://assets.mixkit.co/active_storage/sfx/1430/1430-preview.mp3 |
| `glitch-electric-small.mp3` | `sfx/data/` | Small electric glitch | https://assets.mixkit.co/active_storage/sfx/2595/2595-preview.mp3 |
| `glitch-static.mp3` | `sfx/data/` | Glitch static | https://assets.mixkit.co/active_storage/sfx/1457/1457-preview.mp3 |
| `heartbeat-single.mp3` | `sfx/crowd/` | Human single heart beat | https://assets.mixkit.co/active_storage/sfx/490/490-preview.mp3 |
| `impact-deep-whoosh.mp3` | `sfx/impact/` | Cinematic whoosh deep impact | https://assets.mixkit.co/active_storage/sfx/1143/1143-preview.mp3 |
| `impact-epic-trailer.mp3` | `sfx/impact/` | Movie trailer epic impact | https://assets.mixkit.co/active_storage/sfx/2908/2908-preview.mp3 |
| `impact-zoom-quick.mp3` | `sfx/impact/` | Quick zoom impact | https://assets.mixkit.co/active_storage/sfx/772/772-preview.mp3 |
| `shimmer-sparkle-sweep.mp3` | `sfx/light/` | Sweeping sparkle presentation intro | https://assets.mixkit.co/active_storage/sfx/2633/2633-preview.mp3 |
| `sweep-fast-small.mp3` | `sfx/transition/` | Fast small sweep transition | https://assets.mixkit.co/active_storage/sfx/166/166-preview.mp3 |
| `sweep-metal-quick.mp3` | `sfx/transition/` | Quick metal transition sweep | https://assets.mixkit.co/active_storage/sfx/2639/2639-preview.mp3 |
| `sweep-scifi-fast.mp3` | `sfx/transition/` | Fast sci fi transition sweep | https://assets.mixkit.co/active_storage/sfx/3114/3114-preview.mp3 |

## 扩充 SFX 第二批（2026-07-27 下载，当场记录 URL）

162 个，按场景补齐镜头卡缺口（原下 165，md5 比对发现 3 个与库里已有文件字节相同，已删）（纸张/打字机/书写/胶片/计数器/人群/流体等）。全部 Mixkit Sound Effects Free License（免署名可商用）。逐条时长/峰值/建议钉点见 `AUDITION-2026-07-27.md`。

| 文件 | 路径 | 原名 | URL |
|---|---|---|---|
| `camera-autofocus.mp3` | `sfx/camera/` | Camera lens autofocus | https://assets.mixkit.co/active_storage/sfx/1437/1437-preview.mp3 |
| `camera-lens-close.mp3` | `sfx/camera/` | Camera closing lens | https://assets.mixkit.co/active_storage/sfx/1439/1439-preview.mp3 |
| `camera-lens-shutter.mp3` | `sfx/camera/` | Camera lens shutter | https://assets.mixkit.co/active_storage/sfx/1433/1433-preview.mp3 |
| `camera-shutter-vintage.mp3` | `sfx/camera/` | Vintage camera shutter | https://assets.mixkit.co/active_storage/sfx/1438/1438-preview.mp3 |
| `ui-zoom-in.mp3` | `sfx/camera/` | User interface zoom in | https://assets.mixkit.co/active_storage/sfx/2618/2618-preview.mp3 |
| `ui-zoom-out.mp3` | `sfx/camera/` | UI zoom out | https://assets.mixkit.co/active_storage/sfx/2619/2619-preview.mp3 |
| `zoom-air-fast.mp3` | `sfx/camera/` | Fast air zoom | https://assets.mixkit.co/active_storage/sfx/2625/2625-preview.mp3 |
| `zoom-futuristic.mp3` | `sfx/camera/` | Futuristic zoom move | https://assets.mixkit.co/active_storage/sfx/2626/2626-preview.mp3 |
| `zoom-swipe-fast.mp3` | `sfx/camera/` | Fast swipe zoom | https://assets.mixkit.co/active_storage/sfx/2627/2627-preview.mp3 |
| `clock-knob-spin.mp3` | `sfx/counter/` | Clock knob spin | https://assets.mixkit.co/active_storage/sfx/1062/1062-preview.mp3 |
| `clock-mech-retract.mp3` | `sfx/counter/` | Retract clock mechanism | https://assets.mixkit.co/active_storage/sfx/1049/1049-preview.mp3 |
| `clock-tick-single.mp3` | `sfx/counter/` | Clock ticker single | https://assets.mixkit.co/active_storage/sfx/1061/1061-preview.mp3 |
| `countdown-bleeps.mp3` | `sfx/counter/` | Clock countdown bleeps | https://assets.mixkit.co/active_storage/sfx/916/916-preview.mp3 |
| `countdown-racing.mp3` | `sfx/counter/` | Racing countdown timer | https://assets.mixkit.co/active_storage/sfx/1051/1051-preview.mp3 |
| `counter-tick.mp3` | `sfx/counter/` | Ticking counter | https://assets.mixkit.co/active_storage/sfx/1053/1053-preview.mp3 |
| `counter-tick-electric.mp3` | `sfx/counter/` | Electric ticking counter | https://assets.mixkit.co/active_storage/sfx/1054/1054-preview.mp3 |
| `applause-conference.mp3` | `sfx/crowd/` | Conference audience clapping strongly | https://assets.mixkit.co/active_storage/sfx/476/476-preview.mp3 |
| `applause-light-group.mp3` | `sfx/crowd/` | Small group light applause | https://assets.mixkit.co/active_storage/sfx/517/517-preview.mp3 |
| `applause-ovation.mp3` | `sfx/crowd/` | Small crowd ovation | https://assets.mixkit.co/active_storage/sfx/437/437-preview.mp3 |
| `applause-rhythmic-loop.mp3` | `sfx/crowd/` | Rhythmic audience clapping loop | https://assets.mixkit.co/active_storage/sfx/522/522-preview.mp3 |
| `applause-small-crowd.mp3` | `sfx/crowd/` | Small crowd clapping | https://assets.mixkit.co/active_storage/sfx/3035/3035-preview.mp3 |
| `breath-single.mp3` | `sfx/crowd/` | Single artificial breathe | https://assets.mixkit.co/active_storage/sfx/2239/2239-preview.mp3 |
| `clap-single.mp3` | `sfx/crowd/` | One clap | https://assets.mixkit.co/active_storage/sfx/481/481-preview.mp3 |
| `break-glitch-digital.mp3` | `sfx/data/` | Digital glitch break | https://assets.mixkit.co/active_storage/sfx/2951/2951-preview.mp3 |
| `data-compute.mp3` | `sfx/data/` | Technology computer calculations | https://assets.mixkit.co/active_storage/sfx/3122/3122-preview.mp3 |
| `data-load-os.mp3` | `sfx/data/` | Sci fi loading operative system | https://assets.mixkit.co/active_storage/sfx/2529/2529-preview.mp3 |
| `data-scan.mp3` | `sfx/data/` | Data scaner | https://assets.mixkit.co/active_storage/sfx/2847/2847-preview.mp3 |
| `glitch-static-electric.mp3` | `sfx/data/` | Static electric glitch | https://assets.mixkit.co/active_storage/sfx/2597/2597-preview.mp3 |
| `glitch-virtual-quick.mp3` | `sfx/data/` | Virtual quick glitch | https://assets.mixkit.co/active_storage/sfx/2946/2946-preview.mp3 |
| `power-up-electronic.mp3` | `sfx/data/` | Electronics power up | https://assets.mixkit.co/active_storage/sfx/2602/2602-preview.mp3 |
| `power-up-static.mp3` | `sfx/data/` | Electricity static power up | https://assets.mixkit.co/active_storage/sfx/2600/2600-preview.mp3 |
| `static-electric-present.mp3` | `sfx/data/` | Static electricity presentation | https://assets.mixkit.co/active_storage/sfx/2592/2592-preview.mp3 |
| `sweep-digital.mp3` | `sfx/data/` | Digital sweep effect | https://assets.mixkit.co/active_storage/sfx/2631/2631-preview.mp3 |
| `whoosh-electric.mp3` | `sfx/data/` | Electric whoosh | https://assets.mixkit.co/active_storage/sfx/2596/2596-preview.mp3 |
| `cassette-stretch.mp3` | `sfx/film/` | Cassette tape stretch | https://assets.mixkit.co/active_storage/sfx/3097/3097-preview.mp3 |
| `cassette-working.mp3` | `sfx/film/` | Cassette player working | https://assets.mixkit.co/active_storage/sfx/2557/2557-preview.mp3 |
| `projector-fast.mp3` | `sfx/film/` | Fast movie projector | https://assets.mixkit.co/active_storage/sfx/1442/1442-preview.mp3 |
| `projector-film-vintage.mp3` | `sfx/film/` | Vintage film projector working | https://assets.mixkit.co/active_storage/sfx/1441/1441-preview.mp3 |
| `projector-spin-antique.mp3` | `sfx/film/` | Antique movie projector spinning | https://assets.mixkit.co/active_storage/sfx/1444/1444-preview.mp3 |
| `reel-rewind.mp3` | `sfx/film/` | Reel to reel rewind | https://assets.mixkit.co/active_storage/sfx/1095/1095-preview.mp3 |
| `tape-rewind-cine.mp3` | `sfx/film/` | Tape rewind cinematic transition | https://assets.mixkit.co/active_storage/sfx/1088/1088-preview.mp3 |
| `tape-rewind-fast.mp3` | `sfx/film/` | Fast tape rewind cinematic transition | https://assets.mixkit.co/active_storage/sfx/1092/1092-preview.mp3 |
| `vinyl-needle-drop.mp3` | `sfx/film/` | Record player needle drop on vinyl | https://assets.mixkit.co/active_storage/sfx/701/701-preview.mp3 |
| `vinyl-scratch-small.mp3` | `sfx/film/` | Vinyl record small scratch | https://assets.mixkit.co/active_storage/sfx/710/710-preview.mp3 |
| `fire-woosh-soft.mp3` | `sfx/fire/` | Soft woosh fire | https://assets.mixkit.co/active_storage/sfx/1346/1346-preview.mp3 |
| `firework-bang.mp3` | `sfx/fire/` | Fireworks bang in sky | https://assets.mixkit.co/active_storage/sfx/2989/2989-preview.mp3 |
| `firework-clear.mp3` | `sfx/fire/` | Clear firework explosions | https://assets.mixkit.co/active_storage/sfx/2994/2994-preview.mp3 |
| `match-light.mp3` | `sfx/fire/` | Fire match lighting | https://assets.mixkit.co/active_storage/sfx/2590/2590-preview.mp3 |
| `liquid-bubble.mp3` | `sfx/fluid/` | Liquid bubble | https://assets.mixkit.co/active_storage/sfx/3000/3000-preview.mp3 |
| `sand-swish.mp3` | `sfx/fluid/` | Sand swish | https://assets.mixkit.co/active_storage/sfx/1494/1494-preview.mp3 |
| `water-bubble.mp3` | `sfx/fluid/` | Water bubble | https://assets.mixkit.co/active_storage/sfx/1317/1317-preview.mp3 |
| `water-drop-cave.mp3` | `sfx/fluid/` | Water drop splashes in cave | https://assets.mixkit.co/active_storage/sfx/3179/3179-preview.mp3 |
| `water-pour-glass.mp3` | `sfx/fluid/` | Pouring water to glass | https://assets.mixkit.co/active_storage/sfx/1324/1324-preview.mp3 |
| `water-pour-stream.mp3` | `sfx/fluid/` | Water pour light stream | https://assets.mixkit.co/active_storage/sfx/1318/1318-preview.mp3 |
| `water-splash.mp3` | `sfx/fluid/` | Water splash | https://assets.mixkit.co/active_storage/sfx/1311/1311-preview.mp3 |
| `break-apart.mp3` | `sfx/glass/` | Breaking apart | https://assets.mixkit.co/active_storage/sfx/3208/3208-preview.mp3 |
| `break-tech-impact.mp3` | `sfx/glass/` | Break tech impact | https://assets.mixkit.co/active_storage/sfx/2952/2952-preview.mp3 |
| `glass-break-hammer.mp3` | `sfx/glass/` | Glass break with hammer thud | https://assets.mixkit.co/active_storage/sfx/759/759-preview.mp3 |
| `glass-debris-sweep.mp3` | `sfx/glass/` | Sweeping glass debris | https://assets.mixkit.co/active_storage/sfx/172/172-preview.mp3 |
| `glass-hit-cine.mp3` | `sfx/glass/` | Cinematic glass hit suspense | https://assets.mixkit.co/active_storage/sfx/677/677-preview.mp3 |
| `glass-plate-slide.mp3` | `sfx/glass/` | Glass plate slide | https://assets.mixkit.co/active_storage/sfx/1527/1527-preview.mp3 |
| `gravel-fall-hit.mp3` | `sfx/impact/` | Falling hit on gravel | https://assets.mixkit.co/active_storage/sfx/756/756-preview.mp3 |
| `hit-blow.mp3` | `sfx/impact/` | Impact of a blow | https://assets.mixkit.co/active_storage/sfx/2150/2150-preview.mp3 |
| `hit-fast-exciting.mp3` | `sfx/impact/` | Exciting fast hit | https://assets.mixkit.co/active_storage/sfx/2180/2180-preview.mp3 |
| `hit-weak.mp3` | `sfx/impact/` | Weak hit impact | https://assets.mixkit.co/active_storage/sfx/2148/2148-preview.mp3 |
| `impact-cine-big.mp3` | `sfx/impact/` | Big cinematic impact | https://assets.mixkit.co/active_storage/sfx/788/788-preview.mp3 |
| `impact-logo-intro.mp3` | `sfx/impact/` | Movie logo intro impact | https://assets.mixkit.co/active_storage/sfx/2900/2900-preview.mp3 |
| `impact-movie-epic.mp3` | `sfx/impact/` | Epic movie impact | https://assets.mixkit.co/active_storage/sfx/2901/2901-preview.mp3 |
| `impact-movie-transition.mp3` | `sfx/impact/` | Movie impact transition | https://assets.mixkit.co/active_storage/sfx/2916/2916-preview.mp3 |
| `impact-shockwave-electric.mp3` | `sfx/impact/` | Heavy electric shockwave impact | https://assets.mixkit.co/active_storage/sfx/2599/2599-preview.mp3 |
| `impact-trailer-whoosh-hit.mp3` | `sfx/impact/` | Movie trailer whoosh hit | https://assets.mixkit.co/active_storage/sfx/2919/2919-preview.mp3 |
| `impact-waves-cine.mp3` | `sfx/impact/` | Cinematic impact waves | https://assets.mixkit.co/active_storage/sfx/781/781-preview.mp3 |
| `metal-spring-hit.mp3` | `sfx/impact/` | Spring metal hit | https://assets.mixkit.co/active_storage/sfx/2302/2302-preview.mp3 |
| `stomp-apocalyptic.mp3` | `sfx/impact/` | Apocalyptic stomp impact | https://assets.mixkit.co/active_storage/sfx/3057/3057-preview.mp3 |
| `thud-rising-short.mp3` | `sfx/impact/` | Short rising thud | https://assets.mixkit.co/active_storage/sfx/3133/3133-preview.mp3 |
| `glitter-particles.mp3` | `sfx/light/` | Magic glitter or particles | https://assets.mixkit.co/active_storage/sfx/2352/2352-preview.mp3 |
| `harp-sweep.mp3` | `sfx/light/` | Relaxing harp sweep | https://assets.mixkit.co/active_storage/sfx/2628/2628-preview.mp3 |
| `light-aura.mp3` | `sfx/light/` | Magical ligth aura | https://assets.mixkit.co/active_storage/sfx/2581/2581-preview.mp3 |
| `light-spell.mp3` | `sfx/light/` | Magic spell of light | https://assets.mixkit.co/active_storage/sfx/2588/2588-preview.mp3 |
| `light-sweep-magic.mp3` | `sfx/light/` | Magical light sweep | https://assets.mixkit.co/active_storage/sfx/2586/2586-preview.mp3 |
| `light-transition-magic.mp3` | `sfx/light/` | Magical light transition | https://assets.mixkit.co/active_storage/sfx/2583/2583-preview.mp3 |
| `sparkle-poof-hit.mp3` | `sfx/light/` | Magic sparkle poof hit | https://assets.mixkit.co/active_storage/sfx/3082/3082-preview.mp3 |
| `sparkle-touch.mp3` | `sfx/light/` | Magic sparkle touch | https://assets.mixkit.co/active_storage/sfx/3083/3083-preview.mp3 |
| `sparkle-wand.mp3` | `sfx/light/` | Magic wand sparkle | https://assets.mixkit.co/active_storage/sfx/3062/3062-preview.mp3 |
| `stardust-swish.mp3` | `sfx/light/` | Stardust swish | https://assets.mixkit.co/active_storage/sfx/1498/1498-preview.mp3 |
| `door-open-futuristic.mp3` | `sfx/mech/` | Futuristic door open | https://assets.mixkit.co/active_storage/sfx/183/183-preview.mp3 |
| `gear-lock-metallic.mp3` | `sfx/mech/` | Gear metallic lock sound | https://assets.mixkit.co/active_storage/sfx/2858/2858-preview.mp3 |
| `lock-digital.mp3` | `sfx/mech/` | Computer digital lock | https://assets.mixkit.co/active_storage/sfx/2859/2859-preview.mp3 |
| `lock-quick.mp3` | `sfx/mech/` | Quick lock sound | https://assets.mixkit.co/active_storage/sfx/2854/2854-preview.mp3 |
| `machine-activate-short.mp3` | `sfx/mech/` | Machine activation short | https://assets.mixkit.co/active_storage/sfx/3180/3180-preview.mp3 |
| `machine-start-futuristic.mp3` | `sfx/mech/` | Futuristic machine starting | https://assets.mixkit.co/active_storage/sfx/2689/2689-preview.mp3 |
| `mech-robotic-futuristic.mp3` | `sfx/mech/` | Futuristic robotic mechanism | https://assets.mixkit.co/active_storage/sfx/2530/2530-preview.mp3 |
| `mech-tech-movement.mp3` | `sfx/mech/` | Mechanical technology movements | https://assets.mixkit.co/active_storage/sfx/3117/3117-preview.mp3 |
| `metal-drop-scifi-small.mp3` | `sfx/mech/` | Small metallic sci fi drop | https://assets.mixkit.co/active_storage/sfx/888/888-preview.mp3 |
| `metal-plate-drop.mp3` | `sfx/mech/` | Thin metal plate drop | https://assets.mixkit.co/active_storage/sfx/3158/3158-preview.mp3 |
| `paper-book-browse-fast.mp3` | `sfx/paper/` | Fast browsing book paging | https://assets.mixkit.co/active_storage/sfx/1102/1102-preview.mp3 |
| `paper-crumple-quick.mp3` | `sfx/paper/` | Quick paper crumple sound | https://assets.mixkit.co/active_storage/sfx/2996/2996-preview.mp3 |
| `paper-move-quick.mp3` | `sfx/paper/` | Paper quick movement | https://assets.mixkit.co/active_storage/sfx/2380/2380-preview.mp3 |
| `paper-page-turn.mp3` | `sfx/paper/` | Page turn single | https://assets.mixkit.co/active_storage/sfx/1104/1104-preview.mp3 |
| `paper-page-turn-big.mp3` | `sfx/paper/` | Big paper page turn | https://assets.mixkit.co/active_storage/sfx/1105/1105-preview.mp3 |
| `paper-scissors-cut.mp3` | `sfx/paper/` | Scissors cutting paper | https://assets.mixkit.co/active_storage/sfx/2378/2378-preview.mp3 |
| `paper-slice-quick.mp3` | `sfx/paper/` | Paper quick slice | https://assets.mixkit.co/active_storage/sfx/2384/2384-preview.mp3 |
| `paper-slide.mp3` | `sfx/paper/` | Paper slide | https://assets.mixkit.co/active_storage/sfx/1530/1530-preview.mp3 |
| `paper-staple.mp3` | `sfx/paper/` | Stapling paper | https://assets.mixkit.co/active_storage/sfx/2995/2995-preview.mp3 |
| `paper-wind-blow.mp3` | `sfx/paper/` | Wind blowing papers | https://assets.mixkit.co/active_storage/sfx/2652/2652-preview.mp3 |
| `print-dot-vintage.mp3` | `sfx/paper/` | Vintage dot printing | https://assets.mixkit.co/active_storage/sfx/1371/1371-preview.mp3 |
| `swell-stark.mp3` | `sfx/riser/` | Cinematic swell stark transition | https://assets.mixkit.co/active_storage/sfx/2675/2675-preview.mp3 |
| `wind-swell-cine.mp3` | `sfx/riser/` | Cinematic wind swell | https://assets.mixkit.co/active_storage/sfx/1170/1170-preview.mp3 |
| `hitech-bleep.mp3` | `sfx/scifi/` | High tech bleep | https://assets.mixkit.co/active_storage/sfx/2521/2521-preview.mp3 |
| `scifi-click.mp3` | `sfx/scifi/` | Sci fi click | https://assets.mixkit.co/active_storage/sfx/900/900-preview.mp3 |
| `scifi-computer-ambience.mp3` | `sfx/scifi/` | Futuristic Sci Fi computer ambience | https://assets.mixkit.co/active_storage/sfx/2507/2507-preview.mp3 |
| `space-intro-futuristic.mp3` | `sfx/scifi/` | Futuristic space intro | https://assets.mixkit.co/active_storage/sfx/2523/2523-preview.mp3 |
| `space-ship-hum.mp3` | `sfx/scifi/` | Space ship hum | https://assets.mixkit.co/active_storage/sfx/2136/2136-preview.mp3 |
| `tech-hum-futuristic.mp3` | `sfx/scifi/` | Technological futuristic hum | https://assets.mixkit.co/active_storage/sfx/2133/2133-preview.mp3 |
| `chalk-line.mp3` | `sfx/text/` | Chalk line sound | https://assets.mixkit.co/active_storage/sfx/2372/2372-preview.mp3 |
| `marker-pen-line.mp3` | `sfx/text/` | Pen marker line | https://assets.mixkit.co/active_storage/sfx/2998/2998-preview.mp3 |
| `pen-click-twice.mp3` | `sfx/text/` | Pen clicking twice | https://assets.mixkit.co/active_storage/sfx/2371/2371-preview.mp3 |
| `pen-write-paper.mp3` | `sfx/text/` | Writing with a pen on paper | https://assets.mixkit.co/active_storage/sfx/2367/2367-preview.mp3 |
| `pencil-write-short.mp3` | `sfx/text/` | Short pencil writing | https://assets.mixkit.co/active_storage/sfx/2376/2376-preview.mp3 |
| `typewriter-digital.mp3` | `sfx/text/` | Digital typewriter | https://assets.mixkit.co/active_storage/sfx/1363/1363-preview.mp3 |
| `typewriter-hit-hard.mp3` | `sfx/text/` | Hard typewriter hit | https://assets.mixkit.co/active_storage/sfx/1364/1364-preview.mp3 |
| `typewriter-hit-single.mp3` | `sfx/text/` | Mechanical typewriter single hit | https://assets.mixkit.co/active_storage/sfx/1382/1382-preview.mp3 |
| `typewriter-hit-soft.mp3` | `sfx/text/` | Typewriter soft hit | https://assets.mixkit.co/active_storage/sfx/1366/1366-preview.mp3 |
| `typewriter-return-bell.mp3` | `sfx/text/` | Typewriter return bell sound | https://assets.mixkit.co/active_storage/sfx/1383/1383-preview.mp3 |
| `typewriter-scifi.mp3` | `sfx/text/` | Sci fi futuristic typewriter | https://assets.mixkit.co/active_storage/sfx/1385/1385-preview.mp3 |
| `typewriter-typing-old.mp3` | `sfx/text/` | Old typewriter typing | https://assets.mixkit.co/active_storage/sfx/1372/1372-preview.mp3 |
| `write-blackboard.mp3` | `sfx/text/` | Writing on blackboard | https://assets.mixkit.co/active_storage/sfx/2366/2366-preview.mp3 |
| `write-fast.mp3` | `sfx/text/` | Fast writing | https://assets.mixkit.co/active_storage/sfx/3196/3196-preview.mp3 |
| `air-whoosh-powerful.mp3` | `sfx/transition/` | Powerful air whooshes | https://assets.mixkit.co/active_storage/sfx/3220/3220-preview.mp3 |
| `air-woosh-deep.mp3` | `sfx/transition/` | Deep air woosh | https://assets.mixkit.co/active_storage/sfx/2604/2604-preview.mp3 |
| `air-woosh-quick.mp3` | `sfx/transition/` | Quick air woosh | https://assets.mixkit.co/active_storage/sfx/2605/2605-preview.mp3 |
| `sweep-fast.mp3` | `sfx/transition/` | Fast sweeping transition | https://assets.mixkit.co/active_storage/sfx/164/164-preview.mp3 |
| `sweep-futuristic.mp3` | `sfx/transition/` | Futuristic transition sweep | https://assets.mixkit.co/active_storage/sfx/2634/2634-preview.mp3 |
| `sweep-short.mp3` | `sfx/transition/` | Short transition sweep | https://assets.mixkit.co/active_storage/sfx/175/175-preview.mp3 |
| `swoosh-slow.mp3` | `sfx/transition/` | Slow sweeping swoosh | https://assets.mixkit.co/active_storage/sfx/163/163-preview.mp3 |
| `transition-intro.mp3` | `sfx/transition/` | Intro transition | https://assets.mixkit.co/active_storage/sfx/1146/1146-preview.mp3 |
| `transition-tech.mp3` | `sfx/transition/` | Tech transitions | https://assets.mixkit.co/active_storage/sfx/3176/3176-preview.mp3 |
| `transition-tech-slide.mp3` | `sfx/transition/` | Technology transition slide | https://assets.mixkit.co/active_storage/sfx/3120/3120-preview.mp3 |
| `warp-slide.mp3` | `sfx/transition/` | Sci fi warp slide | https://assets.mixkit.co/active_storage/sfx/3113/3113-preview.mp3 |
| `whoosh-swirl.mp3` | `sfx/transition/` | Swirling whoosh | https://assets.mixkit.co/active_storage/sfx/1493/1493-preview.mp3 |
| `whoosh-tunnel-reverb.mp3` | `sfx/transition/` | Cinematic tunnel reverb woosh | https://assets.mixkit.co/active_storage/sfx/1486/1486-preview.mp3 |
| `wind-pass-vibrate.mp3` | `sfx/transition/` | Vibrating wind passing by | https://assets.mixkit.co/active_storage/sfx/2705/2705-preview.mp3 |
| `wind-swoosh-short.mp3` | `sfx/transition/` | Short wind swoosh | https://assets.mixkit.co/active_storage/sfx/1461/1461-preview.mp3 |
| `wind-woosh-throw.mp3` | `sfx/transition/` | Throw hard wind woosh | https://assets.mixkit.co/active_storage/sfx/1488/1488-preview.mp3 |
| `wing-flutter.mp3` | `sfx/transition/` | Fly wings movement | https://assets.mixkit.co/active_storage/sfx/2697/2697-preview.mp3 |
| `chime-crystal.mp3` | `sfx/ui/` | Crystal chime | https://assets.mixkit.co/active_storage/sfx/3108/3108-preview.mp3 |
| `hitech-touch-magnet.mp3` | `sfx/ui/` | Hi-tech touch with magnet | https://assets.mixkit.co/active_storage/sfx/3171/3171-preview.mp3 |
| `pop-electric.mp3` | `sfx/ui/` | Electric pop | https://assets.mixkit.co/active_storage/sfx/2365/2365-preview.mp3 |
| `switch-click-quick.mp3` | `sfx/ui/` | Quick switch click | https://assets.mixkit.co/active_storage/sfx/2582/2582-preview.mp3 |
| `switch-light.mp3` | `sfx/ui/` | Light switch sound | https://assets.mixkit.co/active_storage/sfx/2579/2579-preview.mp3 |
| `switch-tap.mp3` | `sfx/ui/` | On or off light switch tap | https://assets.mixkit.co/active_storage/sfx/2585/2585-preview.mp3 |
| `ui-click-tone.mp3` | `sfx/ui/` | Cool interface click tone | https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3 |
| `ui-confirm-bleep.mp3` | `sfx/ui/` | High tech bleep confirmation | https://assets.mixkit.co/active_storage/sfx/2520/2520-preview.mp3 |
| `ui-confirm-tone.mp3` | `sfx/ui/` | Confirmation tone | https://assets.mixkit.co/active_storage/sfx/2867/2867-preview.mp3 |
| `ui-message-pop.mp3` | `sfx/ui/` | Message pop alert | https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3 |
| `ui-notify-tech.mp3` | `sfx/ui/` | Technology notification | https://assets.mixkit.co/active_storage/sfx/3123/3123-preview.mp3 |
| `ui-option-select.mp3` | `sfx/ui/` | Interface option select | https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3 |
| `ui-popup-dry.mp3` | `sfx/ui/` | Dry pop up notification alert | https://assets.mixkit.co/active_storage/sfx/2356/2356-preview.mp3 |
| `ui-select-click.mp3` | `sfx/ui/` | Select click | https://assets.mixkit.co/active_storage/sfx/1109/1109-preview.mp3 |
| `ui-select-modern.mp3` | `sfx/ui/` | Modern technology select | https://assets.mixkit.co/active_storage/sfx/3124/3124-preview.mp3 |
| `ui-success-soft.mp3` | `sfx/ui/` | Success software tone | https://assets.mixkit.co/active_storage/sfx/2865/2865-preview.mp3 |
| `ui-tone-quick.mp3` | `sfx/ui/` | Digital quick tone | https://assets.mixkit.co/active_storage/sfx/2866/2866-preview.mp3 |

## bgm/（BGM 备选，Mixkit Stock Music Free License 免署名可商用）

| 文件名 | 原曲名 | 艺术家 | 风格 | BPM | URL |
|---|---|---|---|---|---|
| `bgm-tech-house.mp3` | （首批沿用，无法逐曲反查） | — | Tech House | ~124 | Mixkit，商用前复核 |
| `cat-walk.mp3` | Cat Walk | Arulo | House | ~129 | https://assets.mixkit.co/music/371/371.mp3 |
| `g-eazy-nba-type.mp3` | G Eazy NBA type | Arulo | Hip Hop | ~86 | https://assets.mixkit.co/music/403/403.mp3 |
| `house-vibez.mp3` | House Vibez | Lily J | House | ~123 | https://assets.mixkit.co/music/745/745.mp3 |
| `tonight-hiphop.mp3` | Tonight | Michael Ramir C. | Hip Hop | ~103 | https://assets.mixkit.co/music/841/841.mp3 |

BPM 为 librosa 实测（beat grid 最小二乘拟合法，见 references/music-beat-sync.md）。
