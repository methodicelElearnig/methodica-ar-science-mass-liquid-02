# Optimization report — methodica-science-mass-liquid-02

Phase 1 of the platform-integration work (guide `ADDING-REPORTING-AND-RESUME.md` §15), done
2026-10-22 on branch `vadimr/feat/report-and-resume`, before any reporting code pins a path.
Before-state: `OPTIMIZATION-BASELINE.md` (commit `32174e0`). Every media change is logged, one row
per file per operation, in `../MEDIA-CHANGES.md` (176 rows).

**Constraints set by the unit owner:** media file **types preserved** (PNG→PNG, JPG→JPG, MP4→MP4,
TTF→TTF — no WebP / woff2), every media change logged. Fonts stay TTF because TTF is still the
format of several live units (volume-solid-01, ratio-01/02, scale-01, percent-01/04, mass-summary).

## Result

`git ls-tree -r -l`: **91,216,431 bytes / 214 files → 17,820,873 bytes / 164 files (−80.5 %)**.
Of the 17.8 MB, 0.17 MB is the new documentation and tooling (`MEDIA-CHANGES.md`,
`docs-and-tools/`, `_test/`), none of it shipped.

| Part | before | after |
|---|---|---|
| methodica-science-mass-liquid-02-01 | 57,115,506 | 8,451,615 |
| methodica-science-mass-liquid-02-02 | 14,766,486 | 2,848,769 |
| methodica-science-mass-liquid-02-03 | 2,729,442 | 913,975 |
| methodica-science-mass-liquid-02-04 | 1,501,459 | 582,299 |
| methodica-science-mass-liquid-02-05 | 2,507,306 | 1,043,403 |
| methodica-science-mass-liquid-02-06 | 8,721,862 | 1,574,492 |
| methodica-science-mass-liquid-02-07 | 3,793,948 | 1,101,680 |
| unit-assets/ (new) | — | 1,130,191 |

| ext | before | after |
|---|---|---|
| png | 50 / 54,489,364 | 46 / 9,643,772 |
| mp4 | 27 / 32,438,591 | 26 / 5,968,726 |
| jpg | 10 / 1,728,255 | 9 / 486,938 |
| ttf | 21 / 1,045,436 | 3 / 149,348 |
| svg | 53 / 57,342 | 20 / 19,421 |
| js / css / html | 1,377,021 | 1,387,679 (`?v=` added) |

## What was done, in commit order (one class of file per commit)

| Step | Commit | What | Saving |
|---|---|---|---|
| 1.0 | `32174e0` | `metadata/` tracked (catalogue records for the unit and components 01–07) | — |
| 1.1 | `c24418b` | `.gitattributes` (LF pinned, binaries declared) from body-matter-01; baseline recorded. Index was already LF; the working tree re-checked out as LF (107 text files) | — |
| 1.2 | `b810ac7` | `_test/verify-assets.js` — the asset contract, adapted for the `css/` + `js/` subfolders (CSS `url()` resolves through `../../`, JS paths from the document). Committed failing (137 checks) as the to-do list; mutation-tested at the end of 1.7 | — |
| 1.3 | `40b3969` | `?v=20261022` on every code reference (`css/style.css`, `css/motion.css`, `js/motion.js`, `js/main.js`), one value in all parts | — |
| 1.4 | `636f7d4` | 3 unreferenced images removed (`02/s6-book.png`, `02/s6-brick.png`, `05/s3a-water-bill.jpg`) | −383,386 |
| 1.5 | `aadf554` | 48 media files renamed to ASCII lower-case (12 Hebrew names with spaces → screen-prefixed kebab-case; 2 double extensions, one of them the mislabelled character-2 thinking clip; 12 `Character-*.mp4`, `orangeJuice_fuel_milk`, 21 `Assistant-*.ttf`); references rewritten inside the owning part only | 0 |
| 1.5b | `aaf6884` | `02/s5-pool-scene.png` removed — superseded by the client's `s5-pool-scene-small-bottle.png`, found by the contract once the renames let it see every name | −2,256,097 |
| 1.6 | `5006635` | 3 Assistant TTFs ×7 → `unit-assets/fonts/` | −896,088 |
| 1.7 | `066c805` `78978ae` | 9 byte-identical image groups (43 copies → 9) → `unit-assets/img/`; `01/dq-chevron.svg` folded into `acc-chevron.svg` | −2,533,114 |
| 1.8 | `7ed97c8` | 55 rasters re-encoded in place: resized to ≤ 2× their measured display box, PNG → 256-colour palette (libimagequant, quality floor 70 — none refused) + oxipng, JPG q82 progressive | −40,952,238 |
| 1.9 | `5aa8f36` | 27 videos re-encoded in place (x264 crf 26, audio stripped — every `<video>` is muted; 9 clips carried AAC), downscaled to 2× the box where larger; `character-1-workout.mp4` (02 = 03) hoisted | −26,469,865 |

## How the display boxes were measured

`docs-and-tools/media-display-boxes.json` holds, per file, the largest box it is drawn in, in
1280×710 design px. Measured in the real pages served from a subpath: every screen of every part
was walked with `goTo(n)`, each `<img>`/`<video>`/CSS background was measured through the canvas
scale, the zoom clone was computed exactly as `openImgZoom` does (envelope 1056×642, composite
comics up to the canvas height), and the S6 hotspot items were taken from `HS_ITEMS` (`fw`/`fh`
+5 % popup growth; the syringe from its crop region). `reencode-media.py` assumes object-fit
**cover** (the larger of the two ratios) and never upscales; shrinks under 10 % are skipped. Files
not measured keep their native size.

## Verification

- `node _test/verify-assets.js` — **1017/1017** at `5aa8f36`. Mutation-tested after 1.7, eight ways,
  each detected and the tree restored byte-equal: a path segment's case broken (the one mutation git
  cannot see on Windows — restored by hand), one `?v=` dropped, a hoisted file copied back, a dangling
  HTML `src`, `?v=` differing between parts, a CSS `url()` at the wrong depth, a non-ASCII file added,
  a dangling JS asset path.
- Browser pass from a subpath (`http://localhost:5555/methodica-science-mass-liquid-02/<part>/index.html`,
  Chromium in the Claude desktop browser pane, 2026-10-22): all 58 screens of the 7 parts walked;
  **0 HTTP 4xx** (Performance API and the server log), 0 broken images, 0 JS errors;
  `document.fonts` 400/600/700 all `loaded`; every character clip autoplays muted and advances;
  the three S5 content clips are `preload="none"` and gated by the learner, as designed.
- Visual spot-check at zoom: S2 comic (whole-comic zoom), S3 panels, S6 supermarket scene (ceiling
  gradients), S7 objects — no visible banding from the palette.

## Not done, by decision

- No comment stripping or minification (comments are the maintainers' documentation; gzip handles
  the wire size).
- `motion.js` / `motion.css` kept per part (3 revisions; unifying them is an animation-system sync,
  i.e. behaviour, out of scope).
- Re-encoded media kept their names: the unit has never been deployed, so there is no cache to bust.
  From the first live package on, a media change gets a new name (guide §15.2 rule 6).
- `02/s6-die.png` and friends (400² drawn at 140²) were resized like everything else; the S4 water
  chart (2222×990, zoomed to 1057×471) and the S5 water bill were kept at native size (the 2× box is
  within 10 % of native).
