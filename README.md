<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/brand/logo-mark-reverse.svg">
  <source media="(prefers-color-scheme: light)" srcset="./assets/brand/logo-mark.svg">
  <img alt="video-shotcraft logo" src="./assets/brand/logo-mark.svg" width="112" height="112">
</picture>

<h1>video-shotcraft</h1>

[![GitHub stars](https://img.shields.io/github/stars/Vincentwei1021/video-shotcraft)](https://github.com/Vincentwei1021/video-shotcraft/stargazers)
[![AtomGit Star](https://atomgit.com/VincentWei/video-shotcraft/star/badge.svg)](https://atomgit.com/VincentWei/video-shotcraft)
[![Gallery](https://img.shields.io/badge/Gallery-live%20previews-d3923c)](https://vincentwei1021.github.io/video-shotcraft/)

<a href="https://trendshift.io/repositories/88911?utm_source=trendshift-badge&utm_medium=badge&utm_campaign=badge-trendshift-88911" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/88911/daily?language=TypeScript" alt="Vincentwei1021%2Fvideo-shotcraft | Trendshift" width="250" height="55"/></a>
<a href="https://trendshift.io/repositories/88911?utm_source=trendshift-badge&utm_medium=badge&utm_campaign=badge-trendshift-88911" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/88911/weekly?language=TypeScript" alt="Vincentwei1021%2Fvideo-shotcraft | Trendshift" width="250" height="55"/></a>

**An agent skill for crafting cinematic product videos: 152 shot recipe cards · 209 styles · 209 motion previews · a production-ready template**

[English](README.md) | [中文](README_CN.md) | [日本語](README_JA.md)

</div>

**video-shotcraft** is an AI agent skill that turns Claude Code or Codex into a
motion-design studio: point it at your product and it storyboards, animates, and
sound-designs a cinematic promo, marketing, launch, or demo video with
[Remotion](https://www.remotion.dev/) — real page captures, 2.5D camera moves,
beat-synced cuts, and film-grade SFX included.

🖼️ [**Browse all 209 motion previews in the live Gallery »**](https://vincentwei1021.github.io/video-shotcraft/)

## ✨ What's new

> [!IMPORTANT]
> ### 🆕 2026-08 · 48 new shot recipe cards
> The library grows from 104 to **152 cards / 209 previews**. Distilled from
> 209 candidate motions through eight rounds of frame-by-frame review against
> reference footage, then folded into the regular Gallery categories with full
> recipe cards, native Remotion components
> (`demos/<category>/<name>/<Component>.tsx`, deterministic and driven by the
> normalized progress `t` — see demos/README.md for the wiring snippet), and
> motion previews. All de-branded: neutral placeholder copy and a single
> swappable `ACCENT` color variable.

- **2026-07 · Audio library restructure** — `bgm/` + `sfx/<category>/` with 149
  SFX across 16 scene/material categories, md5-deduplicated with license URLs
  restored.
- **2026-07 · Gallery upgrades** — multi-category card tags, flat alphabetized
  All view, auto-deploy to GitHub Pages with preview mp4s served from a release.

## 🎬 Showcase

The 38-second Gallery intro below was itself produced with this skill —
storyboard, shot implementation, and sound design were all done by an agent
following the toolkit's methodology:

https://github.com/user-attachments/assets/cba2df8a-4b2e-4247-bace-d0b1dea9c2bd

▶️ [Watch in HD on YouTube](https://youtu.be/gcVvRM_P3SM)

> Browse every shot card and motion preview online: **[Gallery](https://vincentwei1021.github.io/video-shotcraft/)**
> — search, filter, switch between variants, and copy selected shot-card names.

## 🚀 Quick start

**The most direct way: hand the repo link to your agent.**
In Claude Code / Codex or a similar agent, just say:

```text
Install this skill for me: https://github.com/Vincentwei1021/video-shotcraft
```

The agent will clone the repo and link it into your skills directory. Or install
with the [skills](https://skills.sh/) CLI / manually:

```bash
npx skills add Vincentwei1021/video-shotcraft
```

```bash
git clone https://github.com/Vincentwei1021/video-shotcraft.git
cd video-shotcraft
ln -s "$(pwd)" ~/.claude/skills/video-shotcraft   # Claude Code
# or
ln -s "$(pwd)" ~/.codex/skills/video-shotcraft    # Codex
```

Then make requests like:

```text
Use video-shotcraft to create a promo for my desktop product.
Use the deck-deal-flyin and row-embed shot cards to present this feature.
Design a product close-up inspired by spotlight-hero-card.
```

If no shot card is specified, the skill introduces the built-in video template
first and asks whether to use it; you can also pick shots in the
[Gallery](https://vincentwei1021.github.io/video-shotcraft/) before starting.

## 📼 Video template: Ink Press

The skill ships with **Ink Press** — a validated, complete promo template:
36.2 seconds, 1920×1080, 30fps, 10 shots in a paper-ink-amber style, with 2.5D
real-page camera moves, title cards, transitions, and a fully pinned cinematic
SFX pass:

https://github.com/user-attachments/assets/4cf5af51-98f3-4af2-8ab2-7267f470513d

▶️ [Watch in HD on YouTube](https://youtu.be/iShab28B_ak)

To use it, just tell your agent:

```text
Use video-shotcraft to make a promo for my product with the Ink Press template.
```

The agent swaps in your product's screenshots, copy, and branding to reproduce
the same quality — the fastest, most reliable path to a finished film.

> More templates are on the way.

### Headless / CI notes

Rendering on a headless Linux box (tested: 2 cores, Node 22) hits three walls
worth knowing:

1. **Concurrency cap** — `remotion still/render` fails with "Maximum for
   --concurrency is 2" on low-core machines. Fix: pass `--concurrency=1`.
2. **Old Headless removal** — recent Chrome/Chromium dropped old headless mode;
   pointing Remotion at system chromium fails to launch. Fix: use a
   chrome-headless-shell binary instead of full Chrome.
3. **Blocked CDN** — if remotion.media is unreachable, the automatic
   headless-shell download is rejected. Fix:
   `--browser-executable=<path-to-local chrome-headless-shell>`.

With these three flags, frame renders from the bundled template work.

## 📦 What's included

| Content | Description |
| --- | --- |
| 152 shot recipe cards | Purpose, energy, suggested duration, parameters, implementation notes, and known pitfalls |
| 209 motion previews | Covering 209 styles; searchable and filterable in the online Gallery |
| Remotion implementations | Tuned TSX demos containing the actual easing and timing parameters for each card |
| Complete video template | A validated 36.2-second, 1920×1080, 30fps product promo with 10 shots |
| Components and assets | 2.5D page camera, captions, flash cuts, digit rolls, SFX, and capture scripts |
| Production methodology | Capture, visual direction, storyboarding, sound design, beat sync, and final QA |

The toolkit primarily targets web and desktop product promos, while individual
shot cards can also be used in feature demos, brand films, launch videos, and
other motion projects.

## 🗂 Repository structure

```text
video-shotcraft/
├── SKILL.md                 # Agent entry point and core production rules
├── references/
│   ├── pipeline.md          # End-to-end production workflow
│   ├── shots/               # 152 shot recipe cards in 10 functional categories
│   ├── sequences/           # Reusable full-video structures and sequence patterns
│   ├── aesthetic-rules.md   # Visual QA criteria
│   ├── music-beat-sync.md   # BGM analysis and beat-sync methodology
│   └── sound-design.md      # Sound-design guidance and examples
├── demos/                   # Remotion reference implementations (same categories)
├── gallery/                 # Static motion-preview Gallery
├── template/                # Runnable complete video template
└── assets/
    ├── lib/                 # Reusable Remotion components
    ├── scripts/             # Page-asset capture scripts
    └── audio/               # Audio assets
        ├── bgm/             # 5 BGM options
        └── sfx/<category>/  # 149 SFX across 16 scene categories
```

For the complete workflow and implementation requirements, see [SKILL.md](SKILL.md),
the [production pipeline](references/pipeline.md), and the
[visual QA criteria](references/aesthetic-rules.md).

## 🔊 Audio and asset notes

Audio files under `assets/audio/` may be used according to their respective license terms.
See [ATTRIBUTION.md](assets/audio/ATTRIBUTION.md) for sources and license details.

SFX are organized into 16 scene/material categories (`transition` `impact` `riser`
`camera` `ui` `text` `paper` `film` `light` `data` `scifi` `mech` `glass` `fluid`
`crowd` `counter`) — **pick the category first, then the timbre**. See
[sound-design.md](references/sound-design.md) for the category index and per-file usage.

Product screenshots bundled with the template are demonstration assets. Replace them with
screenshots from the target product before publishing, and verify whether any product,
customer, or personal data needs to be anonymized.

## 🙏 Acknowledgements

Many shot recipes in this library were distilled by studying the motion language
of outstanding official product films — including promos from **ClickUp,
Perplexity, Slack, Notion, Figma, Framer, Bear, Raycast, Pitch, Miro, Superhuman,
and Loom**. The cards document motion techniques (timing, easing, choreography)
re-implemented from scratch; no footage, artwork, or brand assets from these
films are included in this repository. All trademarks belong to their respective
owners, and none of these companies are affiliated with or endorse this project.
Per-batch sourcing notes for the 48 cards added in 2026-08 live in
[references/shots/ATTRIBUTION.md](references/shots/ATTRIBUTION.md).

Special thanks to:

- **[Remotion](https://www.remotion.dev/)** — the React-based video framework
  that powers every demo and template here. Note that Remotion has its own
  [license](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)
  (free for individuals and small teams; companies may need a paid license).
- **[Mixkit](https://mixkit.co/)** — source of the SFX and music assets bundled
  under their free commercial license.
- The game-feel and animation communities whose published principles (e.g.
  Vlambeer's screenshake talks, classic animation timing) inform several cards.
- **Claude Code** — this library itself was built, iterated, and QA'd with an
  AI coding agent, using the same workflow the skill teaches.

## ⭐ Star history

<a href="https://www.star-history.com/?repos=Vincentwei1021%2Fvideo-shotcraft&type=date&legend=top-left">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=Vincentwei1021/video-shotcraft&type=date&theme=dark&legend=top-left&sealed_token=DQ8_yn0k8in6tP80CRd9Ghuk1fcdEW7poFh9ticGB3wMNO-E_i6g51sUiQWCAQYP0u0bjRweuIfGoRS8FnrIz86oFp1lcl5zu2vrEJrQOoNvwdUSwmm8XNPkAiln1o-EBAX0uU8k6ReIlSRufGLqpoxsWshMSZ9mmok6ox5XXIUO77b7zOgp2yRIH6yR" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=Vincentwei1021/video-shotcraft&type=date&legend=top-left&sealed_token=DQ8_yn0k8in6tP80CRd9Ghuk1fcdEW7poFh9ticGB3wMNO-E_i6g51sUiQWCAQYP0u0bjRweuIfGoRS8FnrIz86oFp1lcl5zu2vrEJrQOoNvwdUSwmm8XNPkAiln1o-EBAX0uU8k6ReIlSRufGLqpoxsWshMSZ9mmok6ox5XXIUO77b7zOgp2yRIH6yR" />
    <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=Vincentwei1021/video-shotcraft&type=date&legend=top-left&sealed_token=DQ8_yn0k8in6tP80CRd9Ghuk1fcdEW7poFh9ticGB3wMNO-E_i6g51sUiQWCAQYP0u0bjRweuIfGoRS8FnrIz86oFp1lcl5zu2vrEJrQOoNvwdUSwmm8XNPkAiln1o-EBAX0uU8k6ReIlSRufGLqpoxsWshMSZ9mmok6ox5XXIUO77b7zOgp2yRIH6yR" />
  </picture>
</a>
