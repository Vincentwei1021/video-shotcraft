# BGM 授权记录

`assets/audio/` 只保留 BGM 备选。SFX 从 Freesound 按项目下载，来源和许可写入
该项目的 `public/audio/sfx/audio-manifest.json` 与 `FREESOUND-CREDITS.md`，
流程见 [sfx-sourcing.md](../../references/sfx-sourcing.md)。
模板历史 SFX 的原始记录见 [模板音频来源](../../template/public/audio/ATTRIBUTION.md)。

## bgm/（BGM 备选，Mixkit Stock Music Free License 免署名可商用）

| 文件名 | 原曲名 | 艺术家 | 风格 | BPM | URL |
|---|---|---|---|---|---|
| `bgm-tech-house.mp3` | （首批沿用，无法逐曲反查） | — | Tech House | ~124 | Mixkit，商用前复核 |
| `cat-walk.mp3` | Cat Walk | Arulo | House | ~129 | https://assets.mixkit.co/music/371/371.mp3 |
| `g-eazy-nba-type.mp3` | G Eazy NBA type | Arulo | Hip Hop | ~86 | https://assets.mixkit.co/music/403/403.mp3 |
| `house-vibez.mp3` | House Vibez | Lily J | House | ~123 | https://assets.mixkit.co/music/745/745.mp3 |
| `tonight-hiphop.mp3` | Tonight | Michael Ramir C. | Hip Hop | ~103 | https://assets.mixkit.co/music/841/841.mp3 |

BPM 为 librosa 实测（beat grid 最小二乘拟合法，见 references/music-beat-sync.md）。
