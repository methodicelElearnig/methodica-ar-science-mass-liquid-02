# xAPI reporting — methodica-science-mass-liquid-02

The unit's record of its platform integration (Phase 2 of the plan of 2026-10-22: reporting;
Phase 3: issue reporting). Resume (Phase 4): `RESUME.md`; packaging and the live Kata run (Phase 5): `../deployments/2026-10-22/DEPLOY.md`,
`METADATA-AUDIT.md`, `LIVE-VERIFICATION-2026-10-22.md`. Procedure: `Documentation/reporting-and-resume/ADDING-REPORTING-AND-RESUME.md`.

## 1. Lineage

Shared layer copied on 2026-10-22 from **methodica-science-body-matter-01** (2026-10-21 state:
mass-measure-03 → mass-weight-01 → body-matter-01 — B-1, D-6, D-7, D-8, the `xapiWireVideos`
state machine, the MOE 2026-10-19 `result.response` layer, the Kata `stepId` performance shape),
plus: O-8 from mass-measure-03 (`_xapiDeclaredQs` / `_xapiDefaultItemResult`), `xapiAnswerText`'s
`<br>` / `aria-label` fallbacks, `_xapiSeamsReady` and the loader's `settleMetadata` from
volume-solid-01, `UNIT_CHARACTERS` validation from volume-solid-01, the `_test/xapi-720-k.js` stub
from volume-solid-01 (its `__reset` clears the right keys). Two changes of our own:

- `xapiMatchingResponse` emits **only the placed pairs, one entry each**, instead of one per source:
  this catalogue repeats a source (02/005 `"ליטר"` for אמבטיה and for דלי) and the donor's
  source-keyed map dropped the second placement silently. Since 2026-10-25 (MOE QA, monday: 02-001,
  06-001 q2/q4) an unplaced source (a distractor, a spare option) sends **nothing** — the donor's
  `S[.]` entry made a right answer differ from the catalogue — and the right pairs come first, **in
  `correctAnswers` order**, the order Kata builds `correctXapiResponsesPattern` in; wrong pairs follow
  in source, target order. `_test/kata-patterns.json` holds Kata's patterns and the harness (H14)
  checks every right answer against them.
- `sendStatementOnce` marks nothing when there is no sender (`sendStatement720` undefined) — the
  ledger must never claim a statement that never left.

## 2. Library and identity

`-k` with resume, `-i` without (`RESUME_ENABLED` is **false** until Phase 4, so the live build is
`xapi-720-i.js`); the `XAPI_USING_G` regex lists `[ghijk]`. Prefix
`https://lomdot.education.gov.il/metodica/720active/science/mass-liquid/02/`; the unit id is the
bare slug `methodica-science-mass-liquid-02` (= `metadata/*_unit.json` id, MOE v2.5 §2.7);
components and items are IRIs with a trailing slash, questions `…/qN`. `UI_CHARACTER_KEY =
'methodica-science-mass-liquid-02_selectedCharacter'` (the key the parts already used; D-6 needs it
per unit, not underscored), `UNIT_CHARACTERS = ['character-1', 'character-2']`, `RESULT_KEYS =
['mass-liquid-02_moedAPassed', 'mass-liquid-02_moedBPassed']`.

## 3. What is reported, per component

