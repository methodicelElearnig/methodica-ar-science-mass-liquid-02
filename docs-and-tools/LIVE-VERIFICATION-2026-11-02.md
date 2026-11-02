# Live verification — first Arabic package, 2026-11-02

Package `../../deployments/2026-11-02` (commit `0e88de8`), uploaded to
`https://lomdot.education.gov.il/metodica/720/ar/science/mass-liquid/02/`.

## CDN upload

All 151 package files were downloaded from the CDN and compared with the package: **151 / 151
byte-identical** (size and SHA-256). Without launch parameters, all 7 parts load from the CDN with no 4xx
and no console error. Each part has `lang="ar"` and `METADATA.id === XAPI_COMP_ID` (`…/720/ar/…`).

## Kata

The seven Arabic components (32 items) are inside the Hebrew unit `methodica-science-mass-liquid-02`
(created 2026-11-02, `send-metadata-2026-11-02-create.log`). Their status is **draft**: they are not published.

Launch links: `Tools/full-kata-link/New-KataLaunchLinks.ps1 -InputFile components-methodica-ar-science-mass-liquid-02.txt
-StudentId VADIM-AR-ML02-FULL -ResetState`. All 7 of 7 were created
(`kata-links-methodica-ar-science-mass-liquid-02-full-20261102-195118.csv`).

## Method

The run used the in-app browser on the live CDN and Kata, with the real library
(`720active/common/xapi-720-k.js`) and no stub. Each part was driven through its own controls: options,
check and continue buttons, the click-to-place path of the drag-and-drop screens, the dropdown lists,
typed fields, hint buttons and gated media. Traffic was observed with a **passive** XHR listener that
only records the URL, method and status of each call; it does not wrap or replace `sendStatement`. The
listener was installed right after each page loaded, so each part's first `initialized` and its state
GET are not in the log; the rest of the traffic was logged.

## Full click-through, all seven parts finished

Every logged statement returned **200** and every state save **204**. There were **no non-2xx
responses** in any part. Every `answered` response is Arabic and uses the metadata strings; the
exception is the 07 q2 typed value, described under *Findings*. The character chosen in 01
(`character-1`) was adopted by 02–07.

| Part | Walked | Component `completed` |
|---|---|---|
| 01 | Character; 002 right; supermarket hotspots; flip cards; cube and truck fills; bucket pours; accordion; 006 drag **wrong → right** (the right pairs are reported first, in `correctAnswers` order); 011 wrong → right; 012 ordered drag; 013 multi-select wrong → right; 014 Recall (`requested` 014/q1), then **q1 + q2 as two choice statements** (wrong → right). Items 001–014 were each `completed`. **Reload after the finish: S21 restored with the answers, `s21Done`, finish disabled** | success true (no score, by design) |
| 02 | 001 word bank wrong → right (the right answer has no distractor entries); 002 wrong, hint (`requested`), right; 003 two dropdowns (performance); 004 wrong twice (item false); 005; 006 two-bin sort | success true, score 0.833 (5/6) |
| 03 | 001; 002; 003 numeric q1 3000 / q2 0.5; gate passed (3/3); **004 as performance**: wrong `…[.]3`, then right `مل[.]3,000[,]سم³[.]3,000[,]م³[.]0.003` (= Kata's pattern); 005 | success true, score 1 |
| 04 | Term tooltip; "عدتُ، يمكن المتابعة" | success true (no score) |
| 05 | 001; 002; 003 q1 unit dropdown `م³`; **q2 true/false reported as `true`**; 004 pie, all six slices | success true, score 1 |
| 06 | q1 (with the recipe recall); q2 wrong twice (failed); q3 wrong → right; q4 wrong, hint (`requested` q4), right; q5. Verdict `mass-liquid-02_moedAPassed` = true, finish "انتهيت" | success true, score 0.8 (item 001 mirrors it) |
| 07 | q1 hotspots (5); q2 typed يناير / 9 / 9000; q3; q4 ordered drag. Verdict `moedBPassed` = true. **Reload after the finish: S5 restored, `s5Done`, finish disabled** | success true, score 1 |

## Findings

All three are the same in the Hebrew unit (identical code), and none changes the learner's result:

1. **07 q2 sends the raw typed text.** A learner who types `9000` is judged right, but the response
   `…[.]9000` does not byte-match Kata's `correctXapiResponsesPattern` (`…[.]9,000`). The code is
   designed this way ("the raw typed text of the three fields") and is the same in Hebrew.
2. **01-006 Kata pattern.** Kata holds both alternative pairings in one 6-pair pattern, so a correct
   4-pair answer never byte-matches it. This is the Hebrew unit's known open item (`KATA_KNOWN` in
   `_test/verify-report.js`).
3. **No `requested` for the recipe recall in 06.** Only the hint button that appears after a wrong
   attempt is reported (`xapiRequestedHint` q2–q5). The recall popup is reference material, as in Hebrew.

## Not checked here

- Publishing (the components are draft) and a launch from the real learning platform.
- The report modal was not submitted, because it posts to the shared Google Form.
- Drag-and-drop with a real mouse drag. The click-to-place path that calls the same placement code was used instead.
