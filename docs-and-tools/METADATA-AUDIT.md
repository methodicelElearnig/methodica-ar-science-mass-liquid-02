# Catalogue (Kata) — methodica-science-mass-liquid-02

The unit's record of its catalogue entries. Tools: `send-metadata.ps1` (upsert: GET by `uniqueKey`,
then PATCH or POST), `retrieve-metadata.ps1 -FailOnDrift` (GET everything back, compare with
`metadata/`), `check-metadata.py` (the local checks). Key: `docs-and-tools/kata-api-key.txt`,
git-ignored, never shipped.

## 1. The live runs of 2026-10-22

| Run | Log | Result |
|---|---|---|
| dry run | `send-metadata-2026-10-22-dryrun.log` | 40 to create, 1 to patch, no vocabulary errors |
| create | `send-metadata-2026-10-22-create.log` | **created 38, updated 1, failed 2** — items `02-003` and `07-001` rejected with HTTP 422 `performance question correctAnswers must carry at least one step` |
| upsert after the fix | `send-metadata-2026-10-22-upsert-after-performance-fix.log` | **created 2, updated 39, failed 0** |
| retrieve + audit | `retrieve-metadata.ps1 -UnitKey methodica-science-mass-liquid-02 -FailOnDrift -KeepRaw` | unit 1, components 7, items 32, **warnings 0**; the retrieved copy is in `metadata-from/` |

(The logs are `*.log`, git-ignored; they stay in this folder on the machine that ran them.)

## 2. What was in Kata before / routing fields — pushed as authored

Nothing: this unit was never in the catalogue. The records went up **as authored** by the content
team (unit-owner decision 2026-10-22), including three routing fields worth a second look by the
content team: components 06 and 07 both carry `order: 6`; components 02 and 06 have
`recommendedAfterFail: []` (a learner who fails there has no route); component 07 is
`isRequired: true` although only learners who failed 06 should reach מועד ב׳. Component 03 links
`recommendedAfterFail → 02`.

## 3. The one shape change: performance questions

Kata validates a `performance` question by `correctAnswers[].stepId` and rejects the authored
`steps[]` shape (`{name, type, correctAnswer | min/max}`) — the 422 above. The two questions
(`02-003/q1`: the two dropdowns; `07-001/q2`: the three value fields) were converted in
`metadata/` to the Kata shape, exactly as body-matter-01's catalogue stores it (2026-10-21):

```
"answers": null,
"correctAnswers": [ { "stepId": "<step name>", "response": "<the correct text as the UI shows it>" } ]
```

Responses: `02-003`: `1,000`, `0.8`; `07-001/q2`: `ינואר`, `9`, `9,000` (the numeric-range steps
`min = max` became their display text, `S3_CORRECT_TEXT` in `07/js/main.js`). The runtime
(`unit-js/20-xapi.js` `_xapiSteps`) reads either shape; the call sites pass the learner's typed /
chosen text per step in this order. `check-metadata.py` and `_test/verify-report.js` were re-run
after the change (0 errors; 2742/2742).

## 4. Ids, as verified live

- unit `uniqueKey`: `methodica-science-mass-liquid-02` (bare slug, v2.5 §2.7)
- components: `https://lomdot.education.gov.il/metodica/720active/science/mass-liquid/02/methodica-science-mass-liquid-02-0N/`
- items: `<component>methodica-science-mass-liquid-02-0N-NNN/`; questions `<item>qK`
- `hostedContentRef`: `https://lomdot.education.gov.il/metodica/720/science/mass-liquid/02/methodica-science-mass-liquid-02-0N/index.html` — content under `720/`, ids under `720active/`; the package `deployments/2026-10-22` must be uploaded there before a launch resolves.

## 5. Open

- The routing fields of §2, with the content team.
- Components are created as drafts; publishing is Kata-side.
