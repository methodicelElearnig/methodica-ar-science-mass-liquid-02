# Optimization baseline — methodica-science-mass-liquid-02

Taken 2026-10-22 at commit `32174e0` (metadata just tracked, before any optimization commit), per
`Documentation/reporting-and-resume/ADDING-REPORTING-AND-RESUME.md` §15.4 step 1.

## Tracked size

`git ls-tree -r -l HEAD`: **91,216,431 bytes, 214 files** (of which `metadata/` 76,558 bytes, 8 files;
root `README.md`, `.gitignore`, `.nojekyll`).

| Part | Tracked bytes | Files |
|---|---|---|
| methodica-science-mass-liquid-02-01 | 57,115,506 | 69 |
| methodica-science-mass-liquid-02-02 | 14,766,486 | 32 |
| methodica-science-mass-liquid-02-03 | 2,729,442 | 21 |
| methodica-science-mass-liquid-02-04 | 1,501,459 | 13 |
| methodica-science-mass-liquid-02-05 | 2,507,306 | 28 |
| methodica-science-mass-liquid-02-06 | 8,721,862 | 21 |
| methodica-science-mass-liquid-02-07 | 3,793,948 | 19 |

## By extension (tracked)

| ext | files | bytes |
|---|---|---|
| png | 50 | 54,489,364 |
| mp4 | 27 | 32,438,591 |
| jpg | 10 | 1,728,255 |
| ttf | 21 | 1,045,436 |
| js | 14 | 603,949 |
| html | 14 | 411,924 |
| css | 14 | 361,148 |
| json | 8 | 76,558 |
| svg | 53 | 57,342 |

Every part carries `index.html`, `index_dev.html`, `js/main.js`, `js/motion.js`, `css/style.css`,
`css/motion.css` and its own `assets/{fonts,img,video}`. No `?v=` on any code reference.

## Duplicates (md5 hash groups across parts)

- In all 7 parts: `Assistant-{Regular,SemiBold,Bold}.ttf` (49.8 KB each — 896 KB redundant),
  `report-problem-icon-{default,hover}.svg`.
- In 6 parts (01/02/03/05/06/07): `answer-radio-{correct,incorrect}.svg`.
- In 4 parts (01/02/03/06): `s12-arrow-2.svg`, `s12-arrow-3.svg`, `popup-close-x.svg`.
- In 2 parts: `gesture-hand.svg` (01/05); **`s3-comic-panel-2.png` (01/02, 2,495,188 B)**.
- Same bytes, different names inside part 01: `acc-chevron.svg` = `dq-chevron.svg`.
- Near-duplicates (video stream identical, 30 bytes of container metadata differ):
  `Character-{1,2}-light-workout.mp4` in 02 and 03 (≈1.17 MB).
- Total redundant bytes ≈ 3.43 MB exact, ≈ 4.6 MB counting the workout pair.

## Unreferenced (name scan over every html/css/js)

3 files, 383 KB, referenced by nothing: `02/assets/img/s6-book.png`, `02/assets/img/s6-brick.png`,
`05/assets/img/s3a-water-bill.jpg` (superseded by `s3a-water-bill-v2.jpg`).

## Naming

46 asset paths break the ASCII / lower-case / no-space rule:

- 12 Hebrew names with spaces: 11 in `01/assets/img/` (`אצות כחוליות.jpg`, `בקבוק מים.png`,
  `דלי קו מתאר.png`, `דלי.png`, `וניל.png`, `כוס מיץ.png`, `מזרק.png`, `משורה-392.png`,
  `קופסה עם מידות-410.png`, `קופסה עם מידות.png`, `קופסת מטבח.png`), 1 in `07/assets/img/`
  (`משפחת לוי.png`). Referenced raw (not percent-encoded) from `index.html` and `js/main.js`.
- 21 `Assistant-*.ttf` (capital A), 12 `Character-*.mp4` (capital C; parts 01/03/04/06/07),
  `orangeJuice_fuel_milk.mp4`.
- Two double extensions in `01/assets/video/`: `character-1-selection.mp4.mp4`,
  `character-2-selection.mp4.mp4` (the latter is the character-2 *thinking* clip — `js/main.js`
  maps it to the thinking slot).
- A spelling slip: `Character-{1,2}-streching.mp4`.

## Oversized rasters (stored vs displayed, 1280×710 design px)

- `01/s10-cube.png` 1304×1206 RGBA (1.2 MB), drawn at 90×83 and cloned 1,000×.
- `01/s7-{truck,dice,perfume,bucket}.png` 1254² (≈1.35 MB each), drawn at 199².
- `01/s10-truck.png` 1536×1024 (1.7 MB), drawn at 460×307.
- Hotspot items (`בקבוק מים` 1024×1536, `קופסת מטבח` 1536×1024, `דלי` 1254², `וניל`) drawn at 119–250 px wide.
- 27 full-canvas RGB PNGs ≥ 1 MB (comic panels, scenes) with no alpha channel.

## Videos (27 × MP4, H.264 yuv420p)

9 clips carry a dead AAC track although every `<video>` is `muted` (all P01 content and
standing/thinking clips, `character-2-selection.mp4.mp4`); several 24 fps clips run at 3.6–7.2 Mb/s
against ≈1.1 Mb/s for the rest. Largest: `balloon_smoke_steam.mp4` 5.56 MB (1080², 7.2 Mb/s).

## Line endings

Index: 108 binary, 105 text all `i/lf`, 1 `i/none` (`.nojekyll`). Working tree checked out
`w/crlf` for 97 of the text files (no `.gitattributes` before this commit; `core.autocrlf=true`).
