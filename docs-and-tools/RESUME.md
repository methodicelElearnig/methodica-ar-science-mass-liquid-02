# Resume — methodica-science-mass-liquid-02

Phase 4 of the integration (2026-10-22). Design: `Documentation/reporting-and-resume/ADDING-REPORTING-AND-RESUME.md`
§8; shared code `unit-js/40-resume.js` (body-matter-01 lineage, see `REPORT-XAPI.md` §1). Reporting is
in `REPORT-XAPI.md`; packaging and the live run get their own records.

## 1. The document

One state document per {learner, component}, in Kata's xAPI State API, addressed by `?registration`
(`RESUME_STATE_ID = 'execution-state::<component-slug>'`), v5:

```
{ v: 5, component, payload: capturePartPayload() | null, done: {slug: true}, doneItems: {'slug#NNN': true},
  hints: {'NNN/qK': true}, picks: {}, ui: { character }, results: { 'mass-liquid-02_moedAPassed' | 'moedBPassed': 'true'|'false' } }
```

`RESUME_ENABLED = true` (`10-identity.js`) — so the loader loads `xapi-720-k.js`. `UI_CHARACTER_KEY =
'methodica-science-mass-liquid-02_selectedCharacter'` is the same key every part's `CHARACTER_STORAGE_KEY`
names; values are validated against `UNIT_CHARACTERS` (`character-1`, `character-2`); a foreign or stale
cache value is ignored, never adopted. `?resetState` clears the document, the cache and the verdict keys.

## 2. What each part saves (`capturePartPayload`)

Always: `currentScreen`, `qResults` (a copy of `XAPI_Q_RESULTS`, seeded back into the library after a
restore — O-8 / `xapiSeedAnsweredFromResume`). Per question screen: the selection (option id / `sel`
map / `place` map / the hotspot Set), `attempts`, `done`, `outcome`, `lw` (the Retry-gate signature —
rule 9), the retry `marks` / `judged` snapshot, the final-wrong `answer` with its toggle `view`
(§8.10), the `kept` / `wrong` Sets as arrays; the typed values of the two/three text fields (03 S3, 07
S3 — the only state that lives in the DOM). Gates (rule 11): 01 — `icxDone/icxSeq/icxUnlocked`,
`hsVisited`, `frc8Seen/frc8Face`, `fill11*`, `s10/s11Concluded`, `s12Played`, `s13Done`, `s15Visited`,
`s16Visited` (+ the gesture-hint seen/done flags so a finite hint never replays); 05 — `s6Shown`
(the six pie slices); 06 — `s1Ready/s1Seen` (the staged reveal). Never saved: DnD controllers, keyboard
picks, open dropdown lists, popup positions, timers, `partEnded` (after a reload the ledger decides —
D-8, `restoreEndedButton`).

## 3. Restore and painters

`applyExecutionState` (shared): `applyResumeVars` → `goTo(n)` → `applyResumeVars` again (undoes the
reset the screen's own enter code did) → `applyResumeDom` (text fields) → `restoreScreenUI(n)` →
`restoreEndedButton`. `repaintScreen(n)` runs `restoreScreenUI(n)` on every navigation as well. The
painters are thin because every screen of this unit renders from its variables: `restoreScreenUI`
calls the screen's own pure renderer (`sNRender`, `s10/s11Render`, `s13Render`, `s15/s16Apply`,
`icxSync`; a small `rsPaintScq` for the two SCQs of part 01 whose enter code paints only the lock),
re-derives the bar label / Progress Question nav / gated Continue, and never resets state. The
feedback popup of a resolved question is reopened (`reopenFeedbackIfResolved`) on the initial restore
only — in-session navigation reopens it on Back alone, as before. `done` without an `outcome` reads
as `correct`; a resolved-wrong dropdown/field without its answer snapshot rebuilds it from the
selection; the answer view is kept only when its snapshot exists.

The `goTo` order of this unit is `.active` → `resetScreenState(n)` → `repaintScreen(n)` →
`xapiOnScreen(n)` → `scheduleResumeSave()`; the boot cover (`#boot-cover`, 800 ms / 6 s net) hides
the first paint until the document is read.

## 4. When state is written

`scheduleResumeSave` (800 ms debounce) at every `goTo`; `flushResumeSave` (synchronous PUT) after the
last commitment: in every `sNFinish` right after `done/outcome`, at the end of every retry branch
(after `lastWrong` / marks / kept), at every gate-earning change (D-13 — the harness scans the
order), in `partFinish` after the verdict, and on `beforeunload` / `pagehide` / hidden
`visibilitychange` (Chrome blocks the sync XHR in a real dismissal — known issue
`KNOWN-ISSUE-dismissal-state-write.md`, bounded to ≤ 800 ms of pointer staleness). `setUnitResult`
(06/07 verdicts) and `setUnitCharacter` (01) write synchronously or queue until Phase B.

## 5. Ledgers

`done` (component `completed`), `doneItems` (item `completed`), `hints` (`requested.1`) through
`sendStatementOnce`: suppressed while `_restoring`, fail open without a document, never marked when
there is no sender. B-1: an evaluated item with no `answered` in this page load is not closed and not
marked.

## 6. Verification (2026-10-22)

- `_test/verify-report.js` — **2742 passed, 0 failed**, resume groups on: the four hooks declared once
  per part, D-13 flush order in every `sNFinish` / retry branch / `partFinish`, payload carries
  `currentScreen` + `qResults`, capture → fresh page → restore → capture byte-identical, the
  forced-done painter sweep and the clean sweep without `[resume]`/`[paint]` errors, D-8 after a
  reload with the ledger. Plus the wiring passes' own jsdom probes through the real
  `applyExecutionState` (02/03: 50 checks; 04–07: 45 checks; 01: a part-01-only run, 643 checks).
- Browser, stub library (`?xapiLib=../_test/xapi-720-k.js&registration=QA…`): 02 — a wrong first
  attempt on S2 then S3, reload → lands on S3 (document v5, `component` = the part), S2 comes back
  with the wrong mark, the Retry gate holding (button disabled while the choice equals `lw`), no popup;
  04 — finish, reload → the button stays disabled (ledger), a click sends nothing, `?resetState` →
  empty document, button on; 01 — all six hotspots opened, reload → lands on S6 with six visited
  rings and Continue enabled (gate restored). No console errors.
- Found and fixed in the browser: on a resumed load the landing item's `initialized` preceded the
  component's (QA class O-9) — the component `initialized` now goes out before the restore
  (`50-loader.js`).

- Live Kata (real State API, the uploaded package, 2026-10-22): 02 — first read 404/absent, save
  204, read-back 200 v5 with the full key set, wrong first attempt + reload painted with the Retry
  gate holding, `completed` for item 002 once across four screen crossings; 04 — one component
  `completed`, D-8 after a reload by the ledger (a click sends nothing), `?resetState` → empty
  document and a fresh 204 save. `LIVE-VERIFICATION-2026-10-22.md`.

## 7. Open

- The dismissal write (known issue, family-wide); multi-tab clobbering (guide §13).
- The content clips of 01 S5 are not opted into video reporting (REPORT-XAPI.md §6).
