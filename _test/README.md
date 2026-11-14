# `_test/` — headless checks for methodica-science-mass-liquid-02

Nothing in this folder ships (see `docs-and-tools/package-allowlist.ps1`).

## verify-assets.js — the asset contract (guide §15)

Static, no dependencies:

```bash
node _test/verify-assets.js
```

Exit code 1 on any failure. It asserts, over every part and `unit-assets/`: every HTML
`src`/`href`/`poster`, every CSS `url()` (resolved from the stylesheet's own folder —
`<part>/css/` reaches the unit root through `../../`) and every asset path written in
`js/*.js` (resolved from the document, `<part>/`) exists **case-exactly**; `?v=` on every code
reference with one value per file across all parts; no part file byte-identical to a hoisted
one and no byte-identical assets in two parts; ASCII lower-case space-free paths with a single
extension; no reference to a folder; every asset referenced, every part asset by its own part;
no runtime-built asset names (this unit has none — `FAMILIES = {}`).

When first committed (optimization step 1.2) it **fails by design**: its failure list is the
to-do list for the renaming, hoisting and `?v=` commits that follow. It must be green from the
end of step 1.7 on, and it was mutation-tested then (see `docs-and-tools/OPTIMIZATION-REPORT.md`).

## verify-report.js — reporting / issue reporting / resume (guide §6.8, §10.2)

```bash
NODE_PATH=C:/lomda-test/node_modules node _test/verify-report.js
```

jsdom must be installed **outside** the OneDrive tree (`C:\lomda-test\node_modules\jsdom`); without
it the static groups still run and the runtime group reports SKIPPED. Groups: (1) catalogue identity
— ids, prefix, unit slug, keys, library letters, the stub's keys, every metadata id/question shape;
(2) per-part wiring — script-tag order (`motion.js` before `main.js`, `90-boot` last), one `?v=`,
boot cover, the three dialogs, hops only under `DEV_NAV`, no `window.close`/`alert`, the `goTo`
hook order of THIS unit (`.active` → `resetScreenState` → `xapiOnScreen`), character through the
shared layer, config block ↔ catalogue both ways, `XAPI_EVAL_ITEMS`, the response-layer statics
H1–H3/H7 (one `xapiAnswered` per declared question, spec shape by `questionType`, the `isLast`
idiom), hint sites after the guards and before the reveal, no identifier in both layers;
(3) shared layer — O-8, B-1, seams gate, `xapiAnswerText` fallbacks; (4) runtime in jsdom — the
regression gate (no library: nothing throws, nothing sent, results still recorded), `DEV_NAV` on/off,
the statement flow with a recorder (item pairs, B-1, a real `answered.last`, one component
`completed` for two finish clicks with a boolean `success`, button disabled, no navigation, ledger
persisted), the response builders round-tripping the catalogue (H9/H10/H12/H13). The resume groups
(hooks, D-8 reload, stage A, painter sweeps) run only once `RESUME_ENABLED` is true (Phase 4).

Adapted 2026-10-22 from body-matter-01; mutation-tested nine ways on 2026-10-22 (see
`docs-and-tools/REPORT-XAPI.md`).

`xapi-720-k.js` is the local stand-in for the CDN library, loaded with
`?xapiLib=../_test/xapi-720-k.js` on localhost only (from volume-solid-01; `__reset` clears this
unit's keys). Console helpers: `__stmts() __state() __setState(doc) __dupes() __reset()
__failWrites(bool|status) __lastState()`.

## write-guard.js — no write before the restore, the leave save (2026-11-13)

```bash
NODE_PATH=C:/lomda-test/node_modules node _test/write-guard.js [baseDir]
```

jsdom. BOOT-AND-RESUME-HARDENING-2026-11-03.md §2.6 checks a–p (drain writes the document as read, markSent waits
for the restore, a failed read closes every write, the boot markup of every part) and §2.10 s–t (the leave save
through `saveState720OnLeave`, and through `saveState720` on `-k`). Ported from volume-solid-01. Against the
`2026-11-12` package 54 checks fail. `xapi-720-l.js` is the `-k` stub plus `saveState720OnLeave` / `__leaveWrites()`;
the loader loads `-l` since 2026-11-13, `-k` stays for the rollback path.
