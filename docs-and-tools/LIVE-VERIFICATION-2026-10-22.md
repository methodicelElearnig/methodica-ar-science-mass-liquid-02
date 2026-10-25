# Live Kata verification — methodica-science-mass-liquid-02, 2026-10-22

Guide §12 probes against the deployed unit and the real catalogue, run from the Claude desktop
browser pane (Chromium) on the launch URLs minted by `Tools/full-kata-link/New-KataLaunchLinks.ps1
-UnitKey methodica-science-mass-liquid-02` (7 components, one registration each, test learner
`VADIM-1234`, platform `https://no-platform.com`). The links carry the reporting token: they live in
the tool's CSV only and were opened through a temporary local page that was deleted afterwards.
**Rotate the token** (the registrations were minted for this run).

Package: `deployments/2026-10-22` from commit `94d85c3`, uploaded by the unit owner to
`https://lomdot.education.gov.il/metodica/720/science/mass-liquid/02/`. Upload verified **by byte
size**: 154 / 154 files match the package (the CDN had answered 0 bytes for every path a few
minutes earlier — propagation, not a missing upload; the first probe only passed after the
re-check). Shared library on the CDN: `xapi-720-k.js`, 52,370 bytes.

Booleans only; anything not listed was not observed.

## Component 02 (standard practice)

| Probe | Observed |
|---|---|
| R1 preflight | launch URL on the content origin with `?slxapi` and `?registration`; scripts loaded: `xapiwrapper.min.js`, **`xapi-720-k.js`**; `XAPI_DISABLED === false`; `XAPI_USING_G === true`; registration present (36 chars); `METADATA.id === XAPI_COMP_ID`; `DEV_NAV === false`; `_resumeReady === true`; boot cover gone; `#s0-back` hidden; `_unitState` = `{v: 5, component: 'methodica-science-mass-liquid-02-02', payload: null}` — **PASS** |
| R2 first read | `stateLastResult720()` → `{op: 'load', status: 404, ok: true, reason: 'absent'}` (the one console 404 is this read) — **PASS** |
| R3 write / read back | `goTo(1)` → debounced save → `{op: 'save', status: 204, ok: true}`; `loadState720(RESUME_STATE_ID)` → `{status: 200}`, document v5, `component` = the part, `payload.currentScreen = 1`, keys `v, component, payload, done, doneItems, hints, picks, ui, results` — **PASS** |
| R4 answer + reload | wrong first attempt on S2 (`attempts 1`, `lw 'b'`) → synchronous flush `{save, 204}`; reload → lands on S2, `s2Selected 'b'`, `attempts 1`, `done false`, the option carries `.wrong`, the check button is disabled (Retry gate), label `צדקתי?`, no popup, hint visible; first read on the reload `{load, 200}`; `XAPI_DISABLED` still false; boot cover gone — **PASS** |
| R5 ledger | correct second attempt → `answered.last`; S2 → S3 → S2 → S3 → S2: `completed` for item 002 sent **once**, `initialized` for 002 twice (by spec); `doneItems['…-02#002'] = true` in the document; `qResults['002/q1'] = true` — **PASS** |
| Statements | every `POST …/xapi/statements` answered **200** (8 on the walk); state writes 204, reads 200 |

## Component 04 (off-computer task)

| Probe | Observed |
|---|---|
| R1 / R2 | `METADATA.id === XAPI_COMP_ID`, `XAPI_DISABLED false`, first read `{load, 404, absent}` — **PASS** |
| R6 production finish | "חזרתי, אפשר להמשיך" → `completed` for item 001, then **one** component `completed` with `{success: true}`; second click sends **0**; button `disabled`, `aria-disabled="true"`; `location.pathname` unchanged (no navigation); document `done['…-02-04'] = true`, `doneItems['…-04#001'] = true` — **PASS** |
| D-8 after reload | reload → lands on S1, the button is disabled by the **ledger** (`xapiComponentEnded() === true`), a click sends **0** statement POSTs — **PASS** |
| R7 `?resetState` | launch with `&resetState` → the parameter is removed from the URL, `done = {}`, the button is on, `xapiComponentEnded() === false`; a fresh save `{save, 204}` follows the first `goTo` — **PASS** |

Not observed: Kata removing a component on `completed` (no platform frame in this run), the
platform's routing on `recommendedAfterFail`, the issue-report POST from the production origin (one
QA report was sent from the local run on 2026-10-22), multi-tab behaviour (guide §13).
