# Henry Investor Video MVP Acceptance

Status: **LIMITED GO**

Date: 2026-08-08

Branch: `henry/mvp-20260807`

## Decision and licensing gate

- **Technical acceptance:** GO for the existing local render. The composition, private-fixture controls, validation, and measured media output satisfy the technical MVP checks recorded below.
- **Organizational or commercial use:** NO-GO until the user or organization separately confirms that its intended use satisfies the then-current Remotion licensing terms and that any required license is in place.
- **Confirmation status:** Not verified. This review does not assert the user's or organization's eligibility, team size, intended-use category, subscription, purchase, or other compliance with Remotion terms.
- **Gate owner:** The user or organization must make and record that determination before organizational distribution, commercial use, or reuse in an automated video-creation system.
- Official reference checked on 2026-08-08: [Remotion licensing and pricing](https://www.remotion.dev/). The official terms control and may change after this report.

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
npm audit
```

Privacy and integrity checks completed successfully:

```bash
shasum -a 256 <private-source-deck>
shasum -a 256 <isolated-private-fixture>/source.pptx
git ls-files | rg 'props\.json|public/private|out/private|source\.pptx|slide-[0-9]+\.png' && exit 1 || true
git check-ignore template/private/props.json template/public/private/slide-01.png template/out/private/henry-investor-mvp.mp4
```

## Dependency audit and execution boundary

`npm audit fix --package-lock-only` was applied after an isolated simulation proved that it would not change any direct dependency or Remotion version. The resulting lockfile-only changes are:

| Package | Before | After | Dependency class |
| --- | --- | --- | --- |
| `fast-uri` | 3.1.3 | 3.1.5 | Transitive |
| `postcss` | 8.5.19 | 8.5.26 | Transitive/peer |
| `nanoid` | 3.3.16 | 3.3.17 | Transitive |

Direct dependency declarations are unchanged, and `@remotion/cli` plus `remotion` remain pinned at 4.0.484. Before the lockfile-only fix, `npm audit` reported:

- High: `fast-uri` host-confusion advisories `GHSA-v2hh-gcrm-f6hx` and `GHSA-7p8r-x3mc-p8w7`.
- Moderate: `postcss` attacker-controlled `sourceMappingURL` file-read advisory `GHSA-fxqj-rqcc-2cmp`.

After the fix and a clean `npm ci`, `npm audit` reports 0 remaining advisories (0 low, 0 moderate, 0 high, 0 critical) as of 2026-08-08. This is a point-in-time result and does not replace future audit runs.

The technical acceptance assumes a **localhost and trusted-input boundary**:

- Remotion Studio and render commands are run locally and are not exposed to a LAN, public network, or untrusted browser clients.
- `private/props.json`, private slide images, and all asset paths come from authorized, trusted local sources; attacker-controlled props, slides, CSS, source maps, or remote assets are outside the accepted scope.
- If the Studio server is network-exposed, inputs become untrusted, or the workflow is moved into a shared/automated service, this acceptance no longer applies and a separate security and licensing review is required.
- Clearing the current advisories reduces known dependency risk but does not make untrusted input or network exposure safe by itself.

## Limitations

- This local MVP has no narration, music, or sound design; the AAC stream is silent.
- Real copy and slide images remain local ignored inputs, so another machine needs separately authorized private fixtures to reproduce the real render.
- Investment statements are bounded to the supplied deck and were not independently re-verified as part of video production.
- Dense source-slide text is used as supporting visual texture; the overlaid investment summary is the intended primary reading layer.
- Organizational or commercial use remains gated on separate Remotion-license confirmation; no such confirmation is asserted here.