| Part | Screens | Items (catalogue) | Graded questions (xapiAnswered) | Hints | Last click → `completed` | Result |
|---|---|---|---|---|---|---|
| 01 | 22 | 14 (001–014); screen 19 is a narrative lead-in, `null` | 7: 002 choice (S2, **one** attempt), 006 matching (S7 DnD), 011 choice (S17), 012 matching (S18 ordered DnD), 013 choice multi (S20), 014 **q1 + q2 choice** (S21 two dropdowns, one per question, shared `isLast`; split by the content team 2026-10-25) | S21 Recall (014/q1) | S21 "שנמשיך?" (`s21Primary`) / ArrowLeft | `{success:true}` — no pass condition (producer 2026-10-06) |
| 02 | 7 | 6 (001–006) | 6: 001 matching (word bank, targets by blank index), 002 choice, 003 performance (two dropdowns, `steps[]`), 004 choice, 005 matching, 006 matching (bin titles read from the DOM) | S2, S3 (Recall), S4 | S6 "שנמשיך?" on pass **and** fail | success = 4 of 6, scaled = correct/6 |
| 03 | 7 | 5 (001–005); S4 transition `null` | 6: 001 choice (dropdown), 002 choice, 003 **numeric q1 + q2** (two fields, per-field `correct`, shared `isLast`), 004 **performance** (three dropdowns, step names from the metadata `stepId`s; was matching until 2026-10-25), 005 choice | S2, S3 (Recall), S5 (Recall), S6 | S6 "שנמשיך?" on pass; **S3 "שנמשיך?" ends the component below 2 of 3** (success:false; Kata routes on `recommendedAfterFail` → 02) | success = 2 of 3 basic, scaled = correct/5 (gate narrower than the denominator — §6.4, documented in code) |
| 04 | 2 | 1 (001) | — | — | S1 "חזרתי, אפשר להמשיך" | `{success:true}` (off-computer task, no score) |
| 05 | 7 | 4 (001–004) | 4: 001 choice, 002 choice, 003 choice q1 (unit dropdown) + **true-false q2** (yes/no, one attempt) | S2 | S6 "המשך" after all six pie slices | success:true (no pass mark), scaled = correct/3 (q3 = both halves) |
| 06 | 7 | 1 (001, five questions) | 5: q1 choice, q2 matching (dropdowns), q3 choice, q4 matching (dropdowns), q5 choice | S3, S4, S5 (Recall, gated like a hint), S6 | S6 "סיימתי" (pass) / "שנמשיך?" (fail) — both end the component | success = 4 of 5, scaled = correct/5; `setUnitResult('mass-liquid-02_moedAPassed')`; the item mirrors the component (`XAPI_ITEM_RESULT`) |
| 07 | 6 | 1 (001, four questions) | 4: q1 choice multi (hotspots, `aria-label`), q2 performance (three fields, `steps[]`), q3 choice, q4 matching (ordered DnD) | S3, S4 | S5 "סיימתי" | success = 3 of 4, scaled = correct/4; `setUnitResult('mass-liquid-02_moedBPassed')`; item mirrors the component |

Decisions behind the table (2026-10-22, with the unit owner): below their score gates, 02 and 03
**end the component** with `success:false` instead of parking the learner (guide §6.4); 06 ends on
both peak outcomes (the hop to 07 lives only under `DEV_NAV`); 07's "סיימתי" reports מועד ב. The
`completed` is always the learner's last click; the lomda navigates nowhere (the platform owns
routing, §8.12). Below the gate the button is disabled by `xapiEndComponent`; `partEnded` keeps it
off through the screen's own re-renders (D-8 after a reload comes with Phase 4).

Videos: every `<video>` is a muted décor clip except the three S5 content clips of part 01; none
is opted in with `data-xapi-report` yet (decision: item 004 would receive `played`/`paused` for
three clips that play in a fixed sequence behind a learner gate — left out until MOE's ruling on the
video object, guide §13). No YouTube in the unit (no D-1 exposure).

## 4. The response layer (`result.response`)

Every `xapiAnswered` passes a spec by the metadata `questionType`; the builders emit the catalogue
string byte for byte (NFC + whitespace-collapsed lookup — three UI strings carry U+00A0 where the
catalogue has a space, which `_xapiNorm` absorbs). Where the DOM renders a sentence around a
dropdown (02 S1), the call site passes the catalogue's slot string or the slot index (`_xapiPick`
accepts an index into `answers.target`); 01 S21 (two choice questions) and 03 S5 (performance) pass
the chosen values only. 02 S6's bin titles are read from the DOM
(`#s6-b-*-title`) because the a11y constant is the short name. 03 S3's numeric values are passed
parsed (`s3Num`) so `"3,000"` is not read as `3` by the numeric builder's `,`→`.` rule.

Verified label by label against `metadata/` by the three wiring passes of 2026-10-22 (77 + 31 + 24
labels, 0 unresolved) and by the harness's round trip of every catalogue question through the real
builders.

