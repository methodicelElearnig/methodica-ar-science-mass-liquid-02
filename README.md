# methodica-ar-science-mass-liquid-02

**Arabic build** of the 720 learning module `methodica-science-mass-liquid-02` —
720 learning module (לומדה) — a 7th–8th grade science unit, **יחידות נפח ושימושיהן** (volume units and
their uses: מ״ל / סמ״ק, ליטר, מ״ק, conversions by 1,000, and reading evidence to support or reject a
claim). Built from the production script `6-10-26_מדעים_יעד 7_להפקה_140926.pptx` (Target 07) as a
sequence of standalone parts. Each `methodica-ar-science-mass-liquid-02-0N` folder is a self-contained,
statically served module (its own `index.html` / `css/` / `js/` / `assets/`) covering one component
(רכיב) of the unit.

## Arabic build

This repo is the Arabic twin of `methodica-science-mass-liquid-02`: the learner sees Arabic only, and the
behaviour (screens, scoring, gates, xAPI, resume, routing) matches the Hebrew unit at `ad13210`
(2026-10-29), including the MOE QA round of 2026-10-25 (synced 2026-11-02).

**Identity.** Every id is the Hebrew one with `/720active/` → `/720/ar/` (the prefix the other Arabic
units use) and `methodica-ar-` for `methodica-` (`unit-js/10-identity.js`, `metadata/`). Kata has no
Arabic unit: the seven Arabic components join the Hebrew unit `methodica-science-mass-liquid-02`
(`docs-and-tools/send-metadata.ps1`, parent-unit mode). `XAPI_UNIT_ID` / `learningUnitId` stay
`methodica-ar-science-mass-liquid-02`. The character and nav-edge storage keys and the resume state keys
(from the folder names) carry `ar`, so Hebrew and Arabic state never mix in one browser. Hosting
(content, not ids): `https://lomdot.education.gov.il/metodica/720/ar/science/mass-liquid/02/` —
**to be confirmed before the first Kata create** (hostedContentRef is one-way).

**Arabic-only differences from Hebrew** (deliberate):
- Fonts: `Calibri, Arial, sans-serif` everywhere; the Assistant TTFs are not shipped.
- Issue report: the learner sees `REPORT_TYPE_DISPLAY` (Arabic); `REPORT_TYPE_LABELS`, the value posted
  to the form all 720 units share, stays Hebrew so the sheet stays filterable (`unit-js/25-report.js`).
- Layout fixes for longer Arabic text (01 S2 answer capsules and S4 bubble, 06 answers, hint button
  position, report-label line height) and localized names (Layla, Haddad, Mansour).
- Arabic images (same names and sizes as Hebrew): 01 `s7-perfume`, `s8-box-dimensions(-410)`;
  02 `s3-milk-lemonade-fridge`, `s6-fuel`, `s6-perfume`; 05 `s3a-water-bill-v2`, `s4-water-chart`;
  07 `s2-water-bill-levi`.
- `metadata/`: Arabic texts in the Hebrew question shapes; `informationToBot` is still Hebrew (bot-facing).

## Parts

- **01** — Teaching (slides 3–50): character pick (carried to every later part via `localStorage`),
  the "אמה" comic hook, what volume is, the supermarket hotspot screen, unit chips, flip cards on two
  measuring methods, the cube→box→truck fill-ups (1 ליטר = 1,000 סמ״ק, 1 מ״ק = 1,000 ליטר), the
  conversion diagram, bucket-conversion practice, the scientific-argument block (claim / evidence /
  reasoning) and two closing questions. 22 screens; continues into part 02.
- **02** — Standard practice (slides 52–58): six questions — drag-and-drop, single choice with image,
  dropdown blanks, a speech-bubble question, unit-to-object matching and a two-bin categorisation.
  Pass mark 4 of 6; below it the learner stays in the lomda (platform remediation).
- **03** — Basic practice (slides 60–66): five questions with a mid-way transition screen; the score
  gate (2 of 3) sits on S3. Continues into part 04.
- **04** — In-class transition (slides 68–69): the rocking-chair companion clip and the out-of-computer
  task instructions (measure solids, fill the table), with an inline tooltip. Continues into part 05.
- **05** — Advanced practice (slides 71–77): three questions (the third in two steps — a unit dropdown
  over a water bill, then a chart yes/no), followed by the "הידעת?" household-water screens with the
  click-to-reveal pie chart. No score gate. Continues into part 06.
- **06** — Peak question (slides 79–85): the lemonade scenario, five lettered sub-parts (recipe
  conversions in dropdowns, numeric input, single choice) with a shared recall popup for the recipe.
  Pass 4 of 5; a learner below the threshold continues into part 07, a passing learner ends here.
- **07** — Second peak ("מועד ב׳", slides 87–92): the Levi family's water bill — evidence hotspots,
  a three-field value input, a single-choice question and an ordered drag-and-drop. Pass 3 of 4.
  Final part of the unit.

## Running locally

Open any part's `index.html` in a browser (no build step, no dependencies; system fonts). `index_dev.html` adds a DEV bar for jumping between screens.
Cross-part navigation uses sibling-relative paths (`../methodica-ar-science-mass-liquid-02-0N/index.html`),
so keep the seven folders side by side.

## Conventions

Built to the 720 template set (`720-templates`, `720-design-guidelines`): 1280×710 fluid canvas,
RTL Arabic, feedback popups flush bottom-left (part 07 S2/S3 bottom-right by producer decision),
two-attempt questions with a retry gate, hints visible only after a first wrong attempt outside the
basic practice, and local-only assets (PNG/JPG/MP4/TTF).
