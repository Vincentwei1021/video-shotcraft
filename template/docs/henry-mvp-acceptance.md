# Henry Investor Video MVP Acceptance

Status: **PASS**  
Date: 2026-08-07  
Branch: `henry/mvp-20260807`

## Source integrity and privacy

- Safe fixture label: `xingyuan-ic-deck`
- Source deck SHA-256: `57b763184b69f96befa245fc7cb0a11bb5daa3e8721cbe215113c0c8d0597727`
- Isolated fixture SHA-256: `57b763184b69f96befa245fc7cb0a11bb5daa3e8721cbe215113c0c8d0597727`
- Source deck size: 5,284,514 bytes
- Slide fixture count: 9
- Source/fixture integrity: PASS; the SHA-256 values match.
- Git privacy scan: PASS; no real props, private slide, fixture deck, rendered video, or rendered still is tracked.
- Ignore checks: PASS for `private/props.json`, `public/private/`, and `out/private/`.

## Composition and output

| Check | Measured result | Status |
| --- | --- | --- |
| Composition | `HenryInvestorMvp` | PASS |
| Timeline | 1,200 contiguous frames | PASS |
| Video stream duration | 40.000000 seconds | PASS |
| Video frame count | 1,200 | PASS |
| Resolution | 1920×1080 | PASS |
| Frame rate | 30/1 fps | PASS |
| MP4 size | 23,348,185 bytes | PASS |
| MP4 SHA-256 | `7bc00233de9803983076599be2d9841698b672a80d6964e588c5364755a7d5ef` | PASS |
| Frame-600 still size | 1,860,663 bytes | PASS |
| Frame-600 still SHA-256 | `d4d23458dbc2760bff782db218ca38cbcea6214f54e929eb33588529be6a0eed` | PASS |

The MP4 container duration is 40.042667 seconds because Remotion emits a silent AAC stream with encoder padding. The primary H.264 video stream is exactly 40.000000 seconds and 1,200 frames.

## Motion and visual review

- Frame-driven `spring` and `interpolate` motion is present in every scene; slide imagery receives continuous scale and pan treatment.
- Thesis cards enter sequentially, and the two risk panels remain scheduled for 240 frames, exceeding the 120-frame requirement.
- Frames 90, 300, 600, and 1,020 were rendered and visually inspected to cover opening, problem, thesis, and verdict scenes.
- The verdict visibly includes the label `内部研究演示 · 非投资建议`.

## Validation evidence

The following commands completed successfully after the final source changes:

```bash
cd template
bash scripts/demo-local.sh
ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height,r_frame_rate,avg_frame_rate,duration,nb_frames \
  -show_entries format=duration -of json \
  out/private/henry-investor-mvp.mp4
test -s out/private/f600.png
npm run validate:henry
npm run typecheck
```

Privacy and integrity checks completed successfully:

```bash
shasum -a 256 <private-source-deck>
shasum -a 256 <isolated-private-fixture>/source.pptx
git ls-files | rg 'props\.json|public/private|out/private|source\.pptx|slide-[0-9]+\.png' && exit 1 || true
git check-ignore template/private/props.json template/public/private/slide-01.png template/out/private/henry-investor-mvp.mp4
```

## Limitations

- This local MVP has no narration, music, or sound design; the AAC stream is silent.
- Real copy and slide images remain local ignored inputs, so another machine needs separately authorized private fixtures to reproduce the real render.
- Investment statements are bounded to the supplied deck and were not independently re-verified as part of video production.
- Dense source-slide text is used as supporting visual texture; the overlaid investment summary is the intended primary reading layer.
- `npm install` reports two existing audit findings in the pinned upstream dependency tree (one moderate, one high); dependencies were not upgraded in this scoped MVP.