## 5. Verification

- `NODE_PATH=C:/lomda-test/node_modules node _test/verify-report.js` — **2544 passed, 0 failed**
  (14 resume groups skipped until Phase 4); mutation-tested nine ways (a lost call site, a hint
  after the reveal, a screen missing from the map, a production hop, a broken `isLast`, an ungated
  dev bridge, a slash-less component id, a raw-localStorage verdict, the results write inside the
  try) — each detected.
- `node _test/verify-assets.js` — 1185/1185.
- `python -I -X utf8 docs-and-tools/check-metadata.py` — census 32 = 32 = 32; the SCREEN_MAP table
  it prints is the authority for screen ↔ item ↔ question.
- Browser, part 02 with the stub (`?xapiLib=../_test/xapi-720-k.js&registration=QA1`): library
  loaded, `METADATA.id === XAPI_COMP_ID`, `DEV_NAV` false, `#s0-back` hidden, boot cover gone;
  component `initialized`; walking S1 → S2 sends `initialized 001`, `initialized 002`; answering S2
  correctly sends `answered.last` with `response` = the catalogue text; S2 → S3 closes 002 with a
  result; `partFinish` sends one component `completed`, disables the button, no navigation; two
  unanswered evaluated items (003, 006) were not closed (B-1). No console errors.
- Issue reporting (Phase 3): the flag opens the dialog with the right unit/component slugs; one
  QA-marked report was submitted on 2026-10-22 (type "אחר", text starting "QA — בדיקת מנגנון
  הדיווח של methodica-science-mass-liquid-02") — the `fetch` to `docs.google.com/forms/d/e/…/
  formResponse` fired (opaque, `no-cors`) and the thank-you dialog showed. Inherited cosmetic
  item: focus does not return to the flag after the thank-you closes (QA O-10, family-wide).

## 6. Open items

- **Arabic unit, 2026-11-02:** synced with the Hebrew unit's MOE QA round of 2026-10-25
  (`?v=20261102a`): matching builder (only placed pairs, `correctAnswers` order), 01-014 → q1 + q2
  choice, 03-004 → performance (stepIds `مل`, `سم³`, `م³`); `metadata/` takes the same shapes with
  the Arabic texts (01-006 alternative pairs, 05-003 q2 `true`/`false`). `_test/kata-patterns.json`
  is **derived from this unit's own `metadata/`** with Kata's pattern rule (the rule reproduces the
  Hebrew unit's retrieved patterns byte for byte) — replace it with a real Kata retrieve once the
  Arabic catalogue is in Kata. Hebrew Kata history (03-004 PATCH 2026-10-29) does not apply here.
- **Arabic identity, 2026-11-02:** ids `…/720/ar/science/mass-liquid/02/methodica-ar-science-mass-liquid-02-…`
  (`XAPI_ID_PREFIX`, every `metadata/` id), `XAPI_UNIT_ID` = `methodica-ar-science-mass-liquid-02`, part
  folders and storage keys with `ar` (`?v=20261102b`). In Kata the seven components join the Hebrew
  unit (parent-unit mode, `SEND-METADATA.md`). `verify-report.js` §8 guards the Arabic build.

- Catalogue: pushed 2026-10-22 as authored (`METADATA-AUDIT.md`); the routing fields — P06 and P07
  both `order: 6`, P02 and P06 `recommendedAfterFail: []`, P07 `isRequired: true` — are with the
  content team. The two `performance` questions went up in the Kata `correctAnswers[].stepId` shape.
- Live Kata run (guide §12): DONE 2026-10-22 on components 02 and 04 against the uploaded package
  (`deployments/2026-10-22`, 154 / 154 by byte size) — every probe PASS, every statement POST 200
  (`LIVE-VERIFICATION-2026-10-22.md`). The reporting token used for the launch links is to be rotated.
- Content videos of 01 S5: opt in (`data-xapi-report="004"`) once MOE rules on the video object.
- `docs-and-tools/check-metadata.py` warns on the two `performance` questions by design (v2.7
  allows the type for 2+ typed inputs forming one answer — both qualify).
